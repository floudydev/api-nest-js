-- Инициализация базы данных
-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание индексов для оптимизации
-- Индексы создадутся автоматически через TypeORM, но можно добавить дополнительные

-- Создание функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Функция для очистки истекших токенов (будет вызываться по cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM tokens WHERE expires_at < NOW();
END;
$$ language 'plpgsql';
