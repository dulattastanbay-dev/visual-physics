// Логика чат-бота.
//  • OpenAI (Responses API) — основной ИИ-провайдер при OPENAI_API_KEY.
//  • Claude остаётся совместимым вариантом при ANTHROPIC_API_KEY.
//  • Без ключа — поиск по базе знаний (FAQ) по ключевым словам.
// В любом случае чат продолжает отвечать даже при временной ошибке провайдера.

import { FAQ, QUICK_REPLIES, knowledgeText, SITE } from './knowledge.js';

const CLAUDE_MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function safeErrorMessage(message) {
  return String(message || '')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[masked-openai-key]')
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[masked-anthropic-key]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[masked-gemini-key]')
    .replace(/AQ\.[A-Za-z0-9._-]+/g, '[masked-gemini-key]');
}

function hasOpenAiKey() {
  // OpenAI API keys start with sk- / sk-proj-. If another token is pasted,
  // do not mark AI as live; otherwise the widget promises AI while requests
  // only fall back to local FAQ.
  return /^sk-/.test(String(process.env.OPENAI_API_KEY || '').trim());
}

function geminiKey() {
  return String(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    (String(process.env.AI_PROVIDER || '').toLowerCase() === 'gemini' ? process.env.OPENAI_API_KEY : '') ||
    ''
  ).trim();
}

function hasGeminiKey() {
  return Boolean(geminiKey());
}

function hasAnthropicKey() {
  return /^sk-ant-/.test(String(process.env.ANTHROPIC_API_KEY || '').trim());
}

export function aiProvider() {
  const requested = String(process.env.AI_PROVIDER || 'auto').toLowerCase();
  const gemini = hasGeminiKey();
  const openai = hasOpenAiKey();
  const anthropic = hasAnthropicKey();

  if ((requested === 'gemini' || requested === 'google') && gemini) return 'gemini';
  if (requested === 'openai' && openai) return 'openai';
  if ((requested === 'anthropic' || requested === 'claude') && anthropic) return 'anthropic';
  if (gemini) return 'gemini';
  if (openai) return 'openai';
  if (anthropic) return 'anthropic';
  return 'local';
}

