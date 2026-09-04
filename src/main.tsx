import '@mantine/core/styles.css';
import './styles.css';
import { Anchor, createTheme, MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

const theme = createTheme({
  scale: 0.875,
  components: {
    Anchor: Anchor.extend({
      defaultProps: { inherit: true },
    }),
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider forceColorScheme="dark" theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
