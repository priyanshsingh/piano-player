import { useRef } from 'react'
import './MidiPlayer.css'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MidiPlayer({ midi }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
      midi.loadMidiFile(file)
    }
  }

  const progressPct = midi.duration > 0 ? (midi.progress / midi.duration) * 100 : 0

  return (
    <div className="midi-player">
      {midi.midiError && (
        <div className="midi-error">{midi.midiError}</div>
      )}
      <div className="midi-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          onChange={handleFileChange}
          hidden
        />
        <button
          className="midi-btn upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          {midi.fileName ? '🔄 Change MIDI' : '📁 Upload MIDI'}
        </button>
        {midi.fileName && (
          <span className="midi-filename">{midi.fileName}</span>
        )}
      </div>

      {midi.fileName && (
        <div className="midi-controls">
          <div className="midi-buttons">
            {!midi.isPlaying ? (
              <button className="midi-btn play-btn" onClick={midi.play}>
                ▶ {midi.isPaused ? 'Resume' : 'Play'}
              </button>
            ) : (
              <button className="midi-btn pause-btn" onClick={midi.pause}>
                ⏸ Pause
              </button>
            )}
            <button
              className="midi-btn stop-btn"
              onClick={midi.stop}
              disabled={!midi.isPlaying && !midi.isPaused}
            >
              ⏹ Stop
            </button>
          </div>

          <div className="midi-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="progress-time">
              {formatTime(midi.progress)} / {formatTime(midi.duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
