import { useLanguage, type MessageKey } from "../../i18n/i18n";

export type ChangedContextSource = { table: string; id: string; label: string; operation: string; changedAt: string };

export function ChangedContextSources({ sources }: { sources?: ChangedContextSource[] }) {
  const { locale, t } = useLanguage();
  const tr = (key: string) => t(`ready.${key}` as MessageKey);
  if (!sources?.length) return null;
  return <details className="text-sm" open>
    <summary className="cursor-pointer font-bold">{tr("changedSources")} ({sources.length})</summary>
    <ul className="mt-2 grid gap-2">{sources.map(source => <li className="min-w-0 break-words" key={`${source.table}:${source.id}`}>
      <span className="font-medium">{source.label === source.table ? tr("changedSource") : source.label}</span>
      <span className="text-company-muted"> · {tr(`change.${["insert", "update", "delete"].includes(source.operation) ? source.operation : "update"}`)}</span>
      <div className="text-xs text-company-muted"><span className="block break-all">{source.id}</span><time dateTime={source.changedAt}>{new Date(source.changedAt).toLocaleString(locale)}</time></div>
    </li>)}</ul>
  </details>;
}
