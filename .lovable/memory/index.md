# Project Memory

## Core
UI follows an Instagram pattern: categories as stories, 3-column grid, vertical feed details.
Use descriptive text labels for navigation (e.g., 'Volver al menú').
Likes use double-tap 'heart-pop' animation and are strictly in-memory (no persistence).
Orders are in-person only: complete by showing screen to waiter or via WhatsApp.
Multi-tenant: public menus live at /r/:slug, owner panel at /dashboard, admin panel at /admin.
Cuisine templates (mexican/italian/chinese/japanese/generic) override CSS vars + font in RestaurantView.

## Memories
- [Instagram UI Pattern](mem://diseno/patron-instagram) — Rules for the restaurant menu UI inspired by Instagram
- [Cart & Ordering](mem://funcionalidades/carrito-pedidos) — In-person order flow and WhatsApp integration
- [Real-time Search](mem://funcionalidades/busqueda) — Search functionality placement and behavior
- [Profile Contact Actions](mem://funcionalidades/contacto-perfil) — External links for profile buttons
- [UI & Navigation Preferences](mem://ux/preferencias-interfaz) — Navigation labels and cart button persistence rules
- [Like System](mem://funcionalidades/sistema-likes) — Instagram-style double-tap likes (in-memory only)
- [Chef Assistant](mem://funcionalidades/asistente-chef) — Virtual assistant flow and UI placement
