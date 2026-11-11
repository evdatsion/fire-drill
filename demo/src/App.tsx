import { useState } from "react";
import { cases, familyStats, gradeColor, summary } from "./data.js";

const BANNER = "Simulation on synthetic data";

function Banner(): React.JSX.Element {
  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">
      <span className="font-semibold">{BANNER}</span> — this page replays bench/results.json from the reference
      simulator. Nothing here ran on a NAS.
    </div>
  );
}

function Header(): React.JSX.Element {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fire Drill</h1>
            <p className="mt-1 text-gray-600">
              A restore drill for UGREEN AI NAS: it finds the photos that exist only once, catches backups that
              silently stopped, and grades every source folder A to F.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              Drill Pack {summary.score}/{summary.total}
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              {summary.healthyFlagged} healthy folders flagged
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero(): React.JSX.Element {
  const photos = ["family-1", "family-2", "family-3"];
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((name) => (
          <img
            key={name}
            src={`${import.meta.env.BASE_URL}photos/${name}.jpg`}
            alt={`Stock family photo placeholder (${BANNER.toLowerCase()})`}
            className="h-44 w-full rounded-lg object-cover"
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Stock photos (Pexels licence, see CREDITS.md) stand in for the irreplaceable sets the drill finds. All
        findings on this page are synthetic.
      </p>
    </section>
  );
}

function Families(props: { onSelectFamily: (family: string) => void }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Drill Pack results by family</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {familyStats.map((family) => (
          <button
            key={family.key}
            type="button"
            onClick={() => props.onSelectFamily(family.key)}
            className="rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900">{family.label}</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">
              {family.matched}/{family.total}
            </div>
            <div className="text-sm text-gray-500">cases scored as expected</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CaseList(props: { family: string; onSelectCase: (id: string) => void; onBack: () => void }): React.JSX.Element {
  const inFamily = cases.filter((item) => item.family === props.family);
  return (
    <section className="mx-auto max-w-5xl px-4 pb-8">
      <button type="button" onClick={props.onBack} className="mb-4 text-sm text-blue-700 hover:underline">
        All families
      </button>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">{inFamily[0] ? inFamily.length : 0} cases</h2>
      <ul className="space-y-2">
        {inFamily.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => props.onSelectCase(item.id)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-400"
            >
              <span>
                <span className="font-semibold text-gray-900">{item.name}</span>
                <span className="ml-2 text-sm text-gray-500">{item.id}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-sm font-semibold ${gradeColor(item.actual.grade)}`}>
                  {item.actual.grade ?? item.actual.verdict ?? "-"}
                </span>
                <span className={item.matched ? "text-sm text-green-700" : "text-sm text-red-700"}>
                  {item.matched ? "matched" : "missed"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaseDetail(props: { id: string; onBack: () => void }): React.JSX.Element {
  const item = cases.find((entry) => entry.id === props.id);
  if (!item) return <p className="mx-auto max-w-5xl px-4 py-8">Case not found.</p>;
  return (
    <section className="mx-auto max-w-5xl px-4 pb-8">
      <button type="button" onClick={props.onBack} className="mb-4 text-sm text-blue-700 hover:underline">
        Back to cases
      </button>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900">{item.name}</h2>
        <span className={`rounded px-2 py-0.5 text-sm font-semibold ${gradeColor(item.actual.grade)}`}>
          grade {item.actual.grade ?? item.actual.verdict}
        </span>
        <span className={item.matched ? "rounded bg-green-100 px-2 py-0.5 text-sm text-green-800" : "rounded bg-red-100 px-2 py-0.5 text-sm text-red-800"}>
          {item.matched ? "scored as expected" : "missed"}
        </span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-900">{BANNER}</span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-500">Expected</h3>
          <p className="mt-1 text-gray-900">
            grade {item.expected.grade ?? item.expected.verdict ?? "-"}
            {item.expected.flags.length > 0 ? `, flags: ${item.expected.flags.join(", ")}` : ", no flags"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-500">Actual (simulator)</h3>
          <p className="mt-1 text-gray-900">
            grade {item.actual.grade ?? item.actual.verdict ?? "-"}
            {item.actual.flags.length > 0 ? `, flags: ${item.actual.flags.join(", ")}` : ", no flags"}
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-gray-500">Report Card (simulator output)</h3>
      <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-800">
        {item.report}
      </pre>
    </section>
  );
}

function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-600">
        <p>
          The bench ran on the reference simulator on a laptop, not on a NAS. Raw output: bench/results.json in the
          repository. Photos: Pexels licence, see demo/CREDITS.md.
        </p>
      </div>
    </footer>
  );
}

type View = { page: "home" } | { page: "family"; family: string } | { page: "case"; id: string };

function viewFromHash(): View {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  if (parts[0] === "family" && parts[1]) return { page: "family", family: parts[1] };
  if (parts[0] === "case" && parts[1]) return { page: "case", id: parts[1] };
  return { page: "home" };
}

function hashFor(view: View): string {
  if (view.page === "family") return `#/family/${view.family}`;
  if (view.page === "case") return `#/case/${view.id}`;
  return "#/";
}

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>(viewFromHash);

  // Deep links: every view has a URL, so a specific Report Card can be shared.
  window.onhashchange = () => setView(viewFromHash());
  const navigate = (next: View): void => {
    window.location.hash = hashFor(next);
    setView(next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <Header />
      {view.page === "home" && (
        <>
          <Hero />
          <Families onSelectFamily={(family) => navigate({ page: "family", family })} />
        </>
      )}
      {view.page === "family" && (
        <CaseList family={view.family} onSelectCase={(id) => navigate({ page: "case", id })} onBack={() => navigate({ page: "home" })} />
      )}
      {view.page === "case" && <CaseDetail id={view.id} onBack={() => navigate({ page: "home" })} />}
      <Footer />
    </div>
  );
}
