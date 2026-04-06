import useChordRecognition from '../hooks/useChordRecognition'
import './ChordDisplay.css'

export default function ChordDisplay({ activeNotes, midiActiveNotes, midiMode }) {
  const notes = midiMode ? midiActiveNotes : activeNotes
  const chord = useChordRecognition(notes)

  return (
    <div className="chord-display">
      <div className="chord-label">Chord</div>
      <div className="chord-name">{chord || '—'}</div>
    </div>
  )
}
