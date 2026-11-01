// One channel: its content grouped by stage (stage set with a select), the channel context editor
// (channel.json fields + voice.md) and delete.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ChannelDetail, ContentStage, JobSummary } from "../../shared/types.ts";
import { ChannelAvatar, IdeaForm, MiniCover, StageSelect } from "../components/ChannelBits.tsx";
import { ChannelFields } from "../components/ChannelFields.tsx";
import { api } from "../lib/api.ts";
import { PLATFORM_LABEL, STAGES, STAGE_HINT, STAGE_LABEL, channelInput, dateFmt, draftFromChannel, useChannelRefs, type ChannelDraft } from "../lib/channels.ts";
import { href, navigate } from "../lib/route.ts";

export function ChannelView({ slug }: { slug: string }) {
  const refs = useChannelRefs();
  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.channel(slug), api.jobs()])
      .then(([c, j]) => {
        setChannel(c);
        setDraft(draftFromChannel(c));
        setJobs(j.filter((x) => x.channel === slug));
      })
      .catch((e: Error) => setError(e.message));
  }, [slug]);
  useEffect(load, [load]);

  const columns = useMemo(() => {
    const by = { idea: [], draft: [], ready: [], published: [] } as Record<ContentStage, JobSummary[]>;
    for (const j of jobs ?? []) by[j.stage].push(j);
    return by;
  }, [jobs]);

  async function setStage(job: JobSummary, stage: ContentStage) {
    setRowError(null);
    setJobs((js) => js?.map((j) => (j.id === job.id ? { ...j, stage } : j)) ?? js);
    try {
      const next = await api.patchJob(job.id, { stage });
      setJobs((js) => js?.map((j) => (j.id === job.id ? next : j)) ?? js);
    } catch (e) {
      setRowError(`${job.title}: ${(e as Error).message}`);
      setJobs((js) => js?.map((j) => (j.id === job.id ? job : j)) ?? js);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || !channel) return;
    if (!draft.name.trim()) {
      setSaveError("El canal necesita un nombre.");
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      const next = await api.updateChannel(slug, channelInput(draft, channel.brand));
      setChannel(next);
      setDraft(draftFromChannel(next));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (err) {
      setSaveError((err as Error).message);
      setSaveState("idle");
    }
  }

  async function remove() {
    setDeleteError(null);
    try {
      await api.deleteChannel(slug);
      navigate({ name: "panel" });
    } catch (e) {
      setDeleteError((e as Error).message);
      setConfirmDelete(false);
    }
  }

  if (error) {
    return (
      <div className="empty">
        <p className="h-section">No encontré este canal.</p>
        <p className="muted">{error}</p>
        <a className="btn btn-quiet" href={href({ name: "panel" })}>
          Volver al panel
        </a>
      </div>
    );
  }
  if (!channel || !jobs || !draft) return <div className="loading-line" aria-busy="true" aria-label="Cargando" />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFromChannel(channel));

  return (
    <div className="channel-page">
      <nav className="crumbs" aria-label="Ruta">
        <a href={href({ name: "panel" })}>Panel</a> <span aria-hidden="true">/</span> <span>{channel.name}</span>
      </nav>
      <header className="channel-head">
        <ChannelAvatar slug={channel.slug} name={channel.name} hasAvatar={Boolean(channel.brand?.avatar)} size="lg" />
        <div className="channel-head-text">
          <h1 className="h-page">{channel.name}</h1>
          <p className="muted">
            {[channel.handle, channel.platforms.map((p) => PLATFORM_LABEL[p]).join(", "), channel.niche].filter(Boolean).join(" · ") || "Completa el contexto del canal abajo."}
          </p>
        </div>
        <div className="dash-actions">
          <button type="button" className="btn btn-quiet" onClick={() => setIdeaOpen(true)}>
            Nueva idea
          </button>
          <a className="btn btn-primary" href={href({ name: "create", channel: channel.slug })}>
            Nuevo video
          </a>
        </div>
      </header>

      {ideaOpen && (
        <IdeaForm
          channels={[channel]}
          channel={channel.slug}
          onCancel={() => setIdeaOpen(false)}
          onCreated={(job) => {
            setIdeaOpen(false);
            setJobs((js) => [job, ...(js ?? [])]);
          }}
        />
      )}

      <section className="dash-section" aria-labelledby="ch-content">
        <h2 className="h-section" id="ch-content">
          Contenido
        </h2>
        {rowError && (
          <div className="notice notice-error" role="alert">
            {rowError}
          </div>
        )}
        {jobs.length === 0 ? (
          <div className="channel-empty panel">
            <p>Este canal aún no tiene contenido. Guarda una idea para después o crea el primer video.</p>
            <a className="btn btn-quiet btn-sm" href={href({ name: "create", channel: channel.slug })}>
              Crear video
            </a>
          </div>
        ) : (
          <div className="board-cols">
            {STAGES.map((s) => (
              <section key={s} className="board-col" data-stage={s} aria-labelledby={`col-${s}`}>
                <header className="board-col-head">
                  <h3 id={`col-${s}`}>
                    {STAGE_LABEL[s]} <span className="chip-count">{columns[s].length}</span>
                  </h3>
                  <p className="muted">{STAGE_HINT[s]}</p>
                </header>
                {columns[s].length === 0 ? (
                  <p className="board-col-empty">Vacío</p>
                ) : (
                  <ul className="board-col-list">
                    {columns[s].map((j) => (
                      <li key={j.id} className="board-card">
                        <MiniCover job={j} />
                        <div className="board-card-text">
                          <a className="content-title" href={href({ name: "job", id: j.id })}>
                            {j.title}
                          </a>
                          <span className="content-meta">{dateFmt.format(new Date(j.publishedAt ?? j.createdAt))}</span>
                          <StageSelect value={j.stage} onChange={(st) => void setStage(j, st)} label={`Estado de ${j.title}`} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section" aria-labelledby="ch-context">
        <div className="section-row">
          <h2 className="h-section" id="ch-context">
            Contexto del canal
          </h2>
        </div>
        <p className="muted context-lede">El agente lee esto antes de escribir cada guion de este canal. Los valores por defecto se aplican al elegir el canal en Crear.</p>
        <form className="context-form" onSubmit={save}>
          <fieldset className="panel">
            <legend className="h-section">Identidad</legend>
            <ChannelFields section="identity" draft={draft} onChange={setDraft} refs={refs} />
          </fieldset>
          <fieldset className="panel">
            <legend className="h-section">Audiencia y nicho</legend>
            <ChannelFields section="audience" draft={draft} onChange={setDraft} refs={refs} />
          </fieldset>
          <fieldset className="panel">
            <legend className="h-section">Voz</legend>
            <ChannelFields section="voice" draft={draft} onChange={setDraft} refs={refs} />
          </fieldset>
          <fieldset className="panel">
            <legend className="h-section">Valores por defecto</legend>
            <ChannelFields section="defaults" draft={draft} onChange={setDraft} refs={refs} />
          </fieldset>
          <fieldset className="panel">
            <legend className="h-section">Marca</legend>
            <ChannelFields section="brand" draft={draft} onChange={setDraft} refs={refs} />
          </fieldset>
          <div className="context-save">
            {saveError && (
              <div className="notice notice-error" role="alert">
                {saveError}
              </div>
            )}
            <span className="muted" aria-live="polite">
              {saveState === "saved" ? "Guardado." : dirty ? "Hay cambios sin guardar." : `Archivos: 08-channels/${channel.slug}/channel.json y voice.md`}
            </span>
            <button type="submit" className="btn btn-primary" disabled={!dirty || saveState === "saving"} data-state={saveState === "saving" ? "loading" : undefined}>
              {saveState === "saving" ? "Guardando…" : "Guardar contexto"}
            </button>
          </div>
        </form>
      </section>

      <section className="dash-section danger" aria-labelledby="ch-danger">
        <h2 className="h-section" id="ch-danger">
          Eliminar canal
        </h2>
        <p className="muted">
          Borra la carpeta del canal. Los videos no se borran nunca; si el canal tiene contenido, primero muévelo a otro canal o quítale el canal.
        </p>
        {deleteError && (
          <div className="notice notice-error" role="alert">
            {deleteError}
          </div>
        )}
        {confirmDelete ? (
          <div className="form-actions form-actions-start">
            <button type="button" className="btn btn-danger" onClick={() => void remove()}>
              Sí, eliminar {channel.name}
            </button>
            <button type="button" className="btn btn-text" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(true)} disabled={jobs.length > 0} aria-describedby={jobs.length > 0 ? "ch-delete-why" : undefined}>
            Eliminar canal
          </button>
        )}
        {jobs.length > 0 && !confirmDelete && (
          <p className="field-note" id="ch-delete-why">
            Tiene {jobs.length} {jobs.length === 1 ? "pieza" : "piezas"}.
          </p>
        )}
      </section>
    </div>
  );
}
