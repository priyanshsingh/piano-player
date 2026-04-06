import { useEffect, useRef, useCallback, useState } from 'react'
import { getAudioContext, getOutputNode } from '../audio/audioEngine'

const SAMPLE_URL = import.meta.env.BASE_URL + 'sounds/harmonium.wav'
const ROOT_MIDI = 62 // WAV is tuned to D4
const MIDDLE_C = 60
const START_KEY = (MIDDLE_C - 124) + (ROOT_MIDI - MIDDLE_C) // = -62
const MAX_POLYPHONY = 16
const OCTAVE_MAP = [-36, -24, -12, 0, 12, 24, 36]

let harmoniumBuffer = null
let bufferLoading = false
let bufferLoadPromise = null

async function loadHarmoniumBuffer() {
  if (harmoniumBuffer) return harmoniumBuffer
  if (bufferLoading) return bufferLoadPromise

  bufferLoading = true
  bufferLoadPromise = (async () => {
    try {
      const ctx = getAudioContext()
      const response = await fetch(SAMPLE_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      harmoniumBuffer = await ctx.decodeAudioData(arrayBuffer)
      return harmoniumBuffer
    } catch (err) {
      console.warn('Failed to load harmonium sample:', err.message)
      bufferLoading = false
      return null
    }
  })()
  return bufferLoadPromise
}

// Build detune key map: keyMap[i] = semitone offset from root for MIDI note i
function buildKeyMap(transpose = 0) {
  const map = new Array(128)
  for (let i = 0; i < 128; i++) {
    map[i] = (START_KEY + i + transpose) * 100 // in cents
  }
  return map
}

// Convert a frequency to MIDI note number
function freqToMidi(freq) {
  return Math.round(12 * Math.log2(freq / 440) + 69)
}

export default function useHarmoniumAudio(activeKeys, setActiveKeys, enabled = true, sustainRef, keyMap, transpose = 0, harmoniumOctave = 3) {
  const sources = useRef({})         // keyChar → { src, gain }
  const sustained = useRef(new Set())
  const keyMapRef = useRef(keyMap)
  keyMapRef.current = keyMap
  const detuneMap = useRef(buildKeyMap(transpose))
  const octaveOffset = OCTAVE_MAP[harmoniumOctave] || 0

  // Rebuild detune map when transpose changes
  useEffect(() => {
    detuneMap.current = buildKeyMap(transpose)
  }, [transpose])

  // Preload the buffer on mount
  useEffect(() => {
    if (enabled) loadHarmoniumBuffer()
  }, [enabled])

  const createSourceNode = useCallback((midiNote) => {
    if (!harmoniumBuffer) return null

    const ctx = getAudioContext()
    const src = ctx.createBufferSource()
    src.buffer = harmoniumBuffer
    src.loop = true
    src.loopStart = 0.5
    src.detune.value = detuneMap.current[midiNote] || 0

    const gain = ctx.createGain()
    gain.gain.value = 0.3

    src.connect(gain)
    gain.connect(getOutputNode())

    return { src, gain }
  }, [])

  const doStop = useCallback((keyChar) => {
    const entry = sources.current[keyChar]
    if (!entry) return

    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Fade out to avoid clicks
    entry.gain.gain.cancelScheduledValues(now)
    entry.gain.gain.setValueAtTime(entry.gain.gain.value, now)
    entry.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    try { entry.src.stop(now + 0.15) } catch { /* already stopped */ }

    delete sources.current[keyChar]

    setActiveKeys((prev) => {
      const next = { ...prev }
      delete next[keyChar]
      return next
    })
  }, [setActiveKeys])

  const startNote = useCallback(async (keyChar) => {
    if (sources.current[keyChar]) return

    const mapping = keyMapRef.current.find((m) => m.key === keyChar)
    if (!mapping) return

    // Enforce polyphony limit
    const keys = Object.keys(sources.current)
    if (keys.length >= MAX_POLYPHONY) {
      doStop(keys[0])
    }

    // Ensure buffer is loaded
    const buffer = await loadHarmoniumBuffer()
    if (!buffer) return

    // Convert the key frequency to a MIDI note, then apply octave offset
    const midiNote = freqToMidi(mapping.freq) + octaveOffset
    if (midiNote < 0 || midiNote > 127) return

    const node = createSourceNode(midiNote)
    if (!node) return

    node.src.start(0)
    sources.current[keyChar] = node

    setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
  }, [setActiveKeys, doStop, createSourceNode, octaveOffset])

  const stopNote = useCallback((keyChar) => {
    if (sustainRef?.current) {
      sustained.current.add(keyChar)
      return
    }
    doStop(keyChar)
  }, [doStop, sustainRef])

  const releaseSustained = useCallback(() => {
    for (const k of sustained.current) {
      doStop(k)
    }
    sustained.current.clear()
  }, [doStop])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      if (e.repeat || e.key === ' ' || e.key === 'z' || e.key === 'x' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') return
      startNote(e.key.toLowerCase())
    }
    const handleKeyUp = (e) => {
      if (e.key === ' ' || e.key === 'z' || e.key === 'x' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') return
      stopNote(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startNote, stopNote, enabled])

  return { startNote, stopNote, releaseSustained }
}
