# Visual Physics — сайт

## Project Description

Visual Physics is an educational website and model catalog that turns school physics into clear, hands-on experiments. It shows interactive learning models, introduces the team, collects school requests, and includes an AI chatbot that explains the project and helps visitors understand how visual experiments make formulas easier to learn in school.

## License

Source code is licensed under the MIT License. See [LICENSE](LICENSE). Photos, logos, personal images, and branding assets belong to the Visual Physics team and may not be reused without permission.

Образовательный проект: интерактивные физические модели для школ.
Статический сайт + лёгкий backend (заявки в базу, уведомления в Telegram, ИИ чат-бот).

## Как запустить

Сайт можно открыть двумя способами.

**1. Просто открыть `index.html`** в браузере — увидите весь сайт, анимации и чат-бот
(в этом режиме заявки и чат работают в офлайн-режиме без сохранения в базу).

**2. С сервером (рекомендуется)** — тогда работают база заявок, Telegram и полноценный чат:

```bash
cd server
npm start
```
Откройте **http://localhost:3000**. Подробная настройка (Telegram, админка, ИИ) — в [server/README.md](server/README.md).

> Нужен только Node.js 22.5+. Внешние библиотеки ставить не нужно — `npm install` не требуется.

## Что нового

- 🤖 **ИИ чат-бот** — плавающая кнопка в правом нижнем углу на всех страницах.
  Работает сразу (по базе знаний о проекте). Можно подключить Claude — см. server/README.
- 🗄️ **База заявок** — форма сохраняет заявки в SQLite (`server/data/leads.db`).
- 📲 **Telegram-уведомления** — о каждой заявке приходит сообщение «кто оставил заявку».
- 👀 **Админка заявок** — `http://localhost:3000/admin`.
- ✨ **Анимации** — плавное появление блоков, счётчики, ховер-эффекты, кнопка «наверх».
- 📱 **Адаптивность** — корректно выглядит на телефоне, планшете и десктопе.
- 📚 **Описания проектов** — все 6 страниц моделей наполнены (принцип, формула, практика).
- 👥 **Команда** — обновлён состав.

## Как поменять фотографии

Все картинки лежат в папках `assets/` (команда, школы, музеи) и `modelki/` (модели).
Чтобы заменить фото — **положите новый файл с тем же именем** поверх старого. Например:

- Фото модели «Стул с шариками» → замените `modelki/stul.png`
- Фото участника Дулата → положите фото и поменяйте `src` в `team.html`
  (сейчас там SVG-заглушка `assets/avatar-dulat.svg`)

Рекомендуемый размер фото моделей — примерно 1200×900, команды — квадрат (например 600×600).

## Структура

```
index.html, object.html, team.html, contacts.html, thanks.html, *detail.html  — страницы
styles.css            — стили
script.js             — анимации, чат-бот, карусели, форма
assets/  modelki/      — изображения
server/               — backend (заявки, Telegram, чат) — см. server/README.md
```
