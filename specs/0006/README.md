# Material de la spec 0006

Archivos de apoyo de [`../0006-prompt-de-evaluacion.md`](../0006-prompt-de-evaluacion.md).

| Archivo | Qué es |
|---|---|
| `eval-schema.json` | JSON Schema de la salida del modelo (modo estricto de Groq) |
| `eval-aggregate.ts` | Agregación: niveles → notas → etiqueta → forma `MockInterviewResult` |
| `eval-aggregate.test.mts` | 14 pruebas del módulo anterior |

## Cómo validarlo

```bash
# Pruebas
node --experimental-strip-types --no-warnings eval-aggregate.test.mts

# Tipos en modo estricto (desde un checkout de TheIns07/entrevist-ia, TypeScript 6)
npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext \
  --moduleResolution bundler <ruta>/specs/0006/eval-aggregate.ts
```

Validado por última vez el 2026-09-25 contra `TheIns07/entrevist-ia@cbddb45`: esquema OK, tipos OK, compatibilidad de tipos con `src/mocks/mockResults.ts` OK, 14/14 pruebas OK. Ninguna validación llamó a Groq ni a servicios del proyecto.
