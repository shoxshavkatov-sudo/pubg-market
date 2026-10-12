# PUBG Mobile Market

Шаблон маркетплейса игровых аккаунтов: лента, карточки, чат в стиле Telegram, профиль, кошелёк с 3D-картой.
Это статический сайт (один HTML-файл, без сборки и сервера). Все данные хранятся в браузере пользователя (localStorage).

## Структура

```
public/index.html          приложение
public/landing/index.html  страница «Coming soon» с формой e-mail
render.yaml                настройки для Render (Blueprint)
push-to-github.sh          скрипт отправки в GitHub
```

## Запуск локально

```bash
python3 -m http.server 8080 --directory public
# откройте http://localhost:8080  (лендинг: http://localhost:8080/landing/)
```

## Шаг 1. Отправить в GitHub

1. Создайте на github.com пустой репозиторий (без README и .gitignore), например `pubg-market`.
2. В папке проекта выполните:

```bash
./push-to-github.sh https://github.com/ВАШ_ЛОГИН/pubg-market.git
```

Или вручную:

```bash
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_ЛОГИН/pubg-market.git
git push -u origin main
```

GitHub попросит вход (логин и Personal Access Token, либо SSH-ключ).

## Шаг 2. Развернуть на Render

**Вариант A: через Blueprint (рекомендуется)**
1. На dashboard.render.com нажмите **New → Blueprint**.
2. Выберите репозиторий `pubg-market`, Render прочитает `render.yaml`.
3. Нажмите **Apply**. Через минуту сайт будет доступен по адресу `https://pubg-market.onrender.com`.

**Вариант B: вручную**
1. **New → Static Site**, выберите репозиторий.
2. **Build Command**: оставьте пустым (или `echo ok`).
3. **Publish Directory**: `public`.
4. Нажмите **Create Static Site**.

После этого каждый `git push` в ветку `main` автоматически обновляет сайт. Свой домен можно подключить в Settings → Custom Domains.

## Что важно знать

- Приложение работает без сервера: объявления, чаты, профиль и карта сохраняются только в браузере пользователя.
  Покупки, оплата, настоящий чат между людьми, вход и модерация потребуют бэкенда.
- Платёжные данные не хранятся: карта сохраняется только как последние 4 цифры и только в браузере.
- Кнопки «Поделиться» и «Копировать» требуют HTTPS, Render выдаёт его автоматически.
