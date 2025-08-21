#!/bin/bash

echo "🧪 API Gateway - Быстрое тестирование"

BASE_URL="http://localhost:3000"

# Проверяем, что сервер запущен
echo "🔍 Проверка доступности сервера..."
if ! curl -s "$BASE_URL/auth/token/temporary" > /dev/null; then
    echo "❌ Сервер не запущен на $BASE_URL"
    echo "🚀 Запустите сервер: npm run start:dev"
    exit 1
fi

echo "✅ Сервер доступен"

# 1. Получение временного токена
echo ""
echo "📝 1. Получение временного токена..."
TEMP_TOKEN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    "$BASE_URL/auth/token/temporary")

echo "Ответ: $TEMP_TOKEN_RESPONSE"

# Извлекаем токен (простая версия)
TEMP_TOKEN=$(echo $TEMP_TOKEN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TEMP_TOKEN" ]; then
    echo "❌ Не удалось получить временный токен"
    exit 1
fi

echo "✅ Временный токен получен: $TEMP_TOKEN"

# 2. Регистрация пользователя  
echo ""
echo "👤 2. Регистрация нового пользователя..."
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"testuser_$(date +%s)\",
        \"password\": \"password123\", 
        \"registrationToken\": \"$TEMP_TOKEN\"
    }" \
    "$BASE_URL/auth/register")

echo "Ответ: $REGISTER_RESPONSE"

# 3. Вход в систему
echo ""
echo "🔐 3. Вход в систему..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"testuser_$(date +%s)\",
        \"password\": \"password123\"
    }" \
    "$BASE_URL/auth/login")

echo "Ответ: $LOGIN_RESPONSE"

# 4. Получение рейтинга
echo ""
echo "🏆 4. Получение рейтинга..."
RANKING_RESPONSE=$(curl -s -X GET \
    "$BASE_URL/ranking")

echo "Ответ: $RANKING_RESPONSE"

# 5. Статистика рейтинга
echo ""
echo "📊 5. Статистика рейтинга..."
STATS_RESPONSE=$(curl -s -X GET \
    "$BASE_URL/ranking/stats")

echo "Ответ: $STATS_RESPONSE"

echo ""
echo "✅ Базовое тестирование API завершено!"
echo ""
echo "🔗 Доступные endpoints:"
echo "   POST $BASE_URL/auth/token/temporary"
echo "   POST $BASE_URL/auth/register"
echo "   POST $BASE_URL/auth/login"
echo "   POST $BASE_URL/auth/token/validate"
echo "   POST $BASE_URL/auth/token/refresh"
echo "   GET  $BASE_URL/ranking"
echo "   GET  $BASE_URL/ranking/stats"
