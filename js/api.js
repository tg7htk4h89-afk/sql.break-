/* KIB WFM api.js v2.1 - 20260414-2042 */
/* ═══════════════════════════════════════════════════════
   KIB WFM Portal v2 — API
   All n8n fetch calls — requires config.js
   ═══════════════════════════════════════════════════════ */

var API = (() => {

  /* ── Generic POST helper ──────────────────────────── */
  async function post(url, body, signal) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /* ── Cache helper ─────────────────────────────────── */
  // sessionStorage cache — persists across page navigations within the same session
  const CACHE_PREFIX = 'kib_cache_';
  function fromCache(key, ttl = 30000) {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const e = JSON.parse(raw);
      if (Date.now() - e.ts < ttl) return e.data;
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    } catch(e) { return null; }
  }
  function toCache(key, data) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
    } catch(e) {
      // sessionStorage full — clear old entries and retry
      try { sessionStorage.clear(); sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch(e2) {}
    }
  }
  function clearCache(key) {
    try {
      if (key) sessionStorage.removeItem(CACHE_PREFIX + key);
      else Object.keys(sessionStorage).filter(k=>k.startsWith(CACHE_PREFIX)).forEach(k=>sessionStorage.removeItem(k));
    } catch(e) {}
  }

  /* ── Public API ───────────────────────────────────── */
  return {

    /* ──────────────────────────────────────────────────
       READ — GET workflow  (action-based routing)
    ────────────────────────────────────────────────── */

    /** Full initial load — parallel calls, resilient with timeout */
    async getAll(force = false) {
      // Cache for entire shift — only force=true or manual sync bypasses this
      if (!force) {
        const cached = fromCache('getAll', 8 * 60 * 60 * 1000); // 8 hours = full shift
        if (cached) return cached;
      }
      // Debounce only user-triggered (manual) refresh, not auto-retries
      const now = Date.now();
      if (force === 'manual' && window._lastGetAll && (now - window._lastGetAll) < 30000) {
        const cached = fromCache('getAll', 999999);
        if (cached) return cached;
      }
      if (force) window._lastGetAll = now;

      const r = await fetch(CFG.N8N.GET_ALL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) throw new Error('HTTP_' + r.status);
      const raw = await r.text();
      let d = JSON.parse(raw);
      if (Array.isArray(d)) d = d[0] || {};
      if (!d.agents?.length) throw new Error('Schedule unavailable');
      return toCache('getAll', d);
    },

    /* ── Clear cache (call on logout or manual refresh) ── */
    clearCache() { clearCache(); },

    /* ── Individual action POSTs ──────────────────────── */
    async bookBreak(payload)        { return Auth.callAPI(CFG.N8N.BREAKS, payload); },
    async cancelBreak(payload)      { return Auth.callAPI(CFG.N8N.BREAKS, payload); },
    async startBreak(payload)       { return Auth.callAPI(CFG.N8N.BREAKS, payload); },
    async endBreak(payload)         { return Auth.callAPI(CFG.N8N.BREAKS, payload); },
    async submitLeave(payload)      { return Auth.callAPI(CFG.N8N.LEAVES, payload); },
    async submitSwap(payload)       { return Auth.callAPI(CFG.N8N.SWAPS, payload); },
    async actionSwap(payload)       { return Auth.callAPI(CFG.N8N.SWAPS, payload); },
    async actionLeave(payload)      { return Auth.callAPI(CFG.N8N.LEAVES, payload); },
    async submitKpi(payload)        { return Auth.callAPI(CFG.N8N.KPI, payload); },
    async markAttendance(payload)   { return Auth.callAPI(CFG.N8N.ATTENDANCE, payload); },
    async updateShift(payload)      { return Auth.callAPI(CFG.N8N.UPDATE_SHIFT, payload); },
    async bulkUpdateShifts(payload) { return Auth.callAPI(CFG.N8N.UPDATE_SHIFT, { action:'bulkUpdateShifts', ...payload }); },
    async submitSchedReq(payload)   { return Auth.callAPI(CFG.N8N.SCHED_REQ, payload); },
    async actionSchedReq(payload)   { return Auth.callAPI(CFG.N8N.SCHED_REQ, payload); },
    async sendNotif(payload)        { return Auth.callAPI(CFG.N8N.NOTIFY, payload); },


    /* ── Aliases used by HTML pages ───────────────────── */
    async saveBreaks(payload)           { return Auth.callAPI(CFG.N8N.BREAKS,       payload); },
    async refreshBreaks()               { return API.getAll(true); },
    async saveAttendance(payload)       { return Auth.callAPI(CFG.N8N.ATTENDANCE,   Array.isArray(payload) ? payload[0] : payload); },
    async saveKPI(type, payload)        { return Auth.callAPI(CFG.N8N.KPI,          { ...payload, sheet: type }); },
    async approveLeave(payload)         { return Auth.callAPI(CFG.N8N.APPROVE_LEAVE, payload); },
    async submitScheduleRequest(payload){ return Auth.callAPI(CFG.N8N.SCHED_REQ,    payload); },
    async actionSchedRequest(payload)   { return Auth.callAPI(CFG.N8N.SCHED_REQ,    payload); },
    async getNotifications(agent)       {
      const d = await API.getAll();
      return { ok: true, notifications: (d.notifications||[]).filter(n => !agent || n.to===agent || n.to==='all') };
    },
    async markNotificationsRead(ids)    { return { ok: true }; },

    /* ── Cache utilities ──────────────────────────────── */
    clearCache,
    fromCache,
  };
})();
