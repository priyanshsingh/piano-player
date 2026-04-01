import { useEffect, useRef, useCallback } from 'react'
import KEY_MAP from '../constants/keyMap'

const BASE_URL = import.meta.env.BASE_URL + 'sounds/'

// Pre-load all audio buffers once
const audioBufferCache = {}
let audioCtx = null

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

async function loadBuffer(file) {
  if (audioBufferCache[file]) return audioBufferCache[file]

  const ctx = getAudioCtx()
  const url = BASE_URL + encodeURIComponent(file)
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  audioBufferCache[file] = buffer
  return buffer
}

// Preload all samples on first call
let preloaded = false
function preloadAll() {
  if (preloaded) return
  preloaded = true
  for (const m of KEY_MAP) {
    loadBuffer(m.file).catch(() => {
      console.warn(`Could not load sample: ${m.file}`)
    })
  }
}

export default function useSampleAudio(activeKeys, setActiveKeys, enabled = true) {
  const sources = useRef({})

  const startNote = useCallback((keyChar) => {
    if (sources.current[keyChar]) return

    const mapping = KEY_MAP.find((m) => m.key === keyChar)
    if (!mapping) return

    preloadAll()
    const ctx = getAudioCtx()

    const buffer = audioBufferCache[mapping.file]
    if (!buffer) {
      // Buffer not loaded yet — try loading now
      loadBuffer(mapping.file).then((buf) => {
        if (!sources.current[keyChar]) return
        const src = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.value = 0.8
        src.buffer = buf
        src.connect(gain)
        gain.connect(ctx.destination)
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
    gain.connect(ctx.destination)
    src.start()

    sources.current[keyChar] = { src, gain }
    setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
  }, [setActiveKeys])

  const stopNote = useCallback((keyChar) => {
    const entry = sources.current[keyChar]
    if (!entry) return

    if (entry.gain) {
      const ctx = getAudioCtx()
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

  useEffect(() => {
    if (!enabled) return
    preloadAll()

    const handleKeyDown = (e) => {
      if (e.repeat) return
      startNote(e.key.toLowerCase())
    }
    const handleKeyUp = (e) => {
      stopNote(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startNote, stopNote, enabled])

  return { startNote, stopNote }
}
