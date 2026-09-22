import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { bindings } from "../bindings.server";

const TEACHER_HASH = "<교사 비밀번호의 SHA-256 해시 — 공개 저장소에는 올리지 않음>";
const TASKS = ["수행1", "수행2", "수행3", "수행4"] as const;
type Task = (typeof TASKS)[number];

// 과제별 제출 마감(한국 시간). 이 시각 이후에는 제출·임시저장이 서버에서 거부된다.
const DEADLINES: Partial<Record<Task, string>> = {
  수행1: "2026-09-22T19:00:00+09:00",
};
const DEADLINE_LABEL: Partial<Record<Task, string>> = {
  수행1: "9월 22일(화) 오후 7시",
};

function deadlineMs(task: Task) {
  const d = DEADLINES[task];
  return d ? Date.parse(d) : null;
}
function isClosed(task: Task) {
  const d = deadlineMs(task);
  return d !== null && Date.now() >= d;
}

function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkTeacher(key: string) {
  if ((await sha256(key)) !== TEACHER_HASH) throw new Error("교사 비밀번호가 맞지 않습니다.");
}

function db() {
  const { DB } = bindings();
  if (!DB) throw new Error("데이터베이스가 연결되지 않았습니다.");
  return DB;
}

const fieldsSchema = z.array(z.object({ label: z.string().max(60), value: z.string().max(20000) })).max(60);

export const getTaskStatus = createServerFn({ method: "POST" })
  .validator(z.object({ task: z.enum(TASKS) }))
  .handler(async ({ data }) => ({
    now: Date.now(),
    deadline: deadlineMs(data.task),
    deadlineLabel: DEADLINE_LABEL[data.task] ?? null,
    closed: isClosed(data.task),
  }));

export const submitWork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      task: z.enum(TASKS),
      studentId: z.string().regex(/^\d{5}$/),
      name: z.string().trim().min(1).max(20),
      fields: fieldsSchema,
    }),
  )
  .handler(async ({ data }) => {
    if (isClosed(data.task)) {
      throw new Error("제출이 마감되었습니다 (" + (DEADLINE_LABEL[data.task] ?? "마감") + "). 선생님께 문의하세요.");
    }
    const DB = db();
    const now = kstNow();
    const json = JSON.stringify(data.fields);
    const cls = Number(data.studentId.slice(1, 3));
    const num = Number(data.studentId.slice(3, 5));
    // 이력을 먼저 남긴다: 이후 단계가 실패해도 제출 원본은 보존된다.
    await DB.prepare(
      "INSERT INTO submission_log (task, student_id, name, fields_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
      .bind(data.task, data.studentId, data.name, json, now)
      .run();
    await DB.prepare(
      "INSERT INTO submissions (task, student_id, name, class_no, number_no, fields_json, first_at, last_at, count) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 1) ON CONFLICT(task, student_id) DO UPDATE SET name = excluded.name, class_no = excluded.class_no, number_no = excluded.number_no, fields_json = excluded.fields_json, last_at = excluded.last_at, count = submissions.count + 1",
    )
      .bind(data.task, data.studentId, data.name, cls, num, json, now)
      .run();
    const row = await DB.prepare("SELECT count FROM submissions WHERE task = ?1 AND student_id = ?2")
      .bind(data.task, data.studentId)
      .first<{ count: number }>();
    return { time: now, count: row?.count ?? 1 };
  });

// 작성 중인 내용을 기기별로 서버에 백업한다(다른 학생 기록을 덮어쓰지 않도록 기기 단위로 저장).
export const saveDraft = createServerFn({ method: "POST" })
  .validator(
    z.object({
      task: z.enum(TASKS),
      deviceId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
      studentId: z.string().max(10),
      name: z.string().max(20),
      fields: fieldsSchema,
      raw: z.string().max(120000),
    }),
  )
  .handler(async ({ data }) => {
    if (isClosed(data.task)) return { ok: false, closed: true, time: "" };
    const now = kstNow();
    await db()
      .prepare(
        "INSERT INTO drafts (task, device_id, student_id, name, fields_json, raw_json, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(task, device_id) DO UPDATE SET student_id = excluded.student_id, name = excluded.name, fields_json = excluded.fields_json, raw_json = excluded.raw_json, updated_at = excluded.updated_at",
      )
      .bind(data.task, data.deviceId, data.studentId, data.name, JSON.stringify(data.fields), data.raw, now)
      .run();
    return { ok: true, closed: false, time: now };
  });

export type SubmissionRow = {
  student_id: string;
  name: string;
  class_no: number;
  number_no: number;
  fields_json: string;
  first_at: string;
  last_at: string;
  count: number;
};

export type DraftRow = { device_id: string; student_id: string; name: string; fields_json: string; updated_at: string };
export type LogRow = { id: number; name: string; fields_json: string; created_at: string };

export const listSubmissions = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().max(200), task: z.enum(TASKS) }))
  .handler(async ({ data }) => {
    await checkTeacher(data.key);
    const res = await db()
      .prepare(
        "SELECT student_id, name, class_no, number_no, fields_json, first_at, last_at, count FROM submissions WHERE task = ?1 ORDER BY student_id",
      )
      .bind(data.task)
      .all<SubmissionRow>();
    return { rows: res.results ?? [] };
  });

// 제출하지 않고 작성만 해 둔 기록(학번 기준으로 제출본이 없는 것만)
export const listDrafts = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().max(200), task: z.enum(TASKS) }))
  .handler(async ({ data }) => {
    await checkTeacher(data.key);
    const res = await db()
      .prepare(
        "SELECT d.device_id, d.student_id, d.name, d.fields_json, d.updated_at FROM drafts d WHERE d.task = ?1 AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task = d.task AND s.student_id = d.student_id) ORDER BY d.student_id, d.updated_at DESC",
      )
      .bind(data.task)
      .all<DraftRow>();
    return { rows: res.results ?? [] };
  });

export const listHistory = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().max(200), task: z.enum(TASKS), studentId: z.string().regex(/^\d{5}$/) }))
  .handler(async ({ data }) => {
    await checkTeacher(data.key);
    const res = await db()
      .prepare("SELECT id, name, fields_json, created_at FROM submission_log WHERE task = ?1 AND student_id = ?2 ORDER BY id DESC")
      .bind(data.task, data.studentId)
      .all<LogRow>();
    return { rows: res.results ?? [] };
  });
