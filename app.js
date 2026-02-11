/* ====== state ====== */
const state = {
  theme: "night",       // night | day
  lang: "ru",           // en | ru
  platform: "win",      // win | mac
  // ON by default: удобнее тестировать
  capture: true,
  mode: "live",         // live | latch
  pressed: new Set(),
  latched: new Set(),
  maxDown: 0
};

/* ====== i18n ====== */
const I18N = {
  en: {
    captureOn: "Capture: ON",
    captureOff: "Capture: OFF",
    modeLive: "Mode: Live",
    modeLatch: "Mode: Latch",
    themeNight: "Theme: Night",
    themeDay: "Theme: Day",
    windows: "Windows",
    mac: "Mac",
    help: "Help",
    howTo: "How to use",
    ok: "OK",
    live: "Live",
    hint: "Click here and press any key",
    helpBody: `
      <ul>
        <li><b>Live</b> — highlights only while you hold the key.</li>
        <li><b>Latch</b> — toggles keys on/off and keeps them highlighted until <b>Clear</b>.</li>
        <li><b>Capture</b> — blocks browser hotkeys/scroll (Ctrl/⌘ combos, Space, arrows, etc.).</li>
        <li>Highlighting uses <b>event.code</b> (physical key position).</li>
        <li>If it doesn’t catch input — click empty space to refocus.</li>
        <li><b>Esc</b> closes this window.</li>
      </ul>
    `
  },
  ru: {
    captureOn: "Захват: ВКЛ",
    captureOff: "Захват: ВЫКЛ",
    modeLive: "Режим: Live",
    modeLatch: "Режим: Latch",
    themeNight: "Тема: Ночь",
    themeDay: "Тема: День",
    windows: "Windows",
    mac: "Mac",
    help: "Помощь",
    howTo: "Как пользоваться",
    ok: "OK",
    live: "Live",
    hint: "Кликни сюда и нажми любую клавишу",
    helpBody: `
      <ul>
        <li><b>Live</b> — подсвечивает только пока клавиша зажата.</li>
        <li><b>Latch</b> — запоминает подсветку и держит её до <b>Clear</b> (или повторного нажатия).</li>
        <li><b>Capture</b> — глушит хоткеи/скролл (Ctrl/⌘ + комбинации, Space, стрелки и т.п.).</li>
        <li>Подсветка завязана на <b>event.code</b> — это “физическая” клавиша.</li>
        <li>Если “не ловит” — кликни по пустому месту страницы, чтобы вернуть фокус.</li>
        <li><b>Esc</b> закрывает это окно.</li>
      </ul>
    `
  }
};

function t(key){
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}

/* ====== RU letters mapping (ЙЦУКЕН) ====== */
const RU = {
  KeyQ:"Й", KeyW:"Ц", KeyE:"У", KeyR:"К", KeyT:"Е", KeyY:"Н", KeyU:"Г", KeyI:"Ш", KeyO:"Щ", KeyP:"З",
  BracketLeft:"Х", BracketRight:"Ъ",
  KeyA:"Ф", KeyS:"Ы", KeyD:"В", KeyF:"А", KeyG:"П", KeyH:"Р", KeyJ:"О", KeyK:"Л", KeyL:"Д",
  Semicolon:"Ж", Quote:"Э",
  KeyZ:"Я", KeyX:"Ч", KeyC:"С", KeyV:"М", KeyB:"И", KeyN:"Т", KeyM:"Ь",
  Comma:"Б", Period:"Ю"
};

