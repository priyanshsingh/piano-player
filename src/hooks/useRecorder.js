import { useState, useRef, useCallback } from 'react'
import { Midi } from '@tonejs/midi'

export default function useRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [isReplaying, setIsReplaying] = useState(false)
  const eventsRef = useRef([])
  const startTimeRef = useRef(0)
  const replayTimersRef = useRef([])

  const startRecording = useCallback(() => {
    eventsRef.current = []
    startTimeRef.current = performance.now()
    setIsRecording(true)
    setHasRecording(false)
    setIsReplaying(false)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    if (eventsRef.current.length > 0) {
      setHasRecording(true)
    }
  }, [])

  const recordNoteOn = useCallback((note, freq) => {
    if (!startTimeRef.current) return
    eventsRef.current.push({
      type: 'on',
      note,
      freq,
      time: (performance.now() - startTimeRef.current) / 1000,
    })
  }, [])

  const recordNoteOff = useCallback((note) => {
    if (!startTimeRef.current) return
    eventsRef.current.push({
      type: 'off',
      note,
      time: (performance.now() - startTimeRef.current) / 1000,
    })
  }, [])

  const replay = useCallback((playNoteFn, stopNoteFn) => {
    if (!eventsRef.current.length) return
    setIsReplaying(true)

    // Clear any existing replay timers
    for (const t of replayTimersRef.current) clearTimeout(t)
    const timers = []

    for (const evt of eventsRef.current) {
      const delay = evt.time * 1000
      const timer = setTimeout(() => {
        if (evt.type === 'on') {
          playNoteFn(evt.note, evt.freq)
        } else {
          stopNoteFn(evt.note)
        }
      }, delay)
      timers.push(timer)
    }

    // End replay
    const lastTime = eventsRef.current[eventsRef.current.length - 1].time
    const endTimer = setTimeout(() => {
      setIsReplaying(false)
    }, lastTime * 1000 + 500)
    timers.push(endTimer)

    replayTimersRef.current = timers
  }, [])

  const stopReplay = useCallback(() => {
    for (const t of replayTimersRef.current) clearTimeout(t)
    replayTimersRef.current = []
    setIsReplaying(false)
  }, [])

  const exportMidi = useCallback(() => {
    const events = eventsRef.current
    if (!events.length) return

    const midi = new Midi()
    const track = midi.addTrack()
    track.name = 'Piano Recording'

    // Pair note-on events with note-off events
    const openNotes = {}
    for (const evt of events) {
      if (evt.type === 'on') {
        openNotes[evt.note] = evt
      } else if (evt.type === 'off' && openNotes[evt.note]) {
        const onEvt = openNotes[evt.note]
        const duration = evt.time - onEvt.time
        // Convert freq to MIDI note number
        const midiNote = Math.round(12 * Math.log2(onEvt.freq / 440) + 69)
        if (midiNote >= 21 && midiNote <= 108) {
          track.addNote({
            midi: midiNote,
            time: onEvt.time,
            duration: Math.max(duration, 0.05),
            velocity: 0.8,
          })
        }
        delete openNotes[evt.note]
      }
    }

    // Close any still-open notes at the last event time
    const lastTime = events[events.length - 1].time
    for (const note of Object.keys(openNotes)) {
      const onEvt = openNotes[note]
      const midiNote = Math.round(12 * Math.log2(onEvt.freq / 440) + 69)
      if (midiNote >= 21 && midiNote <= 108) {
        track.addNote({
          midi: midiNote,
          time: onEvt.time,
          duration: Math.max(lastTime - onEvt.time, 0.1),
          velocity: 0.8,
        })
      }
    }

    const blob = new Blob([midi.toArray()], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recording.mid'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const clearRecording = useCallback(() => {
    eventsRef.current = []
    setHasRecording(false)
    stopReplay()
  }, [stopReplay])

  return {
    isRecording,
    hasRecording,
    isReplaying,
    startRecording,
    stopRecording,
    recordNoteOn,
    recordNoteOff,
    replay,
    stopReplay,
    exportMidi,
    clearRecording,
  }
}
