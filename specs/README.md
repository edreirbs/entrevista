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
| 0002 | Reparar el build de `main` | H-03 | — | **resuelta por el equipo** (`cbddb45`) |
| 0003 | Fallback SPA en Netlify (404 al recargar) | H-04 | 🟠 alto | pendiente de redactar |
| 0004 | Versionar el esquema de la BD | H-02 | 🔴 crítico | pendiente de redactar |
| 0005 | CI en GitHub Actions | H-05 | 🟠 alto | pendiente de redactar |
| 0006 | Prompt de evaluación de la entrevista | H-06 | 🟠 alto | **borrador** — [`0006-prompt-de-evaluacion.md`](0006-prompt-de-evaluacion.md) |
| 0007 | Generación de preguntas con IA | H-06 | 🟠 alto | pendiente de redactar |
| 0008 | Limpiar código muerto y lint | H-07, H-08 | 🟡 medio | pendiente de redactar |
| 0009 | README y onboarding de colaboradores | H-11 | 🟡 medio | pendiente de redactar |

---

## Decisiones pendientes del director

Lista única y vigente. Sustituye a cualquier numeración anterior (D-1…D-4 y
las numeradas en conversación). Se mantiene aquí hasta que cada una se
conteste; al contestarse se anota la respuesta y la fecha.

### A. Seguridad y riesgo

**1 — Revisión de las reglas de acceso a los datos**
Las políticas que impiden que un usuario lea las entrevistas de otro viven
sólo en el panel de Supabase. No están en el repo y no he podido revisarlas.
- **(a)** Acceso al panel; reviso esas reglas. ~medio día.
- **(b)** Además, ataque deliberado a la aplicación buscando fallos reales.
  ~2 días.

*Recomendación: (a) ahora, (b) cuando las claves estén rotadas y las funciones
cerradas.* Buscar fallos sofisticados mientras las credenciales están
publicadas es perder el tiempo.

**2 — Grabación de sesiones de usuario (Clarity)**
El equipo va a instalar Clarity. En esta aplicación puede capturar contenido
de CV y respuestas de entrevista: datos personales reales.
- **(a)** Con las zonas sensibles enmascaradas. ~medio día extra.
- **(b)** Instalación directa, sin enmascarar.

*Recomendación: (a).* `PrivacyPage` ya promete informar al usuario de todo
seguimiento; (b) incumpliría esa promesa por escrito.

### B. Qué construimos

**3 — Orden de trabajo inmediato**
- **(a)** Arreglar lo roto: build de `main`, fallback SPA y cierre de las Edge
  Functions. ~1 día y medio. Visible para el usuario.
- **(b)** Sincronizar el tablero de Notion con la realidad. ~medio día. No
  avanza el producto.
- **(c)** (a) y luego (b).

*Recomendación: (c).*

**4 — La aplicación promete una evaluación que no existe** (H-06)
- **(a)** Implementar la evaluación real. ~1 semana.
- **(b)** Retirar la promesa: quitar los pasos falsos de `ProcessingPage` y
  marcar los resultados como demostración. ~2 horas.
- **(c)** (b) esta semana, (a) la siguiente.

*Recomendación: (c).*

**5 — Futuro del motor PDF** (H-10)
- **(a)** Se queda como está.
- **(b)** Se sustituye por `pdf.js`, conservando sólo la capa de limpieza y
  detección de secciones de CV. ~4 días.
- **(c)** Se congela y se le añaden pruebas antes de tocarlo. ~2 días.

*Recomendación: (c) ahora, evaluar (b) después.*

### C. Cómo trabajamos

**6 — Acceso de escritura a `TheIns07/entrevist-ia`**
`CLAUDE.md`, `docs/` y `specs/` viven en `edreirbs/entrevista` porque esta
sesión sólo tiene lectura sobre el repo real.
- **(a)** Se concede acceso y se abre un PR para llevarlos allí.
- **(b)** Se quedan como espacio de trabajo personal del director.

*Recomendación: (a).* Un `CLAUDE.md` fuera del repo no gobierna a nadie.

**7 — Cuenta de prueba para verificar el fallo en móvil**
Las pantallas públicas están verificadas y correctas. El resto exige sesión.
- **(a)** Cuenta de prueba con acceso completo al flujo.
- **(b)** Grabación de pantalla del fallo hecha por el equipo.

*Recomendación: (a).*

---

## Preguntas de hecho (no son decisiones)

**P1 — ¿Existe el buscador de empleos?** ✅ **Resuelta (2026-09-25).**
Llegó al repo en `9db97cd` ("interview jobs scrapper in dashboard"): función
`recommend-jobs`, proveedor Adzuna y puntuación en `_shared/jobs/`. Usa Groq y
las llaves de Adzuna, y también acepta llamadas sin sesión (`config.toml:441`).
Amplía la superficie de H-00 y H-01.

---

## Decisiones que toma el programador

Por §2.6 de `CLAUDE.md`, lo que el director no puede percibir no sube a
decisión suya.

**Formato vertical del código** (antes D-1). El repo escribe casi un token por
línea, lo que infla ~38k líneas a partir de unas ~13k reales. **Decisión
tomada: se mantiene por ahora.** Cambiarlo produce un commit que toca todos los
archivos y destruye el historial de `git blame` justo cuando estamos entrando
al proyecto. Se revisará cuando exista CI (spec 0005) y la propuesta se hará
por escrito, no unilateralmente. El coste —diffs más largos de revisar— se
asume conscientemente.
