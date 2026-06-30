// Visual Physics — сервер без внешних зависимостей (node:http + node:sqlite + fetch).
//   • отдаёт статический сайт из корня проекта
//   • POST /api/lead  — сохраняет заявку в БД и шлёт уведомление в Telegram
//   • POST /api/chat  — чат-бот (Gemini / OpenAI / Claude, если есть ключ; иначе FAQ)
//   • GET  /api/leads — список заявок (нужен ?token=ADMIN_TOKEN)
//   • GET  /admin     — простая страница со списком заявок
//   • GET  /api/health

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { insertLead, markTelegramSent, getLeads, countLeads } from './db.js';
import { sendLead, telegramConfigured } from './telegram.js';
import { answer, aiEnabled, aiProvider } from './chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..'); // корень проекта = статический сайт
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

/* ── helpers ─────────────────────────────────────────── */
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function readJsonBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

// Простой rate-limit в памяти (на IP+бакет)
const buckets = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { count: 1, reset: now + windowMs }); return false; }
  b.count++;
  return b.count > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}, 60_000).unref();

/* ── static ──────────────────────────────────────────── */
async function serveStatic(pathname, req, res) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  if (!extname(rel) && !rel.endsWith('/')) rel += '.html'; // чистые URL: /models -> /models.html

  // запрет на доступ к серверу, скрытым файлам и обходу путей
  const segments = rel.split('/').filter(Boolean);
  if (segments.some(s => s === '..' || s.startsWith('.')) || segments[0] === 'server' || segments[0] === 'node_modules') {
    return send(res, 403, 'Forbidden');
  }

  const filePath = resolve(ROOT, '.' + rel);
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) return send(res, 403, 'Forbidden');

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) return send(res, 403, 'Forbidden');
    const ext = extname(filePath).toLowerCase();
    const lastModified = info.mtime.toUTCString();

    // Если файл не менялся с последнего запроса — отдаём 304 (быстро, без тела).
    if (req.headers['if-modified-since'] === lastModified) {
      return send(res, 304, '', { 'Last-Modified': lastModified });
    }

    const data = await readFile(filePath);
    // HTML/CSS/JS меняются часто и без версионирования имён — пусть всегда перепроверяются.
    // Картинки/шрифты можно кэшировать надолго.
    const revalidate = ext === '.html' || ext === '.css' || ext === '.js' || ext === '.mjs';
    const cache = revalidate ? 'no-cache' : 'public, max-age=86400';
    send(res, 200, data, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cache,
      'Last-Modified': lastModified,
    });
  } catch {
    // отдаём index.html для неизвестных путей без расширения (мягкий fallback)
    if (!extname(rel)) {
      try {
        const data = await readFile(join(ROOT, 'index.html'));
        return send(res, 200, data, { 'Content-Type': MIME['.html'] });
      } catch { /* ignore */ }
    }
    send(res, 404, 'Not Found');
  }
}

/* ── server ──────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const ip = clientIp(req);

  try {
    if (path === '/api/health') {
      return json(res, 200, {
        ok: true,
        telegram: telegramConfigured(),
        ai: aiEnabled(),
        ai_provider: aiProvider(),
        leads: countLeads(),
      });
    }

    if (path === '/api/chat' && req.method === 'POST') {
      if (rateLimited('chat:' + ip, 30, 60_000)) return json(res, 429, { ok: false, error: 'Слишком много сообщений, попробуйте позже' });
      const body = await readJsonBody(req);
      const message = String(body.message || '').slice(0, 2000);
      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      if (!message.trim()) return json(res, 400, { ok: false, error: 'empty message' });
      const result = await answer(message, history, body.lang);
      return json(res, 200, { ok: true, ...result });
    }

    if (path === '/api/lead' && req.method === 'POST') {
      if (rateLimited('lead:' + ip, 8, 60_000)) return json(res, 429, { ok: false, error: 'Слишком много заявок, попробуйте позже' });
      const body = await readJsonBody(req);

      // honeypot: если бот заполнил скрытое поле — делаем вид, что всё ок
      if (body['bot-field']) return json(res, 200, { ok: true, id: null });

      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      if (!name || !phone) return json(res, 400, { ok: false, error: 'Укажите имя и телефон' });

      const lead = {
        name: name.slice(0, 200),
        phone: phone.slice(0, 60),
        school: String(body.school || '').trim().slice(0, 200),
        role: String(body.role || '').trim().slice(0, 60),
        message: String(body.message || '').trim().slice(0, 2000),
        source: String(body.source || req.headers.referer || 'site').slice(0, 300),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
        ip,
      };

      let id = null;
      try { id = insertLead(lead); }
      catch (e) { console.error('[lead] db error:', e.message); return json(res, 500, { ok: false, error: 'Ошибка сохранения' }); }

      const tg = await sendLead(lead);
      if (tg.ok && id != null) { try { markTelegramSent(id); } catch {} }
      if (!tg.ok && !tg.skipped) console.error('[lead] telegram error:', tg.error);

      return json(res, 200, { ok: true, id, telegram: tg.ok });
    }

    if (path === '/api/leads' && req.method === 'GET') {
      if (!process.env.ADMIN_TOKEN) return json(res, 403, { ok: false, error: 'ADMIN_TOKEN не задан в .env' });
      const token = url.searchParams.get('token') || req.headers['x-admin-token'];
      if (token !== process.env.ADMIN_TOKEN) return json(res, 401, { ok: false, error: 'unauthorized' });
      return json(res, 200, { ok: true, count: countLeads(), leads: getLeads(500) });
    }

    if (path === '/admin' && req.method === 'GET') {
      const data = await readFile(join(__dirname, 'admin.html'));
      return send(res, 200, data, { 'Content-Type': MIME['.html'] });
    }

    if (path.startsWith('/api/')) return json(res, 404, { ok: false, error: 'not found' });

    // статика
    return await serveStatic(path, req, res);
  } catch (e) {
    console.error('[server] error:', e.message);
    if (e.message === 'invalid json') return json(res, 400, { ok: false, error: 'invalid json' });
    return json(res, 500, { ok: false, error: 'server error' });
  }
});

server.listen(PORT, () => {
  console.log('\n  Visual Physics server');
  console.log('  ──────────────────────────────');
  console.log(`  ▶ Сайт:    http://localhost:${PORT}`);
  console.log(`  ▶ Заявки:  http://localhost:${PORT}/admin`);
  console.log(`  ▶ Telegram: ${telegramConfigured() ? 'подключён ✅' : 'не настроен ⚠️  (см. .env)'}`);
  console.log(`  ▶ ИИ-чат:   ${aiEnabled() ? `${aiProvider()} ✅` : 'режим FAQ (без ключа)'}`);
  console.log('  ──────────────────────────────\n');
});
