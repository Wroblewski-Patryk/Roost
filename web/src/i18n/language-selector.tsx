import { useEffect, useRef, useState } from "react";
import { isLocale, useLanguage } from "./i18n";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (compact) {
    return (
      <div className="roost-language-switcher" ref={rootRef}>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t("language.label")}
          className="roost-language-trigger"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <i className="ph-bold ph-globe-hemisphere-west" aria-hidden="true"></i>
          <span>{locale.toUpperCase()}</span>
          <i className={`ph-bold ph-caret-down${open ? " is-open" : ""}`} aria-hidden="true"></i>
        </button>

        {open ? (
          <div className="roost-language-menu" role="menu" aria-label={t("language.label")}>
            {(["en", "pl"] as const).map((value) => (
              <button
                aria-current={locale === value ? "true" : undefined}
                className={locale === value ? "is-active" : undefined}
                key={value}
                onClick={() => {
                  if (isLocale(value)) setLocale(value);
                  setOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <span className="roost-language-code">{value.toUpperCase()}</span>
                <span>{t(`language.${value}`)}</span>
                {locale === value ? <i className="ph-bold ph-check" aria-hidden="true"></i> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <label className="form-control w-40">
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
