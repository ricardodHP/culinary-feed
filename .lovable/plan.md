
# Etapa 1 — Meseros (usuario + PIN) por restaurante

Esta etapa solo cubre **gestión de cuentas de mesero**. Mesas, sesiones, QR de mesa y órdenes se diseñan en etapas siguientes (dejamos la puerta abierta pero no creamos esas tablas todavía).

## Decisiones aplicadas

- Mesero pertenece a **un restaurante** (campo `restaurant_id` obligatorio).
- Pueden crear meseros: **admin de plataforma** y **owner del restaurante**.
- Login del mesero: **usuario + PIN**, sin email real, fuera del flujo `auth.users` de Supabase. Esto se hace mediante una edge function que valida credenciales y devuelve una sesión propia (token firmado) para el mesero.

## Modelo de datos

Nueva tabla `public.waiters`:

- `restaurant_id` (FK lógica → restaurants)
- `username` (único por restaurante, lowercase, 3–30 chars)
- `display_name`
- `pin_hash` (hash bcrypt del PIN, nunca el PIN en claro)
- `is_active` (boolean, default true)
- `last_login_at`
- `created_by` (uuid del admin/owner que lo creó)

Índice único compuesto `(restaurant_id, username)`.

Nueva tabla `public.waiter_sessions` (para tokens emitidos por la edge function):

- `waiter_id`
- `token_hash`
- `expires_at`
- `created_at`, `revoked_at`

Se añade enum `app_role` valor `'waiter'` solo si más adelante también queremos darle entrada al sistema vía `auth.users`. **En esta etapa NO lo agregamos** — el mesero no es un `auth.users`, vive solo en `waiters`.

## RLS

`waiters`:
- SELECT / INSERT / UPDATE / DELETE permitido si `has_role(auth.uid(), 'admin')` **o** `auth.uid() = restaurants.owner_id` del restaurante referido.
- `anon` no puede leer (los PIN hash no deben exponerse).

`waiter_sessions`:
- Sin acceso desde el cliente. Toda lectura/escritura va por edge functions con service role.

## Edge functions

1. `waiter-create` — admin/owner crea mesero. Valida rol, hashea PIN con bcrypt, inserta fila.
2. `waiter-set-pin` — admin/owner reinicia el PIN de un mesero existente.
3. `waiter-login` — público. Recibe `{ restaurant_slug, username, pin }`, valida hash, crea fila en `waiter_sessions` y devuelve `{ token, waiter: {...} }`.
4. `waiter-logout` — invalida sesión.
5. `waiter-me` — valida token y devuelve datos del mesero (útil para proteger rutas futuras).

Todas con CORS, validación Zod, y `verify_jwt = false` para `waiter-login` (es público).

## UI

### Admin
- Nueva pestaña **Admin → Restaurantes → [ver] → Meseros**: lista, crear, reset PIN, activar/desactivar.

### Owner
- Nuevo item en el sidebar del dashboard: **"Meseros"** (`/dashboard/waiters`).
- Lista de meseros del restaurante con: nombre, usuario, estado, último acceso.
- Botón **"Nuevo mesero"** → modal con `display_name`, `username`, `pin` (4–6 dígitos), `confirmar pin`. Validación Zod en cliente.
- Por fila: **Reset PIN**, **Activar/Desactivar**, **Eliminar** (con confirmación).
- Nota visible: "El mesero inicia sesión en /mesero con este usuario y PIN."

### Pantalla de login mesero (sólo placeholder en esta etapa)
- Ruta pública `/mesero/login` con formulario `restaurante (slug) + usuario + PIN`. Al loguear guarda token en `localStorage` y redirige a `/mesero` (que en esta etapa solo muestra "Bienvenido {nombre}" — la operación real se construye en etapa 2).

## Fuera de alcance (siguientes etapas)

- Mesas (`tables`), sesiones de mesa (`table_sessions`), comensales (`diners`), órdenes (`orders`, `order_items`).
- QR único por sesión de mesa.
- Unir pedidos individuales a cuenta grupal.
- Vista operativa del mesero (abrir mesa, generar QR, cerrar cuenta).

## Detalles técnicos

- Hash de PIN: `bcrypt` vía `npm:bcryptjs` en edge functions (cost 10).
- Token de sesión mesero: UUID v4 aleatorio (32 bytes) almacenado hasheado con SHA-256 en `waiter_sessions.token_hash`; expiración 12 h, renovable.
- Validación PIN: solo dígitos, longitud 4–6, no secuenciales obvios (1234, 0000) — warning, no bloqueo.
- Memoria de proyecto a actualizar tras implementación: agregar regla "Los meseros son cuentas internas por restaurante (waiters table), login con usuario+PIN vía edge functions, no son auth.users."

## Entregables de esta etapa

1. Migración SQL: tablas `waiters`, `waiter_sessions`, RLS, índices.
2. Edge functions `waiter-create`, `waiter-set-pin`, `waiter-login`, `waiter-logout`, `waiter-me`.
3. Página `/dashboard/waiters` (owner) y sección Meseros en admin del restaurante.
4. Página `/mesero/login` + `/mesero` (placeholder bienvenida).
5. Hook `useWaiterSession()` para leer el token y datos del mesero logueado.
