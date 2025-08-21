#!/bin/bash

echo "🚀 Проверка Docker окружения API Gateway"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

echo "✅ Docker найден"

# Проверяем наличие docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    exit 1
fi

echo "✅ Docker Compose найден"

echo "🏗️  Сборка Docker образов..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Docker образы собраны успешно"
else
    echo "❌ Ошибка при сборке Docker образов"
    exit 1
fi

echo "🔧 Настройка и запуск сервисов..."
echo "📋 Это включает:"
echo "   - PostgreSQL база данных"
echo "   - Redis кэш"
echo "   - API Gateway приложение"
echo "   - Nginx reverse proxy"

echo ""
echo "🎯 Для запуска выполните:"
echo "   docker-compose up -d"
echo ""
echo "🔍 Для проверки логов:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Для остановки:"
echo "   docker-compose down"

echo ""
echo "🌐 После запуска приложение будет доступно на:"
echo "   http://localhost (через Nginx)"
echo "   http://localhost:3000 (напрямую)"
