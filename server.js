const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'projects.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  return {};
}

function writeDB(projects) {
  try {
    const tmpFile = DB_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(projects, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

const sseClients = new Set();

function broadcastProjects(projects) {
  const payload = `data: ${JSON.stringify({ type: 'snapshot', projects })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = decodeURIComponent(urlObj.pathname);

  // CORS headers for API
  if (reqPath.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // SSE stream for real-time database updates
  if (reqPath === '/api/projects/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    const projects = readDB();
    res.write(`data: ${JSON.stringify({ type: 'snapshot', projects })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // GET all projects
  if (reqPath === '/api/projects' && req.method === 'GET') {
    const projects = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, projects }));
    return;
  }

  // Bulk sync / seed projects
  if (reqPath === '/api/projects' && req.method === 'POST') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const current = readDB();
      if (data.projects && typeof data.projects === 'object') {
        for (const [id, proj] of Object.entries(data.projects)) {
          if (!current[id] || (proj.updatedAt || 0) >= (current[id].updatedAt || 0)) {
            current[id] = proj;
          }
        }
        writeDB(current);
        broadcastProjects(current);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, projects: current }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT or DELETE single project: /api/projects/:id
  const projMatch = reqPath.match(/^\/api\/projects\/([^/]+)$/);
  if (projMatch) {
    const id = projMatch[1];
    if (req.method === 'PUT' || req.method === 'POST') {
      try {
        const raw = await collectBody(req);
        const body = JSON.parse(raw);
        const projects = readDB();
        projects[id] = body;
        writeDB(projects);
        broadcastProjects(projects);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, id }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
    if (req.method === 'DELETE') {
      const projects = readDB();
      delete projects[id];
      writeDB(projects);
      broadcastProjects(projects);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id }));
      return;
    }
  }

  // Static files
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8'
  };

  const contentType = mimeTypes[ext] || 'text/html; charset=utf-8';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end('Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