export function aiEnabled() {
  return aiProvider() !== 'local';
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9ρ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GREETINGS = ['привет', 'здравств', 'добрый день', 'добрый вечер', 'доброе утро', 'hello', 'hi', 'салам', 'ассалам'];
const THANKS = ['спасибо', 'благодар', 'thanks', 'рахмет'];

// Поиск лучшего ответа в FAQ
function matchFaq(message) {
  const text = normalize(message);
  if (!text) return null;

  let best = null;
  let bestScore = 0;
  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = normalize(kw);
      if (k && text.includes(k)) {
        // длинные/составные ключи весомее
        score += k.includes(' ') ? 3 : (k.length >= 5 ? 2 : 1);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 2 ? best : null;
}

// Ответ без LLM
function localAnswer(message) {
  const text = normalize(message);

  if (GREETINGS.some(g => text.includes(g))) {
    return {
      reply: `Привет! Я бот ${SITE.name} 🤖 Помогу разобраться с проектом и моделями. Спросите про модели, заявку или стоимость — или нажмите кнопку ниже.`,
      suggestions: QUICK_REPLIES,
      source: 'local',
    };
  }
  if (THANKS.some(t => text.includes(t))) {
    return {
      reply: 'Пожалуйста! Если захотите модели в свою школу — оставьте заявку на странице «Оставить заявку», мы свяжемся 🙂',
      suggestions: ['Как оставить заявку?', 'Какие есть модели?'],
      source: 'local',
    };
  }

  const hit = matchFaq(message);
  if (hit) return { reply: hit.a, suggestions: QUICK_REPLIES, source: 'local' };

  return {
    reply:
      'Я ещё учусь и не уверен, что понял вопрос 🙂 Могу рассказать про проект Visual Physics, наши модели, как оставить заявку для школы и про стоимость. ' +
      'А лучший способ получить точный ответ — оставить заявку на странице «Оставить заявку».',
    suggestions: QUICK_REPLIES,
    source: 'local',
  };
}

function resolveResponseLang(lang, message) {
  const requested = String(lang || '').toLowerCase();
  if (requested === 'ru' || requested === 'en' || requested === 'kk') return requested;
  if (requested === 'kz' || requested === 'kazakh') return 'kk';

  const text = String(message || '');
  if (/[әғқңөұүһі]/i.test(text)) return 'kk';
  if (/[a-z]/i.test(text) && !/[а-яё]/i.test(text)) return 'en';
  return 'ru';
}

function languageInstruction(lang, message) {
  const code = resolveResponseLang(lang, message);
  const names = {
    ru: 'Russian',
    en: 'English',
    kk: 'Kazakh',
  };
  const strict = {
    ru: 'Use Russian.',
    en: 'Use English only. Translate all Russian source material into natural English.',
    kk: 'Use Kazakh only. Translate all Russian source material into natural Kazakh.',
  };

  return (
    `Target response language: ${names[code]}. ` +
    `${strict[code]} ` +
    `Always answer in ${names[code]}; translate the Russian knowledge base when needed. ` +
    'Do not switch to Russian unless the target language is Russian.'
  );
}

function systemInstructions(lang, message) {
  return (
    languageInstruction(lang, message) + '\n' +
    `Ты — дружелюбный ассистент сайта проекта «${SITE.name}». ` +
    'Отвечай кратко (1–4 предложения), тепло и по делу, на языке пользователя. ' +
    'Помогай посетителям узнать о проекте и моделях и мягко предлагай оставить заявку для школы. ' +
    'Не выдумывай цены и факты: если точной информации нет — предложи оставить заявку. ' +
    'Используй только сведения ниже.\n\n' + knowledgeText()
  );
}

function conversation(message, history, lang) {
  const messages = [];
  for (const h of history || []) {
    const role = h.role === 'assistant' ? 'assistant' : 'user';
    const content = String(h.content ?? h.text ?? '').slice(0, 2000);
    if (content) messages.push({ role, content });
  }
  messages.push({
    role: 'user',
    content: `${languageInstruction(lang, message)}\n\nUser message:\n${String(message).slice(0, 2000)}`,
  });
  return messages;
}

function geminiContents(message, history, lang) {
  const messages = [];
  for (const h of history || []) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    const text = String(h.content ?? h.text ?? '').slice(0, 2000);
    if (text) messages.push({ role, parts: [{ text }] });
  }
  messages.push({
    role: 'user',
    parts: [{ text: `${languageInstruction(lang, message)}\n\nUser message:\n${String(message).slice(0, 2000)}` }],
  });
  return messages;
}

function extractOpenAiText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  return (data?.output || [])
    .flatMap(item => item?.content || [])
    .filter(part => part?.type === 'output_text' || part?.type === 'text')
    .map(part => part?.text || '')
    .join('\n')
    .trim();
}

function extractGeminiText(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('\n')
    .trim();
}

// Ответ через OpenAI Responses API
async function openAiAnswer(message, history, lang) {
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: systemInstructions(lang, message),
      input: conversation(message, history, lang),
      max_output_tokens: 400,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const reply = extractOpenAiText(await resp.json());
  return { reply: reply || localAnswer(message).reply, suggestions: QUICK_REPLIES, source: 'openai' };
}

// Ответ через Gemini
async function geminiAnswer(message, history, lang) {
  const model = encodeURIComponent(GEMINI_MODEL);
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': geminiKey(),
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstructions(lang, message) }] },
      contents: geminiContents(message, history, lang),
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.45,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const reply = extractGeminiText(await resp.json());
  return { reply: reply || localAnswer(message).reply, suggestions: QUICK_REPLIES, source: 'gemini' };
}

async function claudeAnswer(message, history, lang) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: systemInstructions(lang, message),
      messages: conversation(message, history, lang),
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Anthropic API ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const reply = (data.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
    .trim();

  return { reply: reply || localAnswer(message).reply, suggestions: QUICK_REPLIES, source: 'anthropic' };
}

export async function answer(message, history, lang) {
  const provider = aiProvider();
  if (provider !== 'local') {
    try {
      if (provider === 'openai') return await openAiAnswer(message, history, lang);
      if (provider === 'gemini') return await geminiAnswer(message, history, lang);
      return await claudeAnswer(message, history, lang);
    } catch (e) {
      // Если ИИ недоступен — мягко падаем на локальный режим
      console.error(`[chat] ${provider} error, fallback to local:`, safeErrorMessage(e.message));
      const local = localAnswer(message);
      return { ...local, source: 'local-fallback' };
    }
  }
  return localAnswer(message);
}
