import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Professional Navy Blue palette
        navy: {
          50: { value: '#e6f0ff' },
          100: { value: '#b3d1ff' },
          200: { value: '#80b3ff' },
          300: { value: '#4d94ff' },
          400: { value: '#1a75ff' },
          500: { value: '#0052cc' },
          600: { value: '#003d99' },
          700: { value: '#002966' },
          800: { value: '#001a44' },
          900: { value: '#000d22' },
        },
        // Gold accent palette
        gold: {
          50: { value: '#fffbeb' },
          100: { value: '#fef3c7' },
          200: { value: '#fde68a' },
          300: { value: '#fcd34d' },
          400: { value: '#fbbf24' },
          500: { value: '#f59e0b' },
          600: { value: '#d97706' },
          700: { value: '#b45309' },
          800: { value: '#92400e' },
          900: { value: '#78350f' },
        },
        // Emerald green for growth/positive
        emerald: {
          50: { value: '#ecfdf5' },
          100: { value: '#d1fae5' },
          200: { value: '#a7f3d0' },
          300: { value: '#6ee7b7' },
          400: { value: '#34d399' },
          500: { value: '#10b981' },
          600: { value: '#059669' },
          700: { value: '#047857' },
          800: { value: '#065f46' },
          900: { value: '#064e3b' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Primary brand color
        brand: {
          solid: { value: '{colors.navy.600}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.navy.700}' },
          muted: { value: '{colors.navy.100}' },
        },
        // Accent color
        accent: {
          solid: { value: '{colors.gold.500}' },
          contrast: { value: '{colors.navy.900}' },
          fg: { value: '{colors.gold.600}' },
          muted: { value: '{colors.gold.100}' },
        },
        // Success/growth color
        success: {
          solid: { value: '{colors.emerald.500}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.emerald.600}' },
          muted: { value: '{colors.emerald.100}' },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
