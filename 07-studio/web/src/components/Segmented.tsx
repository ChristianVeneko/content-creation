import { useId } from "react";

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="field">
      <legend className="field-label">{props.label}</legend>
      <div className="segmented" role="radiogroup">
        {props.options.map((o) => (
          <label key={String(o.value)} className="segmented-item">
            <input
              type="radio"
              name={name}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
