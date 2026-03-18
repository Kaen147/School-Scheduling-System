import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ✅ Import this
import { Analytics } from "@vercel/analytics/react"
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* ✅ Wrap App with Router */}
      <App />
    </BrowserRouter>
  </StrictMode>
);
