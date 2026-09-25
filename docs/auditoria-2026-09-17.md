# Auditoría técnica — Entrevist-IA

- **Fecha:** 2026-09-17
- **Commit auditado:** `e9724fe` ("Protected routes ix"), rama `main`
- **Repo:** https://github.com/TheIns07/entrevist-ia
- **Producción:** https://entrevist-ia.netlify.app/
- **Alcance:** código, configuración, seguridad, build y estado real del producto.

---

## Resumen ejecutivo

El proyecto tiene una base sólida en lo que a disciplina de tipos se refiere
(cero `any`, cero `@ts-ignore`, separación limpia de capas
página → servicio → cliente). Pero **el proyecto no compila en `main`**, tiene
**dos Edge Functions expuestas sin autenticación** que cualquiera puede usar
para gastar la cuota de Groq, **no versiona el esquema de su base de datos**, y
**la evaluación con IA —el núcleo del producto— todavía no existe**: es un mock.

Además, el 52% del código (≈20k de 38k líneas) es un parser de PDF escrito a
mano donde existían librerías maduras.

**Prioridad recomendada:** **H-00 (claves filtradas — hoy)** → H-01
(seguridad/costo) → H-03 (build) → H-04 (404 en producción) → H-02
(migraciones) → H-06 (evaluación real).

---

## Inventario

| Métrica | Valor |
|---|---|
| Líneas en `src/` + `supabase/` | 38 413 |
| De ellas, `src/lib/pdf-engine/` | ≈20 000 (52%) |
| Archivo más grande | `src/pages/OnboardingPage.tsx` (2 022 líneas, 17 `useState`) |
| Tests | 0 |
| Pipeline de CI | ninguno (no existe `.github/`) |
| Migraciones de BD | ninguna |
| Dependencias de producción | 9 |
| Bundle JS | 274 kB (88 kB gzip) + worker PDF de 78 kB |
| `any` / `@ts-ignore` | 0 ✅ |
| Secretos commiteados | 0 ✅ |

---

## Hallazgos

### 🚨 H-00 — Tres claves de API publicadas en internet (urgente)

**Descubierto el 2026-09-18 al revisar el tablero de seguimiento.**

