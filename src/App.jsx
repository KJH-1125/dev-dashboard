import { useState, useEffect, useRef } from "react";

// ── 상수 ──────────────────────────────────────────────
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const NAV_ITEMS = [
  { id: "monday", label: "Monday", icon: "📋" },
  { id: "sql",    label: "SQL 도우미", icon: "🗄️" },
  { id: "code",   label: "코드 리뷰", icon: "🔍" },
  { id: "commit", label: "커밋 메시지", icon: "📝" },
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

async function callClaude(systemPrompt, userContent, onChunk) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  onChunk(text);
  return text;
}

// ── AI 패널 공통 래퍼 ─────────────────────────────────
function AiPanel({ title, placeholder, systemPrompt, inputLabel = "입력", outputLabel = "결과", formatOutput }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(""); setOutput("");
    try {
      await callClaude(systemPrompt, input, setOutput);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.aiPanel}>
      <div style={styles.panelGrid}>
        <div style={styles.panelLeft}>
          <label style={styles.label}>{inputLabel}</label>
          <textarea
            style={styles.textarea}
            placeholder={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.ctrlKey && e.key === "Enter" && run()}
          />
          <button style={styles.btn} onClick={run} disabled={loading}>
            {loading ? <span style={styles.spinner}>⏳</span> : "▶ 실행  (Ctrl+Enter)"}
          </button>
        </div>
        <div style={styles.panelRight}>
          <label style={styles.label}>{outputLabel}</label>
          <div style={styles.outputBox}>
            {error && <span style={{ color: "#ff6b6b" }}>{error}</span>}
            {output
              ? (formatOutput ? formatOutput(output) : <pre style={styles.pre}>{output}</pre>)
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

// ── SQL 도우미 ─────────────────────────────────────────
function SqlPanel() {
  const [mode, setMode] = useState("explain");
  const modes = [
    { id: "explain", label: "설명" },
    { id: "optimize", label: "최적화" },
    { id: "convert", label: "MSSQL→PG 변환" },
    { id: "generate", label: "쿼리 생성" },
  ];
  const systemMap = {
    explain:  "당신은 SQL 전문가입니다. 주어진 SQL 쿼리를 한국어로 친절하게 설명해주세요. 각 절의 역할과 전체 동작을 설명하세요.",
    optimize: "당신은 PostgreSQL 최적화 전문가입니다. 쿼리의 문제점을 분석하고 개선된 쿼리와 이유를 한국어로 설명해주세요.",
    convert:  "당신은 MSSQL에서 PostgreSQL 마이그레이션 전문가입니다. MSSQL 문법을 PostgreSQL 문법으로 변환하고, 변경 사항을 한국어로 설명해주세요.",
    generate: "당신은 SQL 전문가입니다. 사용자의 요구사항을 듣고 PostgreSQL 쿼리를 작성해주세요. 코드와 설명을 한국어로 제공하세요.",
  };
  const placeholders = {
    explain:  "SELECT u.name, COUNT(o.id) FROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.name",
    optimize: "최적화할 쿼리를 붙여넣으세요",
    convert:  "MSSQL 쿼리를 붙여넣으세요 (GETDATE(), TOP, ISNULL 등)",
    generate: "어떤 쿼리가 필요한지 설명해주세요\n예: 지난 7일간 주문 수가 많은 상위 10명의 고객",
  };

  return (
    <div>
      <div style={styles.modeBar}>
        {modes.map(m => (
          <button
            key={m.id}
            style={{ ...styles.modeBtn, ...(mode === m.id ? styles.modeBtnActive : {}) }}
            onClick={() => setMode(m.id)}
          >{m.label}</button>
        ))}
      </div>
      <AiPanel
        systemPrompt={systemMap[mode]}
        placeholder={placeholders[mode]}
        inputLabel="SQL 입력"
        outputLabel="분석 결과"
      />
    </div>
  );
}

// ── 코드 리뷰 ─────────────────────────────────────────
function CodePanel() {
  const [mode, setMode] = useState("review");
  const modes = [
    { id: "review", label: "코드 리뷰" },
    { id: "convert", label: "언어 변환" },
    { id: "refactor", label: "리팩토링" },
  ];
  const systemMap = {
    review:   "당신은 시니어 개발자입니다. 주어진 코드를 리뷰하고, 버그 가능성, 성능 문제, 가독성, 베스트 프랙티스 관점에서 한국어로 상세히 피드백하세요.",
    convert:  "당신은 다국어 개발 전문가입니다. 사용자가 변환 대상 언어를 명시하면 코드를 변환하고 주요 차이점을 한국어로 설명하세요.",
    refactor: "당신은 클린 코드 전문가입니다. 코드를 더 읽기 쉽고 유지보수하기 좋게 리팩토링하고, 변경 이유를 한국어로 설명하세요.",
  };
  const placeholders = {
    review:   "리뷰받을 코드를 붙여넣으세요",
    convert:  "// 변환할 언어를 첫 줄에 명시하세요\n// 예: # PHP → Python 변환\n\nfunction hello($name) {\n  return 'Hello, ' . $name;\n}",
    refactor: "리팩토링할 코드를 붙여넣으세요",
  };

  return (
    <div>
      <div style={styles.modeBar}>
        {modes.map(m => (
          <button
            key={m.id}
            style={{ ...styles.modeBtn, ...(mode === m.id ? styles.modeBtnActive : {}) }}
            onClick={() => setMode(m.id)}
          >{m.label}</button>
        ))}
      </div>
      <AiPanel
        systemPrompt={systemMap[mode]}
        placeholder={placeholders[mode]}
        inputLabel="코드 입력"
        outputLabel="분석 결과"
      />
    </div>
  );
}

// ── 커밋 메시지 ───────────────────────────────────────
function CommitPanel() {
  const [style, setStyle] = useState("conventional");
  const styles2 = [
    { id: "conventional", label: "Conventional" },
    { id: "emoji", label: "이모지" },
    { id: "simple", label: "심플" },
  ];
  const systemMap = {
    conventional: "당신은 Git 전문가입니다. 주어진 변경사항을 바탕으로 Conventional Commits 형식(feat/fix/refactor/docs/chore 등)의 커밋 메시지를 영어로 3가지 옵션으로 제안하세요. 각 옵션에 한국어 설명도 추가하세요.",
    emoji:        "당신은 Git 전문가입니다. 주어진 변경사항을 바탕으로 이모지를 포함한 커밋 메시지(✨ feat, 🐛 fix, ♻️ refactor 등)를 3가지 옵션으로 제안하세요. 각 옵션에 한국어 설명도 추가하세요.",
    simple:       "당신은 Git 전문가입니다. 주어진 변경사항을 바탕으로 간결하고 명확한 커밋 메시지를 한국어로 3가지 옵션으로 제안하세요.",
  };

  return (
    <div>
      <div style={styles.modeBar}>
        {styles2.map(m => (
          <button
            key={m.id}
            style={{ ...styles.modeBtn, ...(style === m.id ? styles.modeBtnActive : {}) }}
            onClick={() => setStyle(m.id)}
          >{m.label}</button>
        ))}
      </div>
      <AiPanel
        systemPrompt={systemMap[style]}
        placeholder={"변경사항을 설명해주세요:\n\n예:\n- 사용자 로그인 시 JWT 토큰 만료 시간 2h → 24h로 변경\n- 토큰 갱신 로직 추가\n- 관련 테스트 코드 업데이트"}
        inputLabel="변경사항 설명"
        outputLabel="커밋 메시지 제안"
      />
    </div>
  );
}

// ── TODO ──────────────────────────────────────────────
function TodoPanel() {
  const [todos, setTodos] = useLocalStorage("dev-todos", []);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");

  const add = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input.trim(), done: false, ts: new Date().toLocaleDateString("ko-KR") }]);
    setInput("");
  };
  const toggle = id => setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = id => setTodos(todos.filter(t => t.id !== id));

  const filtered = todos.filter(t =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );
  const doneCount = todos.filter(t => t.done).length;

  return (
    <div style={styles.todoWrap}>
      <div style={styles.todoStats}>
        <span style={styles.statBadge}>전체 {todos.length}</span>
        <span style={{ ...styles.statBadge, background: "#1a3a2a", color: "#4ade80" }}>완료 {doneCount}</span>
        <span style={{ ...styles.statBadge, background: "#3a1a1a", color: "#f87171" }}>미완료 {todos.length - doneCount}</span>
      </div>
      <div style={styles.todoInput}>
        <input
          style={styles.input}
          placeholder="새 할 일 추가... (Enter)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
        />
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
        {filtered.map(t => (
          <div key={t.id} style={{ ...styles.todoItem, opacity: t.done ? 0.5 : 1 }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} style={{ cursor: "pointer", accentColor: "#38bdf8" }} />
            <span style={{ ...styles.todoText, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
            <span style={styles.todoDate}>{t.ts}</span>
            <button style={styles.delBtn} onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
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

  const panels = { monday: MondayPanel, sql: SqlPanel, code: CodePanel, commit: CommitPanel, todo: TodoPanel, links: LinksPanel };
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
          <div style={styles.footerTip}>💡 AI 기능은 Ctrl+Enter</div>
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

  // AI Panel
  aiPanel: {},
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
  spinner: {},
  modeBar: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  modeBtn: { padding: "5px 12px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  modeBtnActive: { background: C.accentDim, border: `1px solid ${C.accent}`, color: C.accent },

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
