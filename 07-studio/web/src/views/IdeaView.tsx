// An idea: a saved title + notes with no script yet. From here the user edits it or turns it into a script.
import { useEffect, useId, useState } from "react";
import type { JobDetail, JobSummary } from "../../shared/types.ts";
import { JobMetaBar } from "../components/JobMetaBar.tsx";
import { api } from "../lib/api.ts";
import { href, navigate } from "../lib/route.ts";

export function IdeaView({ job, onChange }: { job: JobDetail; onChange: (s: JobSummary) => void }) {
  const id = useId();
  const [title, setTitle] = useState(job.title);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setTitle(job.title);
    setNotes(job.notes ?? "");
  }, [job.title, job.notes]);

  const dirty = title.trim() !== job.title || notes.trim() !== (job.notes ?? "");

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    if (!title.trim()) {
      setError("La idea necesita un título.");
      return false;
    }
    setState("saving");
    setError(null);
    try {
      onChange(await api.patchJob(job.id, { title: title.trim(), notes: notes.trim() }));
      setState("saved");
      window.setTimeout(() => setState("idle"), 1500);
      return true;
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
      return false;
    }
  }

  return (
    <div className="idea-page">
      <JobMetaBar job={job} onChange={onChange} />
      <div className="panel idea-card">
        <p className="field-label">Idea guardada · sin guion todavía</p>
        <label className="visually-hidden" htmlFor={`${id}-title`}>
          Título de la idea
        </label>
        <textarea id={`${id}-title`} className="title-input" rows={1} value={title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))} maxLength={200} />
        <label className="field" htmlFor={`${id}-notes`}>
          <span className="field-label">Notas</span>
          <textarea id={`${id}-notes`} className="input" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ángulo, gancho, datos, referencias…" />
        </label>
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-quiet" onClick={() => void save()} disabled={!dirty || state === "saving"}>
            {state === "saving" ? "Guardando…" : state === "saved" ? "Guardado" : "Guardar"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void save().then((ok) => ok && navigate({ name: "create", idea: job.id, channel: job.channel }))}
          >
            Generar guion
          </button>
        </div>
        <p className="muted">Generar guion abre Crear con esta idea y su canal. El guion se guarda en esta misma carpeta.</p>
      </div>
      <a className="btn btn-text btn-sm" href={href({ name: "panel" })}>
        Volver al panel
      </a>
    </div>
  );
}
