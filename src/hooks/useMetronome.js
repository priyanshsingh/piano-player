import { useState, useRef, useCallback, useEffect } from 'react'
import { getAudioContext, getDryOutputNode } from '../audio/audioEngine'

export default function useMetronome() {
  const [active, setActive] = useState(false)
  const [bpm, setBpm] = useState(120)
  const timerRef = useRef(null)
  const activeRef = useRef(false)

  const tick = useCallback(() => {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 1000
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(gain)
    gain.connect(getDryOutputNode())
    osc.start(now)
    osc.stop(now + 0.06)
  }, [])

  const start = useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true
    setActive(true)

    const schedule = () => {
      if (!activeRef.current) return
      tick()
      timerRef.current = setTimeout(schedule, 60000 / bpm)
    }
    schedule()
  }, [bpm, tick])

  const stop = useCallback(() => {
    activeRef.current = false
    setActive(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const toggle = useCallback(() => {
    if (activeRef.current) stop()
    else start()
  }, [start, stop])

  // Restart when BPM changes while active
  useEffect(() => {
    if (!activeRef.current) return
    stop()
    // Small delay to let stop settle
    const id = setTimeout(() => start(), 10)
    return () => clearTimeout(id)
  }, [bpm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { active, bpm, setBpm, toggle }
}
