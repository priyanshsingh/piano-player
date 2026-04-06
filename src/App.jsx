import { useState, useEffect, useCallback, useRef } from 'react'
import Piano from './components/Piano'
import ThemePicker from './components/ThemePicker'
import ControlPanel from './components/ControlPanel'
import { THEMES, DEFAULT_THEME } from './constants/themes'
import { setVolume, setReverbMix, setDelayMix } from './audio/audioEngine'
import useMetronome from './hooks/useMetronome'
import useRecorder from './hooks/useRecorder'
import './App.css'

const STORAGE_KEY = 'piano-settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId)
  if (!theme) return
  const root = document.documentElement
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val)
  }
  // Toggle glass class on body for glass-specific CSS overrides
  document.body.classList.toggle('theme-glass', themeId === 'glass')
}

function App() {
  const saved = loadSettings()
  const [soundMode, setSoundMode] = useState(saved.soundMode || 'synth')
  const [theme, setTheme] = useState(saved.theme || DEFAULT_THEME)
  const [volume, setVolumeState] = useState(saved.volume ?? 0.8)
  const [instrument, setInstrument] = useState(saved.instrument || 'piano')
  const [reverbMix, setReverbMixState] = useState(saved.reverbMix ?? 0)
  const [sustainActive, setSustainActive] = useState(false)
  const [darkMode, setDarkMode] = useState(saved.darkMode ?? true)
  const [octave, setOctave] = useState(saved.octave ?? 4)
  const [delayMix, setDelayMixState] = useState(saved.delayMix ?? 0)
  const [harmoniumTranspose, setHarmoniumTranspose] = useState(0)
  const [harmoniumOctave, setHarmoniumOctave] = useState(3)
  const prevDarkThemeRef = useRef(saved.theme && saved.theme !== 'light' ? saved.theme : DEFAULT_THEME)
  const metronome = useMetronome()
  const recorder = useRecorder()
  const [activeTab, setActiveTab] = useState(saved.soundMode === 'sample' ? 'samples' : 'synth')

  // Apply saved audio engine settings on mount
  useEffect(() => {
    setVolume(saved.volume ?? 0.8)
    setReverbMix(saved.reverbMix ?? 0)
    setDelayMix(saved.delayMix ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist settings to localStorage
  useEffect(() => {
    const settings = { soundMode, theme, volume, instrument, reverbMix, delayMix, octave, darkMode }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [soundMode, theme, volume, instrument, reverbMix, delayMix, octave, darkMode])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const handleVolumeChange = useCallback((val) => {
    setVolumeState(val)
    setVolume(val)
  }, [])

  const handleReverbChange = useCallback((val) => {
    setReverbMixState(val)
    setReverbMix(val)
  }, [])

  const handleDelayChange = useCallback((val) => {
    setDelayMixState(val)
    setDelayMix(val)
  }, [])

  const handleThemeChange = useCallback((id) => {
    setTheme(id)
    setDarkMode(id !== 'light')
    if (id !== 'light') prevDarkThemeRef.current = id
  }, [])

  const toggleDarkLight = useCallback(() => {
    if (darkMode) {
      prevDarkThemeRef.current = theme
      setTheme('light')
      setDarkMode(false)
    } else {
      setTheme(prevDarkThemeRef.current)
      setDarkMode(true)
    }
  }, [darkMode, theme])

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ControlPanel
          volume={volume}
          onVolumeChange={handleVolumeChange}
          instrument={instrument}
          onInstrumentChange={setInstrument}
          reverbMix={reverbMix}
          onReverbChange={handleReverbChange}
          delayMix={delayMix}
          onDelayChange={handleDelayChange}
          sustainActive={sustainActive}
          soundMode={soundMode}
          metronome={metronome}
          harmoniumTranspose={harmoniumTranspose}
          onHarmoniumTransposeChange={setHarmoniumTranspose}
          harmoniumOctave={harmoniumOctave}
          onHarmoniumOctaveChange={setHarmoniumOctave}
        />
      </aside>

      <div className="app">
        <div className="top-controls">
          <button
            className="dark-light-toggle"
            onClick={toggleDarkLight}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <ThemePicker currentTheme={theme} onThemeChange={handleThemeChange} />
        </div>

        <h1 className="title">Piano</h1>
        <p className="subtitle">play with your keyboard</p>

        <div className="mode-toggle">
          <button
            className={`toggle-btn${activeTab === 'synth' ? ' active' : ''}`}
            onClick={() => { setActiveTab('synth'); setSoundMode('synth') }}
          >
            Synth
          </button>
          <button
            className={`toggle-btn${activeTab === 'samples' ? ' active' : ''}`}
            onClick={() => { setActiveTab('samples'); setSoundMode('sample') }}
          >
            Samples
          </button>
          <button
            className={`toggle-btn${activeTab === 'midi' ? ' active' : ''}`}
            onClick={() => setActiveTab('midi')}
          >
            MIDI
          </button>
          <button
            className={`toggle-btn${activeTab === 'record' ? ' active' : ''}`}
            onClick={() => { setActiveTab('record'); setSoundMode('synth') }}
          >
            Record
          </button>
          <button
            className={`toggle-btn${activeTab === 'chords' ? ' active' : ''}`}
            onClick={() => { setActiveTab('chords'); setSoundMode('synth') }}
          >
            Chords
          </button>
        </div>

        <Piano
          soundMode={soundMode}
          instrument={instrument}
          sustainActive={sustainActive}
          onSustainChange={setSustainActive}
          octave={octave}
          onOctaveChange={setOctave}
          activeTab={activeTab}
          recorder={recorder}
          harmoniumTranspose={harmoniumTranspose}
          harmoniumOctave={harmoniumOctave}
        />

        <p className="footer">
          <kbd>Q</kbd>–<kbd>P</kbd> play
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <kbd>Space</kbd> sustain
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <kbd>Z</kbd>/<kbd>X</kbd> octave shift
        </p>
      </div>

      <div className="watermark">Priyansh Singh</div>
    </div>
  )
}

export default App
