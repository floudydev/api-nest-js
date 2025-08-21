# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Продакшн образ
FROM node:18-alpine AS production

# Создаем пользователя для приложения
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем только продакшн зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Переключаемся на пользователя приложения
USER nestjs

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["node", "dist/main.js"]
