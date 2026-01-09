import { IconButton } from '@chakra-ui/react'
import { useTheme } from '~/root'
import { FaSun, FaMoon } from 'react-icons/fa'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

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
