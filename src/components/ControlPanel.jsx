import { INSTRUMENTS } from '../constants/instruments'
import './ControlPanel.css'

const OCTAVE_LABELS = ['-3', '-2', '-1', '0', '+1', '+2', '+3']

export default function ControlPanel({
  volume,
  onVolumeChange,
  instrument,
  onInstrumentChange,
  reverbMix,
  onReverbChange,
  delayMix,
  onDelayChange,
  sustainActive,
  soundMode,
  metronome,
  harmoniumTranspose,
  onHarmoniumTransposeChange,
  harmoniumOctave,
  onHarmoniumOctaveChange,
}) {
  return (
    <div className="control-panel">
      <h2 className="panel-title">Controls</h2>

      <div className="panel-section">
        <h3 className="section-heading">Playback</h3>
        <div className="control-group">
          <label className="control-label">Volume</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="control-slider"
            />
            <span className="control-value">{Math.round(volume * 100)}%</span>
          </div>
        </div>
        <div className="control-group sustain-group">
          <span className="control-label">Sustain</span>
          <div className="slider-row">
            <span className={`sustain-badge${sustainActive ? ' on' : ''}`}>
              {sustainActive ? 'ON' : 'OFF'}
            </span>
            <span className="sustain-hint">hold Space</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-heading">Metronome</h3>
        <div className="control-group">
          <div className="metro-row">
            <button
              className={`metro-toggle${metronome.active ? ' on' : ''}`}
              onClick={metronome.toggle}
            >
              {metronome.active ? '⏸' : '▶'}
            </button>
            <input
              type="range"
              min="40"
              max="240"
              step="1"
              value={metronome.bpm}
              onChange={(e) => metronome.setBpm(parseInt(e.target.value, 10))}
              className="control-slider"
            />
            <span className="control-value">{metronome.bpm}</span>
          </div>
          <span className="sustain-hint">BPM</span>
        </div>
      </div>

      {soundMode === 'synth' && (
        <div className="panel-section">
          <h3 className="section-heading">Instrument</h3>
          <div className="instrument-selector">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst.id}
                className={`inst-btn${instrument === inst.id ? ' active' : ''}`}
                onClick={() => onInstrumentChange(inst.id)}
                title={inst.name}
              >
                <span className="inst-icon">{inst.icon}</span>
                <span className="inst-name">{inst.name}</span>
              </button>
            ))}
          </div>

          {instrument === 'harmonium' && (
            <div className="harmonium-controls">
              <div className="control-group">
                <label className="control-label">Transpose</label>
                <div className="slider-row">
                  <input
                    type="range"
                    min="-11"
                    max="11"
                    step="1"
                    value={harmoniumTranspose}
                    onChange={(e) => onHarmoniumTransposeChange(parseInt(e.target.value, 10))}
                    className="control-slider"
                  />
                  <span className="control-value">{harmoniumTranspose > 0 ? '+' : ''}{harmoniumTranspose}</span>
                </div>
              </div>
              <div className="control-group">
                <label className="control-label">Octave</label>
                <div className="slider-row">
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={harmoniumOctave}
                    onChange={(e) => onHarmoniumOctaveChange(parseInt(e.target.value, 10))}
                    className="control-slider"
                  />
                  <span className="control-value">{OCTAVE_LABELS[harmoniumOctave]}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="panel-section">
        <h3 className="section-heading">Effects</h3>
        <div className="control-group">
          <label className="control-label">Reverb</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={reverbMix}
              onChange={(e) => onReverbChange(parseFloat(e.target.value))}
              className="control-slider"
            />
            <span className="control-value">{Math.round(reverbMix * 100)}%</span>
          </div>
        </div>
        <div className="control-group">
          <label className="control-label">Delay</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={delayMix}
              onChange={(e) => onDelayChange(parseFloat(e.target.value))}
              className="control-slider"
            />
            <span className="control-value">{Math.round(delayMix * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