/* ====== label resolver ====== */
function labelFor(code){
  // letters
  if (code.startsWith("Key")){
    return state.lang === "ru" ? (RU[code] || code.replace("Key","")) : code.replace("Key","");
  }

  // digits / top row
  if (code.startsWith("Digit")) return code.replace("Digit","");
  if (code === "Backquote") return "`";
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";

  // punctuation
  const punct = {
    BracketLeft: "[", BracketRight: "]", Backslash: "\\",
    Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/"
  };
  if (punct[code]) return (state.lang === "ru" ? (RU[code] || punct[code]) : punct[code]);

  // numpad
  const numpad = {
    NumLock: "Num",
    NumpadDivide: "/",
    NumpadMultiply: "*",
    NumpadSubtract: "-",
    NumpadAdd: "+",
    NumpadDecimal: ".",
    NumpadEnter: "Enter",
    Numpad0: "0", Numpad1:"1", Numpad2:"2", Numpad3:"3", Numpad4:"4",
    Numpad5:"5", Numpad6:"6", Numpad7:"7", Numpad8:"8", Numpad9:"9"
  };
  if (numpad[code]) return numpad[code];

  // specials
  const isMac = state.platform === "mac";
  const special = {
    Escape: "Esc",
    Tab: "Tab",
    CapsLock: "Caps",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: isMac ? "Option" : "Alt",
    AltRight: isMac ? "Option" : "Alt",
    MetaLeft: isMac ? "⌘" : "Win",
    MetaRight: isMac ? "⌘" : "Win",
    ContextMenu: "Menu",
    Enter: "Enter",
    Backspace: "Backspace",
    Space: "Space",
    Insert: "Ins",
    Delete: "Del",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
    ArrowUp: "▲",
    ArrowDown: "▼",
    ArrowLeft: "◀",
    ArrowRight: "▶",
    PrintScreen: "Prt",
    ScrollLock: "Scr",
    Pause: "Pause"
  };
  if (special[code]) return special[code];

  // function keys
  if (/^F\d+$/.test(code)) return code;

  return code;
}

function sizeClass(label){
  if (label.length >= 9) return "small";
  if (label.length >= 5) return "med";
  return "big";
}

/* ====== layout (grid placements) ====== */
const COL_UNIT = 4;

function u(n){ return Math.round(n * COL_UNIT); }

function addRow(layout, rowIndex, items){
  let col = 1;
  for (const it of items){
    const wCols = u(it.w);
    if (it.gap || it.spacer){
      col += wCols;
      continue;
    }
    layout.push({
      code: it.code,
      row: rowIndex,
      col,
      colSpan: wCols,
      rowSpan: it.rowSpan ? it.rowSpan : 1
    });
    col += wCols;
  }
}

