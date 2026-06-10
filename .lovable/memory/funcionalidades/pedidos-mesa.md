---
name: Pedidos por mesa
description: Pedidos grupales enviados desde el carrito a la sesión de mesa, gestionados por el mesero con estados de cocina
type: feature
---
- Tablas `orders` (restaurant_id, session_id, table_id, status enum order_status, notes, created_by_diner_id, created_by_alias) y `order_items` (order_id, dish_id, dish_name snapshot, unit_price snapshot, quantity, notes).
- Estados: `pending` → `preparing` → `ready` → `delivered`, más `cancelled`. Transiciones validadas en edge function `order-update-status`.
- Edge functions: `order-create` (público; valida diner+sesión open), `orders-list` (waiter token; default excluye delivered/cancelled), `order-update-status` (waiter token), `session-orders` (público por code).
- Cliente: cuando hay `tableSession` activa, el carrito reemplaza WhatsApp/Mostrar al mesero por **"Enviar a la mesa"** que crea un order y limpia el carrito. El banner de `RestaurantPublic` incluye botón **"Mis pedidos"** que abre `TableOrdersDrawer` con polling (`useTableOrders`, 8s).
- Mesero: `/mesero` ahora tiene tabs **Mesas** y **Pedidos**. Pedidos muestra `OrderCard` con botones para avanzar estado. Cada tarjeta de mesa muestra badge de pedidos activos. `useWaiterOrders` polling 5s.
- RLS: orders/order_items SELECT solo para admin u owner del restaurante; writes solo vía service role (edge functions).
- Sin cuenta/total/cobros (Etapa 4).
