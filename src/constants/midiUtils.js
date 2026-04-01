// Maps MIDI note numbers to note names for the full 88-key range
import KEY_MAP from './keyMap'
import { midiToNote } from './fullKeyMap'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Build a lookup: "C4" → 'q', "C#4" → '2', etc. (for the 17 playable keys)
const noteToKey = {}
for (const m of KEY_MAP) {
  noteToKey[m.note] = m.key
}

/**
 * Convert a MIDI note number to our 17-key keyboard key character.
 * Returns null if the note is outside the 17-key range.
 */
export function midiNoteToKey(midiNote) {
  const entry = midiToNote[midiNote]
  if (!entry) return null
  return noteToKey[entry.note] || null
}

/**
 * Convert a MIDI note number to the note name (e.g., "C4").
 * Works for all 88 keys.
 */
export function midiNoteToName(midiNote) {
  const entry = midiToNote[midiNote]
  return entry ? entry.note : null
}

/**
 * Convert a MIDI note number to the note ID used for MIDI playback.
 * This is the note name string (e.g., "C4") — works across all 88 keys.
 */
export function midiNoteToId(midiNote) {
  const entry = midiToNote[midiNote]
  return entry ? entry.note : null
}
