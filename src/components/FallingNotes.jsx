import { useState, useEffect, useRef, useCallback } from 'react'
import './FallingNotes.css'

let noteIdCounter = 0
const RISE_SPEED = 90 // pixels per second

export default function FallingNotes({ activeNotes, midiActiveNotes, midiMode, displayKeys, pianoRef }) {
  const [notes, setNotes] = useState([])
  const prevActiveRef = useRef({})
  const positionsRef = useRef({})
  const activeNoteIds = useRef({}) // noteId → internal id of the currently growing bar
  const rafRef = useRef(null)

  // Measure actual key center positions and widths from the DOM
  useEffect(() => {
    const piano = pianoRef?.current
    if (!piano) return

    const measure = () => {
      const pianoRect = piano.getBoundingClientRect()
      if (pianoRect.width === 0) return
      const pos = {}
      piano.querySelectorAll('.key').forEach((el) => {
        const label = el.querySelector('.label')
        if (!label) return
        const note = label.textContent
        const r = el.getBoundingClientRect()
        pos[note] = {
          left: ((r.left + r.width / 2 - pianoRect.left) / pianoRect.width) * 100,
          widthPx: r.width,
        }
      })
      positionsRef.current = pos
    }

    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(piano)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pianoRef, displayKeys])

  // Animation loop: update heights of active (growing) notes and positions of released notes
  const animate = useCallback(() => {
    const now = Date.now()
    setNotes((prev) => {
      let changed = false
      const next = prev.map((n) => {
        if (n.released) {
          // After release, note rises and fades
          const elapsed = (now - n.releasedAt) / 1000
          const newBottom = n.frozenBottom + elapsed * RISE_SPEED
          if (newBottom > 400) return null // off screen
          if (newBottom !== n.bottom) {
            changed = true
            return { ...n, bottom: newBottom }
          }
          return n
        } else {
          // Still held — grow upward
          const elapsed = (now - n.createdAt) / 1000
          const newHeight = Math.max(8, elapsed * RISE_SPEED)
          if (Math.abs(newHeight - n.height) > 0.5) {
            changed = true
            return { ...n, height: newHeight }
          }
          return n
        }
      }).filter(Boolean)

      // Only trigger re-render if something changed
      return changed ? next.slice(-120) : prev
    })
    rafRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  useEffect(() => {
    const activeSet = new Set()

    if (midiMode) {
      if (midiActiveNotes) Object.keys(midiActiveNotes).forEach((n) => activeSet.add(n))
    } else {
      if (activeNotes) Object.values(activeNotes).forEach((n) => activeSet.add(n))
    }

    const now = Date.now()

    // Detect new notes being pressed
    const newNotes = []
    for (const noteId of activeSet) {
      if (!prevActiveRef.current[noteId]) {
        const info = positionsRef.current[noteId]
        if (info) {
          const id = ++noteIdCounter
          newNotes.push({
            id,
            noteId,
            left: info.left,
            widthPx: info.widthPx,
            type: displayKeys.find((k) => k.note === noteId)?.type || 'white',
            createdAt: now,
            height: 4,
            bottom: 0,
            released: false,
            releasedAt: null,
            frozenBottom: 0,
          })
          activeNoteIds.current[noteId] = id
        }
      }
    }

    // Detect notes being released
    for (const noteId of Object.keys(prevActiveRef.current)) {
      if (!activeSet.has(noteId) && activeNoteIds.current[noteId]) {
        const releasedId = activeNoteIds.current[noteId]
        setNotes((prev) =>
          prev.map((n) =>
            n.id === releasedId && !n.released
              ? { ...n, released: true, releasedAt: now, frozenBottom: 0 }
              : n
          )
        )
        delete activeNoteIds.current[noteId]
      }
    }

    if (newNotes.length > 0) {
      setNotes((prev) => [...prev.slice(-120), ...newNotes])
    }

    const prevMap = {}
    for (const n of activeSet) prevMap[n] = true
    prevActiveRef.current = prevMap
  }, [activeNotes, midiActiveNotes, midiMode, displayKeys])

  // Cleanup old notes
  useEffect(() => {
    const interval = setInterval(() => {
      setNotes((prev) => prev.filter((n) => !n.released || Date.now() - n.releasedAt < 4000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="falling-notes">
      {notes.map((note) => (
        <div
          key={note.id}
          className={`fn-bar ${note.type}${note.released ? ' released' : ''}`}
          style={{
            left: `${note.left}%`,
            width: `${note.widthPx}px`,
            height: `${note.height}px`,
            bottom: `${note.bottom}px`,
          }}
        />
      ))}
    </div>
  )
}
