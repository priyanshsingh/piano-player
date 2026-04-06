import { useEffect, useRef, useCallback } from 'react'
import { getAudioContext, getOutputNode } from '../audio/audioEngine'
import { INSTRUMENTS } from '../constants/instruments'

const MAX_POLYPHONY = 16

function createInstrumentNote(ctx, freq, instrumentId) {
  const inst = INSTRUMENTS.find((i) => i.id === instrumentId) || INSTRUMENTS[0]
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(inst.masterGain, now)

  const nodes = []

  for (const h of inst.harmonics) {
    const partialFreq = freq * h.ratio
    if (partialFreq > 15000) continue

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = inst.oscType || 'sine'
    osc.frequency.value = partialFreq
    if (h.ratio > 1) {
      osc.detune.value = h.ratio * 0.4
    }

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(h.gain, now + inst.attackTime)

    if (inst.sustained) {
      // Organ-like: hold at full level
      gain.gain.setValueAtTime(h.gain, now + inst.attackTime)
    } else {
      gain.gain.exponentialRampToValueAtTime(h.gain * 0.4, now + h.decay * 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, now + h.decay * 2)
    }

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)

    if (!inst.sustained) {
      osc.stop(now + h.decay * 2 + 0.1)
    }

    nodes.push({ osc, gain })
  }

  // Vibrato (electric piano)
  if (inst.vibratoRate && inst.vibratoDepth) {
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = inst.vibratoRate
    lfoGain.gain.value = inst.vibratoDepth
    lfo.connect(lfoGain)
    for (const n of nodes) {
      lfoGain.connect(n.osc.frequency)
    }
    lfo.start(now)
    if (!inst.sustained) lfo.stop(now + 5)
    nodes.push({ osc: lfo, gain: lfoGain })
  }

  // Hammer noise burst
  if (inst.hammerNoise) {
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
  }

  // Low-pass filter
  const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = Math.min(freq * (inst.filterMult || 12), 14000)
  lpf.Q.value = 0.5

  master.connect(lpf)
  lpf.connect(getOutputNode())

  return { master, nodes, lpf }
}

export default function useSynthAudio(activeKeys, setActiveKeys, enabled = true, sustainRef, instrument = 'piano', keyMap) {
  const oscillators = useRef({})
  const sustained = useRef(new Set())
  const keyMapRef = useRef(keyMap)
  keyMapRef.current = keyMap

  const doStop = useCallback((keyChar) => {
    const entry = oscillators.current[keyChar]
    if (!entry) return

    const ctx = getAudioContext()
    const now = ctx.currentTime

    entry.master.gain.cancelScheduledValues(now)
    entry.master.gain.setValueAtTime(entry.master.gain.value, now)
    entry.master.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

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

  const startNote = useCallback((keyChar) => {
    if (oscillators.current[keyChar]) return

    const mapping = keyMapRef.current.find((m) => m.key === keyChar)
    if (!mapping) return

    // Enforce polyphony limit — stop the oldest note
    const keys = Object.keys(oscillators.current)
    if (keys.length >= MAX_POLYPHONY) {
      doStop(keys[0])
    }

    const ctx = getAudioContext()
    const note = createInstrumentNote(ctx, mapping.freq, instrument)

    oscillators.current[keyChar] = note

    setActiveKeys((prev) => ({ ...prev, [keyChar]: mapping.note }))
  }, [setActiveKeys, instrument, doStop])

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
