import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import "@/components/site/site.css";
import { getTaskStatus, saveDraft, submitWork } from "@/lib/api/submissions.functions";

export const Route = createFileRoute("/s1")({
  head: () => ({ meta: [{ title: "수행평가 1 제출 · 역탐현" }] }),
  component: S1,
});

const TASK = "수행1" as const;
const DRAFT = "yth-draft-s1";
const BACKUP = "yth-draft-s1-backup";
const SUBMITTED = "yth-submitted-s1";
const DEVICE = "yth-device";
type V = Record<string, string | boolean>;
const TOPICS = "인문·어문|언어 소멸|19세기 제국주의 교육 정책이 식민지 언어를 학교에서 몰아내며 시작;인문·어문|역사 교과서 갈등|1982년 일본 교과서 검정 파동이 동아시아 역사 인식 문제를 공론화;인문·어문|문화재 반환|1970년 유네스코 협약 이전에 반출된 문화재는 협약 적용을 받지 못함;사회·경제|국가 간 빈부 격차|1944년 브레턴우즈 체제가 승전국 중심으로 국제 금융 질서를 설계;사회·경제|청년 실업|1970년대 두 차례 석유 파동 이후 선진국 고용 구조가 바뀜;사회·경제|공급망 불안|1990년대 세계화로 생산이 국경을 넘어 분산되며 취약점도 함께 퍼짐;법·행정|난민 심사|1951년 난민협약은 유럽 실향민만을 대상으로 출발;법·행정|전쟁 범죄 처벌|1945년 뉘른베르크 재판이 '인도에 반한 죄'를 처음으로 적용;법·행정|과거사 청산|1995년 남아프리카공화국 진실화해위원회가 처벌 대신 진실 규명을 택함;교육|교육 격차|1960년대 신생 독립국의 교육 제도가 식민지 시기 틀 위에 세워짐;교육|다문화 학생 지원|1960년대 서유럽 초청노동자 정책이 노동자의 정주를 예상하지 않음;교육|역사 부정론 대응|1990년대 이후 홀로코스트 부정론 확산에 여러 나라가 법으로 대응;자연·환경|기후 변화|1992년 리우 기후변화협약이 감축 의무를 선진국에만 지움;자연·환경|플라스틱 폐기물|1950년대 대량 소비 사회가 일회용 포장을 일상으로 만듦;자연·환경|원전 안전|1986년 체르노빌 사고가 국경을 넘는 방사능 문제를 드러냄;공학·기술|인공지능 편향|컴퓨터 개발이 특정 국가·집단 중심으로 이뤄져 자료가 한쪽으로 쏠림;공학·기술|디지털 격차|1990년대 인터넷 확산이 기존 기반 시설 격차를 그대로 옮겨 놓음;공학·기술|우주 쓰레기|1957년 스푸트니크 이후 궤도 사용 규칙 없이 발사 경쟁이 벌어짐;의약·보건|백신 불평등|1990년대 의약품 특허가 국제 무역 규범에 편입되며 가격 장벽이 생김;의약·보건|감염병 대응|1948년 세계보건기구 설립 이후에도 각국 주권이 방역보다 앞섬;의약·보건|정신 건강|1960년대 서구의 탈시설화가 대체 돌봄 체계 없이 진행됨;예술·체육|스포츠와 정치|1936년 베를린 올림픽이 국가 선전 무대로 이용됨;예술·체육|대중문화 획일화|전후 미국 대중문화가 방송·영화 시장을 통해 세계로 확산;예술·체육|기념 조형물 논쟁|식민지·노예제 관련 동상 철거를 둘러싸고 기억 갈등이 이어짐".split(";").map((r) => r.split("|"));

const CHECKS = [
  "주제를 진로·관심과 연결했고, 왜 골랐는지를 구체적으로 적었는가",
  "자료를 2개 이상 썼고, 둘 다 출처를 적었는가",
  "두 자료가 어떻게 맞물리는지까지 서술했는가",
  "과제가 현대 세계와 내 진로 분야에 미치는 영향을 분석했는가",
  "기원(과거)·해결(현재)·실천(미래) 세 갈래 탐구 질문을 모두 세웠는가",
  "전재란 두 곳(주제·세 질문)을 빠짐없이 채웠는가",
];

