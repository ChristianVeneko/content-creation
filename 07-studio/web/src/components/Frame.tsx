import type { CSSProperties, ReactNode } from "react";

/** A 9:16 vertical frame. Gradient colors come from template/spec data. */
export function Frame(props: {
  gradient?: string[];
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const colors = (props.gradient ?? []).filter((c) => /^#[0-9a-f]{3,8}$|^(rgb|hsl|oklch)\(/i.test(c));
  const style = (colors.length >= 2 ? { "--frame-bg": `linear-gradient(160deg, ${colors.join(", ")})` } : {}) as CSSProperties;
  return (
    <div className={`frame frame-${props.size ?? "md"} ${props.className ?? ""}`} style={style}>
      {props.children}
    </div>
  );
}
