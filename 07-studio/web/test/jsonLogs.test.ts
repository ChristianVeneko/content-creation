import assert from "node:assert/strict";
import { test } from "node:test";
import { JsonLogStream, parseLogLine, type LogLine } from "../server/jsonLogs.ts";

test("parses a JSON progress line", () => {
  assert.deepEqual(parseLogLine('{"step":"tts","status":"start","message":"Voz…","progress":0.25}'), {
    kind: "log",
    log: { step: "tts", status: "start", message: "Voz…", progress: 0.25 },
  });
});

test("normalizes 0..100 progress to 0..1 and clamps", () => {
  const a = parseLogLine('{"step":"render","status":"progress","progress":40}');
  assert.equal(a?.kind === "log" && a.log.progress, 0.4);
  const b = parseLogLine('{"step":"render","status":"progress","progress":250}');
  assert.equal(b?.kind === "log" && b.log.progress, 1);
});

test("non-JSON and JSON without step become text; blank lines are skipped", () => {
  assert.deepEqual(parseLogLine("Rendering frame 10/900"), { kind: "text", text: "Rendering frame 10/900" });
  assert.deepEqual(parseLogLine('{"foo":1}'), { kind: "text", text: '{"foo":1}' });
  assert.equal(parseLogLine("   "), null);
});

test("stream handles chunks split mid-line and flushes the tail on end()", () => {
  const lines: LogLine[] = [];
  const s = new JsonLogStream((l) => lines.push(l));
  s.push('{"step":"tts","sta');
  s.push('tus":"done"}\nplain text\r\n{"step":"rend');
  assert.equal(lines.length, 2);
  s.push('er","status":"done","progress":1}');
  assert.equal(lines.length, 2, "incomplete trailing line waits for newline or end()");
  s.end();
  assert.deepEqual(lines, [
    { kind: "log", log: { step: "tts", status: "done" } },
    { kind: "text", text: "plain text" },
    { kind: "log", log: { step: "render", status: "done", progress: 1 } },
  ]);
});
