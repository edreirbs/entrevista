# CLAUDE.md — Entrevist-IA

Guía operativa para agentes y humanos que trabajan en este proyecto.
Léelo completo antes de tocar código.

---

## 0. Roles

- **Director (humano):** define el *qué* y el *por qué* mediante especificaciones
  en `specs/`. Toma todas las decisiones de producto y arquitectura.
- **Programador (agente):** ejecuta el *cómo*. Implementa contra una spec
  aprobada, verifica, y reporta. No inventa alcance.

Si no hay spec aprobada, no hay código. La excepción son fallas de producción
(build roto, seguridad activa), que se reportan de inmediato y se arreglan con
el diff mínimo.

---

## 1. Las reglas de Karpathy

Principios de Andrej Karpathy, adaptados a este repositorio. Cuando exista
conflicto entre "hacerlo elegante" y estas reglas, ganan estas reglas.

### 1.1 Correa corta (short leash)
Cambios pequeños, concretos y verificables. Un objetivo por diff. Si una tarea
no cabe en un diff que el director pueda revisar en 10 minutos, se parte en
varias specs.

> Generar código es barato. **Verificarlo es el cuello de botella.** Optimiza
> siempre el lado de la verificación.

### 1.2 No seas héroe ("don't be a hero")
Usa lo estándar, aburrido y probado antes que lo propio. Una librería madura
gana a un motor artesanal salvo que exista una razón escrita en una spec.

> Este repo ya violó esta regla: ver `src/lib/pdf-engine/` (~20k líneas de
> parser PDF propio donde existía `pdf.js`). No repetir el patrón.

### 1.3 El código falla en silencio
Igual que el entrenamiento de redes neuronales, este sistema falla sin gritar:
un `catch` vacío, una tabla que nadie escribe, una Edge Function sin auth. **Sé
paranoico.** Todo camino de error se maneja explícitamente o se propaga; nunca
se traga.

### 1.4 Esqueleto end-to-end primero, luego calidad
Antes de pulir una pieza, que el flujo completo funcione de punta a punta con la
versión más tonta posible. Después se sustituye pieza por pieza, midiendo.
Un baseline honesto y feo vale más que un módulo brillante desconectado.

### 1.5 Conócete los datos
Antes de escribir lógica sobre una tabla, un PDF o una respuesta de la IA:
míralos de verdad. Imprime el objeto. Abre la fila. No programes contra una
suposición del esquema.

### 1.6 Visualiza / instrumenta todo
Si un paso puede fallar, tiene que poder observarse: estado en UI, error
tipado, log con prefijo `[modulo]`. Nada de spinners que mienten (ver hallazgo
H-06 de la auditoría: `ProcessingPage` anima progreso falso).

### 1.7 El mejor código es el que no existe
Borrar es progreso. Código muerto se elimina en el mismo diff en que se
detecta. No se comenta "por si acaso" — para eso está git.

### 1.8 No aceptes código que no entiendes
Aplica al agente y al director. Si un diff no se entiende línea por línea, no
se mergea. "Lo generó la IA" no es una justificación de diseño.

### 1.9 YAGNI
Nada de capas de abstracción para requisitos hipotéticos. Se abstrae al tercer
uso real, no al primero imaginado.

---

## 2. Qué es el producto

Aplicación web para practicar entrevistas de trabajo con IA:
el usuario sube su CV en PDF, configura una entrevista (puesto, seniority,
tipo, idioma), responde preguntas por texto o por voz, y recibe una evaluación.

**Producción:** https://entrevist-ia.netlify.app/
**Repo original:** https://github.com/TheIns07/entrevist-ia

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| Build | Vite 8 |
| UI | React 19 + TypeScript 6 (strict vía `tsconfig.app.json`) |
| Estilos | Tailwind CSS 4 (plugin de Vite, sin `tailwind.config`) |
| Ruteo | react-router-dom 7 (`BrowserRouter`) |
| Animación | framer-motion 13 |
| Iconos | lucide-react |
| Backend | Supabase (Auth + Postgres + Edge Functions en Deno) |
| IA | Groq — `openai/gpt-oss-20b` (análisis de CV), `whisper-large-v3-turbo` (transcripción) |
| Hosting | Netlify |

---

## 4. Comandos

```bash
npm ci            # instalar (usar ci, no install)
npm run dev       # servidor de desarrollo
npm run build     # tsc -b && vite build  <-- la verdad del proyecto
npm run lint      # eslint .
npm run preview   # servir el build
```

**Definition of done de cualquier diff:** `npm run build` y `npm run lint`
terminan en exit 0. Sin excepciones. Si estaban rojos antes de tu cambio, se
reporta; no se acumula deuda silenciosa.

---

## 5. Variables de entorno

