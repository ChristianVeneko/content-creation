// Small shared pieces for channels and content: avatar, stage chip/select, mini cover, idea form.
import { useId, useState, type FormEvent } from "react";
import type { ContentStage, JobSummary } from "../../shared/types.ts";
import { api } from "../lib/api.ts";
import { STAGES, STAGE_LABEL } from "../lib/channels.ts";

export function ChannelAvatar(props: { slug: string; name: string; hasAvatar?: boolean; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const initial = props.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={`avatar avatar-${props.size ?? "md"}`} aria-hidden="true">
      {props.hasAvatar && !failed ? <img src={api.avatarUrl(props.slug)} alt="" loading="lazy" onError={() => setFailed(true)} /> : initial}
    </span>
  );
}

export function StageChip({ stage }: { stage: ContentStage }) {
  return (
    <span className="stage-chip" data-stage={stage}>
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function StageSelect(props: { value: ContentStage; onChange: (s: ContentStage) => void; disabled?: boolean; label: string }) {
  return (
    <select className="input input-sm stage-select" data-stage={props.value} aria-label={props.label} value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value as ContentStage)}>
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

/** A small 9:16 cover: the render cover, else the template thumbnail, else the title initial. */
export function MiniCover({ job }: { job: Pick<JobSummary, "id" | "title" | "hasCover" | "template"> }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const src = job.hasCover ? api.fileUrl(job.id, "cover.jpg") : job.template && !thumbFailed ? api.thumbUrl(job.template, "jpg") : null;
  return (
    <span className="mini-cover" aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" onError={() => setThumbFailed(true)} /> : job.title.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Quick capture of an idea (title + notes) for a channel. */
export function IdeaForm(props: {
  channels: { slug: string; name: string }[];
  channel?: string;
  onCreated: (job: JobSummary) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState(props.channel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      props.onCreated(await api.createIdea({ title: title.trim(), notes: notes.trim() || undefined, channel: channel || undefined }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel idea-form" onSubmit={submit} aria-label="Nueva idea">
      <p className="h-section">Nueva idea</p>
      <label className="field" htmlFor={`${id}-title`}>
        <span className="field-label">Idea</span>
        <input id={`${id}-title`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="3 errores al preparar café en casa" autoFocus required maxLength={200} />
      </label>
      <label className="field" htmlFor={`${id}-notes`}>
        <span className="field-label">Notas (opcional)</span>
        <textarea id={`${id}-notes`} className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ángulo, gancho, datos que quieres usar…" />
      </label>
      {props.channels.length > 0 && (
        <label className="field" htmlFor={`${id}-channel`}>
          <span className="field-label">Canal</span>
          <select id={`${id}-channel`} className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">Sin canal</option>
            {props.channels.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-text" onClick={props.onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={!title.trim()} data-state={busy ? "loading" : undefined}>
          {busy ? "Guardando…" : "Guardar idea"}
        </button>
      </div>
    </form>
  );
}
