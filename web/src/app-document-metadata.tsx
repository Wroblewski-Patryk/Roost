import { useEffect } from "react";
import type { AppRouteMeta } from "./app-route-registry";
import { coreAreas } from "./features/departments/core-area-data";
import { useLanguage } from "./i18n/i18n";

function setMetaContent(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function AppDocumentMetadata({ locationKey, route }: { locationKey: string; route?: AppRouteMeta }) {
  const { t } = useLanguage();

  useEffect(() => {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    let pageLabel = t("app.operatingSystem");
    let description = t("home.description");
    let privatePage = pathname !== "/" || route?.private === true;

    if (pathname === "/auth/login") {
      pageLabel = t("auth.form.loginTitle");
      description = t("auth.login.description");
      privatePage = true;
    } else if (pathname === "/auth/register") {
      pageLabel = t("auth.form.registerTitle");
      description = t("auth.register.description");
      privatePage = true;
    } else if (pathname === "/account/settings") {
      pageLabel = t("account.title");
      description = t("account.description");
      privatePage = true;
    } else if (pathname === "/workspace/settings") {
      pageLabel = t("workspaceSettings.title");
      description = t("workspaceSettings.description");
      privatePage = true;
    } else if (pathname === "/areas") {
      const area = coreAreas.find((candidate) => candidate.key === params.get("area")) || coreAreas[0];
      const view = area.views?.find((candidate) => candidate.key === (params.get("view") || "overview"));
      const areaLabel = t(area.labelKey);
      pageLabel = view ? `${t(view.labelKey)} — ${areaLabel}` : areaLabel;
      description = t(area.descriptionKey);
      privatePage = true;
    } else if (route?.title) {
      pageLabel = route.title;
    }

    const title = pathname === "/" ? `${t("app.name")} — ${pageLabel}` : `${pageLabel} · ${t("app.name")}`;
    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[name="robots"]', privatePage ? "noindex, nofollow" : "index, follow");

    if (!privatePage) {
      setMetaContent('meta[property="og:title"]', title);
      setMetaContent('meta[property="og:description"]', description);
      setMetaContent('meta[name="twitter:title"]', title);
      setMetaContent('meta[name="twitter:description"]', description);
    }
  }, [locationKey, route, t]);

  return null;
}
