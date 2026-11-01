import { useCallback, useEffect, useState } from "react";
import type { EngineLog, JobDetail, JobStatus, JobSummary } from "../../shared/types.ts";
import { JobMetaBar } from "../components/JobMetaBar.tsx";
import { api } from "../lib/api.ts";
import { href } from "../lib/route.ts";
import { IdeaView } from "./IdeaView.tsx";
import { RenderProgress } from "./RenderProgress.tsx";
import { Result } from "./Result.tsx";
import { Storyboard } from "./Storyboard.tsx";

export function JobView({ id }: { id: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.job(id).then(setJob).catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(reload, [reload]);

  // Live progress over SSE while rendering.
  useEffect(() => {
    if (job?.status !== "rendering") return;
    const es = new EventSource(api.eventsUrl(id));
    es.addEventListener("snapshot", (e) => setJob(JSON.parse((e as MessageEvent).data) as JobDetail));
    es.addEventListener("log", (e) => {
      const { log, progress } = JSON.parse((e as MessageEvent).data) as { log: EngineLog; progress: number };
      setJob((j) => (j ? { ...j, logs: [...j.logs, log], progress } : j));
    });
    es.addEventListener("status", (e) => {
      const { status } = JSON.parse((e as MessageEvent).data) as { status: JobStatus };
      if (status !== "rendering") {
        es.close();
        reload();
      }
    });
    es.onerror = () => {
      es.close();
      window.setTimeout(reload, 1500);
    };
    return () => es.close();
  }, [id, job?.status, reload]);

  if (error) {
    return (
      <div className="empty">
        <p className="h-section">No encontré este video.</p>
        <p className="muted">{error}</p>
        <a className="btn btn-quiet" href={href({ name: "panel" })}>
          Volver al panel
        </a>
      </div>
    );
  }
  if (!job) return <div className="loading-line" aria-busy="true" aria-label="Cargando" />;

  if (job.status === "rendering") {
    return (
      <RenderProgress
        job={job}
        onCancel={() => {
          void api.cancel(id).finally(reload);
        }}
      />
    );
  }
  const onMeta = (s: JobSummary) => setJob((j) => (j ? { ...j, ...s } : j));
  if (!job.spec && !job.hasVideo) return <IdeaView job={job} onChange={onMeta} />;
  const meta = <JobMetaBar job={job} onChange={onMeta} />;
  if (job.status === "done" && job.hasVideo) {
    return (
      <>
        {meta}
        <Result job={job} onReedit={() => setJob({ ...job, status: "draft" })} />
      </>
    );
  }
  return (
    <>
      {meta}
      <Storyboard
        job={job}
        onRendering={() => setJob({ ...job, status: "rendering", logs: [], progress: 0, error: undefined })}
      />
    </>
  );
}
