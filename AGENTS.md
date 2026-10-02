# Repository Guidelines

## Contexto y alcance

**The Order of Steering** es una web pública y app de misiones inspirada en Snowmoon. Leer `PROJECT.md`. React, TypeScript y Vite sirven la interfaz; Fastify gestiona perfiles, sesiones, evidencia y decisiones. SQLite es local; Turso/libSQL mantiene datos en Vercel.

Nota de Obsidian: **Projects/The Order of Steering**; resolver el vault mediante la configuración personal de Nicol. Conservar decisiones en `PROJECT.md` y resultados, comprobaciones y próximos pasos en esa nota.

## Estructura y assets

- `src/pages/`: landing y app con HashRouter.
- `src/components/`: escenas, diálogos y conexiones; AtlasVisuals compone la landing.
- `src/lib/`: reglas, autenticación y estado remoto.
- `server/`: API, almacenamiento, firmas SIWE y OAuth/verificación de X.
- `api/index.ts` y `vercel.json`: función y configuración de Vercel.
- `tests/`: dominio, seguridad/API, despliegue y Playwright.
- `public/assets/`: branding y escenas servidas.
- Anclar exclusiones de fuentes en .vercelignore: /assets/; nunca excluir public/assets/. El build verifica copias e integridad.
- `assets/branding/`: PFP original aprobada, preservar intacta.
- `assets-src/`: fuentes; WEBSITE-GENERATIONS.json registra generaciones.
- `.local/`: SQLite, claves, variables privadas y capturas; ignorado por Git.

Nicol autorizó personas; conservar escenas y PFP. Planificar medios; coste verificado máximo de tres créditos por imagen.

## Convenciones y validación

Hablar español con Nicol; toda interfaz, errores, accesibilidad y ejemplos en inglés. Keepers es el equipo; Sentinels es el sistema de verificación.

Node 22.x, mínimo 22.16. Comandos: `npm ci`, `npm run dev` (5173/5174), `npm run check`, `npm test`, `npm run test:libsql`, `npm run test:e2e` y `npm run build`. PowerShell admite npm.cmd. Edge ejecuta Playwright en 5180/5181 con datos aislados y X simulado. Comprobar desktop, móvil, teclado y movimiento reducido según el cambio.

Exigir wallet y X para entregas; Keepers mediante allowlist del servidor. No aceptar puntos, aprobaciones o identidad del cliente. Pendientes no conceden puntos; decisiones finales no se repiten; editar misiones conserva puntos históricos. No importar registros antiguos como puntos autenticados.

El tablero real empieza vacío; no regenerar misiones de ejemplo. Su retirada es una migración única auditada que preserva entregas. Las pruebas cargan ejemplos explícitos; `ORDER_TEST_EMPTY_BOARD=1` con `npm run test:e2e -- --grep @empty-board` valida el recorrido desde cero.

## Desarrollo y entrega

Desarrollo local, sin delegación salvo petición nueva. No usar design-taste-frontend. Preservar proyectos vecinos; nunca operar sobre el Git padre.

Nicol autorizó subir a **SolClaude33/the-order-of-steering**. Usar exclusivamente ese destino y el Git propio del proyecto; no publicar credenciales ni datos locales. Nicol gestiona Vercel; no desplegar por él.

Seguir `DEPLOYMENT.md`, `README.md` y `.env.example`. Secretos solo en servidor; conservar base y clave juntas. X real requiere configuración y comprobación. Tokens todavía no se distribuyen.
