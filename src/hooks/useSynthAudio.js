import { useEffect, useRef, useCallback } from 'react'
import KEY_MAP from '../constants/keyMap'

let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

// Piano harmonics: each partial has a frequency multiplier, relative gain, and decay time
const HARMONICS = [
  { ratio: 1,    gain: 1.0,   decay: 2.0  },  // fundamental
  { ratio: 2,    gain: 0.5,   decay: 1.5  },  // 2nd harmonic
  { ratio: 3,    gain: 0.25,  decay: 1.0  },  // 3rd
  { ratio: 4,    gain: 0.15,  decay: 0.8  },  // 4th
  { ratio: 5,    gain: 0.08,  decay: 0.6  },  // 5th
  { ratio: 6,    gain: 0.04,  decay: 0.5  },  // 6th
  { ratio: 7,    gain: 0.02,  decay: 0.4  },  // 7th
]

function createPianoNote(ctx, freq) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.35, now)

  const nodes = []

  // Layer multiple harmonic oscillators with individual envelopes
  for (const h of HARMONICS) {
    const partialFreq = freq * h.ratio
    if (partialFreq > 15000) continue // skip inaudible partials

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Use sine waves for clean harmonics (real piano partials are nearly sinusoidal)
    osc.type = 'sine'
    osc.frequency.value = partialFreq
    // Slight detuning on higher partials for string-like inharmonicity
    if (h.ratio > 1) {
      osc.detune.value = h.ratio * 0.4
    }

    // ADSR-like envelope per partial
    gain.gain.setValueAtTime(0, now)
    // Quick hammer attack
    gain.gain.linearRampToValueAtTime(h.gain, now + 0.005)
    // Natural exponential decay (higher partials die faster)
    gain.gain.exponentialRampToValueAtTime(h.gain * 0.4, now + h.decay * 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, now + h.decay * 2)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + h.decay * 2 + 0.1)

    nodes.push({ osc, gain })
  }

  // Hammer noise burst — gives that percussive piano "thunk"
  const noiseLen = 0.04
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3
  }

  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = freq * 2
  noiseFilter.Q.value = 2

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.15, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen)

  noiseSrc.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(master)
  noiseSrc.start(now)

  // Soft low-pass on the master to tame harshness
  const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = Math.min(freq * 12, 14000)
  lpf.Q.value = 0.5

  master.connect(lpf)
  lpf.connect(ctx.destination)

  return { master, nodes, lpf }
}

export default function useSynthAudio(activeKeys, setActiveKeys, enabled = true) {
  const oscillators = useRef({})

  const startNote = useCallback((keyChar) => {
    if (oscillators.current[keyChar]) return

    const mapping = KEY_MAP.find((m) => m.key === keyChar)
    if (!mapping) return

    const ctx = getAudioCtx()
    const note = createPianoNote(ctx, mapping.freq)

    oscillators.current[keyChar] = note

    setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
  }, [setActiveKeys])

  const stopNote = useCallback((keyChar) => {
    const entry = oscillators.current[keyChar]
    if (!entry) return

    const ctx = getAudioCtx()
    const now = ctx.currentTime

    // Quick damper release when key is lifted
    entry.master.gain.cancelScheduledValues(now)
    entry.master.gain.setValueAtTime(entry.master.gain.value, now)
    entry.master.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    // Stop all oscillators after release
    for (const n of entry.nodes) {
      try { n.osc.stop(now + 0.35) } catch { /* already stopped */ }
    }

    delete oscillators.current[keyChar]

    setActiveKeys((prev) => {
      const next = { ...prev }
      delete next[keyChar]
      return next
    })
  }, [setActiveKeys])

  useEffect(() => {
    if (!enabled) return

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
