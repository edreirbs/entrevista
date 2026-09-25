# Revisión del rediseño de flujo (Christopher) — contrastada con el código

- **Fecha:** 2026-09-25
- **Diseño:** [Entrenamiento Entrevistas IA — Figma](https://www.figma.com/design/ewxHYLjZkfq8ZBra53Qbe9/Entrenamiento-Entrevistas-IA?node-id=448-665), nodo `448-665`, 9 pantallas con estrella.
- **Método:** una sesión de Claude en el navegador de Edrei revisó las pantallas como lectora, sin editar ni comentar en Figma. Después se contrastó cada afirmación que dependía de lo ya construido con `TheIns07/entrevist-ia@cbddb45`. Las medidas en píxeles son de esa revisión visual (±2 px).
- **Límite:** todas las pantallas son de escritorio (1440 px); no hay versión móvil.

---

## Lo que cambia al mirar el código

La revisión visual fue buena en criterio de producto, pero dio por nuevas cuatro cosas que **ya existen** y no vio una oportunidad. Estas son las correcciones:

| Pantalla | Revisión visual | Lo que dice el código | Veredicto corregido |
|---|---|---|---|
| 46 "Anterior" | SIMPLIFICAR: quitarlo porque obliga a guardar y reescribir respuestas | **Ya existe.** `InterviewPage.tsx:579` (`handlePrevious`) y `:1187` (botón "Anterior"). Sobrescribir una respuesta ya funciona: `services/interviews.ts:218` (`upsert` con `onConflict`). | ADELANTE. No cuesta nada. Quitarlo sería una decisión de producto, no de ahorro. |
| 45 y 49 Caja única, respuesta editable | SIMPLIFICAR / ADELANTE, esfuerzo bajo | **La caja única ya existe:** lo dictado se añade al mismo texto editable (`InterviewAnswerInput.tsx:251-259`, `:366`). Ya se puede corregir la transcripción antes de enviar. | ADELANTE. Es un rediseño visual. Lo único nuevo es el botón "Borrar". |
| 45 Límite de caracteres | "1200 en lugar de 500" | **Ya es 1200** (`InterviewPage.tsx:1119-1121`). El 500 solo aparece en un archivo de ejemplo que la pantalla no usa (`mocks/mockInterview.ts:17`). El error venía de las instrucciones que le dimos a la revisión. | Sin cambio: diseño y código ya coinciden. |
| 47/48 Dictando | Onda y contador "si hoy no existen" | **Onda y contador ya existen:** `InterviewAnswerInput.tsx:528` (tiempo) y `:534` (`VoiceLevel`). Lo que **no** existe es el texto en vivo: hoy se transcribe al detener (`:201` → `:208`). | SIMPLIFICAR solo el texto en vivo, que es lo único caro. Ojo en iPhone: el medidor probablemente se queda en cero (`useAudioRecorder.ts:270`, el audio nunca se "despierta" tras el toque del usuario). |
| 45 Cuenta regresiva (02:03) | Quitarla | Hoy solo hay un tiempo **estimado** ("~2 min"), no una cuenta regresiva (`InterviewPage.tsx:882-897`). | Confirmado: es nueva y conviene dejarla para después. |
| 61 Puesto e industria | "La industria ya existe" | **La industria no se captura hoy:** `OnboardingPage.tsx:169` (`const [industry] = useState("")`, sin forma de cambiarla). Se guarda siempre vacía. | El campo de industria es nuevo, aunque pequeño. |
| 61/68 "Paso 1 de 4" | Errata | La configuración actual tiene **6 pasos** (`OnboardingPage.tsx:71-77`). | Preguntar si la idea es pasar de 6 a 4 pasos. Puede ser intencional, no una errata. |
| 60 Resultados | "El dashboard no existe" | **El panel existe** (`routes/AppRouter.tsx:85`, `pages/DashboardPage.tsx`) y los resultados ya tienen "Practicar de nuevo" (`ResultsPage.tsx:707`) y la vuelta al panel (`:206`). | ADELANTE con los dos botones tal cual. Faltan en el diseño la nota 0-10 con su etiqueta y la vista de una pregunta abierta. |
| 68 De 5 a 20 preguntas | DESPUÉS | Confirmado, y hay un dato más: la evaluación propuesta (spec 0006) acepta como máximo 10 preguntas (`specs/0006/eval-aggregate.ts:10`). | DESPUÉS. |

### La oportunidad que no vio

**El panel ya recomienda vacantes reales** con título, empresa y descripción (`types/jobs.ts:20-76`). Hoy cada tarjeta solo tiene "Ver vacante", que lleva al sitio externo (`DashboardPage.tsx:2175-2190`).

Un botón **"Practicar para esta vacante"** en esa tarjeta haría lo mismo que "pegar vacante" (pantalla 61), pero sin pegar nada. Además conecta el buscador de empleos con la entrevista, las dos mitades del producto que hoy van separadas, y permite medir cuánta gente practica para un puesto real.

---

## Comentarios para Christopher (corregidos, listos para enviar)

1. **Resultados:** "La pantalla de resultados es la más valiosa, y coincide casi exacto con lo que va a devolver la evaluación, así que se puede construir ya. ¿Le agregas arriba la nota de 0 a 10 con su etiqueta, y diseñas cómo se ve una pregunta cuando la abres (nota, resumen, fortaleza, mejora y respuesta sugerida)? 'Practicar de nuevo' y 'Ver mi Dashboard' ya existen en la app, así que van tal cual."
2. **Caja de respuesta:** "Juntar texto y voz en una sola caja está muy bien. La app ya funciona así, así que es sobre todo un rediseño visual y sale barato. ¿Lo dejarías como un componente con sus estados (vacío, escuchando, listo, texto largo) en vez de seis pantallas? Lo único caro es el texto en vivo mientras hablas: hoy se transcribe al terminar. La onda y el contador ya existen. El temporizador lo dejaría para una segunda vuelta, y subiría Dictar, Enviar y Detener a 44 px."
3. **Vacante:** "'Pegar vacante' me gusta. Y hay un atajo: el panel ya recomienda vacantes reales, así que un botón 'Practicar para esta vacante' en cada tarjeta ahorra pegar texto y conecta el buscador con la entrevista. 'Generar con IA' y el deslizante de 5 a 20 necesitan preguntas dinámicas que todavía no tenemos. Como hay un bug abierto en móvil, ¿podrías hacer la pregunta y los resultados en 375 px? Y una duda: el diseño dice 'Paso 1 de 4' y hoy la configuración tiene 6. ¿La idea es juntar pasos?"

**Erratas del diseño:** "prácticar" (61), "repsuestas" y "Prácticar de nuevo" (60).

## Qué no conviene plantear

- **Quitar "Anterior".** La revisión visual lo propuso creyendo que era nuevo y caro. Ya existe y funciona. Pedir que se quite sería proponer retroceder por un malentendido.
- **El pulido visual fino** (colores, iconos, animación de la onda). Con resultados de ejemplo y sin medición, esa conversación no enseña nada del usuario.
