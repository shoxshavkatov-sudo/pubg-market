# Как задеплоить: пошагово (macOS)

Всё делается в приложении **Терминал**. Папку проекта лучше держать не в Загрузках, а, например, в Документах:
`~/Documents/pubg-market-deploy`.

## Один раз: первая выгрузка

### 1. Создайте репозиторий на GitHub
1. Зайдите на github.com → **New repository**.
2. Имя: `pubg-market`. **Не** ставьте галочки «Add README» и «.gitignore». Нажмите **Create repository**.
3. Скопируйте адрес вида `https://github.com/ВАШ_ЛОГИН/pubg-market.git`.

### 2. Отправьте проект в GitHub
```bash
cd ~/Documents/pubg-market-deploy
bash push-to-github.sh https://github.com/ВАШ_ЛОГИН/pubg-market.git
```
GitHub спросит логин и пароль. Вместо пароля нужен **токен**: github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, отметьте `repo`, скопируйте токен и вставьте его вместо пароля.

### 3. Подключите Render
1. Откройте dashboard.render.com → **New → Blueprint**.
2. Разрешите доступ к GitHub и выберите репозиторий `pubg-market`.
3. Нажмите **Apply**. Через минуту сайт будет на `https://pubg-market.onrender.com`.

Если Blueprint не подошёл: **New → Static Site**, выберите репозиторий, **Publish Directory** = `public`, поле Build Command оставьте пустым.

### 4. Проверьте сайт
Откройте адрес в браузере: должна быть лента с аккаунтами. Лендинг по адресу `/landing/`.

## Каждый раз: как выложить обновление
1. Получите новую версию (архив `pubg-market-deploy.zip`) и распакуйте его.
2. Скопируйте файлы поверх своих. Точка в конце команды обязательна, путь к новой папке подставьте свой:
```bash
cp -R ~/Downloads/pubg-market-deploy/. ~/Documents/pubg-market-deploy/
```
3. Отправьте:
```bash
cd ~/Documents/pubg-market-deploy
bash update.sh "что изменили"
```
4. Подождите 1–2 минуты. Render сам обновит сайт.
5. В Telegram закройте Mini App и откройте заново. В браузере обновите страницу (на телефоне закройте вкладку).

Проверить, что файлы действительно скопировались, можно командой `git status`: она должна показать изменённые файлы. Если пишет `nothing to commit`, значит, вы скопировали не в ту папку или не те файлы.

## Подключение к Telegram
Пошаговая инструкция в `TELEGRAM.md`: бот через @BotFather → `/newapp` → ссылка на сайт Render → ссылка Mini App в `tgAppLink`.

## Если что-то пошло не так
| Что вы видите | Что делать |
|---|---|
| `nothing to commit, working tree clean` | Новые файлы не скопированы в папку проекта. Повторите шаг 2 обновления. |
| `no such file or directory: ./update.sh` | В папке старая версия. Скопируйте новую (шаг 2). |
| `Permission denied` | Запускайте через `bash update.sh ...`, а не `./update.sh`. |
| `not a git repository` | Вы не в папке проекта. Выполните `cd ~/Documents/pubg-market-deploy`. |
| `rejected ... non-fast-forward` | Выполните `git pull --rebase`, затем снова `bash update.sh "..."`. |
| `Authentication failed` / просит пароль | Нужен токен GitHub вместо пароля (см. шаг 2). |
| Render: `Publish directory not found` | В настройках сайта укажите Publish Directory = `public`. |
| Сайт не обновился | Подождите 2 минуты, проверьте вкладку **Events** в Render, затем обновите страницу. |
| В Telegram старая версия | Закройте Mini App и откройте заново. |
| В Telegram белый экран | Адрес в BotFather должен начинаться с `https://` и открываться в обычном браузере. |

## Что в архиве
```
public/index.html          приложение
public/landing/index.html  страница «Coming soon»
render.yaml                настройки Render
push-to-github.sh          первая отправка
update.sh                  отправка обновлений
README.md, TELEGRAM.md, DEPLOY.md   инструкции
```
