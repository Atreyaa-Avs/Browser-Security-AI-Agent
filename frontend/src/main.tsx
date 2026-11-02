import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import Demo from './pages/Demo';
import './index.css';
import DemoPage from './pages/demo_components';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
<Route path="/" element={<Dashboard />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/investigation/:id" element={<Investigation />} />
    </Routes>
  </BrowserRouter>
);
