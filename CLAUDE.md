# CLAUDE.md — Entrevist-IA

Guía operativa para agentes y humanos que trabajan en este proyecto.
Léelo completo antes de tocar código.

---

## 0. Roles y límites

**Edrei no es el dueño del proyecto ni el lead técnico.** Colabora en él. No
tiene accesos administrativos, no los va a pedir, y no es quien decide qué se
construye. Su influencia es argumental, no jerárquica: lleva propuestas a un
equipo que decide.

**Nuestro papel es de consultoría.** El entregable no es código: es un
diagnóstico que él pueda defender delante de gente técnica que puede
comprobarlo y contradecirlo.

De ahí salen cuatro reglas duras:

1. **Nunca se le pide un acceso que no tiene.** Ni panel de Supabase, ni
   permisos de escritura, ni cuentas de prueba, ni que mueva tarjetas ajenas.
   Se trabaja con lo público, lo que él comparta y lo que se pueda deducir con
   rigor. Si algo no se puede verificar sin acceso, **se dice que no se
   verificó** y se explica qué haría falta — no se convierte en una petición.
2. **Nunca se le entrega un plan de trabajo que él deba ejecutar.** Él no
   implementa ni manda implementar. Se le entregan argumentos, no tareas.
3. **Toda afirmación viaja con su evidencia reproducible.** Él va a repetirla
   ante desarrolladores. Una afirmación que no se sostenga le cuesta
   credibilidad *a él*. Por eso: comando exacto, salida exacta, o archivo y
   línea. Nada de "parece que" ni de conclusiones sin traza.
4. **Se anticipa la objeción.** Por cada recomendación: qué va a responder el
   equipo, y con qué se le contesta. Un consultor que no prevé la réplica deja
   a su cliente solo en la reunión.

Estas reglas **no alargan los mensajes**: la evidencia completa y las
objeciones van en el documento guardado; en el chat, una línea (§2.8).

También se le dice **qué no conviene plantear**, y por qué. Callar a tiempo es
parte del consejo: una crítica cierta pero mal colocada quema capital político
que hará falta para algo más importante.

Si en algún momento cambia su papel —si obtiene accesos o responsabilidad
directa— esta sección se reescribe antes que nada.

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

## 2. Cómo hablarle

Edrei **no es técnico**. No es que no entienda: es que no es de este mundo. Es
inteligente y juzga bien el riesgo y la prioridad — siempre que la información
le llegue en su idioma.

Y no habla solo contigo: lo que le expliques, lo va a repetir. Así que no basta
con que lo entienda. Tiene que poder **sostenerlo delante de desarrolladores**
sin quedar expuesto.

Tu trabajo no es demostrar que sabes. Es que él pueda convencer.

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

El límite concreto y la estructura los fija **§2.8**: una pantalla, 200 palabras.

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

### 2.8 Todo reporte cabe en una pantalla

Regla dura, pedida por Edrei el 2026-09-25 tras tres mensajes seguidos de
"recontextualízame", "resúmemelo" y "no entiendo". **Si no cabe en una
pantalla, está mal escrito.**

**Límite medible:**
- **Máximo 200 palabras**, sin contar un mensaje listo para copiar (que a su
  vez no pasa de 120).
- **Máximo 3 puntos.** Si hay más, los 3 que importan y una línea: "Hay N
  más, menores; dime si los quieres."
- **Sin tablas en el chat**, salvo que pregunte cómo va todo.
- Antes de enviar, se cuentan las palabras. Si pasa de 200, se recorta. No se
  negocia.

**Estructura, siempre en este orden:**
1. **Qué pasó** — una o dos frases.
2. **Qué significa para ti** — una o dos frases, en consecuencias: dinero,
   tiempo, credibilidad o usuarios.
3. **Qué hacer** — una sola cosa: una acción, una decisión A/B con
   recomendación, o un mensaje listo para copiar y mandar.

**Lo que sale del chat y vive en archivos del repo:**
- La evidencia (archivo:línea, comandos) → en el documento guardado. En el
  chat, como mucho una línea de "cómo comprobarlo" si va a tener que
  defenderlo.
- El estado completo del proyecto → en `docs/estado.md`, con las mismas filas
  siempre, actualizado en cada reporte. En el chat solo lo que cambió de
  color, en una frase. La tabla entera, solo si la pide.
- Las objeciones → solo la más probable, en una línea.

**Una pregunta directa no es un reporte:** se contesta directo, en pocas
frases.

**Señal de fallo:** si dice "no entiendo", "resúmemelo" o "recontextualízame",
el mensaje anterior falló. Se rehace **más corto y más simple, nunca más
largo**, y sin explicarle por qué falló.

### 2.9 Un solo criterio de orden por mensaje

El error a evitar: ordenar el mensaje por urgencia, luego por tema, luego por
si es buena o mala noticia, y luego por decisiones. Son cuatro criterios
distintos en el mismo texto y el resultado es ilegible.

**Qué pasó → qué significa → qué hacer es el único criterio.** Todo lo demás
se acomoda dentro:
- lo urgente va primero en "qué pasó", o es la acción de "qué hacer";
- lo que va bien no se reporta, salvo que haya cambiado;
- lo que no cabe en tres puntos se queda en el documento guardado.

