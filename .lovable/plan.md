# Etapa 3 — Pedidos por mesa

## Alcance

- **Pedido grupal por mesa**: los comensales de una `table_session` agregan platos a un pedido común. Cada "ronda" enviada al mesero crea un nuevo `order`.
- **Solo se muestra al mesero**: no hay vista de cocina separada; el mesero gestiona estados desde `/mesero`.
- **Estados**: `pending` → `preparing` → `ready` → `delivered` (también `cancelled`).
- **Sin cuenta/total** todavía — Etapa 4.

## Modelo de datos

### `public.orders`
- `restaurant_id`, `session_id`, `table_id` (FK)
- `status` (enum `order_status`: pending/preparing/ready/delivered/cancelled)
- `notes` (texto opcional libre del comensal)
- `created_by_diner_id` (nullable, FK a `diners`)
- `created_by_alias` (texto snapshot — sobrevive si se borra el diner)
- `created_at`, `updated_at`, `delivered_at` (nullable)

### `public.order_items`
- `order_id` (FK, cascade)
- `dish_id` (FK)
- `dish_name` (snapshot)
- `unit_price` (snapshot)
- `quantity` (int >= 1)
- `notes` (opcional, por item)

Sin tabla de cuenta — la suma se calcula on-the-fly cuando haga falta.

## RLS y acceso

- `orders` y `order_items`: sin acceso directo desde el cliente público. Todo se enruta por edge functions con service role.
- Owner del restaurante: lectura vía RLS (`auth.uid() = restaurants.owner_id`) para futura vista en dashboard.
- Mesero: pasa por edge functions autenticadas con su token (`useWaiterSession`).

## Edge functions

1. **`order-create`** (público): `{ code, device_id, items: [{dish_id, quantity, notes?}], notes? }`.
   - Valida sesión open y diner registrado.
   - Crea `order` + `order_items` con snapshot de nombre/precio desde `dishes`.
   - Devuelve `{ order }`.
2. **`orders-list`** (waiter token): lista pedidos del restaurante del mesero.
   - Filtros opcionales: `session_id`, `status[]`, `since` (default: últimas 24h y no entregados).
   - Devuelve pedidos con items y datos de mesa/diner.
3. **`order-update-status`** (waiter token): `{ order_id, status }`.
   - Valida transición permitida (no retroceder desde `delivered`/`cancelled`).
   - Setea `delivered_at` cuando corresponde.
4. **`session-orders`** (público): por `code` + `device_id`, devuelve pedidos de la sesión actual con sus estados — para que los comensales vean el avance.

Todas con CORS, validación Zod.

## UI

### Cliente — Carrito y banner de sesión
- En `CartModal`, cuando hay `tableSession` activa: reemplazar botón "Pedir por WhatsApp" por **"Enviar a la mesa"**.
  - Llama `order-create` con los items del carrito local.
  - Limpia el carrito y muestra toast "Pedido enviado. El mesero ya lo ve."
- Si NO hay `tableSession`: mantener flujo actual de WhatsApp/mostrar pantalla.
- En el banner de sesión de `RestaurantPublic`: añadir botón **"Mis pedidos"** que abre un drawer/modal con los pedidos de la sesión y su estado en vivo (polling cada 8s + refresh al volver al foco).

### Mesero — `/mesero`
- Añadir tab/sección **"Pedidos"** junto a "Mesas":
  - Lista agrupada por mesa con sesión abierta.
  - Cada `order` muestra: alias del comensal, items + cantidades, notas, tiempo desde envío, estado actual.
  - Botones de acción según estado: `Tomar` (→ preparing), `Listo` (→ ready), `Entregado` (→ delivered), `Cancelar`.
  - Refresh por polling (5s) — sin realtime para mantener simple.
- Badge en la tarjeta de cada mesa del tablero existente: nº de pedidos pendientes.

### Owner — sin cambios visuales en esta etapa
- La data queda disponible vía RLS para una futura vista en dashboard (Etapa 4).

## Detalles técnicos

- Enum `order_status` nuevo. Trigger `set_updated_at` ya existe.
- Snapshot de `dish_name`/`unit_price` en `order_items` para que cambios futuros del menú no alteren historial.
- `useTableOrders(code)` hook nuevo: polling de `session-orders`, expone `{ orders, refresh }`.
- `useWaiterOrders()` hook: polling de `orders-list`, expone `{ orders, updateStatus, refresh }`.
- Componente `OrderCard` reutilizable entre vista cliente y mesero (variante con/sin botones).

## Fuera de alcance

- Cuenta / total / split / cobros.
- Vista de cocina dedicada.
- Edición de pedido tras enviar (por ahora se cancela y se crea otro).
- Notificaciones push.

## Entregables

1. Migración SQL: enum `order_status`, tablas `orders` y `order_items`, índices, RLS, GRANTs, trigger `updated_at`.
2. Edge functions: `order-create`, `orders-list`, `order-update-status`, `session-orders`.
3. Hooks: `useTableOrders`, `useWaiterOrders`. Componente `OrderCard`.
4. Modificación `CartModal` (botón "Enviar a la mesa" cuando hay sesión).
5. Drawer "Mis pedidos" lanzado desde el banner de `RestaurantPublic`.
6. Sección "Pedidos" en `/mesero` con gestión de estados + badges en tablero de mesas.
7. Actualizar memoria del proyecto: "Pedidos por mesa: order grupal por `table_session` con estados pending→preparing→ready→delivered, gestionado por el mesero".
