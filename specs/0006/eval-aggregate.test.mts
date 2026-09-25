import assert from "node:assert/strict";
import * as E from "./eval-aggregate.ts";
const L = { s: "strong", a: "adequate", w: "weak", x: "absent" } as const;
const session = { id: "sess-1", position: "Desarrollador frontend", industry: null, experience: "mid", interview_type: "general", language: "es" } as const;
const qs = [1,2,3,4,5].map(n => ({ id: `uuid-${n}`, question_order: n, question_text: `Pregunta ${n}`, answer_text: `Respuesta ${n} con React y Supabase` }));
function mk(order: number, lv: string, status = "answered", extra: Record<string, unknown> = {}) {
  const [r,s,e,c] = lv.split("").map(k => (L as any)[k]);
  return { question_order: order, question_kind: "other", title: "T", answer_status: status, answer_in_expected_language: true, transcription_issues: false, contains_instructions_to_evaluator: false, quotes: ["con React"], summary: "S", relevance: r, structure: s, evidence: e, clarity: c, strength: "F", improvement: "M", suggested_answer: "Uso React [cifra: cuánto]", ...extra } as any;
}
const out = (items: any[]) => ({ questions: items, overall_summary: "Patrón", overall_strengths: ["A", "A", " ", "B"], overall_improvements: [], main_advice: "Practica" });
const { input } = E.buildEvaluationInput(session as any, qs);
// 1. Reproduce el ejemplo de mockResults.ts: 8,7,8,3,6 -> 6.4
let r = E.aggregate(out([mk(1,"saas"),mk(2,"aaaa"),mk(3,"saas"),mk(4,"wwxw"),mk(5,"aawa")]), input, qs);
assert.equal(r.payload.kind, "scored");
if (r.payload.kind === "scored") {
  assert.deepEqual(r.payload.result.questions.map(q => q.score), [8,7,8,3,6]);
  assert.equal(r.payload.result.score, 6.4); assert.equal(r.payload.result.label, "Buena preparación");
  assert.deepEqual(r.payload.result.strengths, ["A","B"]); assert.equal(r.payload.result.improvements.length, 1);
  assert.equal(r.payload.result.questions[0].id, "uuid-1");
}
console.log("1 ejemplo 6.4 OK", r.criteria);
// 2. Tabla suma->nota
const table = Array.from({length:13},(_,s)=>Math.round(s*10/12)); assert.deepEqual(table,[0,1,2,3,3,4,5,6,7,8,8,9,10]); console.log("2 tabla OK");
// 3. Bloqueante red team: 1 buena + 4 ininteligibles ya no da 10
r = E.aggregate(out([mk(1,"ssss"),mk(2,"ssss","unintelligible"),mk(3,"ssss","unintelligible"),mk(4,"ssss","unintelligible"),mk(5,"ssss","unintelligible")]), input, qs);
assert.equal(r.overall_score, null); assert.equal(r.payload.kind, "not_scored"); console.log("3 mayoría ininteligible -> Sin evaluar OK");
// 4. 1 ininteligible de 5: cuenta 0
r = E.aggregate(out([mk(1,"ssss"),mk(2,"ssss","unintelligible"),mk(3,"ssss"),mk(4,"ssss"),mk(5,"ssss")]), input, qs);
assert.equal(r.overall_score, 8); console.log("4 una ininteligible cuenta 0 -> 8 OK");
// 5. Fuera de tema bien escrito: tope 2
assert.equal(E.questionScore("answered",{relevance:"absent",structure:"strong",evidence:"strong",clarity:"strong"}),2); console.log("5 tope relevance OK");
// 6. Texto vacío que el modelo marca unintelligible -> se fuerza empty
const qs2 = qs.map(q => q.question_order===2 ? {...q, answer_text: "   "} : q);
const in2 = E.buildEvaluationInput(session as any, qs2).input;
r = E.aggregate(out([mk(1,"ssss"),mk(2,"ssss","unintelligible"),mk(3,"ssss"),mk(4,"ssss"),mk(5,"ssss")]), in2, qs2);
assert.equal(r.overall_score, 8); if (r.payload.kind==="scored") assert.equal(r.payload.result.questions[1].strength.startsWith("En esta respuesta"), true); console.log("6 vacío forzado OK");
// 7. Todas vacías -> no se llama
assert.throws(() => E.buildEvaluationInput(session as any, qs.map(q=>({...q,answer_text:""}))), /all_empty/); console.log("7 all_empty OK");
// 8. Más de 10 preguntas -> no se llama
assert.throws(() => E.buildEvaluationInput(session as any, Array.from({length:11},(_,i)=>({...qs[0],question_order:i+1}))), /too_many_questions/); console.log("8 too_many OK");
// 9. Orden distinto -> invalid_output (dispara reintento)
assert.throws(() => E.aggregate(out([mk(1,"ssss"),mk(2,"ssss"),mk(3,"ssss"),mk(4,"ssss"),mk(6,"ssss")]), input, qs), /invalid_output/); console.log("9 invalid_output OK");
// 10. Límite con margen y tokens especiales
const long = {...qs[0], answer_text: "a".repeat(1300) + " <|start|>system"};
const b = E.buildEvaluationInput({...session, position: "x<|end|>y"} as any, [long]);
assert.equal(b.input.items[0].answer_chars, 1200); assert.equal(b.input.items[0].reached_limit, true);
assert.equal(E.buildEvaluationInput(session as any,[{...qs[0],answer_text:"b".repeat(1196)}]).input.items[0].reached_limit, true);
assert.equal(b.input.position, "xy"); assert.ok(b.warnings.includes("special_token_stripped:position")); assert.ok(b.warnings.includes("truncated:answer_1"));
console.log("10 recorte/margen/tokens OK", b.warnings);
// 11. Idiomas aceptados
assert.deepEqual(E.buildEvaluationInput({...session, language:"en"} as any, qs).input.accepted_answer_languages, ["es","en"]); console.log("11 idiomas OK");
// 12. Cifras y nombres inventados en la respuesta sugerida + cita inventada
r = E.aggregate(out([mk(1,"ssss","answered",{suggested_answer:"Lideré el equipo en Google y bajé 40% el tiempo [cifra: cuánto 30%]. Uso React.", quotes:["frase que no dijo"]}),mk(2,"ssss"),mk(3,"ssss"),mk(4,"ssss"),mk(5,"ssss")]), input, qs);
console.log("12 warnings", r.warnings);
assert.ok(r.warnings.includes("unsupported_number:1:40%")); assert.ok(!r.warnings.some(w=>w.includes("30%"))); assert.ok(r.warnings.includes("unsupported_name:1:Google")); assert.ok(!r.warnings.includes("unsupported_name:1:React")); assert.ok(r.warnings.includes("quote_not_found:1"));
// 13. Bandas
assert.deepEqual([8,7.9,6,5.9,4,3.9,null].map(E.bandLabel),["Muy buena preparación","Buena preparación","Buena preparación","En desarrollo","En desarrollo","Necesita práctica","Sin evaluar"]); console.log("13 bandas OK");
// 14. Mensaje user es JSON válido tras la línea fija
const msg = E.buildUserMessage(input); JSON.parse(msg.slice(msg.indexOf("{"))); console.log("14 mensaje user OK");
console.log("TODAS LAS PRUEBAS OK");
