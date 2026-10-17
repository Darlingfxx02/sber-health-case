# СберЗдоровье — интерактивный кейс

Чат, виджеты, подробный экран пульса, история проектирования и музыкальный эпилог.

## Локальный запуск

```sh
cd prototype
npm ci
npm run build
npm start
```

Адрес: http://localhost:4317/. Для автоматической пересборки: `npm run watch`.

## Проверка и публикация

`npm run check` проверяет приложение и кейс. `npm run build:pages` собирает статический сайт в `prototype/dist/` с относительными путями для GitHub Pages.

Публикация запускается вручную через workflow **Publish case to GitHub Pages** после отправки изменений в `main`. GitHub Pages должен использовать источник **GitHub Actions**. Сервер локального журнала событий на опубликованном сайте не используется.

Подробности структуры: [prototype/presentation/README.md](prototype/presentation/README.md).
