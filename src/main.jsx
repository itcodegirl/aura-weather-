import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

// Dev-only endpoint mock for low-level missing-data QA. The user-facing
// `?mock=missing` portfolio demo is handled by the dashboard view model;
// this fetch override is only loaded in development builds.
// Top-level await ensures the fetch override is in place before the
// app's first weather request fires.
if (import.meta.env.DEV) {
  const { installMissingDataMockIfRequested } = await import(
    './dev/missingDataMock.js'
  )
  installMissingDataMockIfRequested()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