La tarjeta **"API Keys"** del tablero público
[🧮 Incubadora de proyectos](https://inscreup.notion.site/38ce78250e0880d39c33ec11ac0277c9)
contiene, en texto plano, las credenciales de producción de tres servicios:

| Servicio | Cuenta | Qué expone |
|---|---|---|
| Groq | arturoinscreup@gmail.com | clave de API (prefijo `gsk_S0Oro…`) |
| Adzuna | inscreup@gmail.com | app id + app key |
| Jooble | — | clave de API |

*Los valores completos no se reproducen aquí a propósito: están en esa tarjeta.*

El tablero es un **Notion Site público**: se lee sin iniciar sesión, sin
invitación y sin permisos. Lo confirmé recuperando su contenido con una
petición anónima al endpoint público `api/v3/loadPageChunk` de Notion. Los
sitios públicos de Notion son indexables por buscadores.

**Impacto:** esto deja sin efecto la mitigación propuesta en H-01. Cerrar las
Edge Functions impide que alguien use *tu* backend, pero la clave de Groq
publicada permite llamar a Groq **directamente**, saltándose por completo tu
aplicación. El gasto se factura igual. Adzuna y Jooble quedan expuestas del
mismo modo.

**Corrección, en este orden:**
1. **Revocar y regenerar las tres claves** en sus paneles respectivos. Esto
   invalida cualquier copia que ya circule.
2. Borrar la tarjeta, o dejar de publicar el tablero.
3. Guardar las claves nuevas como secretos de Supabase y en un gestor de
   contraseñas. Nunca en Notion, Slack, correo ni en el repositorio.
4. Revisar el consumo histórico de las tres cuentas en busca de uso no
   reconocido.

Prioridad: **por encima de todo lo demás de este documento.**

---

### 🔴 H-01 — Edge Functions públicas sin autenticación (crítico)

> **Actualización 2026-09-25:** ahora son **tres**. `recommend-jobs` (commit
> `9db97cd`) también tiene `verify_jwt = false` (`config.toml:441`) y usa Groq
> y las llaves de Adzuna.

`supabase/config.toml` declara `verify_jwt = false` para **ambas** funciones, y
cada una responde con `Access-Control-Allow-Origin: *`.

**Verificado en producción.** Petición sin ninguna credencial:

```
POST https://<proyecto>.supabase.co/functions/v1/analyze-resume
  → 400 {"error":"AI_TEXT_REQUIRED"}

POST https://<proyecto>.supabase.co/functions/v1/transcribe-audio
  → 400 {"error":"AUDIO_FILE_REQUIRED"}
```

Un 400 de validación —y no un 401— prueba que la petición **llegó al handler**
sin autenticarse. Cualquiera en internet puede invocar ambas funciones.

**Impacto:** facturación directa contra `GROQ_API_KEY`. Los límites por
petición (50 000 caracteres al LLM, 20 MB de audio a Whisper) sólo acotan el
costo *unitario*; no hay límite de peticiones, ni por IP ni por usuario. Una
sola tarde de abuso automatizado agota la cuota y tira el producto para los
usuarios reales.

**Corrección:** poner `verify_jwt = true`, validar el JWT del usuario dentro de
la función, restringir CORS al dominio de Netlify y añadir límite de tasa por
usuario.

---

### 🔴 H-02 — El esquema de la base de datos no está versionado (crítico)

No existe `supabase/migrations/`. No hay un solo `.sql` en el repositorio.

El código depende de cinco tablas (`profiles`, `interview_sessions`,
`interview_questions`, `interview_answers`, `interview_results`), de
restricciones únicas concretas (`session_id,question_order` y
`session_id,question_id`, ambas usadas en `onConflict`) y de políticas RLS que
son **la única autorización real del sistema**. Todo eso vive exclusivamente en
el proyecto remoto de Supabase.

**Impacto:** nadie puede levantar el proyecto desde cero. No hay revisión de
código sobre las políticas de seguridad. Un cambio accidental en el panel de
Supabase no deja rastro y no se puede revertir.

**Corrección:** `supabase db pull` para capturar el estado actual como
migración inicial, y de ahí en adelante todo cambio de esquema pasa por
migración commiteada.

---

### ✅ H-03 — `npm run build` falla en `main` — RESUELTO

> **Actualización 2026-09-25:** el equipo lo resolvió en `cbddb45`; `npm run
> build` termina en exit 0 y la web publicada contiene el código más reciente
> (incluye `recommend-jobs`).
>
> **Corrección de esta auditoría:** la afirmación de abajo de que "producción
> sirve un commit anterior" se apoyaba en comparar el nombre del archivo
> publicado con el de un build local. Esa prueba **no es válida**: el nombre
> cambia con las variables de entorno inyectadas al construir. Lo verificado
> fue solo que `tsc -b` fallaba; que Netlify sirviera una versión vieja no
> quedó demostrado.

```
$ npm run build   # tsc -b && vite build
src/pages/OnboardingPage.tsx(52,1): error TS6133: 'VoiceInputButton' is declared but its value is never read.
src/pages/OnboardingPage.tsx(171,5): error TS6133: 'setIndustry' is declared but its value is never read.
exit 2
```

La rama principal no produce un artefacto desplegable. El bundle servido en
Netlify (`index-c1nB0Jtp.js`) no coincide con el que genera el código actual
(`index-CiPDyIzD.js`): **producción está sirviendo un commit anterior.**

`npm run lint` también falla, con 10 errores (detalle en H-07).

**Corrección:** eliminar el import y el setter muertos. Es un diff de dos
líneas. La causa de fondo es la ausencia de CI (H-05).

---

### 🟠 H-04 — 404 en producción al recargar cualquier ruta (alto)

La app usa `BrowserRouter`, pero no hay `netlify.toml` ni `public/_redirects`.

**Verificado:**
```
GET https://entrevist-ia.netlify.app/          → 200
GET https://entrevist-ia.netlify.app/dashboard → 404
```

**Impacto:** la navegación interna funciona, pero recargar la página, abrir un
enlace compartido o volver con el botón "atrás" del navegador a una ruta
profunda rompe la aplicación. Afecta especialmente al retorno tras el login,
que `ProtectedRoute` guarda en `location.state.from`.

**Corrección:** añadir el fallback SPA a `index.html` (3 líneas de
`netlify.toml`).

---

### 🟠 H-05 — Sin CI y sin tests (alto)

No existe `.github/`. Cero pruebas automatizadas en 38k líneas.

Nada impide que un commit que no compila llegue a `main` — que es exactamente
lo que ocurrió (H-03). El motor PDF, la pieza más delicada y más propensa a
regresiones del repositorio, no tiene una sola prueba.

**Corrección:** workflow de GitHub Actions que corra `npm ci`, `npm run lint` y
`npm run build` en cada push y PR. Después, pruebas unitarias sobre el motor
PDF con un corpus de CVs de ejemplo.

---

### 🟠 H-06 — El núcleo del producto es un mock (alto)

Lo que la aplicación promete y lo que realmente hace difieren:

| Pieza | Estado real |
|---|---|
| Extracción de PDF | ✅ real (motor propio, en web worker) |
| Análisis del CV | ✅ real (Groq `gpt-oss-20b`) |
| Transcripción de voz | ✅ real (Groq Whisper) |
| Auth y persistencia | ✅ real (Supabase) |
| **Generación de preguntas** | ❌ **mock** — lista fija en `mocks/mockInterview.ts` |
| **Evaluación de respuestas** | ❌ **no existe** |
| **Pantalla de resultados** | ❌ **mock** — `mocks/mockResults.ts` |

`ProcessingPage` muestra cinco pasos ("Evaluando claridad y estructura",
"Identificando tus fortalezas"…) con un temporizador, y después marca la sesión
como `completed`. **Nadie escribe jamás en `interview_results`**; `dashboard.ts`
lee esa tabla y por eso las estadísticas del dashboard siempre saldrán vacías.

El usuario ve una barra de progreso que afirma estar analizando sus respuestas
mientras no se analiza nada. Es el incumplimiento más caro del repo: no es
deuda técnica, es una promesa no cumplida al usuario.

**Corrección:** una tercera Edge Function `evaluate-interview` que reciba las
respuestas, llame a Groq con un esquema JSON estricto (el patrón ya está
resuelto en `analyze-resume`), y escriba en `interview_results`.

---

### 🟡 H-07 — 10 errores de lint (medio)

```
useAudioRecorder.ts:598     preserve-caught-error (se pierde la causa del error)
UnicodeNormalizer.ts:31     no-control-regex
TextOperatorInterpreter:869 no-control-regex
LineBuilder.ts:462          no-useless-escape
PdfObjectParser.ts:53       '_options' declarado y sin usar
InterviewPage.tsx:513       react-hooks/set-state-in-effect  ← el único de fondo
OnboardingPage.tsx:53,171   no-unused-vars  (= los errores de build, H-03)
```

Los dos `no-control-regex` son legítimos en un parser de PDF y deben silenciarse
línea por línea con justificación. El de `InterviewPage.tsx` sí es un problema
real: un `setState` síncrono dentro de un efecto provoca renders en cascada.

---

### 🟡 H-08 — Código muerto (medio)

| Archivo | Estado |
|---|---|
| `src/auth/ProtectedRoutes.tsx` | duplicado de `src/routes/ProtectedRoute.tsx`; nadie lo importa |
| `src/pages/SupabaseTestPage.tsx` | página de pruebas, fuera del router |
| `src/mocks/mockDashboard.ts` | sin referencias |

Dos guards de rutas casi idénticos en un proyecto cuya seguridad depende de
entender exactamente cuál está activo es un riesgo real, no sólo desorden.

---

### 🟡 H-09 — `saveInterviewAnswer` escribe la misma columna dos veces (medio)

`src/services/interviews.ts`:
```ts
interview_question_id: input.questionId,
question_id:           input.questionId,   // ← el mismo valor
```
Con `onConflict: "session_id,question_id"`. Sin las migraciones (H-02) es
imposible saber si ambas columnas existen, si una es un residuo, o si hay una FK
sin respetar. Hay que resolverlo con el esquema a la vista.

---

### 🔵 H-10 — Un parser de PDF artesanal de 20k líneas (informativo)

`src/lib/pdf-engine/` implementa a mano léxico, tabla xref, objetos, streams,
fuentes, CMaps, codificaciones, geometría de layout, detección de columnas,
orden de lectura, limpieza de encabezados y detección de secciones de CV.

Es, con diferencia, el trabajo de ingeniería más serio del repositorio y
funciona. Pero son 20 000 líneas, sin una sola prueba, para un problema que
`pdf.js` resuelve — y la aplicación sólo necesita de todo eso el texto plano
para mandárselo a un LLM.

No propongo tirarlo: propongo **decidirlo conscientemente** (decisión D-2). Si
se queda, necesita pruebas urgentemente. Si se va, se liberan ~20k líneas de
superficie de mantenimiento y 78 kB de bundle.

---

### 🔵 H-11 — README y `.vscode/settings.json` sin adaptar (informativo)

El `README.md` sigue siendo la plantilla por defecto de Vite: no dice qué es el
producto, ni cómo levantarlo, ni qué variables de entorno hace falta configurar.
Un colaborador nuevo no puede arrancar el proyecto con lo que hay en el repo.

Además, `settings.json` está en la raíz en lugar de `.vscode/settings.json`, por
lo que la configuración de Deno para las Edge Functions probablemente no se está
aplicando en el editor de nadie.

---

## Lo que está bien

No todo es deuda. Conviene no romper lo que ya funciona:

- **Disciplina de tipos:** cero `any`, cero supresiones de TypeScript en 38k
  líneas. Es infrecuente y vale la pena protegerlo.
- **Separación de capas:** ninguna página llama a `supabase` directamente; todo
  pasa por `services/`. El patrón está bien sostenido.
- **Sin secretos en el repo:** `.gitignore` correcto, `GROQ_API_KEY` sólo del
  lado servidor. La clave publicable en el bundle es el diseño esperado.
- **Parseo de PDF en web worker:** la decisión correcta; no bloquea la UI.
- **Manejo de errores en los servicios de IA:** `resume-analysis.service.ts` y
  `transcription.service.ts` desempaquetan `FunctionsHttpError` y traducen
  códigos de error a mensajes en español. Es más cuidado del habitual.
- **Edge Functions con `json_schema` estricto:** `analyze-resume` fuerza el
  esquema de salida y el prompt prohíbe explícitamente inventar datos. Buena
  práctica bien aplicada.
