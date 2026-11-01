import { href, useRoute } from "./lib/route.ts";
import { ChannelView } from "./views/ChannelView.tsx";
import { ChannelWizard } from "./views/ChannelWizard.tsx";
import { Create } from "./views/Create.tsx";
import { JobView } from "./views/JobView.tsx";
import { Panel } from "./views/Panel.tsx";

export function App() {
  const route = useRoute();
  // Channel pages and videos belong to the panel; the creation flow to "Crear".
  const section = route.name === "create" ? "create" : "panel";
  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href={href({ name: "panel" })} aria-label="Estudio, ir al panel">
          <span className="wordmark-slot" aria-hidden="true" />
          Estudio
        </a>
        <nav className="pillnav" aria-label="Principal">
          <a href={href({ name: "panel" })} aria-current={section === "panel" ? "page" : undefined}>
            Panel
          </a>
          <a href={href({ name: "create" })} aria-current={section === "create" ? "page" : undefined}>
            Crear
          </a>
        </nav>
      </header>
      <main className="main">
        {route.name === "panel" && <Panel />}
        {route.name === "create" && <Create key={`${route.channel ?? ""}|${route.idea ?? ""}`} channel={route.channel} idea={route.idea} />}
        {route.name === "newChannel" && <ChannelWizard />}
        {route.name === "channel" && <ChannelView key={route.slug} slug={route.slug} />}
        {route.name === "job" && <JobView key={route.id} id={route.id} />}
      </main>
    </div>
  );
}
