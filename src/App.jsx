import { useState, useEffect } from 'react'
import Piano from './components/Piano'
import ThemePicker from './components/ThemePicker'
import { THEMES, DEFAULT_THEME } from './constants/themes'
import './App.css'

function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId)
  if (!theme) return
  const root = document.documentElement
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val)
  }
}

function App() {
  const [soundMode, setSoundMode] = useState('synth')
  const [theme, setTheme] = useState(DEFAULT_THEME)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="app">
      <ThemePicker currentTheme={theme} onThemeChange={setTheme} />

      <h1 className="title">Piano</h1>
      <p className="subtitle">play with your keyboard</p>

      <div className="mode-toggle">
        <button
          className={`toggle-btn${soundMode === 'synth' ? ' active' : ''}`}
          onClick={() => setSoundMode('synth')}
        >
          Synth
        </button>
        <button
          className={`toggle-btn${soundMode === 'sample' ? ' active' : ''}`}
          onClick={() => setSoundMode('sample')}
        >
          Samples
        </button>
      </div>

      <Piano soundMode={soundMode} />

      <p className="footer">
        <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd>{' '}
        <kbd>Y</kbd> <kbd>U</kbd> <kbd>I</kbd> <kbd>O</kbd> <kbd>P</kbd>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <kbd>2</kbd> <kbd>3</kbd> <kbd>5</kbd> <kbd>6</kbd> <kbd>7</kbd>{' '}
        <kbd>9</kbd> <kbd>0</kbd>
      </p>
    </div>
  )
}

export default App
