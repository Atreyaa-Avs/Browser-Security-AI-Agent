import { Router, Request, Response } from 'express';

export const testLabRouter = Router();

// Set insecure cookies for testing
testLabRouter.use((_req, res, next) => {
  res.cookie('auth_session', 'sess_9938482a884f', {
    httpOnly: false, // Insecure: missing httpOnly
    secure: false,   // Insecure: missing secure flag
    sameSite: 'none' // Insecure: SameSite none
  });
  // Intentionally omit CSP, HSTS, X-Frame-Options
  res.setHeader('X-Powered-By', 'PHP/7.4.3-TestLab');
  res.setHeader('Server', 'Apache/2.4.41 (Ubuntu)');
  next();
});

// 1. Test Lab Homepage
testLabRouter.get('/', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Autonomous Security Lab - Target Application</title>
      <style>
        body { font-family: sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
        nav a { margin-right: 15px; font-weight: bold; color: #2563eb; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-top: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <h1>Vulnerable Web Application Lab</h1>
      <p>Target web application for autonomous Stagehand security agent verification.</p>
      <nav>
        <a href="/test-lab/search">Product Search</a>
        <a href="/test-lab/login">Member Login</a>
        <a href="/test-lab/profile?id=101">User Profile</a>
        <a href="/test-lab/items?cat=1">Catalog Items</a>
      </nav>
      <div class="card">
        <h3>System Overview</h3>
        <p>This sandbox simulates common web application security vulnerabilities for deterministic detection.</p>
      </div>
    </body>
    </html>
  `);
});

// 2. Search Endpoint (Vulnerable to Reflected XSS)
testLabRouter.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Search Products</title></head>
    <body>
      <h2>Product Catalog Search</h2>
      <form action="/test-lab/search" method="GET">
        <input type="text" name="q" value="${query}" placeholder="Search term..." />
        <button type="submit">Search</button>
      </form>
      <div id="results">
        ${query ? `<p>Search query: ${query}</p>` : ''}
      </div>
      <a href="/test-lab">← Back to Home</a>
    </body>
    </html>
  `);
});

// 3. Login Endpoint
testLabRouter.get('/login', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Account Login</title></head>
    <body>
      <h2>Member Portal Authentication</h2>
      <form action="/test-lab/login" method="POST">
        <div><input type="text" name="username" placeholder="Username or Email" required /></div>
        <div style="margin-top: 10px;"><input type="password" name="password" placeholder="Password" required /></div>
        <div style="margin-top: 10px;"><button type="submit">Sign In</button></div>
      </form>
      <p><a href="/test-lab">← Back</a></p>
    </body>
    </html>
  `);
});

testLabRouter.post('/login', (_req: Request, res: Response) => {
  res.send(`<p>Login attempted. <a href="/test-lab">Return</a></p>`);
});

// 4. Items Endpoint (Vulnerable to SQL Injection)
testLabRouter.get('/items', (req: Request, res: Response) => {
  const cat = (req.query.cat as string) || '';
  let output = '<p>Selected Category: ' + cat + '</p>';

  // Simulate SQL error when quote is supplied
  if (cat.includes("'") || cat.includes('"')) {
    output = `
      <div style="color: red; background: #fee2e2; padding: 15px; border: 1px solid #ef4444;">
        <b>Database Error:</b> Warning: sqlite3::sqlexception: unrecognized token: "'" near "SELECT * FROM items WHERE cat = ${cat}" in /var/www/items.php on line 42
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Catalog Items</title></head>
    <body>
      <h2>Category Items</h2>
      ${output}
      <a href="/test-lab">← Back</a>
    </body>
    </html>
  `);
});

// 5. Profile Endpoint (Vulnerable to IDOR)
testLabRouter.get('/profile', (req: Request, res: Response) => {
  const id = (req.query.id as string) || '101';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>User Profile #${id}</title></head>
    <body>
      <h2>User Profile Record</h2>
      <div style="background: #e2e8f0; padding: 15px; border-radius: 6px;">
        <p><b>User ID:</b> ${id}</p>
        <p><b>Email:</b> user_${id}@internal-corp.test</p>
        <p><b>Role:</b> Standard Customer</p>
        <p><b>Internal Token:</b> sec_token_${id}_active</p>
      </div>
      <p><a href="/test-lab">← Back</a></p>
    </body>
    </html>
  `);
});

