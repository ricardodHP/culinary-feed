## Compartir platillo y carrito colaborativo

Dos funciones independientes para compartir con amigos.

---

### 1) Compartir un platillo individual (link "copiar enlace")

**UI**
- En `DishFeed.tsx`, junto a los botones de like / carrito de cada platillo, añadir un botón "Compartir" (icono `Share2` o `Link`).
- Al pulsar: copia al portapapeles un enlace tipo:
  `https://<dominio>/r/<slug>?dish=<dishId>`
- Muestra toast: "Enlace copiado. Tu amigo verá el platillo al abrirlo."

**Apertura del link en el amigo**
- En `RestaurantPublic.tsx`, leer `?dish=<id>` desde `useSearchParams`.
- Si existe y el platillo está en la lista, abrir automáticamente el `DishFeed` centrado en ese platillo (usando el `startIndex` correspondiente).
- El amigo verá un botón "Agregar a mi carrito" (el mismo que ya existe en el feed) y podrá sumarlo a su propio carrito local.

**Analytics**: `trackEvent({ eventType: "view", dishId })` ya cubre la apertura. Opcional: añadir un nuevo `event_type` `share` más adelante (no en este plan).

---

### 2) Carrito colaborativo en vivo

Varios amigos comparten un mismo carrito en tiempo real. El "anfitrión" crea el carrito y comparte un link; los invitados lo abren y pueden añadir/quitar platillos. Todos ven los cambios al instante.

**Modelo de datos (nueva migración)**

```
shared_carts
  id uuid PK
  restaurant_id uuid (no FK, igual que el resto del proyecto)
  code text unique         -- short code para el link (ej. "a7k2qx")
  host_device_id text      -- localStorage id del creador
  created_at timestamptz
  expires_at timestamptz   -- now() + 24h (validado por trigger, no CHECK)

shared_cart_items
  id uuid PK
  cart_id uuid -> shared_carts.id (on delete cascade)
  dish_id uuid
  quantity int default 1
  added_by_name text       -- nombre opcional ("Ana", "Luis")
  added_by_device text     -- localStorage id
  created_at timestamptz
```

**RLS**
- `shared_carts`: SELECT / INSERT / UPDATE / DELETE públicos (anon + authenticated) condicionados a `expires_at > now()`. El carrito es efímero y sin datos personales sensibles; el `code` actúa como secreto.
- `shared_cart_items`: mismas reglas, validando que el `cart_id` referenciado siga vigente.
- Trigger `BEFORE INSERT` en `shared_carts` para validar `expires_at` (no CHECK).

**Realtime**
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_carts, public.shared_cart_items;`
- Suscripción `postgres_changes` a `shared_cart_items` filtrada por `cart_id`.

**Flujo UI**

En `CartModal.tsx`, añadir un botón "Compartir con amigos" junto a "Mostrar al mesero" / "WhatsApp":

1. Si aún no hay carrito compartido:
   - Crea un registro en `shared_carts`, sube los items actuales a `shared_cart_items`.
   - Copia al portapapeles: `https://<dominio>/r/<slug>?group=<code>`.
   - Muestra un banner en el carrito: "Carrito compartido activo · 1 persona".

2. Si el amigo abre el link con `?group=<code>`:
   - Hook nuevo `useSharedCart(code)` que:
     - Carga el carrito y suscribe a cambios realtime.
     - Reemplaza el `CartContext` local por uno "espejo" del carrito remoto: `addItem` / `updateQuantity` / `removeItem` insertan/actualizan/borran en `shared_cart_items`.
   - Banner: "Estás en el carrito de <nombre>. Lo que agregues se verá para todos."
   - Pide un nombre corto la primera vez (guardado en localStorage) para mostrar quién agregó cada platillo.

3. Salir del modo compartido:
   - Botón "Salir del grupo" → vuelve al carrito local.

**Restricciones**
- Solo funciona dentro del mismo restaurante (`restaurant_id` debe coincidir con el slug actual).
- Si `expires_at` pasó o el code no existe → mostrar mensaje y caer al carrito local.
- Sin auth: identidad por `device_id` (uuid en localStorage).

---

### Archivos a tocar

- `src/components/DishFeed.tsx` — botón compartir platillo.
- `src/components/CartModal.tsx` — botón "Compartir con amigos" + banner de estado.
- `src/pages/RestaurantPublic.tsx` — leer `?dish` y `?group` de la URL.
- `src/contexts/CartContext.tsx` — soporte para modo "shared" (sincroniza con Supabase en vez de estado local).
- Nuevo `src/hooks/useSharedCart.ts` — crear, unirse, suscribirse, sincronizar.
- Migración SQL: tablas `shared_carts`, `shared_cart_items`, RLS, trigger de expiración, publicación realtime.

### Fuera de alcance
- Compartir el carrito como texto/resumen (descartado a favor de carrito en vivo).
- WhatsApp / Share API nativo (solo "copiar enlace").
- Eventos de analytics nuevos para `share`.
