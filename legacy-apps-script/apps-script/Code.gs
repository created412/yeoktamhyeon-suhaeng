/**
 * 역탐현 수행평가 제출 서버 (Google Apps Script)
 * - 구글 시트에서 [확장 프로그램] → [Apps Script]로 열어 이 코드를 붙여 넣는다.
 * - 수행평가마다 시트 탭(수행1~수행4)이 자동으로 생기고, 학번당 한 줄(마지막 제출본)이 유지된다.
 * - 모든 제출은 '제출기록' 탭에 원본 그대로 쌓인다(덮어쓰기 없음).
 * - 첨부 파일은 내 드라이브의 '역탐현 수행평가 첨부/수행N' 폴더에 저장된다.
 */

// ▼ 교사용 열람 페이지(teacher.html)에서 쓸 비밀번호. 꼭 바꾸세요.
const TEACHER_KEY = '여기에-비밀번호를-바꿔-적으세요';

const ROOT_FOLDER = '역탐현 수행평가 첨부';
const BASE_HEADERS = ['학번', '이름', '반', '번호', '최초 제출', '최종 제출', '제출 횟수'];
const FILE_HEADER = '첨부 파일';
const LOG_SHEET = '제출기록';
const TZ = 'Asia/Seoul';

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: '요청 형식 오류' });
  }
  try {
    if (req.action === 'list') return json_(list_(req));
    if (req.action === 'tasks') return json_(tasks_(req));
    if (req.action === 'submit') {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try { return json_(submit_(req)); } finally { lock.releaseLock(); }
    }
    return json_({ ok: false, error: '알 수 없는 요청' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doGet() {
  return json_({ ok: true, message: '역탐현 수행평가 제출 서버가 작동 중입니다.' });
}

function submit_(req) {
  const task = String(req.task || '').trim();
  if (!/^수행[1-4]$/.test(task)) throw new Error('수행평가 구분이 올바르지 않습니다.');
  const sid = String(req.studentId || '').trim();
  if (!/^\d{5}$/.test(sid)) throw new Error('학번은 5자리 숫자여야 합니다.');
  const name = String(req.name || '').trim().slice(0, 20);
  if (!name) throw new Error('이름이 비어 있습니다.');
  const fields = (req.fields || []).slice(0, 60).map(f => ({
    label: String(f.label).slice(0, 60),
    value: String(f.value == null ? '' : f.value).slice(0, 20000)
  }));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(task);
  if (!sh) {
    sh = ss.insertSheet(task);
    const headers = BASE_HEADERS.concat(fields.map(f => f.label), [FILE_HEADER]);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8eef6');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(2);
    sh.getRange('A:A').setNumberFormat('@');
  }

  // 새 항목이 생기면 열을 뒤에 덧붙인다.
  let headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  fields.forEach(f => {
    if (headers.indexOf(f.label) === -1) {
      sh.getRange(1, headers.length + 1).setValue(f.label).setFontWeight('bold').setBackground('#e8eef6');
      headers.push(f.label);
    }
  });

  // 기존 행 찾기(학번 기준)
  let rowIdx = -1;
  const last = sh.getLastRow();
  let old = null;
  if (last >= 2) {
    const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === sid) { rowIdx = i + 2; break; }
    }
    if (rowIdx > 0) old = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  }

  const now = new Date();
  const nowStr = Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm:ss');
  const col = h => headers.indexOf(h);
  const count = old ? (Number(old[col('제출 횟수')]) || 1) + 1 : 1;

  let fileCell = old ? old[col(FILE_HEADER)] : '';
  if (req.file && req.file.data) {
    const f = saveFile_(task, sid, name, req.file, now);
    fileCell = f;
  }

  const row = headers.map((h, i) => (old ? old[i] : ''));
  row[col('학번')] = sid;
  row[col('이름')] = name;
  row[col('반')] = Number(sid.slice(1, 3));
  row[col('번호')] = Number(sid.slice(3, 5));
  row[col('최초 제출')] = old && old[col('최초 제출')] ? old[col('최초 제출')] : nowStr;
  row[col('최종 제출')] = nowStr;
  row[col('제출 횟수')] = count;
  row[col(FILE_HEADER)] = fileCell;
  fields.forEach(f => { row[col(f.label)] = safe_(f.value); });

  if (rowIdx > 0) {
    sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
    rowIdx = sh.getLastRow();
  }
  sh.getRange(rowIdx, 1, 1, row.length).setVerticalAlignment('top');

  // 원본 기록(덮어쓰지 않음)
  let log = ss.getSheetByName(LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET);
    log.appendRow(['제출 시각', '수행평가', '학번', '이름', '첨부', '내용(JSON)']);
    log.setFrozenRows(1);
    log.getRange('C:C').setNumberFormat('@');
  }
  log.appendRow([nowStr, task, sid, name, fileCell && req.file ? fileCell : '',
    JSON.stringify(fields).slice(0, 49000)]);

  return { ok: true, time: nowStr, count: count };
}

function saveFile_(task, sid, name, file, now) {
  const b64 = String(file.data);
  if (b64.length > 14 * 1024 * 1024) throw new Error('첨부 파일이 너무 큽니다(10MB 이하).');
  const ext = (String(file.name).match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0].toLowerCase();
  const allowed = ['.hwp', '.hwpx', '.pdf', '.docx'];
  if (allowed.indexOf(ext) === -1) throw new Error('hwp, hwpx, pdf, docx 파일만 올릴 수 있습니다.');
  const stamp = Utilities.formatDate(now, TZ, 'MMdd_HHmm');
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), file.mime || 'application/octet-stream',
    task + '_' + sid + '_' + name + '_' + stamp + ext);
  const created = taskFolder_(task).createFile(blob);
  return created.getUrl();
}

function taskFolder_(task) {
  const props = PropertiesService.getScriptProperties();
  let rootId = props.getProperty('ROOT_FOLDER_ID');
  let root = null;
  if (rootId) { try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; } }
  if (!root) {
    root = DriveApp.createFolder(ROOT_FOLDER);
    props.setProperty('ROOT_FOLDER_ID', root.getId());
  }
  const it = root.getFoldersByName(task);
  return it.hasNext() ? it.next() : root.createFolder(task);
}

function checkKey_(req) {
  if (!req.key || String(req.key) !== TEACHER_KEY || TEACHER_KEY.indexOf('여기에') === 0) {
    throw new Error('교사 비밀번호가 맞지 않습니다.');
  }
}

function tasks_(req) {
  checkKey_(req);
  const names = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName())
    .filter(n => /^수행[1-4]$/.test(n)).sort();
  return { ok: true, tasks: names };
}

function list_(req) {
  checkKey_(req);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(String(req.task || ''));
  if (!sh || sh.getLastRow() < 1) return { ok: true, headers: [], rows: [] };
  const values = sh.getDataRange().getDisplayValues();
  return { ok: true, headers: values[0], rows: values.slice(1) };
}

// 시트 수식 주입 방지
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 배포 전에 한 번 실행해서 드라이브·시트 권한을 승인해 두는 용도
function authorize() {
  SpreadsheetApp.getActiveSpreadsheet().getName();
  taskFolder_('수행1');
}
