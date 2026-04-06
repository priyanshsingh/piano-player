import { useMemo } from 'react'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Chord interval patterns (semitones from root)
const CHORD_TYPES = [
  { intervals: [0, 4, 7],       name: 'maj' },
  { intervals: [0, 3, 7],       name: 'm' },
  { intervals: [0, 4, 7, 11],   name: 'maj7' },
  { intervals: [0, 3, 7, 10],   name: 'm7' },
  { intervals: [0, 4, 7, 10],   name: '7' },
  { intervals: [0, 3, 6],       name: 'dim' },
  { intervals: [0, 4, 8],       name: 'aug' },
  { intervals: [0, 3, 6, 9],    name: 'dim7' },
  { intervals: [0, 3, 6, 10],   name: 'm7b5' },
  { intervals: [0, 5, 7],       name: 'sus4' },
  { intervals: [0, 2, 7],       name: 'sus2' },
  { intervals: [0, 4, 7, 9],    name: '6' },
  { intervals: [0, 3, 7, 9],    name: 'm6' },
  { intervals: [0, 4, 7, 11, 14], name: 'maj9' },
  { intervals: [0, 4, 7, 10, 14], name: '9' },
]

function noteNameToPC(noteName) {
  // "C#4" → strip octave → "C#" → index
  const name = noteName.replace(/\d+$/, '')
  return NOTE_NAMES.indexOf(name)
}

function identifyChord(noteNames) {
  if (noteNames.length < 2) return null

  // Get unique pitch classes
  const pitchClasses = [...new Set(noteNames.map(noteNameToPC).filter((pc) => pc >= 0))]
  if (pitchClasses.length < 2) return null

  pitchClasses.sort((a, b) => a - b)

  // Try each pitch class as root
  for (const root of pitchClasses) {
    const intervals = pitchClasses.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b)

    for (const chord of CHORD_TYPES) {
      if (chord.intervals.length !== intervals.length) continue
      if (chord.intervals.every((v, i) => v === intervals[i])) {
        return NOTE_NAMES[root] + chord.name
      }
    }
  }

  // If no exact match, show the notes as interval description
  return null
}

export default function useChordRecognition(activeNotes) {
  const chord = useMemo(() => {
    const noteNames = Object.values(activeNotes).filter(Boolean)
    if (noteNames.length < 2) return null
    return identifyChord(noteNames)
  }, [activeNotes])

  return chord
}