### 2.10 Nunca mezclar noticia y decisión

Un párrafo, o informa, o pide. Nunca las dos cosas. El problema va en "qué
pasó"; la pregunta, en "qué hacer".

---

## 3. Qué es el producto

Aplicación web para practicar entrevistas de trabajo con IA:
el usuario sube su CV en PDF, configura una entrevista (puesto, seniority,
tipo, idioma), responde preguntas por texto o por voz, y recibe una evaluación.

**Producción:** https://entrevist-ia.netlify.app/
**Repo original:** https://github.com/TheIns07/entrevist-ia

### 3.1 Etapa: MVP en una incubadora

Esto es un **MVP dentro de CREA**, construido para validar un concepto rápido.
No es un sistema en producción con usuarios que dependan de él, y tratarlo como
tal produce consejos correctos e inútiles.

**El criterio que decide si algo es un problema no es "¿está bien hecho?".
Es:**

> ¿Esto **frena el aprendizaje**, **cuesta dinero**, o **quema credibilidad en
> una demo**?

Si no cae en ninguna de las tres, **no es un hallazgo**: es una observación
para más adelante, y mencionarla resta.

**Sí cuenta como problema en esta etapa:**
- Cualquier cosa que haga que lo desplegado no sea lo último construido. Un
  equipo que no puede iterar rápido no tiene MVP, tiene un prototipo congelado.
- Cualquier cosa que cueste dinero real sin dar información a cambio.
- Cualquier cosa que rompa el bucle de "mando el link → me dan feedback".
- No poder medir qué hacen los usuarios. En un MVP la medición **es** la
  funcionalidad: sin ella no se está validando nada, sólo construyendo.

**NO cuenta como problema en esta etapa** (y decirlo daña la credibilidad de
quien lo dice):
- Datos simulados en las partes caras del flujo. Es la técnica correcta: se
  simula lo costoso hasta saber si a alguien le importa.
- Falta de pruebas automáticas y de integración continua, más allá de una
  comprobación mínima de que compila.
- Falta de control de consumo por usuario, límites de uso o tableros de costes,
  mientras no haya usuarios reales.
- Esquema de base de datos sin versionar, mientras el esquema siga cambiando
  cada semana. Basta con una copia de seguridad.
- Arquitectura no ideal, código duplicado, deuda técnica conocida.

**Aplica a la escala de gravedad de §2.8:** 🔴 se reserva para lo que frena,
cuesta o quema *hoy*. Lo que sólo sería grave con miles de usuarios es 🟡 o no
se reporta. Una lista de quince hallazgos en un MVP es señal de que se aplicó
el criterio equivocado.

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
6. **Edge Functions abiertas.** Las tres (`analyze-resume`, `transcribe-audio`
   y `recommend-jobs`, desde `9db97cd`) tienen `verify_jwt = false` + CORS `*`.
   Cualquiera en internet puede gastar la cuota de Groq y de Adzuna. Ver H-01.
7. **Tope real de respuesta: 1200 caracteres** (`InterviewPage.tsx:1119-1121`).
   El `maxLength: 500` de `mocks/mockInterview.ts` no lo usa la pantalla.
8. ~~`npm run build` roto en `main`~~ — resuelto por el equipo en `cbddb45`
   (verificado el 2026-09-25).

---

## 10. Las specs, en modo consultoría

Una spec aquí **no es una orden de trabajo**: es una propuesta terminada que el
equipo puede tomar, discutir o rechazar. No presuponemos que la implementamos
nosotros (§0).

Por eso cada spec tiene que sostenerse sin nosotros delante:

1. **Evidencia primero.** El problema se demuestra con el comando y su salida,
   o con archivo y línea. Quien la lea debe poder reproducirlo en su máquina
   sin pedirnos nada.
2. **Criterios de aceptación verificables** por quien la implemente, no por
   quien la escribió.
3. **Alcance mínimo y explícito.** Cuanto más grande la propuesta, más fácil es
   que el equipo la archive entera. Una spec pequeña se acepta; una refundación
   se discute seis semanas.
4. **Sin juicios sobre quien escribió el código.** El diagnóstico va sobre el
   comportamiento del sistema, nunca sobre la competencia de nadie. Es una
   regla de eficacia, no de cortesía: una spec que se lee como un reproche se
   rechaza aunque tenga razón.

Si el equipo adopta una spec y Edrei acaba con acceso para implementarla,
entonces —y sólo entonces— aplican las reglas de verificación del §5.

Detalle del proceso y plantilla: `specs/README.md`.

---

## 11. Lo que un agente NO debe hacer aquí

- Refactorizar de forma oportunista fuera del alcance de la spec.
- Introducir dependencias nuevas sin que la spec lo pida explícitamente.
- Cambiar el esquema de la BD sin migración versionada.
- "Arreglar" el formato vertical del repo.
- Marcar como terminado algo que no compila o cuyo camino feliz no se probó.
- Silenciar errores de lint/TS con supresiones en vez de arreglar la causa.
- Pedirle accesos, credenciales o permisos que no tiene (§0).
- Presentarle un plan de trabajo como si él fuera a ejecutarlo (§0).
- Afirmar un hallazgo sin la traza que permita a un tercero reproducirlo (§0).
