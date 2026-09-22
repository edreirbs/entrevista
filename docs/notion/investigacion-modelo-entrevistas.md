# Investigación: modelo de entrevistas

> Tarjeta: **Investigación de modelo de entrevistas** (categoría AI)
> Responsable: Edrei · Fecha: 2026-09-22

---

## Qué tiene que hacer el modelo (tres trabajos distintos)

La "entrevista con IA" son en realidad tres tareas, y no tienen por qué usar el
mismo modelo:

1. **Generar preguntas** a partir del CV y el puesto.
2. **Conducir** — reaccionar a la respuesta, repreguntar, mantener el tono del
   rol.
3. **Evaluar** las respuestas con una rúbrica y dar feedback.

## Dónde estamos hoy

Lo que ya existe en el código:

- **Análisis de CV** → Groq, modelo `openai/gpt-oss-20b`.
- **Transcripción de voz** → Groq, `whisper-large-v3-turbo`.

Lo que **no** existe todavía (es el hueco real del producto):

- Las **preguntas no las genera un modelo**: son una lista fija en el código
  (`mocks/mockInterview.ts`).
- La **evaluación no existe**: nadie escribe resultados; la pantalla de
  "analizando" es una animación y los resultados que se muestran son de
  ejemplo.

Es decir: de los tres trabajos, **el modelo de entrevista propiamente dicho
todavía no está conectado.** Esta tarjeta es, en el fondo, decidir con qué se
conecta.

## El hallazgo que cambia las opciones

**Groq recortó su catálogo self-serve a dos modelos en agosto de 2026.**

Desde el 26/08/2026, Llama 3.1 8B y Llama 3.3 70B pasaron a "Contact Sales"
(solo empresas). Lo que queda disponible sin hablar con ventas son **dos
modelos**:

| Modelo | Precio (entrada / salida por 1M tokens) | Contexto |
|---|---|---|
| GPT OSS 20B | $0.075 / $0.30 | ~131k tokens |
| GPT OSS 120B | $0.15 / $0.60 | ~131k tokens |

Free tier: ~30 peticiones/min, 500k tokens/día.

**Buena noticia:** el modelo que ya usamos (`gpt-oss-20b`) es uno de los dos que
sobrevivieron. No hay que migrar nada urgente.

**Riesgo:** depender de un catálogo de dos modelos es frágil. Conviene mantener
el modelo **intercambiable** — hoy ya lo es, está en una sola constante
(`GROQ_MODEL`), así que cambiarlo es una línea. No perder esa propiedad.

## Recomendación por trabajo

- **Generar preguntas + conducir:** `gpt-oss-20b` basta para el MVP. Es rápido
  y baratísimo. Si al probarlo las preguntas salen genéricas, subir a
  `gpt-oss-120b` es cambiar una línea.
- **Evaluar (el "juez"):** aquí sí me iría directo a `gpt-oss-120b`. Un juez
  flojo da feedback pobre, y el feedback **es** el producto que se le vende al
  usuario. El costo extra es despreciable (ver abajo), así que no vale la pena
  ahorrar en la pieza que más se nota.

## Cuánto cuesta (el número para la reunión)

Una entrevista completa mueve del orden de ~10k tokens entre generar, conducir
y evaluar. A precios de Groq, eso son **menos de dos décimas de centavo de
dólar por entrevista** — con el modelo grande incluido. El costo de IA **no es
una restricción** en esta etapa; la restricción es la calidad y el control de
abuso (ver tarjeta *Prompt de jailbreak*).

## Lo que de verdad hay que diseñar: la rúbrica

El modelo importa menos de lo que parece. Lo que hace bueno o malo el producto
es **con qué criterios evalúa**, y eso ya está esbozado en el propio Notion:
la tarjeta *Base de datos* define una tabla `Interview Evaluations` con
`clarity_score`, `structure_score`, `evidence_score`, `relevance_score`,
`communication_score`, `confidence_score`.

Ese es el verdadero trabajo de IA de esta tarjeta: convertir esos seis ejes en
un prompt de evaluación que dé notas consistentes y feedback accionable, con el
mismo patrón de esquema cerrado que ya funciona en `analyze-resume` (obliga al
modelo a devolver las seis notas + fortalezas + mejoras, sin divagar).

## Siguiente paso concreto

No es elegir modelo (ya está: 20B para conducir, 120B para evaluar). Es
**escribir el prompt de evaluación contra esos seis ejes**, con salida en
esquema cerrado, y probarlo con 3-4 entrevistas reales para ver si las notas
tienen sentido. Eso es una spec pequeña y es lo que desbloquea el producto.

---

## Fuentes

- [Groq pricing 2026 — eesel AI](https://www.eesel.ai/blog/groq-pricing)
- [Groq Pricing 2026 — CloudZero](https://www.cloudzero.com/blog/groq-pricing/)
- [Supported Models — Groq Docs](https://console.groq.com/docs/models)
- [Model Deprecation — Groq Docs](https://console.groq.com/docs/deprecations)
