# 0001 — Proteger las Edge Functions

- **Estado:** borrador (pendiente de aprobación del director)
- **Autor:** programador
- **Fecha:** 2026-09-17
- **Prioridad (Notion):** Tech
- **Hallazgo de auditoría:** H-01
- **Depende de:** ninguna

## Problema

Las dos Edge Functions del proyecto están abiertas a internet sin
autenticación. `supabase/config.toml` declara `verify_jwt = false` para ambas y
cada una responde con `Access-Control-Allow-Origin: *`.

Verificado contra producción el 2026-09-17, sin enviar ninguna credencial:

```
POST https://<proyecto>.supabase.co/functions/v1/analyze-resume
Content-Type: application/json
{}
→ 400 {"error":"AI_TEXT_REQUIRED"}

POST https://<proyecto>.supabase.co/functions/v1/transcribe-audio
(form-data sin archivo)
→ 400 {"error":"AUDIO_FILE_REQUIRED"}
```

Un **400 de validación, y no un 401**, prueba que la petición atravesó la capa
de autenticación y llegó al handler. Cualquier persona en internet puede
invocar ambas funciones.

Cada invocación exitosa consume cuota de pago de `GROQ_API_KEY`: hasta 50 000
caracteres contra el LLM, hasta 20 MB de audio contra Whisper. Esos límites
acotan el costo de *una* petición, pero **no hay ningún límite en el número de
peticiones**, ni por IP ni por usuario ni por hora.

Consecuencia concreta: un script trivial agota la cuota de Groq en horas y deja
el producto inservible para los usuarios reales, con cargo al dueño del
proyecto.

## Objetivo

Que sólo un usuario autenticado de Entrevist-IA pueda invocar las Edge
Functions, y que ninguno pueda, por sí solo, agotar la cuota del proyecto.

## Criterios de aceptación

- [ ] Una petición **sin** cabecera `Authorization` a `analyze-resume` responde
      `401`, no `400`.
- [ ] Una petición **sin** cabecera `Authorization` a `transcribe-audio`
      responde `401`, no `400`.
- [ ] Una petición con un JWT inválido o caducado responde `401`.
- [ ] Un usuario con sesión válida en la app sigue pudiendo subir su CV y
      grabar una respuesta de voz, extremo a extremo, sin cambios en la UI.
- [ ] `Access-Control-Allow-Origin` deja de ser `*` y sólo admite los orígenes
      de la lista permitida (producción y desarrollo local).
- [ ] Un mismo usuario que supere el límite de invocaciones por hora recibe
      `429` con un mensaje en español, y la UI lo muestra sin romperse.
- [ ] `npm run build` termina en exit 0.
- [ ] `npm run lint` termina en exit 0.

## Fuera de alcance

- La generación de preguntas y la evaluación de la entrevista (H-06, specs 0006
  y 0007).
- Reparar el build roto de `main` (H-03, spec 0002) — se trata por separado
  para que este diff no lo arrastre.
- Cualquier cambio en el motor PDF.
- Captcha o protección anti-bot en el registro. Si se decide que hace falta,
  es spec aparte.

## Restricciones

*A definir por el director.* Propuestas del programador, sujetas a aprobación:

1. **Límite de tasa:** 20 invocaciones de `analyze-resume` y 60 de
   `transcribe-audio` por usuario y por hora. Son números elegidos para no
   estorbar a un usuario real (un CV por entrevista, una grabación por
   pregunta) y cortar el abuso. El director decide si los ajusta.
2. **Dónde se lleva la cuenta:** tabla `edge_function_usage` en Postgres,
   contada dentro de la propia función con el `service_role`. Evita añadir
   Redis o cualquier dependencia nueva de infraestructura (regla 1.2, "no seas
   héroe").
3. **Sin dependencias nuevas** más allá de `@supabase/supabase-js`, que ya está
   disponible en el runtime de Deno.

## Plan de implementación

*Se rellena al aprobarse.* Esbozo:

1. `supabase/config.toml` → `verify_jwt = true` en ambas funciones.
2. Módulo compartido `supabase/functions/_shared/auth.ts`: valida el JWT contra
   Supabase Auth y devuelve el `user.id`, o `401`.
3. Módulo compartido `supabase/functions/_shared/cors.ts`: lista de orígenes
   permitidos en vez de `*`.
4. Módulo compartido `supabase/functions/_shared/rate-limit.ts`: cuenta e
   incrementa contra `edge_function_usage`.
5. Migración de la tabla `edge_function_usage` con su RLS.
   ⚠️ **Bloqueado por la spec 0004** (H-02): hoy el repo no tiene directorio de
   migraciones, así que no hay dónde poner este SQL de forma versionada.
6. Manejar `401` y `429` en `resume-analysis.service.ts` y
   `transcription.service.ts`, que ya tienen el patrón de traducción de códigos
   de error a mensajes en español.

## Verificación

*Se rellena al implementarse.* Debe incluir, como mínimo:

- Las cuatro peticiones `curl` de los criterios de aceptación, con su salida.
- Recorrido manual completo: registro → subir CV → configurar entrevista →
  responder una pregunta por voz.
- Salida de `npm run build` y `npm run lint`.

## Riesgos

- **Romper el flujo de usuarios con sesión activa.** `supabase.functions.invoke`
  adjunta el JWT automáticamente, así que el cliente no debería requerir
  cambios; hay que confirmarlo antes de desplegar.
- **Contador de tasa demasiado agresivo** y usuarios legítimos bloqueados.
  Mitigación: los umbrales son constantes en un solo archivo, ajustables sin
  redesplegar lógica.
- **Reversión:** volver `verify_jwt` a `false` y redesplegar restaura el
  comportamiento actual en un paso.

## Historial

- 2026-09-17 — creada a partir del hallazgo H-01 de la auditoría.
