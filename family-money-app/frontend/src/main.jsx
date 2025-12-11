import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ApolloProvider } from '@apollo/client'
import client from './api/apolloClient.js'
import { CssBaseline } from '@mui/material'

// Font Roboto untuk Material UI (Optional, tapi disarankan)
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <CssBaseline />
        <App />
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>,
)