const SOFT: [string, string][] = [
  ["career", "내 진로·관심"], ["boxA", "칸 A"], ["boxB", "칸 B"], ["src1", "자료 1 출처"], ["src2", "자료 2 출처"],
  ["boxC", "칸 C 영향 분석"], ["qPast", "기원 — 과거"], ["qPresent", "해결 — 현재"], ["qFuture", "실천 — 미래"],
];

const PARTS: { id: string; label: string; keys: string[] }[] = [
  { id: "p-who", label: "제출자", keys: ["sid", "name"] },
  { id: "p-star", label: "주제·진로", keys: ["topic", "career"] },
  { id: "p-a", label: "칸 A", keys: ["boxA"] },
  { id: "p-b", label: "칸 B", keys: ["boxB", "src1", "src2"] },
  { id: "p-c", label: "칸 C", keys: ["boxC"] },
  { id: "p-q", label: "세 질문", keys: ["qPast", "qPresent", "qFuture"] },
  { id: "p-ai", label: "AI 기록", keys: [] },
];

function str(v: V, k: string) {
  return typeof v[k] === "string" ? (v[k] as string) : "";
}
function aiRecordOf(v: V) {
  if (v.aiNone === true) return "사용 안 함";
  return ["1", "2", "3"].map((n, i) => {
    const tool = str(v, "ai" + n + "Tool").trim(), q = str(v, "ai" + n + "Q").trim(), r = str(v, "ai" + n + "R").trim();
    return !tool && !q && !r ? "" : "①②③"[i] + " [" + (tool || "AI 미기재") + "]\n질문: " + q + "\n반영: " + r;
  }).filter(Boolean).join("\n\n");
}
function linksOf(v: V) {
  return str(v, "aiLinks").split(/\s+/).filter(Boolean);
}
function fieldsOf(v: V) {
  const n = CHECKS.filter((_, i) => v["chk" + i] === true).length;
  return [
    ["내 주제", str(v, "topic")], ["내 진로·관심", str(v, "career")], ["칸A 주제 선정 이유", str(v, "boxA")],
    ["칸B 실태(두 자료의 맞물림)", str(v, "boxB")], ["칸B 자료1 출처", str(v, "src1")], ["칸B 자료2 출처", str(v, "src2")],
    ["칸C 영향 분석", str(v, "boxC")], ["질문 기원(과거)", str(v, "qPast")], ["질문 해결(현재)", str(v, "qPresent")], ["질문 실천(미래)", str(v, "qFuture")],
    ["자기점검", n + "/6\n" + CHECKS.map((c, i) => (v["chk" + i] === true ? "☑ " : "☐ ") + c).join("\n")],
    ["AI 사용 기록", aiRecordOf(v)], ["AI 공유 링크", v.aiNone === true ? "" : linksOf(v).join("\n")],
  ].map(([label, value]) => ({ label, value }));
}
function lsGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function lsSet(k: string, val: string) {
  try { localStorage.setItem(k, val); } catch { /* 저장 공간이 막힌 기기: 서버 백업으로 보완 */ }
}
function fmtLeft(ms: number) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
  return h > 0 ? h + "시간 " + (m % 60) + "분" : m > 0 ? m + "분" : Math.ceil(ms / 1000) + "초";
}

