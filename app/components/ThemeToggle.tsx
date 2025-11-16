'use client'

import { IconButton } from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <IconButton aria-label="テーマ切り替え" size="lg" variant="ghost" />
  }

  return (
    <IconButton
      aria-label="テーマ切り替え"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      size="lg"
      variant="ghost"
    >
      {theme === 'dark' ? <FaSun /> : <FaMoon />}
    </IconButton>
  )
}
