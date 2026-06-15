'use client'

import { useState, useEffect } from 'react'
import { playNotificationSound } from '@/lib/sound'

export function useKDSSettings() {
  const [currentTime, setCurrentTime] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [warningThreshold, setWarningThreshold] = useState(5)
  const [criticalThreshold, setCriticalThreshold] = useState(10)
  const [soundTone, setSoundTone] = useState<'info' | 'success' | 'warning'>('info')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('kds_theme')
      if (savedTheme) setIsDarkMode(savedTheme === 'dark')

      const savedWarn = localStorage.getItem('kds_warn_threshold')
      if (savedWarn) setWarningThreshold(parseInt(savedWarn))

      const savedCrit = localStorage.getItem('kds_crit_threshold')
      if (savedCrit) setCriticalThreshold(parseInt(savedCrit))

      const savedTone = localStorage.getItem('kds_sound_tone')
      if (savedTone) setSoundTone(savedTone as any)
    }
  }, [])

  const toggleTheme = () => {
    const nextVal = !isDarkMode
    setIsDarkMode(nextVal)
    localStorage.setItem('kds_theme', nextVal ? 'dark' : 'light')
  }

  const handleSaveSettings = (warn: number, crit: number, tone: 'info' | 'success' | 'warning') => {
    setWarningThreshold(warn)
    setCriticalThreshold(crit)
    setSoundTone(tone)
    localStorage.setItem('kds_warn_threshold', warn.toString())
    localStorage.setItem('kds_crit_threshold', crit.toString())
    localStorage.setItem('kds_sound_tone', tone)
    playNotificationSound(tone)
  }

  useEffect(() => {
    const refreshClock = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR'))
    }

    refreshClock()
    const interval = setInterval(refreshClock, 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    currentTime,
    isDarkMode,
    toggleTheme,
    warningThreshold,
    criticalThreshold,
    soundTone,
    handleSaveSettings
  }
}
