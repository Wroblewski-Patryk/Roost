import { useLanguage } from "../i18n/i18n";
import { RoostLogoMark } from "./roost-logo-mark";

export function CcRouteLoading() {
  const { t } = useLanguage();

  return (
    <main className="cc-route-loading min-h-screen bg-base-200 text-base-content" data-theme="roost">
      <div className="grid min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside aria-hidden="true" className="hidden border-r border-base-300 bg-neutral/96 px-3 py-4 lg:block">
          <div className="flex items-center gap-3">
            <RoostLogoMark className="h-9 w-9" />
            <span className="grid gap-1">
              <span className="h-3 w-24 rounded-full bg-neutral-content/22"></span>
              <span className="h-2 w-32 rounded-full bg-neutral-content/12"></span>
            </span>
          </div>
          <div className="mt-8 grid gap-2">
            {Array.from({ length: 9 }, (_, index) => (
              <span className="h-9 rounded-company border border-transparent bg-white/[0.045]" key={index}></span>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 px-3 py-3 backdrop-blur sm:px-4 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <RoostLogoMark className="h-8 w-8" />
                <span className="h-4 w-28 rounded-full bg-base-300"></span>
              </div>
              <span className="ml-auto h-10 w-10 rounded-full bg-base-300"></span>
            </div>
          </header>

          <div className="grid gap-4 px-3 py-4 sm:px-4 sm:py-5 lg:gap-6 lg:px-8 lg:py-6">
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <div className="flex items-center gap-3">
                <span className="loading loading-spinner loading-md text-primary" aria-hidden="true"></span>
                <span>
                  <span className="block text-sm font-black uppercase text-primary">{t("app.name")}</span>
                  <span className="block text-sm font-bold text-company-muted">Loading view</span>
                </span>
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-3">
              <span className="h-28 rounded-company border border-base-300 bg-base-100"></span>
              <span className="h-28 rounded-company border border-base-300 bg-base-100"></span>
              <span className="h-28 rounded-company border border-base-300 bg-base-100"></span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
