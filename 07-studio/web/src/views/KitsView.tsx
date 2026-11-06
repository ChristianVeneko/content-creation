// "Motores": every way the studio can make a video. The web engine's formats are made here ("Crear");
// the kits in 05-tools/ are driven by the /video skill in Claude Code, so each card copies the request to type.
// Opening opuscar shows its film styles as a gallery of real frames, grouped like the Spanish catalog.
import { useEffect, useId, useMemo, useState } from "react";
import type { KitInfo, KitStyle } from "../../shared/types.ts";
import { CopyButton } from "../components/CopyButton.tsx";
import { api } from "../lib/api.ts";
import { EFFORT_LABEL, groupStyles, matchesStyle, styleRequest } from "../lib/kits.ts";
import { href } from "../lib/route.ts";

export function KitsView({ kit }: { kit?: string }) {
  const [kits, setKits] = useState<KitInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .kits()
      .then(setKits)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="empty">
        <p className="h-section">No pude cargar los motores.</p>
        <p className="muted">{error}</p>
      </div>
    );
  }
  if (!kits) return <div className="loading-line" aria-busy="true" aria-label="Cargando" />;

  const opuscar = kits.find((k) => k.id === "opuscar");
  if (kit === "opuscar" && opuscar?.available) return <StyleGallery kit={opuscar} />;

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <h1 className="h-page">Motores</h1>
          <p className="muted">Cada motor hace un tipo de video distinto. Las plantillas se crean aquí; los demás se piden a /video en Claude Code.</p>
        </div>
        <div className="dash-actions">
          <a className="btn btn-primary" href={href({ name: "create" })}>
            Nuevo video
          </a>
        </div>
      </header>
      <ul className="kit-grid">
        {kits.map((k) => (
          <KitCard key={k.id} kit={k} />
        ))}
      </ul>
    </div>
  );
}

function KitCard({ kit }: { kit: KitInfo }) {
  return (
    <li className="kit-card" data-available={kit.available ? undefined : "no"}>
      <div className="kit-card-head">
        <h2 className="kit-name">{kit.name}</h2>
        <span className="kit-length">{kit.length}</span>
      </div>
      <p className="kit-look">{kit.look}</p>
      <dl className="kit-facts">
        <div>
          <dt>Ideal para</dt>
          <dd>{kit.bestFor}</dd>
        </div>
        <div>
          <dt>Render</dt>
          <dd>{kit.renderTime}</dd>
        </div>
      </dl>
      <div className="kit-tags">
        {kit.researched && <span className="kit-tag">Investiga y cita fuentes</span>}
        {kit.styles ? <span className="kit-tag">{kit.styles} estilos</span> : null}
        {!kit.available && <span className="kit-tag kit-tag-warn">No instalado</span>}
      </div>
      <div className="kit-actions">
        {kit.id === "engine" ? (
          <a className="btn btn-quiet btn-sm" href={href({ name: "create" })}>
            Ver formatos
          </a>
        ) : (
          <>
            <code className="kit-ask">{kit.ask}</code>
            <CopyButton text={kit.ask} label="Copiar pedido" />
          </>
        )}
        {kit.id === "opuscar" && kit.available && (
          <a className="btn btn-text btn-sm" href={href({ name: "kits", kit: "opuscar" })}>
            Ver los estilos
          </a>
        )}
      </div>
    </li>
  );
}

function StyleGallery({ kit }: { kit: KitInfo }) {
  const [styles, setStyles] = useState<KitStyle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
  const searchId = useId();

  useEffect(() => {
    api
      .opuscarStyles()
      .then(setStyles)
      .catch((e: Error) => setError(e.message));
  }, []);

  const groups = useMemo(() => groupStyles(styles ?? []), [styles]);
  const sections = useMemo(
    () => groups.filter((g) => !group || g.group === group).map((g) => ({ ...g, items: g.items.filter((s) => matchesStyle(s, query)) })).filter((g) => g.items.length > 0),
    [groups, group, query],
  );

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <a className="btn btn-text btn-sm kit-back" href={href({ name: "kits" })}>
            ← Motores
          </a>
          <h1 className="h-page">{kit.name}</h1>
          <p className="muted">{kit.look}</p>
        </div>
      </header>
      {error && <p className="muted">No pude cargar los estilos: {error}</p>}
      {!styles && !error && <div className="loading-line" aria-busy="true" aria-label="Cargando" />}
      {styles && (
        <>
          <div className="gallery-tools">
            <div className="gallery-filters" role="group" aria-label="Filtrar por grupo">
              <button type="button" className="gfilter" aria-pressed={group === ""} onClick={() => setGroup("")}>
                Todos<span className="gfilter-count">{styles.length}</span>
              </button>
              {groups.map((g) => (
                <button key={g.group} type="button" className="gfilter" aria-pressed={group === g.group} onClick={() => setGroup(g.group)}>
                  {g.group.replace(/\s*\(.*\)$/, "")}
                  <span className="gfilter-count">{g.items.length}</span>
                </button>
              ))}
            </div>
            <label className="gallery-search" htmlFor={searchId}>
              <span className="visually-hidden">Buscar estilo</span>
              <input id={searchId} type="search" placeholder="Buscar: tiza, terror, mapa, anime…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          {sections.length === 0 ? (
            <p className="muted">Ningún estilo coincide{query ? ` con “${query}”` : ""}.</p>
          ) : (
            sections.map((g) => (
              <section key={g.group} className="dash-section" aria-label={g.group}>
                <h2 className="h-section">{g.group}</h2>
                <ul className="style-grid">
                  {g.items.map((s) => (
                    <StyleCard key={s.slug} style={s} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

function StyleCard({ style }: { style: KitStyle }) {
  return (
    <li className="style-card">
      <div className="style-frame">
        {style.still ? <img src={api.opuscarStillUrl(style.slug)} alt={`Fotograma del estilo ${style.name}`} loading="lazy" decoding="async" /> : <span className="muted">Sin fotograma</span>}
      </div>
      <div className="style-body">
        <div className="kit-card-head">
          <h3 className="style-name">{style.name}</h3>
          {style.effort && <span className="kit-length" title={EFFORT_LABEL[style.effort]}>{EFFORT_LABEL[style.effort] ?? style.effort}</span>}
        </div>
        <p className="style-does">{style.does}</p>
        <div className="kit-actions">
          <code className="kit-ask">{style.slug}</code>
          <CopyButton text={styleRequest(style)} label="Copiar pedido" />
        </div>
      </div>
    </li>
  );
}
