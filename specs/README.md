# Specs — proceso de trabajo

Aquí vive la única fuente de verdad sobre *qué* se construye y *por qué*.
El código es la consecuencia, no el origen.

## Cómo funciona

```
   Director                          Programador
      │                                    │
      ├─ escribe/aprueba spec ────────────▶│
      │                                    ├─ implementa SÓLO la spec
      │                                    ├─ verifica (build + lint + prueba manual)
      │◀───────────── entrega + reporte ───┤
      ├─ revisa y decide                   │
      │  (mergear / iterar / descartar)    │
```

**Regla dura:** sin spec aprobada no hay código. Única excepción: una falla de
producción activa (build roto, brecha de seguridad, caída del sitio), que se
reporta de inmediato y se arregla con el diff mínimo posible.

## Ciclo de vida de una spec

| Estado | Significado |
|---|---|
| `borrador` | propuesta por el programador; el director aún no la aprueba |
| `aprobada` | lista para implementarse |
| `en curso` | se está implementando |
| `entregada` | implementada y verificada; pendiente de revisión |
| `cerrada` | revisada y aceptada |
| `descartada` | el director decidió no hacerla (se conserva el archivo con el motivo) |

## Convenciones

- Un archivo por spec: `NNNN-slug-en-kebab-case.md`, numeración consecutiva.
- Se copia `TEMPLATE.md` y se rellena. Ninguna sección se borra: si no aplica,
  se escribe "no aplica".
- Un commit por spec cuando sea posible:
  `feat(0001): proteger edge functions con jwt`
- Las specs no se reescriben en silencio. Si cambia el alcance, se anota en
  "Historial" al final del archivo.
- **"Fuera de alcance" es vinculante.** Si el programador encuentra algo que
  arreglar que no está en la spec, lo anota ahí y lo propone como spec nueva.
  No lo arregla sobre la marcha.

## Cómo escribir una buena spec (para el director)

Una spec debe responder tres cosas y ser tacaña con el resto:

1. **Qué problema resuelve**, en lenguaje de usuario o de negocio.
2. **Cómo sabemos que quedó bien** — criterios de aceptación verificables.
   "Funciona bien" no es un criterio; "recargar `/dashboard` devuelve 200" sí.
3. **Qué NO se toca.**

No hace falta que digas *cómo* implementarlo. Si tienes una preferencia técnica,
ponla en "Restricciones"; si no, el programador propone y tú apruebas.

---

## Registro de avance en Notion

El seguimiento de alto nivel vive en el tablero **🧮 Incubadora de proyectos**:
https://inscreup.notion.site/38ce78250e0880d39c33ec11ac0277c9

Es un board agrupado por `Priority`, con estados `Not started` / `In progress` /
`Done` y un campo `Assign`. Sus categorías de prioridad son **Bussiness**, **AI**,
**Tech** y **Producto**; cada spec declara la suya en su cabecera para que ambos
sistemas se lean juntos.

División de responsabilidades:

- **Notion** = el *qué* y el *cuándo*, a nivel de proyecto. Lo lleva el director.
- **`specs/`** = el *qué exactamente* y el *cómo se verifica*, a nivel de cambio.
  Vive junto al código y se revisa con él.

> Nota: el tablero está en el workspace `inscreup`, distinto del que tiene
> autorizado el conector de esta sesión, así que el programador puede leer su
> estructura pero **no sus filas ni escribir en él**. Mover tarjetas es trabajo
> del director. Si se quiere que el programador actualice el tablero, hay que
> autorizar ese workspace en el conector de Notion.

---

## Backlog

Derivado de `docs/auditoria-2026-09-17.md`. El orden es una **propuesta**;
el director decide.

| # | Spec | Hallazgo | Severidad | Estado |
|---|---|---|---|---|
| 0001 | Proteger las Edge Functions | H-01 | 🔴 crítico | borrador |
| 0002 | Reparar el build de `main` | H-03 | 🔴 crítico | pendiente de redactar |
| 0003 | Fallback SPA en Netlify (404 al recargar) | H-04 | 🟠 alto | pendiente de redactar |
| 0004 | Versionar el esquema de la BD | H-02 | 🔴 crítico | pendiente de redactar |
| 0005 | CI en GitHub Actions | H-05 | 🟠 alto | pendiente de redactar |
| 0006 | Evaluación real de la entrevista | H-06 | 🟠 alto | pendiente de redactar |
| 0007 | Generación de preguntas con IA | H-06 | 🟠 alto | pendiente de redactar |
| 0008 | Limpiar código muerto y lint | H-07, H-08 | 🟡 medio | pendiente de redactar |
| 0009 | README y onboarding de colaboradores | H-11 | 🟡 medio | pendiente de redactar |

---

## Decisiones pendientes del director

Bloquean o condicionan specs futuras. No las resuelve el programador.

### D-1 — Formato vertical del código
El repo usa un formato de casi un token por línea. Es la causa de que haya
~38k líneas donde cabrían ~12-15k. Es consistente, así que **es una convención,
no un accidente**.

- **(a)** Se mantiene. Se documenta y se respeta en todo código nuevo.
- **(b)** Se adopta Prettier con configuración estándar y se reformatea todo en
  un único commit aislado, marcado en `.git-blame-ignore-revs`.

*Recomendación del programador: (b).* El costo es un commit ruidoso de una vez;
el beneficio es que cada diff posterior se revisa en una pantalla en vez de
cinco. Dado que la regla 1.1 (correa corta) dice que el cuello de botella es la
verificación, el formato actual trabaja directamente en contra del proceso que
estamos montando.

### D-2 — Futuro del motor PDF (`src/lib/pdf-engine/`)
20 000 líneas propias, sin pruebas, para obtener texto plano de un CV.

- **(a)** Se queda como está. Requiere spec de pruebas urgente.
- **(b)** Se sustituye por `pdf.js` y se conserva sólo la capa de limpieza y
  detección de secciones de CV, que sí es específica del dominio.
- **(c)** Se queda, pero congelado: no se le añaden funcionalidades y se le
  pone una red de pruebas antes de tocarlo.

*Recomendación del programador: (c) ahora, evaluar (b) después.* Funciona y
está desplegado; cambiarlo hoy es riesgo sin beneficio para el usuario. Pero
sin pruebas es una bomba de relojería, y es la única pieza del repo donde una
regresión es difícil de detectar a simple vista.

### D-3 — Alcance del MVP honesto
Hoy la app promete una evaluación con IA que no existe (H-06).

- **(a)** Implementar la evaluación real ya (spec 0006), es la prioridad de
  producto.
- **(b)** Mientras tanto, dejar de prometerla: quitar los pasos falsos de
  `ProcessingPage` y marcar los resultados como demostración.

*Recomendación del programador: (b) esta semana y (a) como siguiente hito.*
Ninguna de las dos es gratis, pero mostrar "Evaluando tus fortalezas" mientras
no se evalúa nada es el tipo de cosa que cuesta la confianza del usuario una
sola vez.

### D-4 — Dónde vive este trabajo
Esta sesión sólo tiene acceso de **lectura** a `TheIns07/entrevist-ia`, así que
`CLAUDE.md`, `docs/` y `specs/` están en `edreirbs/entrevista`.

- **(a)** Se abre un PR a `TheIns07/entrevist-ia` para llevarlos al repo real
  (es donde deberían vivir para que sirvan a todo el equipo).
- **(b)** Se quedan aquí como espacio de trabajo personal del director.

*Recomendación del programador: (a).* Un `CLAUDE.md` fuera del repo que
describe no gobierna a nadie más.