function buildLayout(){
  const L = [];

  addRow(L, 1, [
    {code:"Escape", w:1.5},{gap:true,w:0.5},
    {code:"F1",w:1},{code:"F2",w:1},{code:"F3",w:1},{code:"F4",w:1},{gap:true,w:0.5},
    {code:"F5",w:1},{code:"F6",w:1},{code:"F7",w:1},{code:"F8",w:1},{gap:true,w:0.5},
    {code:"F9",w:1},{code:"F10",w:1},{code:"F11",w:1},{code:"F12",w:1},{gap:true,w:0.5},
    {code:"PrintScreen",w:1},{code:"ScrollLock",w:1},{code:"Pause",w:1}
  ]);

  addRow(L, 2, [
    {code:"Backquote",w:1},
    {code:"Digit1",w:1},{code:"Digit2",w:1},{code:"Digit3",w:1},{code:"Digit4",w:1},{code:"Digit5",w:1},
    {code:"Digit6",w:1},{code:"Digit7",w:1},{code:"Digit8",w:1},{code:"Digit9",w:1},{code:"Digit0",w:1},
    {code:"Minus",w:1},{code:"Equal",w:1},{code:"Backspace",w:2},
    {gap:true,w:0.5},
    {code:"Insert",w:1},{code:"Home",w:1},{code:"PageUp",w:1},
    {gap:true,w:0.5},
    {code:"NumLock",w:1},{code:"NumpadDivide",w:1},{code:"NumpadMultiply",w:1},{code:"NumpadSubtract",w:1}
  ]);

  addRow(L, 3, [
    {code:"Tab",w:1.5},
    {code:"KeyQ",w:1},{code:"KeyW",w:1},{code:"KeyE",w:1},{code:"KeyR",w:1},{code:"KeyT",w:1},
    {code:"KeyY",w:1},{code:"KeyU",w:1},{code:"KeyI",w:1},{code:"KeyO",w:1},{code:"KeyP",w:1},
    {code:"BracketLeft",w:1},{code:"BracketRight",w:1},{code:"Backslash",w:1.5},
    {gap:true,w:0.5},
    {code:"Delete",w:1},{code:"End",w:1},{code:"PageDown",w:1},
    {gap:true,w:0.5},
    {code:"Numpad7",w:1},{code:"Numpad8",w:1},{code:"Numpad9",w:1},
    {code:"NumpadAdd",w:1, rowSpan:2}
  ]);

  addRow(L, 4, [
    {code:"CapsLock",w:1.75},
    {code:"KeyA",w:1},{code:"KeyS",w:1},{code:"KeyD",w:1},{code:"KeyF",w:1},{code:"KeyG",w:1},
    {code:"KeyH",w:1},{code:"KeyJ",w:1},{code:"KeyK",w:1},{code:"KeyL",w:1},
    {code:"Semicolon",w:1},{code:"Quote",w:1},
    {code:"Enter",w:2.25},
    {gap:true,w:0.5},
    {spacer:true,w:3},
    {gap:true,w:0.5},
    {code:"Numpad4",w:1},{code:"Numpad5",w:1},{code:"Numpad6",w:1}
  ]);

  addRow(L, 5, [
    {code:"ShiftLeft",w:2.25},
    {code:"KeyZ",w:1},{code:"KeyX",w:1},{code:"KeyC",w:1},{code:"KeyV",w:1},{code:"KeyB",w:1},{code:"KeyN",w:1},{code:"KeyM",w:1},
    {code:"Comma",w:1},{code:"Period",w:1},{code:"Slash",w:1},
    {code:"ShiftRight",w:2.75},
    {gap:true,w:0.5},
    {spacer:true,w:1},{code:"ArrowUp",w:1},{spacer:true,w:1},
    {gap:true,w:0.5},
    {code:"Numpad1",w:1},{code:"Numpad2",w:1},{code:"Numpad3",w:1},
    {code:"NumpadEnter",w:1, rowSpan:2}
  ]);

  addRow(L, 6, [
    {code:"ControlLeft",w:1.25},{code:"MetaLeft",w:1.25},{code:"AltLeft",w:1.25},
    {code:"Space",w:6.25},
    {code:"AltRight",w:1.25},{code:"MetaRight",w:1.25},{code:"ContextMenu",w:1.25},{code:"ControlRight",w:1.25},
    {gap:true,w:0.5},
    {code:"ArrowLeft",w:1},{code:"ArrowDown",w:1},{code:"ArrowRight",w:1},
    {gap:true,w:0.5},
    {code:"Numpad0",w:2},{code:"NumpadDecimal",w:1}
  ]);

  return L;
}

/* ====== DOM refs ====== */
const $ = (s) => document.querySelector(s);

const els = {
  app: $("#app"),
  stage: $("#stage"),
  keyboard: $("#keyboard"),

  btnLive: $("#btnLive"),
  liveLabel: $("#liveLabel"),
  btnCapture: $("#btnCapture"),
  btnMode: $("#btnMode"),
  btnClear: $("#btnClear"),
  btnLang: $("#btnLang"),
  btnPlatform: $("#btnPlatform"),
  btnTheme: $("#btnTheme"),
  btnFullscreen: $("#btnFullscreen"),
  btnHelp: $("#btnHelp"),

  hudKey: $("#hudKey"),
  hudHint: $("#hudHint"),
  hudEventKey: $("#hudEventKey"),
  hudEventCode: $("#hudEventCode"),
  hudKeyCode: $("#hudKeyCode"),
  hudRepeat: $("#hudRepeat"),
  hudDown: $("#hudDown"),
  hudMax: $("#hudMax"),
  hudLatched: $("#hudLatched"),
  hudNet: $("#hudNet"),
  hudFocus: $("#hudFocus"),

  modalRoot: $("#modalRoot"),
  modalOverlay: $("#modalOverlay"),
  modalX: $("#modalX"),
  modalOk: $("#modalOk"),
  modalTitle: $("#modalTitle"),
  modalBody: $("#modalBody")
};

