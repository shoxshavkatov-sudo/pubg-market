#!/usr/bin/env bash
# Применяет скачанное обновление к проекту и отправляет его в GitHub одной командой.
# Использование (из папки проекта):  bash apply-update.sh "что изменили"
set -e
PROJ="$(cd "$(dirname "$0")" && pwd)"
ZIP="$(ls -t "$HOME"/Downloads/pubg-market-deploy*.zip 2>/dev/null | head -1 || true)"
if [ -z "$ZIP" ]; then
  echo "Не нашёл архив pubg-market-deploy*.zip в папке «Загрузки»."
  echo "Скачайте последний архив и запустите скрипт снова."
  exit 1
fi
echo "Беру архив: $ZIP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
IDX="$(find "$TMP" -maxdepth 4 -path '*/public/index.html' | head -1)"
if [ -z "$IDX" ]; then
  echo "В архиве нет public/index.html: это не тот архив."
  exit 1
fi
SRC="$(dirname "$(dirname "$IDX")")"
# ваш config.js (адрес сервера, ссылка Telegram) сохраняем и возвращаем после копирования
KEEP=""
if [ -f "$PROJ/public/config.js" ]; then KEEP="$(mktemp)"; cp "$PROJ/public/config.js" "$KEEP"; fi
cp -R "$SRC"/. "$PROJ"/
if [ -n "$KEEP" ]; then cp "$KEEP" "$PROJ/public/config.js"; rm -f "$KEEP"; fi
cd "$PROJ"
git add -A
if git diff --cached --quiet; then
  echo "Изменений нет: в архиве та же версия, что уже в проекте."
  exit 0
fi
git commit -q -m "${1:-Обновление}"
git push
echo "Готово! Код отправлен в GitHub. Render обновит сайт через 1–2 минуты."
