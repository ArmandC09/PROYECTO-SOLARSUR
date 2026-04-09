import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
)
