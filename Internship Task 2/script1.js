/* Advanced To-Do App (Vanilla JS)
   Features:
   - Dark/Light mode with persistence
   - Add tasks with categories
   - Filter: All / Pending / Completed
   - Drag & Drop reorder with persistence
   - Sound effects (with fallback beep)
   - LocalStorage saving
*/

// ----- Selectors -----
const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("todoList");
const categorySelect = document.getElementById("categorySelect");
const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
const themeBtn = document.getElementById("themeToggle");

const audioAdd = document.getElementById("addSound");
const audioDelete = document.getElementById("deleteSound");
const audioComplete = document.getElementById("completeSound");

const STORAGE_KEY = "advanced_todos_v1";
const THEME_KEY = "advanced_todos_theme";

// In-memory task array
let tasks = []; // {id, text, completed, category}

// ----- Initialization -----
init();

function init() {
  loadTheme();
  bindUI();
  loadTasksFromStorage();
  render();
}

// ----- Theme -----
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
    themeBtn.textContent = saved === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  } else {
    // default: light
    document.documentElement.setAttribute("data-theme", "light");
    themeBtn.textContent = "🌙 Dark Mode";
  }
}
themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  themeBtn.textContent = next === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem(THEME_KEY, next);
});

// ----- UI bindings -----
function bindUI() {
  addBtn.addEventListener("click", handleAdd);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdd();
  });
  filterBtns.forEach((btn) => btn.addEventListener("click", handleFilter));
  // delegate events from list (checkbox toggle + delete)
  list.addEventListener("click", handleListClick);

  // Drag & Drop events (on list)
  list.addEventListener("dragstart", handleDragStart);
  list.addEventListener("dragover", handleDragOver);
  list.addEventListener("drop", handleDrop);
  list.addEventListener("dragend", handleDragEnd);
}

// ----- Helper: uid -----
function uid() {
  return "t_" + Math.random().toString(36).slice(2, 9);
}

// ----- Add -----
function handleAdd() {
  const text = input.value.trim();
  if (!text) {
    flashInput("Enter a task first!");
    return;
  }
  const category = categorySelect?.value || "General";
  const newTask = { id: uid(), text, completed: false, category };
  tasks.unshift(newTask); // add to top
  saveTasksToStorage();
  playSound(audioAdd);
  input.value = "";
  render();
}

// minor UI feedback
function flashInput(msg) {
  // simple alert alternative
  alert(msg);
}

// ----- Save / Load -----
function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function loadTasksFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      tasks = JSON.parse(raw);
    } catch (e) {
      tasks = [];
    }
  }
}

// ----- Render -----
function render() {
  // current filter
  const activeFilter =
    document.querySelector(".filter-btn.active")?.dataset?.filter || "all";
  // clear
  list.innerHTML = "";

  // ensure order preserved (tasks array already stores order)
  const visible = tasks.filter((t) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return !t.completed;
    if (activeFilter === "completed") return t.completed;
    return true;
  });

  if (visible.length === 0) {
    const el = document.createElement("div");
    el.className = "empty";
    el.style.padding = "18px";
    el.style.color = "var(--muted)";
    el.textContent = "No tasks — add something awesome!";
    list.appendChild(el);
    return;
  }

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.setAttribute("draggable", "true");
    li.dataset.id = task.id;

    if (task.completed) li.classList.add("completed");

    // inner structure
    li.innerHTML = `
      <div class="left">
        <div class="checkbox ${
          task.completed ? "checked" : ""
        }" aria-hidden="true"></div>
        <div style="min-width:0">
          <div class="task-text" title="${escapeHtml(task.text)}">${escapeHtml(
      task.text
    )}</div>
          <div class="cat" aria-hidden="true">${escapeHtml(task.category)}</div>
        </div>
      </div>
      <div class="actions">
        <button class="icon-btn btn-edit" title="Edit">✏️</button>
        <button class="delete-btn" title="Delete">Delete</button>
      </div>
    `;

    // append
    list.appendChild(li);
  });
}

