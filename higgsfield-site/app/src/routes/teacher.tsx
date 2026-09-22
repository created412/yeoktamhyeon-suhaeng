import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import "@/components/site/site.css";
import { listDrafts, listHistory, listSubmissions, type DraftRow, type LogRow, type SubmissionRow } from "@/lib/api/submissions.functions";

export const Route = createFileRoute("/teacher")({
  head: () => ({ meta: [{ title: "교사용 열람 · 역탐현" }, { name: "robots", content: "noindex" }] }),
  component: Teacher,
});

type Task = "수행1" | "수행2" | "수행3" | "수행4";
type Field = { label: string; value: string };

function parse(r: { fields_json: string }): Field[] {
  try { return JSON.parse(r.fields_json) as Field[]; } catch { return []; }
}

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p))}</>;
}

function Teacher() {
  const [key, setKey] = useState("");
  const [task, setTask] = useState<Task>("수행1");
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [cls, setCls] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [hist, setHist] = useState<Record<string, LogRow[]>>({});

  useEffect(() => {
    try { setKey(sessionStorage.getItem("yth-key") || ""); } catch { /* ignore */ }
  }, []);

  async function load() {
    setMsg("불러오는 중…");
    try {
      try { sessionStorage.setItem("yth-key", key); } catch { /* ignore */ }
      const [out, dr] = await Promise.all([listSubmissions({ data: { key, task } }), listDrafts({ data: { key, task } })]);
      setRows(out.rows);
      setDrafts(dr.rows);
      setHist({});
      setMsg("불러옴 · 제출 " + out.rows.length + "명 · 미제출 작성 기록 " + dr.rows.length + "건");
    } catch (e) {
      setMsg("오류: " + (e instanceof Error ? e.message : "알 수 없음"));
    }
  }

  const classes = useMemo(() => [...new Set(rows.map((r) => r.class_no))].sort((a, b) => a - b), [rows]);
  const shown = rows.filter((r) => (!cls || String(r.class_no) === cls) && (!q || (r.student_id + r.name + r.fields_json).toLowerCase().includes(q.toLowerCase())));

  async function loadHist(sid: string) {
    try {
      const out = await listHistory({ data: { key, task, studentId: sid } });
      setHist((h) => ({ ...h, [sid]: out.rows }));
    } catch (e) {
      setMsg("오류: " + (e instanceof Error ? e.message : "알 수 없음"));
    }
  }

  function textOf(r: SubmissionRow) {
    return [r.student_id + " " + r.name, ...parse(r).map((f) => "■ " + f.label + "\n" + f.value)].join("\n\n");
  }

  function csv() {
    const labels = [...new Set(shown.flatMap((r) => parse(r).map((f) => f.label)))];
    const head = ["학번", "이름", "반", "번호", "최초 제출", "최종 제출", "제출 횟수", ...labels];
    const body = shown.map((r) => {
      const m = new Map(parse(r).map((f) => [f.label, f.value]));
      return [r.student_id, r.name, r.class_no, r.number_no, r.first_at, r.last_at, r.count, ...labels.map((l) => m.get(l) ?? "")];
    });
    const esc = (x: unknown) => '"' + String(x).replace(/"/g, '""') + '"';
    const text = "﻿" + [head, ...body].map((r) => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = task + "_제출_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  }

  return (
    <main className="yt yt-page">
      <header className="yt-head">
        <Link to="/" className="yt-back">← 처음으로</Link>
        <h1 style={{ marginTop: 14 }}>교사용 열람</h1>
      </header>
      <div className="yt-sheet">
        <div className="yt-card">
          <div className="yt-tools">
            <div>
              <label className="yt-label" htmlFor="key">교사 비밀번호</label>
              <input id="key" type="password" className="yt-in" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
            </div>
            <div>
              <label className="yt-label" htmlFor="task">수행평가</label>
              <select id="task" className="yt-in" value={task} onChange={(e) => setTask(e.target.value as Task)}>
                <option>수행1</option><option>수행2</option><option>수행3</option><option>수행4</option>
              </select>
            </div>
            <button type="button" className="yt-btn2 main" onClick={() => void load()}>불러오기</button>
          </div>
          <div className="yt-tools" style={{ marginTop: 6 }}>
            <div>
              <label className="yt-label" htmlFor="cls">반</label>
              <select id="cls" className="yt-in" value={cls} onChange={(e) => setCls(e.target.value)}>
                <option value="">전체</option>
                {classes.map((c) => <option key={c} value={String(c)}>{c}반</option>)}
              </select>
            </div>
            <div style={{ flex: "3 1 240px" }}>
              <label className="yt-label" htmlFor="q">검색 (학번·이름·내용)</label>
              <input id="q" className="yt-in" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button type="button" className="yt-btn2" onClick={csv}>CSV 내려받기</button>
            <button type="button" className="yt-btn2" onClick={() => setOpen(!open)}>{open ? "모두 접기" : "모두 펼치기"}</button>
          </div>
          <p className="desc" style={{ marginTop: 10 }}>{msg} {rows.length > 0 && "· 표시 " + shown.length + "명"}</p>
        </div>
        {shown.map((r) => {
          const f = parse(r);
          return (
            <details key={r.student_id + (open ? "o" : "c")} className="yt-stu" open={open}>
              <summary>
                <b>{r.student_id} {r.name}</b>
                <span style={{ flex: "1 1 240px" }}>{f.find((x) => x.label === "내 주제")?.value ?? ""}</span>
                <span className="desc">최종 {r.last_at} · {r.count}회</span>
                <button type="button" className="yt-btn2" onClick={(e) => { e.preventDefault(); void navigator.clipboard.writeText(textOf(r)); }}>본문 복사</button>
              </summary>
              <div className="body">
                {f.map((x) => (
                  <div key={x.label} className="yt-fld">
                    <div className="k">{x.label}<span className="desc">{x.value.replace(/\s/g, "").length}자</span></div>
                    <div className="v">{x.value ? <Linkify text={x.value} /> : <span className="yt-empty">(비어 있음)</span>}</div>
                  </div>
                ))}
                {r.count > 1 && !hist[r.student_id] && <button type="button" className="yt-btn2" onClick={() => void loadHist(r.student_id)}>이전 제출본 보기 ({r.count}회 제출)</button>}
                {hist[r.student_id]?.map((h, i) => (
                  <details key={h.id} className="yt-hist">
                    <summary>{i === 0 ? "최신" : "이전"} 제출본 · {h.created_at} · {h.name}</summary>
                    {parse(h).map((x) => <div key={x.label} className="yt-fld"><div className="k">{x.label}</div><div className="v">{x.value ? <Linkify text={x.value} /> : <span className="yt-empty">(비어 있음)</span>}</div></div>)}
                  </details>
                ))}
              </div>
            </details>
          );
        })}
        {drafts.length > 0 && <h2 className="yt-subhead">제출하지 않고 작성만 한 기록 <span>{drafts.length}건 · 기기별 자동 백업</span></h2>}
        {drafts.map((d) => (
          <details key={d.device_id} className="yt-stu draft">
            <summary>
              <b>{d.student_id || "(학번 미입력)"} {d.name || "(이름 미입력)"}</b>
              <span style={{ flex: "1 1 240px" }}>{parse(d).find((x) => x.label === "내 주제")?.value ?? ""}</span>
              <span className="desc">마지막 저장 {d.updated_at} · 미제출</span>
            </summary>
            <div className="body">
              {parse(d).map((x) => (
                <div key={x.label} className="yt-fld"><div className="k">{x.label}</div><div className="v">{x.value ? <Linkify text={x.value} /> : <span className="yt-empty">(비어 있음)</span>}</div></div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
