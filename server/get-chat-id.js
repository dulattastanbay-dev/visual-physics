// Помощник: узнать chat_id для Telegram-уведомлений.
//
//  1) Создайте бота через @BotFather и получите токен.
//  2) Впишите токен в server/.env  →  TELEGRAM_BOT_TOKEN=...
//  3) Напишите своему боту в Telegram любое сообщение ("привет").
//     Чтобы слать в группу — добавьте бота в группу и напишите там.
//  4) Запустите:  npm run chat-id
//  5) Скопируйте показанный chat_id в .env  →  TELEGRAM_CHAT_ID=...

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Не задан TELEGRAM_BOT_TOKEN. Впишите его в server/.env');
  process.exit(1);
}

const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await r.json();

if (!data.ok) {
  console.error('❌ Ошибка от Telegram:', data.description);
  console.error('   Проверьте, что токен правильный.');
  process.exit(1);
}

const chats = new Map();
for (const u of data.result) {
  const msg = u.message || u.channel_post || u.my_chat_member || u.edited_message;
  const chat = msg && msg.chat;
  if (chat) chats.set(chat.id, chat);
}

if (chats.size === 0) {
  console.log('\nℹ️  Пока нет сообщений боту.');
  console.log('   Откройте Telegram, напишите своему боту любое сообщение и запустите снова:\n   npm run chat-id\n');
  process.exit(0);
}

console.log('\n✅ Найденные чаты — впишите нужный id в TELEGRAM_CHAT_ID:\n');
for (const [id, chat] of chats) {
  const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || '';
  console.log(`   chat_id = ${id}   (${chat.type}${title ? ', ' + title : ''})`);
}
console.log('');
