# API Gateway проект - Полное описание

## 🎯 Описание проекта

API Gateway для игровой платформы на NestJS с поддержкой:
- Аутентификации и авторизации
- Управления пользователями 
- Рейтинговой системы
- Real-time WebSocket соединений
- Контейнеризации
- Тестирования (Unit + Integration)

## 🏗️ Архитектура

```
src/
├── auth/           # Модуль аутентификации
├── user/           # Модуль пользователей  
├── token/          # Модуль токенов
├── ranking/        # Модуль рейтингов
├── websocket/      # WebSocket Gateway
└── main.ts         # Точка входа
```

## 🔧 Функциональность

### Аутентификация (`/auth`)
- `POST /auth/login` - Вход по логину/паролю
- `POST /auth/login/token` - Вход по временному токену  
- `POST /auth/register` - Регистрация по токену
- `POST /auth/token/temporary` - Получение временного токена
- `POST /auth/token/refresh` - Обновление токена
- `POST /auth/token/validate` - Валидация токена

### Рейтинги (`/ranking`)
- `GET /ranking` - Получение рейтинга (balance, iq, level)
- `GET /ranking/stats` - Статистика рейтингов

### WebSocket (`/ws`)
- Real-time обновления рейтингов
- Уведомления об активности пользователей

## 🛠️ Технологии

- **Backend**: NestJS, TypeScript
- **База данных**: PostgreSQL + TypeORM  
- **Кэш**: Redis
- **Аутентификация**: JWT + Passport
- **WebSocket**: Socket.IO
- **Валидация**: class-validator
- **Тестирование**: Jest
- **Контейнеризация**: Docker + docker-compose
- **Proxy**: Nginx

## 📦 Структура зависимостей

### Основные
```json
{
  "@nestjs/core": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0", 
  "@nestjs/jwt": "^10.1.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "typeorm": "^0.3.17",
  "pg": "^8.11.1",
  "redis": "^4.6.7",
  "bcrypt": "^5.1.0",
  "socket.io": "^4.7.2"
}
```

### Dev зависимости
```json
{
  "@nestjs/testing": "^10.0.0",
  "jest": "^29.5.0",
  "supertest": "^6.3.3",
  "ts-jest": "^29.1.0"
}
```

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
npm test

# Unit тесты
npm run test

# Интеграционные тесты  
npx jest test/integration.spec.ts

# Простые интеграционные тесты
npx jest test/simple-integration.spec.ts

# E2E mock тесты
npm run test:e2e:mock
```

### Статистика тестов
- **Unit тесты**: 30 тестов (auth, user, ranking services)
- **Интеграционные тесты**: 17 тестов (полная интеграция сервисов)
- **E2E тесты**: Mock API endpoints
- **Общее покрытие**: 60+ тестов

## 🐳 Docker

### Сервисы
- **app**: NestJS приложение
- **db**: PostgreSQL база данных
- **redis**: Redis кэш  
- **nginx**: Reverse proxy

### Команды
```bash
# Проверка Docker окружения
./scripts/docker-check.sh

# Сборка образов
docker-compose build

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## 🔧 Конфигурация

### Переменные окружения (.env)
```bash
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=postgres

# Redis
REDIS_HOST=localhost  
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Временные токены  
TEMP_TOKEN_EXPIRATION=10m

# Сервер
PORT=3000
NODE_ENV=development
```

## 🚀 Запуск

### Разработка
```bash
# Установка зависимостей
npm install

# Запуск в dev режиме
npm run start:dev

# Сборка
npm run build

# Запуск продакшн
npm run start:prod
```

### Docker
```bash
# Запуск всей инфраструктуры
docker-compose up -d

# Только база данных
docker-compose up -d db redis
```

## 📊 API Endpoints

### Аутентификация
```http
POST /auth/login
Content-Type: application/json
{
  "username": "user",
  "password": "pass"
}

POST /auth/register  
Content-Type: application/json
{
  "username": "newuser",
  "password": "pass",
  "registrationToken": "temp-token"
}

POST /auth/token/temporary
Content-Type: application/json
{}

POST /auth/token/validate
Content-Type: application/json
{
  "token": "jwt-token"
}
```

### Рейтинги
```http
GET /ranking?type=balance&limit=10&offset=0

GET /ranking/stats
```

## 🔐 Безопасность

- Пароли хешируются с bcrypt (saltRounds: 12)
- JWT токены с настраиваемым временем жизни
- Валидация всех входных данных
- Rate limiting через @nestjs/throttler
- CORS конфигурация

## 📈 Мониторинг и логи

- Логи через встроенный NestJS Logger
- Метрики через TypeORM
- WebSocket события для real-time обновлений

## 🤝 Интеграции

### WebSocket события
- `user-online` - пользователь онлайн
- `user-offline` - пользователь офлайн  
- `ranking-updated` - обновление рейтинга
- `new-achievement` - новое достижение

## 🔄 CI/CD готовность

Проект готов к интеграции с:
- GitHub Actions
- GitLab CI
- Jenkins
- Docker Hub / Registry

## 📝 Дальнейшее развитие

### Возможные улучшения
1. **Микросервисная архитектура** - разделение на отдельные сервисы
2. **GraphQL API** - добавление GraphQL endpoint'ов  
3. **Кэширование** - расширенное кэширование запросов
4. **Аналитика** - интеграция с аналитическими системами
5. **Документация API** - Swagger/OpenAPI генерация
6. **Логирование** - интеграция с ELK Stack
7. **Мониторинг** - Prometheus + Grafana
8. **Тестирование** - E2E тесты с реальной БД

### Масштабирование
- Горизонтальное масштабирование через Docker Swarm/Kubernetes
- Балансировка нагрузки через Nginx/HAProxy
- Кластер Redis для high availability
- Репликация PostgreSQL

## 🎓 Обучающие материалы

Проект демонстрирует:
- Современную архитектуру NestJS приложений
- Интеграцию с базами данных и кэшем
- Реализацию аутентификации и авторизации
- WebSocket для real-time функций
- Комплексное тестирование
- Контейнеризацию и DevOps практики

---

*Проект полностью готов к разработке, тестированию и развертыванию*
