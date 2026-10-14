# Как задеплоить (macOS)

Всё делается в приложении **Терминал**. Папку проекта лучше держать не в Загрузках, а, например, в Документах:
`~/Documents/pubg-market-deploy`.

Как это устроено: на Render работает **один сервис**. Он раздаёт сайт и одновременно обслуживает чат и общие объявления.
Поэтому после деплоя ничего дополнительно настраивать не нужно: люди заходят по одной ссылке, видят объявления друг друга и общаются.

## Шаг 1. GitHub (один раз)
1. На github.com → **New repository**, имя `pubg-market`. **Не** ставьте галочки «Add README» и «.gitignore». **Create repository**.
2. Скопируйте адрес вида `https://github.com/ВАШ_ЛОГИН/pubg-market.git`.
3. Отправьте проект:
```bash
cd ~/Documents/pubg-market-deploy
bash push-to-github.sh https://github.com/ВАШ_ЛОГИН/pubg-market.git
```
GitHub попросит логин и **токен** вместо пароля: github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, отметьте `repo`, скопируйте токен и вставьте его вместо пароля.

## Шаг 2. Render
**Если раньше у вас был Static Site `pubg-market`** (старая схема), его нужно один раз удалить, потому что тип сервиса поменялся:
1. dashboard.render.com → сервис `pubg-market` → **Settings** → внизу **Delete Web Service / Delete Static Site**.
2. Адрес `pubg-market.onrender.com` освободится и достанется новому сервису.

**Создание нового сервиса:**
1. **New → Blueprint**, выберите репозиторий `pubg-market`, нажмите **Apply**.
2. Подождите 2–3 минуты. Сайт появится на `https://pubg-market.onrender.com`.

Если Blueprint не подошёл: **New → Web Service**, выберите репозиторий, **Runtime** = Node, **Build Command** = `echo ok`, **Start Command** = `node server/index.js`, **Plan** = Free.

## Шаг 3. Проверка
1. Откройте `https://ВАШ-АДРЕС/health`. Должно быть `{"ok":true,...}`.
2. Откройте сам сайт: лента, значок логотипа, вверху нет оранжевой плашки «Нет связи с сервером».
3. Проверьте общение: чек-лист в `TEST.md`.

## Шаг 4. Telegram (по желанию)
Подробно в `TELEGRAM.md`: бот через @BotFather → `/newapp` → адрес сайта на Render. Картинки для бота и Mini App лежат в `public/brand/`.
Для защиты от подделки пользователей добавьте переменную `BOT_TOKEN` (см. `SERVER.md`).

## Каждый раз: как выложить обновление
Подробно в `UPDATE.md`. Коротко: скачайте новый архив `pubg-market-deploy.zip` и выполните в папке проекта:
```bash
cd ~/Documents/pubg-market-deploy
bash apply-update.sh "что изменили"
```
Скрипт найдёт архив в «Загрузках», скопирует файлы (ваш `public/config.js` он не трогает), сделает коммит и отправит в GitHub. Через 1–2 минуты Render обновит сайт.

## Если что-то пошло не так
| Что вы видите | Что делать |
|---|---|
| `nothing to commit, working tree clean` | Новые файлы не скопированы в папку проекта. Используйте `apply-update.sh`. |
| `no such file or directory: ./update.sh` | В папке старая версия. Скопируйте новую (см. `UPDATE.md`). |
| `Permission denied` | Запускайте через `bash apply-update.sh ...`, а не `./apply-update.sh`. |
| `not a git repository` | Вы не в папке проекта: `cd ~/Documents/pubg-market-deploy`. |
| `rejected ... non-fast-forward` | `git pull --rebase`, затем снова `bash apply-update.sh "..."`. |
| `Authentication failed` | Нужен токен GitHub вместо пароля (шаг 1). |
| Render: «cannot change service type» | Удалите старый Static Site (шаг 2) и примените Blueprint заново. |
| Сайт не обновился | Подождите 2 минуты, посмотрите вкладку **Events** в Render, обновите страницу. |
| Плашка «Нет связи с сервером» | Сервер на бесплатном тарифе мог заснуть: подождите до минуты и обновите страницу. |
| В Telegram старая версия | Закройте Mini App и откройте заново. |
| В Telegram белый экран | Адрес в BotFather должен начинаться с `https://` и открываться в обычном браузере. |

## Что в архиве
```
public/index.html          приложение
public/config.js           ваши настройки (ссылка Telegram; адрес сервера обычно пустой)
public/landing/            страница «Coming soon»
public/logo.svg и др.      логотип и фирменные картинки (public/brand/)
server/                    сервер: сайт + чат + общие объявления (Node, без зависимостей)
render.yaml                настройки Render
push-to-github.sh          первая отправка
update.sh                  отправка обновлений вручную
apply-update.sh            обновление одной командой из скачанного архива
README.md, DEPLOY.md, UPDATE.md, TELEGRAM.md, SERVER.md, TEST.md   инструкции
```
