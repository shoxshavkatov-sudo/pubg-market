#!/usr/bin/env bash
# Первая отправка. Использование: ./push-to-github.sh https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
set -e
if [ -z "$1" ]; then
  echo "Укажите адрес репозитория, например:"
  echo "  ./push-to-github.sh https://github.com/ВАШ_ЛОГИН/pubg-market.git"
  exit 1
fi
[ -d .git ] || git init -b main
git add .
git commit -m "Initial commit: PUBG Mobile Market" || echo "Нечего коммитить, продолжаем"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$1"
git push -u origin main
echo "Готово: код в GitHub. Дальше подключите репозиторий в Render (см. README.md)."
