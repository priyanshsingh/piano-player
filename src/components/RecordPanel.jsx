import './RecordPanel.css'

export default function RecordPanel({ recorder }) {
  return (
    <div className="record-panel">
      <div className="record-controls">
        {!recorder.isRecording ? (
          <button className="rec-btn rec-start" onClick={recorder.startRecording}>
            ⏺ Record
          </button>
        ) : (
          <button className="rec-btn rec-stop" onClick={recorder.stopRecording}>
            ⏹ Stop
          </button>
        )}

        {recorder.hasRecording && !recorder.isRecording && (
          <>
            {!recorder.isReplaying ? (
              <button className="rec-btn rec-play" onClick={() => recorder.replay(recorder._playNote, recorder._stopNote)}>
                ▶ Replay
              </button>
            ) : (
              <button className="rec-btn rec-stop-replay" onClick={recorder.stopReplay}>
                ⏹ Stop Replay
              </button>
            )}
            <button className="rec-btn rec-export" onClick={recorder.exportMidi}>
              💾 Export MIDI
            </button>
            <button className="rec-btn rec-clear" onClick={recorder.clearRecording}>
              🗑 Clear
            </button>
          </>
        )}
      </div>

      {recorder.isRecording && (
        <div className="rec-indicator">
          <span className="rec-dot" />
          Recording...
        </div>
      )}
    </div>
  )
}
