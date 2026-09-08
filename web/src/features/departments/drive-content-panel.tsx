import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcSelect } from "../../components/cc-select";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

type Block = { range: string; values: { values?: unknown[][] }; formulas?: { values?: unknown[][] } };
type Snapshot = { contentKind: string; extractedText: string | null; updatedAt: string; structuredPreview?: { ranges?: Block[] } };
function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
}

/** A live view of the provider original, never an independently editable cache. */
export function DriveContentPanel({ fileId }: { fileId: string }) {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [formulas, setFormulas] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setSnapshot(null); setTab(0);
    api<{ data: Snapshot }>(`/v1/google-drive/files/${fileId}/content`).then(result => {
      if (active) { setSnapshot(result.data); }
    }).catch(() => { if (active) setError(pl ? "Nie udało się odczytać oryginału. Spróbuj ponownie lub otwórz plik w Google." : "Could not read the original. Retry or open the file in Google."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [fileId, reload, pl]);

  const blocks = snapshot?.structuredPreview?.ranges ?? [];
  const block = blocks[tab];
  const rows = (formulas ? block?.formulas?.values : block?.values.values) ?? [];
  const width = Math.min(30, rows.reduce((max, row) => Math.max(max, Math.min(30, row.length)), 1));
  const sheet = snapshot?.contentKind === "google_sheet";
  return <section className="grid min-w-0 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-company-muted">{pl ? "Podgląd oryginału z Google Drive" : "Original Google Drive content"}{snapshot ? ` · ${new Date(snapshot.updatedAt).toLocaleTimeString(locale)}` : ""}</p>
      <CcButton disabled={busy} onClick={() => setReload(x => x + 1)} iconLeft="ph-arrow-clockwise" size="sm" variant="outline">{pl ? "Odśwież z Google" : "Refresh from Google"}</CcButton>
    </div>
    {error ? <CcNotice tone="error" title={error} live /> : null}
    {busy ? <p role="status">{pl ? "Łączenie z Google…" : "Connecting to Google…"}</p> : null}
    {snapshot && sheet ? <>
      <div className="flex flex-wrap items-center gap-3">
        <CcSelect aria-label={pl ? "Zakładka arkusza" : "Worksheet"} value={tab} onChange={event => { setTab(Number(event.target.value)); }}>{blocks.map((item, index) => <option key={item.range} value={index}>{item.range.replace(/^'|'$/g, "").replace(/''/g, "'")}</option>)}</CcSelect>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formulas} onChange={event => setFormulas(event.target.checked)} />{pl ? "Pokaż formuły" : "Show formulas"}</label>
      </div>
      <table className="table table-xs">
        <thead><tr><th scope="col">#</th>{Array.from({ length: width }, (_, c) => <th scope="col" key={c}>{columnName(c)}</th>)}</tr></thead>
        <tbody>{Array.from({ length: Math.min(100, Math.max(rows.length, 1)) }, (_, r) => <tr key={r}>
          <th scope="row">{r + 1}</th>
          {Array.from({ length: width }, (_, c) => <td className="min-w-16 whitespace-pre-wrap" key={c}>{String(rows[r]?.[c] ?? "") || "—"}</td>)}
        </tr>)}</tbody>
      </table>
      <p className="text-xs text-company-muted">{pl ? "Podgląd pokazuje do 100 wierszy i 30 kolumn. Pełny arkusz i edycję otworzysz w Google Sheets." : "Preview shows up to 100 rows and 30 columns. Open Google Sheets for the complete spreadsheet and editing."}</p>
    </> : snapshot ? <pre className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6">{snapshot.extractedText || (pl ? "Plik jest pusty." : "The file is empty.")}</pre> : null}
  </section>;
}
