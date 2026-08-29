import { CcButton } from "../../components/cc-button";
import { RoostLogoMark } from "../../components/roost-logo-mark";
import { useLanguage } from "../../i18n/i18n";
import type { MessageKey } from "../../i18n/messages";
import { PublicLayout } from "../../layout/public-layout";

const topologyNodes = [
  { key: "people", icon: "ph-users-three" },
  { key: "agents", icon: "ph-robot" },
  { key: "processes", icon: "ph-tree-structure" },
  { key: "assets", icon: "ph-database" }
] as const;

const signalKeys = ["human", "api", "memory"] as const;
const capabilityKeys = ["control", "organization", "automation"] as const;
const workflowKeys = ["overview", "area", "capability", "record", "evidence", "action"] as const;

function tx(t: (key: MessageKey) => string, key: string) {
  return t(key as MessageKey);
}

function CommandTopology() {
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a131d]/72 p-5 shadow-[0_30px_100px_rgb(0_0_0_/_0.34)] backdrop-blur-xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_42%,rgb(6_182_212_/_0.14),transparent_28%),radial-gradient(circle_at_82%_8%,rgb(99_102_241_/_0.14),transparent_32%)]" />
      <div className="relative flex items-center justify-between border-b border-white/8 pb-5">
        <div>
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.18em] text-accent">{t("home.topology.coreLabel")}</p>
          <p className="mt-1 text-base font-semibold text-white">{t("home.topology.core")}</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-base-content/60">
          <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_18px_rgb(16_185_129_/_0.8)]" />
          {t("home.topology.connected")}
        </div>
      </div>

      <div className="relative grid min-h-[27rem] place-items-center py-9 sm:min-h-[31rem]">
        <div className="absolute left-1/2 top-1/2 h-[19rem] w-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 sm:h-[25rem] sm:w-[25rem]" />
        <div className="absolute left-1/2 top-1/2 h-[12rem] w-[12rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20 sm:h-[17rem] sm:w-[17rem]" />
        <div className="absolute left-[13%] right-[13%] top-1/2 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
        <div className="absolute bottom-[14%] left-1/2 top-[14%] w-px bg-gradient-to-b from-transparent via-primary/35 to-transparent" />

        <div className="relative z-10 grid h-28 w-28 place-items-center rounded-full border border-primary/35 bg-[#08111a]/92 shadow-[0_0_70px_rgb(6_182_212_/_0.18)] sm:h-36 sm:w-36">
          <div className="absolute inset-2 rounded-full border border-white/8" />
          <RoostLogoMark alt="" className="h-14 w-14 sm:h-17 sm:w-17" />
        </div>

        <div className="absolute inset-5 grid grid-cols-2 grid-rows-2 place-items-center gap-x-24 gap-y-40 sm:inset-8 sm:gap-x-52 sm:gap-y-56">
          {topologyNodes.map((node) => (
            <div className="relative z-10 flex min-w-30 items-center gap-3 rounded-xl border border-white/10 bg-[#0c1722]/92 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgb(0_0_0_/_0.26)] backdrop-blur sm:min-w-36 sm:px-4 sm:py-3" key={node.key}>
              <i className={`ph-bold ${node.icon} text-xl text-accent`} aria-hidden="true" />
              <span>{tx(t, `home.node.${node.key}`)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative grid gap-2 border-t border-white/8 pt-4 sm:grid-cols-3">
        {signalKeys.map((key) => (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-base-content/68" key={key}>
            <i className={`ph-bold ${tx(t, `home.signal.${key}.icon`)} text-lg text-primary`} aria-hidden="true" />
            <span>{tx(t, `home.signal.${key}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicHomeRoute() {
  const { t } = useLanguage();

  return (
    <PublicLayout active="home">
      <section className="relative isolate overflow-hidden px-4 pb-16 pt-10 sm:pt-16 lg:px-8 lg:pb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_21%,rgb(6_182_212_/_0.1),transparent_27%),radial-gradient(circle_at_22%_34%,rgb(99_102_241_/_0.11),transparent_30%),linear-gradient(180deg,#071019_0%,#0b1118_62%,#080d13_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="mx-auto grid max-w-[88rem] gap-10 lg:min-h-[40rem] lg:grid-cols-[minmax(28rem,0.85fr)_minmax(35rem,1.15fr)] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-accent">
              <span className="h-px w-8 bg-accent/65" />
              {t("home.kicker")}
            </p>
            <h1 className="mt-5 text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.04em] text-white sm:mt-6 sm:text-6xl lg:text-[4.35rem]">
              {t("home.title")}{" "}
              <span className="roost-gradient-text">{t("home.titleAccent")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-base-content/68 sm:mt-7 sm:text-lg sm:leading-8">{t("home.description")}</p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:flex">
              <CcButton ariaLabel={t("home.openWorkspace")} className="min-w-0 whitespace-nowrap px-2 text-sm sm:min-w-52 sm:px-6 sm:text-base" href="/auth/login" iconRight="ph-arrow-right" size="lg" variant="primary">
                <span className="sm:hidden">{t("home.enterRoost")}</span>
                <span className="hidden sm:inline">{t("home.openWorkspace")}</span>
              </CcButton>
              <CcButton ariaLabel={t("home.createWorkspace")} className="min-w-0 whitespace-nowrap px-2 text-sm sm:min-w-44 sm:px-6 sm:text-base" href="/auth/register" iconRight="ph-plus" size="lg" variant="outline">
                <span className="sm:hidden">{t("nav.createAccount")}</span>
                <span className="hidden sm:inline">{t("home.createWorkspace")}</span>
              </CcButton>
            </div>

            <p className="mt-8 hidden max-w-lg border-l border-primary/45 pl-4 text-sm leading-6 text-base-content/52 sm:block">{t("home.brandLine")}</p>
          </div>

          <CommandTopology />
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#080e15]/78 px-4 py-20 lg:px-8 lg:py-24" id="system">
        <div className="mx-auto max-w-[88rem]">
          <div className="grid gap-8 border-b border-white/8 pb-12 lg:grid-cols-[0.72fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("home.system.eyebrow")}</p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl">{t("home.system.title")}</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-base-content/62 lg:justify-self-end">{t("home.system.description")}</p>
          </div>

          <div className="grid lg:grid-cols-3">
            {capabilityKeys.map((key, index) => (
              <article className="group border-b border-white/8 py-9 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0" key={key}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] text-base-content/38">0{index + 1}</span>
                  <i className={`ph-bold ${tx(t, `home.capability.${key}.icon`)} text-2xl text-primary transition group-hover:text-accent`} aria-hidden="true" />
                </div>
                <p className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{tx(t, `home.capability.${key}.label`)}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{tx(t, `home.capability.${key}.title`)}</h3>
                <p className="mt-3 text-sm leading-6 text-base-content/60">{tx(t, `home.capability.${key}.description`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 lg:px-8 lg:py-28" id="workflow">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_110%,rgb(59_130_246_/_0.12),transparent_42%),#070c12]" />
        <div className="mx-auto max-w-[88rem]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{t("home.workflow.eyebrow")}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl">{t("home.workflow.title")}</h2>
            <p className="mt-4 text-base leading-7 text-base-content/62">{t("home.workflow.description")}</p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:grid-cols-3 lg:grid-cols-6">
            {workflowKeys.map((key, index) => (
              <li className="relative bg-[#0a121b] px-5 py-6" key={key}>
                <span className="text-[0.65rem] font-semibold tracking-[0.16em] text-primary">0{index + 1}</span>
                <p className="mt-3 text-sm font-semibold text-white">{tx(t, `home.workflow.${key}`)}</p>
                {index < workflowKeys.length - 1 ? <i className="ph-bold ph-arrow-right absolute right-3 top-6 hidden text-base-content/22 lg:block" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>

          <div className="mt-10 flex justify-center">
            <CcButton href="/auth/login" iconRight="ph-arrow-right" size="lg" variant="primary">{t("home.enterRoost")}</CcButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
