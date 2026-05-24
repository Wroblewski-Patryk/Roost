import { CcButton } from "../../components/cc-button";
import { useLanguage } from "../../i18n/i18n";
import type { MessageKey } from "../../i18n/messages";
import { PublicLayout } from "../../layout/public-layout";

const orbitNodes = [
  { key: "people", icon: "ph-user", className: "left-[43%] top-[2%]" },
  { key: "agents", icon: "ph-robot", className: "left-[8%] top-[28%]" },
  { key: "processes", icon: "ph-tree-structure", className: "right-[4%] top-[28%]" },
  { key: "assets", icon: "ph-database", className: "right-[5%] bottom-[21%]" },
  { key: "tasks", icon: "ph-check-square", className: "left-[44%] bottom-[6%]" },
  { key: "knowledge", icon: "ph-book-open", className: "left-[10%] bottom-[22%]" }
] as const;

const heroProofKeys = ["secure", "modular", "humanAi", "realtime"] as const;
const featureKeys = ["modular", "ai", "control"] as const;
const statusKeys = ["system", "tasks", "people", "agents", "health"] as const;

function tx(t: (key: MessageKey) => string, key: string) {
  return t(key as MessageKey);
}

function RoostGlyph({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-12 w-12" : "h-16 w-16";

  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center rounded-full border border-primary/45 bg-base-100/80 text-primary shadow-[0_0_42px_rgb(99_102_241_/_0.22)] ${sizeClass}`}
    >
      <span className="absolute inset-[18%] rounded-full border border-accent/55"></span>
      <span className="absolute h-[1px] w-[66%] rotate-[-26deg] bg-gradient-to-r from-primary to-accent"></span>
      <span className="absolute bottom-[25%] h-[30%] w-[58%] rounded-[90%_90%_90%_30%] border border-primary/80"></span>
      <span className="absolute right-[25%] top-[28%] h-1.5 w-1.5 rounded-full bg-accent"></span>
    </span>
  );
}

function HeroTopology() {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-[31rem] overflow-hidden lg:min-h-[37rem]">
      <div className="absolute inset-x-0 bottom-2 top-16 opacity-55 [background-image:linear-gradient(rgb(6_182_212_/_0.08)_1px,transparent_1px),linear-gradient(90deg,rgb(6_182_212_/_0.08)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_73%)]"></div>
      <div className="absolute left-1/2 top-[47%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary/18"></div>
      <div className="absolute left-1/2 top-[47%] h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/28"></div>
      <div className="absolute left-1/2 top-[47%] h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/22"></div>
      <div className="absolute left-[8%] right-[5%] top-[47%] h-px bg-gradient-to-r from-transparent via-secondary/55 to-transparent"></div>
      <div className="absolute bottom-[9%] left-1/2 top-[4%] w-px bg-gradient-to-b from-transparent via-primary/55 to-transparent"></div>

      <div className="absolute left-1/2 top-[47%] grid h-36 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-base-100/72 shadow-[0_0_70px_rgb(6_182_212_/_0.22)] backdrop-blur">
        <div className="absolute inset-3 rounded-full border border-primary/40"></div>
        <RoostGlyph size="md" />
      </div>

      {orbitNodes.map((node) => (
        <div
          className={`absolute z-10 hidden items-center gap-3 rounded-xl border border-white/12 bg-[#0d1520]/84 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgb(0_0_0_/_0.28),0_0_26px_rgb(99_102_241_/_0.1)] backdrop-blur md:flex ${node.className}`}
          key={node.key}
        >
          <i className={`ph-bold ${node.icon} text-xl text-accent`} aria-hidden="true"></i>
          <span>{tx(t, `home.node.${node.key}`)}</span>
        </div>
      ))}

      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 md:hidden">
        {orbitNodes.slice(0, 4).map((node) => (
          <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-[#0d1520]/84 px-3 py-2 text-sm font-semibold text-white backdrop-blur" key={node.key}>
            <i className={`ph-bold ${node.icon} text-lg text-accent`} aria-hidden="true"></i>
            <span>{tx(t, `home.node.${node.key}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusRail() {
  const { t } = useLanguage();

  return (
    <aside className="hidden w-40 shrink-0 border-l border-white/10 pl-8 xl:block" id="status">
      {statusKeys.map((key) => (
        <div className="border-b border-white/10 py-5 last:border-b-0" key={key}>
          <div className="flex items-start gap-3">
            <i className={`ph-bold ${tx(t, `home.status.${key}.icon`)} mt-1 text-xl text-accent/80`} aria-hidden="true"></i>
            <div>
              <p className="text-[0.63rem] font-semibold uppercase tracking-[0.12em] text-base-content/52">{tx(t, `home.status.${key}.label`)}</p>
              <p className="mt-2 text-2xl font-semibold text-base-content">{tx(t, `home.status.${key}.value`)}</p>
              <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-success">{tx(t, `home.status.${key}.caption`)}</p>
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}

export function PublicHomeRoute() {
  const { t } = useLanguage();

  return (
    <PublicLayout active="home">
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-14 sm:pt-18 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_47%_36%,rgb(59_130_246_/_0.13),transparent_27%),radial-gradient(circle_at_78%_21%,rgb(6_182_212_/_0.12),transparent_24%),linear-gradient(180deg,#071019_0%,#0d1117_45%,#070c12_100%)]"></div>
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

        <div className="mx-auto max-w-[92rem]">
          <div className="grid min-h-[720px] gap-10 lg:grid-cols-[minmax(28rem,0.82fr)_minmax(30rem,1fr)_auto] lg:items-center">
            <div className="max-w-2xl">
              <h1 className="text-6xl font-semibold uppercase leading-none tracking-[0.18em] text-base-content sm:text-7xl lg:text-8xl">
                Roost
              </h1>
              <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-base-content sm:text-5xl">
                <span className="roost-gradient-text">{t("home.conceptTitleAccent")}</span>
                <span className="block">{t("home.conceptTitleRest")}</span>
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-base-content/68">{t("home.conceptDescription")}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <CcButton className="min-w-48" href="/auth/login" iconRight="ph-arrow-right" size="lg" variant="primary">{t("home.enterRoost")}</CcButton>
                <CcButton className="min-w-48" href="#system" iconRight="ph-book-open" size="lg" variant="outline">{t("home.learnSystem")}</CcButton>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-4">
                {heroProofKeys.map((key) => (
                  <div className="flex items-center gap-3 text-sm text-base-content/62" key={key}>
                    <i className={`ph-bold ${tx(t, `home.proof.${key}.icon`)} text-2xl text-primary`} aria-hidden="true"></i>
                    <span>{tx(t, `home.proof.${key}.label`)}</span>
                  </div>
                ))}
              </div>
            </div>

            <HeroTopology />
            <StatusRail />
          </div>

          <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#0b131d]/78 shadow-[0_20px_70px_rgb(0_0_0_/_0.25)] backdrop-blur md:grid-cols-3" id="system">
            {featureKeys.map((key) => (
              <article className="grid gap-4 border-b border-white/10 p-7 md:border-b-0 md:border-r md:last:border-r-0" key={key}>
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-base-100/70 text-3xl text-primary">
                  <i className={`ph-bold ${tx(t, `home.feature.${key}.icon`)}`} aria-hidden="true"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-base-content">{tx(t, `home.feature.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-6 text-base-content/62">{tx(t, `home.feature.${key}.description`)}</p>
                  <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent" href="/auth/login">
                    {tx(t, `home.feature.${key}.link`)}
                    <i className="ph-bold ph-arrow-right" aria-hidden="true"></i>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
