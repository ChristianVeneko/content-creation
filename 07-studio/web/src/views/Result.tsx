import { useState } from "react";
import type { JobDetail } from "../../shared/types.ts";
import { CopyButton } from "../components/CopyButton.tsx";
import { Frame } from "../components/Frame.tsx";
import { api } from "../lib/api.ts";

export function Result({ job, onReedit }: { job: JobDetail; onReedit: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const post = job.spec?.post;
  const tags = post?.hashtags?.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") ?? "";
  // Platform copy often already carries its hashtags; only append when it has none.
  const withTags = (text: string) => (tags && !/#\p{L}/u.test(text) ? `${text}\n\n${tags}` : text);

  const copies = post
    ? [
        { key: "tiktok", name: "TikTok", text: withTags(post.tiktok) },
        { key: "instagram", name: "Instagram", text: withTags(post.instagram) },
        { key: "youtube", name: "YouTube Shorts", title: post.youtube?.title, text: withTags(post.youtube?.description ?? "") },
      ]
    : [];

  return (
    <div className="result">
      <figure className="result-player">
        {videoError ? (
          <Frame size="lg" gradient={job.spec?.theme?.palette?.bg}>
            <p className="player-missing">No pude reproducir el video aquí. Descárgalo o abre la carpeta.</p>
          </Frame>
        ) : (
          <video
            className="frame frame-lg player"
            src={api.fileUrl(job.id, "video.mp4")}
            poster={job.hasCover ? api.fileUrl(job.id, "cover.jpg") : undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setVideoError(true)}
          />
        )}
      </figure>

      <div className="result-side">
        <p className="field-label">Listo para publicar</p>
        <h1 className="h-page">{job.title}</h1>
        <div className="result-actions">
          <a className="btn btn-primary" href={api.fileUrl(job.id, "video.mp4", true)} download>
            {job.hasVideoNoSubs ? (job.spec?.captions?.enabled === false ? "Descargar MP4 (sin subtítulos)" : "Descargar MP4 (con subtítulos)") : "Descargar MP4"}
          </a>
          {job.hasVideoNoSubs && (
            <a className="btn btn-quiet" href={api.fileUrl(job.id, "video-sin-subtitulos.mp4", true)} download>
              MP4 sin subtítulos
            </a>
          )}
          {job.hasCover && (
            <a className="btn btn-quiet" href={api.fileUrl(job.id, "cover.jpg", true)} download>
              Portada
            </a>
          )}
          <button type="button" className="btn btn-text" onClick={onReedit}>
            Editar y volver a renderizar
          </button>
        </div>

        <div className="folder">
          <code className="folder-path">{job.dir}</code>
          <div className="folder-actions">
            <CopyButton text={job.dir} label="Copiar ruta" />
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => void api.reveal(job.id).then(() => setRevealed(true))}
            >
              {revealed ? "Abierta en Finder" : "Abrir carpeta"}
            </button>
          </div>
        </div>

        {copies.length > 0 ? (
          <div className="copies">
            {copies.map((c) => (
              <article key={c.key} className="copy">
                <header className="copy-head">
                  <h2 className="copy-name">{c.name}</h2>
                  <CopyButton text={c.title ? `${c.title}\n\n${c.text}` : c.text} />
                </header>
                {c.title && <p className="copy-title">{c.title}</p>}
                <p className="copy-text">{c.text}</p>
              </article>
            ))}
          </div>
        ) : job.postMarkdown ? (
          <article className="copy">
            <header className="copy-head">
              <h2 className="copy-name">Texto del post</h2>
              <CopyButton text={job.postMarkdown} />
            </header>
            <pre className="copy-text">{job.postMarkdown}</pre>
          </article>
        ) : null}
      </div>
    </div>
  );
}
