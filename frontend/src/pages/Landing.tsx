import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing(): React.ReactElement {
  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome</h1>
      <p>Web Attack Detection demo site</p>
      <Link to="/content"><button>View Content</button></Link>
      <Link to="/auth"><button>Login / Sign Up</button></Link>
    </div>
  );
}
