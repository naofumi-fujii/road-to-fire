'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import { system } from './theme'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  )
}