// simple escape
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ----- List click handler (toggle, delete, edit) -----
function handleListClick(e) {
  const li = e.target.closest("li.todo-item");
  if (!li) return;
  const id = li.dataset.id;
  // delete
  if (e.target.closest(".delete-btn")) {
    // animation then remove
    li.style.transition = "opacity .18s ease, transform .18s ease";
    li.style.opacity = "0";
    li.style.transform = "translateX(12px) scale(.98)";
    setTimeout(() => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasksToStorage();
      playSound(audioDelete);
      render();
    }, 170);
    return;
  }
  // edit
  if (e.target.closest(".btn-edit")) {
    showEditPrompt(id);
    return;
  }
  // toggle checkbox or left area click toggles completion
  if (e.target.closest(".checkbox") || e.target.closest(".left")) {
    toggleComplete(id);
    return;
  }
}

// toggle complete
function toggleComplete(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTasksToStorage();
  playSound(audioComplete);
  render();
}

// edit flow
function showEditPrompt(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const newText = prompt("Edit task", t.text);
  if (newText === null) return; // canceled
  t.text = newText.trim() || t.text;
  saveTasksToStorage();
  render();
}

// ----- Filters -----
function handleFilter(e) {
  filterBtns.forEach((b) => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  render();
}

// ----- Drag & Drop -----
let dragId = null;

function handleDragStart(e) {
  const li = e.target.closest("li.todo-item");
  if (!li) return;
  dragId = li.dataset.id;
  li.classList.add("dragging");
  // set transfer for Firefox
  try {
    e.dataTransfer.setData("text/plain", dragId);
  } catch {}
  e.dataTransfer.effectAllowed = "move";
}
function handleDragOver(e) {
  e.preventDefault();
  const over = e.target.closest("li.todo-item");
  if (!over || !dragId || over.dataset.id === dragId) return;

  // find positions
  const draggingEl = document.querySelector(
    `li.todo-item[data-id="${dragId}"]`
  );
  if (!draggingEl) return;

  const bounding = over.getBoundingClientRect();
  const offset = e.clientY - bounding.top;
  // if mouse in top half -> insert before, else after
  const parent = list;
  if (offset < bounding.height / 2) {
    parent.insertBefore(draggingEl, over);
  } else {
    parent.insertBefore(draggingEl, over.nextSibling);
  }
}
function handleDrop(e) {
  e.preventDefault();
  // recalc order from DOM and save
  const ids = Array.from(list.querySelectorAll("li.todo-item"))
    .map((li) => li.dataset.id)
    .filtert(Boolean);

  // reorder tasks array according to ids (keep only visible ones first, then append others)
  // It create new order: start with ids in DOM in same order, then append tasks not visible (if filtered)
  const idSet = new Set(ids);
  const ordered = [];
  // first ids in DOM (these are visible subset)
  ids.forEach((id) => {
    const t = tasks.find((x) => x.id === id);
    if (t) ordered.push(t);
  });
  // append remaining tasks that were filtered out (keep their relative order)
  tasks.forEach((t) => {
    if (!idSet.has(t.id)) ordered.push(t);
  });
  tasks = ordered;
  saveTasksToStorage();
  render();
  dragId = null;
}
function handleDragEnd(e) {
  const el = e.target.closest("li.todo-item");
  if (el) el.classList.remove("dragging");
  dragId = null;
}

// ----- Sound: play with fallback -----
function playSound(audioElem) {
  if (!audioElem) return beep();
  // try playing the HTMLAudioElement if src exists
  try {
    if (audioElem.src) {
      audioElem.currentTime = 0;
      audioElem.play().catch(() => beep());
      return;
    } else {
      beep();
    }
  } catch (e) {
    beep();
  }
}

// simple beep fallback using WebAudio
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 600;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 120);
  } catch (e) {
    /* silent fail */
  }
}

// ----- Utility / load on start -----
function renderStats() {}
