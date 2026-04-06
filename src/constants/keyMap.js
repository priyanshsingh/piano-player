// 17-key layout pattern: which keyboard chars map to which semitones
const KEY_PATTERN = [
  { key: 'q', semitone: 0,  type: 'white' }, // C
  { key: '2', semitone: 1,  type: 'black' }, // C#
  { key: 'w', semitone: 2,  type: 'white' }, // D
  { key: '3', semitone: 3,  type: 'black' }, // D#
  { key: 'e', semitone: 4,  type: 'white' }, // E
  { key: 'r', semitone: 5,  type: 'white' }, // F
  { key: '5', semitone: 6,  type: 'black' }, // F#
  { key: 't', semitone: 7,  type: 'white' }, // G
  { key: '6', semitone: 8,  type: 'black' }, // G#
  { key: 'y', semitone: 9,  type: 'white' }, // A
  { key: '7', semitone: 10, type: 'black' }, // A#
  { key: 'u', semitone: 11, type: 'white' }, // B
  { key: 'i', semitone: 12, type: 'white' }, // C+1
  { key: '9', semitone: 13, type: 'black' }, // C#+1
  { key: 'o', semitone: 14, type: 'white' }, // D+1
  { key: '0', semitone: 15, type: 'black' }, // D#+1
  { key: 'p', semitone: 16, type: 'white' }, // E+1
]

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' }

export function buildKeyMap(baseOctave = 4) {
  return KEY_PATTERN.map((p) => {
    const noteIndex = p.semitone % 12
    const octave = baseOctave + Math.floor(p.semitone / 12)
    const name = NOTE_NAMES[noteIndex]
    const note = name + octave
    const freq = 440 * Math.pow(2, ((baseOctave - 4) * 12 + p.semitone - 9) / 12)
    const flatName = FLAT_NAMES[name] || name
    const file = flatName + octave + '.mp3'
    return { key: p.key, note, freq: Math.round(freq * 100) / 100, type: p.type, file }
  })
}

// Default: octave 4
const KEY_MAP = buildKeyMap(4)
export default KEY_MAP
