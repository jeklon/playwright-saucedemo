# Petstore API — автотести (Playwright)

API-тести для **Swagger Petstore v2** (`https://petstore.swagger.io/v2`), написані за
чеклістом `petstore-checklist.md`. Працюють через `request`-фікстуру Playwright (без браузера).

## Запуск

```bash
npm install            # якщо ще не встановлено
npm run test:api       # лише API-тести (проєкт "api", один прогін)
npm test               # все: API (×1) + UI (×3 браузери)
npm run report         # відкрити HTML-звіт
```

> API-тести виділені в окремий Playwright-проєкт `api` (див. `playwright.config.ts`):
> власний `baseURL`, і `testIgnore: '**/api/**'` на браузерних проєктах, щоб вони
> не ганялися тричі.

## Структура

| Файл | Що покриває |
|------|-------------|
| `petstore.helpers.ts` | константи, фабрики даних (Pet/User/Order), retry-хелпери |
| `petstore.flow.spec.ts` | E2E happy-path, 18 кроків у порядку залежностей (`describe.serial`) |
| `petstore.negative.spec.ts` | незалежні негативні/межові кейси (404-сценарії) |
| `petstore.contract.spec.ts` | задокументовані розбіжності spec ↔ реальний сервер |

## Задокументовані знахідки (contract-спека)

Ці тести **зелені**, але фіксують реальні дефекти сервера (через `annotations`):

- **C1** — «захищені» ендпоінти (`POST/PUT/DELETE /pet`) працюють без токена, хоча
  специфікація декларує `petstore_auth` (OAuth2).
- **C2** — `POST /pet` без обов'язкового `name` повертає `200` замість `405`
  (слабка валідація).
- **Quality** — `GET /pet/{не-число}` віддає в тілі `java.lang.NumberFormatException`
  (витік внутрішньої деталі реалізації).

## Примітки

- Сервер публічний і має **глобальний спільний стан** — тести перевіряють наявність
  свого запису, а не точну кількість/вміст колекцій.
- Сервер **eventually consistent**: `GET` одразу після `POST` може дати 404 →
  хелпери `getUntilOk` / `getUntilStatus` ретраять.
- Кожен прогін генерує унікальні `petId` / `username`, тож паралельні/повторні
  запуски не конфліктують. Створені ресурси прибираються в межах тестів.
