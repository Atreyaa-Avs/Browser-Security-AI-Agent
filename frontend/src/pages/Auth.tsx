import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Auth(): React.ReactElement {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  return (
    <div style={{ padding: 40 }}>
      <h1>{mode === 'login' ? 'Login' : 'Sign Up'}</h1>
      <form>
        <input placeholder="Email" /><br />
        <input type="password" placeholder="Password" /><br />
        <button type="submit">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        Switch to {mode === 'login' ? 'Sign Up' : 'Login'}
      </button>
      <br />
      <Link to="/">Back home</Link>
    </div>
  );
}
