import { useEffect, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcSelect } from "../../components/cc-select";
import { CcNotice } from "../../components/cc-notice";
import { useLanguage } from "../../i18n/i18n";

type Block = { range: string; values: { values?: unknown[][] }; formulas?: { values?: unknown[][] } };
type Snapshot = { sourceRevisionId: string; contentKind: string; extractedText: string | null; updatedAt: string; structuredPreview?: { ranges?: Block[] }; metadata?: { partial?: boolean } };
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
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState(0);
  const [formulas, setFormulas] = useState(false);
  const [cell, setCell] = useState<{ row: number; col: number } | null>(null);
  const [value, setValue] = useState("");
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setSnapshot(null); setEditing(false); setCell(null); setSaved(false); setTab(0);
    api<{ data: Snapshot }>(`/v1/google-drive/files/${fileId}/content`).then(result => {
      if (active) { setSnapshot(result.data); setText(result.data.extractedText ?? ""); }
    }).catch(() => { if (active) setError(pl ? "Nie udało się odczytać oryginału. Spróbuj ponownie lub otwórz plik w Google." : "Could not read the original. Retry or open the file in Google."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [fileId, reload, pl]);

  const blocks = snapshot?.structuredPreview?.ranges ?? [];
  const block = blocks[tab];
  const rows = (formulas ? block?.formulas?.values : block?.values.values) ?? [];
  const width = Math.min(30, rows.reduce((max, row) => Math.max(max, Math.min(30, row.length)), 1));
  const sheet = snapshot?.contentKind === "google_sheet";
  const doc = snapshot?.contentKind === "google_doc";
  const editableText = snapshot && ["markdown", "csv", "plain_text", "json"].includes(snapshot.contentKind);
  async function save() {
    if (!snapshot) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      let path: string; let method: string; let body: Record<string, unknown>;
      if (sheet && block && cell) {
        path = `/v1/google-drive/sheets/${fileId}/values`; method = "PUT";
        body = { range: `${block.range}!${columnName(cell.col)}${cell.row + 1}`, values: [[value]], valueInputOption: "USER_ENTERED" };
      } else if (doc) {
        path = `/v1/google-drive/docs/${fileId}`; method = "PATCH";
        body = { requests: [{ replaceAllText: { containsText: { text: find, matchCase: true }, replaceText: replacement } }] };
      } else {
        path = `/v1/google-drive/files/${fileId}/text-content`; method = "PATCH"; body = { content: text };
      }
      const result = await api<{ data: { snapshot: Snapshot } }>(path, { method, body: JSON.stringify({ ...body, expectedRevision: snapshot.sourceRevisionId }) });
      setSnapshot(result.data.snapshot); setText(result.data.snapshot.extractedText ?? ""); setEditing(false); setCell(null); setSaved(true);
    } catch (caught) {
      setError(caught instanceof AppApiError && caught.code === "source_changed"
        ? pl ? "Plik zmienił się w Google. Twoja zmiana nie została zapisana. Skopiuj swój tekst, odśwież i porównaj treść." : "The file changed in Google. Your edit was not saved. Copy your draft, refresh and compare."
        : pl ? "Nie potwierdzono zapisu. Sprawdź oryginał przed ponowieniem." : "Save was not confirmed. Check the original before retrying.");
    } finally { setBusy(false); }
  }
  return <section className="grid min-w-0 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-company-muted">{pl ? "Podgląd oryginału z Google Drive" : "Original Google Drive content"}{snapshot ? ` · ${new Date(snapshot.updatedAt).toLocaleTimeString(locale)}` : ""}</p>
      <CcButton disabled={busy} onClick={() => setReload(x => x + 1)} iconLeft="ph-arrow-clockwise" size="sm" variant="outline">{pl ? "Odśwież z Google" : "Refresh from Google"}</CcButton>
    </div>
    {error ? <CcNotice tone="error" title={error} live /> : null}
    {saved ? <CcNotice tone="success" title={pl ? "Zapisano w oryginalnym pliku Google Drive." : "Saved to the original Google Drive file."} live /> : null}
    {busy ? <p role="status">{pl ? "Łączenie z Google…" : "Connecting to Google…"}</p> : null}
    {snapshot && sheet ? <>
      <div className="flex flex-wrap items-center gap-3">
        <CcSelect aria-label={pl ? "Zakładka arkusza" : "Worksheet"} value={tab} onChange={event => { setTab(Number(event.target.value)); setCell(null); }}>{blocks.map((item, index) => <option key={item.range} value={index}>{item.range.replace(/^'|'$/g, "").replace(/''/g, "'")}</option>)}</CcSelect>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formulas} onChange={event => setFormulas(event.target.checked)} />{pl ? "Pokaż formuły" : "Show formulas"}</label>
      </div>
      <div className="max-h-[55vh] overflow-auto"><table className="table table-xs"><thead><tr><th>#</th>{Array.from({ length: width }, (_, c) => <th key={c}>{columnName(c)}</th>)}</tr></thead><tbody>{Array.from({ length: Math.min(100, Math.max(rows.length, 1)) }, (_, r) => <tr key={r}><th>{r + 1}</th>{Array.from({ length: width }, (_, c) => <td key={c}><button className="min-h-9 min-w-16 whitespace-pre-wrap text-left hover:text-primary focus-visible:outline" disabled={busy} aria-label={`${columnName(c)}${r + 1}: ${String(rows[r]?.[c] ?? "")}`} onClick={() => { setCell({ row: r, col: c }); setValue(String(block?.formulas?.values?.[r]?.[c] ?? rows[r]?.[c] ?? "")); }}>{String(rows[r]?.[c] ?? "") || "—"}</button></td>)}</tr>)}</tbody></table></div>
      <p className="text-xs text-company-muted">{pl ? "Kliknij komórkę, aby ją zmienić. Podgląd pokazuje do 100 wierszy i 30 kolumn; pełny arkusz otworzysz w Google Sheets." : "Click a cell to edit it. Preview shows up to 100 rows and 30 columns; open Google Sheets for the complete spreadsheet."}</p>
      {cell ? <form className="grid gap-2" onSubmit={event => { event.preventDefault(); void save(); }}><label className="grid gap-1 text-sm">{`${columnName(cell.col)}${cell.row + 1}`}<input className="input input-bordered w-full" value={value} onChange={event => setValue(event.target.value)} /></label><p className="text-xs text-company-muted">{pl ? "Wartość zostanie zinterpretowana jak wpis w Google Sheets, także formuły zaczynające się od =." : "Input is interpreted as in Google Sheets, including formulas beginning with =."}</p><CcButton disabled={busy} type="submit" variant="primary">{pl ? "Zapisz komórkę w Google" : "Save cell to Google"}</CcButton></form> : null}
    </> : snapshot ? <>
      {editing && editableText ? <textarea aria-label={pl ? "Pełna treść pliku" : "Full file content"} className="textarea textarea-bordered min-h-80 w-full font-mono" value={text} onChange={event => setText(event.target.value)} /> : <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-6">{snapshot.extractedText || (pl ? "Dokument jest pusty." : "The document is empty.")}</pre>}
      {(doc || editableText) && !editing ? <CcButton disabled={busy} onClick={() => setEditing(true)} size="sm" variant="outline">{pl ? "Edytuj treść przez Roost" : "Edit content through Roost"}</CcButton> : null}
      {editing ? <form className="grid gap-2" onSubmit={event => { event.preventDefault(); void save(); }}>
        {doc ? <><p className="text-xs text-company-muted">{pl ? "Zamiana wszystkich dokładnych wystąpień wskazanego tekstu. Zaawansowaną edycję wykonaj w Google Docs." : "Replace every exact occurrence of the specified text. Use Google Docs for advanced editing."}</p><label className="grid gap-1 text-sm">{pl ? "Znajdź tekst" : "Find text"}<textarea required className="textarea textarea-bordered" value={find} onChange={event => setFind(event.target.value)} /></label><label className="grid gap-1 text-sm">{pl ? "Zastąp tekstem" : "Replace with"}<textarea className="textarea textarea-bordered" value={replacement} onChange={event => setReplacement(event.target.value)} /></label></> : null}
        <div className="flex gap-2"><CcButton disabled={busy || (doc && !find)} type="submit" variant="primary">{pl ? "Zapisz w Google" : "Save to Google"}</CcButton><CcButton disabled={busy} onClick={() => { setEditing(false); setText(snapshot.extractedText ?? ""); }} variant="ghost">{pl ? "Anuluj" : "Cancel"}</CcButton></div>
      </form> : null}
    </> : null}
  </section>;
}
