import { isLocale, useLanguage } from "./i18n";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={`form-control ${compact ? "w-32" : "w-40"}`}>
      <span className="label py-0 pb-1">
        <span className="label-text text-xs font-black uppercase text-base-content/60">{t("language.label")}</span>
      </span>
      <select
        aria-label={t("language.label")}
        className="select select-bordered select-sm"
        onChange={(event) => {
          if (isLocale(event.target.value)) {
            setLocale(event.target.value);
          }
        }}
        value={locale}
      >
        <option value="en">{t("language.en")}</option>
        <option value="pl">{t("language.pl")}</option>
      </select>
    </label>
  );
}
