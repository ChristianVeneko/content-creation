// Create a channel in three steps: identity, audience and niche, voice. Used as the first-run onboarding on
// the panel and for every new channel.
import { useRef, useState, type FormEvent } from "react";
import { ChannelFields, type ChannelSection } from "../components/ChannelFields.tsx";
import { api } from "../lib/api.ts";
import { EMPTY_CHANNEL, channelInput, useChannelRefs, type ChannelDraft } from "../lib/channels.ts";
import { navigate } from "../lib/route.ts";

const STEPS: { title: string; sub: string; sections: ChannelSection[] }[] = [
  { title: "Identidad", sub: "Cómo se llama y dónde publicas.", sections: ["identity"] },
  { title: "Audiencia y nicho", sub: "De qué hablas y para quién. Con esto el agente elige ángulos y ejemplos.", sections: ["audience"] },
  { title: "Voz", sub: "Cómo suena el canal y qué usar por defecto en cada video. Puedes cambiarlo cuando quieras.", sections: ["voice", "defaults"] },
];

export function ChannelWizard(props: { firstRun?: boolean; onSkip?: () => void }) {
  const refs = useChannelRefs();
  const [draft, setDraft] = useState<ChannelDraft>(EMPTY_CHANNEL);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const last = step === STEPS.length - 1;

  function go(i: number) {
    setStep(i);
    setError(null);
    window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 0);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Ponle un nombre al canal.");
      go(0);
      return;
    }
    if (!last) return go(step + 1);
    setBusy(true);
    setError(null);
    try {
      const ch = await api.createChannel(channelInput(draft));
      navigate({ name: "channel", slug: ch.slug });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const s = STEPS[step];
  return (
    <div className="onboard">
      <header className="onboard-head">
        {props.firstRun ? (
          <>
            <p className="field-label">Bienvenida</p>
            <h1 className="h-page">Crea tu primer canal</h1>
            <p className="step-sub">
              Un canal agrupa tus videos e ideas y le da contexto al agente: tu nicho, tu audiencia y tu forma de hablar. Son tres pasos y menos de dos minutos.
            </p>
          </>
        ) : (
          <>
            <p className="field-label">Canales</p>
            <h1 className="h-page">Nuevo canal</h1>
          </>
        )}
      </header>

      <ol className="onboard-steps" aria-label="Pasos">
        {STEPS.map((x, i) => (
          <li key={x.title} aria-current={i === step ? "step" : undefined} data-done={i < step || undefined}>
            <button type="button" onClick={() => (i <= step || draft.name.trim() ? go(i) : undefined)} disabled={i > step && !draft.name.trim()}>
              <span className="onboard-num">{i + 1}</span>
              {x.title}
            </button>
          </li>
        ))}
      </ol>

      <form className="panel onboard-card" onSubmit={submit} noValidate>
        <header>
          <p className="step-count">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h2 className="h-section" ref={headingRef} tabIndex={-1}>
            {s.title}
          </h2>
          <p className="muted">{s.sub}</p>
        </header>
        {s.sections.map((sec) => (
          <ChannelFields key={sec} section={sec} draft={draft} onChange={setDraft} refs={refs} autoFocus={sec === "identity" || sec === "audience"} />
        ))}
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-quiet" onClick={() => go(step - 1)}>
              Atrás
            </button>
          ) : props.onSkip ? (
            <button type="button" className="btn btn-text" onClick={props.onSkip}>
              Ahora no
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary" data-state={busy ? "loading" : undefined} aria-disabled={busy}>
            {last ? (busy ? "Creando…" : "Crear canal") : "Siguiente"}
          </button>
        </div>
      </form>
    </div>
  );
}
