// 수행평가 제출 공통 스크립트 — 임시저장, 글자 수, 검증, 전송
(function () {
  const CFG = window.APP_CONFIG || {};

  function draftKey(task) { return "yth-draft-" + task; }

  function saveDraft(form, task) {
    const data = {};
    form.querySelectorAll("[name]").forEach(el => {
      if (el.type === "file") return;
      data[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    try { localStorage.setItem(draftKey(task), JSON.stringify(data)); } catch (e) {}
  }

  function loadDraft(form, task) {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(draftKey(task)) || "null"); } catch (e) {}
    if (!data) return false;
    form.querySelectorAll("[name]").forEach(el => {
      if (!(el.name in data) || el.type === "file") return;
      if (el.type === "checkbox") el.checked = !!data[el.name];
      else el.value = data[el.name];
    });
    return true;
  }

  function clearDraft(task) { try { localStorage.removeItem(draftKey(task)); } catch (e) {} }

  function bindCounters(form) {
    form.querySelectorAll("textarea").forEach(ta => {
      const c = document.createElement("div");
      c.className = "counter";
      ta.after(c);
      const upd = () => { c.textContent = ta.value.replace(/\s/g, "").length + "자 (공백 제외)"; };
      ta.addEventListener("input", upd);
      upd();
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = "status" + (kind ? " " + kind : "");
  }

  // opts: { task, form, collect(): fields[], required: [{el,label}], soft: [{el,label}], fileInput }
  window.initSubmitPage = function (opts) {
    const { task, form } = opts;
    const status = document.getElementById("status");
    const btn = document.getElementById("submitBtn");

    if (!CFG.SCRIPT_URL) {
      const b = document.createElement("div");
      b.className = "banner";
      b.textContent = "⚠ 아직 제출 서버가 연결되지 않았습니다. 선생님께 알려 주세요. (config.js의 SCRIPT_URL 비어 있음)";
      form.prepend(b);
    }

    if (loadDraft(form, task)) setStatus(status, "이 기기에 임시저장된 내용을 불러왔습니다.");
    bindCounters(form);
    if (opts.afterLoad) opts.afterLoad();

    let t;
    form.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => saveDraft(form, task), 400);
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      if (!confirm("이 기기에 적힌 내용을 모두 지웁니다. 계속할까요?")) return;
      form.reset();
      clearDraft(task);
      form.querySelectorAll("textarea").forEach(ta => ta.dispatchEvent(new Event("input")));
      clearDraft(task);
      if (opts.afterLoad) opts.afterLoad();
      setStatus(status, "지웠습니다.");
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      form.querySelectorAll(".invalid").forEach(x => x.classList.remove("invalid"));

      const sid = form.studentId.value.trim();
      const name = form.studentName.value.trim();
      if (!/^\d{5}$/.test(sid)) {
        form.studentId.classList.add("invalid"); form.studentId.focus();
        return setStatus(status, "학번 5자리를 숫자로 적어 주세요. (예: 20315)", "err");
      }
      if (!name) {
        form.studentName.classList.add("invalid"); form.studentName.focus();
        return setStatus(status, "이름을 적어 주세요.", "err");
      }
      for (const r of (opts.required || [])) {
        if (!r.el.value.trim()) {
          r.el.classList.add("invalid"); r.el.focus();
          return setStatus(status, "'" + r.label + "'은(는) 꼭 적어야 제출할 수 있습니다.", "err");
        }
      }
      const extra = opts.validate ? opts.validate() : null;
      if (extra) return setStatus(status, extra, "err");

      const empty = (opts.soft || []).filter(r => !r.el.value.trim());
      empty.forEach(r => r.el.classList.add("invalid"));
      if (empty.length && !confirm("아직 비어 있는 칸이 있습니다:\n- " + empty.map(r => r.label).join("\n- ") + "\n\n빈 칸은 감점될 수 있습니다. 그래도 제출할까요?")) {
        empty[0].el.focus();
        return setStatus(status, "빈 칸을 채운 뒤 다시 제출하세요.", "err");
      }

      if (!CFG.SCRIPT_URL) return setStatus(status, "제출 서버가 아직 연결되지 않았습니다. 선생님께 알려 주세요.", "err");

      let file = null;
      const fi = opts.fileInput;
      if (fi && fi.files && fi.files[0]) {
        const f = fi.files[0];
        const max = (CFG.MAX_FILE_MB || 10) * 1024 * 1024;
        if (f.size > max) return setStatus(status, "첨부 파일은 " + (CFG.MAX_FILE_MB || 10) + "MB 이하만 올릴 수 있습니다.", "err");
        file = { name: f.name, mime: f.type || "application/octet-stream", data: await readFile(f) };
      }

      if (!confirm(sid + " " + name + " 학생으로 제출합니다.\n같은 학번으로 다시 제출하면 마지막 제출본으로 바뀝니다.")) return;

      btn.disabled = true;
      setStatus(status, "제출 중입니다… 창을 닫지 마세요.");
      try {
        const res = await fetch(CFG.SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "submit", task, studentId: sid, name, fields: opts.collect(), file })
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || "알 수 없는 오류");
        clearDraft(task);
        if (fi) fi.value = "";
        setStatus(status, "✔ 제출 완료 (" + out.time + ", " + out.count + "번째 제출)", "ok");
        alert("제출되었습니다.\n" + sid + " " + name + "\n" + out.time + " · " + out.count + "번째 제출");
      } catch (e) {
        saveDraft(form, task);
        setStatus(status, "제출 실패: " + e.message + " — 내용은 이 기기에 남아 있으니 잠시 뒤 다시 누르세요.", "err");
      } finally {
        btn.disabled = false;
      }
    });
  };
})();
