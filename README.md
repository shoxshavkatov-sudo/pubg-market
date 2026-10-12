# PUBG Mobile Market

Шаблон маркетплейса игровых аккаунтов: лента, карточки, чат в стиле Telegram, профиль, кошелёк с 3D-картой.
Статический сайт (один HTML-файл, без сборки). Данные хранятся в браузере пользователя (localStorage).
Работает как обычный сайт и как **Telegram Mini App** (подключение: `TELEGRAM.md`).

## Структура
```
public/index.html          приложение
public/landing/index.html  страница «Coming soon» с формой e-mail
render.yaml                настройки Render (Blueprint)
push-to-github.sh          первая отправка в GitHub
update.sh                  отправка обновлений
TELEGRAM.md                подключение к Telegram
```

## Запуск локально
```bash
python3 -m http.server 8080 --directory public
# http://localhost:8080  (лендинг: http://localhost:8080/landing/)
```

## Шаг 1. Отправить в GitHub
1. На github.com создайте пустой репозиторий (без README и .gitignore), например `pubg-market`.
2. В папке проекта выполните:
```bash
./push-to-github.sh https://github.com/ВАШ_ЛОГИН/pubg-market.git
```
GitHub попросит логин и Personal Access Token (или используйте SSH-ключ).

## Шаг 2. Развернуть на Render
**Вариант A (рекомендуется): Blueprint**
1. dashboard.render.com → **New → Blueprint**.
2. Выберите репозиторий, Render прочитает `render.yaml` → **Apply**.
3. Через минуту сайт будет на `https://pubg-market.onrender.com`.

**Вариант B: вручную**
1. **New → Static Site**, выберите репозиторий.
2. **Build Command**: пусто (или `echo ok`).
3. **Publish Directory**: `public` → **Create Static Site**.

## Шаг 3. Подключить Telegram
Следуйте инструкции в `TELEGRAM.md`.

## Обновления
Замените файлы (обычно `public/index.html`), затем:
```bash
./update.sh "что изменили"
```
Render сам пересоберёт сайт за 1–2 минуты. Свой домен: Settings → Custom Domains.

## Что важно знать
- Сервера нет: объявления, чаты, профиль и карта сохраняются только на устройстве пользователя. Покупки, оплата, вход и чат между разными людьми потребуют бэкенда.
- Платёжные данные не хранятся: карта сохраняется только как последние 4 цифры.
- Кнопки «Поделиться» и «Копировать» требуют HTTPS, Render выдаёт его автоматически.
