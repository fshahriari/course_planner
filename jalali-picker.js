/* ══════════════════════════════════════════════════════════════
   jalali-picker.js — Custom Shamsi/Jalali date picker
   Pure vanilla JS · RTL · Dark theme · No dependencies
   (requires jalaali-js to be loaded first)
   ══════════════════════════════════════════════════════════════ */

/* jshint esversion: 9 */

const JMONTHS = window.JMONTHS = [
  'فروردین','اردیبهشت','خرداد',
  'تیر','مرداد','شهریور',
  'مهر','آبان','آذر',
  'دی','بهمن','اسفند',
];

// Week starts Saturday (Iranian standard)
// JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
// Iran order: Sat(0) Sun(1) Mon(2) Tue(3) Wed(4) Thu(5) Fri(6)
const JWEEK_SHORT = ['ش','ی','د','س','چ','پ','ج'];

function _jp(n) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

class JalaliPicker {
  /**
   * @param {HTMLInputElement} inputEl  — visible text input
   * @param {HTMLInputElement} hiddenEl — hidden input storing ISO Gregorian date
   * @param {HTMLElement}      calEl    — empty div used as calendar popover
   */
  constructor(inputEl, hiddenEl, calEl) {
    this.inputEl  = inputEl;
    this.hiddenEl = hiddenEl;
    this.calEl    = calEl;

    // Selected date (Jalali)
    this._jy = null; this._jm = null; this._jd = null;

    // Currently viewed month
    const t = this._todayJ();
    this._vy = t.jy; this._vm = t.jm;

    this._open = false;
    this._bindInputEvents();
  }

  /* ── Public API ───────────────────────────────────────────── */

  /** Set picker from a Gregorian ISO string like "2025-09-14" */
  setFromISO(iso) {
    if (!iso) { this.clear(); return; }
    const [gy, gm, gd] = iso.split('-').map(Number);
    if (!gy) { this.clear(); return; }
    const j = jalaali.toJalaali(gy, gm, gd);
    this._jy = j.jy; this._jm = j.jm; this._jd = j.jd;
    this._vy = j.jy; this._vm = j.jm;
    this._refreshDisplay();
  }

  /** Clear selection */
  clear() {
    this._jy = this._jm = this._jd = null;
    this.inputEl.value  = '';
    this.hiddenEl.value = '';
    const t = this._todayJ();
    this._vy = t.jy; this._vm = t.jm;
  }

  /** Close the calendar without changing selection */
  close() {
    if (!this._open) return;
    this._open = false;
    this.calEl.setAttribute('hidden', '');
  }

  /* ── Private ──────────────────────────────────────────────── */

  _todayJ() {
    const n = new Date();
    return jalaali.toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  _refreshDisplay() {
    if (this._jy) {
      this.inputEl.value = `${_jp(this._jy)}/${_jp(String(this._jm).padStart(2,'0'))}/${_jp(String(this._jd).padStart(2,'0'))}`;
      const g = jalaali.toGregorian(this._jy, this._jm, this._jd);
      this.hiddenEl.value = `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}`;
    }
  }

  _bindInputEvents() {
    this.inputEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this._open ? this.close() : this._show();
    });
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._open ? this.close() : this._show(); }
      if (e.key === 'Escape') this.close();
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this._open && !this.calEl.contains(e.target) && e.target !== this.inputEl) {
        this.close();
      }
    });
  }

  _show() {
    this._open = true;
    this._render();
    this.calEl.removeAttribute('hidden');
    this._position();
  }

  _position() {
    const rect = this.inputEl.getBoundingClientRect();
    const CAL_W = 294;
    // RTL: right-align calendar to input's right edge
    let right = window.innerWidth - rect.right;
    right = Math.max(8, Math.min(right, window.innerWidth - CAL_W - 8));
    let top = rect.bottom + 6;
    // Flip upward if not enough space below
    if (top + 320 > window.innerHeight) top = rect.top - 320 - 6;

    Object.assign(this.calEl.style, {
      position: 'fixed',
      top: top + 'px',
      right: right + 'px',
      left: 'auto',
      width: CAL_W + 'px',
      zIndex: '99999',
    });
  }

  _prevMonth() {
    if (--this._vm < 1) { this._vm = 12; this._vy--; }
    this._render(); this._position();
  }

  _nextMonth() {
    if (++this._vm > 12) { this._vm = 1; this._vy++; }
    this._render(); this._position();
  }

  _selectDay(jd) {
    this._jy = this._vy;
    this._jm = this._vm;
    this._jd = jd;
    this._refreshDisplay();
    this.close();
  }

  _render() {
    const daysInMonth = jalaali.jalaaliMonthLength(this._vy, this._vm);

    // First weekday offset (Sat = 0)
    const g1 = jalaali.toGregorian(this._vy, this._vm, 1);
    const dow = new Date(g1.gy, g1.gm - 1, g1.gd).getDay(); // 0=Sun
    const offset = (dow + 1) % 7; // 0=Sat … 6=Fri

    const today = this._todayJ();

    /* ── Build HTML ──────────────────────────────────────────── */
    let html = `
      <div class="jcal-header">
        <button type="button" class="jcal-nav" data-jnav="prev" aria-label="ماه قبل">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <span class="jcal-title">${JMONTHS[this._vm - 1]} ${_jp(this._vy)}</span>
        <button type="button" class="jcal-nav" data-jnav="next" aria-label="ماه بعد">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
      <div class="jcal-grid" role="grid" aria-label="روزهای ماه">
        <div class="jcal-dow-row" role="row">
          ${JWEEK_SHORT.map(d => `<span class="jcal-dow" role="columnheader">${d}</span>`).join('')}
        </div>
        <div class="jcal-days-row" role="row">
          ${Array(offset).fill('<span class="jcal-cell"></span>').join('')}
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const isSel = this._jy === this._vy && this._jm === this._vm && this._jd === d;
      const isToday = today.jy === this._vy && today.jm === this._vm && today.jd === d;
      const cls = ['jcal-cell jcal-day', isSel && 'sel', isToday && 'today'].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-jd="${d}" role="gridcell" aria-selected="${isSel}">${_jp(d)}</button>`;
    }

    html += `</div></div>`;

    if (this._jy) {
      html += `
        <div class="jcal-footer">
          <button type="button" class="jcal-clear-btn" data-jclear>پاک کردن تاریخ</button>
        </div>`;
    }

    this.calEl.innerHTML = html;

    /* ── Bind events ─────────────────────────────────────────── */
    this.calEl.querySelectorAll('[data-jnav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.dataset.jnav === 'prev' ? this._prevMonth() : this._nextMonth();
      });
    });

    this.calEl.querySelectorAll('.jcal-day').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectDay(Number(btn.dataset.jd));
      });
    });

    const clrBtn = this.calEl.querySelector('[data-jclear]');
    if (clrBtn) {
      clrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clear();
        this.close();
      });
    }

    // Stop propagation on calendar itself (prevent outside-click close)
    this.calEl.addEventListener('click', (e) => e.stopPropagation(), { once: false });
  }
}
