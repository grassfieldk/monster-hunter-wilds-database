import '@mantine/core/styles.css';
import './styles.css';
import { Anchor, createTheme, MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

const theme = createTheme({
  primaryColor: 'sand',
  primaryShade: { light: 6, dark: 6 },
  autoContrast: true,
  colors: {
    sand: [
      '#fff8eb',
      '#f3e7cc',
      '#e7d2a5',
      '#d4b77c',
      '#bc965d',
      '#a67c49',
      '#89613b',
      '#6c4a30',
      '#4e3425',
      '#31231b',
    ],
    dark: [
      '#f4f0e8',
      '#e4ded3',
      '#c9c0b1',
      '#a79d8e',
      '#756d61',
      '#544e45',
      '#39352f',
      '#2b2925',
      '#211f1c',
      '#191816',
    ],
  },
  components: {
    Anchor: Anchor.extend({
      defaultProps: { inherit: true },
    }),
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('root element is missing');
createRoot(root).render(
  <StrictMode>
    <MantineProvider forceColorScheme="dark" theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
