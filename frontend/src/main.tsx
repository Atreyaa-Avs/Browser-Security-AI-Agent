import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Content from './pages/Content';
import Auth from './pages/Auth';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/content" element={<Content />} />
      <Route path="/auth" element={<Auth />} />
    </Routes>
  </BrowserRouter>
);
