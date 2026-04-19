import { StrictMode, type ComponentType, type PropsWithChildren } from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider as NextThemeProvider, type ThemeProviderProps } from 'next-themes';
import App from './App.tsx';
import './index.css';

const ThemeProvider = NextThemeProvider as ComponentType<PropsWithChildren<ThemeProviderProps>>;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="slipsaver-theme-v2"
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
);
