import { useState } from "react";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("error");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }
  return (
    <button type="button" className="btn btn-quiet btn-sm" data-state={state} onClick={copy}>
      {state === "done" ? "Copiado" : state === "error" ? "No se pudo" : label}
    </button>
  );
}
