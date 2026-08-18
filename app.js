/* ══════════════════════════════════════════════════════════════
   COURSE PLANNER — app.js
   Fully client-side · localStorage persistence · RTL Persian
   ══════════════════════════════════════════════════════════════ */

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────
const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];
const TIME_SLOTS = [
  '07:30', '08:00', '08:30', '09:00', '09:30', '10:00',
  '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00',
];
const COLORS = [
  { key: 'c0', val: 'hsl(212 80% 58%)' },
  { key: 'c1', val: 'hsl(280 70% 62%)' },
  { key: 'c2', val: 'hsl(142 55% 48%)' },
  { key: 'c3', val: 'hsl(38  85% 56%)' },
  { key: 'c4', val: 'hsl(0   65% 58%)' },
  { key: 'c5', val: 'hsl(170 60% 46%)' },
  { key: 'c6', val: 'hsl(320 65% 60%)' },
  { key: 'c7', val: 'hsl(55  80% 52%)' },
  { key: 'c8', val: 'hsl(25  80% 58%)' },
  { key: 'c9', val: 'hsl(195 70% 50%)' },
];
const STORAGE_KEY = 'course_planner_v1';
const THEME_KEY   = 'course_planner_theme';

// ── THEME ──────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // Update ARIA label so screen-readers report the current state
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.setAttribute('aria-label', theme === 'light' ? 'رفتن به دارک مود' : 'رفتن به لایت مود');
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme !== 'light';
  const nextTheme = isDark ? 'light' : 'dark';

  localStorage.setItem(THEME_KEY, nextTheme);

  // ── View Transitions circular reveal ──
  if (!document.startViewTransition) {
    applyTheme(nextTheme);
    return;
  }

  const btn = document.getElementById('btn-theme-toggle');
  const rect = btn.getBoundingClientRect();
  // Origin = center of the toggle button
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  // Radius must reach the farthest corner of the viewport
  const maxR = Math.hypot(
    Math.max(cx, window.innerWidth  - cx),
    Math.max(cy, window.innerHeight - cy)
  );

  const transition = document.startViewTransition(() => applyTheme(nextTheme));

  transition.ready.then(() => {
    // Clip from the button outward for the incoming (new) snapshot
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${cx}px ${cy}px)`,
          `circle(${maxR}px at ${cx}px ${cy}px)`,
        ],
      },
      {
        duration: 480,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  });
}

// ── STATE ──────────────────────────────────────────────────────
let state = {
  plans: [
    { id: uid(), name: 'پلن الف', courses: [] },
  ],
  activePlanId: null,
};

function getActivePlan() {
  return state.plans.find(p => p.id === state.activePlanId) || state.plans[0];
}

function getActiveCourses() {
  return getActivePlan()?.courses || [];
}

// ── PERSISTENCE ────────────────────────────────────────────────
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.plans) && s.plans.length) {
        state = s;
      }
    }
  } catch {}
  if (!state.activePlanId) state.activePlanId = state.plans[0].id;

  // Restore saved theme
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') applyTheme(saved);
}

// ── UTILITIES ──────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toPersianNum(n) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'صبح' : 'بعدازظهر';
  const hh = h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(d) {
  if (!d) return '';
  // d is stored as Gregorian ISO (YYYY-MM-DD)
  const [gy, gm, gd] = d.split('-').map(Number);
  if (!gy || isNaN(gy)) return d;
  if (typeof jalaali === 'undefined') return d;
  const j = jalaali.toJalaali(gy, gm, gd);
  return `${toPersianNum(j.jd)} ${JMONTHS_REF()[j.jm - 1]} ${toPersianNum(j.jy)}`;
}

function colorVar(key) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim();
}

function nextColor(courses) {
  const used = courses.map(c => c.colorKey);
  return COLORS.find(c => !used.includes(c.key))?.key || COLORS[courses.length % COLORS.length].key;
}

// Jalali month names — defined by jalali-picker.js (window.JMONTHS)
// Fallback in case script loads out of order
const JMONTHS_REF = () => window.JMONTHS || ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

// ── PICKER INSTANCE ────────────────────────────────────────────
let examDatePicker = null;

// ── CONFLICT DETECTION ─────────────────────────────────────────
function detectConflicts(courses) {
  const conflicts = new Set();
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i], b = courses[j];
      // Check class time overlap per shared day
      const sharedDays = a.days.filter(d => b.days.includes(d));
      if (sharedDays.length > 0 && a.timeStart && b.timeStart) {
        const aS = timeToMinutes(a.timeStart), aE = timeToMinutes(a.timeEnd);
        const bS = timeToMinutes(b.timeStart), bE = timeToMinutes(b.timeEnd);
        if (aS < bE && bS < aE) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
  }
  return conflicts;
}

function detectExamConflicts(courses) {
  const byDate = {};
  courses.forEach(c => {
    if (c.examDate) {
      (byDate[c.examDate] = byDate[c.examDate] || []).push(c.id);
    }
  });
  return new Set(Object.values(byDate).filter(ids => ids.length > 1).flat());
}

// ── RENDER ─────────────────────────────────────────────────────
function render() {
  renderPlanTabs();
  renderCourseList();
  renderWeekGrid();
  renderExamsList();
  renderStats();
}

/* ── PLAN TABS ── */
function renderPlanTabs() {
  const nav = document.querySelector('.plan-tabs');
  nav.innerHTML = state.plans.map(p => `
    <button class="plan-tab ${p.id === state.activePlanId ? 'active' : ''}"
            role="tab"
            aria-selected="${p.id === state.activePlanId}"
            data-plan-id="${p.id}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      </svg>
      ${escHtml(p.name)}
      ${state.plans.length > 1
        ? `<span class="tab-delete" data-delete-plan="${p.id}" aria-label="حذف پلن ${escHtml(p.name)}">✕</span>`
        : ''}
    </button>
  `).join('');
}

/* ── COURSE LIST ── */
function renderCourseList() {
  const courses = getActiveCourses();
  const conflicts = detectConflicts(courses);
  const list = document.getElementById('courses-list');
  const empty = document.getElementById('courses-empty');

  if (!courses.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  list.style.display = 'flex';
  empty.style.display = 'none';

  list.innerHTML = courses.map(c => {
    const color = COLORS.find(x => x.key === c.colorKey)?.val || COLORS[0].val;
    const hasConflict = conflicts.has(c.id);
    const subs = c.subsections || [];

    const subsHtml = subs.map(s => {
      const isTA  = s.type === 'ta';
      const isLab = s.type === 'lab';
      const subDayNames = (s.days || []).map(d => DAYS[d]).join('، ');
      const subTime = s.timeStart ? `${s.timeStart}–${s.timeEnd}` : '';
      return `
        <div class="course-subsection">
          <span class="sub-connector"></span>
          <span class="course-badge ${isTA ? 'badge-ta' : 'badge-lab'}">
            ${isTA ? 'TA' : 'آزمایشگاه'}
          </span>
          ${s.taName ? `<span class="sub-ta-label">${escHtml(s.taName)}</span>` : ''}
          ${subDayNames ? `<span class="sub-detail">${subDayNames}</span>` : ''}
          ${subTime    ? `<span class="sub-detail sub-time">${subTime}</span>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="course-item ${subs.length ? 'has-subsections' : ''}"
           role="listitem"
           data-course-id="${c.id}"
           style="--course-color:${color}">
        <span class="course-color-dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>
        <div class="course-info">
          <div class="course-name">${escHtml(c.name)}</div>
          <div class="course-meta">
            <span>${toPersianNum(c.units)} واحد</span>
            ${c.prof ? `<span>· ${escHtml(c.prof)}</span>` : ''}
            ${hasConflict ? '<span class="course-badge badge-conflict">⚠ تداخل</span>' : ''}
          </div>
          ${subsHtml}
        </div>
        <div class="course-actions">
          <button class="action-btn edit-btn" data-edit="${c.id}" title="ویرایش" aria-label="ویرایش ${escHtml(c.name)}">✏️</button>
          <button class="action-btn del-btn"  data-del="${c.id}"  title="حذف"    aria-label="حذف ${escHtml(c.name)}">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── STATS ── */
function renderStats() {
  const courses = getActiveCourses();
  const totalUnits = courses.reduce((s, c) => s + Number(c.units || 0), 0);
  const activeDays = new Set(courses.flatMap(c => c.days)).size;
  const conflicts = detectConflicts(courses).size / 2;

  document.getElementById('stat-units').textContent = toPersianNum(totalUnits);
  document.getElementById('stat-courses').textContent = toPersianNum(courses.length);
  document.getElementById('stat-days').textContent = toPersianNum(activeDays);

  const conflictCard = document.getElementById('stat-conflict-card');
  const conflictVal  = document.getElementById('stat-conflicts');
  if (conflicts > 0) {
    conflictCard.style.display = '';
    conflictVal.textContent = toPersianNum(Math.ceil(conflicts));
  } else {
    conflictCard.style.display = 'none';
  }
}

/* ── WEEK GRID ── */
function renderWeekGrid() {
  const courses = getActiveCourses();
  const el = document.getElementById('week-grid');

  if (!courses.length) {
    el.innerHTML = `<div class="week-empty">📅 درسی برای نمایش وجود ندارد</div>`;
    return;
  }

  // Build slot map: key `${dayIndex}-${timeSlot}` → array of entries
  const slotMap = {};

  courses.forEach(c => {
    const color = COLORS.find(x => x.key === c.colorKey)?.val || COLORS[0].val;

    // ── Main course on its own days ──
    if (c.timeStart) {
      c.days.forEach(day => {
        const key = `${day}-${c.timeStart}`;
        (slotMap[key] = slotMap[key] || []).push({
          name: c.name, start: c.timeStart, end: c.timeEnd,
          color, type: 'کلاس', isSubsection: false,
        });
      });
    }

    // ── Subsections on THEIR OWN independent days ──
    (c.subsections || []).forEach(s => {
      if (!s.timeStart || !s.days?.length) return;
      s.days.forEach(day => {
        const key = `${day}-${s.timeStart}`;
        (slotMap[key] = slotMap[key] || []).push({
          name: c.name,
          start: s.timeStart, end: s.timeEnd,
          color, type: s.type === 'ta' ? 'TA' : 'آزمایشگاه',
          isSubsection: true,
          taName: s.taName || '',
        });
      });
    });
  });

  // Determine time range
  let minT = 8 * 60, maxT = 18 * 60;
  courses.forEach(c => {
    if (c.timeStart) minT = Math.min(minT, timeToMinutes(c.timeStart));
    if (c.timeEnd)   maxT = Math.max(maxT, timeToMinutes(c.timeEnd));
  });
  const slots = TIME_SLOTS.filter(t => {
    const m = timeToMinutes(t);
    return m >= minT - 30 && m <= maxT;
  });

  const table = document.createElement('table');
  table.className = 'week-table';
  table.setAttribute('role', 'grid');

  // Header
  const thead = table.createTHead();
  const hrow = thead.insertRow();
  hrow.insertCell().innerHTML = `<th class="week-time-col">ساعت</th>`;
  DAYS.forEach(d => {
    const th = document.createElement('th');
    th.textContent = d;
    hrow.appendChild(th);
  });

  // Body
  const tbody = table.createTBody();
  slots.forEach(slot => {
    const tr = tbody.insertRow();
    const timeTd = tr.insertCell();
    timeTd.className = 'week-time-col';
    timeTd.textContent = slot;

    DAYS.forEach((_, dayIdx) => {
      const td = tr.insertCell();
      const key = `${dayIdx}-${slot}`;
      const entries = slotMap[key] || [];
        entries.forEach(entry => {
          const div = document.createElement('div');
          // Subsections get a dashed border + lower opacity to visually differ from main class
          div.className = `week-slot ${entry.isSubsection ? 'week-slot-sub' : ''}`;
          div.style.cssText = entry.isSubsection
            ? `background:${entry.color}15;border-color:${entry.color}44;color:${entry.color};`
            : `background:${entry.color}22;border-color:${entry.color}55;color:${entry.color};`;
          const subLabel = entry.isSubsection && entry.taName
            ? `<div class="week-slot-sub-label">${escHtml(entry.taName)}</div>` : '';
          div.innerHTML = `
            <div class="week-slot-name">${escHtml(entry.name)}</div>
            ${subLabel}
            <div class="week-slot-time">${entry.start}–${entry.end}</div>
            <span class="week-slot-type">${entry.type}</span>
          `;
          td.appendChild(div);
        });
    });
  });

  el.innerHTML = '';
  el.appendChild(table);
}

/* ── EXAMS LIST ── */
function renderExamsList() {
  const courses = getActiveCourses();
  const el = document.getElementById('exams-list');
  const examConflicts = detectExamConflicts(courses);

  const withExams = courses.filter(c => c.examDate);
  if (!withExams.length) {
    el.innerHTML = `<div class="exams-empty"><span>📝</span><span>هنوز تاریخ امتحانی ثبت نشده</span></div>`;
    return;
  }

  // Sort by date
  const sorted = [...withExams].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  el.innerHTML = sorted.map(c => {
    const color = COLORS.find(x => x.key === c.colorKey)?.val || COLORS[0].val;
    const isConflict = examConflicts.has(c.id);
    return `
      <div class="exam-card ${isConflict ? 'has-conflict' : ''}" role="listitem">
        <div class="exam-dot" style="background:${color};box-shadow:0 0 6px ${color}"></div>
        <div class="exam-info">
          <div class="exam-name">${escHtml(c.name)}</div>
          <div class="exam-date">
            ${formatDate(c.examDate)}
            ${c.examTime ? ` · ساعت ${formatTime(c.examTime)}` : ''}
          </div>
        </div>
        ${isConflict ? '<div class="exam-conflict-badge">⚠️ تداخل امتحانات</div>' : ''}
      </div>
    `;
  }).join('');
}

// ── MODAL: COURSE ───────────────────────────────────────────────
let subsections = []; // temp state while modal is open

function openCourseModal(course = null) {
  const modal = document.getElementById('modal-course');
  const title = document.getElementById('modal-course-title');
  const form  = document.getElementById('form-course');

  title.textContent = course ? 'ویرایش درس' : 'افزودن درس جدید';
  form.reset();
  document.getElementById('course-edit-id').value = course?.id || '';

  // Fill fields
  document.getElementById('course-name').value  = course?.name  || '';
  document.getElementById('course-units').value = course?.units || 3;
  document.getElementById('course-prof').value  = course?.prof  || '';
  document.getElementById('course-time-start').value = course?.timeStart || '08:00';
  document.getElementById('course-time-end').value   = course?.timeEnd   || '10:00';
  document.getElementById('course-exam-time').value  = course?.examTime  || '';

  // Jalali exam date picker
  if (!examDatePicker) {
    examDatePicker = new JalaliPicker(
      document.getElementById('course-exam-date-display'),
      document.getElementById('course-exam-date'),
      document.getElementById('jalali-cal')
    );
  }
  if (course?.examDate) {
    examDatePicker.setFromISO(course.examDate);
  } else {
    examDatePicker.clear();
  }

  // Days
  document.querySelectorAll('.day-btn').forEach(btn => {
    const d = Number(btn.dataset.day);
    btn.classList.toggle('selected', course?.days?.includes(d) || false);
  });

  // Subsections
  subsections = course?.subsections ? JSON.parse(JSON.stringify(course.subsections)) : [];
  renderSubsections();

  // Colors
  renderColorPicker(course?.colorKey || nextColor(getActiveCourses()));

  modal.showModal();
  document.getElementById('course-name').focus();
}

function renderSubsections() {
  const area = document.getElementById('subsections-area');
  area.innerHTML = subsections.map((s, i) => `
    <div class="subsection-item" data-sub-idx="${i}">
      <div class="subsection-header">
        <span class="subsection-type-badge ${s.type === 'ta' ? 'badge-type-ta' : 'badge-type-lab'}">
          ${s.type === 'ta' ? 'TA' : 'آزمایشگاه'}
        </span>
        <button type="button" class="subsection-remove" data-remove-sub="${i}" aria-label="حذف">✕</button>
      </div>
      <p class="sub-info-note">زیرمجموعه این درس — روز و ساعت مستقل · بدون امتحان</p>
      <div class="form-row">
        <div class="form-group">
          <label>ساعت شروع</label>
          <input type="time" class="sub-time-start" data-sub="${i}" value="${s.timeStart || '14:00'}" />
        </div>
        <div class="form-group">
          <label>ساعت پایان</label>
          <input type="time" class="sub-time-end" data-sub="${i}" value="${s.timeEnd || '16:00'}" />
        </div>
      </div>
      <div class="form-group">
        <label>روزهای ${s.type === 'ta' ? 'TA' : 'آزمایشگاه'} <span style="font-weight:400;color:var(--text-muted)">(مستقل از درس اصلی)</span></label>
        <div class="days-picker">
          ${DAYS.map((d, di) => `
            <button type="button" class="day-btn sub-day-btn ${s.days?.includes(di) ? 'selected' : ''}"
                    data-sub="${i}" data-day="${di}">${d}</button>
          `).join('')}
        </div>
      </div>
      ${s.type === 'ta' ? `
      <div class="form-group">
        <label>نام TA</label>
        <input type="text" class="sub-ta-name" data-sub="${i}" value="${escHtml(s.taName || '')}" placeholder="نام دستیار آموزشی" />
      </div>` : ''}
    </div>
  `).join('');
}

function renderColorPicker(selectedKey) {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = COLORS.map(c => `
    <button type="button"
            class="color-swatch ${c.key === selectedKey ? 'selected' : ''}"
            data-color-key="${c.key}"
            style="background:${c.val};--swatch-color:${c.val}"
            aria-label="رنگ ${c.key}"
            aria-pressed="${c.key === selectedKey}">
    </button>
  `).join('');
}

function getSelectedColorKey() {
  return document.querySelector('.color-swatch.selected')?.dataset.colorKey || COLORS[0].key;
}

function getSelectedDays() {
  return [...document.querySelectorAll('.day-btn.selected')]
    .map(b => Number(b.dataset.day));
}

function closeCourseModal() {
  if (examDatePicker) examDatePicker.close();
  document.getElementById('modal-course').close();
}

// ── MODAL: PLAN ─────────────────────────────────────────────────
function openPlanModal() {
  const modal = document.getElementById('modal-plan');
  document.getElementById('plan-name-input').value = '';
  modal.showModal();
  document.getElementById('plan-name-input').focus();
}

function closePlanModal() {
  document.getElementById('modal-plan').close();
}

// ── MODAL: CONFIRM ──────────────────────────────────────────────
let _confirmCallback = null;

function openConfirm(msg, cb) {
  document.getElementById('modal-confirm-msg').textContent = msg;
  _confirmCallback = cb;
  document.getElementById('modal-confirm').showModal();
}

// ── TOAST ───────────────────────────────────────────────────────
function toast(msg, type = 'success', duration = 3000) {
  const icon = { success: '✓', error: '✕', warning: '⚠' }[type] || '✓';
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icon}</span> ${escHtml(msg)}`;
  tc.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

// ── SAVE COURSE ─────────────────────────────────────────────────
function saveCourse(e) {
  e.preventDefault();
  const name  = document.getElementById('course-name').value.trim();
  const units = Number(document.getElementById('course-units').value) || 3;
  const prof  = document.getElementById('course-prof').value.trim();
  const tStart = document.getElementById('course-time-start').value;
  const tEnd   = document.getElementById('course-time-end').value;
  const examDate = document.getElementById('course-exam-date').value;
  const examTime = document.getElementById('course-exam-time').value;
  const days  = getSelectedDays();
  const colorKey = getSelectedColorKey();
  const editId = document.getElementById('course-edit-id').value;

  if (!name) { toast('نام درس الزامی است', 'error'); return; }
  if (!days.length) { toast('حداقل یک روز کلاس انتخاب کنید', 'error'); return; }

  // Read subsections from DOM
  const subs = subsections.map((s, i) => {
    const startEl = document.querySelector(`.sub-time-start[data-sub="${i}"]`);
    const endEl   = document.querySelector(`.sub-time-end[data-sub="${i}"]`);
    const taEl    = document.querySelector(`.sub-ta-name[data-sub="${i}"]`);
    const subDays = [...document.querySelectorAll(`.sub-day-btn[data-sub="${i}"].selected`)]
                      .map(b => Number(b.dataset.day));
    return {
      ...s,
      timeStart: startEl?.value || '',
      timeEnd:   endEl?.value   || '',
      days: subDays,
      taName: taEl?.value || '',
    };
  });

  const plan = getActivePlan();
  if (editId) {
    const idx = plan.courses.findIndex(c => c.id === editId);
    if (idx !== -1) {
      plan.courses[idx] = { ...plan.courses[idx], name, units, prof, days, timeStart: tStart, timeEnd: tEnd, examDate, examTime, colorKey, subsections: subs };
    }
    toast('درس ویرایش شد');
  } else {
    plan.courses.push({ id: uid(), name, units, prof, days, timeStart: tStart, timeEnd: tEnd, examDate, examTime, colorKey, subsections: subs });
    toast('درس اضافه شد');
  }

  saveState();
  render();
  closeCourseModal();
}

// ── VIEW SWITCHING ──────────────────────────────────────────────
function switchView(view) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view-content').forEach(v => {
    v.classList.toggle('active', v.id === `view-${view}-content`);
  });
}

