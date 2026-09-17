# CLAUDE.md — Entrevist-IA

Guía operativa para agentes y humanos que trabajan en este proyecto.
Léelo completo antes de tocar código.

---

## 0. Roles

- **Director (humano):** define el *qué* y el *por qué* mediante especificaciones
  en `specs/`. Toma todas las decisiones de producto y arquitectura.
  **No es perfil técnico.** Cómo dirigirse a él no es cortesía, es requisito
  del proceso: ver **§2**, que es tan obligatoria como las reglas de §1.
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

## 2. Cómo hablarle al director

El director **no es técnico**. No es que no entienda: es que no es de este
mundo. Es inteligente, decide bien, y toma decisiones mejores que las tuyas
sobre producto, prioridad y riesgo de negocio — siempre que le des la
información en su idioma.

Tu trabajo no es demostrar que sabes. Es que él pueda decidir.

### 2.1 Cero jerga
Ningún término técnico sin traducir. Si una palabra sólo la entiende alguien
que programa, o la explicas en la misma frase, o la quitas.

Prohibido sin traducción: `commit`, `branch`, `PR`, `merge`, `deploy`, `build`,
`endpoint`, `API`, `JWT`, `token`, `CORS`, `RLS`, `bundle`, `worker`, `lint`,
`refactor`, `migración`, `mock`, `parser`, códigos de error (`TS6133`, `401`),
nombres de archivo y rutas del repo.

### 2.2 Empieza por la consecuencia, no por la causa
Él necesita saber **qué pasa en el mundo real**: cuánto cuesta, a quién afecta,
qué se rompe, cuánto tarda. La causa técnica va después, o no va.

| ❌ Así no | ✅ Así sí |
|---|---|
| "Las Edge Functions tienen `verify_jwt = false` y CORS `*`" | "Cualquier persona en internet puede usar tu servicio de inteligencia artificial y tú pagas la factura" |
| "El build falla con 2 errores TS6133" | "Lo que está publicado en tu web no es tu código más reciente: desde hace días los cambios nuevos no llegan a los usuarios" |
| "Falta el fallback SPA, deep links devuelven 404" | "Si alguien recarga la página o comparte un enlace, la web se rompe y muestra un error" |
| "Nadie escribe en `interview_results`" | "La app le dice al usuario que está evaluando su entrevista, pero no la evalúa. Los resultados que ve son inventados" |
| "20k líneas sin cobertura de tests" | "Hay una pieza grande y delicada que nadie ha comprobado nunca. Si se rompe, probablemente nos enteremos por un usuario enfadado" |

### 2.3 Conciso
Lo más corto posible sin perder lo que necesita para decidir. Si algo no
cambia su decisión, fuera. Nada de listar todo lo que investigaste ni de
narrar el proceso.

Formato por defecto de un reporte:
1. **Qué pasa** — una o dos frases.
2. **Por qué importa** — el impacto real.
3. **Opciones** — con su coste y su consecuencia.
4. **Tu recomendación** — una, con el motivo en una frase.

### 2.4 Siempre opciones con escenarios, nunca preguntas abiertas
Nunca le preguntes "¿qué hacemos?". Preséntale **2 o 3 caminos concretos**, y
para cada uno: qué gana, qué cuesta (tiempo y riesgo, no líneas de código) y
qué pasa si lo elige.

```
❌ "¿Quieres que arregle el rate limiting o prefieres priorizar el MVP?"

✅ "Puedes ir por dos caminos:

    A) Cerrar la puerta primero — 1 día.
       Dejas de estar expuesto a que te vacíen la cuenta.
       Coste: una semana más sin funciones nuevas.

    B) Seguir construyendo y cerrar en dos semanas.
       Avanzas en lo que ven los usuarios.
       Riesgo: si alguien lo descubre antes, el servicio se cae
       y la factura la pagas tú.

    Recomiendo A: el riesgo es de dinero y no lo controlas."
```

Una decisión que él pueda contestar con "A" o "B" vale más que tres párrafos
de contexto.

### 2.5 No escondas las malas noticias
Si algo está mal, se dice en la primera frase, claro y sin suavizar. Sin
hedging, sin "podría haber un pequeño problema con". Tampoco dramatices: los
hechos, su tamaño real, y qué hacer.

### 2.6 No le pidas que decida cosas técnicas
Si la decisión no cambia nada que él pueda percibir (qué librería, cómo
nombrar algo, cómo estructurar un archivo), **decídela tú** y sigue. Sólo
sube a decisión lo que afecta a coste, tiempo, riesgo, o a lo que el usuario
ve.

Si necesitas su criterio sobre algo técnico, tradúcelo a una disyuntiva de
negocio. "¿Postgres o Redis?" no es su pregunta. "¿Prefieres que sea más
barato de mantener o más rápido?" sí lo es.

### 2.7 Lo que sí puede usar: números y comparaciones
Tiempos, dinero, número de usuarios afectados, "esto es como…". Las analogías
son buenas si son honestas. Los porcentajes y los plazos concretos le sirven;
los nombres de tecnologías, no.

---

## 3. Qué es el producto

Aplicación web para practicar entrevistas de trabajo con IA:
el usuario sube su CV en PDF, configura una entrevista (puesto, seniority,
tipo, idioma), responde preguntas por texto o por voz, y recibe una evaluación.

**Producción:** https://entrevist-ia.netlify.app/
**Repo original:** https://github.com/TheIns07/entrevist-ia

---

## 4. Stack

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

## 5. Comandos

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

## 6. Variables de entorno

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

## 7. Arquitectura

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
  mocks/        datos falsos — ver §9
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

## 8. Convenciones de código

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

## 9. Trampas conocidas (leer antes de tocar)

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

## 10. Flujo de trabajo (spec-driven)

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

## 11. Lo que un agente NO debe hacer aquí

- Refactorizar de forma oportunista fuera del alcance de la spec.
- Introducir dependencias nuevas sin que la spec lo pida explícitamente.
- Cambiar el esquema de la BD sin migración versionada.
- "Arreglar" el formato vertical del repo.
- Marcar como terminado algo que no compila o cuyo camino feliz no se probó.
- Silenciar errores de lint/TS con supresiones en vez de arreglar la causa.
