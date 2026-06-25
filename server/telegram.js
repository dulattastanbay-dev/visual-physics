// Отправка заявок в Telegram через Bot API.
// Нужны переменные окружения:
//   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
//   TELEGRAM_CHAT_ID   — id чата/пользователя (можно несколько через запятую)

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const ROLE_MAP = {
  teacher: 'Учитель физики',
  director: 'Директор / завуч',
  parent: 'Родитель',
  other: 'Другое',
};

function buildMessage(lead) {
  const lines = [
    '🎓 <b>Новая заявка — Visual Physics</b>',
    '',
    `👤 <b>Имя:</b> ${esc(lead.name)}`,
    `📞 <b>Телефон:</b> ${esc(lead.phone)}`,
    lead.school ? `🏫 <b>Школа:</b> ${esc(lead.school)}` : null,
    lead.role ? `💼 <b>Роль:</b> ${esc(ROLE_MAP[lead.role] || lead.role)}` : null,
    lead.message ? `💬 <b>Сообщение:</b> ${esc(lead.message)}` : null,
    '',
    `🕒 ${new Date().toLocaleString('ru-RU')}`,
    lead.source ? `🔗 ${esc(lead.source)}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export async function sendLead(lead) {
  if (!telegramConfigured()) return { ok: false, skipped: true, error: 'Telegram не настроен' };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = String(process.env.TELEGRAM_CHAT_ID)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const text = buildMessage(lead);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const results = await Promise.all(
    chatIds.map(async chat_id => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) return { ok: false, error: data.description || `HTTP ${r.status}` };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })
  );

  const okAny = results.some(r => r.ok);
  const errors = results.filter(r => !r.ok).map(r => r.error);
  return { ok: okAny, error: okAny ? undefined : errors.join('; ') };
}
