---
name: Mesas y sesiones de mesa
description: Mesero abre sesión sobre una mesa, genera QR con código corto; cliente entra por /m/:code y queda como diner con alias opcional
type: feature
---
- Tabla `tables` (restaurant_id, label único por restaurante, capacity, is_active). CRUD owner vía RLS desde `/dashboard/mesas`; mesero crea desde `/mesero` vía edge function `waiter-tables`.
- Tabla `table_sessions` (code único 6 chars alfabeto sin ambiguos, status open/closed, índice parcial impide >1 sesión open por mesa). Sin acceso cliente: solo edge functions con service role.
- Tabla `diners` (session_id, device_id, alias opcional). Si alias null → "Invitado #N".
- Edge functions: `waiter-tables` (list/create/update con waiter_token), `session-open`, `session-close` (waiter_token), `session-join` / `session-state` (públicas).
- Cliente entra por `/m/:code` → modal alias opcional → guarda `tableSession` en localStorage → redirige a `/r/:slug`. `RestaurantPublic` muestra banner sticky con mesa+alias y botón Salir.
- Hooks: `useWaiterSession()` valida token mesero; `useTableSession()` lee/escribe el localStorage `tableSession`.
