import { useState, useRef, useCallback, useEffect } from 'react'
import { Midi } from '@tonejs/midi'
import { midiNoteToId } from '../constants/midiUtils'
import { fullNoteMap } from '../constants/fullKeyMap'
import { getAudioContext, getOutputNode } from '../audio/audioEngine'

// Simple piano synth for MIDI playback
const HARMONICS = [
  { ratio: 1,  gain: 1.0,  decay: 1.8 },
  { ratio: 2,  gain: 0.45, decay: 1.2 },
  { ratio: 3,  gain: 0.2,  decay: 0.8 },
  { ratio: 4,  gain: 0.12, decay: 0.6 },
  { ratio: 5,  gain: 0.06, decay: 0.4 },
]

function playMidiNote(ctx, freq, duration) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.25, now)

  for (const h of HARMONICS) {
    const partialFreq = freq * h.ratio
    if (partialFreq > 15000) continue

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = partialFreq
    if (h.ratio > 1) osc.detune.value = h.ratio * 0.4

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(h.gain, now + 0.005)
    const sustainEnd = Math.min(duration, h.decay)
    gain.gain.exponentialRampToValueAtTime(h.gain * 0.3, now + sustainEnd)
    gain.gain.exponentialRampToValueAtTime(0.001, now + sustainEnd + 0.3)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + sustainEnd + 0.35)
  }

  const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = Math.min(freq * 10, 14000)
  master.connect(lpf)
  lpf.connect(getOutputNode())
}

export default function useMidiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [midiActiveNotes, setMidiActiveNotes] = useState({})
  const [midiLoaded, setMidiLoaded] = useState(false)

  const midiDataRef = useRef(null)
  const timersRef = useRef([])
  const startTimeRef = useRef(0)
  const pausedAtRef = useRef(0)
  const rafRef = useRef(null)
  const autoPlayRef = useRef(false)

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t)
    timersRef.current = []
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setMidiActiveNotes({})
  }, [])

  const scheduleNotes = useCallback((offsetTime = 0) => {
    const midi = midiDataRef.current
    if (!midi) return

    clearTimers()
    const newTimers = []
    startTimeRef.current = performance.now()

    const updateProgress = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000 + offsetTime
      setProgress(Math.min(elapsed, midi.duration))
      if (elapsed < midi.duration) {
        rafRef.current = requestAnimationFrame(updateProgress)
      }
    }
    rafRef.current = requestAnimationFrame(updateProgress)

    const ctx = getAudioContext()

    for (const track of midi.tracks) {
      for (const note of track.notes) {
        const noteId = midiNoteToId(note.midi)
        if (!noteId) continue

        const entry = fullNoteMap[noteId]
        if (!entry) continue

        const noteOnTime = (note.time - offsetTime) * 1000
        const noteOffTime = (note.time + note.duration - offsetTime) * 1000

        if (noteOnTime < 0 && noteOffTime < 0) continue

        if (noteOnTime >= 0) {
          const onTimer = setTimeout(() => {
            playMidiNote(ctx, entry.freq, note.duration)
            setMidiActiveNotes((prev) => ({ ...prev, [noteId]: true }))
          }, noteOnTime)
          newTimers.push(onTimer)
        } else {
          playMidiNote(ctx, entry.freq, note.duration)
          setMidiActiveNotes((prev) => ({ ...prev, [noteId]: true }))
        }

        const offDelay = Math.max(noteOffTime, 0)
        const offTimer = setTimeout(() => {
          setMidiActiveNotes((prev) => {
            const next = { ...prev }
            delete next[noteId]
            return next
          })
        }, offDelay)
        newTimers.push(offTimer)
      }
    }

    const endTimer = setTimeout(() => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(midi.duration)
      setMidiActiveNotes({})
    }, (midi.duration - offsetTime) * 1000 + 200)
    newTimers.push(endTimer)

    timersRef.current = newTimers
  }, [clearTimers])

  const play = useCallback(() => {
    if (!midiDataRef.current) return
    const offset = isPaused ? pausedAtRef.current : 0
    setIsPlaying(true)
    setIsPaused(false)
    scheduleNotes(offset)
  }, [isPaused, scheduleNotes])

  const pause = useCallback(() => {
    if (!isPlaying) return
    const elapsed = (performance.now() - startTimeRef.current) / 1000
    pausedAtRef.current = elapsed + (pausedAtRef.current || 0)
    clearTimers()
    setIsPlaying(false)
    setIsPaused(true)
  }, [isPlaying, clearTimers])

  const stop = useCallback(() => {
    clearTimers()
    pausedAtRef.current = 0
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    setMidiLoaded(false)
  }, [clearTimers])

  const [midiError, setMidiError] = useState(null)

  const loadMidiFile = useCallback((file) => {
    clearTimers()
    setMidiError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const midi = new Midi(e.target.result)
        midiDataRef.current = midi
        setFileName(file.name)
        setDuration(midi.duration)
        setProgress(0)
        setIsPaused(false)
        setMidiLoaded(true)

        // Auto-play
        autoPlayRef.current = true
        setIsPlaying(true)
      } catch (err) {
        setMidiError(`Failed to parse MIDI file: ${err.message}`)
        midiDataRef.current = null
        setMidiLoaded(false)
      }
    }
    reader.onerror = () => {
      setMidiError('Failed to read file')
    }
    reader.readAsArrayBuffer(file)
  }, [clearTimers])

  // Trigger scheduleNotes when auto-play flag is set
  useEffect(() => {
    if (autoPlayRef.current && isPlaying && midiDataRef.current) {
      autoPlayRef.current = false
      scheduleNotes(0)
    }
  }, [isPlaying, scheduleNotes])

  return {
    loadMidiFile,
    play,
    pause,
    stop,
    isPlaying,
    isPaused,
    fileName,
    progress,
    duration,
    midiActiveNotes,
    midiLoaded,
    midiError,
  }
}
