import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'board.json');
const MAX_BODY = 5 * 1024 * 1024; // 5MB guard

// In-memory copy of the persisted document: { version, board }.
// `version` is a monotonically increasing counter clients poll to detect
// changes made on other devices; `board` is the normalized BoardState (or null
// before anything has been saved).
let doc = { version: 0, board: null };

async function load() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === 'number') doc = parsed;
  } catch {
    // No file yet (or unreadable) — start empty; the first client seeds it.
  }
}

/** Atomic write: serialize to a temp file, then rename over the target. */
async function persist() {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(doc));
  await rename(tmp, DATA_FILE);
}

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('payload too large'));
        req.destroy();
      } else {
        data += chunk;
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function isBoard(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.columns) &&
    value.cards &&
    typeof value.cards === 'object'
  );
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/api/version') {
      return send(res, 200, { version: doc.version });
    }
    if (req.method === 'GET' && pathname === '/api/board') {
      return send(res, 200, { version: doc.version, board: doc.board });
    }
    if (req.method === 'PUT' && pathname === '/api/board') {
      const raw = await readBody(req);
      let board;
      try {
        board = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: 'invalid json' });
      }
      if (!isBoard(board)) return send(res, 400, { error: 'invalid board shape' });
      // Last write wins — fine for a single user across their own devices.
      doc = { version: doc.version + 1, board };
      await persist();
      return send(res, 200, { version: doc.version, board: doc.board });
    }
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    return send(res, 500, { error: err?.message ?? String(err) });
  }
});

await load();
server.listen(PORT, () => {
  console.log(`kando server listening on :${PORT} (data: ${DATA_FILE})`);
});