Frontend (`.env.local`, nunca commiteado):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```
Todo lo que lleve prefijo `VITE_` **se incrusta en el bundle público**. Jamás
poner ahí un secreto: la publishable key es pública por diseño y su única
protección es RLS.

Edge Functions (secretos de Supabase, nunca en el repo):
```
GROQ_API_KEY=
```

---

## 6. Arquitectura

```
src/
  auth/         AuthProvider + contexto de sesión Supabase
  routes/       AppRouter + ProtectedRoute  <- el guard REAL vive aquí
  pages/        una página por ruta
  components/   UI compartida (barrel en components/index.ts)
    interview/  landing/  marketing/  voice/
  services/     TODO acceso a datos y a IA pasa por aquí
    ai/         clientes de Edge Functions
  lib/
    supabase.ts cliente singleton
    pdf-engine/ motor PDF propio (parser, fonts, layout, cleaning, structure)
  workers/      pdf.worker.ts — el parseo corre fuera del hilo principal
  hooks/        useAudioRecorder, useMicrophoneCheck
  types/        tipos de dominio
  mocks/        datos falsos — ver §8
supabase/
  functions/    analyze-resume, transcribe-audio (Deno)
  config.toml   configuración del proyecto Supabase
```

### Regla de capas
`pages` → `services` → `lib/supabase`.
**Una página nunca llama a `supabase` directamente.** Si necesitas datos
nuevos, se agrega una función al servicio correspondiente.

### Modelo de datos (Postgres)
`profiles`, `interview_sessions`, `interview_questions`,
`interview_answers`, `interview_results`.

⚠️ **El esquema NO está versionado en el repo.** No existe
`supabase/migrations/`. Toda la estructura y las políticas RLS viven sólo en el
proyecto remoto. Cualquier cambio de esquema debe ir acompañado de su
migración. Ver hallazgo H-02.

### Seguridad
La autorización real es **RLS en Postgres**, no el `ProtectedRoute` de React.
El guard de React es sólo experiencia de usuario: evita el parpadeo a `/login`.
Nunca asumas que ocultar una ruta protege un dato.

---

## 7. Convenciones de código

- **Español** en comentarios, mensajes de UI y errores de cara al usuario.
  **Inglés** en identificadores, tablas y columnas.
- Columnas de BD en `snake_case`; el código TS respeta ese nombre al mapear
  filas (`question_order`, no `questionOrder`) para no inventar traducciones.
- Servicios: funciones exportadas nombradas, `async`, que lanzan (`throw`) el
  error de Supabase. La página decide cómo mostrarlo.
- Componentes: `export default` para el componente, named exports para tipos.
- Nada de `any`, `@ts-ignore` ni `@ts-expect-error`. El repo hoy está limpio de
  los tres: mantenerlo así.
- **Formato vertical extremo:** el código actual pone casi un token por línea.
  Es la convención de facto del repo (y la razón de que haya ~38k líneas). No
  la cambies unilateralmente — ver decisión pendiente D-1 en `specs/README.md`.

---

## 8. Trampas conocidas (leer antes de tocar)

1. **Dos `ProtectedRoute`.** `src/routes/ProtectedRoute.tsx` es el que usa
   `AppRouter`. `src/auth/ProtectedRoutes.tsx` es código muerto duplicado.
2. **Las preguntas no son de IA.** `services/questions.ts` siembra la BD desde
   `mocks/mockInterview.ts`. El comentario dice "más adelante: OpenAI".
3. **La evaluación no existe.** Nadie escribe en `interview_results`.
   `ProcessingPage` anima 5 pasos falsos y marca la sesión como `completed`.
   `ResultsPage` pinta `mocks/mockResults.ts`.
4. **`saveInterviewAnswer` escribe dos columnas con el mismo valor**
   (`interview_question_id` y `question_id`). Artefacto de migración; no
   copiar el patrón.
5. **Sin SPA fallback.** No hay `netlify.toml` ni `public/_redirects`, así que
   recargar cualquier ruta que no sea `/` devuelve 404 en producción.
6. **Edge Functions abiertas.** `verify_jwt = false` + CORS `*`. Cualquiera en
   internet puede gastar la cuota de Groq. Ver H-01.
7. **`npm run build` está roto en `main`** (2 errores TS6133 en
   `OnboardingPage.tsx`).

---

## 9. Flujo de trabajo (spec-driven)

1. El director escribe o aprueba una spec en `specs/NNNN-slug.md`.
2. El programador implementa **sólo lo que dice la spec**. Si encuentra algo
   fuera de alcance, lo anota en la sección "Fuera de alcance" y sigue.
3. Verificación obligatoria antes de entregar: `npm run build`, `npm run lint`,
   y la prueba manual descrita en la spec.
4. Un commit por spec cuando sea posible. Mensaje en imperativo y en español,
   referenciando la spec: `feat(0001): proteger edge functions con JWT`.
5. El director revisa y decide: mergear, iterar o descartar.

Detalle del proceso y plantilla: `specs/README.md`.

---

## 10. Lo que un agente NO debe hacer aquí

- Refactorizar de forma oportunista fuera del alcance de la spec.
- Introducir dependencias nuevas sin que la spec lo pida explícitamente.
- Cambiar el esquema de la BD sin migración versionada.
- "Arreglar" el formato vertical del repo.
- Marcar como terminado algo que no compila o cuyo camino feliz no se probó.
- Silenciar errores de lint/TS con supresiones en vez de arreglar la causa.