const keyEls = new Map(); // code -> element

/* ====== render ====== */
function renderKeyboard(){
  els.keyboard.innerHTML = "";
  keyEls.clear();

  const layout = buildLayout();

  for (const k of layout){
    const el = document.createElement("div");
    el.className = "key";
    el.dataset.code = k.code;

    const label = labelFor(k.code);
    el.textContent = label;

    el.classList.add(sizeClass(label));

    el.style.gridRow = `${k.row} / span ${k.rowSpan}`;
    el.style.gridColumn = `${k.col} / span ${k.colSpan}`;

    els.keyboard.appendChild(el);
    keyEls.set(k.code, el);
  }

  syncAllUI();
  updateKeyClasses();
  fitKeyboard();
}

function syncAllUI(){
  els.btnCapture.textContent = state.capture ? t("captureOn") : t("captureOff");
  els.btnMode.textContent = state.mode === "live" ? t("modeLive") : t("modeLatch");
  els.btnTheme.textContent = state.theme === "night" ? t("themeNight") : t("themeDay");
  els.btnLang.textContent = state.lang.toUpperCase();
  els.btnPlatform.textContent = state.platform === "win" ? t("windows") : t("mac");

  els.btnCapture.classList.toggle("active", state.capture);
  els.btnMode.classList.toggle("active", state.mode === "latch");
  els.btnTheme.classList.toggle("active", state.theme === "day");

  els.liveLabel.textContent = t("live");
  els.btnHelp.textContent = t("help");
  els.modalOk.textContent = t("ok");
  if (els.hudHint) els.hudHint.textContent = t("hint");

  els.app.classList.toggle("theme-night", state.theme === "night");
  els.app.classList.toggle("theme-day", state.theme === "day");
}

/* ====== fit to viewport ====== */
function fitKeyboard(){
  const wrap = document.querySelector(".keyboardWrap");
  if (!wrap) return;

  const pad = 24;
  const availW = wrap.clientWidth - pad;
  const availH = wrap.clientHeight - pad;

  const designW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kb-design-w")) || 1700;
  const designH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kb-design-h")) || 560;

  const s = Math.min(availW / designW, availH / designH);
  const scale = Math.max(0.25, Math.min(1.35, s));

  els.keyboard.style.setProperty("--kb-scale", String(scale));
}

/* ====== key classes ====== */
function updateKeyClasses(){
  for (const [code, el] of keyEls){
    const down = state.pressed.has(code);
    const latched = state.latched.has(code);

    el.classList.toggle("is-down", down);
    el.classList.toggle("is-latched", state.mode === "latch" && latched);
  }

  els.hudDown.textContent = `down: ${state.pressed.size}`;
  els.hudMax.textContent = `max: ${state.maxDown}`;
  els.hudLatched.textContent = `latched: ${state.latched.size}`;
}

function setHud(e){
  const code = e?.code ?? "—";
  const key = e?.key ?? "—";
  const keyCode = (typeof e?.keyCode === "number") ? String(e.keyCode) : "—";
  const repeat = e?.repeat ? "yes" : "no";

  const label = code !== "—" ? labelFor(code) : "—";

  els.hudKey.textContent = label;
  els.hudEventKey.textContent = key;
  els.hudEventCode.textContent = code;
  els.hudKeyCode.textContent = keyCode;
  els.hudRepeat.textContent = repeat;

  els.hudFocus.textContent = `focus: ${document.hasFocus() ? "yes" : "no"}`;
  els.hudNet.textContent = `online: ${navigator.onLine ? "yes" : "no"}`;
}

/* ====== capture prevent ====== */
const PREVENT_CODES = new Set([
  "Space",
  "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
  "PageUp","PageDown","Home","End",
  "Tab","Backspace",
  "Escape",
  "AltLeft","AltRight","MetaLeft","MetaRight",
  "ControlLeft","ControlRight"
]);

