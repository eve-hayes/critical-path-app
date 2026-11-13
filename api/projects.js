const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(process.cwd(), 'data', 'projects.json');
const TMP_FILE = '/tmp/critical_path_projects.json';

function readDB() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      return JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
    }
    if (fs.existsSync(SEED_FILE)) {
      const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      try { fs.writeFileSync(TMP_FILE, JSON.stringify(seed, null, 2), 'utf8'); } catch (e) {}
      return seed;
    }
  } catch (e) {}
  return {};
}

function writeDB(projects) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const projects = readDB();
  const id = req.query && req.query.id;

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, projects });
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (body.projects && typeof body.projects === 'object') {
      for (const [k, v] of Object.entries(body.projects)) {
        if (!projects[k] || (v.updatedAt || 0) >= (projects[k].updatedAt || 0)) {
          projects[k] = v;
        }
      }
      writeDB(projects);
    }
    res.status(200).json({ ok: true, projects });
    return;
  }

  if ((req.method === 'PUT' || req.method === 'POST') && id) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    projects[id] = body;
    writeDB(projects);
    res.status(200).json({ ok: true, id });
    return;
  }

  if (req.method === 'DELETE' && id) {
    delete projects[id];
    writeDB(projects);
    res.status(200).json({ ok: true, id });
    return;
  }

  res.status(200).json({ ok: true, projects });
};
