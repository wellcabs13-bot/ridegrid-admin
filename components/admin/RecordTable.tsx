"use client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { DataState } from "./Primitives";
export type RecordRow = Record<string, unknown>;
export type Column = { key: string; title: string; render?: (row: RecordRow) => ReactNode };
export function cell(row: RecordRow, path: string): string {
  const value = path.split(".").reduce<unknown>((item, key) => item && typeof item === "object" ? (item as RecordRow)[key] : undefined, row);
  return value == null ? "—" : typeof value === "object" ? "—" : String(value);
}
export function exportCsv(rows: RecordRow[], columns: Column[], name: string) {
  const quote = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  const csv = [columns.map(c => quote(c.title)).join(","), ...rows.map(row => columns.map(c => quote(cell(row,c.key))).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href=url; anchor.download=name+".csv"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function RecordTable({ rows, columns, onSelect, actions, searchable = true }: { rows: RecordRow[]; columns: Column[]; onSelect?: (row: RecordRow) => void; actions?: (row: RecordRow) => ReactNode; searchable?: boolean }) {
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  const [sort,setSort] = useState<{ key: string; ascending: boolean } | null>(null);
  const filtered = useMemo(() => {
    const result = rows.filter(row=>columns.some(c=>cell(row,c.key).toLowerCase().includes(search.toLowerCase())));
    if(sort) result.sort((a,b)=>cell(a,sort.key).localeCompare(cell(b,sort.key),undefined,{numeric:true})*(sort.ascending?1:-1));
    return result;
  },[rows,columns,search,sort]);
  useEffect(()=>setPage(1),[search,rows,sort]);
  const pages=Math.max(1,Math.ceil(filtered.length/20));
  const current=Math.min(page,pages);
  return <div className="space-y-3">
    {searchable && <div className="flex flex-wrap items-center justify-between gap-3"><input aria-label="Search records" className="rg-input sm:!w-72" placeholder="Search records…" value={search} onChange={e=>setSearch(e.target.value)}/><span className="text-xs text-neutral-500">{filtered.length.toLocaleString()} matching records</span></div>}
    <DataState loading={false} error="" empty={!filtered.length} onRetry={()=>{}}>
      <div className="rg-card overflow-x-auto"><table className="rg-table"><thead><tr>{columns.map(c=><th key={c.key} aria-sort={sort?.key===c.key ? sort.ascending ? "ascending":"descending" : "none"}><button className="whitespace-nowrap text-left" onClick={()=>setSort({key:c.key,ascending:sort?.key===c.key?!sort.ascending:true})}>{c.title} {sort?.key===c.key ? sort.ascending?"↑":"↓":""}</button></th>)}{(onSelect||actions)&&<th>Actions</th>}</tr></thead><tbody>{filtered.slice((current-1)*20,current*20).map((row,index)=><tr key={String(row.id ?? index)}>{columns.map(c=><td key={c.key}>{c.render?c.render(row):cell(row,c.key)}</td>)}{(onSelect||actions)&&<td>{onSelect&&<button className="font-medium text-red-700 hover:underline" onClick={()=>onSelect(row)}>View details</button>}{actions?.(row)}</td>}</tr>)}</tbody></table></div>
      <div className="flex items-center justify-between gap-2 text-sm"><span className="text-neutral-500">Page {current} of {pages}</span><div className="flex gap-2"><button className="rg-secondary" disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><button className="rg-secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div></div>
    </DataState>
  </div>;
}
