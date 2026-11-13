# InventoryPro Angular REST API frontend

This is the Angular 19 frontend only. It calls the classroom Python FastAPI service over HTTP.
It does not contain or replace the Python backend or PostgreSQL database.

## Configure the API URL

Edit `src/environments/environment.ts`:

```ts
apiBaseUrl: 'http://127.0.0.1:8000'
```

Use the base URL where the classroom FastAPI service is running. Do not add `/api/products` to this value.

## Run the frontend

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Important backend contract gap

The supplied classroom `fall2026python/main.py` currently includes:
- `POST /api/products`
- `PUT /api/products/{product_id}`
- `POST /api/orders`
- `POST /api/orders/{order_id}/items`
- `POST /api/orders/{order_id}/complete`

It does **not** currently include `GET /api/products`. This frontend calls `GET /api/products` so it can load real product records, but the inventory list and dashboard cannot show database records until the backend team adds that GET route and returns a JSON array of products.

The frontend maps the API fields:
- `id` -> product ID
- `sku` -> SKU shown in the UI
- `name`, `description`, `price`
- `quantity` or `stock` -> stock count, if the GET endpoint returns it
- `reorder_level` -> low-stock threshold

The supplied `ProductCreate` schema accepts `name`, `sku`, `description`, `price`, and `reorder_level`. `ProductUpdate` accepts `name`, `description`, `price`, and `reorder_level`. Therefore this frontend sends only those supported fields. The current backend does not support setting initial stock quantity, category, deleting products, listing orders, or user management. Those UI areas are not populated with fake records and are marked unavailable rather than pretending they work.

## CORS

The FastAPI backend must allow the Angular origin `http://localhost:4200`. If the browser reports a CORS error, the backend team must configure FastAPI CORS middleware. This is a backend setting; Angular cannot bypass it.

## GitHub

Commit this Angular project to the frontend repository. Keep the Python backend in its separate classroom repository. Do not commit `.env` files, database passwords, or other secrets.
