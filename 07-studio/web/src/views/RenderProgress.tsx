import type { EngineLog, JobDetail } from "../../shared/types.ts";
import { Frame } from "../components/Frame.tsx";

const STEP_LABEL: Record<string, string> = {
  tts: "Voz",
  voice: "Voz",
  audio: "Audio",
  captions: "Subtítulos",
  transcribe: "Subtítulos",
  render: "Render",
  cover: "Portada",
  post: "Textos para redes",
};

/** Collapse the log into one row per step, keeping the latest status. */
function steps(logs: EngineLog[]): { step: string; status: string; message?: string }[] {
  const map = new Map<string, { step: string; status: string; message?: string }>();
  for (const l of logs) map.set(l.step, { step: l.step, status: l.status, message: l.message ?? map.get(l.step)?.message });
  return [...map.values()];
}

export function RenderProgress({ job, onCancel }: { job: JobDetail; onCancel: () => void }) {
  const pct = Math.round((job.progress ?? 0) * 100);
  const rows = steps(job.logs);
  const current = rows.at(-1);
  return (
    <div className="render">
      <Frame size="lg" gradient={job.spec?.theme?.palette?.bg} className="render-frame">
        <span className="render-fill" style={{ transform: `scaleY(${Math.max(0.02, job.progress ?? 0)})` }} aria-hidden="true" />
        <span className="render-pct" aria-hidden="true">
          {pct}
          <small>%</small>
        </span>
      </Frame>
      <div className="render-side">
        <p className="field-label">Renderizando</p>
        <h1 className="h-page">{job.title}</h1>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso">
          <span style={{ transform: `scaleX(${job.progress ?? 0})` }} />
        </div>
        <p className="muted" aria-live="polite">
          {current?.message ?? "Preparando el motor…"}
        </p>
        <ol className="steps">
          {rows.map((r) => (
            <li key={r.step} data-status={r.status}>
              <span className="step-mark" aria-hidden="true" />
              <span className="step-name">{STEP_LABEL[r.step] ?? r.step}</span>
              <span className="step-status">{r.status === "done" ? "listo" : r.status === "error" ? "error" : "en curso"}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-text" onClick={onCancel}>
          Cancelar render
        </button>
      </div>
    </div>
  );
}
