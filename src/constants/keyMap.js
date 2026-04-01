// All 17 keys: C4 through E5 (two octaves partially)
// `file` matches the .mp3 filename inside public/sounds/
const KEY_MAP = [
  { key: 'q', note: 'C4',  freq: 261.63, type: 'white', file: 'C4.mp3'  },
  { key: '2', note: 'C#4', freq: 277.18, type: 'black', file: 'Db4.mp3' },
  { key: 'w', note: 'D4',  freq: 293.66, type: 'white', file: 'D4.mp3'  },
  { key: '3', note: 'D#4', freq: 311.13, type: 'black', file: 'Eb4.mp3' },
  { key: 'e', note: 'E4',  freq: 329.63, type: 'white', file: 'E4.mp3'  },
  { key: 'r', note: 'F4',  freq: 349.23, type: 'white', file: 'F4.mp3'  },
  { key: '5', note: 'F#4', freq: 369.99, type: 'black', file: 'Gb4.mp3' },
  { key: 't', note: 'G4',  freq: 392.00, type: 'white', file: 'G4.mp3'  },
  { key: '6', note: 'G#4', freq: 415.30, type: 'black', file: 'Ab4.mp3' },
  { key: 'y', note: 'A4',  freq: 440.00, type: 'white', file: 'A4.mp3'  },
  { key: '7', note: 'A#4', freq: 466.16, type: 'black', file: 'Bb4.mp3' },
  { key: 'u', note: 'B4',  freq: 493.88, type: 'white', file: 'B4.mp3'  },
  { key: 'i', note: 'C5',  freq: 523.25, type: 'white', file: 'C5.mp3'  },
  { key: '9', note: 'C#5', freq: 554.37, type: 'black', file: 'Db5.mp3' },
  { key: 'o', note: 'D5',  freq: 587.33, type: 'white', file: 'D5.mp3'  },
  { key: '0', note: 'D#5', freq: 622.25, type: 'black', file: 'Eb5.mp3' },
  { key: 'p', note: 'E5',  freq: 659.25, type: 'white', file: 'E5.mp3'  },
]

export default KEY_MAP
