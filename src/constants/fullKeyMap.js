// Full 88-key piano map: A0 (MIDI 21) through C8 (MIDI 108)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#'])

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const FULL_KEY_MAP = []

// MIDI 21 (A0) through MIDI 108 (C8)
for (let midi = 21; midi <= 108; midi++) {
  const noteIndex = midi % 12
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES[noteIndex]
  const note = name + octave
  const type = BLACK_NOTES.has(name) ? 'black' : 'white'

  FULL_KEY_MAP.push({
    midi,
    note,
    freq: Math.round(midiToFreq(midi) * 100) / 100,
    type,
  })
}

// Lookup by note name: "C4" → { midi, note, freq, type }
export const fullNoteMap = {}
for (const entry of FULL_KEY_MAP) {
  fullNoteMap[entry.note] = entry
}

// Lookup by MIDI number
export const midiToNote = {}
for (const entry of FULL_KEY_MAP) {
  midiToNote[entry.midi] = entry
}

export default FULL_KEY_MAP
