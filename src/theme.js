import { createTheme } from '@mui/material';

export const BRAND_COLORS = {
  blue: '#4285f4', blueDark: '#1967d2', blueSoft: '#e8f0fe', blueMuted: '#d2e3fc',
  green: '#34a853', greenDark: '#188038', greenSoft: '#e6f4ea', greenMuted: '#ceead6',
};

export const theme = createTheme({
  palette: {
    primary: { main: BRAND_COLORS.blue, dark: BRAND_COLORS.blueDark, light: BRAND_COLORS.blueMuted },
    secondary: { main: BRAND_COLORS.green, dark: BRAND_COLORS.greenDark, light: BRAND_COLORS.greenMuted },
    success: { main: BRAND_COLORS.green }, info: { main: BRAND_COLORS.blue },
    warning: { main: '#fbbc05' }, error: { main: '#ea4335' },
    background: { default: '#ecf3fe', paper: 'rgba(255, 255, 255, .9)' }, text: { primary: '#25324a', secondary: '#748096' },
  },
  typography: { fontSize: 18.2, fontFamily: '"Segoe UI", Arial, sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
  shape: { borderRadius: '1rem' },
  components: {
    MuiCssBaseline: { styleOverrides: { ':root': {
      '--app-background': '#ecf3fe', '--card-background': 'rgba(255, 255, 255, .9)',
      '--brand-blue': BRAND_COLORS.blue, '--brand-blue-dark': BRAND_COLORS.blueDark,
      '--brand-blue-soft': BRAND_COLORS.blueSoft, '--brand-blue-muted': BRAND_COLORS.blueMuted,
      '--brand-green': BRAND_COLORS.green, '--brand-green-dark': BRAND_COLORS.greenDark,
      '--brand-green-soft': BRAND_COLORS.greenSoft, '--brand-green-muted': BRAND_COLORS.greenMuted,
    } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 'var(--app-radius)' } } },
  },
});
