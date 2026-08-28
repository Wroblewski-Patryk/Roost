function activeLocaleTag() {
  if (typeof document !== "undefined" && document.documentElement.lang === "pl") {
    return "pl-PL";
  }
  return "en-US";
}

export function formatAppDate(value: string | Date, options: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(activeLocaleTag(), options).format(date);
}
