# Inventory Management System — Angular UI

## Run in Visual Studio Code
1. Extract this ZIP.
2. In VS Code select File → Open Folder → `inventory-angular-frontend`.
3. Open Terminal → New Terminal.
4. Run `npm install`
5. Run `npm start`
6. Open http://localhost:4200

Requires Node.js LTS. To create a production build, run `npm run build`.

## Demo only
On the login screen choose a role, enter any username and a password of at least 8 characters. This is only a UI preview; it does not authenticate real users. Products, orders, and employee records are held in browser memory and reset on refresh. Do not enter real passwords.

## Design coverage
Login, dashboard, inventory search and add/edit/delete, product orders with stock validation, user management and roles. Proposed endpoints from the analysis can be connected later: `/api/auth/login`, `/api/users`, `/api/products`, `/api/orders`.

The frontend's role-specific navigation is only a demo. Java Spring Boot must enforce real authentication and permissions on the backend.
