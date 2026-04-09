import { useState, useEffect, useMemo } from "react";
import { format as sqlFormat } from "sql-formatter";
import { diffLines, diffWords } from "diff";

// ── 상수 ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "monday", label: "Monday", icon: "📋" },
  { id: "sql",    label: "SQL 포맷터", icon: "🗄️" },
  { id: "json",   label: "JSON 포맷터", icon: "{ }" },
  { id: "commit", label: "커밋 빌더", icon: "📝" },
  { id: "diff",   label: "Diff 비교", icon: "🔀" },
  { id: "todo",   label: "TODO", icon: "✅" },
  { id: "links",  label: "링크 모음", icon: "🔗" },
];

// ── 유틸 ──────────────────────────────────────────────
function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init; }
    catch { return init; }
  });
  const save = (v) => { setVal(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [val, save];
}

// ── SQL 포맷터 ────────────────────────────────────────
function SqlPanel() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [dialect, setDialect] = useState("postgresql");
  const [indentSize, setIndentSize] = useState(2);
  const [uppercase, setUppercase] = useState(true);

  const dialects = [
    { id: "postgresql", label: "PostgreSQL" },
    { id: "mysql", label: "MySQL" },
    { id: "transactsql", label: "MSSQL" },
    { id: "sql", label: "Standard" },
  ];

  const formatSql = () => {
    if (!input.trim()) return;
    setError("");
    try {
      const result = sqlFormat(input, {
        language: dialect,
        tabWidth: indentSize,
        keywordCase: uppercase ? "upper" : "preserve",
      });
      setOutput(result);
    } catch (e) {
      setError("포맷 오류: " + e.message);
      setOutput("");
    }
  };

  return (
    <div>
      <div style={styles.modeBar}>
        {dialects.map(d => (
          <button key={d.id} style={{ ...styles.modeBtn, ...(dialect === d.id ? styles.modeBtnActive : {}) }}
            onClick={() => setDialect(d.id)}>{d.label}</button>
        ))}
      </div>
      <div style={styles.optionsBar}>
        <span style={styles.label}>들여쓰기</span>
        {[2, 4].map(n => (
          <button key={n} style={{ ...styles.modeBtn, ...(indentSize === n ? styles.modeBtnActive : {}) }}
            onClick={() => setIndentSize(n)}>{n}칸</button>
        ))}
        <span style={{ ...styles.label, marginLeft: 12 }}>키워드</span>
        <button style={{ ...styles.modeBtn, ...(uppercase ? styles.modeBtnActive : {}) }}
          onClick={() => setUppercase(!uppercase)}>{uppercase ? "UPPER" : "preserve"}</button>
      </div>
      <div style={styles.panelGrid}>
        <div style={styles.panelLeft}>
          <label style={styles.label}>SQL 입력</label>
          <textarea
            style={styles.textarea}
            placeholder={"SELECT u.name, COUNT(o.id) FROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.name"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.ctrlKey && e.key === "Enter" && formatSql()}
          />
          <button style={styles.btn} onClick={formatSql}>▶ 포맷  (Ctrl+Enter)</button>
        </div>
        <div style={styles.panelRight}>
          <label style={styles.label}>포맷 결과</label>
          <div style={styles.outputBox}>
            {error && <span style={{ color: "#ff6b6b" }}>{error}</span>}
            {output
              ? <pre style={styles.pre}>{output}</pre>
              : <span style={styles.placeholder}>포맷된 SQL이 여기에 표시됩니다</span>}
          </div>
          {output && (
            <button style={styles.btnSecondary} onClick={() => navigator.clipboard.writeText(output)}>
              📋 복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── JSON 포맷터 ───────────────────────────────────────
function JsonPanel() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("format");
  const [indentSize, setIndentSize] = useState(2);

  const modes = [
    { id: "format", label: "Format" },
    { id: "minify", label: "Minify" },
    { id: "validate", label: "Validate" },
  ];

  const processJson = () => {
    if (!input.trim()) return;
    setError(""); setOutput("");
    try {
      const parsed = JSON.parse(input);
      switch (mode) {
        case "format":
          setOutput(JSON.stringify(parsed, null, indentSize));
          break;
        case "minify":
          setOutput(JSON.stringify(parsed));
          break;
        case "validate": {
          const type = Array.isArray(parsed) ? `Array (${parsed.length}개)` : typeof parsed === "object" ? `Object (${Object.keys(parsed).length}개 키)` : typeof parsed;
          setOutput(`✅ 유효한 JSON입니다.\n\n타입: ${type}\n크기: ${new Blob([input]).size} bytes`);
          break;
        }
      }
    } catch (e) {
      const match = e.message.match(/position (\d+)/);
      const pos = match ? parseInt(match[1]) : null;
      let errorMsg = "❌ " + e.message;
      if (pos !== null) {
        const lines = input.substring(0, pos).split("\n");
        errorMsg += `\n\n위치: ${lines.length}번째 줄, ${lines[lines.length - 1].length + 1}번째 문자`;
      }
      setError(errorMsg);
    }
  };

  return (
    <div>
      <div style={styles.modeBar}>
        {modes.map(m => (
          <button key={m.id} style={{ ...styles.modeBtn, ...(mode === m.id ? styles.modeBtnActive : {}) }}
            onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
        {mode === "format" && (
          <>
            <span style={{ ...styles.label, marginLeft: 12 }}>들여쓰기</span>
            {[2, 4].map(n => (
              <button key={n} style={{ ...styles.modeBtn, ...(indentSize === n ? styles.modeBtnActive : {}) }}
                onClick={() => setIndentSize(n)}>{n}칸</button>
            ))}
          </>
        )}
      </div>
      <div style={styles.panelGrid}>
        <div style={styles.panelLeft}>
          <label style={styles.label}>JSON 입력</label>
          <textarea
            style={styles.textarea}
            placeholder={'{"name": "홍길동", "age": 30, "skills": ["React", "Node.js"]}'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.ctrlKey && e.key === "Enter" && processJson()}
          />
          <button style={styles.btn} onClick={processJson}>▶ 실행  (Ctrl+Enter)</button>
        </div>
        <div style={styles.panelRight}>
          <label style={styles.label}>결과</label>
          <div style={styles.outputBox}>
            {error && <pre style={{ ...styles.pre, color: "#ff6b6b" }}>{error}</pre>}
            {output
              ? <pre style={styles.pre}>{output}</pre>
              : <span style={styles.placeholder}>결과가 여기에 표시됩니다</span>}
          </div>
          {output && (
            <button style={styles.btnSecondary} onClick={() => navigator.clipboard.writeText(output)}>
              📋 복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 커밋 빌더 ─────────────────────────────────────────
function CommitPanel() {
  const [type, setType] = useState("feat");
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [breaking, setBreaking] = useState(false);
  const [breakingDesc, setBreakingDesc] = useState("");

  const types = [
    { id: "feat",     label: "feat",     desc: "새 기능" },
    { id: "fix",      label: "fix",      desc: "버그 수정" },
    { id: "refactor", label: "refactor", desc: "리팩토링" },
    { id: "docs",     label: "docs",     desc: "문서" },
    { id: "chore",    label: "chore",    desc: "기타 작업" },
    { id: "style",    label: "style",    desc: "스타일" },
    { id: "test",     label: "test",     desc: "테스트" },
    { id: "perf",     label: "perf",     desc: "성능" },
    { id: "ci",       label: "ci",       desc: "CI/CD" },
    { id: "build",    label: "build",    desc: "빌드" },
  ];

  const preview = useMemo(() => {
    if (!description.trim()) return "";
    let msg = type;
    if (scope.trim()) msg += `(${scope.trim()})`;
    if (breaking) msg += "!";
    msg += ": " + description.trim();
    if (body.trim()) msg += "\n\n" + body.trim();
    if (breaking && breakingDesc.trim()) {
      msg += "\n\nBREAKING CHANGE: " + breakingDesc.trim();
    }
    return msg;
  }, [type, scope, description, body, breaking, breakingDesc]);

  return (
    <div>
      <div style={styles.panelGrid}>
        <div style={styles.panelLeft}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Type</label>
            <div style={styles.modeBar}>
              {types.map(t => (
                <button key={t.id}
                  style={{ ...styles.modeBtn, ...(type === t.id ? styles.modeBtnActive : {}) }}
                  onClick={() => setType(t.id)}
                  title={t.desc}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Scope (선택)</label>
            <input style={styles.input} placeholder="예: auth, api, ui" value={scope}
              onChange={e => setScope(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <input style={styles.input} placeholder="변경사항을 간결하게 설명" value={description}
              onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Body (선택)</label>
            <textarea style={{ ...styles.textarea, flex: "none", height: 100 }}
              placeholder="상세 설명이 필요한 경우 작성"
              value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div style={styles.checkRow}>
            <input type="checkbox" checked={breaking} onChange={e => setBreaking(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#f87171" }} />
            <span style={{ fontSize: 13, color: breaking ? "#f87171" : C.textMuted }}>Breaking Change</span>
          </div>
          {breaking && (
            <div style={{ ...styles.formGroup, marginTop: 8 }}>
              <input style={styles.input} placeholder="어떤 변경이 호환성을 깨는지 설명"
                value={breakingDesc} onChange={e => setBreakingDesc(e.target.value)} />
            </div>
          )}
        </div>
        <div style={styles.panelRight}>
          <label style={styles.label}>미리보기</label>
          <div style={styles.outputBox}>
            {preview
              ? <pre style={styles.pre}>{preview}</pre>
              : <span style={styles.placeholder}>커밋 메시지가 여기에 표시됩니다</span>}
          </div>
          {preview && (
            <button style={styles.btnSecondary} onClick={() => navigator.clipboard.writeText(preview)}>
              📋 복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Diff 비교 ─────────────────────────────────────────
function DiffPanel() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [diffResult, setDiffResult] = useState([]);
  const [mode, setMode] = useState("line");
  const [stats, setStats] = useState(null);

  const computeDiff = () => {
    const fn = mode === "line" ? diffLines : diffWords;
    const result = fn(original, modified);
    setDiffResult(result);
    const added = result.filter(p => p.added).reduce((s, p) => s + (p.count || 0), 0);
    const removed = result.filter(p => p.removed).reduce((s, p) => s + (p.count || 0), 0);
    setStats({ added, removed });
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "Enter") computeDiff();
  };

  return (
    <div>
      <div style={styles.modeBar}>
        <button style={{ ...styles.modeBtn, ...(mode === "line" ? styles.modeBtnActive : {}) }}
          onClick={() => setMode("line")}>줄 단위</button>
        <button style={{ ...styles.modeBtn, ...(mode === "word" ? styles.modeBtnActive : {}) }}
          onClick={() => setMode("word")}>단어 단위</button>
        {stats && (
          <span style={{ marginLeft: "auto", fontSize: 12, display: "flex", gap: 10 }}>
            <span style={{ color: "#4ade80" }}>+{stats.added}</span>
            <span style={{ color: "#f87171" }}>-{stats.removed}</span>
          </span>
        )}
      </div>
      <div style={styles.diffInputGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={styles.label}>원본</label>
          <textarea style={{ ...styles.textarea, flex: 1 }} placeholder="원본 텍스트를 입력하세요"
            value={original} onChange={e => setOriginal(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={styles.label}>수정본</label>
          <textarea style={{ ...styles.textarea, flex: 1 }} placeholder="수정된 텍스트를 입력하세요"
            value={modified} onChange={e => setModified(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
      </div>
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <button style={styles.btn} onClick={computeDiff}>▶ 비교  (Ctrl+Enter)</button>
      </div>
      <div style={styles.diffOutput}>
        {diffResult.length === 0
          ? <span style={styles.placeholder}>비교 결과가 여기에 표시됩니다</span>
          : <pre style={styles.pre}>
              {diffResult.map((part, i) => (
                <span key={i} style={{
                  backgroundColor: part.added ? "#1a3a2a" : part.removed ? "#3a1a1a" : "transparent",
                  color: part.added ? "#4ade80" : part.removed ? "#f87171" : C.text,
                  textDecoration: part.removed ? "line-through" : "none",
                }}>
                  {part.value}
                </span>
              ))}
            </pre>
        }
      </div>
    </div>
  );
}

// ── TODO ──────────────────────────────────────────────
const PRIORITIES = [
  { id: "high",   label: "높음", color: "#f87171", bg: "#3a1a1a" },
  { id: "medium", label: "중간", color: "#d29922", bg: "#3a2a0a" },
  { id: "low",    label: "낮음", color: "#8b949e", bg: "#1c2333" },
];

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function formatDue(dueDate) {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}일 지남`;
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  return `${diff}일 남음`;
}

function TodoPanel() {
  const [todos, setTodos] = useLocalStorage("dev-todos", []);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const add = () => {
    if (!input.trim()) return;
    setTodos([...todos, {
      id: Date.now(), text: input.trim(), done: false,
      ts: new Date().toLocaleDateString("ko-KR"),
      priority, dueDate: dueDate || null, memo: "",
    }]);
    setInput(""); setDueDate("");
  };
  const toggle = id => setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = id => setTodos(todos.filter(t => t.id !== id));
  const clearDone = () => setTodos(todos.filter(t => !t.done));

  const startEdit = (t) => { setEditId(t.id); setEditText(t.text); };
  const saveEdit = () => {
    if (!editText.trim()) return;
    setTodos(todos.map(t => t.id === editId ? { ...t, text: editText.trim() } : t));
    setEditId(null); setEditText("");
  };
  const cancelEdit = () => { setEditId(null); setEditText(""); };
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);
  const updateMemo = (id, memo) => setTodos(todos.map(t => t.id === id ? { ...t, memo } : t));

  const sorted = [...todos].sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
  });
  const filtered = sorted.filter(t =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );
  const doneCount = todos.filter(t => t.done).length;

  return (
    <div style={styles.todoWrap}>
      <div style={styles.todoStats}>
        <span style={styles.statBadge}>전체 {todos.length}</span>
        <span style={{ ...styles.statBadge, background: "#1a3a2a", color: "#4ade80" }}>완료 {doneCount}</span>
        <span style={{ ...styles.statBadge, background: "#3a1a1a", color: "#f87171" }}>미완료 {todos.length - doneCount}</span>
        {doneCount > 0 && (
          <button style={{ ...styles.btnSecondary, fontSize: 11, padding: "4px 10px", marginLeft: "auto" }}
            onClick={clearDone}>🗑️ 완료 항목 삭제</button>
        )}
      </div>
      <div style={styles.todoInput}>
        <input
          style={styles.input}
          placeholder="새 할 일 추가... (Enter)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
        />
        <input type="date" style={{ ...styles.input, flex: "none", width: 140, fontSize: 12 }}
          value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <div style={{ display: "flex", gap: 2 }}>
          {PRIORITIES.map(p => (
            <button key={p.id}
              style={{ ...styles.modeBtn, fontSize: 11, padding: "4px 8px", marginBottom: 0,
                ...(priority === p.id ? { background: p.bg, borderColor: p.color, color: p.color } : {}) }}
              onClick={() => setPriority(p.id)}>{p.label}</button>
          ))}
        </div>
        <button style={styles.btn} onClick={add}>+ 추가</button>
      </div>
      <div style={styles.modeBar}>
        {["all","todo","done"].map(f => (
          <button key={f} style={{ ...styles.modeBtn, ...(filter === f ? styles.modeBtnActive : {}) }}
            onClick={() => setFilter(f)}>
            {f === "all" ? "전체" : f === "todo" ? "미완료" : "완료"}
          </button>
        ))}
      </div>
      <div style={styles.todoList}>
        {filtered.length === 0 && <div style={styles.empty}>할 일이 없어요 🎉</div>}
        {filtered.map(t => {
          const pri = PRIORITIES.find(p => p.id === t.priority) || PRIORITIES[1];
          const overdue = !t.done && isOverdue(t.dueDate);
          return (
            <div key={t.id} style={{ ...styles.todoItem, opacity: t.done ? 0.5 : 1,
              borderLeft: `3px solid ${pri.color}`, flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)}
                  style={{ cursor: "pointer", accentColor: "#38bdf8", flexShrink: 0 }} />
                {editId === t.id ? (
                  <input style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                    value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    onBlur={saveEdit} />
                ) : (
                  <span style={{ ...styles.todoText, textDecoration: t.done ? "line-through" : "none", cursor: "pointer" }}
                    onDoubleClick={() => !t.done && startEdit(t)}>{t.text}</span>
                )}
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3,
                  background: pri.bg, color: pri.color, flexShrink: 0 }}>{pri.label}</span>
                {t.dueDate && (
                  <span style={{ fontSize: 11, color: overdue ? "#f87171" : C.textMuted, flexShrink: 0,
                    fontWeight: overdue ? 700 : 400 }}>
                    {formatDue(t.dueDate)}
                  </span>
                )}
                <span style={styles.todoDate}>{t.ts}</span>
                <button style={{ ...styles.delBtn, fontSize: 12, color: expandedId === t.id ? C.accent : C.textMuted }}
                  onClick={() => toggleExpand(t.id)}
                  title="메모">{expandedId === t.id ? "▲" : (t.memo ? "📝" : "▼")}</button>
                <button style={styles.delBtn} onClick={() => remove(t.id)}>✕</button>
              </div>
              {expandedId === t.id && (
                <div style={{ marginTop: 8, paddingLeft: 28 }}>
                  <textarea
                    style={{ ...styles.textarea, flex: "none", height: 100, width: "100%", fontSize: 12 }}
                    placeholder="상세 메모를 작성하세요... (작업 방법, 참고 사항 등)"
                    value={t.memo || ""}
                    onChange={e => updateMemo(t.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 링크 북마크 ───────────────────────────────────────
function LinksPanel() {
  const [links, setLinks] = useLocalStorage("dev-links", [
    { id: 1, title: "GitLab", url: "https://gitlab.com", category: "개발" },
    { id: 2, title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/", category: "레퍼런스" },
    { id: 3, title: "Vue 3 Docs", url: "https://vuejs.org/", category: "레퍼런스" },
  ]);
  const [form, setForm] = useState({ title: "", url: "", category: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [catFilter, setCatFilter] = useState("전체");

  const categories = ["전체", ...new Set(links.map(l => l.category).filter(Boolean))];
  const add = () => {
    if (!form.title || !form.url) return;
    const url = form.url.startsWith("http") ? form.url : "https://" + form.url;
    setLinks([...links, { id: Date.now(), ...form, url }]);
    setForm({ title: "", url: "", category: "" });
    setShowAdd(false);
  };
  const remove = id => setLinks(links.filter(l => l.id !== id));
  const filtered = catFilter === "전체" ? links : links.filter(l => l.category === catFilter);

  return (
    <div style={styles.linksWrap}>
      <div style={styles.linksHeader}>
        <div style={styles.modeBar}>
          {categories.map(c => (
            <button key={c} style={{ ...styles.modeBtn, ...(catFilter === c ? styles.modeBtnActive : {}) }}
              onClick={() => setCatFilter(c)}>{c}</button>
          ))}
        </div>
        <button style={styles.btn} onClick={() => setShowAdd(!showAdd)}>+ 추가</button>
      </div>
      {showAdd && (
        <div style={styles.linkForm}>
          <input style={styles.input} placeholder="이름" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <input style={styles.input} placeholder="카테고리 (선택)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <button style={styles.btn} onClick={add}>저장</button>
        </div>
      )}
      <div style={styles.linksGrid}>
        {filtered.map(l => (
          <div key={l.id} style={styles.linkCard}>
            <a href={l.url} target="_blank" rel="noreferrer" style={styles.linkTitle}>
              <span>🔗</span> {l.title}
            </a>
            {l.category && <span style={styles.catTag}>{l.category}</span>}
            <button style={styles.delBtn} onClick={() => remove(l.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monday 패널 ───────────────────────────────────────
function MondayPanel() {
  const [apiKey, setApiKey] = useLocalStorage("monday-api-key", "");
  const [boardId, setBoardId] = useLocalStorage("monday-board-id", "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [inputBoard, setInputBoard] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => { if (apiKey && boardId) { setConfigured(true); fetchItems(apiKey, boardId); } }, []);

  const fetchItems = async (key, board) => {
    setLoading(true); setError("");
    try {
      const query = `{ boards(ids: [${board}]) { name items_page(limit: 50) { items { id name state column_values { id text } } } } }`;
      const res = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": key },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      const boardData = data.data?.boards?.[0];
      setItems(boardData?.items_page?.items || []);
    } catch (e) {
      setError("연결 실패: " + e.message + " (API 키와 보드 ID를 확인하세요)");
    } finally { setLoading(false); }
  };

  const updateStatus = async (itemId, columnId, value) => {
    try {
      const mutation = `mutation { change_simple_column_value(item_id: ${itemId}, board_id: ${boardId}, column_id: "${columnId}", value: "${value}") { id } }`;
      await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": apiKey },
        body: JSON.stringify({ query: mutation }),
      });
      fetchItems(apiKey, boardId);
    } catch (e) { setError(e.message); }
  };

  const saveConfig = () => {
    if (!inputKey || !inputBoard) return;
    setApiKey(inputKey); setBoardId(inputBoard); setConfigured(true);
    fetchItems(inputKey, inputBoard);
  };

  if (!configured) return (
    <div style={styles.mondaySetup}>
      <h3 style={{ color: "#38bdf8", marginBottom: 16 }}>Monday.com 연결 설정</h3>
      <p style={{ color: "#94a3b8", marginBottom: 20, fontSize: 14 }}>
        Monday.com {'>'} 프로필 {'>'} 개발자 {'>'} API 토큰에서 키를 복사하세요.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400 }}>
        <input style={styles.input} type="password" placeholder="Monday API Key" value={inputKey} onChange={e => setInputKey(e.target.value)} />
        <input style={styles.input} placeholder="보드 ID (URL에서 확인)" value={inputBoard} onChange={e => setInputBoard(e.target.value)} />
        <button style={styles.btn} onClick={saveConfig}>🔌 연결하기</button>
      </div>
      {error && <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p>}
    </div>
  );

  return (
    <div style={styles.mondayWrap}>
      <div style={styles.mondayHeader}>
        <button style={styles.btnSecondary} onClick={() => fetchItems(apiKey, boardId)} disabled={loading}>
          {loading ? "⏳ 불러오는 중..." : "🔄 새로고침"}
        </button>
        <button style={{ ...styles.btnSecondary, fontSize: 12 }} onClick={() => { setConfigured(false); setItems([]); }}>
          ⚙️ 재설정
        </button>
      </div>
      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
      <div style={styles.mondayList}>
        {items.map(item => {
          const statusCol = item.column_values?.find(c => c.id === "status" || c.id?.includes("status"));
          return (
            <div key={item.id} style={styles.mondayItem}>
              <div style={styles.mondayItemTitle}>{item.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {item.column_values?.filter(c => c.text).slice(0, 3).map(c => (
                  <span key={c.id} style={styles.mondayTag}>{c.text}</span>
                ))}
              </div>
              {statusCol && (
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  {["Working on it", "Done", "Stuck"].map(s => (
                    <button key={s} style={{ ...styles.modeBtn, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => updateStatus(item.id, statusCol.id, s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!loading && items.length === 0 && <div style={styles.empty}>아이템이 없습니다</div>}
      </div>
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("monday");
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const panels = { monday: MondayPanel, sql: SqlPanel, json: JsonPanel, commit: CommitPanel, diff: DiffPanel, todo: TodoPanel, links: LinksPanel };
  const Panel = panels[tab];

  const tabLabel = NAV_ITEMS.find(n => n.id === tab)?.label || "";

  return (
    <div style={styles.root}>
      {/* 사이드바 */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⌨️</span>
          <div>
            <div style={styles.logoTitle}>DEV HUB</div>
            <div style={styles.logoSub}>나만의 개발 도우미</div>
          </div>
        </div>
        <div style={styles.clock}>
          {time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          <div style={styles.clockDate}>{time.toLocaleDateString("ko-KR", { weekday: "short", month: "long", day: "numeric" })}</div>
        </div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              style={{ ...styles.navBtn, ...(tab === item.id ? styles.navBtnActive : {}) }}
              onClick={() => setTab(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {tab === item.id && <span style={styles.navIndicator} />}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.footerTip}>💡 포맷/비교: Ctrl+Enter</div>
        </div>
      </aside>

      {/* 메인 */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.pageTitle}>
            {NAV_ITEMS.find(n => n.id === tab)?.icon} {tabLabel}
          </h1>
        </header>
        <div style={styles.content}>
          <Panel />
        </div>
      </main>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#1c2333",
  border: "#30363d",
  text: "#e6edf3",
  textMuted: "#8b949e",
  accent: "#38bdf8",
  accentDim: "#0c3553",
  green: "#3fb950",
  yellow: "#d29922",
};

const styles = {
  root: { display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14, overflow: "hidden" },
  sidebar: { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "0 20px 20px", borderBottom: `1px solid ${C.border}` },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontSize: 16, fontWeight: 700, color: C.accent, letterSpacing: 2 },
  logoSub: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  clock: { padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 20, fontWeight: 700, color: C.accent, letterSpacing: 1, fontVariantNumeric: "tabular-nums" },
  clockDate: { fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: 400 },
  nav: { display: "flex", flexDirection: "column", padding: "12px 0", flex: 1 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, textAlign: "left", position: "relative", transition: "all 0.15s", borderLeft: "3px solid transparent" },
  navBtnActive: { color: C.accent, background: `${C.accentDim}44`, borderLeft: `3px solid ${C.accent}` },
  navIcon: { fontSize: 16, width: 20 },
  navIndicator: {},
  sidebarFooter: { padding: "12px 20px", borderTop: `1px solid ${C.border}` },
  footerTip: { fontSize: 11, color: C.textMuted },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface },
  pageTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: C.text },
  content: { flex: 1, overflow: "auto", padding: 24 },

  // Panels
  panelGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "calc(100vh - 200px)" },
  panelLeft: { display: "flex", flexDirection: "column", gap: 10 },
  panelRight: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  textarea: { flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: 12, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none" },
  outputBox: { flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, overflow: "auto" },
  pre: { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.6, color: C.text },
  placeholder: { color: C.textMuted, fontSize: 13 },
  btn: { padding: "8px 16px", background: C.accent, color: "#0d1117", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" },
  btnSecondary: { padding: "6px 12px", background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  modeBar: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  modeBtn: { padding: "5px 12px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  modeBtnActive: { background: C.accentDim, border: `1px solid ${C.accent}`, color: C.accent },
  optionsBar: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center" },
  formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  checkRow: { display: "flex", alignItems: "center", gap: 8 },

  // Diff
  diffInputGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "35vh" },
  diffOutput: { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, overflow: "auto", maxHeight: "40vh", marginTop: 12 },

  // TODO
  todoWrap: {},
  todoStats: { display: "flex", gap: 8, marginBottom: 16 },
  statBadge: { padding: "4px 10px", background: C.surface2, borderRadius: 20, fontSize: 12, color: C.textMuted },
  todoInput: { display: "flex", gap: 8, marginBottom: 12 },
  input: { flex: 1, padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" },
  todoList: { display: "flex", flexDirection: "column", gap: 6 },
  todoItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}` },
  todoText: { flex: 1, fontSize: 13 },
  todoDate: { fontSize: 11, color: C.textMuted },
  delBtn: { background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, padding: "0 4px" },
  empty: { color: C.textMuted, textAlign: "center", padding: 40, fontSize: 13 },

  // Links
  linksWrap: {},
  linksHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  linkForm: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  linksGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 },
  linkCard: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}`, flexWrap: "wrap" },
  linkTitle: { flex: 1, color: C.accent, textDecoration: "none", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  catTag: { fontSize: 10, padding: "2px 6px", background: C.accentDim, color: C.accent, borderRadius: 3 },

  // Monday
  mondaySetup: { padding: 24 },
  mondayWrap: {},
  mondayHeader: { display: "flex", gap: 8, marginBottom: 16 },
  mondayList: { display: "flex", flexDirection: "column", gap: 8 },
  mondayItem: { padding: "14px 16px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}` },
  mondayItemTitle: { fontSize: 14, fontWeight: 600, color: C.text },
  mondayTag: { fontSize: 11, padding: "2px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textMuted },
};
