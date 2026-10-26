import React from 'react';
import { Link } from 'react-router-dom';

export default function Content(): React.ReactElement {
  return (
    <div style={{ padding: 40 }}>
      <h1>Content Page</h1>
      <p>This is some content for the browser agent to inspect.</p>
      <Link to="/">Back home</Link>
    </div>
  );
}
