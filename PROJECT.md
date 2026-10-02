# The Order of Steering — contexto para continuar

Actualizado: 2026-10-02. Este documento permite continuar en otro chat sin reconstruir la conversación. Leer también `AGENTS.md`.

## 1. Objetivo y estado real

Crear una app pequeña de misiones para la comunidad de **The Order of Steering**, inspirada de forma reconocible en *Snowmoon*, de Vitalik Buterin.

Los miembros completan tareas, el sistema verifica su cumplimiento, reciben puntos y el equipo quiere recompensarlos con tokens del propio proyecto.

**Ahora existe una web pública y app preparadas para Vercel**, implementadas con React, TypeScript, Vite y Fastify. SQLite conserva el desarrollo local; Turso/libSQL proporciona almacenamiento persistente para la API en Vercel. El perfil se autentica con firma EVM; las entregas requieren wallet y X. Perfiles, puntos, evidencia y decisiones viven en el servidor. X requiere configurar la app de desarrollador y comprobar el recorrido real. Nicol autorizó subir el proyecto a **SolClaude33/the-order-of-steering** y realizará el despliegue en Vercel. No hay token desplegado ni reparto.

La preparación original conservó el concepto y los assets. La implementación local posterior se documenta al final de este archivo y en la nota del proyecto.

## 2. Decisiones confirmadas por Nicol

| Tema | Decisión |
| --- | --- |
| Nombre | **The Order of Steering**, conservar exactamente este nombre. |
| Escala inicial | Proyecto pequeño; evitar convertir el MVP en una plataforma institucional enorme. |
| Producto | App de misiones, puntos y recompensas. |
| Identidad | Wallet EVM y X obligatorios para enviar misiones. La wallet queda como destinatario de futuras recompensas. |
| X developer app | Nicol todavía no la tiene; preparar integración y configuración local. |
| Red | Familia EVM confirmada; cadena concreta y contrato pendientes. |
| Keepers | **El propio equipo de Nicol**. Crea misiones, campañas y reglas. |
| Sentinels | **Un sistema que construiremos para verificar tareas y conceder puntos**. No un comité obligatorio de nueve personas. |
| Misiones | Nicol aceptó contenido original, memes, tutoriales, testing, feedback y reportes de errores. También quiere recompensar likes, comentarios y otras interacciones con el X del proyecto. |
| Recompensas | Puntos por tareas completadas y recompensas en el token propio. Cantidades, conversión y calendario aún pendientes. |
| Nombres del lore | Mantener los términos originales en inglés. No presentar nombres inventados como conceptos del libro. |
| PFP | Última ilustración aprobada **tal como está**, sin iluminar más los ojos ni hacer cambios adicionales. |
| Generación utilizada | Nicol pidió la herramienta de imágenes incorporada, sin Higgsfield, para estos bocetos. |
| Desarrollo posterior | Local, en la carpeta real del proyecto, siguiendo el workflow personal de Nicol. |
| Idioma de producto | Toda la interfaz de webs y apps en inglés: textos, formularios, errores, accesibilidad, ejemplos y metadatos. Conversación con Nicol en español. |

La versión actual consulta autor, texto y respuesta al post objetivo mediante X API. Likes, follows y reposts siguen pendientes. **El acceso y los permisos de una app real de X todavía no se han comprobado.** Las pruebas usan respuestas externas simuladas y firmas criptográficas reales de wallets de prueba; no simular una integración activada.

## 3. Funcionamiento acordado y propuestas pendientes

### Flujo base

1. Los Keepers publican una misión con requisitos, evidencia y puntos.
2. El miembro firma el acceso con una wallet EVM y vincula X; completa la tarea y entrega un enlace o evidencia.
3. Los Sentinels verifican el cumplimiento y evitan acreditar la misma entrega dos veces.
4. Se registran los puntos aprobados.
5. Las recompensas de la campaña se calculan con las reglas que se definan.

La revisión humana de casos dudosos se propuso como respaldo útil; su proceso exacto está por diseñar. **Sentinels no significa necesariamente AI:** usar reglas y fuentes verificables cuando basten; no inventar una dependencia de un LLM.

### Primera versión local implementada

- Lista de misiones disponibles con requisitos, puntos, fechas y estado.
- Flujo de entrega de evidencia.
- Vista de mis puntos e historial de decisiones.
- Vista de recompensas.
- Panel Keepers para crear y editar misiones y revisar entregas. Genesis es una campaña de ejemplo fija.
- Estados claros: pendiente, verificado, rechazado y revisión necesaria.
- Registro de motivo, fuente y momento de cada verificación.

