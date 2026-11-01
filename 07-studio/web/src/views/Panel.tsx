// Panel (home): channels with their content counts, the recent content across channels with filters,
// and quick actions. With no channels yet it opens the first-run channel wizard.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChannelSummary, ContentStage, JobSummary } from "../../shared/types.ts";
import { ChannelAvatar, IdeaForm, MiniCover, StageChip } from "../components/ChannelBits.tsx";
import { api } from "../lib/api.ts";
import { STAGES, STAGE_LABEL, dateFmt } from "../lib/channels.ts";
import { href, safeStorage } from "../lib/route.ts";
import { ChannelWizard } from "./ChannelWizard.tsx";

const SKIP_ONBOARDING_KEY = "studio.onboarding.skipped";
const PAGE = 24;
const NO_CHANNEL = "__none";

export function Panel() {
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(() => safeStorage().get(SKIP_ONBOARDING_KEY) === "1");
  const [ideaFor, setIdeaFor] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<ContentStage | "">("");
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.channels(), api.jobs()])
      .then(([c, j]) => {
        setChannels(c);
        setJobs(j);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const byChannel = useMemo(() => new Map((channels ?? []).map((c) => [c.slug, c])), [channels]);
  const inChannel = useMemo(
    () => (jobs ?? []).filter((j) => !channelFilter || (channelFilter === NO_CHANNEL ? !j.channel || !byChannel.has(j.channel) : j.channel === channelFilter)),
    [jobs, channelFilter, byChannel],
  );
  const filtered = useMemo(() => inChannel.filter((j) => !stageFilter || j.stage === stageFilter), [inChannel, stageFilter]);
  const stageCounts = useMemo(() => {
    const counts = { idea: 0, draft: 0, ready: 0, published: 0 } as Record<ContentStage, number>;
    for (const j of inChannel) counts[j.stage]++;
    return counts;
  }, [inChannel]);
  const published = (jobs ?? []).filter((j) => j.stage === "published").length;

  if (error) {
    return (
      <div className="empty">
        <p className="h-section">No pude cargar el panel.</p>
        <p className="muted">{error}</p>
        <button type="button" className="btn btn-quiet" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!channels || !jobs) return <div className="loading-line" aria-busy="true" aria-label="Cargando" />;

  if (channels.length === 0 && !skipped) {
    return (
      <ChannelWizard
        firstRun
        onSkip={() => {
          safeStorage().set(SKIP_ONBOARDING_KEY, "1");
          setSkipped(true);
        }}
      />
    );
  }

  const ideaForm = ideaFor !== null && (
    <IdeaForm
      channels={channels}
      channel={ideaFor || undefined}
      onCancel={() => setIdeaFor(null)}
      onCreated={(job) => {
        setIdeaFor(null);
        setJobs((js) => [job, ...(js ?? [])]);
        load();
      }}
    />
  );

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <h1 className="h-page">Panel</h1>
          <p className="muted">
            {jobs.length === 0 ? "Todavía no hay contenido." : `${jobs.length} ${jobs.length === 1 ? "pieza" : "piezas"} · ${published} ${published === 1 ? "publicada" : "publicadas"}`}
          </p>
        </div>
        <div className="dash-actions">
          <button type="button" className="btn btn-quiet" onClick={() => setIdeaFor("")}>
            Nueva idea
          </button>
          <a className="btn btn-primary" href={href({ name: "create" })}>
            Nuevo video
          </a>
        </div>
      </header>

      {ideaFor === "" && ideaForm}

      <section className="dash-section" aria-labelledby="dash-channels">
        <div className="section-row">
          <h2 className="h-section" id="dash-channels">
            Canales
          </h2>
          <a className="btn btn-text btn-sm" href={href({ name: "newChannel" })}>
            Nuevo canal
          </a>
        </div>
        {channels.length === 0 ? (
          <div className="channel-empty panel">
            <p>Organiza tus videos por canal y dale contexto al agente.</p>
            <a className="btn btn-quiet btn-sm" href={href({ name: "newChannel" })}>
              Crear canal
            </a>
          </div>
        ) : (
          <ul className="channel-grid">
            {channels.map((c) => (
              <li key={c.slug} className="channel-card">
                <a className="channel-card-main" href={href({ name: "channel", slug: c.slug })}>
                  <ChannelAvatar slug={c.slug} name={c.name} hasAvatar={c.hasAvatar} size="lg" />
                  <span className="channel-card-text">
                    <span className="channel-name">{c.name}</span>
                    <span className="muted">{c.handle ?? c.niche ?? `${c.total} piezas`}</span>
                  </span>
                  {c.lastCover && (
                    <span className="channel-cover" aria-hidden="true">
                      <img src={api.fileUrl(c.lastCover.id, "cover.jpg")} alt="" loading="lazy" />
                    </span>
                  )}
                </a>
                <dl className="stage-counts">
                  {STAGES.map((s) => (
                    <div key={s} data-stage={s} data-zero={c.counts[s] === 0 || undefined}>
                      <dt>{STAGE_LABEL[s]}</dt>
                      <dd>{c.counts[s]}</dd>
                    </div>
                  ))}
                </dl>
                <div className="channel-card-actions">
                  <a className="btn btn-quiet btn-sm" href={href({ name: "create", channel: c.slug })}>
                    Nuevo video
                  </a>
                  <button type="button" className="btn btn-text btn-sm" onClick={() => setIdeaFor(c.slug)} aria-label={`Nueva idea para ${c.name}`}>
                    Idea
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {ideaFor && ideaForm}
      </section>

      <section className="dash-section" aria-labelledby="dash-content">
        <div className="section-row">
          <h2 className="h-section" id="dash-content">
            Contenido reciente
          </h2>
          {channels.length > 0 && (
            <select className="input input-sm" aria-label="Filtrar por canal" value={channelFilter} onChange={(e) => (setChannelFilter(e.target.value), setLimit(PAGE))}>
              <option value="">Todos los canales</option>
              {channels.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
              <option value={NO_CHANNEL}>Sin canal</option>
            </select>
          )}
        </div>
        <div className="chips" role="group" aria-label="Filtrar por estado">
          <button type="button" className="chip" aria-pressed={stageFilter === ""} onClick={() => setStageFilter("")}>
            Todo
          </button>
          {STAGES.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={stageFilter === s} onClick={() => (setStageFilter(stageFilter === s ? "" : s), setLimit(PAGE))}>
              {STAGE_LABEL[s]} <span className="chip-count">{stageCounts[s]}</span>
            </button>
          ))}
        </div>

        {jobs.length === 0 ? (
          <div className="empty">
            <p className="empty-lede">Escribe una idea, elige un estilo y en unos minutos tienes un vertical listo para publicar.</p>
            <a className="btn btn-primary" href={href({ name: "create" })}>
              Crear el primero
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted content-none">Nada con estos filtros.</p>
        ) : (
          <ul className="content-list">
            {filtered.slice(0, limit).map((j) => {
              const ch = j.channel ? byChannel.get(j.channel) : undefined;
              return (
                <li key={j.id}>
                  <a className="content-row" href={href({ name: "job", id: j.id })}>
                    <MiniCover job={j} />
                    <span className="content-text">
                      <span className="content-title">{j.title}</span>
                      <span className="content-meta">
                        {ch ? ch.name : "Sin canal"} · {dateFmt.format(new Date(j.createdAt))}
                        {j.status === "rendering" ? " · renderizando" : j.status === "failed" && j.stage !== "idea" ? " · el último render falló" : ""}
                      </span>
                    </span>
                    <StageChip stage={j.stage} />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > limit && (
          <button type="button" className="btn btn-quiet" onClick={() => setLimit((l) => l + PAGE)}>
            Ver más ({filtered.length - limit})
          </button>
        )}
      </section>
    </div>
  );
}