function S1() {
  const [v, setV] = useState<V>({});
  const [ready, setReady] = useState(false);
  const [bad, setBad] = useState<string[]>([]);
  const [st, setSt] = useState<{ msg: string; kind?: string }>({ msg: "쓰는 동안 이 기기와 서버에 자동으로 저장됩니다." });
  const [busy, setBusy] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [deadline, setDeadline] = useState<{ at: number | null; label: string | null; offset: number }>({ at: null, label: null, offset: 0 });
  const [now, setNow] = useState(0);
  const vRef = useRef(v);
  const dirty = useRef(false);
  const device = useRef("");

  useEffect(() => {
    let d = lsGet(DEVICE);
    if (!d) { d = "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10); lsSet(DEVICE, d); }
    device.current = d;
    try {
      const saved = JSON.parse(lsGet(DRAFT) || "null");
      if (saved && typeof saved === "object") { setV(saved); setSt({ msg: "이 기기에 저장된 내용을 불러왔습니다." }); }
    } catch { /* 손상된 임시저장은 백업 키에서 복구 */
      try { const b = JSON.parse(lsGet(BACKUP) || "null"); if (b) setV(b); } catch { /* ignore */ }
    }
    setSubmittedAt(lsGet(SUBMITTED) || "");
    setReady(true);
    getTaskStatus({ data: { task: TASK } })
      .then((s) => setDeadline({ at: s.deadline, label: s.deadlineLabel, offset: s.now - Date.now() }))
      .catch(() => { /* 마감 정보를 못 받아도 서버가 최종 판정 */ });
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const serverNow = now + deadline.offset;
  const closed = deadline.at !== null && now > 0 && serverNow >= deadline.at;
  const left = deadline.at !== null ? deadline.at - serverNow : null;

  const saveLocal = useCallback(() => {
    const json = JSON.stringify(vRef.current);
    lsSet(DRAFT, json);
    lsSet(BACKUP, json);
  }, []);

  const saveServer = useCallback(async () => {
    if (!dirty.current || !device.current) return;
    const cur = vRef.current;
    dirty.current = false;
    try {
      const out = await saveDraft({ data: { task: TASK, deviceId: device.current, studentId: str(cur, "sid").slice(0, 10), name: str(cur, "name").slice(0, 20), fields: fieldsOf(cur), raw: JSON.stringify(cur) } });
      if (out.ok) setSavedAt(out.time.slice(11, 16));
    } catch {
      dirty.current = true; // 다음 주기에 다시 시도
    }
  }, []);

  useEffect(() => {
    vRef.current = v;
    if (!ready) return;
    dirty.current = true;
    const t = setTimeout(saveLocal, 300);
    return () => clearTimeout(t);
  }, [v, ready, saveLocal]);

  useEffect(() => {
    const t = setInterval(() => { if (!closed) void saveServer(); }, 15000);
    const onHide = () => { saveLocal(); if (!closed) void saveServer(); };
    const onVis = () => { if (document.visibilityState === "hidden") onHide(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", onHide); };
  }, [closed, saveLocal, saveServer]);

  // 마감 10초 전에 마지막 서버 백업
  const finalSaved = useRef(false);
  useEffect(() => {
    if (left !== null && left > 0 && left < 10000 && !finalSaved.current) { finalSaved.current = true; dirty.current = true; void saveServer(); }
  }, [left, saveServer]);

  const s = (k: string) => str(v, k);
  const set = (k: string, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));
  const cls = (k: string) => "yt-in" + (bad.includes(k) ? " bad" : "");
  const R = <span className="req">*</span>;
  const aiNone = v.aiNone === true;
  const partDone = (p: (typeof PARTS)[number]) => p.id === "p-ai" ? (aiNone || (aiRecordOf(v) !== "" && linksOf(v).length > 0)) : p.keys.every((k) => s(k).trim() !== "");

  const T = (k: string, label: ReactNode, tall?: boolean, max = 3000, ph?: string) => (
    <>
      <label className="yt-label" htmlFor={k}>{label}</label>
      <textarea id={k} className={cls(k) + (tall ? " tall" : "")} maxLength={max} placeholder={ph} value={s(k)} onChange={(e) => set(k, e.target.value)} />
      <div className="yt-count">{s(k).replace(/\s/g, "").length}자 (공백 제외)</div>
    </>
  );
  const I = (k: string, label: ReactNode, ph?: string, max = 400) => (
    <>
      <label className="yt-label" htmlFor={k}>{label}</label>
      <input id={k} className={cls(k)} maxLength={max} placeholder={ph} value={s(k)} onChange={(e) => set(k, e.target.value)} />
    </>
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (closed) return setSt({ msg: "제출이 마감되었습니다.", kind: "err" });
    const sid = s("sid").trim(), name = s("name").trim();
    if (!/^\d{5}$/.test(sid)) { setBad(["sid"]); return setSt({ msg: "학번 5자리를 숫자로 적어 주세요. (예: 20315)", kind: "err" }); }
    if (!name) { setBad(["name"]); return setSt({ msg: "이름을 적어 주세요.", kind: "err" }); }
    if (!s("topic").trim()) { setBad(["topic"]); return setSt({ msg: "'내 주제'는 꼭 적어야 제출할 수 있습니다.", kind: "err" }); }
    if (!aiNone) {
      if (!aiRecordOf(v)) return setSt({ msg: "AI를 쓰지 않았다면 'AI 사용 안 함'에 체크하고, 썼다면 사용 기록을 적어 주세요.", kind: "err" });
      const l = linksOf(v);
      if (!l.length) { setBad(["aiLinks"]); return setSt({ msg: "AI 대화 공유 링크를 붙여 넣어 주세요.", kind: "err" }); }
      const wrong = l.find((u) => !/^https?:\/\/\S+\.\S+/.test(u));
      if (wrong) { setBad(["aiLinks"]); return setSt({ msg: "링크 형식이 올바르지 않습니다: " + wrong, kind: "err" }); }
    }
    const empty = SOFT.filter(([k]) => !s(k).trim());
    setBad(empty.map(([k]) => k));
    if (empty.length && !window.confirm("아직 비어 있는 칸이 있습니다:\n- " + empty.map((x) => x[1]).join("\n- ") + "\n\n빈 칸은 감점될 수 있습니다. 그래도 제출할까요?")) return setSt({ msg: "빈 칸을 채운 뒤 다시 제출하세요.", kind: "err" });
    if (!window.confirm(sid + " " + name + " 학생으로 제출합니다.\n같은 학번으로 다시 제출하면 마지막 제출본으로 바뀝니다(이전 제출본도 선생님께 남습니다).")) return;
    saveLocal();
    setBusy(true);
    setSt({ msg: "제출 중입니다… 창을 닫지 마세요." });
    try {
      const out = await submitWork({ data: { task: TASK, studentId: sid, name, fields: fieldsOf(v) } });
      lsSet(SUBMITTED, out.time);
      setSubmittedAt(out.time);
      setSt({ msg: "✔ 제출 완료 (" + out.time + ", " + out.count + "번째 제출). 내용은 이 화면에 그대로 남아 있습니다.", kind: "ok" });
      window.alert("제출되었습니다.\n" + sid + " " + name + "\n" + out.time + " · " + out.count + "번째 제출");
    } catch (err) {
      setSt({ msg: "제출 실패: " + (err instanceof Error ? err.message : "오류") + " — 쓴 내용은 안전하게 저장되어 있습니다. 새로고침(F5) 후 다시 제출하세요.", kind: "err" });
    } finally { setBusy(false); }
  }

  return (
    <main className="yt yt-page">
      <header className="yt-head">
        <Link to="/" className="yt-back">← 처음으로</Link>
        <div className="quote">역사는 과거와 현재의 끊임없는 대화이다. E. H. 카</div>
        <h1><span className="n">1</span>현대 세계의 과제 탐구하기</h1>
        <p>탐구 주제 선정서. 워크북에 쓴 내용을 칸마다 그대로 옮겨 적는다.</p>
        <p>여기서 정한 주제로 남은 세 번의 수행평가를 모두 치른다.</p>
        {deadline.label && <p className={"yt-due" + (closed ? " off" : "")}>{closed ? "제출 마감됨" : "제출 마감"} · {deadline.label}{!closed && left !== null && left > 0 ? " · 남은 시간 " + fmtLeft(left) : ""}</p>}
      </header>
      {closed && (
        <div className="yt-sheet"><div className="yt-closed">
          <b>수행평가 1은 제출이 마감되었습니다.</b> 더 이상 작성하거나 제출할 수 없습니다.
          {submittedAt ? " 이 기기에서 마지막으로 제출한 시각: " + submittedAt : ""} 제출된 내용과 작성 중이던 내용은 모두 선생님께 보관되어 있습니다.
        </div></div>
      )}
      {!closed && submittedAt && <div className="yt-sheet"><div className="yt-done">이 기기에서 {submittedAt}에 제출했습니다. 고쳐서 다시 제출하면 마지막 제출본으로 바뀝니다.</div></div>}
      <nav className="yt-rail" aria-label="작성 진행">
        {PARTS.map((p) => <a key={p.id} href={"#" + p.id} className={partDone(p) ? "done" : ""}>{partDone(p) ? "✓ " : ""}{p.label}</a>)}
      </nav>
      <form className="yt-sheet" onSubmit={onSubmit} autoComplete="off" noValidate>
       <fieldset disabled={closed} className="yt-fs">
        <div className="yt-card">
          <h2>평가요소 <span className="pts">25점</span></h2>
          <table className="yt-table"><tbody>
            <tr><th>평가요소</th><th>배점</th><th>만점을 받으려면</th></tr>
            <tr><td>진로와 연계하여 탐구 주제를 선정하기</td><td>10</td><td>현대 세계의 과제를 자신의 진로·관심과 밀접하게 연결하고, 선정 이유(진로 관련성, 탐구 가치)를 구체적으로 밝혔는가</td></tr>
            <tr><td>현대 세계 과제의 실태를 자료로 파악하기</td><td>8</td><td>신뢰할 수 있는 자료를 2개 이상 활용해 실태와 심각성을 구체적으로 파악하고 출처를 명기했는가</td></tr>
            <tr><td>자료를 분석하여 탐구의 방향을 수립하기</td><td>7</td><td>과제가 현대 세계와 내 진로 분야에 미치는 영향을 분석하고, 기원(과거)–해결 노력(현재)–실천(미래)을 잇는 탐구 질문을 세웠는가</td></tr>
          </tbody></table>
        </div>
        <div className="yt-card" id="p-who">
          <h2>제출자</h2>
          <div className="yt-row2">
            <div>{I("sid", <>학번{R} <span className="sub">5자리 (예: 20315)</span></>, "20315", 5)}</div>
            <div>{I("name", <>이름{R}</>, undefined, 20)}</div>
          </div>
        </div>
        <div className="yt-card star" id="p-star">
          <h2>☆ 여기서 정한 것이 학기 끝까지 간다</h2>
          {T("topic", <>내 주제{R}</>, false, 500)}
          {T("career", <>내 진로·관심{R}</>, false, 500)}
          <p className="desc">워크북 2는 이 주제의 기원을 사료로 캐고, 워크북 3은 해결 노력의 한계를 따지며, 워크북 4는 그 둘을 근거로 실천 방안을 만든다.</p>
        </div>
        <div className="yt-card" id="p-a">
          <h2><span className="kan">칸 A</span>나는 이 주제를 왜 골랐나 <span className="pts">10점</span></h2>
          <p className="desc">점수를 가른 것은 주제가 아니라 '왜 골랐는지'다.</p>
          <details className="yt-ref"><summary>[자료] 진로 계열별 탐구 주제와 역사적 기원</summary><div className="in">
            <table className="yt-table"><tbody>
              <tr><th>진로 계열</th><th>탐구 주제</th><th>역사적 기원</th></tr>
              {TOPICS.map((r) => <tr key={r[1]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}
            </tbody></table>
          </div></details>
          <details className="yt-ref"><summary>[예시] 우수 10점 답안</summary><div className="in">
            <p>간호학과를 지망한다. 실습 견학에서 건강보험 자격이 없어 응급실만 반복해 찾는 이주민 이야기를 들었다. 백신 불평등을 주제로 삼은 이유는, 국경 밖 의약품 접근 문제가 국경 안 의료 접근 문제와 같은 구조를 갖고 있는지 확인하고 싶어서다.</p>
            <p>보통 8점: 진로와 연결은 했으나 '왜 하필 이 주제인지'가 일반적. 미흡 4점: 진로·관심과의 연결 없이 주제만 적음.</p>
          </div></details>
          {T("boxA", <>내 주제 / 내 진로·관심 / 이 주제를 고른 이유 — 셋을 모두 적는다.{R}</>, true)}
          <div className="yt-hint">막히면 이렇게 시작해 본다. 나는 (　　)을(를) 지망한다. (　　)에서 (　　)을(를) 보고, (　　)이(가) 궁금해졌다.</div>
        </div>
        <div className="yt-card" id="p-b">
          <h2><span className="kan">칸 B</span>지금 이 문제는 어떤 상태인가 <span className="pts">8점</span></h2>
          <p className="desc">점수를 가른 것은 자료의 개수가 아니라 출처와 맞물림이다. 누가·언제 만들었고, 원래 자료까지 거슬러 갈 수 있는지 확인한다.</p>
          {T("boxB", <>자료 두 개를 쓰고, 두 자료가 어떻게 맞물리는지까지 적는다.{R}</>, true)}
          <div className="yt-row2">
            <div>{I("src1", <>(자료 1) 출처{R}</>, "예: UNHCR, 『Global Trends Report 2024』")}</div>
            <div>{I("src2", <>(자료 2) 출처{R}</>, "예: 법무부, 『출입국·외국인정책 통계연보』")}</div>
          </div>
        </div>
        <div className="yt-card" id="p-c">
          <h2><span className="kan">칸 C</span>나는 무엇을 물을 것인가 <span className="pts">7점</span></h2>
          <p className="desc">막연한 관심은 질문이 아니다. 세 갈래로 쪼개야 학기 내내 파고들 수 있다.</p>
          {T("boxC", <>이 과제는 현대 세계와 내 진로 분야에 어떤 영향을 미치는가.{R}</>)}
        </div>
        <div className="yt-card star" id="p-q">
          <h2>◆ 워크북 2·3·4로 그대로 가져갈 세 질문</h2>
          {T("qPast", <>기원 — 과거{R}</>, false, 600)}
          {T("qPresent", <>해결 — 현재{R}</>, false, 600)}
          {T("qFuture", <>실천 — 미래{R}</>, false, 600)}
        </div>
        <div className="yt-card">
          <h2>내고 나서 — 스스로 점검하기</h2>
          <p className="desc">채점기준을 그대로 옮긴 것이다. 체크가 비면 그 항목에서 점수가 깎인다.</p>
          {CHECKS.map((c, i) => <label key={c} className="yt-check"><input type="checkbox" checked={v["chk" + i] === true} onChange={(e) => set("chk" + i, e.target.checked)} /> {c}</label>)}
        </div>
        <div className="yt-card" id="p-ai">
          <h2>AI를 썼다면 여기에 남긴다</h2>
          <p className="desc">남기지 않고 낸 내용은 채점에서 빠질 수 있다. 쓰지 않았으면 '사용 안 함'에 체크한다.</p>
          <label className="yt-check"><input type="checkbox" checked={aiNone} onChange={(e) => set("aiNone", e.target.checked)} /> <b>AI 사용 안 함</b></label>
          {!aiNone && <>
            {["1", "2", "3"].map((n, i) => (
              <div key={n} className="yt-ai">
                {I("ai" + n + "Tool", <>{"①②③"[i]} 사용한 AI</>, "예: ChatGPT, Gemini, Claude, 뤼튼", 60)}
                {T("ai" + n + "Q", "질문한 내용", false, 1500)}
                {T("ai" + n + "R", <>반영 <span className="sub">답변 중 무엇을, 어떻게 반영(또는 버림)했는가</span></>, false, 1500)}
              </div>
            ))}
            {T("aiLinks", <>AI 대화 공유 링크{R} <span className="sub">한 줄에 하나씩. AI의 '공유' 버튼으로 만든 링크</span></>, false, 2000, "https://chatgpt.com/share/...")}
          </>}
        </div>
       </fieldset>
        <div className="yt-bar">
          <button type="submit" className="yt-submit" disabled={busy || closed}>{closed ? "마감됨" : submittedAt ? "다시 제출하기" : "제출하기"}</button>
          <span className={"yt-status" + (st.kind ? " " + st.kind : "")}>{st.msg}{savedAt && !st.kind ? " · 서버 백업 " + savedAt : ""}</span>
        </div>
      </form>
    </main>
  );
}
