import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { buildKeyMap } from '../constants/keyMap'
import FULL_KEY_MAP from '../constants/fullKeyMap'
import useSynthAudio from '../hooks/useSynthAudio'
import useSampleAudio from '../hooks/useSampleAudio'
import useHarmoniumAudio from '../hooks/useHarmoniumAudio'
import useMidiPlayer from '../hooks/useMidiPlayer'
import PianoKey from './PianoKey'
import MidiPlayer from './MidiPlayer'
import RecordPanel from './RecordPanel'
import ChordDisplay from './ChordDisplay'
import FallingNotes from './FallingNotes'
import './Piano.css'

export default function Piano({ soundMode, instrument, sustainActive, onSustainChange, octave, onOctaveChange, activeTab, recorder, harmoniumTranspose, harmoniumOctave }) {
  const [synthActiveKeys, setSynthActiveKeys] = useState({})
  const [sampleActiveKeys, setSampleActiveKeys] = useState({})
  const [harmoniumActiveKeys, setHarmoniumActiveKeys] = useState({})
  const sustainRef = useRef(false)
  const pianoRef = useRef(null)

  const keyMap = useMemo(() => buildKeyMap(octave), [octave])

  const midi = useMidiPlayer()
  const midiMode = activeTab === 'midi' && midi.midiLoaded

  // Disable keyboard input when MIDI is loaded
  const isSample = soundMode === 'sample'
  const isHarmonium = instrument === 'harmonium' && soundMode === 'synth'
  const synth = useSynthAudio(synthActiveKeys, setSynthActiveKeys, !isSample && !isHarmonium && !midiMode, sustainRef, instrument, keyMap)
  const sample = useSampleAudio(sampleActiveKeys, setSampleActiveKeys, isSample && !midiMode, sustainRef, keyMap)
  const harmonium = useHarmoniumAudio(harmoniumActiveKeys, setHarmoniumActiveKeys, isHarmonium && !midiMode, sustainRef, keyMap, harmoniumTranspose, harmoniumOctave)

  const activeKeys = isHarmonium ? harmoniumActiveKeys : isSample ? sampleActiveKeys : synthActiveKeys
  const { startNote, stopNote } = isHarmonium ? harmonium : isSample ? sample : synth

  // Wrap startNote/stopNote for recording
  const recStartNote = useCallback((keyChar) => {
    startNote(keyChar)
    if (recorder.isRecording) {
      const mapping = keyMap.find((m) => m.key === keyChar)
      if (mapping) recorder.recordNoteOn(mapping.note, mapping.freq)
    }
  }, [startNote, recorder, keyMap])

  const recStopNote = useCallback((keyChar) => {
    stopNote(keyChar)
    if (recorder.isRecording) {
      const mapping = keyMap.find((m) => m.key === keyChar)
      if (mapping) recorder.recordNoteOff(mapping.note)
    }
  }, [stopNote, recorder, keyMap])

  // For replay: provide play/stop callbacks using audio engine directly
  const replayPlayNote = useCallback((note, freq) => {
    // Find key char from note
    const mapping = keyMap.find((m) => m.note === note)
    if (mapping) startNote(mapping.key)
  }, [keyMap, startNote])

  const replayStopNote = useCallback((note) => {
    const mapping = keyMap.find((m) => m.note === note)
    if (mapping) stopNote(mapping.key)
  }, [keyMap, stopNote])

  // Attach replay callbacks to recorder
  recorder._playNote = replayPlayNote
  recorder._stopNote = replayStopNote



  // Choose the appropriate start/stop functions (recording-aware on record tab)
  const effectiveStartNote = activeTab === 'record' ? recStartNote : startNote
  const effectiveStopNote = activeTab === 'record' ? recStopNote : stopNote

  // Record keyboard events when recording
  useEffect(() => {
    if (activeTab !== 'record' || !recorder.isRecording) return

    const handleKeyDown = (e) => {
      if (e.repeat || e.key === ' ' || e.key === 'z' || e.key === 'x' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') return
      const key = e.key.toLowerCase()
      const mapping = keyMap.find((m) => m.key === key)
      if (mapping) {
        recorder.recordNoteOn(mapping.note, mapping.freq)
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === ' ' || e.key === 'z' || e.key === 'x' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') return
      const key = e.key.toLowerCase()
      const mapping = keyMap.find((m) => m.key === key)
      if (mapping) {
        recorder.recordNoteOff(mapping.note)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeTab, recorder, keyMap])

  // Sustain pedal + octave shift: spacebar / z / x
  useEffect(() => {
    if (midiMode) return

    const handleKeyDown = (e) => {
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        sustainRef.current = true
        onSustainChange(true)
      }
      if (e.key === 'z' && !e.repeat) {
        onOctaveChange(Math.max(1, octave - 1))
      }
      if (e.key === 'x' && !e.repeat) {
        onOctaveChange(Math.min(7, octave + 1))
      }
      if (e.key === 'ArrowLeft' && !e.repeat) {
        onOctaveChange(Math.max(1, octave - 1))
      }
      if (e.key === 'ArrowRight' && !e.repeat) {
        onOctaveChange(Math.min(7, octave + 1))
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        e.preventDefault()
        sustainRef.current = false
        onSustainChange(false)
        synth.releaseSustained()
        sample.releaseSustained()
        harmonium.releaseSustained()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [midiMode, synth.releaseSustained, sample.releaseSustained, harmonium.releaseSustained, onSustainChange, octave, onOctaveChange])

  // In MIDI mode, show the last active MIDI note; otherwise show manual play note
  const lastActiveNote = midiMode
    ? Object.keys(midi.midiActiveNotes).at(-1) || ''
    : Object.values(activeKeys).at(-1) || ''

  // Choose which key map to render
  const displayKeys = midiMode ? FULL_KEY_MAP : keyMap

  return (
    <>
      <div className="tab-content-area">
        {activeTab === 'midi' && <MidiPlayer midi={midi} />}
        {activeTab === 'record' && <RecordPanel recorder={recorder} />}
        {activeTab === 'chords' && (
          <ChordDisplay
            activeNotes={activeKeys}
            midiActiveNotes={midi.midiActiveNotes}
            midiMode={midiMode}
          />
        )}
      </div>

      <div className="note-display">{lastActiveNote}</div>

      <div className="piano-area">
        <FallingNotes
          activeNotes={activeKeys}
          midiActiveNotes={midi.midiActiveNotes}
          midiMode={midiMode}
          displayKeys={displayKeys}
          pianoRef={pianoRef}
        />

        <div ref={pianoRef} className={`piano${midiMode ? ' piano-full' : ''}`}>
          {displayKeys.map((mapping) => {
          const id = mapping.note
          const isActive = midiMode
            ? !!midi.midiActiveNotes[id]
            : !!activeKeys[mapping.key]

          return (
            <PianoKey
              key={id}
              mapping={mapping}
              isActive={isActive}
              onNoteStart={midiMode ? () => {} : effectiveStartNote}
              onNoteStop={midiMode ? () => {} : effectiveStopNote}
              disabled={midiMode}
              showKeybind={!midiMode}
            />
          )
        })}
        </div>
      </div>

      {!midiMode && (
        <div className="octave-indicator">
          <button className="octave-btn" onClick={() => onOctaveChange(Math.max(1, octave - 1))} title="Octave down (Z / ←)">‹</button>
          <span className="octave-label">C{octave}–E{octave + 1}</span>
          <button className="octave-btn" onClick={() => onOctaveChange(Math.min(7, octave + 1))} title="Octave up (X / →)">›</button>
        </div>
      )}
    </>
  )
}
