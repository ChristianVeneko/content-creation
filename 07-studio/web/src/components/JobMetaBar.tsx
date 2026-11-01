// Channel, stage and published links of one video, editable in place (PATCH /api/jobs/:id).
import { useEffect, useId, useState } from "react";
import type { ChannelSummary, ContentStage, JobDetail, JobPatch, JobSummary } from "../../shared/types.ts";
import { api } from "../lib/api.ts";
import { href } from "../lib/route.ts";
import { StageSelect } from "./ChannelBits.tsx";

export function JobMetaBar({ job, onChange }: { job: JobDetail; onChange: (s: JobSummary) => void }) {
  const id = useId();
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);
  const [links, setLinks] = useState((job.links ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.channels().then(setChannels, () => setChannels([]));
  }, []);
  useEffect(() => setLinks((job.links ?? []).join("\n")), [job.links]);

  async function patch(p: JobPatch) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api.patchJob(job.id, p));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const linkList = links.split(/\s+/).map((l) => l.trim()).filter(Boolean);
  const linksDirty = linkList.join("\n") !== (job.links ?? []).join("\n");
  const known = channels?.some((c) => c.slug === job.channel);

  return (
    <div className="meta-bar" aria-label="Organización">
      <label className="meta-field" htmlFor={`${id}-ch`}>
        <span className="field-label">Canal</span>
        <select id={`${id}-ch`} className="input input-sm" value={job.channel ?? ""} disabled={busy || !channels} onChange={(e) => void patch({ channel: e.target.value || null })}>
          <option value="">Sin canal</option>
          {job.channel && channels && !known && <option value={job.channel}>{job.channel} (no existe)</option>}
          {channels?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="meta-field" htmlFor={`${id}-st`}>
        <span className="field-label">Estado</span>
        <StageSelect value={job.stage} onChange={(s: ContentStage) => void patch({ stage: s })} disabled={busy} label="Estado del contenido" />
      </label>
      {job.channel && known && (
        <a className="btn btn-text btn-sm meta-link" href={href({ name: "channel", slug: job.channel })}>
          Ver canal
        </a>
      )}
      {job.stage === "published" && (
        <div className="meta-links">
          <label className="field-label" htmlFor={`${id}-links`}>
            Enlaces publicados{job.publishedAt ? ` · ${new Date(job.publishedAt).toLocaleDateString("es")}` : ""}
          </label>
          <div className="meta-links-row">
            <textarea id={`${id}-links`} className="input input-sm" rows={1} value={links} placeholder="https://www.tiktok.com/@tu-canal/video/…" onChange={(e) => setLinks(e.target.value)} />
            <button type="button" className="btn btn-quiet btn-sm" disabled={!linksDirty || busy} onClick={() => void patch({ links: linkList })}>
              Guardar
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="notice notice-error meta-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