// ── PDF EXPORT ──────────────────────────────────────────────────
function exportPDF() {
  // Ensure week view is active for print
  switchView('week');
  const plan = getActivePlan();
  const oldTitle = document.title;
  document.title = `انتخاب واحد — ${plan.name}`;
  window.print();
  document.title = oldTitle;
  toast('در حال آماده‌سازی PDF…', 'success', 2000);
}

// ── ESCAPE HTML ────────────────────────────────────────────────
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── EVENT DELEGATION ────────────────────────────────────────────
function bindEvents() {

  // ─ Topbar: add plan ─
  document.getElementById('btn-add-plan').addEventListener('click', openPlanModal);

  // ─ Topbar: PDF ─
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);

  // ─ Add course buttons ─
  document.getElementById('btn-add-course').addEventListener('click', () => openCourseModal());
  document.getElementById('btn-add-course-empty').addEventListener('click', () => openCourseModal());

  // ─ Plan tabs (delegation) ─
  document.querySelector('.plan-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.plan-tab');
    const del = e.target.closest('[data-delete-plan]');
    if (del) {
      e.stopPropagation();
      const planId = del.dataset.deletePlan;
      const plan = state.plans.find(p => p.id === planId);
      openConfirm(`پلن «${plan?.name}» حذف شود؟`, () => {
        state.plans = state.plans.filter(p => p.id !== planId);
        if (state.activePlanId === planId) state.activePlanId = state.plans[0].id;
        saveState(); render();
        toast('پلن حذف شد', 'success');
      });
      return;
    }
    if (tab) {
      state.activePlanId = tab.dataset.planId;
      saveState(); render();
    }
  });

  // ─ Course list (delegation) ─
  document.getElementById('courses-list').addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');
    if (editBtn) {
      const course = getActiveCourses().find(c => c.id === editBtn.dataset.edit);
      if (course) openCourseModal(course);
    } else if (delBtn) {
      const course = getActiveCourses().find(c => c.id === delBtn.dataset.del);
      if (!course) return;
      openConfirm(`درس «${course.name}» حذف شود؟`, () => {
        getActivePlan().courses = getActivePlan().courses.filter(c => c.id !== course.id);
        saveState(); render();
        toast('درس حذف شد', 'success');
      });
    }
  });

  // ─ Course modal: close ─
  document.getElementById('modal-course-close').addEventListener('click', closeCourseModal);
  document.getElementById('btn-cancel-course').addEventListener('click', closeCourseModal);
  document.getElementById('modal-course').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCourseModal();
  });

  // ─ Course form submit ─
  document.getElementById('form-course').addEventListener('submit', saveCourse);

  // ─ Day picker (main) ─
  document.getElementById('days-picker').addEventListener('click', e => {
    const btn = e.target.closest('.day-btn');
    if (btn) btn.classList.toggle('selected');
  });

  // ─ Color picker ─
  document.getElementById('color-picker').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if (!sw) return;
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.remove('selected');
      s.setAttribute('aria-pressed', 'false');
    });
    sw.classList.add('selected');
    sw.setAttribute('aria-pressed', 'true');
  });

  // ─ Add subsections ─
  document.getElementById('btn-add-ta').addEventListener('click', () => {
    subsections.push({ type: 'ta', timeStart: '14:00', timeEnd: '16:00', days: [], taName: '' });
    renderSubsections();
  });
  document.getElementById('btn-add-lab').addEventListener('click', () => {
    subsections.push({ type: 'lab', timeStart: '14:00', timeEnd: '16:00', days: [] });
    renderSubsections();
  });

  // ─ Subsection events (delegation) ─
  document.getElementById('subsections-area').addEventListener('click', e => {
    const rem = e.target.closest('[data-remove-sub]');
    if (rem) {
      const idx = Number(rem.dataset.removeSub);
      subsections.splice(idx, 1);
      renderSubsections();
      return;
    }
    const dayBtn = e.target.closest('.sub-day-btn');
    if (dayBtn) dayBtn.classList.toggle('selected');
  });

  // ─ Plan modal ─
  document.getElementById('modal-plan-close').addEventListener('click', closePlanModal);
  document.getElementById('btn-plan-cancel').addEventListener('click', closePlanModal);
  document.getElementById('modal-plan').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePlanModal();
  });
  document.getElementById('btn-plan-save').addEventListener('click', () => {
    const name = document.getElementById('plan-name-input').value.trim();
    if (!name) { toast('نام پلن الزامی است', 'error'); return; }
    const newPlan = { id: uid(), name, courses: [] };
    state.plans.push(newPlan);
    state.activePlanId = newPlan.id;
    saveState(); render();
    closePlanModal();
    toast(`پلن «${name}» ساخته شد`);
  });
  document.getElementById('plan-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-plan-save').click();
  });

  // ─ Confirm modal ─
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    document.getElementById('modal-confirm').close();
  });
  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    document.getElementById('modal-confirm').close();
    if (typeof _confirmCallback === 'function') _confirmCallback();
    _confirmCallback = null;
  });

  // ─ View toggle ─
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ─ Theme toggle ─
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

  // ─ Keyboard: Escape closes modals ─
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // <dialog> handles this natively, but just in case:
    }
  });
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindEvents();
  render();
});