function shouldPrevent(e){
  if (!state.capture) return false;
  if (!els.modalRoot.hidden) return false;

  if (e.code === "Escape" && document.fullscreenElement) return false;

  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return false;

  if (/^F\d{1,2}$/.test(e.code)) return true;

  if (PREVENT_CODES.has(e.code)) return true;

  if (e.ctrlKey || e.metaKey || e.altKey) return true;

  return true;
}

function keepFocus(){
  els.stage?.focus({ preventScroll: true });
}

/* ====== events ====== */
function onKeyDown(e){
  if (shouldPrevent(e)) e.preventDefault();

  setHud(e);

  if (state.mode === "latch" && !e.repeat){
    if (state.latched.has(e.code)) state.latched.delete(e.code);
    else state.latched.add(e.code);
  }

  state.pressed.add(e.code);
  state.maxDown = Math.max(state.maxDown, state.pressed.size);

  updateKeyClasses();
}

function onKeyUp(e){
  if (shouldPrevent(e)) e.preventDefault();

  setHud(e);
  state.pressed.delete(e.code);
  updateKeyClasses();
}

function onBlur(){
  state.pressed.clear();
  updateKeyClasses();
  setHud(null);
}

/* ====== modal ====== */
function showModal(title, bodyHtml){
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = bodyHtml;
  els.modalRoot.hidden = false;

  setTimeout(() => {
    els.modalOk.focus({ preventScroll: true });
  }, 0);
}

function hideModal(){
  els.modalRoot.hidden = true;
}

function openHelp(){
  showModal(t("howTo"), I18N[state.lang].helpBody);
}

/* ====== buttons ====== */
function toggleFullscreen(){
  if (!document.fullscreenElement){
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function clearAll(){
  state.pressed.clear();
  state.latched.clear();
  state.maxDown = 0;
  setHud(null);
  updateKeyClasses();
}

function toggleLang(){
  state.lang = (state.lang === "en") ? "ru" : "en";

  for (const [code, el] of keyEls){
    const label = labelFor(code);
    el.textContent = label;
    el.classList.remove("small","med","big");
    el.classList.add(sizeClass(label));
  }
  syncAllUI();
}

function togglePlatform(){
  state.platform = (state.platform === "win") ? "mac" : "win";

  for (const [code, el] of keyEls){
    const label = labelFor(code);
    el.textContent = label;
    el.classList.remove("small","med","big");
    el.classList.add(sizeClass(label));
  }
  syncAllUI();
}

function toggleTheme(){
  state.theme = (state.theme === "night") ? "day" : "night";
  syncAllUI();
}

function toggleCapture(){
  state.capture = !state.capture;
  syncAllUI();
  keepFocus();
}

function toggleMode(){
  state.mode = (state.mode === "live") ? "latch" : "live";
  updateKeyClasses();
  syncAllUI();
}

/* ====== init ====== */
function init(){
  if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  renderKeyboard();
  keepFocus();

  window.addEventListener("resize", fitKeyboard);

  // capture:true — шанс выше перехватить F-keys до действий браузера
  window.addEventListener("keydown", onKeyDown, { capture:true, passive:false });
  window.addEventListener("keyup", onKeyUp, { capture:true, passive:false });
  window.addEventListener("blur", onBlur);

  els.stage?.addEventListener("mousedown", keepFocus);

  window.addEventListener("online", ()=>setHud(null));
  window.addEventListener("offline", ()=>setHud(null));

  els.btnCapture.addEventListener("click", toggleCapture);
  els.btnMode.addEventListener("click", toggleMode);
  els.btnClear.addEventListener("click", clearAll);
  els.btnLang.addEventListener("click", toggleLang);
  els.btnPlatform.addEventListener("click", togglePlatform);
  els.btnTheme.addEventListener("click", toggleTheme);
  els.btnFullscreen.addEventListener("click", toggleFullscreen);
  els.btnHelp.addEventListener("click", openHelp);

  els.modalOverlay.addEventListener("click", hideModal);
  els.modalX.addEventListener("click", hideModal);
  els.modalOk.addEventListener("click", hideModal);

  window.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && !els.modalRoot.hidden){
      e.preventDefault();
      hideModal();
    }
  }, { passive:false });

  setHud(null);
}

init();