La campaña Genesis, las misiones, los puntos y sus fechas son ejemplos. Las misiones sociales comprueban autoría y criterios configurados con X antes de una revisión de calidad por Keepers. El acceso al panel exige wallet permitida por el servidor y X conectado. Solo una decisión aprobada concede puntos. Falta activar X real; no hay reparto o reclamación de tokens.

### Ideas conversadas que NO quedaron fijadas

- Una bolsa fija de tokens por campaña y reparto proporcional a puntos.
- Límites por participante y por periodo.
- Wallet opcional hasta reclamar: propuesta anterior descartada por el requisito de wallet y X obligatorios del 2026-10-02.
- Tiers como clasificación de calidad o multiplicador.
- Apelaciones y reevaluación.
- Antigüedad de cuenta y controles contra cuentas múltiples.

No tratarlas como decisiones finales. No se ha establecido una equivalencia garantizada entre un punto y una cantidad de tokens o dinero.

## 4. Qué procede de Snowmoon

Usar únicamente la versión final oficial:

- [Índice oficial](https://vitalik.eth.limo/snowmoon/)
- [Chapter 1](https://vitalik.eth.limo/snowmoon/html/chapter-1.html)
- [Chapter 3](https://vitalik.eth.limo/snowmoon/html/chapter-3.html)
- [Chapter 6](https://vitalik.eth.limo/snowmoon/html/chapter-6.html)
- [Chapter 23](https://vitalik.eth.limo/snowmoon/html/chapter-23.html)

Evitar las rutas de borrador `/w/html/chN.html`: contienen diferencias respecto del texto final.

### Institución y roles

La **Order of Steering** es un colectivo descentralizado vinculado al gobierno de Veridia que mantiene sistemas de impuestos y subsidios. Los **Keepers** diseñan y votan **rubrics**; los **Sentinels** auditan negocios y determinan su **Tier** en cada rubric. Los **Acolytes** son miembros en formación. La privacidad de las asignaciones protege frente a presiones y sobornos. [Chapter 1](https://vitalik.eth.limo/snowmoon/html/chapter-1.html)

En el sistema del libro, cada rubric tiene 21 Keepers repartidos en tres grupos de siete; los cambios necesitan 13 votos. Las auditorías Sentinel usan nueve personas, en tres grupos de tres. **Estas cantidades no son requisitos de nuestra app.** El texto no establece claramente una fórmula general de agregación de los nueve votos; no inventar una mediana de medianas. [Chapter 23](https://vitalik.eth.limo/snowmoon/html/chapter-23.html)

Los **Heralds** explican públicamente la labor de la institución después de retirarse de sus cargos. **Courts** es una institución separada de la Order. Ninguno de esos roles es necesario en el MVP actual. [Chapter 6](https://vitalik.eth.limo/snowmoon/html/chapter-6.html)

### Adaptación de nuestro proyecto

Conservamos la separación entre quienes establecen reglas —Keepers— y quienes aplican la verificación —Sentinels—. Las misiones sociales, los puntos, el token y los Sentinels automáticos son **decisiones de nuestro producto**, no mecanismos atribuidos al libro. No presentar el proyecto como una creación o respaldo oficial de Vitalik.

Nicol quiere una narrativa fácil de reconocer, no una reinterpretación rebuscada. La base elegida es la Order; no retomar la búsqueda de otros nombres o protocolos sin motivo.

## 5. Referencias visuales verificadas

### Veridian Privacy Robe

Se describe como una prenda holgada de púrpura oscuro, con capucha y largo hasta los tobillos. Existe una cubierta facial y una correa que separa la zona superior de la inferior a la altura de la nariz. La usan miembros de la Order y otros ciudadanos; **no es un uniforme exclusivo de la institución**. [Chapter 1](https://vitalik.eth.limo/snowmoon/html/chapter-1.html)

La capucha y la cubierta pueden retirarse. El texto consultado no explica con precisión una abertura ocular, el material de la cubierta o cómo se ve a través de ella. No afirmar que una máscara totalmente opaca, una ventana ocular o una tela determinada sean canon. [Chapter 3](https://vitalik.eth.limo/snowmoon/html/chapter-3.html)

### Torre y autenticación

En una visita de Gladias a la Order, el acceso implica una escalera por una montaña. La parte superior de la torre está abierta al cielo, rodeada de muros de piedra y con diez miembros en robes sentados alrededor. Un círculo verde luminoso recibe la autenticación del reloj y activa luces verdes. Es una referencia directa para ambientación. [Chapter 6](https://vitalik.eth.limo/snowmoon/html/chapter-6.html)

Las interfaces descritas incluyen hand devices con tablas de rubrics, Tiers, puntuaciones, mensajes y estados de verificación. Sirven de inspiración para organizar información de la app. [Chapter 1](https://vitalik.eth.limo/snowmoon/html/chapter-1.html)

No se identificó un emblema oficial en los pasajes revisados. No inventar insignias o colores por rango y atribuirlos al libro.

## 6. Dirección visual elegida

### Landing — revisión solicitada el 2026-10-02

Concepto implementado: **Make your mark.** Una invitación a dejar huella, con composición editorial monumental. Púrpura protagonista, sombras ciruela, marfil y piedra cálida; lavanda en acentos y diagramas. Nicol pidió sustituir el predominio verde el 2026-10-02. Hero con titular de dos líneas; manifiesto que revela el texto al hacer scroll; retrato aprobado en un marco de arco; categorías con selección por teclado y escenas propias; registro de contribuciones interactivo; preguntas y cierre con la llegada humana. Parallax al cursor/scroll, polvo, diagramas en rotación y reveals. El control de pausa vive en el encabezado; movimiento reducido y suspensión fuera de vista conservados.

Asset final: cámara circular abierta al cielo, piedra clara y tres figuras adultas pequeñas al fondo; arquitectura a la derecha, izquierda oscura libre para el titular. 16:9, recorte móvil del centro/derecha. Interpretación original coherente con las referencias de Snowmoon ya documentadas; sin imagen de referencia. Higgsfield GPT Image 2.5 Sunburst, High 2K, una imagen; job `de5f6941-72f4-49e2-ac2e-3d046204977c`. Estimación exacta verificada antes de enviar: 2,75 créditos; cargo final desconocido. Fuente 2688 × 1520 en `assets-src/order-assembly-high-v01.png`. Finales: `public/assets/environments/order-assembly-desktop-v01.webp` (2400 × 1357; 436.904 bytes) y `order-assembly-mobile-v01.webp` (900 × 1600; 231.552 bytes). Prompt y parámetros en `assets-src/WEBSITE-GENERATIONS.json`. PFP y otras escenas aprobadas conservadas; sin video.

Código de esta revisión: `src/pages/Landing.tsx`, `src/components/AtlasVisuals.tsx` y `src/atlas.css`. Se corrigió la observación de títulos en `EditorialMotion.tsx`: observar el encabezado sin transformar impide que su máscara bloquee la aparición del texto. Capturas y resultados en `.local/captures/atlas-*`, `.local/atlas-review.json` y `.local/atlas-motion-review.json`. Build/TypeScript correctos; recorridos públicos de teclado, móvil, pausa, preguntas, categorías y enlaces comprobados. Esta revisión no cambia reglas de perfiles, misiones o tokens.

La corrección de paleta actualiza superficies, botones, estados, tinta, foco de teclado, SVG del registro y color del navegador. Las escenas y la PFP se reutilizan; graduación ambiental mediante CSS, sin generaciones nuevas. Evidencia del cambio en `.local/captures/purple-*`, `.local/purple-review.json` y `.local/purple-contrast-review.json`. Revisados 1440, 768, 390 y 360 px; sin overflow, imágenes rotas, errores JS ni respuestas HTTP fallidas. El recorrido público de desktop/móvil/teclado/movimiento reducido pasó. Contraste de los textos muestreados en superficies planas ≥4,58:1; CTA normal 6,63:1, hover 4,64:1 y foco en marfil 6,45:1.

### PFP aprobada — prioridad

Archivo: [assets/branding/pfp-approved-v01.png](assets/branding/pfp-approved-v01.png)

![PFP aprobada](assets/branding/pfp-approved-v01.png)

- Retrato realista de una figura ficticia adulta con túnica/capa y capucha moradas.
- Tela morada cubriendo nariz, boca y mentón.
- Ojos visibles, bajo sombra natural.
- **Sin correa ni hebilla ajustable**: Nicol pidió quitarlas.
- Fondo de arquitectura de piedra pálida, desenfocado.
- Sin círculo verde, texto, armas o efectos de ojos brillantes.
- Encuadre cuadrado para PFP.
- **Aprobada tal cual.** La sugerencia del asistente de iluminar más los ojos NO fue aceptada; no aplicarla como corrección pendiente.

La textura, el corte y la abertura ocular son una interpretación artística. Esta imagen no es una ilustración oficial ni una reproducción exacta de una vestimenta definida al detalle en la novela.

### Exploración del logo

Se exploró un pictograma geométrico de túnica morada:

1. Túnica con círculo verde y nombre: Nicol descartó el círculo.
2. Solo túnica sobre negro: se probaron ajustes pequeños.
3. Solo túnica sobre gris piedra claro: el asistente prefirió esa variante.
4. Nicol pidió después la PFP realista y aprobó su última versión.

**No hay un logo vectorial definitivo aprobado.** Los bocetos se conservan en `assets-src/`; no sustituir la PFP aprobada por un boceto anterior.

### Web local — dirección anterior conservada en el historial

Nicol descartó las primeras exploraciones exteriores, eligió un **hero interior con la arquitectura como protagonista** y luego señaló que las tres vistas de piedra eran demasiado parecidas. Se retiraron esos fondos y se releyeron los capítulos 1, 6 y 23 de la versión final de Snowmoon. Sin `design-taste-frontend` ni delegación.

Nicol después autorizó incluir personas y pidió más creatividad, detalles y animaciones. El hero ahora muestra una figura ficticia entrando a la cámara abierta al cielo; el patio incluye una escena de conversación. La PFP aprobada permanece intacta, con un tratamiento editorial y profundidad al cursor. Dos imágenes nuevas High 2K, sin referencias de las anteriores, se planificaron específicamente para esos momentos.

La dirección actual añade una transición clara con texto y trazo ligados al scroll; títulos que se despliegan por líneas; navegación fija por seis capítulos; marcos y anotaciones; capas de profundidad al cursor; fichas de evidencia animadas; y dibujos vectoriales originales para contenido, comunidad y testing. En tablet el recorrido se apila para evitar recortes; en móvil la ficha complementaria queda separada del registro. Pausa y movimiento reducido detienen el movimiento ambiental; las animaciones continuas se suspenden fuera de la vista.

Se mantienen materiales distintos: tela púrpura, piedra y cielo, red de evidencia, vegetación, papel y autenticación. El cielo abierto y el gesto del reloj remiten a Chapter 6; piedra y naturaleza a Meldan en Chapter 1. Las personas, gráficos, tejido y composiciones son interpretaciones originales, no ilustraciones oficiales ni emblemas del libro. No repetir una fotografía detrás de todas las secciones. La app mantiene modos claro y oscuro.

## 7. Assets y procedencia

- `assets/branding/`: material seleccionado para uso.
- `assets-src/`: bocetos, variantes y referencias; no servirlos como assets finales.
- [assets-src/GENERATIONS.md](assets-src/GENERATIONS.md): inventario, referencias y prompt de la PFP final.
- Proveedor utilizado: herramienta incorporada **image_gen**.
- El modelo exacto y el coste no fueron reportados por la herramienta. No inventarlos ni registrar un coste cero como verificado.
- No se realizaron generaciones nuevas al preparar este traspaso.

Cuando exista stack, mover o copiar los seleccionados a su directorio servido real: `assets/` en HTML estático o `public/assets/` en un stack que sirva `public/`. Actualizar las rutas; preservar originales.

## 8. Decisiones técnicas pendientes

| Tema | Qué falta definir |
| --- | --- |
| Stack | React + TypeScript + Vite, implementado localmente. |
| Primera entrega | Web pública + app local interactiva, elegida por Nicol. |
| Autenticación | Firma SIWE EVM, sesiones y OAuth de X implementados. Faltan WalletConnect y wallets de contrato; se admiten wallets EOA del navegador. |
| X | Crear app OAuth 2.0, configurar credenciales locales, comprobar permisos/API y cuenta real. Posts y respuestas preparados; otras acciones pendientes. |
| Misiones | Tipos, requisitos, evidencia, frecuencia y caducidad. |
| Sentinels | Reglas por misión, fuentes, reintentos, fallos y revisión de casos dudosos. |
| Puntos | Tabla, límites, duplicados y ajustes. |
| Recompensas | Fórmula, calendario, disponibilidad y proceso de reclamar. |
| Token | Nombre/ticker, cadena EVM concreta, contrato, suministro y distribución. Nada está desplegado. |
| Administración | Allowlist Keepers y auditoría implementadas; configurar wallets del equipo. Apelaciones/corrección de decisiones pendientes. |
| Contenido | Copy de la página y explicación breve del vínculo con Snowmoon. |

No usar credenciales reales en documentación. No solicitar semillas o claves privadas para diseñar o prototipar. Para integraciones reales, usar el mecanismo seguro apropiado del proyecto.

## 9. Continuación sugerida

En el nuevo chat:

> Lee `PROJECT.md` y `AGENTS.md` en la carpeta de The Order of Steering. Revisa la estructura real y la nota correspondiente de Obsidian. Usa la PFP aprobada sin modificarla. Ayúdame a concretar la primera versión de la página y app de misiones antes de implementar las partes que aún no están definidas.

La preparación de este documento no inicia otro chat. Nicol autorizó el repositorio **https://github.com/SolClaude33/the-order-of-steering.git** el 2026-10-02; mantener el código en el Git propio del proyecto. Nicol gestiona el despliegue en Vercel.

## 10. Comprobaciones de esta entrega

Las comprobaciones de la preparación original y de la app se registran en la nota de Obsidian. Los comandos y límites actuales se encuentran en `AGENTS.md` y `README.md`.

## 11. Primera versión local — 2026-10-01

Registro histórico de la prueba inicial con almacenamiento en el navegador; las secciones 12 y 13 describen la evolución posterior.

- Web pública con navegación, explicación de la Order, categorías de contribución y preguntas frecuentes.
- Fondo High 2K generado desde cero en Higgsfield; parallax al cursor, partículas, capas de niebla, pausa y movimiento reducido.
- Dirección visual revisada tras la crítica de Nicol: tres nuevas imágenes independientes High 2K, con estimación exacta verificada de 2,75 créditos cada una: cámara abierta, patio verde y tela púrpura. Las vistas anteriores de piedra/arcos están retiradas fuera de producción.
- Recorrido de misiones con tres pasos seleccionables y red de evidencia animada; preguntas sobre papel claro; invitación con reloj y círculo de autenticación. Cada sección tiene su propio tratamiento visual. La ilustración del recorrido está identificada como ejemplo y no modifica el estado de la app.
- Web y app completamente en inglés. Los ejemplos persistidos en español migran sin borrar evidencias ni modificar contenido personalizado.
- App con misiones, búsqueda, filtros, requisitos y entrega de enlaces con descripción.
- Historial de decisiones y puntos derivados exclusivamente de contribuciones verificadas.
- Keepers: creación, edición, archivo y reapertura de misiones; revisión manual con motivo obligatorio.
- Perfil local, temas claro/oscuro, exportación JSON y reinicio con confirmación.
- Recompensas como sección informativa: token, fórmula y calendario pendientes.
- Almacenamiento versionado en `localStorage`. Un cambio de puntos no altera entregas previas; la misma evidencia no puede acreditarse dos veces.
- Fuentes, prompts, referencias, IDs y costes estimados reales en `assets-src/WEBSITE-GENERATIONS.json`. Los fondos exteriores descartados están fuera de producción.

Para probar: `npm run dev`, web en `http://127.0.0.1:5173/` y app en `http://127.0.0.1:5173/#/app`. No hay despliegue.

## 12. Perfil EVM + X y revisión profesional — 2026-10-02

- Jerarquía, tipografía, espaciado y superficies de la app refinados. Perfil con dos conexiones, estado de membresía, wallet de destino y edición de nombre. Landing ajustada sin sustituir sus escenas aprobadas ni generar assets nuevos.
- API Fastify local en 5174; frontend en 5173. `npm run dev` inicia ambos. SQLite persiste perfiles, misiones, entregas y auditoría en `.local/`.
- Firma SIWE con dominio, origen, cadena, nonce y caducidad; sesión HttpOnly, rotación, protección de origen y CSRF. Firma de acceso, sin transacción.
- OAuth 2.0 de X con PKCE S256, estado ligado a sesión y wallet, cuenta por ID inmutable, exclusividad entre wallets, tokens cifrados y refresh en servidor. Configuración en `.env.example`; guía en README. No se crearon credenciales ni se probó X real.
- Misiones configurables: revisión manual, post de X o respuesta a un post objetivo, con texto opcional. Autoría/criterios primero; calidad y puntos por Keepers. Dos ejemplos sociales ya usan comprobación de X. Enlaces de X normalizados para impedir reutilización mediante alias Twitter/X.
- Keepers requiere wallet incluida en `KEEPER_WALLETS` y X conectado; decisiones finales no se repiten. Registro exportable de destinatarios y puntos aprobados. Token y pagos pendientes.
- Los datos de la prueba anterior del navegador se conservan y pueden exportarse; no se importan como puntos aprobados. No hay reinicio global desde la interfaz.
- Comprobaciones: 20/20 pruebas de dominio/API; TypeScript y build correctos. Persistencia comprobada cerrando y reabriendo SQLite. Capturas de landing, misiones y perfil a 1440, 768, 390 y 360 px sin overflow, errores JavaScript ni peticiones fallidas. Los recorridos de navegador y sus resultados finales constan en la nota del proyecto.
- Estado de esa revisión: backend local, sin publicación. La sección 13 añade la preparación de Vercel.

Próximo paso: crear la app de X, configurar Client ID/Secret y wallets Keepers en el archivo local, y probar vínculo/verificación con una cuenta real. Después concretar la cadena y reglas del token.

## 13. GitHub y preparación de Vercel — 2026-10-02

- Destino autorizado: **SolClaude33/the-order-of-steering**. Publicación de código y assets; sin datos locales ni credenciales. Nicol realizará el despliegue.
- Frontend Vite y API Node en el mismo origen; `api/index.ts`, `server/vercel.ts` y `vercel.json` incluyen el enrutamiento, región y cabeceras. Node 22.x.
- Almacenamiento asíncrono con SQLite local y Turso/libSQL por HTTP en Vercel. Inicialización automática, transacciones y coordinación de refresh de X entre instancias. Conservación de perfiles y puntos; no se importa la base local.
- Variables y pasos completos en `DEPLOYMENT.md` y `.env.example`. `scripts/prepare-vercel-env.mjs` crea un archivo privado ignorado con nombres de variables y clave segura, sin imprimirla. Faltan los valores reales de Turso, X y wallets Keepers.
- Retirados los disclaimers de prototipo, ejemplos, atribución y reparto de la interfaz. Rewards muestra puntos y contribuciones. Los requisitos de conexión, errores y estados operativos siguen siendo reales. Interfaz en inglés.
- Comprobaciones: build y TypeScript correctos; 24/24 pruebas de dominio/API, 11/11 con libSQL y 6/6 recorridos Playwright. Incluyen HTTP del adaptador, rewrites, firma wallet, cookies/CSRF, persistencia y dos instancias concurrentes. X simulado y libSQL local; comprobar los servicios reales tras configurar Vercel.
- Pendiente de Nicol: crear/configurar Turso y X, introducir variables, desplegar y verificar el recorrido real. Token y distribución requieren un alcance posterior.

## 14. Corrección de imágenes en Vercel — 2026-10-02

Las 13 imágenes de producción estaban en GitHub, pero `.vercelignore` usaba `assets/` sin ancla y también excluía `public/assets/`. El sitio publicado servía la página con HTTP 200 y devolvía 404 para cada imagen.

Corregidas las exclusiones de fuentes para usar `/assets/` y `/assets-src/`, limitadas a la raíz. El build ahora verifica que la PFP y ambos fondos del hero estén presentes y que los 13 archivos servidos coincidan por SHA-256 con sus copias en `dist/assets/`. La prueba de exclusiones reproduce el fallo anterior y pasa con la corrección; `npm test` pasa 25/25. Fuentes originales y datos privados siguen fuera del despliegue. No se generaron ni modificaron imágenes.

## 15. Dominio principal y configuración de X — 2026-10-02

Nicol eligió **theorderofsteering.com** como dominio principal. El canonical, la guía de Vercel, la configuración de X y el generador privado de variables usan `https://theorderofsteering.com`. El callback de X es `https://theorderofsteering.com/api/auth/x/callback`. Conectar el dominio y sus DNS en Vercel, actualizar `APP_ORIGIN` en Production y configurar OAuth 2.0 Web App con Client ID/Secret antes de comprobar acceso real. Conservar Turso y la clave de cifrado existentes. La wallet de Keeper queda para después por indicación de Nicol.

Corregidos cuatro estados vacíos de la app: las acciones usan la propiedad `action` de `EmptyState`, fuera del párrafo. El historial conserva una frase breve en inglés. No cambia la autenticación, los permisos, las misiones ni los puntos. La validación y las capturas de escritorio/móvil quedan registradas en la nota del proyecto.

## 16. Identidad de X en la app — 2026-10-02

Nicol confirmó que el acceso real con wallet y el vínculo de X funcionan. El perfil, la identidad del menú lateral y el avatar de la cabecera ahora usan el nombre, @usuario y foto obtenidos de X durante OAuth. Los datos se conservan en SQLite/Turso; refrescar la sesión o navegar no vuelve a consultar X. Reconnect X actualiza esos datos y permite importar la foto de cuentas vinculadas antes de esta mejora. El nombre personalizado del perfil se conserva como dato independiente y alternativa cuando X no está conectado.

La migración añade la columna de imagen sin borrar cuentas, tokens cifrados ni contribuciones. Fotos ausentes o inaccesibles usan la PFP aprobada como alternativa; el branding de la web mantiene esa PFP. Keeper y distribución de tokens siguen pendientes. La verificación real de una misión permanece por comprobar.

## 17. Tablero vacío y acceso Keeper — 2026-10-02

Nicol pidió retirar las seis misiones iniciales para publicar las suyas. El arranque ya no genera misiones de ejemplo. Una migración única retira los seis IDs/títulos originales, conserva misiones personalizadas y deja intactos perfiles, evidencias y puntos históricos. El marcador de migración impide borrar futuras misiones o repoblar un tablero vacío al reiniciar. Cada retirada queda auditada.

Los estados vacíos distinguen un tablero sin publicar de filtros sin resultados; Keepers puede crear su primera misión desde el panel. Se mantienen las reglas de autorización: wallet EVM firmada, X conectado y dirección pública incluida en KEEPER_WALLETS del servidor. Nicol configura esa variable en Production y hace Redeploy. Para probar el recorrido inicial, usar Keepers review; luego activar comprobación de autoría de posts/respuestas de X en las misiones correspondientes. La distribución de tokens sigue fuera de alcance.

## 18. Simplificación del perfil y filtros — 2026-10-02

Nicol pidió retirar Profile details y su editor de nombre: la identidad visible usa el nombre, @usuario y foto de X. Se eliminan el formulario y sus estilos; los datos históricos del perfil se conservan. El tablero ofrece All, Content y Community, sin pestaña Testing. Los enlaces antiguos a ese filtro abren All; la contribución Make it better de la landing enlaza al tablero general. No cambian los permisos Keeper, la verificación de misiones ni los puntos.

Al crear una misión de follow, Nicol seleccionó X reply to target y pegó la URL de la cuenta como ID de post. Ese método requiere un ID numérico de publicación. El formulario ahora comprueba los campos antes de enviar, explica la diferencia entre los métodos y elimina los criterios de X que no aplican al cambiar a Keepers review. Los follows se revisan manualmente; no se ha implementado comprobación automática ni nuevos permisos de X.

Nicol eligió premiar la **visita automática de tres segundos, sin verificar follow**. Mission link admite un destino HTTPS visible en la misión; verification=visit abre el enlace y crea un intento ligado a wallet/misión en el servidor. Inicio y finalización quedan en Turso/SQLite y en auditoría; el servidor controla el tiempo, versión de la misión y puntos. Caduca a los diez minutos; reintentos concurrentes no duplican recompensas, y cambios/cierre de la misión invalidan intentos pendientes. Wallet y X siguen obligatorios. No hay consultas adicionales a X ni nuevas variables de entorno. Keepers review y comprobación de posts/respuestas conservan su recorrido.

## 19. Borrado de misiones — 2026-10-02

Nicol pidió poder eliminar una misión, además de archivarla. Keeper → Manage missions añade Delete y una confirmación con el título. La eliminación la retira de todos los tableros y del panel Keeper, preservando entregas, decisiones y puntos. Las entregas anteriores pendientes siguen disponibles para revisión. API protegida por wallet Keeper + X, sesión/origen/CSRF y transacción; un marcador en deleted_missions impide restauraciones por un editor antiguo o reutilización del mismo ID. Se cancelan los intentos de visita sin completar; recompensas ya registradas se conservan. La nueva tabla se crea automáticamente en SQLite/Turso, sin SQL manual ni variables adicionales.
