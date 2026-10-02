# Generaciones y selección

Fecha de preparación: 2026-10-01.

Todas las imágenes fueron generadas con la herramienta incorporada `image_gen`. No se utilizó Higgsfield. El nombre exacto del modelo y el coste no aparecen en el resultado, por lo que se registran como **no reportados**. Las referencias a archivos `exec-...` son identificadores del archivo devuelto, no un job ID adicional inventado.

| Archivo conservado | Archivo original devuelto | Referencia | Estado |
| --- | --- | --- | --- |
| 01-logo-circle-wordmark.png | exec-d6e2b793-03ce-4f40-a6cb-55daacb6241b.png | Generación nueva | Círculo descartado por Nicol |
| 02-logo-purple-black.png | exec-8c5eab54-0721-4e10-8172-6796bedc600a.png | 01 | Exploración |
| 03-logo-black-refined.png | exec-06115eed-e121-424a-8fe2-555230c090ca.png | 02 | Exploración |
| 04-logo-stone-background.png | exec-59fc581b-a267-46db-b800-efe6b0f0e097.png | 03 | Referencia conceptual; no logo final aprobado |
| 05-pfp-fully-covered.png | exec-52225e99-1c1b-45bb-9bba-92992791a282.png | 04, como concepto y color | Variante anterior |
| 06-pfp-adjustable-cover.png | exec-2cd57d10-1616-4ff9-a052-d761f034cf86.png | 05 | Correa/cubierta ajustable descartadas |
| 07-pfp-face-visible.png | exec-dc26906e-2f4e-4d37-8fab-d6f61e237bf3.png | 06 | Variante anterior; faltaba cubrir hasta nariz |
| 08-pfp-approved.png | exec-c2fe523c-d2b5-4d77-944e-930e21c1417e.png | 07 | **Aprobada tal cual** |

La seleccionada también se copia, sin edición ni compresión, a `../assets/branding/pfp-approved-v01.png`.

## Prompt final exacto

La última edición usó `07-pfp-face-visible.png` como imagen de referencia, sin fondo transparente.

```text
Use case: precise-object-edit.
Make one precise correction to the supplied realistic purple hooded portrait.
Pull a simple section of matching dark-purple cloth up from the existing neck wrap to cover the entire lower face: chin, mouth and nose, with its top edge resting at the bridge of the nose just below the eyes. The nose must be covered, not exposed. Leave the eyes, eyebrows and upper face visible beneath the hood's natural shadow. This should look like a practical continuous cloth face covering integrated with the robe, with believable soft folds.
No adjustable strap, belt, buckle, fastener, ear loops or decorative hardware. No cloth covering the eyes.
Preserve the same person's upper-face identity, gaze, hood, purple robe, textile, lighting, softly blurred pale stone background, centered square profile-picture framing and all other details. No redesign.
No text, logo, circle, symbols, weapons, glowing eyes or watermark. Only add the lower-face cloth coverage and blend it naturally into the existing neck fabric.
```

## Selección

Después de generar la última variante, el asistente propuso iluminar ligeramente los ojos. Nicol respondió que la imagen estaba bien así y pidió crear la carpeta y el traspaso. **No aplicar esa propuesta adicional.**

Los bocetos permanecen aquí para contexto. La elección de esta PFP no aprueba automáticamente un logo vectorial, un hero o la interfaz completa de la futura app.

## Fondos de la web — 2026-10-01

Nicol descartó las dos generaciones del paisaje exterior y pidió comenzar desde cero sin `design-taste-frontend`. Eligió un espacio interior sin personas, con la arquitectura como protagonista. El final es `order-chamber-high-v01.png`; se sirve en dos WebP optimizados bajo `public/assets/environments/`.

Los prompts exactos, parámetros, referencias, IDs, estados y costes estimados previos al envío están en `WEBSITE-GENERATIONS.json`. El modelo fue GPT Image 2.5 Sunburst en Higgsfield. La configuración final High 2K tuvo un coste estimado exacto de 2,75 créditos; el cargo final no se conoce. Las generaciones exteriores no se usan en producción ni como referencia del interior.

Para dar continuidad y profundidad a las secciones inferiores se generaron dos vistas independientes del interior seleccionado, ambas High 2K, 16:9 y con coste exacto estimado de 2,75 créditos por imagen antes del envío:

- `order-stone-high-v01.png`, job `41a7c1ad-9108-4f66-9a78-529ad71d9dc4`: detalle arquitectónico para presentación y showcase.
- `order-gallery-high-v01.png`, job `1a23436a-68e6-4729-819e-a71f22eadd52`: galería de arcos para recorrido, preguntas y bloque de contenido.

Referencia de ambas: job `be71cf08-d028-43bd-95b4-f818c0c94c05`. Cada fuente es de 2688 × 1520; los finales son WebP desktop de 2000 × 1131 y móvil de 800 × 1280, en `public/assets/environments/`. Los prompts completos y parámetros quedan en el mismo registro JSON. No se generó vídeo.
