import { useEffect, useState } from "react";

export type Route =
  | { name: "panel" }
  | { name: "create"; channel?: string; idea?: string }
  | { name: "channel"; slug: string }
  | { name: "newChannel" }
  | { name: "job"; id: string };

export function parseHash(hash: string): Route {
  const [pathPart, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const parts = pathPart.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  const params = new URLSearchParams(query);
  if (parts[0] === "crear") {
    return { name: "create", channel: params.get("canal") || undefined, idea: params.get("idea") || undefined };
  }
  if (parts[0] === "canales" && parts[1] === "nuevo") return { name: "newChannel" };
  if (parts[0] === "canal" && parts[1]) return { name: "channel", slug: parts[1] };
  if (parts[0] === "video" && parts[1]) return { name: "job", id: parts[1] };
  // "#/historial" (old link) and anything unknown land on the panel, which lists all content.
  return { name: "panel" };
}

export function href(route: Route): string {
  switch (route.name) {
    case "create": {
      const q = new URLSearchParams();
      if (route.channel) q.set("canal", route.channel);
      if (route.idea) q.set("idea", route.idea);
      const qs = q.toString();
      return `#/crear${qs ? `?${qs}` : ""}`;
    }
    case "newChannel":
      return "#/canales/nuevo";
    case "channel":
      return `#/canal/${encodeURIComponent(route.slug)}`;
    case "job":
      return `#/video/${encodeURIComponent(route.id)}`;
    default:
      return "#/";
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function safeStorage() {
  return {
    get(key: string): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage unavailable: ignore
      }
    },
  };
}
