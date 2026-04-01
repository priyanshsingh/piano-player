import { useState } from 'react'
import KEY_MAP from '../constants/keyMap'
import FULL_KEY_MAP from '../constants/fullKeyMap'
import useSynthAudio from '../hooks/useSynthAudio'
import useSampleAudio from '../hooks/useSampleAudio'
import useMidiPlayer from '../hooks/useMidiPlayer'
import PianoKey from './PianoKey'
import MidiPlayer from './MidiPlayer'
import './Piano.css'

export default function Piano({ soundMode }) {
  const [synthActiveKeys, setSynthActiveKeys] = useState({})
  const [sampleActiveKeys, setSampleActiveKeys] = useState({})

  const midi = useMidiPlayer()
  const midiMode = midi.midiLoaded

  // Disable keyboard input when MIDI is loaded
  const isSample = soundMode === 'sample'
  const synth = useSynthAudio(synthActiveKeys, setSynthActiveKeys, !isSample && !midiMode)
  const sample = useSampleAudio(sampleActiveKeys, setSampleActiveKeys, isSample && !midiMode)

  const activeKeys = isSample ? sampleActiveKeys : synthActiveKeys
  const { startNote, stopNote } = isSample ? sample : synth

  // In MIDI mode, show the last active MIDI note; otherwise show manual play note
  const lastActiveNote = midiMode
    ? Object.keys(midi.midiActiveNotes).at(-1) || ''
    : Object.values(activeKeys).at(-1) || ''

  // Choose which key map to render
  const displayKeys = midiMode ? FULL_KEY_MAP : KEY_MAP

  return (
    <>
      <MidiPlayer midi={midi} />
      <div className="note-display">{lastActiveNote}</div>
      <div className={`piano${midiMode ? ' piano-full' : ''}`}>
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
              onNoteStart={midiMode ? () => {} : startNote}
              onNoteStop={midiMode ? () => {} : stopNote}
              disabled={midiMode}
              showKeybind={!midiMode}
            />
          )
        })}
      </div>
    </>
  )
}
