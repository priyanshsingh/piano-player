import { useEffect, useRef, useCallback, useState } from 'react'
import { getAudioContext, getOutputNode } from '../audio/audioEngine'

const BASE_URL = import.meta.env.BASE_URL + 'sounds/'

const audioBufferCache = {}
const failedSamples = new Set()
const MAX_POLYPHONY = 16

async function loadBuffer(file) {
  if (audioBufferCache[file]) return audioBufferCache[file]
  if (failedSamples.has(file)) return null

  try {
    const ctx = getAudioContext()
    const url = BASE_URL + encodeURIComponent(file)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    audioBufferCache[file] = buffer
    return buffer
  } catch (err) {
    failedSamples.add(file)
    console.warn(`Could not load sample: ${file}`, err.message)
    return null
  }
}

function preloadKeys(keyMap) {
  for (const m of keyMap) {
    loadBuffer(m.file).catch(() => {
      console.warn(`Could not load sample: ${m.file}`)
    })
  }
}

export default function useSampleAudio(activeKeys, setActiveKeys, enabled = true, sustainRef, keyMap) {
  const sources = useRef({})
  const sustained = useRef(new Set())
  const keyMapRef = useRef(keyMap)
  const [sampleError, setSampleError] = useState(null)
  keyMapRef.current = keyMap

  const doStop = useCallback((keyChar) => {
    const entry = sources.current[keyChar]
    if (!entry) return

    if (entry.gain) {
      const ctx = getAudioContext()
      const now = ctx.currentTime
      entry.gain.gain.cancelScheduledValues(now)
      entry.gain.gain.setValueAtTime(entry.gain.gain.value, now)
      entry.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      try { entry.src.stop(now + 0.35) } catch { /* already stopped */ }
    }

    delete sources.current[keyChar]
    setActiveKeys((prev) => {
      const next = { ...prev }
      delete next[keyChar]
      return next
    })
  }, [setActiveKeys])

  const startNote = useCallback((keyChar) => {
    if (sources.current[keyChar]) return

    const mapping = keyMapRef.current.find((m) => m.key === keyChar)
    if (!mapping) return

    // Enforce polyphony limit — stop the oldest note
    const keys = Object.keys(sources.current)
    if (keys.length >= MAX_POLYPHONY) {
      doStop(keys[0])
    }

    preloadKeys(keyMapRef.current)
    const ctx = getAudioContext()
    const output = getOutputNode()

    const buffer = audioBufferCache[mapping.file]
    if (!buffer) {
      if (failedSamples.has(mapping.file)) {
        setSampleError(`Sample unavailable: ${mapping.file}`)
        return
      }
      loadBuffer(mapping.file).then((buf) => {
        if (!buf) {
          setSampleError(`Failed to load sample: ${mapping.file}`)
          return
        }
        if (!sources.current[keyChar]) return
        const src = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.value = 0.8
        src.buffer = buf
        src.connect(gain)
        gain.connect(output)
        src.start()
        sources.current[keyChar] = { src, gain }
      })
      setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
      return
    }

    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 0.8
    src.buffer = buffer
    src.connect(gain)
    gain.connect(output)
    src.start()

    sources.current[keyChar] = { src, gain }
    setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
  }, [setActiveKeys, doStop])

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
    preloadKeys(keyMapRef.current)

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

  return { startNote, stopNote, releaseSustained, sampleError }
}
