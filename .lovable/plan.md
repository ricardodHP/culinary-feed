
# Etapa 2 — Mesas, sesiones de mesa y QR

## Alcance

- **Mesas (`tables`)**: catálogo por restaurante. CRUD desde el dashboard del owner y desde la vista operativa del mesero.
- **Sesiones de mesa (`table_sessions`)**: una sesión abierta por mesa a la vez. La abre el mesero, genera un QR único; los clientes la escanean y entran a la mesa.
- **Comensales (`diners`)**: cada cliente que entra a la sesión queda registrado con alias opcional ("Invitado #N" si no lo da).
- **Sin órdenes todavía** — eso es Etapa 3.

## Modelo de datos

### `public.tables`
- `restaurant_id` (FK)
- `label` (texto corto: "Mesa 5", "Terraza A")
- `capacity` (int, opcional)
- `is_active` (bool, default true)
- `created_by_waiter_id` (nullable — mesas creadas por mesero quedan trazadas)
- Único: `(restaurant_id, lower(label))`

### `public.table_sessions`
- `restaurant_id`, `table_id` (FK)
- `code` (texto corto único global, ej. `MX7K2P` — va en el QR para URLs cortas)
- `opened_by_waiter_id`
- `opened_at`, `closed_at` (nullable)
- `status` (enum: `open`, `closed`)
- Índice parcial: una sola fila `status='open'` por `table_id`.

### `public.diners`
- `session_id` (FK)
- `device_id` (uuid del cliente, generado en localStorage)
- `alias` (nullable; si null → "Invitado #N")
- `joined_at`
- Único: `(session_id, device_id)`

## RLS

- `tables`:
  - SELECT/INSERT/UPDATE/DELETE para `admin` o `auth.uid() = restaurants.owner_id`.
  - INSERT/UPDATE adicionales para el mesero se hacen vía edge function con service role (el mesero no tiene `auth.uid`).
  - `anon` puede SELECT solo de mesas activas de restaurantes `published` (no expone nada sensible y simplifica vistas públicas si las necesitamos luego). *Opcional — empezamos sin grant a `anon` y lo añadimos si hace falta.*
- `table_sessions`: sin acceso desde el cliente. Todo vía edge functions.
- `diners`: lectura/escritura pública controlada por edge function (`session-join`, `session-state`).

## Edge functions

1. **`waiter-tables`** (requiere token mesero): `list`, `create`, `update`, `set_active`. Owner sigue usando RLS desde el cliente; el mesero pasa por esta función.
2. **`session-open`** (token mesero): abre sesión sobre una mesa, genera `code` único (6 chars base32 sin ambiguos), devuelve `{ session, qr_url }`. Falla si ya hay sesión abierta para esa mesa.
3. **`session-close`** (token mesero): cierra sesión activa.
4. **`session-join`** (público): recibe `{ code, device_id, alias? }`. Resuelve sesión por `code`, upsert `diners`, devuelve `{ session, table, restaurant, diner }`.
5. **`session-state`** (público): por `code` o `session_id` + `device_id`, devuelve estado actual (mesa, comensales). Útil para el cliente y para la vista operativa del mesero.

Todas con CORS, validación Zod. `session-join` y `session-state` son públicas (`verify_jwt = false`).

## UI

### Owner (`/dashboard/mesas`)
- Lista de mesas: label, capacidad, estado, sesión activa (sí/no), acciones.
- Botón **"Nueva mesa"** → modal (label, capacity opcional).
- Editar / activar-desactivar / eliminar (si no tiene sesión activa).

### Mesero (`/mesero`)
- Reemplazamos el placeholder por tablero operativo:
  - Lista de mesas del restaurante, cada tarjeta muestra: label, estado (`libre` / `ocupada`), nº de comensales si está abierta.
  - Tarjeta **libre** → botón **"Abrir mesa"** → genera sesión, abre modal con QR + código.
  - Tarjeta **ocupada** → botón **"Ver QR"** y **"Cerrar mesa"** (con confirmación).
  - Botón **"Nueva mesa"** arriba (modal igual que el de owner, vía `waiter-tables`).

### Modal QR de sesión
- Muestra QR grande apuntando a `https://<host>/m/<code>`.
- Debajo, el código en grande: **"Código de mesa: MX7K2P"** y nota: "El cliente puede escanear el QR o ingresar este código en el menú."
- Botón copiar URL.

### Cliente — entrada por QR (`/m/:code`)
- Página pública ligera:
  - Resuelve la sesión vía `session-join` con `device_id` (de localStorage).
  - Modal opcional: input **"¿Cómo te llamamos?"** con botón "Continuar como invitado".
  - Tras unirse, redirige a `/r/:slug?session=:code` (el menú existente). Guarda `{ code, session_id, diner_id, alias }` en localStorage bajo `tableSession`.
- En `RestaurantPublic`, si detecta `tableSession`, muestra un banner discreto: **"Estás en {label} · {alias}"** con opción de salir.

## Detalles técnicos

- `code` de sesión: 6 chars de alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin 0/O/1/I), generado en edge function con reintento ante colisión.
- QR: usamos la librería ya presente (`SharedCartQrModal` la usa) — reusar el mismo componente QR.
- `device_id` cliente: helper `getOrCreateDeviceId()` en `src/lib/device.ts` (uuid v4 en localStorage, key `device_id`). Si ya existe uno por likes/shared cart, reusarlo.
- Hook nuevo `useTableSession()` lee/escribe `tableSession` en localStorage y expone `{ session, alias, leave() }`.
- Reusar `useWaiterSession()` para llamadas autenticadas del mesero (Authorization: Bearer <waiter token>).

## Fuera de alcance

- Órdenes individuales y grupales.
- Asignar items del carrito existente a la sesión de mesa (eso lo unimos en Etapa 3 — el carrito grupal actual seguirá funcionando como está).
- Cobros / cuenta dividida.

## Entregables

1. Migración SQL: `tables`, `table_sessions`, `diners`, índices, RLS, GRANTs.
2. Edge functions: `waiter-tables`, `session-open`, `session-close`, `session-join`, `session-state`.
3. Páginas: `/dashboard/mesas`, `/m/:code`. Refactor de `/mesero` a tablero operativo.
4. Componente `TableQrModal` (reusa el QR de `SharedCartQrModal`).
5. Hooks `useTableSession`, helper `device.ts`.
6. Banner de sesión activa en `RestaurantPublic`.
7. Actualizar memoria con: "Mesas y sesiones de mesa: mesero abre sesión sobre una mesa, genera QR con `code` corto; cliente entra por `/m/:code`, queda como `diner` con alias opcional en `localStorage.tableSession`."
