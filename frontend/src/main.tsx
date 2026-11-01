import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import Demo from './pages/Demo';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
<Route path="/" element={<Dashboard />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/investigation/:id" element={<Investigation />} />
    </Routes>
  </BrowserRouter>
);
