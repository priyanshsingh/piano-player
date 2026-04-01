import { useCallback } from 'react'

export default function PianoKey({ mapping, isActive, onNoteStart, onNoteStop, disabled, showKeybind = true }) {
  const { key: keyChar, note, type } = mapping

  const className = `key ${type}${isActive ? ' active' : ''}${disabled ? ' disabled' : ''}`

  const handlePointerDown = useCallback((e) => {
    if (disabled) return
    e.preventDefault()
    onNoteStart(keyChar)
  }, [keyChar, onNoteStart, disabled])

  const handlePointerUp = useCallback(() => {
    if (disabled) return
    onNoteStop(keyChar)
  }, [keyChar, onNoteStop, disabled])

  return (
    <div
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <span className="label">{note}</span>
      {showKeybind && keyChar && <span className="keybind">{keyChar.toUpperCase()}</span>}
    </div>
  )
}
