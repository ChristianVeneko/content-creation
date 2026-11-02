// Wizard progress rail: every step is a button, so the rail doubles as non-linear navigation.
export interface RailStep {
  id: string;
  label: string;
  hint: string;
  /** One line saying what to do in this step. */
  helper?: string;
  done: boolean;
}

export function StepRail(props: { steps: RailStep[]; current: number; onGo: (i: number) => void }) {
  const pct = ((props.current + 1) / props.steps.length) * 100;
  return (
    <nav className="rail" aria-label="Pasos">
      <p className="rail-compact" aria-hidden="true">
        Paso {props.current + 1} de {props.steps.length} · {props.steps[props.current].label}
        {props.steps[props.current].helper ? ` — ${props.steps[props.current].helper}` : ""}
      </p>
      <span className="rail-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </span>
      <ol className="rail-list">
        {props.steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className="rail-step"
              aria-current={i === props.current ? "step" : undefined}
              title={s.helper}
              data-done={s.done && i !== props.current}
              onClick={() => props.onGo(i)}
            >
              <span className="rail-num" aria-hidden="true">
                {s.done && i !== props.current ? (
                  <svg viewBox="0 0 16 16" width="11" height="11">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="rail-text">
                <span className="rail-label">{s.label}</span>
                <span className="rail-hint">{s.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
