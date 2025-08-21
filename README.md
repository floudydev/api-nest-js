# API Gateway - NestJS

🚀 **Современный API Gateway** для игровой платформы с поддержкой аутентификации, рейтингов, WebSocket и контейнеризации.

## ✨ Особенности

- **🔐 Аутентификация**: JWT токены, временные токены для регистрации
- **👥 Управление пользователями**: Создание, поиск, обновление статистики
- **🏆 Рейтинговая система**: Сортировка по балансу, IQ, уровню
- **⚡ Real-time**: WebSocket для мгновенных обновлений
- **🧪 Тестирование**: 60+ тестов (Unit + Integration + E2E)
- **🐳 Docker**: Полная контейнеризация с PostgreSQL, Redis, Nginx
- **📊 Мониторинг**: Логирование и метрики

## 🛠️ Технологический стек

| Категория | Технологии |
|-----------|------------|
| **Backend** | NestJS, TypeScript, Node.js |
| **База данных** | PostgreSQL + TypeORM |
| **Кэширование** | Redis |
| **Аутентификация** | JWT + Passport.js |
| **WebSocket** | Socket.IO |
| **Валидация** | class-validator, class-transformer |
| **Тестирование** | Jest, Supertest |
| **Контейнеризация** | Docker, docker-compose |
| **Proxy** | Nginx |

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd fastApi
npm install
```

### 2. Конфигурация

Создайте файл `.env`:

```bash
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# JWT токены
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Временные токены
TEMP_TOKEN_EXPIRATION=10m

# Сервер
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### 3. Запуск разработки

```bash
# Запуск в режиме разработки
npm run start:dev

# Сборка проекта
npm run build

# Запуск продакшн
npm run start:prod
```

### 4. Docker (рекомендуется)

```bash
# Проверка Docker окружения
./scripts/docker-check.sh

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты (30 тестов)
npm run test

# Интеграционные тесты (17 тестов)
npx jest test/integration.spec.ts

# Простые интеграционные тесты (10 тестов)
npx jest test/simple-integration.spec.ts

# E2E mock тесты
npm run test:e2e:mock
```

### Тестирование API

```bash
# Быстрое тестирование API endpoints
./scripts/test-api.sh
```

## 📡 API Endpoints

### Аутентификация

```http
POST /auth/login
POST /auth/login/token  
POST /auth/register
POST /auth/token/temporary
POST /auth/token/refresh
POST /auth/token/validate
```

### Рейтинги

```http
GET /ranking?type=balance&limit=10&offset=0
GET /ranking/stats
```

### Примеры запросов

**Получение временного токена:**
```bash
curl -X POST http://localhost:3000/auth/token/temporary \
  -H "Content-Type: application/json"
```

**Регистрация:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "registrationToken": "your-temp-token"
  }'
```

**Вход:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "password": "password123"
  }'
```

## 🏗️ Архитектура

```
src/
├── auth/              # Аутентификация и авторизация
│   ├── dto/           # Data Transfer Objects
│   ├── guards/        # Защитники маршрутов
│   ├── strategies/    # Passport стратегии
│   └── auth.service.ts
├── user/              # Управление пользователями
│   ├── entities/      # TypeORM сущности
│   └── user.service.ts
├── token/             # Управление токенами
│   ├── entities/      # Token сущности
│   └── token.service.ts
├── ranking/           # Рейтинговая система
│   ├── dto/           # DTO для рейтингов
│   └── ranking.service.ts
├── websocket/         # WebSocket Gateway
│   └── realtime.gateway.ts
└── main.ts           # Точка входа приложения
```

## 🐳 Docker конфигурация

### Сервисы

- **app**: NestJS приложение (порт 3000)
- **db**: PostgreSQL база данных (порт 5432)
- **redis**: Redis кэш (порт 6379)
- **nginx**: Reverse proxy (порт 80)

### Файлы

- `Dockerfile` - Сборка Node.js приложения
- `docker-compose.yml` - Оркестрация сервисов
- `nginx.conf` - Конфигурация Nginx
- `scripts/init.sql` - Инициализация БД

## 🔌 WebSocket

### События

- `user-online` - Пользователь вошел в систему
- `user-offline` - Пользователь вышел из системы
- `ranking-updated` - Обновление рейтинга
- `new-achievement` - Новое достижение

### Подключение

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('ranking-updated', (data) => {
  console.log('Рейтинг обновлен:', data);
});
```

## 🔐 Безопасность

- **Хеширование паролей**: bcrypt с saltRounds: 12
- **JWT токены**: Access (15 мин) + Refresh (7 дней)
- **Валидация данных**: class-validator для всех DTO
- **Rate limiting**: Защита от спама запросов
- **CORS**: Настраиваемые правила CORS

## 📊 Мониторинг

### Логирование

- Структурированные логи через NestJS Logger
- Логи ошибок и предупреждений
- Логи запросов и ответов

### Метрики

- TypeORM метрики подключений к БД
- Redis метрики кэширования
- WebSocket метрики подключений

## 🚀 Деплой

### Переменные окружения для продакшн

```bash
NODE_ENV=production
DB_HOST=your-prod-db-host
REDIS_HOST=your-prod-redis-host
JWT_SECRET=very-strong-production-secret
CORS_ORIGIN=https://yourapp.com
```

### Docker Compose для продакшн

```bash
# Запуск в продакшн режиме
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Производительность

### Кэширование

- Redis для кэширования частых запросов
- TTL кэширование для рейтингов
- Кэширование сессий пользователей

### Оптимизации

- Connection pooling для PostgreSQL
- Индексы для частых запросов
- Пагинация для больших выборок

## 🤝 Разработка

### Скрипты

```bash
npm run start:dev     # Разработка с hot reload
npm run build         # Сборка проекта
npm run test          # Запуск всех тестов
npm run test:watch    # Тесты в watch режиме
npm run lint          # Линтинг кода
npm run format        # Форматирование кода
```

### Git hooks

- Pre-commit: Линтинг и форматирование
- Pre-push: Запуск тестов

## 📚 Документация

- `PROJECT_OVERVIEW.md` - Полное описание проекта
- `scripts/` - Вспомогательные скрипты
- Swagger UI - Автоматическая документация API (планируется)

## 🐛 Отладка

### Логи Docker

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app
```

### Подключение к БД

```bash
# Подключение к PostgreSQL
docker-compose exec db psql -U username -d postgres

# Подключение к Redis
docker-compose exec redis redis-cli
```

## 🔄 CI/CD

Проект готов к интеграции с:

- **GitHub Actions** - `.github/workflows/`
- **GitLab CI** - `.gitlab-ci.yml`
- **Jenkins** - `Jenkinsfile`

### Этапы пайплайна

1. Линтинг и форматирование
2. Unit тесты
3. Интеграционные тесты
4. Сборка Docker образов
5. Деплой в staging/production

## 📞 Поддержка

- 🐛 **Issues**: Создавайте issues для багов
- 💡 **Feature requests**: Предложения новых функций
- 📖 **Documentation**: Улучшения документации
- 🤝 **Contributing**: Pull requests приветствуются

---

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

---

**🎯 Готов к разработке, тестированию и развертыванию!**
