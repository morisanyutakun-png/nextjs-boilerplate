/**
 * GAS Booking System - PUBLIC + ADMIN (single project)
 *
 * ✅ Dev/Temporary mode in this file:
 * - Admin is accessible from the SAME webapp by ?admin=1
 * - No auth / no strict URL guard required to open admin
 *
 * ⚠️ After verification:
 * - Deploy Admin separately as "Only myself"
 * - Set ADMIN_WEBAPP_URL and re-enable strict guard
 */

const CFG_DEFAULT = {
  SHEET_SERVICES: 'Services',
  SHEET_AVAILABILITIES: 'Availabilities',
  SHEET_BOOKINGS: 'Bookings',
  SHEET_EVENTS: 'Events',
  SHEET_COURSES: 'Courses',

  HTML_PUBLIC: 'index',
  HTML_ADMIN: 'admin',

  TZ: Session.getScriptTimeZone(),
  CALENDAR_ID: 'primary',
  HORIZON_DAYS: 14,
  MIN_LEAD_MIN: 60,
  NOTIFY_OWNER_EMAIL: Session.getEffectiveUser().getEmail() || '',

  PUBLIC_WEBAPP_URL: '',
  ADMIN_WEBAPP_URL: '',

  EVENT_SYNC_DAYS: 30,

  // Standaloneの場合に使う（container-boundなら不要）
  SPREADSHEET_ID: '',
};

const PROP_KEYS = {
  CALENDAR_ID: 'CALENDAR_ID',
  HORIZON_DAYS: 'HORIZON_DAYS',
  MIN_LEAD_MIN: 'MIN_LEAD_MIN',
  NOTIFY_OWNER_EMAIL: 'NOTIFY_OWNER_EMAIL',
  PUBLIC_WEBAPP_URL: 'PUBLIC_WEBAPP_URL',
  ADMIN_WEBAPP_URL: 'ADMIN_WEBAPP_URL',
  EVENT_SYNC_DAYS: 'EVENT_SYNC_DAYS',
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  TEMPLATE_SCRIPT_ID: 'TEMPLATE_SCRIPT_ID',
  APP_SHEET_NAME: 'APP_SHEET_NAME',
  APP_CALENDAR_ID: 'APP_CALENDAR_ID',
  SETUP_DONE: 'SETUP_DONE',
  ADMIN_EXECUTOR_EMAIL: 'ADMIN_EXECUTOR_EMAIL',
  // ─── ポータル連携用 ───
  PORTAL_API_URL: 'PORTAL_API_URL',           // ポータル Admin API のベース URL (例: https://nextjsproto.vercel.app)
  PORTAL_ADMIN_SECRET: 'PORTAL_ADMIN_SECRET', // ポータル側の ADMIN_SHARED_SECRET と同じ値
  TENANT_SLUG: 'TENANT_SLUG',                 // ポータル上のテナント識別子 (slug)
  TENANT_NAME: 'TENANT_NAME',                 // ポータル上の表示名
  TENANT_CATEGORY: 'TENANT_CATEGORY',         // カテゴリ
};

/** =========================
 * Web entry
 * - Public: default
 * - Admin: ?admin=1   (TEMP: same deployment allowed)
 * ========================= */
function doGet(e) {
  // Debug log to Logger (visible in Apps Script Executions)
  var debugP = '(none)';
  try { debugP = JSON.stringify(e ? e.parameter : {}); } catch(_) {}
  console.log('[doGet] Entering with parameter:', debugP);

  // Cancel endpoint: support both query ?cancel=1&token=... AND path-based /cancel.html?token=...
  try {
    const path = (e && (e.pathInfo || '').toString().toLowerCase()) || '';
    const p = (e && e.parameter) ? e.parameter : {};
    const hasToken = !!(p && p.token);
    const hasBid = !!(p && (p.bid || p.booking_id));

    const isPathCancel = (path.indexOf('cancel') >= 0) && (hasToken || hasBid);
    const isQueryCancel = (p && String(p.cancel || '') === '1') && (hasToken || hasBid);

    if (isPathCancel || isQueryCancel) {
      // Render cancel.html and inject preload script
      try {
        const raw = HtmlService.createHtmlOutputFromFile('cancel');
        let content = raw.getContent();
        const preload = JSON.stringify({ token: (p && p.token) ? String(p.token) : '', bid: (p && (p.bid || p.booking_id)) ? String(p.bid || p.booking_id) : '' });
        const inject = `<script>window.PRELOADED = ${preload};</script>`;
        if (content.indexOf('<!--INJECT_PRELOAD-->') >= 0) content = content.replace('<!--INJECT_PRELOAD-->', inject);
        else content = inject + content;
        const out = HtmlService.createHtmlOutput(content).setTitle('キャンセル確認');
        return setXFrameSafe_(out, 'ALLOWALL');
      } catch (e) {
        const out = safeHtmlOutput_('cancel', 'キャンセル確認');
        return setXFrameSafe_(out, 'ALLOWALL');
      }
    }
  } catch (e2) {
    console.warn('doGet cancel detection error', e2);
  }

  // Parameter detection with fallbacks
  const p = (e && e.parameter) ? e.parameter : {};
  const path = (e && (e.pathInfo || '').toString().toLowerCase()) || '';

  // Setup wizard: ?setup=1 or /setup
  const isSetup = (p && String(p.setup || '') === '1') || (path.indexOf('setup') >= 0);
  if (isSetup) {
    try {
      console.log('[doGet] Serving setup.html');
      const out = safeHtmlOutput_('setup', 'セットアップ');
      return setXFrameSafe_(out, 'ALLOWALL');
    } catch (setupErr) {
      console.error('[doGet] Setup render error:', setupErr);
      const errorHtml = '<html><body style="font-family:sans-serif;padding:40px;">' +
        '<h1>セットアップページの読み込みに失敗しました</h1>' +
        '<p style="color:#dc2626;">' + String(setupErr && setupErr.message ? setupErr.message : setupErr) + '</p>' +
        '<p>スクリプトエディタで setup.html が存在するか確認してください。</p>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(errorHtml).setTitle('エラー');
    }
  }

  // Admin view: ?admin=1 or /admin
  const isAdmin = (p && String(p.admin || '') === '1') || (path.indexOf('admin') >= 0);
  if (isAdmin) {
    try {
      console.log('[doGet] Serving admin.html');
      const out = safeHtmlOutput_(CFG_DEFAULT.HTML_ADMIN, '管理画面');
      return setXFrameSafe_(out, 'ALLOWALL');
    } catch (adminErr) {
      console.error('[doGet] Admin render error:', adminErr);
      return HtmlService.createHtmlOutput('<h1>管理画面エラー</h1><p>' + adminErr.message + '</p>');
    }
  }

  // Default: public page
  console.log('[doGet] Serving index.html (default)');
  try {
    // Render static HTML, then inject initial data JSON to avoid template tags in the file
    const initialData = getInitialData();
    let raw = HtmlService.createHtmlOutputFromFile(CFG_DEFAULT.HTML_PUBLIC).getContent();

    const inject = '<script>\n  try { window.INITIAL_DATA = ' + JSON.stringify(initialData) + '; } catch(e) { window.INITIAL_DATA = null; }\n<\/script>';

    if (raw.indexOf('/* __INJECT_INITIAL_DATA__ */') >= 0) {
      raw = raw.replace('/* __INJECT_INITIAL_DATA__ */', inject);
    } else {
      // fallback: insert before closing </head>
      raw = raw.replace('</head>', inject + '\n</head>');
    }

    const out = HtmlService.createHtmlOutput(raw).setTitle('予約ページ');
    return setXFrameSafe_(out, 'ALLOWALL');
  } catch (err) {
    console.error('[doGet] Public render error:', err);
    const out = safeHtmlOutput_(CFG_DEFAULT.HTML_PUBLIC, '予約ページ');
    return setXFrameSafe_(out, 'ALLOWALL');
  }
}

/**
 * Returns initial state for the public booking page to avoid round-trips.
 */
function getInitialData() {
  const cfg = getRuntimeConfig_();
  const props = PropertiesService.getScriptProperties();
  const tz = cfg.TZ || Session.getScriptTimeZone();
  const now = new Date();
  
  // 1. コース情報の取得
  let courses = [];
  try {
    courses = listCourses_() || [];
  } catch(e) { console.warn('initial courses fetch failed', e); }

  // 2. 空き枠情報の取得（60日分）
  let slots = [];
  try {
    // getAvailableSlots が horizon パラメータを考慮するように修正済み
    slots = getAvailableSlots(null, { noCache: false, horizon: 60 }) || [];
  } catch(e) { console.warn('initial slots fetch failed', e); }

  // 3. カレンダーイベントの取得（カレンダー上のマーク用）
  let events = [];
  try {
    const startIso = toLocalIso_(startOfDay_(now, tz), tz);
    const endIso = toLocalIso_(addDays_(now, 60), tz);
    // publicListAppEvents は内部で try-catch されている
    const res = publicListAppEvents(startIso, endIso, { noCache: false });
    events = (res && res.ok) ? res.events : [];
  } catch(e) { console.warn('initial events fetch failed', e); }

  return {
    courses: courses,
    slots: slots,
    events: events,
    config: {
      CALENDAR_ID: cfg.CALENDAR_ID,
      APP_CALENDAR_ID: String(props.getProperty(PROP_KEYS.APP_CALENDAR_ID) || '').trim(),
      HORIZON_DAYS: cfg.HORIZON_DAYS,
      MIN_LEAD_MIN: cfg.MIN_LEAD_MIN,
      TZ: tz
    },
    serverTime: now.toISOString(),
    adminUrl: getAdminUrl() || '',
    setupUrl: getSetupUrl() || ''
  };
}

/** Simple script cache helpers to reduce repeated sheet reads */
function cacheGet_(key) {
  try {
    const s = CacheService.getScriptCache().get(String(key || ''));
    if (!s) return null;
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}
function cacheSet_(key, obj, ttlSec) {
  try {
    const s = JSON.stringify(obj === undefined ? null : obj);
    CacheService.getScriptCache().put(String(key || ''), s, Number(ttlSec || 30));
    return true;
  } catch (e) {
    return false;
  }
}

function cacheRemove_(key) {
  try {
    CacheService.getScriptCache().remove(String(key || ''));
    return true;
  } catch (e) {
    return false;
  }
}



function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** =========================
 * Public APIs (called from index.html)
 * ========================= */
// Services API removed: Events and Availabilities drive the public UI.

/** Public debug helper: return limited runtime config for public page diagnostics */
function publicGetRuntimeConfig() {
  assertPublicContext_();
  const cfg = getRuntimeConfig_();
  const props = PropertiesService.getScriptProperties();
  return {
    CALENDAR_ID: cfg.CALENDAR_ID,
    APP_CALENDAR_ID: String(props.getProperty(PROP_KEYS.APP_CALENDAR_ID) || '').trim(),
    HORIZON_DAYS: cfg.HORIZON_DAYS,
    MIN_LEAD_MIN: cfg.MIN_LEAD_MIN,
  };
}

/** 自動デプロイ機能は削除済み。代わりに手順を案内するスタブを残す。 */
function menuAutoDeploy_() {
  SpreadsheetApp.getUi().alert(
    '自動デプロイ機能は無効化されています。\n代わりに「デプロイ手順を表示」を使って手動デプロイを行ってください。'
  );
}

/** Public: list events from Events sheet for a given date range (used by calendar view) */
function publicListAppEvents(startIso, endIso, opts) {
  assertPublicContext_();
  ensureBaseSheets_();

  var noCache = false;
  if (opts && typeof opts === 'object' && opts.noCache) noCache = true;

  try {
    if (!noCache) {
      const cached = cacheGet_('events:' + String(startIso || '') + '|' + String(endIso || ''));
      if (cached) return cached;
    }
  } catch (_) {}

  try {
    const cfg = getRuntimeConfig_();
    const tz = cfg.TZ;
    const ss = getSS_();
    const start = parseLocalIso_(String(startIso || ''));
    const end   = parseLocalIso_(String(endIso || ''));
    const out = [];

    // --- Events sheet ---
    const evSh = ss.getSheetByName(cfg.SHEET_EVENTS);
    if (evSh) {
      const vals = evSh.getDataRange().getValues();
      if (vals.length >= 2) {
        const header = vals[0];
        const idx = (n) => headerIndex_(header, n);
        let iStart     = idx('start_iso');
        let iEnd       = idx('end_iso');
        let iStatus    = idx('status');
        let iEventId   = idx('event_id');
        let iTitle     = idx('title');
        let iService   = idx('service_id');
        let iSource    = idx('source');
        let iCapacity  = idx('capacity');
        let iBookingId = idx('booking_id');
        let iDesc      = idx('description');
        if (iStart < 0) iStart = inferDateColumn_(vals, 10);
        if (iEnd < 0) {
          if (iStart >= 0 && iStart + 1 < header.length) iEnd = iStart + 1;
          else iEnd = inferDateColumn_(vals, 10);
        }
        if (iStart < 0) { /* cannot read events without a date column */ }
        else {
          if (iStatus < 0) iStatus = inferStatusColumn_(vals, 10, [iStart, iEnd]);
          if (iEventId < 0) iEventId = inferIdColumn_(vals, 10, [iStart, iEnd]);
          if (iCapacity < 0) iCapacity = inferNumericColumn_(vals, 10, [iStart, iEnd]);
          if (iTitle < 0) iTitle = inferTitleColumn_(vals, 10, [iStart, iEnd, iStatus, iEventId, iCapacity]);

          // Build bookings count maps
          const bookingsByEventId = {};
          const bookingsByStartIso = {};
          try {
            const bsh = ss.getSheetByName(cfg.SHEET_BOOKINGS);
            if (bsh) {
              const bvals = bsh.getDataRange().getValues();
              if (bvals.length >= 2) {
                const bheader = bvals[0];
                const biEvent = headerIndex_(bheader, 'event_id');
                const biStatus = headerIndex_(bheader, 'status');
                let biStart = headerIndex_(bheader, 'start_iso');
                if (biStart < 0) biStart = inferDateColumn_(bvals, 10);
                for (let br = 1; br < bvals.length; br++) {
                  const brow = bvals[br];
                  const st = biStatus >= 0 ? String(brow[biStatus] || '').trim() : 'confirmed';
                  if (st !== 'confirmed') continue;
                  const ev = biEvent >= 0 ? String(brow[biEvent] || '').trim() : '';
                  let bs = '';
                  if (biStart >= 0) {
                    const raw = brow[biStart];
                    if (raw instanceof Date) bs = toLocalIso_(raw, tz);
                    else bs = String(raw || '').trim();
                  }
                  if (ev) bookingsByEventId[ev] = (bookingsByEventId[ev] || 0) + 1;
                  if (bs) bookingsByStartIso[bs] = (bookingsByStartIso[bs] || 0) + 1;
                }
              }
            }
          } catch (_) {}

          for (let r = 1; r < vals.length; r++) {
            const row = vals[r];
            const rawStart = row[iStart];
            let sd = null;
            if (rawStart instanceof Date) sd = rawStart;
            else {
              const s = String(rawStart || '').trim();
              if (!s) continue;
              sd = parseLocalIso_(s.replace(/\s+/g, 'T'));
            }
            if (!sd || isNaN(sd.getTime())) continue;
            let ed = null;
            if (iEnd >= 0) {
              const rawEnd = row[iEnd];
              if (rawEnd instanceof Date) ed = rawEnd;
              else {
                const edRaw = String(rawEnd || '').trim();
                ed = edRaw ? parseLocalIso_(edRaw.replace(/\s+/g, 'T')) : new Date(sd.getTime() + 60 * 60 * 1000);
              }
            } else {
              ed = new Date(sd.getTime() + 60 * 60 * 1000);
            }
            if (sd.getTime() <= end.getTime() && ed.getTime() >= start.getTime()) {
              const status = iStatus >= 0 ? String(row[iStatus] || '').trim() : 'available';
              const evId = String((iEventId >= 0 ? row[iEventId] : '') || ('a_' + Utilities.getUuid()));
              const capRaw = (iCapacity >= 0 ? row[iCapacity] : '');
              let remaining = null;
              if (capRaw !== undefined && String(capRaw).trim() !== '') {
                const n = Number(capRaw);
                if (!isNaN(n) && isFinite(n)) {
                  const keyIso = toLocalIso_(sd, tz);
                  const usedByEvent = evId ? (bookingsByEventId[evId] || 0) : 0;
                  const usedByIso = keyIso ? (bookingsByStartIso[keyIso] || 0) : 0;
                  const used = usedByEvent || usedByIso;
                  remaining = Math.max(0, n - used);
                }
              }
              out.push({
                id: evId,
                title: String((iTitle >= 0 ? row[iTitle] : '') || ''),
                service_id: String((iService >= 0 ? row[iService] : '') || ''),
                status: status,
                source: String((iSource >= 0 ? row[iSource] : '') || ''),
                start_iso: toLocalIso_(sd, tz),
                end_iso: toLocalIso_(ed, tz),
                capacity: (iCapacity >= 0 ? row[iCapacity] : ''),
                remaining: remaining,
                booking_id: String((iBookingId >= 0 ? row[iBookingId] : '') || ''),
                description: String((iDesc >= 0 ? row[iDesc] : '') || ''),
              });
            }
          }
        }
      }
    }

    // fallback to Availabilities if Events sheet is empty or headers are broken
    if (out.length === 0) {
      try {
        const ash = ss.getSheetByName(cfg.SHEET_AVAILABILITIES);
        if (ash) {
          const avals = ash.getDataRange().getValues();
          if (avals.length >= 2) {
            const aheader = avals[0];
            const aidx = (n) => headerIndex_(aheader, n);
            let aiStart = aidx('start_iso');
            let aiEnd = aidx('end_iso');
            let aiStatus = aidx('status');
            let aiTitle = aidx('title');
            let aiId = aidx('availability_id');
            if (aiStart < 0) aiStart = inferDateColumn_(avals, 10);
            if (aiEnd < 0) { if (aiStart >= 0 && aiStart + 1 < aheader.length) aiEnd = aiStart + 1; else aiEnd = inferDateColumn_(avals, 10); }
            if (aiStatus < 0) aiStatus = inferStatusColumn_(avals, 10, [aiStart, aiEnd]);
            if (aiId < 0) aiId = inferIdColumn_(avals, 10, [aiStart, aiEnd]);
            if (aiTitle < 0) aiTitle = inferTitleColumn_(avals, 10, [aiStart, aiEnd, aiStatus, aiId]);
            for (let r = 1; r < avals.length; r++) {
              const row = avals[r];
              const rawStart = row[aiStart];
              let sd = null;
              if (rawStart instanceof Date) sd = rawStart;
              else {
                const s = String(rawStart || '').trim();
                if (!s) continue;
                sd = parseLocalIso_(s.replace(/\s+/g, 'T'));
              }
              if (isNaN(sd.getTime())) continue;
              let ed = null;
              if (aiEnd >= 0) {
                const rawEnd = row[aiEnd];
                if (rawEnd instanceof Date) ed = rawEnd;
                else {
                  const edRaw = String(rawEnd || '').trim();
                  ed = edRaw ? parseLocalIso_(edRaw.replace(/\s+/g, 'T')) : new Date(sd.getTime() + 60 * 60 * 1000);
                }
              } else {
                ed = new Date(sd.getTime() + 60 * 60 * 1000);
              }
              if (sd.getTime() <= end.getTime() && ed.getTime() >= start.getTime()) {
                out.push({
                  id: String((aiId >= 0 ? row[aiId] : '') || ('a_' + Utilities.getUuid())),
                  title: String((aiTitle >= 0 ? row[aiTitle] : '') || ''),
                  service_id: '',
                  status: aiStatus >= 0 ? String(row[aiStatus] || '').trim() : 'available',
                  source: 'availability',
                  start_iso: toLocalIso_(sd, tz),
                  end_iso: toLocalIso_(ed, tz),
                  capacity: '',
                  booking_id: '',
                  description: '',
                });
              }
            }
          }
        }
      } catch (_) {}
    }

    out.sort((a, b) => String(a.start_iso || '').localeCompare(String(b.start_iso || '')));
    const res = { ok: true, events: out.slice(0, 200), count: out.length };
    try { if (!noCache) cacheSet_('events:' + String(startIso || '') + '|' + String(endIso || ''), res, 30); } catch (_) {}
    return res;
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err), events: [] };
  }
}

/** Admin: upsert availability (append or update by availability_id) */
function adminUpsertAvailability(av) {
  assertAdminContext_();
  try {
    if (!av) return { ok: false, error: 'availability required' };
    ensureAvailabilitiesSheet_();
    const ss = getSS_();
    const sh = ss.getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
    if (!sh) return { ok: false, error: 'Availabilities sheet not found' };

    const vals = sh.getDataRange().getValues();
    const header = vals[0] || [];
    const idx = (n) => headerIndex_(header, n);

    const id = String(av.availability_id || '').trim() || ('a_' + Utilities.getUuid());
    const service_id = String(av.service_id || '').trim();
    const title = String(av.title || '').trim();
    const tz = getRuntimeConfig_().TZ;
    // normalize incoming datetimes to local ISO format
    let start_iso = String(av.start_iso || '').trim();
    let end_iso = String(av.end_iso || '').trim();
    try {
      if (start_iso) {
        const sd = parseLocalIso_(start_iso.replace(/\s+/g, 'T'));
        if (!isNaN(sd.getTime())) start_iso = toLocalIso_(sd, tz);
      }
      if (end_iso) {
        const edt = parseLocalIso_(end_iso.replace(/\s+/g, 'T'));
        if (!isNaN(edt.getTime())) end_iso = toLocalIso_(edt, tz);
      }
    } catch (_) {}
    const capacity = av.capacity !== undefined ? Number(av.capacity) : '';
    const status = String(av.status || 'available');
    const source = String(av.source || 'admin');
    const updated_at = new Date();

    // try update existing
    for (let r = 1; r < vals.length; r++) {
      if (String(vals[r][idx('availability_id')] || '') === id) {
        try {
          sh.getRange(r+1, idx('service_id')+1).setValue(service_id);
          sh.getRange(r+1, idx('title')+1).setValue(title);
          sh.getRange(r+1, idx('start_iso')+1).setValue(start_iso);
          sh.getRange(r+1, idx('end_iso')+1).setValue(end_iso);
          sh.getRange(r+1, idx('capacity')+1).setValue(capacity);
          sh.getRange(r+1, idx('status')+1).setValue(status);
          sh.getRange(r+1, idx('source')+1).setValue(source);
          sh.getRange(r+1, idx('updated_at')+1).setValue(updated_at);
          return { ok: true, id };
        } catch (e) {
          return { ok: false, error: 'failed to update existing availability: ' + String(e && e.message ? e.message : e) };
        }
      }
    }

    // append
  const row = [id, service_id, title, start_iso, end_iso, capacity, status, source, updated_at];
    try {
      sh.appendRow(row);
    } catch (e) {
      return { ok: false, error: 'failed to append to Availabilities: ' + String(e && e.message ? e.message : e) };
    }

    // verify append by reading back last rows (defensive check)
    let availCount = null;
    let availSample = null;
    try {
      const after = sh.getDataRange().getValues();
      const header2 = after[0] || [];
      const idx2 = (n) => header2.indexOf(n);
      const count = Math.max(0, after.length - 1);
      const sample = after.slice(Math.max(1, after.length - 10)).map(r => r.map(c => (c === undefined ? '' : String(c))));
      availCount = count;
      availSample = sample;
      const lastRow = after[after.length - 1] || [];
      const lastId = String(lastRow[idx2('availability_id')] || '').trim();
      if (lastId !== id) {
        // fallback: search for id anywhere
        let found = false;
        for (let rr = 1; rr < after.length; rr++) {
          if (String(after[rr][idx2('availability_id')] || '') === id) { found = true; break; }
        }
        if (!found) {
          return { ok: false, error: 'append verification failed: id not present after append' };
        }
      }
    } catch (e) {
      // ignore verification error but still proceed
    }

    // Also mirror availability as a row in Events sheet (for export / visibility)
    let mirrorOk = null;
    let mirrorError = null;
    let mirrorInfo = null;
    try {
      const evSh = ensureEventsSheet_();
      const evHeader = evSh.getDataRange().getValues()[0] || [];

      // required columns check
      const required = ['event_id','source','status','title','start_iso','end_iso'];
      const missing = required.filter(k => evHeader.indexOf(k) < 0);
      if (missing.length > 0) {
        throw new Error('Events sheet missing columns: ' + missing.join(', '));
      }

      const iEventId = evHeader.indexOf('event_id');
      const iSource = evHeader.indexOf('source');
      const iStatus = evHeader.indexOf('status');
      // append to Events sheet using Events header order
      try {
        const rowEv = [
          id, // event_id
          source || '', // source
          status || '', // status
          title || '', // title
          service_id || '', // service_id
          start_iso || '', // start_iso
          end_iso || '', // end_iso
          '', // location
          String(av.description || '') || '', // description
          capacity || '', // capacity
          '', // booking_id
          updated_at || '', // updated_at
          '' // last_synced
        ];
        evSh.appendRow(rowEv);

        // verify append on Events sheet
        let evCount = null;
        let evSample = null;
        try {
          const afterEv = evSh.getDataRange().getValues();
          const headerEv = afterEv[0] || [];
          const idxEv = (n) => headerEv.indexOf(n);
          const countEv = Math.max(0, afterEv.length - 1);
          const sampleEv = afterEv.slice(Math.max(1, afterEv.length - 10)).map(r => r.map(c => (c === undefined ? '' : String(c))));
          evCount = countEv;
          evSample = sampleEv;
          const lastRow = afterEv[afterEv.length - 1] || [];
          const lastId = String(lastRow[idxEv('event_id')] || '').trim();
          if (lastId !== id) {
            // fallback: search for id anywhere
            let found = false;
            for (let rr = 1; rr < afterEv.length; rr++) {
              if (String(afterEv[rr][idxEv('event_id')] || '') === id) { found = true; break; }
            }
            if (!found) {
              // not fatal for availability upsert, but surface warning
              mirrorOk = false;
              mirrorError = 'event append verification failed';
            }
          }
        } catch (e) {
          // ignore verification error but note
          mirrorOk = false; mirrorError = String(e && e.message ? e.message : e);
        }

        mirrorOk = true; mirrorInfo = { count: evCount, sample: evSample };
        return { ok: true, id, events: { count: evCount, sample: evSample } };
      } catch (e) {
        mirrorOk = false; mirrorError = String(e && e.message ? e.message : e);
        // do not fail whole operation
        return { ok: true, id, warning: 'availability saved but event mirror failed: ' + mirrorError };
      }
    } catch (e) {
      // mirror block failure: record diagnostic but do not fail the whole upsert
      mirrorOk = false;
      mirrorError = String(e && e.message ? e.message : e);
    }

  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** Admin: list availabilities in range */
function adminListAvailabilities(startIso, endIso) {
  assertAdminContext_();
  ensureAvailabilitiesSheet_();
  const sh = getSS_().getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const header = vals[0];
  const idx = (n) => headerIndex_(header, n);
  const start = parseLocalIso_(String(startIso || ''));
  const end = parseLocalIso_(String(endIso || ''));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const rawS = row[idx('start_iso')];
    const rawE = row[idx('end_iso')];
    let sd = null;
    if (rawS instanceof Date) sd = rawS;
    else {
      const s = String(rawS || '').trim();
      if (!s) continue;
      sd = parseLocalIso_(s);
    }
    let ed = null;
    if (rawE instanceof Date) ed = rawE;
    else {
      const e = String(rawE || '').trim();
      if (!e) continue;
      ed = parseLocalIso_(e);
    }
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) continue;
    if (sd.getTime() <= end.getTime() && ed.getTime() >= start.getTime()) {
      out.push({
        availability_id: String(row[idx('availability_id')] || ''),
        service_id: String(row[idx('service_id')] || ''),
        title: String(row[idx('title')] || ''),
        start_iso: s,
        end_iso: e,
        capacity: row[idx('capacity')],
        status: String(row[idx('status')] || ''),
        source: String(row[idx('source')] || ''),
        updated_at: row[idx('updated_at')],
      });
    }
  }
  return out;
}

/** Admin: quick diagnostic of Availabilities sheet */
function adminAvailabilitiesStatus() {
  assertAdminContext_();
  try {
    const ss = getSS_();
    const sh = ss.getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
    if (!sh) return { ok: false, error: 'Availabilities sheet not found' };
    const vals = sh.getDataRange().getValues();
    const header = vals[0] || [];
    const count = Math.max(0, vals.length - 1);
    const sample = vals.slice(Math.max(1, vals.length - 10)).map(r => r.map(c => (c === undefined ? '' : String(c))));
    return { ok: true, header: header, count: count, sample: sample };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** Admin: rebuild Events from Availabilities within range (upsert)
 * - confirmed/canceled は保護して上書きしない
 * - Availabilities に無い availability source は archived 化
 */
function adminRebuildEventsFromAvailabilities(startIso, endIso) {
  assertAdminContext_();
  ensureBaseSheets_();
  ensureAvailabilitiesSheet_();

  const cfg = getRuntimeConfig_();
  const tz = cfg.TZ;

  let start = startIso ? parseLocalIso_(String(startIso)) : startOfDay_(new Date(), tz);
  let end = endIso ? parseLocalIso_(String(endIso)) : addDays_(start, Number(cfg.EVENT_SYNC_DAYS || 30));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: 'invalid range' };
  }

  const ss = getSS_();
  const avSh = ss.getSheetByName(cfg.SHEET_AVAILABILITIES);
  const evSh = ss.getSheetByName(cfg.SHEET_EVENTS);
  if (!avSh || !evSh) return { ok: false, error: 'sheet not found' };

  const avVals = avSh.getDataRange().getValues();
  if (avVals.length < 2) return { ok: true, created: 0, updated: 0, archived: 0 };
  const avHeader = avVals[0];
  const aIdx = (n) => avHeader.indexOf(n);

  const availList = [];
  const availIds = new Set();
  for (let r = 1; r < avVals.length; r++) {
    const row = avVals[r];
    const id = String(row[aIdx('availability_id')] || '').trim();
    if (!id) continue;
    const s = String(row[aIdx('start_iso')] || '').trim();
    const e = String(row[aIdx('end_iso')] || '').trim();
    if (!s || !e) continue;
    const sd = parseLocalIso_(s);
    const ed = parseLocalIso_(e);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) continue;
    if (sd.getTime() > end.getTime() || ed.getTime() < start.getTime()) continue;

    availIds.add(id);
    availList.push({
      availability_id: id,
      service_id: String(row[aIdx('service_id')] || '').trim(),
      title: String(row[aIdx('title')] || '').trim(),
      start_iso: s,
      end_iso: e,
      capacity: row[aIdx('capacity')],
      status: String(row[aIdx('status')] || 'available').trim(),
      source: String(row[aIdx('source')] || 'admin').trim(),
    });
  }

  const evVals = evSh.getDataRange().getValues();
  const evHeader = evVals[0] || [];
  const idx = (n) => evHeader.indexOf(n);
  const iEventId = idx('event_id');
  const iSource = idx('source');
  const iStatus = idx('status');
  const iTitle = idx('title');
  const iServiceId = idx('service_id');
  const iStart = idx('start_iso');
  const iEnd = idx('end_iso');
  const iDesc = idx('description');
  const iCapacity = idx('capacity');
  const iBookingId = idx('booking_id');
  const iUpdated = idx('updated_at');

  const eventRowById = new Map();
  for (let r = 1; r < evVals.length; r++) {
    const id = String(evVals[r][iEventId] || '').trim();
    if (id) eventRowById.set(id, r);
  }

  const now = new Date();
  let created = 0;
  let updated = 0;
  let archived = 0;

  const buildRow = (existing, av) => {
    const row = existing ? existing.slice() : new Array(evHeader.length).fill('');
    if (iEventId >= 0) row[iEventId] = av.availability_id;
    if (iSource >= 0) row[iSource] = 'availability';
    if (iStatus >= 0) row[iStatus] = av.status || 'available';
    if (iTitle >= 0) row[iTitle] = av.title || '空き枠';
    if (iServiceId >= 0) row[iServiceId] = av.service_id || '';
    if (iStart >= 0) row[iStart] = av.start_iso || '';
    if (iEnd >= 0) row[iEnd] = av.end_iso || '';
    if (iDesc >= 0) row[iDesc] = `availability:${av.availability_id}`;
    if (iCapacity >= 0) row[iCapacity] = av.capacity !== undefined ? av.capacity : '';
    if (iBookingId >= 0) row[iBookingId] = '';
    if (iUpdated >= 0) row[iUpdated] = now;
    return row;
  };

  for (const av of availList) {
    const rowIndex = eventRowById.get(av.availability_id);
    if (rowIndex !== undefined) {
      const currentStatus = String(evVals[rowIndex][iStatus] || '').trim();
      if (currentStatus === 'confirmed' || currentStatus === 'canceled') continue;
      const nextRow = buildRow(evVals[rowIndex], av);
      evSh.getRange(rowIndex + 1, 1, 1, nextRow.length).setValues([nextRow]);
      updated++;
    } else {
      const nextRow = buildRow(null, av);
      evSh.appendRow(nextRow);
      created++;
    }
  }

  // archive availability-based events that no longer exist in range
  for (let r = 1; r < evVals.length; r++) {
    const evId = String(evVals[r][iEventId] || '').trim();
    if (!evId || availIds.has(evId)) continue;
    const src = String(evVals[r][iSource] || '').trim();
    if (src !== 'availability') continue;
    const st = String(evVals[r][iStatus] || '').trim();
    if (st === 'confirmed' || st === 'canceled') continue;
    const s = String(evVals[r][iStart] || '').trim();
    const e = String(evVals[r][iEnd] || '').trim();
    if (!s || !e) continue;
    const sd = parseLocalIso_(s);
    const ed = parseLocalIso_(e);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) continue;
    if (sd.getTime() > end.getTime() || ed.getTime() < start.getTime()) continue;
    if (iStatus >= 0) evSh.getRange(r + 1, iStatus + 1).setValue('archived');
    if (iUpdated >= 0) evSh.getRange(r + 1, iUpdated + 1).setValue(now);
    archived++;
  }

  return { ok: true, created, updated, archived };
}

/** Public: get availabilities for service and range */
function publicGetAvailabilities(serviceId, startIso, endIso) {
  assertPublicContext_();
  ensureAvailabilitiesSheet_();
  const tz = getRuntimeConfig_().TZ;
  const sh = getSS_().getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
  if (!sh) return { ok: true, events: [] };
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return { ok: true, events: [] };
  const header = vals[0];
  const idx = (n) => headerIndex_(header, n);
  const start = parseLocalIso_(String(startIso || '')); const end = parseLocalIso_(String(endIso || ''));
  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const rawS = row[idx('start_iso')];
    const rawE = row[idx('end_iso')];
    let sd = null;
    if (rawS instanceof Date) sd = rawS;
    else {
      const s = String(rawS || '').trim();
      if (!s) continue;
      sd = parseLocalIso_(s);
    }
    let ed = null;
    if (rawE instanceof Date) ed = rawE;
    else {
      const e = String(rawE || '').trim();
      if (!e) continue;
      ed = parseLocalIso_(e);
    }
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) continue;
    if (ed.getTime() < start.getTime() || sd.getTime() > end.getTime()) continue;
    const sid = String(row[idx('service_id')] || '').trim();
    if (sid && sid !== (serviceId || '')) continue;
    out.push({ id: String(row[idx('availability_id')]), title: String(row[idx('title')]), start_iso: s, end_iso: e, capacity: row[idx('capacity')] });
  }
  return { ok: true, events: out, count: out.length };
}

function getAvailableSlots(serviceId, opts) {
  assertPublicContext_();
  ensureBaseSheets_();

  var noCache = false;
  var horizonOverride = null;
  if (opts === true) noCache = true;
  else if (opts && typeof opts === 'object') {
    if (opts.noCache) noCache = true;
    if (opts.horizon) horizonOverride = Number(opts.horizon);
  }

  const cfg = getRuntimeConfig_();
  // serviceId filtering removed — return all slots from Events/Availabilities regardless of Services

  const tz = cfg.TZ;
  const now = new Date();
  const rangeStart = new Date(now.getTime() + cfg.MIN_LEAD_MIN * 60 * 1000);
  const rangeEnd = addDays_(startOfDay_(rangeStart, tz), (horizonOverride || cfg.HORIZON_DAYS) + 1);

  // try script cache first (keyed by range window)
  try {
    if (!noCache) {
      const key = 'slots:' + toLocalIso_(rangeStart, tz) + '|' + toLocalIso_(rangeEnd, tz);
      const cached = cacheGet_(key);
      if (cached && Array.isArray(cached)) return cached;
    }
  } catch (_) {}

  const sh = getSS_().getSheetByName(cfg.SHEET_EVENTS);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  const header = vals[0];
  const idx = (n) => headerIndex_(header, n);
  let iStart = idx('start_iso');
  let iEnd = idx('end_iso');
  let iStatus = idx('status');
  let iEventId = idx('event_id');
  let iTitle = idx('title');
  let iCapacity = idx('capacity');
  if (iStart < 0) iStart = inferDateColumn_(vals, 10);
  if (iEnd < 0) {
    if (iStart >= 0 && iStart + 1 < header.length) iEnd = iStart + 1;
    else iEnd = inferDateColumn_(vals, 10);
  }
  if (iStart < 0) return [];
  if (iStatus < 0) iStatus = inferStatusColumn_(vals, 10, [iStart, iEnd]);
  if (iEventId < 0) iEventId = inferIdColumn_(vals, 10, [iStart, iEnd]);
  if (iCapacity < 0) iCapacity = inferNumericColumn_(vals, 10, [iStart, iEnd]);
  if (iTitle < 0) iTitle = inferTitleColumn_(vals, 10, [iStart, iEnd, iStatus, iEventId, iCapacity]);
  const slots = [];

  // Build bookings count maps:
  // - bookingsByEventId: event_id -> confirmed bookings count
  // - bookingsByStartIso: start_iso (local format) -> confirmed bookings count
  const bookingsByEventId = {};
  const bookingsByStartIso = {};
  try {
    const bsh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
    if (bsh) {
      const bvals = bsh.getDataRange().getValues();
      if (bvals.length >= 2) {
        const bheader = bvals[0];
        const biEvent = headerIndex_(bheader, 'event_id');
        const biStatus = headerIndex_(bheader, 'status');
        let biStart = headerIndex_(bheader, 'start_iso');
        if (biStart < 0) biStart = inferDateColumn_(bvals, 10);
        for (let br = 1; br < bvals.length; br++) {
          const brow = bvals[br];
          const st = biStatus >= 0 ? String(brow[biStatus] || '').trim() : 'confirmed';
          if (st !== 'confirmed') continue;
          const ev = biEvent >= 0 ? String(brow[biEvent] || '').trim() : '';
          let bs = '';
          if (biStart >= 0) {
            const raw = brow[biStart];
            if (raw instanceof Date) bs = toLocalIso_(raw, tz);
            else bs = String(raw || '').trim();
          }
          if (ev) bookingsByEventId[ev] = (bookingsByEventId[ev] || 0) + 1;
          if (bs) bookingsByStartIso[bs] = (bookingsByStartIso[bs] || 0) + 1;
        }
      }
    }
  } catch (e) {
    // ignore bookings map errors
  }

  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const statusRaw = iStatus >= 0 ? String(row[iStatus] || '').trim() : '';
    const status = statusRaw || 'available';
    // ignore serviceId filtering; events with or without service_id are considered

    // normalize start/end iso to handle formats like Date cells or '2026-02-03 9:00'
  let sd = null;
    const rawStart = row[iStart];
    if (rawStart instanceof Date) sd = rawStart;
    else {
      const sRaw = String(rawStart || '').trim();
      if (!sRaw) continue;
      const sNorm = sRaw.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1');
      sd = parseLocalIso_(sNorm);
    }
    if (isNaN(sd.getTime())) continue;
  let ed = null;
    const rawEnd = (iEnd >= 0) ? row[iEnd] : '';
    if (rawEnd instanceof Date) ed = rawEnd;
    else {
      const eRaw = (iEnd >= 0) ? String(rawEnd || '').trim() : '';
      const eNorm = eRaw ? eRaw.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1') : '';
      ed = eNorm ? parseLocalIso_(eNorm) : new Date(sd.getTime() + 60 * 60 * 1000);
    }
    if (isNaN(ed.getTime())) continue;
    if (isNaN(ed.getTime())) continue;

    if (ed.getTime() < rangeStart.getTime() || sd.getTime() > rangeEnd.getTime()) continue;

  const evId = String((iEventId >= 0 ? row[iEventId] : '') || '').trim();
  const capRaw = (iCapacity >= 0 && row[iCapacity] !== undefined) ? row[iCapacity] : '';
    let remaining = null; // null means unlimited / not specified
    if (capRaw !== undefined && String(capRaw).trim() !== '') {
      const n = Number(capRaw);
      if (!isNaN(n) && isFinite(n)) {
        // prefer bookings count by event_id when available, else fallback to bookings by start_iso
        const keyIso = toLocalIso_(sd, tz);
        const usedByEvent = evId ? (bookingsByEventId[evId] || 0) : 0;
        const usedByIso = bookingsByStartIso[keyIso] || 0;
        const used = usedByEvent || usedByIso;
        remaining = Math.max(0, n - used);
      }
    }

    // skip non-available statuses (except confirmed with remaining seats)
    if (status && status !== 'available' && status !== 'confirmed') continue;
    if (status === 'confirmed') {
      if (remaining === null || remaining <= 0) continue;
    }

    const title = String((iTitle >= 0 ? row[iTitle] : '') || '').trim();
    slots.push({
      id: evId || ('e_' + Utilities.getUuid()),
      source: 'event',
      start_iso: toLocalIso_(sd, tz),
      end_iso: toLocalIso_(ed, tz),
      label: title || formatSlotLabel_(sd, ed, tz),
      capacity: capRaw !== undefined ? capRaw : '',
      remaining: remaining,
    });
  }

  // Also include Availabilities sheet rows (avoid duplicates by id)
  try {
    const ash = getSS_().getSheetByName(cfg.SHEET_AVAILABILITIES);
    if (ash) {
      const avals = ash.getDataRange().getValues();
      if (avals.length >= 2) {
        const aheader = avals[0];
        const aidx = (n) => headerIndex_(aheader, n);
        let aiStart = aidx('start_iso');
        let aiEnd = aidx('end_iso');
        let aiStatus = aidx('status');
        let aiTitle = aidx('title');
        let aiId = aidx('availability_id');
        let aiCapacity = aidx('capacity');
        if (aiStart < 0) aiStart = inferDateColumn_(avals, 10);
        if (aiEnd < 0) { if (aiStart >= 0 && aiStart + 1 < aheader.length) aiEnd = aiStart + 1; else aiEnd = inferDateColumn_(avals, 10); }
        if (aiStatus < 0) aiStatus = inferStatusColumn_(avals, 10, [aiStart, aiEnd]);
        if (aiId < 0) aiId = inferIdColumn_(avals, 10, [aiStart, aiEnd]);
        if (aiCapacity < 0) aiCapacity = inferNumericColumn_(avals, 10, [aiStart, aiEnd]);
        if (aiTitle < 0) aiTitle = inferTitleColumn_(avals, 10, [aiStart, aiEnd, aiStatus, aiId, aiCapacity]);
        const seenIds = {};
        slots.forEach(s => { if (s && s.id) seenIds[String(s.id)] = true; });
        for (let ar = 1; ar < avals.length; ar++) {
          const arow = avals[ar];
          const status = aiStatus >= 0 ? String(arow[aiStatus] || '').trim() : 'available';
          if (status !== 'available') continue;
          const aid = String((aiId >= 0 ? arow[aiId] : '') || '').trim();
          if (aid && seenIds[aid]) continue; // already represented
          const sRaw = String(arow[aiStart] || '').trim();
          if (!sRaw) continue;
          const sNorm = sRaw.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1');
          const sd = parseLocalIso_(sNorm);
          if (isNaN(sd.getTime())) continue;
          const eRaw = (aiEnd >= 0) ? String(arow[aiEnd] || '').trim() : '';
          const eNorm = eRaw ? eRaw.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1') : '';
          const ed = eNorm ? parseLocalIso_(eNorm) : new Date(sd.getTime() + 60 * 60 * 1000);
          if (isNaN(ed.getTime())) continue;
          if (ed.getTime() < rangeStart.getTime() || sd.getTime() > rangeEnd.getTime()) continue;

          const capRaw = (aiCapacity >= 0 && arow[aiCapacity] !== undefined) ? arow[aiCapacity] : '';
          let remaining = null;
          if (capRaw !== undefined && String(capRaw).trim() !== '') {
            const n = Number(capRaw);
            if (!isNaN(n) && isFinite(n)) {
              const keyIso = toLocalIso_(sd, tz);
              // Availabilities are matched to bookings by start_iso (bookings reference event/start times)
              const used = bookingsByStartIso[keyIso] || 0;
              remaining = Math.max(0, n - used);
            }
          }

          const title = String((aiTitle >= 0 ? arow[aiTitle] : '') || '').trim();
          slots.push({
            id: aid || ('a_' + Utilities.getUuid()),
            source: 'availability',
            start_iso: toLocalIso_(sd, tz),
            end_iso: toLocalIso_(ed, tz),
            label: title || formatSlotLabel_(sd, ed, tz),
            capacity: capRaw !== undefined ? capRaw : '',
            remaining: remaining,
          });
        }
      }
    }
  } catch (e) { /* ignore availability read errors */ }

  slots.sort((a,b) => String(a.start_iso||'').localeCompare(String(b.start_iso||'')));
  try { if (!noCache) cacheSet_('slots:' + toLocalIso_(rangeStart, tz) + '|' + toLocalIso_(rangeEnd, tz), slots, 30); } catch(_) {}
  return slots;
}

function createBooking(payload) {
  assertPublicContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false, error: '混雑しています。再試行してください。' };

  try {
    validatePayload_(payload);

    const tz = cfg.TZ;
    const start = parseLocalIso_(payload.start_iso);
    if (isNaN(start.getTime())) return { ok: false, error: 'start_iso が不正です' };

    const eventsSheet = getSS_().getSheetByName(cfg.SHEET_EVENTS);
    if (!eventsSheet) return { ok: false, error: 'Events sheet not found' };
    const values = eventsSheet.getDataRange().getValues();
    if (values.length < 2) return { ok: false, error: '空き枠がありません。' };

    const header = values[0];
    const idx = (name) => headerIndex_(header, name);
    let iStatus = idx('status');
    let iStart = idx('start_iso');
    let iEnd = idx('end_iso');
    let iEventId = idx('event_id');
    let iServiceId = idx('service_id');
    let iTitle = idx('title');
    let iSource = idx('source');
    let iBookingId = idx('booking_id');
    let iUpdated = idx('updated_at');
    let iCapacity = idx('capacity');
    if (iStart < 0) iStart = inferDateColumn_(values, 10);
    if (iEnd < 0) {
      if (iStart >= 0 && iStart + 1 < header.length) iEnd = iStart + 1;
      else iEnd = inferDateColumn_(values, 10);
    }
    if (iStart < 0) return { ok: false, error: 'Events sheet missing start_iso column' };
    if (iStatus < 0) iStatus = inferStatusColumn_(values, 10, [iStart, iEnd]);
    if (iEventId < 0) iEventId = inferIdColumn_(values, 10, [iStart, iEnd]);
    if (iCapacity < 0) iCapacity = inferNumericColumn_(values, 10, [iStart, iEnd]);
    if (iTitle < 0) iTitle = inferTitleColumn_(values, 10, [iStart, iEnd, iStatus, iEventId, iCapacity]);

    // build bookings maps for quick remaining calculation
    const bookingsByEventId = {};
    const bookingsByStartIso = {};
    try {
      const bsh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
      if (bsh) {
        const bvals = bsh.getDataRange().getValues();
        if (bvals.length >= 2) {
          const bheader = bvals[0];
          const biEvent = headerIndex_(bheader, 'event_id');
          const biStatus = headerIndex_(bheader, 'status');
          let biStart = headerIndex_(bheader, 'start_iso');
          if (biStart < 0) biStart = inferDateColumn_(bvals, 10);
          for (let br = 1; br < bvals.length; br++) {
            const brow = bvals[br];
            const st = biStatus >= 0 ? String(brow[biStatus] || '').trim() : 'confirmed';
            if (st !== 'confirmed') continue;
            const ev = biEvent >= 0 ? String(brow[biEvent] || '').trim() : '';
            let bs = '';
            if (biStart >= 0) {
              const rawStart = brow[biStart];
              if (rawStart instanceof Date) bs = toLocalIso_(rawStart, tz);
              else bs = String(rawStart || '').trim();
            }
            if (ev) bookingsByEventId[ev] = (bookingsByEventId[ev] || 0) + 1;
            if (bs) bookingsByStartIso[bs] = (bookingsByStartIso[bs] || 0) + 1;
          }
        }
      }
    } catch (e) { /* ignore */ }

    // normalize payload start to local ISO format for reliable comparison
    const payloadStart = toLocalIso_(start, tz);
    let rowNum = -1;
    let eventId = '';
    let endIso = '';

    // Find matching event row by comparing parsed times (avoid brittle string comparisons)
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const status = iStatus >= 0 ? String(row[iStatus] || '').trim() : '';
      // allow booking against rows marked available or already confirmed (capacity-controlled)
      if (status && status !== 'available' && status !== 'confirmed') continue;
      const rowStartRaw = row[iStart];
      let rowStartDate = null;
      if (rowStartRaw instanceof Date) {
        rowStartDate = rowStartRaw;
      } else {
        const rowStartStr = String(rowStartRaw || '').trim();
        if (!rowStartStr) continue;
        const rowStartNorm = rowStartStr.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1');
        rowStartDate = parseLocalIso_(rowStartNorm);
      }
      if (!rowStartDate || isNaN(rowStartDate.getTime())) continue;
      if (rowStartDate.getTime() !== start.getTime()) continue;

      rowNum = r + 1;
      eventId = String(row[iEventId] || '').trim();
      endIso = String(row[iEnd] || '').trim();
      break;
    }

  if (rowNum < 0) return { ok: false, error: 'その枠は埋まりました。別の枠を選んでください。' };

  // use the event title as the booking's service_name (legacy column); fallback to '予約'
  const serviceName = String(values[rowNum-1][iTitle] || '').trim() || '予約';

    // check remaining capacity (if capacity specified)
    const capRaw = (iCapacity >= 0) ? values[rowNum-1][iCapacity] : '';
    let capN = null;
    if (capRaw !== undefined && String(capRaw).trim() !== '') {
      const n = Number(capRaw);
      if (!isNaN(n) && isFinite(n)) capN = n;
    }
    let remainingAfter = null;
    if (capN !== null) {
      const evKey = String(values[rowNum-1][iEventId] || '').trim() || eventId || '';
      // compute used bookings: prefer by event_id, fallback to bookings by start_iso
      const usedByEvent = evKey ? (bookingsByEventId[evKey] || 0) : 0;
      const usedByIso = bookingsByStartIso[payloadStart] || 0;
      const used = usedByEvent || usedByIso;
      const remaining = Math.max(0, capN - used);
      if (remaining <= 0) {
        // diagnostic info to help debug unexpected 'full' errors
        return { ok: false, error: 'その枠は満席です。別の枠を選んでください。', debug: { capacity: capN, usedByEvent: usedByEvent, usedByIso: usedByIso, evKey: evKey, payloadStart: payloadStart } };
      }
      remainingAfter = Math.max(0, remaining - 1);
    }

    // determine end time
    let end = null;
    if (endIso) end = parseLocalIso_(endIso);
    if (!end || isNaN(end.getTime())) {
      // default to 60 minutes when end_iso not provided
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    if (isNaN(end.getTime())) return { ok: false, error: 'end_iso が不正です' };

    if (!eventId) eventId = 's_' + Utilities.getUuid();

    // Prevent duplicate confirmed bookings for same customer + start_iso + event
    try {
      const bsh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
      if (bsh) {
        const bvals = bsh.getDataRange().getValues();
        if (bvals.length >= 2) {
          const bheader = bvals[0];
          const biStatus = headerIndex_(bheader, 'status');
          const biEmail = headerIndex_(bheader, 'customer_email');
          const biStart = headerIndex_(bheader, 'start_iso');
          const biEvent = headerIndex_(bheader, 'event_id');
          const biBookingId = headerIndex_(bheader, 'booking_id');
          const biCancel = headerIndex_(bheader, 'cancel_token');
          for (let br = 1; br < bvals.length; br++) {
            const brow = bvals[br];
            const st = biStatus >= 0 ? String(brow[biStatus] || '').trim() : '';
            if (st !== 'confirmed') continue;
            const em = biEmail >= 0 ? String(brow[biEmail] || '').trim() : '';
            const bs = biStart >= 0 ? String(brow[biStart] || '').trim() : '';
            const bev = biEvent >= 0 ? String(brow[biEvent] || '').trim() : '';
            if (em && payload.customer_email && String(em) === String(payload.customer_email) && bs && bs === payloadStart && bev && bev === eventId) {
              // existing confirmed booking detected — return existing booking info without resending email
              const existingBookingId = biBookingId >= 0 ? String(brow[biBookingId] || '') : '';
              const existingCancel = biCancel >= 0 ? String(brow[biCancel] || '') : '';
              const existingCancelUrl = existingCancel ? buildCancelUrl_(existingCancel, {
                booking_id: existingBookingId,
                customer_name: payload.customer_name,
                customer_email: payload.customer_email,
                service_name: serviceName,
                start_iso: payload.start_iso,
                end_iso: payload.end_iso,
              }) : '';
              return { ok: true, booking_id: existingBookingId, cancel_url: existingCancelUrl, warning: 'duplicate detected' };
            }
          }
        }
      }
    } catch (_) {}

    const bookingId = 'b_' + Utilities.getUuid();
    const cancelToken = Utilities.getUuid();
    const cancelUrl = buildCancelUrl_(cancelToken, {
      booking_id: bookingId,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      service_name: serviceName,
      start_iso: toLocalIso_(start, tz),
      end_iso: toLocalIso_(end, tz),
    });

  // serviceName was initialized above when the matching event row was located

    // save to Bookings sheet (header-aware to avoid column mismatch)
    const sheet = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
    const bvals = sheet.getDataRange().getValues();
    const bheader = (bvals && bvals.length > 0) ? bvals[0] : [];
    const rowArr = (bheader || []).map((h) => {
      const key = String(h || '').trim();
      if (key === 'booking_id') return bookingId;
      if (key === 'created_at') return new Date();
      if (key === 'status') return 'confirmed';
      if (key === 'service_id') return '';
      if (key === 'service_name') return serviceName;
      if (key === 'customer_name') return payload.customer_name;
      if (key === 'customer_email') return payload.customer_email;
      if (key === 'start_iso') return toLocalIso_(start, tz);
      if (key === 'end_iso') return toLocalIso_(end, tz);
      if (key === 'answers_json') return JSON.stringify(payload.answers || {});
      if (key === 'event_id') return eventId;
      if (key === 'cancel_token') return cancelToken;
      return '';
    });
    if (rowArr.length > 0) {
      try {
        const last = Math.max(1, sheet.getLastRow());
        sheet.getRange(last+1, 1, 1, rowArr.length).setValues([rowArr]);
      } catch (e) {
        // fallback
        sheet.appendRow(rowArr);
      }
    }

    // cache the booking briefly for faster cancel lookup
    try {
      const cachedBooking = {
        booking_id: bookingId,
        status: 'confirmed',
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        service_name: serviceName,
        start_iso: toLocalIso_(start, tz),
        end_iso: toLocalIso_(end, tz),
        answers_json: JSON.stringify(payload.answers || {}),
        event_id: eventId,
        cancel_token: cancelToken
      };
      cacheSet_('cancel:' + String(cancelToken), cachedBooking, 600);
      cacheSet_('booking:' + String(bookingId), cachedBooking, 600);
    } catch (_) {}

    // Try to create a calendar event and send invitation to the customer
    try {
      const calId = getRuntimeConfig_().CALENDAR_ID || CFG_DEFAULT.CALENDAR_ID || 'primary';
      let cal = null;
      try { cal = CalendarApp.getCalendarById(calId); } catch (e) { cal = null; }
      if (!cal) cal = CalendarApp.getDefaultCalendar && CalendarApp.getDefaultCalendar();
      if (cal && payload.customer_email) {
        try {
          const desc = [
            `BOOKING_ID: ${bookingId}`,
            `予約ID: ${bookingId}`,
            `サービス: ${serviceName}`,
            `日時: ${formatSlotLabel_(start, end, tz)}`,
            `キャンセルURL: ${cancelUrl}`,
            '',
            '（自動通知）'
          ].join('\n');
          const ev = cal.createEvent(serviceName || '予約', start, end, { description: desc, guests: String(payload.customer_email), sendInvites: true });
          try {
            // update cached booking with calendar event id
            const cb = cacheGet_('booking:' + bookingId) || {};
            cb.calendar_event_id = ev && ev.getId ? ev.getId() : '';
            cacheSet_('booking:' + bookingId, cb, 600);
          } catch (_) {}
        } catch (e) {
          // ignore calendar invite failures but log
          console.warn('calendar invite failed', e);
        }
      }
    } catch (e) {
      console.warn('calendar invite outer error', e);
    }

    // Invalidate slots/events cache for current horizon so UI reflects new remaining immediately
    try {
      const now2 = new Date();
      const rangeStart = new Date(now2.getTime() + cfg.MIN_LEAD_MIN * 60 * 1000);
      const rangeEnd = addDays_(startOfDay_(rangeStart, tz), cfg.HORIZON_DAYS + 1);
      const slotsKey = 'slots:' + toLocalIso_(rangeStart, tz) + '|' + toLocalIso_(rangeEnd, tz);
      cacheRemove_(slotsKey);
      // Also try a generic key fallback
      cacheRemove_('slots:' + toLocalIso_(startOfDay_(new Date(), tz), tz) + '|' + toLocalIso_(addDays_(startOfDay_(new Date(), tz), cfg.HORIZON_DAYS + 1), tz));
      // invalidate event-range around the booking start as best-effort
      try { cacheRemove_('events:' + toLocalIso_(start, tz) + '|' + toLocalIso_(addDays_(startOfDay_(start, tz), 1), tz)); } catch(_) {}
    } catch (_) {}

    // update Events sheet row
    if (iEventId >= 0) eventsSheet.getRange(rowNum, iEventId + 1).setValue(eventId);
    if (iTitle >= 0) eventsSheet.getRange(rowNum, iTitle + 1).setValue(serviceName);
    if (iSource >= 0) eventsSheet.getRange(rowNum, iSource + 1).setValue('booking');
    // keep status available until capacity is filled; if no capacity, leave as available
    if (iStatus >= 0) {
      if (remainingAfter !== null && remainingAfter <= 0) eventsSheet.getRange(rowNum, iStatus + 1).setValue('confirmed');
      else eventsSheet.getRange(rowNum, iStatus + 1).setValue('available');
    }
    if (iBookingId >= 0) eventsSheet.getRange(rowNum, iBookingId + 1).setValue(bookingId);
    if (iUpdated >= 0) eventsSheet.getRange(rowNum, iUpdated + 1).setValue(new Date());

    // email notify (optional)
    try {
      const subject = `【予約確定】${serviceName} ${formatSlotLabel_(start, end, tz)}`;
      const body = [
        `${payload.customer_name} 様`,
        '',
        'ご予約ありがとうございます。以下の内容で確定しました。',
        '',
        `メニュー: ${serviceName}`,
        `日時: ${formatSlotLabel_(start, end, tz)}`,
        `キャンセル: ${cancelUrl}`,
        '',
        '（このメールは自動送信です）',
      ].join('\n');

      // send confirmation only to customer
      MailApp.sendEmail(payload.customer_email, subject, body);
    } catch (_) {}

    return { ok: true, booking_id: bookingId, cancel_url: cancelUrl };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    lock.releaseLock();
  }
}

/** =========================
 * Cancel helper for public page
 * ========================= */
function publicGetBookingSummaryByToken(token, bookingId) {
  assertPublicContext_();
  ensureBaseSheets_();

  if (!token && !bookingId) return { ok: false, error: 'token が指定されていません' };
  // Try script cache first (created at booking time)
  try {
    const tokenNormTmp = String(token || '').trim();
    const bookingNormTmp = String(bookingId || '').trim();
    if (tokenNormTmp) {
      const cb = cacheGet_('cancel:' + tokenNormTmp);
      if (cb) return { ok: true, booking: cb };
    }
    if (!token && bookingNormTmp) {
      const cb2 = cacheGet_('booking:' + bookingNormTmp);
      if (cb2) return { ok: true, booking: cb2 };
    }
  } catch (_) {}
  const cfg = getRuntimeConfig_();
  const sheet = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  if (!sheet) return { ok: false, error: 'Bookings シートが見つかりませんでした' };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'Bookings シートにデータがありません' };

  const header = values[0];
  const idx = (name) => headerIndex_(header, name);
  let iToken = idx('cancel_token');
  let iBooking = idx('booking_id');
  let iStatus = idx('status');
  let iName = idx('customer_name');
  let iEmail = idx('customer_email');
  let iStart = idx('start_iso');
  let iEnd = idx('end_iso');
  let iService = idx('service_name');
  let iAnswers = idx('answers_json');
  let iEvent = idx('event_id');
  if (iStatus < 0) iStatus = headerIndexByNames_(header, ['ステータス','状態','予約状況','状況']);
  if (iName < 0) iName = headerIndexByNames_(header, ['顧客名','氏名','お名前','名前']);
  if (iEmail < 0) iEmail = headerIndexByNames_(header, ['メール','メールアドレス','email']);
  if (iService < 0) iService = headerIndexByNames_(header, ['メニュー','サービス名','service']);
  if (iBooking < 0) iBooking = headerIndexByNames_(header, ['予約ID','booking id']);
  if (iStart < 0) iStart = inferDateColumn_(values, 10);
  const tokenNorm = String(token || '').trim();
  const bookingNorm = String(bookingId || '').trim();
  if (!tokenNorm && !bookingNorm) return { ok: false, error: 'token が空です' };

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    let tokenMatch = false;
    if (tokenNorm && iToken >= 0 && String(row[iToken] || '').trim() === tokenNorm) tokenMatch = true;
    if (tokenNorm && !tokenMatch) {
      for (let c = 0; c < row.length; c++) {
        if (String(row[c] || '').trim() === tokenNorm) { tokenMatch = true; break; }
      }
    }
    // fallback: match by booking_id if token not found
    if (!tokenMatch && bookingNorm) {
      if (iBooking >= 0 && String(row[iBooking] || '').trim() === bookingNorm) tokenMatch = true;
    }
    if (!tokenMatch) continue;

    const bookingId = iBooking >= 0 ? String(row[iBooking] || '') : '';
    const status = iStatus >= 0 ? String(row[iStatus] || '') : '';
    let customerName = iName >= 0 ? String(row[iName] || '') : '';
    let customerEmail = iEmail >= 0 ? String(row[iEmail] || '') : '';
    if (!customerEmail) {
      // fallback: search email-like value in row
      for (let c = 0; c < row.length; c++) {
        const v = String(row[c] || '').trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { customerEmail = v; break; }
      }
    }
    const serviceName = iService >= 0 ? String(row[iService] || '') : '';
    const answers = iAnswers >= 0 ? String(row[iAnswers] || '') : '';
    let startIso = '';
    if (iStart >= 0) {
      const rawStart = row[iStart];
      if (rawStart instanceof Date) startIso = toLocalIso_(rawStart, cfg.TZ);
      else startIso = String(rawStart || '').trim();
    }
    let endIso = '';
    if (iEnd >= 0) {
      const rawEnd = row[iEnd];
      if (rawEnd instanceof Date) endIso = toLocalIso_(rawEnd, cfg.TZ);
      else endIso = String(rawEnd || '').trim();
    }
    const eventId = iEvent >= 0 ? String(row[iEvent] || '') : '';
    const cancelToken = iToken >= 0 ? String(row[iToken] || '') : '';

    return {
      ok: true,
      booking: {
        booking_id: bookingId,
        status,
        customer_name: customerName,
        customer_email: customerEmail,
        service_name: serviceName,
        start_iso: startIso,
        end_iso: endIso,
        answers_json: answers,
        event_id: eventId,
        cancel_token: cancelToken || tokenNorm
      }
    };
  }

  try {
    const sampleTokens = [];
    for (let r = 1; r < Math.min(values.length, 30); r++) {
      if (iToken >= 0) sampleTokens.push(String(values[r][iToken] || ''));
    }
    return { ok: false, error: 'token not found', debug: { sampleTokens } };
  } catch (err) {
    return { ok: false, error: 'token not found' };
  }
}

/**
 * Public helper: given a `booking_id` and the customer's email, return cancel_token if ownership verified.
 * This allows users to retrieve a cancel token by proving they own the booking (email match).
 */
function publicGetCancelTokenByBookingId(bookingId, customerEmail) {
  assertPublicContext_();
  ensureBaseSheets_();

  if (!bookingId || !customerEmail) return { ok: false, error: 'bookingId と customerEmail が必要です' };
  const bid = String(bookingId || '').trim();
  const email = String(customerEmail || '').trim().toLowerCase();

  // try cache first
  try {
    const cached = cacheGet_('booking:' + bid);
    if (cached && cached.customer_email && String(cached.customer_email).trim().toLowerCase() === email) {
      return { ok: true, cancel_token: String(cached.cancel_token || ''), booking: cached };
    }
  } catch (_) {}

  const cfg = getRuntimeConfig_();
  const sheet = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  if (!sheet) return { ok: false, error: 'Bookings シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'Bookings にデータがありません' };

  const header = values[0];
  const idx = (n) => headerIndex_(header, n);
  const iBooking = idx('booking_id');
  let iEmail = idx('customer_email');
  let iToken = idx('cancel_token');
  let iName = idx('customer_name');
  let iStatus = idx('status');
  let iStart = idx('start_iso');

  if (iEmail < 0) iEmail = headerIndexByNames_(header, ['メール','メールアドレス','email']);
  if (iStatus < 0) iStatus = headerIndexByNames_(header, ['ステータス','状態','予約状況','状況']);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const bidVal = iBooking >= 0 ? String(row[iBooking] || '').trim() : '';
    if (!bidVal) continue;
    if (bidVal !== bid) continue;

    const rowEmail = iEmail >= 0 ? String(row[iEmail] || '').trim().toLowerCase() : '';
    // If email on booking is empty, deny to avoid accidental leak
    if (!rowEmail) return { ok: false, error: '予約に紐づくメールアドレスが未設定のため照会できません' };

    if (rowEmail !== email) return { ok: false, error: '顧客メールが一致しません' };

    const cancelToken = iToken >= 0 ? String(row[iToken] || '') : '';
    const bookingObj = {
      booking_id: bidVal,
      status: iStatus >= 0 ? String(row[iStatus] || '') : '',
      customer_name: iName >= 0 ? String(row[iName] || '') : '',
      customer_email: rowEmail,
      start_iso: iStart >= 0 ? (row[iStart] instanceof Date ? toLocalIso_(row[iStart], cfg.TZ) : String(row[iStart] || '')) : ''
    };

    // cache briefly
    try { cacheSet_('booking:' + bidVal, Object.assign({}, bookingObj, { cancel_token: cancelToken }), 600); } catch (_) {}

    if (!cancelToken) return { ok: false, error: 'キャンセル用トークンが見つかりません' };
    return { ok: true, cancel_token: cancelToken, booking: bookingObj };
  }

  return { ok: false, error: '予約が見つかりません' };
}


/** =========================
 * Cancel (public)
 * ========================= */
function publicCancelByToken(token) {
  assertPublicContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const sheet = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'bookings empty' };

  const header = values[0];
  const idx = (name) => headerIndex_(header, name);

  let iStatus = idx('status');
  const iEvent = idx('event_id');
  const iToken = idx('cancel_token');
  const iBookingId = idx('booking_id');
  let iStart = idx('start_iso');
  if (iStart < 0) iStart = inferDateColumn_(values, 10);
  if (iStatus < 0) iStatus = headerIndexByNames_(header, ['ステータス','状態','予約状況','状況']);
  if (iStatus < 0) iStatus = inferStatusColumn_(values, 10, [iStart, iToken, iEvent, iBookingId]);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    // match token: prefer dedicated column, but always scan the row as fallback
    let tokenMatch = false;
    const tokenNorm = String(token || '').trim();
    if (!tokenNorm) continue;
    if (iToken >= 0 && String(row[iToken] || '').trim() === tokenNorm) tokenMatch = true;
    if (!tokenMatch) {
      for (let c = 0; c < row.length; c++) {
        if (String(row[c] || '').trim() === tokenNorm) { tokenMatch = true; break; }
      }
    }
  if (!tokenMatch) continue;
    // determine current status (defensive)
    let curStatus = '';
    if (iStatus >= 0) curStatus = String(row[iStatus] || '').trim().toLowerCase();
    if (curStatus === 'canceled' || curStatus === 'cancelled' || curStatus === 'キャンセル済み' || curStatus === 'キャンセル') {
      return { ok: true, status: 'canceled', idempotent: true };
    }
    if (iStatus >= 0 && curStatus && curStatus !== 'confirmed') {
      return { ok: false, error: 'invalid status', status: curStatus };
    }

    const eventId = String(row[iEvent] || '');
    const bookingId = String(row[iBookingId] || '');
    let startIso = '';
    if (iStart >= 0) {
      const rawStart = row[iStart];
      if (rawStart instanceof Date) startIso = toLocalIso_(rawStart, cfg.TZ);
      else startIso = String(rawStart || '').trim();
    }

    // If status column is missing, add one at the end to allow cancellation update
    if (iStatus < 0) {
      try {
        const newCol = header.length + 1;
        sheet.getRange(1, newCol).setValue('status');
        iStatus = newCol - 1;
      } catch (e) {
        // ignore write failure
      }
    }

    sheet.getRange(r + 1, iStatus + 1).setValue('canceled');
    const updateRes = updateEventAvailabilityAfterCancel_(eventId, startIso);

    // Invalidate caches for current horizon so UI reflects cancellation immediately
    try {
      const cfg = getRuntimeConfig_();
      const tz = cfg.TZ;
      const now2 = new Date();
      const rangeStart = new Date(now2.getTime() + cfg.MIN_LEAD_MIN * 60 * 1000);
      const rangeEnd = addDays_(startOfDay_(rangeStart, tz), cfg.HORIZON_DAYS + 1);
      const slotsKey = 'slots:' + toLocalIso_(rangeStart, tz) + '|' + toLocalIso_(rangeEnd, tz);
      cacheRemove_(slotsKey);
      cacheRemove_('slots:' + toLocalIso_(startOfDay_(new Date(), tz), tz) + '|' + toLocalIso_(addDays_(startOfDay_(new Date(), tz), cfg.HORIZON_DAYS + 1), tz));
      cacheRemove_('events:' + (startIso || '') + '|' + (startIso || ''));
    } catch (_) {}

    // Try to remove calendar event associated with this booking (search by booking_id)
    try {
      try { deleteCalendarEventSafely_(cfg.CALENDAR_ID || '', '', bookingId); } catch (_) { }
    } catch (_) {}

    return { ok: true, booking_id: bookingId, event_id: eventId, updated: updateRes };
  }
  // collect diagnostic hints to help debugging when token not found
  try {
    const sample = [];
    const tokenColVals = [];
    if (iToken >= 0) {
      for (let r = 1; r < Math.min(values.length, 30); r++) tokenColVals.push(String(values[r][iToken] || ''));
    } else {
      // scan first rows for uuid-like values
      const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      for (let r = 1; r < Math.min(values.length, 30); r++) {
        const row = values[r] || [];
        for (let c = 0; c < row.length; c++) {
          const v = String(row[c] || '');
          if (uuidRe.test(v)) tokenColVals.push(v);
        }
      }
    }
    sample.push({ header, indices: { iStatus, iEvent, iToken, iBookingId, iStart } });
    sample.push({ tokenColumnSample: tokenColVals.slice(0, 10) });
    return { ok: false, error: 'token not found', debug: sample };
  } catch (e) {
    return { ok: false, error: 'token not found' };
  }
}

/**
 * After a booking cancellation, recompute remaining capacity and reopen slot if available.
 * - If capacity is not set: keep event available.
 * - If remaining > 0: status=available and availability is (re)upserted.
 * - If remaining <= 0: status=confirmed and availability is archived.
 */
function updateEventAvailabilityAfterCancel_(eventId, startIso) {
  try {
    if (!eventId && !startIso) return { ok: false, error: 'eventId or startIso required' };
    ensureBaseSheets_();
    const cfg = getRuntimeConfig_();
    const tz = cfg.TZ;

    const eventsSheet = getSS_().getSheetByName(cfg.SHEET_EVENTS);
    if (!eventsSheet) return { ok: false, error: 'Events sheet not found' };
    const values = eventsSheet.getDataRange().getValues();
    if (values.length < 2) return { ok: false, error: 'Events empty' };

    const header = values[0];
    const idx = (name) => headerIndex_(header, name);
    let iEventId = idx('event_id');
    let iStatus = idx('status');
    let iStart = idx('start_iso');
    let iEnd = idx('end_iso');
    let iTitle = idx('title');
    let iServiceId = idx('service_id');
    let iSource = idx('source');
    let iCapacity = idx('capacity');
    let iUpdated = idx('updated_at');

    if (iStart < 0) iStart = inferDateColumn_(values, 10);
    if (iEnd < 0) {
      if (iStart >= 0 && iStart + 1 < header.length) iEnd = iStart + 1;
      else iEnd = inferDateColumn_(values, 10);
    }
    if (iCapacity < 0) iCapacity = inferNumericColumn_(values, 10, [iStart, iEnd]);
    if (iTitle < 0) iTitle = inferTitleColumn_(values, 10, [iStart, iEnd, iStatus, iEventId, iCapacity]);

    // normalize startIso for comparison
    let startIsoNorm = String(startIso || '').trim();
    try {
      if (startIsoNorm) {
        const sd = parseLocalIso_(startIsoNorm.replace(/\s+/g, 'T').replace(/T(\d)(?=:)/g, 'T0$1'));
        if (!isNaN(sd.getTime())) startIsoNorm = toLocalIso_(sd, tz);
      }
    } catch (_) {}

    // find matching event row
    let rowNum = -1;
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const evId = iEventId >= 0 ? String(row[iEventId] || '').trim() : '';
      if (eventId && evId && String(evId) === String(eventId)) { rowNum = r + 1; break; }
      if (!eventId && startIsoNorm && iStart >= 0) {
        const rawStart = row[iStart];
        let rowIso = '';
        if (rawStart instanceof Date) rowIso = toLocalIso_(rawStart, tz);
        else rowIso = String(rawStart || '').trim();
        if (rowIso === startIsoNorm) { rowNum = r + 1; break; }
      }
    }
    if (rowNum < 0) return { ok: false, error: 'event not found' };

    const row = values[rowNum - 1];
    const evId = (iEventId >= 0 ? String(row[iEventId] || '').trim() : '') || String(eventId || '').trim();
    const capRaw = (iCapacity >= 0 && row[iCapacity] !== undefined) ? row[iCapacity] : '';
    let capN = null;
    if (capRaw !== undefined && String(capRaw).trim() !== '') {
      const n = Number(capRaw);
      if (!isNaN(n) && isFinite(n)) capN = n;
    }

    // build bookings count maps (confirmed only)
    const bookingsByEventId = {};
    const bookingsByStartIso = {};
    try {
      const bsh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
      if (bsh) {
        const bvals = bsh.getDataRange().getValues();
        if (bvals.length >= 2) {
          const bheader = bvals[0];
          const biEvent = headerIndex_(bheader, 'event_id');
          const biStatus = headerIndex_(bheader, 'status');
          let biStart = headerIndex_(bheader, 'start_iso');
          if (biStart < 0) biStart = inferDateColumn_(bvals, 10);
          for (let br = 1; br < bvals.length; br++) {
            const brow = bvals[br];
            const st = biStatus >= 0 ? String(brow[biStatus] || '').trim() : 'confirmed';
            if (st !== 'confirmed') continue;
            const bev = biEvent >= 0 ? String(brow[biEvent] || '').trim() : '';
            let bs = '';
            if (biStart >= 0) {
              const raw = brow[biStart];
              if (raw instanceof Date) bs = toLocalIso_(raw, tz);
              else bs = String(raw || '').trim();
            }
            if (bev) bookingsByEventId[bev] = (bookingsByEventId[bev] || 0) + 1;
            if (bs) bookingsByStartIso[bs] = (bookingsByStartIso[bs] || 0) + 1;
          }
        }
      }
    } catch (_) {}

    // determine remaining & status
    let status = 'available';
    if (capN !== null) {
      const startKey = (iStart >= 0) ? (row[iStart] instanceof Date ? toLocalIso_(row[iStart], tz) : String(row[iStart] || '').trim()) : startIsoNorm;
      const usedByEvent = evId ? (bookingsByEventId[evId] || 0) : 0;
      const usedByIso = startKey ? (bookingsByStartIso[startKey] || 0) : 0;
      const used = usedByEvent || usedByIso;
      const remaining = Math.max(0, capN - used);
      status = (remaining > 0) ? 'available' : 'confirmed';
    }

    if (iStatus >= 0) eventsSheet.getRange(rowNum, iStatus + 1).setValue(status);
    if (iUpdated >= 0) eventsSheet.getRange(rowNum, iUpdated + 1).setValue(new Date());

    // update availability mirror
    if (status === 'available') {
      const evt = {
        event_id: evId,
        source: (iSource >= 0 ? String(row[iSource] || '').trim() : 'booking') || 'booking',
        status: 'available',
        title: (iTitle >= 0 ? String(row[iTitle] || '').trim() : ''),
        service_id: (iServiceId >= 0 ? String(row[iServiceId] || '').trim() : ''),
        start_iso: (iStart >= 0 ? (row[iStart] instanceof Date ? toLocalIso_(row[iStart], tz) : String(row[iStart] || '').trim()) : ''),
        end_iso: (iEnd >= 0 ? (row[iEnd] instanceof Date ? toLocalIso_(row[iEnd], tz) : String(row[iEnd] || '').trim()) : ''),
        capacity: capRaw !== undefined ? capRaw : ''
      };
      try { upsertAvailabilityFromEvent_(evt); } catch (_) {}
    } else {
      try { archiveAvailabilityForEvent_(evId || eventId); } catch (_) {}
    }

    // Invalidate caches for UI to reflect updated remaining immediately
    try {
      const cfg2 = getRuntimeConfig_();
      const tz2 = cfg2.TZ;
      const now3 = new Date();
      const rangeStart2 = new Date(now3.getTime() + cfg2.MIN_LEAD_MIN * 60 * 1000);
      const rangeEnd2 = addDays_(startOfDay_(rangeStart2, tz2), cfg2.HORIZON_DAYS + 1);
      cacheRemove_('slots:' + toLocalIso_(rangeStart2, tz2) + '|' + toLocalIso_(rangeEnd2, tz2));
      cacheRemove_('slots:' + toLocalIso_(startOfDay_(new Date(), tz2), tz2) + '|' + toLocalIso_(addDays_(startOfDay_(new Date(), tz2), cfg2.HORIZON_DAYS + 1), tz2));
      cacheRemove_('events:' + (toLocalIso_(start, tz2) || '') + '|' + (toLocalIso_(end, tz2) || ''));
    } catch (_) {}

    return { ok: true, status };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** =========================
 * Admin APIs (called from admin.html)
 * ✅ TEMP: allow same deployment, no auth
 * ========================= */

/** デバッグ用: 現在の認証状態を全て返す */
function getDiagnosticInfo() {
  const props = PropertiesService.getScriptProperties();
  const info = {
    stored_admin: props.getProperty(PROP_KEYS.ADMIN_EXECUTOR_EMAIL) || '(not set)',
    active_user: '',
    effective_user: '',
    isExecutor_result: false,
    timestamp: new Date().toISOString()
  };
  try { info.active_user = Session.getActiveUser().getEmail() || '(empty)'; } catch (e) { info.active_user = 'ERROR: ' + e.message; }
  try { info.effective_user = Session.getEffectiveUser().getEmail() || '(empty)'; } catch (e) { info.effective_user = 'ERROR: ' + e.message; }
  try { info.isExecutor_result = isExecutor_(); } catch (e) { info.isExecutor_result = 'ERROR: ' + e.message; }
  console.log('[getDiagnosticInfo]', JSON.stringify(info));
  return info;
}

/** index.html用：管理URLを返す（未設定なら今のURL + ?admin=1） */
function getAdminUrl() {
  const props = PropertiesService.getScriptProperties();
  const u = String(props.getProperty(PROP_KEYS.ADMIN_WEBAPP_URL) || '').trim();
  if (u) return normalizeUrl_(u) + '?admin=1';
  const base = String(ScriptApp.getService().getUrl() || '').trim();
  if (!base) return '';
  return base + '?admin=1';
}

/** index.html用：セットアップページURLを返す（base + ?setup=1） */
function getSetupUrl() {
  const props = PropertiesService.getScriptProperties();
  const u = String(props.getProperty(PROP_KEYS.PUBLIC_WEBAPP_URL) || '').trim();
  if (u) return normalizeUrl_(u) + '?setup=1';
  const base = String(ScriptApp.getService().getUrl() || '').trim();
  if (!base) return '';
  return base + '?setup=1';
}

/** Return public webapp URL for opening from admin UI */
function getPublicUrl() {
  assertAdminContext_();
  try {
    return getPublicWebAppUrl_();
  } catch (err) {
    return '';
  }
}

/** Public: list course metadata for timeline display */
function publicListCourses() {
  assertPublicContext_();
  ensureBaseSheets_();
  try {
    const cached = cacheGet_('courses');
    if (cached) return cached;
  } catch (_) {}
  const list = listCourses_();
  try { cacheSet_('courses', list, 30); } catch (_) {}
  return list;
}

/** Admin: list course metadata */
function adminListCourses() {
  assertAdminContext_();
  ensureBaseSheets_();
  return listCourses_();
}

/** Admin: upsert course metadata (description + thumbnail) */
function adminUpsertCourseMeta(meta) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!meta) throw new Error('meta required');
  const name = String(meta.course_name || meta.name || '').trim();
  if (!name) throw new Error('course_name required');

  const ss = getSS_();
  const sh = ss.getSheetByName(CFG_DEFAULT.SHEET_COURSES);
  const values = sh.getDataRange().getValues();
  const header = values.length > 0 ? values[0] : [];
  const idx = (n) => headerIndex_(header, n);
  let iName = idx('course_name');
  let iDesc = idx('description');
  let iUrl = idx('thumbnail_url');
  let iFile = idx('thumbnail_file_id');
  let iData = idx('thumbnail_data');
  let iUpdated = idx('updated_at');

  const desc = String(meta.description || '').trim();
  let thumbnailUrl = String(meta.thumbnail_url || '').trim();
  let thumbnailFileId = String(meta.thumbnail_file_id || '').trim();
  let thumbnailData = '';
  const removeThumb = !!meta.remove_thumbnail;

  // find existing row
  let rowIndex = -1;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iName] || '').trim() === name) { rowIndex = r + 1; break; }
  }

  // load existing thumbnail values if row exists
  if (rowIndex > 0) {
    const row = values[rowIndex - 1];
    if (iUrl >= 0) thumbnailUrl = String(row[iUrl] || '').trim();
    if (iFile >= 0) thumbnailFileId = String(row[iFile] || '').trim();
    if (iData >= 0) thumbnailData = String(row[iData] || '').trim();
  }

  // remove existing thumbnail if requested
  if (removeThumb && thumbnailFileId) {
    try {
      const f = DriveApp.getFileById(thumbnailFileId);
      f.setTrashed(true);
    } catch (_) {}
    thumbnailUrl = '';
    thumbnailFileId = '';
    // also clear inline data
    thumbnailData = '';
  }
  // store inline thumbnail data if provided (data URL expected)
  if (meta.thumbnail_base64) {
    // prefer a full data URL; if only base64 payload provided, prefix with provided mime or png
    const rawVal = String(meta.thumbnail_base64 || '');
    if (rawVal.indexOf('data:') === 0) {
      thumbnailData = rawVal;
    } else {
      const mime = String(meta.thumbnail_mime || 'image/png');
      const payload = rawVal.indexOf('base64,') >= 0 ? rawVal.split('base64,')[1] : rawVal;
      thumbnailData = `data:${mime};base64,${payload}`;
    }
    // use inline data as thumbnail_url for immediate rendering
    thumbnailUrl = thumbnailData;
    // clear file-id since we no longer use Drive
    thumbnailFileId = '';
  }

  const now = new Date();
  if (rowIndex < 0) {
    const appendArr = [name, desc, thumbnailUrl, thumbnailFileId];
    if (iData >= 0) appendArr.push(thumbnailData);
    appendArr.push(now);
    sh.appendRow(appendArr);
  } else {
    if (iName >= 0) sh.getRange(rowIndex, iName + 1).setValue(name);
    if (iDesc >= 0) sh.getRange(rowIndex, iDesc + 1).setValue(desc);
    if (iUrl >= 0) sh.getRange(rowIndex, iUrl + 1).setValue(thumbnailUrl);
    if (iFile >= 0) sh.getRange(rowIndex, iFile + 1).setValue(thumbnailFileId);
    if (iData >= 0) sh.getRange(rowIndex, iData + 1).setValue(thumbnailData);
    if (iUpdated >= 0) sh.getRange(rowIndex, iUpdated + 1).setValue(now);
  }

  // invalidate cache
  try { cacheRemove_('courses'); } catch (_) {}

  return {
    ok: true,
    course: {
      course_name: name,
      description: desc,
      thumbnail_url: thumbnailUrl,
      thumbnail_file_id: thumbnailFileId,
      thumbnail_data: thumbnailData,
      updated_at: now
    }
  };
}

/** 管理画面：現在の設定＋シート状況など */
function adminGetStatus() {
  assertAdminContext_();

  const props = PropertiesService.getScriptProperties();
  const cfg = getRuntimeConfig_();

  const ss = getSS_();
  const spreadsheetId = ss.getId();
  const spreadsheetUrl = ss.getUrl();
  const sheetNames = ss.getSheets().map(s => s.getName());

  return {
    ok: true,
    now: new Date(),
    tz: cfg.TZ,
    scriptUrl: ScriptApp.getService().getUrl() || '',
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: spreadsheetUrl,
    sheets: sheetNames,
    props: {
      CALENDAR_ID: props.getProperty(PROP_KEYS.CALENDAR_ID) || CFG_DEFAULT.CALENDAR_ID,
      HORIZON_DAYS: props.getProperty(PROP_KEYS.HORIZON_DAYS) || String(CFG_DEFAULT.HORIZON_DAYS),
      MIN_LEAD_MIN: props.getProperty(PROP_KEYS.MIN_LEAD_MIN) || String(CFG_DEFAULT.MIN_LEAD_MIN),
      NOTIFY_OWNER_EMAIL: props.getProperty(PROP_KEYS.NOTIFY_OWNER_EMAIL) || (CFG_DEFAULT.NOTIFY_OWNER_EMAIL || ''),
      EVENT_SYNC_DAYS: props.getProperty(PROP_KEYS.EVENT_SYNC_DAYS) || String(CFG_DEFAULT.EVENT_SYNC_DAYS),
      SPREADSHEET_ID: props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '',
      PUBLIC_WEBAPP_URL: props.getProperty(PROP_KEYS.PUBLIC_WEBAPP_URL) || '',
      ADMIN_WEBAPP_URL: props.getProperty(PROP_KEYS.ADMIN_WEBAPP_URL) || '',
    },
    columns: {
      Services: [],
      Availabilities: ['availability_id','service_id','title','start_iso','end_iso','capacity','status','source','updated_at'],
      Events: ['event_id','source','status','title','service_id','start_iso','end_iso','location','description','capacity','booking_id','updated_at','last_synced_at'],
      Bookings: ['booking_id','created_at','status','service_id','service_name','customer_name','customer_email','start_iso','end_iso','answers_json','event_id','cancel_token'],
    }
  };
}

/** 管理画面：プロパティをまとめて更新 */
function adminUpdateConfig(next) {
  assertAdminContext_();
  if (!next) throw new Error('config required');

  const props = PropertiesService.getScriptProperties();

  const setIf = (k, v) => {
    if (v === undefined || v === null) return;
    props.setProperty(k, String(v).trim());
  };

  setIf(PROP_KEYS.CALENDAR_ID, next.CALENDAR_ID);
  setIf(PROP_KEYS.HORIZON_DAYS, next.HORIZON_DAYS);
  setIf(PROP_KEYS.MIN_LEAD_MIN, next.MIN_LEAD_MIN);
  setIf(PROP_KEYS.NOTIFY_OWNER_EMAIL, next.NOTIFY_OWNER_EMAIL);
  setIf(PROP_KEYS.EVENT_SYNC_DAYS, next.EVENT_SYNC_DAYS);

  // URL系/Spreadsheet は任意
  if (next.PUBLIC_WEBAPP_URL !== undefined) setIf(PROP_KEYS.PUBLIC_WEBAPP_URL, next.PUBLIC_WEBAPP_URL);
  if (next.ADMIN_WEBAPP_URL !== undefined) setIf(PROP_KEYS.ADMIN_WEBAPP_URL, next.ADMIN_WEBAPP_URL);
  if (next.SPREADSHEET_ID !== undefined) setIf(PROP_KEYS.SPREADSHEET_ID, next.SPREADSHEET_ID);

  return { ok: true };
}

/** 管理画面：Sheets を作成/ヘッダ整備 */
function adminEnsureSheets() {
  assertAdminContext_();
  ensureBaseSheets_();
  return { ok: true };
}

/** 管理画面：新規 Spreadsheet を作成し、SPREADSHEET_ID に紐付け */
function adminCreateAndBindSpreadsheet(name) {
  assertAdminContext_();
  const nm = String(name || '予約管理システム').trim() || '予約管理システム';
  const ss = SpreadsheetApp.create(nm);
  PropertiesService.getScriptProperties().setProperty(PROP_KEYS.SPREADSHEET_ID, ss.getId());
  // 必要なシート/ヘッダ
  ensureBaseSheets_();
  return { ok: true, spreadsheet_id: ss.getId(), spreadsheet_url: ss.getUrl() };
}

/** 管理画面：既存 Spreadsheet ID を紐付け（ヘッダも整備） */
function adminBindSpreadsheetById(spreadsheetId) {
  assertAdminContext_();
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('spreadsheetId required');
  // open check
  SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(PROP_KEYS.SPREADSHEET_ID, id);
  ensureBaseSheets_();
  const ss = SpreadsheetApp.openById(id);
  return { ok: true, spreadsheet_id: ss.getId(), spreadsheet_url: ss.getUrl() };
}

/** =========================
 * Setup Wizard — マルチテナント方式
 * =========================
 * テンプレート不要。管理者が1回デプロイするだけで、
 * 各ユーザーがワンクリックで自分専用のスプレッドシートと予約システムを取得できる。
 *
 * フロー:
 *  1. 管理者が本スクリプトをWebアプリとしてデプロイ（1回だけ）
 *  2. ユーザーが ?setup=1 を開く
 *  3. 「セットアップ実行」→ 新規SS作成 → シート/ヘッダ/ガイド初期化 → Usersシートに登録
 *  4. 即座にユーザー固有の予約ページURL・管理画面URLが発行される
 *  5. 完了 → ユーザーは追加の手順なしで予約管理を利用開始
 *
/** =========================
 * テンプレートコピーモデル
 * - 管理者のSS＋バウンドスクリプトをまるごとコピーして各テナントに配布
 * - 各テナントはコピーSSを自分でデプロイして独立運用
 * ========================= */

const SHEET_USERS = 'Users';

// getSetupUrl() is defined above (near getAdminUrl) with isExecutor_() guard.
// Duplicate removed to prevent shadowing.

/** ユーザーレジストリ: Users シートから email → SS ID を引く */
function getUserRegistry_() {
  const ss = getOwnerSS_();
  let sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_USERS);
    sh.getRange(1, 1, 1, 7).setValues([['email', 'spreadsheet_id', 'spreadsheet_url', 'created_at', 'deploy_url', 'script_id', 'deploy_error']]);
  }
  return sh;
}

/** オーナーの（配布元の）SS を返す。container-bound ならそのSS。
 *  存在しない場合は自動作成して SPREADSHEET_ID に保存する。 */
function getOwnerSS_() {
  // 1. Container-bound
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (_) {}

  // 2. ScriptProperties に保存済み（onOpen で保存される）
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '').trim();
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (_) {}
  }

  throw new Error(
    'テンプレートのSSが見つかりません。\n' +
    '管理者がスプレッドシートを一度開いてください（onOpenでSS IDが自動保存されます）。'
  );
}

/** email → { spreadsheet_id, spreadsheet_url } or null */
function findUserSS_(email) {
  if (!email) return null;
  const sh = getUserRegistry_();
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim().toLowerCase() === email.trim().toLowerCase()) {
      return {
        spreadsheet_id: String(vals[i][1] || ''),
        spreadsheet_url: String(vals[i][2] || ''),
        deploy_url: String(vals[i][4] || ''),
        script_id: String(vals[i][5] || ''),
        deploy_error: String(vals[i][6] || ''),
      };
    }
  }
  return null;
}

/** セットアップ状態を返す（テンプレート依存なし） */
function setupGetStatus() {
  try {
    const user = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    // オーナーSSが無い場合でもクラッシュしないよう防御
    let existing = null;
    try {
      existing = findUserSS_(user);
    } catch (regErr) {
      // ユーザーレジストリ自体がまだ無い場合 → 未セットアップ扱い
      console.warn('getUserRegistry_ failed (first time?):', regErr);
    }
    return {
      ok: true,
      user_email: user,
      already_setup: !!existing,
      spreadsheet_id: existing ? existing.spreadsheet_id : '',
      spreadsheet_url: existing ? existing.spreadsheet_url : '',
      deploy_url: existing ? existing.deploy_url : '',
      script_id: existing ? existing.script_id : '',
      deploy_error: existing ? existing.deploy_error : '',
    };
  } catch (e) {
    // 最終フォールバック: ユーザーメールだけでも返す
    const fallbackEmail = (function() { try { return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch(_) { return ''; } })();
    return {
      ok: true,
      user_email: fallbackEmail,
      already_setup: false,
      spreadsheet_id: '',
      spreadsheet_url: '',
      deploy_url: '',
      script_id: '',
      deploy_error: '',
    };
  }
}

/* ─────────────────────────────────────────
 * ポータル連携 (paging_app への自動登録)
 *
 * テナントのデプロイ完了後にポータルの Admin API を呼び、
 * Supabase tenants テーブルに upsert する。
 *
 * テナントの詳細情報（画像・説明・メニュー等）は
 * スプレッドシートの「TenantProfile」シートから読み取る。
 * ───────────────────────────────────────── */

/** TenantProfile シート名 */
var SHEET_TENANT_PROFILE = 'TenantProfile';

/**
 * TenantProfile シートを作成/保全する。
 * Key-Value 形式: A列=フィールド名, B列=値
 */
function ensureTenantProfileSheet_() {
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_TENANT_PROFILE);
  if (sh) return sh;

  sh = ss.insertSheet(SHEET_TENANT_PROFILE);
  // Key-Value ヘッダと初期行を設定
  var rows = [
    ['field', 'value'],
    ['slug', ''],
    ['name', ''],
    ['category', ''],
    ['catch_copy', ''],
    ['description', ''],
    ['photo_url', ''],
    ['address', ''],
    ['phone', ''],
    ['business_hours', ''],
    ['closed_days', ''],
    ['tags', ''],
    ['menus_json', '[]'],
    ['is_public', 'true'],
    ['booking_url', ''],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);

  // 幅を調整
  sh.setColumnWidth(1, 160);
  sh.setColumnWidth(2, 500);

  // ガイド行を追加
  sh.getRange(rows.length + 2, 1, 1, 2).setValues([
    ['--- 入力ガイド ---', '上の各フィールドの value 列に値を入力してください。tags はカンマ区切り。menus_json は JSON 配列 [{name,price,description},...] 形式。'],
  ]);

  return sh;
}

/**
 * TenantProfile シートからプロフィール情報を読み取る。
 * @return {Object} フィールド名→値のマップ
 */
function readTenantProfile_() {
  var sh = ensureTenantProfileSheet_();
  var vals = sh.getDataRange().getValues();
  var profile = {};
  for (var i = 1; i < vals.length; i++) {
    var key = String(vals[i][0] || '').trim();
    var val = String(vals[i][1] || '').trim();
    if (key && key.indexOf('---') !== 0) {
      profile[key] = val;
    }
  }
  return profile;
}

/**
 * TenantProfile シートにフィールドの値を書き込む。
 * @param {string} field フィールド名
 * @param {string} value 値
 */
function writeTenantProfileField_(field, value) {
  var sh = ensureTenantProfileSheet_();
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === field) {
      sh.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // フィールドが無ければ追加
  sh.appendRow([field, value]);
}

/**
 * メールアドレスや SS 名から slug を自動生成する。
 * TenantProfile シートの slug が設定されていればそちらを優先。
 * TENANT_SLUG プロパティも参照する（後方互換）。
 */
function generateSlug_(email, ssName) {
  // 1. TenantProfile の slug
  try {
    var profile = readTenantProfile_();
    if (profile.slug && profile.slug.length >= 2) return profile.slug;
  } catch (_) {}

  // 2. スクリプトプロパティの TENANT_SLUG
  var props = PropertiesService.getScriptProperties();
  var manual = String(props.getProperty(PROP_KEYS.TENANT_SLUG) || '').trim();
  if (manual) return manual;

  // 3. メールから生成: user@example.com → user-example
  if (email) {
    var slug = String(email).split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (slug.length >= 2) {
      try { props.setProperty(PROP_KEYS.TENANT_SLUG, slug); } catch (_) {}
      try { writeTenantProfileField_('slug', slug); } catch (_) {}
      return slug;
    }
  }

  // 4. SS名から (ASCII のみ抽出)
  if (ssName) {
    var slug2 = String(ssName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (slug2.length >= 2) {
      try { props.setProperty(PROP_KEYS.TENANT_SLUG, slug2); } catch (_) {}
      try { writeTenantProfileField_('slug', slug2); } catch (_) {}
      return slug2;
    }
  }

  // 5. 最終フォールバック: ランダム
  var fallback = 'tenant-' + Utilities.getUuid().slice(0, 8);
  try { props.setProperty(PROP_KEYS.TENANT_SLUG, fallback); } catch (_) {}
  try { writeTenantProfileField_('slug', fallback); } catch (_) {}
  return fallback;
}

/**
 * ポータル Admin API にテナント情報をフル送信（upsert）する。
 * TenantProfile シートの詳細情報（画像・説明・メニュー等）を全て含む。
 *
 * @param {string} deployUrl GAS WebアプリのデプロイURL (booking_url として使用)
 * @return {{ ok: boolean, skipped?: boolean, error?: string, response?: object }}
 */
function registerToPortal_(deployUrl) {
  var props = PropertiesService.getScriptProperties();
  var portalApiUrl = String(props.getProperty(PROP_KEYS.PORTAL_API_URL) || '').trim();
  var portalSecret = String(props.getProperty(PROP_KEYS.PORTAL_ADMIN_SECRET) || '').trim();

  // ポータル連携が設定されていなければスキップ（エラーにはしない）
  if (!portalApiUrl || !portalSecret) {
    console.log('[registerToPortal_] PORTAL_API_URL or PORTAL_ADMIN_SECRET not set — skipping portal registration.');
    return { ok: true, skipped: true, reason: 'ポータル連携設定（API URL / Admin Secret）が未設定です。' };
  }

  // deployUrl (booking_url) は空でも登録を続行する（オプション）

  // TenantProfile シートから詳細情報を読み取り
  var profile = {};
  try { profile = readTenantProfile_(); } catch (_) {}

  // slug / name の決定
  var email = '';
  try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (_) {}
  var ssName = '';
  try { ssName = SpreadsheetApp.getActiveSpreadsheet().getName(); } catch (_) {}

  var slug = generateSlug_(email, ssName);

  // name: TenantProfile > TENANT_NAME プロパティ > SS名 > slug
  var name = String(profile.name || '').trim()
    || String(props.getProperty(PROP_KEYS.TENANT_NAME) || '').trim()
    || ssName
    || slug;

  // category
  var category = String(profile.category || '').trim()
    || String(props.getProperty(PROP_KEYS.TENANT_CATEGORY) || '').trim()
    || '';

  // tags: カンマ区切り文字列 → 配列
  var tags = [];
  var tagsRaw = String(profile.tags || '').trim();
  if (tagsRaw) {
    tags = tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
  }

  // menus: JSON 配列
  var menus = [];
  var menusRaw = String(profile.menus_json || '').trim();
  if (menusRaw) {
    try { menus = JSON.parse(menusRaw); } catch (_) { menus = []; }
  }

  // is_public
  var isPublic = true;
  var isPublicRaw = String(profile.is_public || '').trim().toLowerCase();
  if (isPublicRaw === 'false' || isPublicRaw === '0' || isPublicRaw === 'no') {
    isPublic = false;
  }

  // ペイロード組み立て（全フィールド送信）
  var payload = {
    slug: slug,
    name: name,
    is_public: isPublic,
  };

  // booking_url: deployUrl > TenantProfile の booking_url > 空（オプション）
  var bookingUrl = String(deployUrl || '').trim()
    || String(profile.booking_url || '').trim();
  if (bookingUrl) payload.booking_url = bookingUrl;

  // オプションフィールド（空でないものだけ送信）
  if (category) payload.category = category;
  if (String(profile.catch_copy || '').trim()) payload.catch_copy = String(profile.catch_copy).trim();
  if (String(profile.description || '').trim()) payload.description = String(profile.description).trim();
  if (String(profile.photo_url || '').trim()) payload.photo_url = String(profile.photo_url).trim();
  if (String(profile.address || '').trim()) payload.address = String(profile.address).trim();
  if (String(profile.phone || '').trim()) payload.phone = String(profile.phone).trim();
  if (String(profile.business_hours || '').trim()) payload.business_hours = String(profile.business_hours).trim();
  if (String(profile.closed_days || '').trim()) payload.closed_days = String(profile.closed_days).trim();
  if (tags.length > 0) payload.tags = tags;
  if (menus.length > 0) payload.menus = menus;

  var endpoint = portalApiUrl.replace(/\/+$/, '') + '/api/admin/tenants';

  try {
    var resp = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': portalSecret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    console.log('[registerToPortal_] response ' + code + ': ' + body.substring(0, 500));
    if (code >= 200 && code < 300) {
      return { ok: true, response: JSON.parse(body) };
    } else {
      var errDetail = 'Portal API returned ' + code;
      try {
        var errJson = JSON.parse(body);
        if (errJson.hint) errDetail += ' (' + errJson.hint + ')';
        else if (errJson.error) errDetail += ': ' + errJson.error;
      } catch (_) {
        errDetail += ': ' + body.substring(0, 200);
      }
      return { ok: false, error: errDetail };
    }
  } catch (e) {
    console.error('[registerToPortal_] fetch error:', e);
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

/**
 * 管理メニューから手動でポータル登録を実行する。
 * TenantProfile シートの内容を全て送信する。
 */
function menuRegisterToPortal_() {
  var ui = SpreadsheetApp.getUi();
  var deployUrl = getPublicWebAppUrl_();
  if (!deployUrl) {
    ui.alert('エラー', 'デプロイURLが取得できません。\n先にWebアプリをデプロイしてください。', ui.ButtonSet.OK);
    return;
  }
  var result = registerToPortal_(deployUrl);
  if (result.skipped) {
    ui.alert('スキップ', 'ポータル連携が設定されていません。\n\nスクリプトプロパティに以下を設定してください:\n• PORTAL_API_URL（ポータルのURL）\n• PORTAL_ADMIN_SECRET（共有シークレット）', ui.ButtonSet.OK);
  } else if (result.ok) {
    var slug = generateSlug_('', '');
    ui.alert('✅ 完了', 'ポータルへのテナント登録が完了しました。\n\nslug: ' + slug + '\nポータルURL: /t/' + slug + '\n\nTenantProfile シートの内容を変更した場合は、\n再度このメニューを実行してください。', ui.ButtonSet.OK);
  } else {
    ui.alert('エラー', 'ポータル登録に失敗しました:\n' + (result.error || '不明なエラー'), ui.ButtonSet.OK);
  }
}

/**
 * 管理メニューから TenantProfile シートを開く/作成するヘルパー。
 */
function menuOpenTenantProfile_() {
  var sh = ensureTenantProfileSheet_();
  var ui = SpreadsheetApp.getUi();
  ui.alert('TenantProfile シート',
    'TenantProfile シートが準備されました。\n\n' +
    '各フィールドの value 列に店舗情報を入力してください:\n' +
    '• slug — ポータル上のURL識別子 (英数字-)\n' +
    '• name — 店舗名\n' +
    '• category — カテゴリ\n' +
    '• catch_copy — 短い紹介文\n' +
    '• description — 詳細説明\n' +
    '• photo_url — メイン画像URL (https)\n' +
    '• address — 住所\n' +
    '• phone — 電話番号\n' +
    '• business_hours — 営業時間\n' +
    '• closed_days — 定休日\n' +
    '• tags — タグ (カンマ区切り)\n' +
    '• menus_json — メニュー JSON配列\n' +
    '  例: [{"name":"カット","price":"¥4,400","description":"似合わせカット"}]\n' +
    '• is_public — 公開フラグ (true/false)\n\n' +
    '入力後「📡 ポータルサイトに登録」でポータルに反映されます。',
    ui.ButtonSet.OK);

  // TenantProfile シートに移動
  SpreadsheetApp.setActiveSheet(sh);
}

/* ─────────────────────────────────────────
 * フロントエンド (admin.html / setup.html) 向け
 * テナントプロフィール CRUD & ポータル登録 API
 * ───────────────────────────────────────── */

/**
 * テナントプロフィール情報をフロントエンドに返す。
 * @return {Object} { ok: true, profile: { slug, name, ... }, portal: { configured, api_url } }
 */
function adminGetTenantProfile() {
  try {
    var profile = readTenantProfile_();
    var props = PropertiesService.getScriptProperties();
    var portalApiUrl = String(props.getProperty(PROP_KEYS.PORTAL_API_URL) || '').trim();
    var portalSecret = String(props.getProperty(PROP_KEYS.PORTAL_ADMIN_SECRET) || '').trim();
    var deployUrl = getPublicWebAppUrl_();
    return {
      ok: true,
      profile: profile,
      portal: {
        configured: !!(portalApiUrl && portalSecret),
        api_url: portalApiUrl,
        deploy_url: deployUrl || '',
      },
    };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}

/**
 * テナントプロフィール情報を TenantProfile シートに保存する。
 * @param {Object} data { slug, name, category, catch_copy, description, photo_url, address, phone, business_hours, closed_days, tags, menus_json, is_public }
 * @return {Object} { ok: true }
 */
function adminSaveTenantProfile(data) {
  try {
    if (!data || typeof data !== 'object') throw new Error('データが不正です');
    var fields = ['slug', 'name', 'category', 'catch_copy', 'description', 'photo_url',
                  'address', 'phone', 'business_hours', 'closed_days', 'tags', 'menus_json', 'is_public',
                  'booking_url'];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (data[f] !== undefined && data[f] !== null) {
        writeTenantProfileField_(f, String(data[f]));
      }
    }
    // name, slug, category はスクリプトプロパティにも同期
    var props = PropertiesService.getScriptProperties();
    if (data.slug) try { props.setProperty(PROP_KEYS.TENANT_SLUG, String(data.slug).trim()); } catch (_) {}
    if (data.name) try { props.setProperty(PROP_KEYS.TENANT_NAME, String(data.name).trim()); } catch (_) {}
    if (data.category) try { props.setProperty(PROP_KEYS.TENANT_CATEGORY, String(data.category).trim()); } catch (_) {}
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}

/**
 * テナントプロフィールを保存した上でポータルに送信する。
 * data に portal_api_url / portal_admin_secret が含まれていれば
 * 連携設定も自動的に保存してから登録を行う（保存忘れ防止）。
 * @param {Object} data プロフィールデータ + ポータル連携設定（任意）
 * @return {Object} { ok, profile_saved, portal_result }
 */
function adminSaveAndRegisterToPortal(data) {
  try {
    // 0. ポータル連携設定が含まれていれば先に保存（保存忘れ防止）
    if (data && (data.portal_api_url || data.portal_admin_secret)) {
      var settingsResult = adminSavePortalSettings({
        portal_api_url: data.portal_api_url,
        portal_admin_secret: data.portal_admin_secret,
      });
      if (!settingsResult.ok) return { ok: false, error: '連携設定の保存に失敗: ' + (settingsResult.error || '') };
    }

    // 1. プロフィール保存
    var saveResult = adminSaveTenantProfile(data);
    if (!saveResult.ok) return { ok: false, error: 'プロフィール保存失敗: ' + (saveResult.error || '') };

    // 2. ポータル登録
    // booking_url: フォーム入力値 > GASデプロイURL > 空文字(オプション)
    var bookingUrl = (data && data.booking_url) ? String(data.booking_url).trim() : '';
    if (!bookingUrl) {
      try { bookingUrl = getPublicWebAppUrl_() || ''; } catch (_) {}
    }
    var portalResult = registerToPortal_(bookingUrl);
    return { ok: true, profile_saved: true, portal_result: portalResult };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}

/**
 * ポータル連携設定を保存する。
 * @param {Object} data { portal_api_url, portal_admin_secret }
 * @return {Object} { ok: true }
 */
function adminSavePortalSettings(data) {
  try {
    var props = PropertiesService.getScriptProperties();
    if (data.portal_api_url !== undefined) {
      props.setProperty(PROP_KEYS.PORTAL_API_URL, String(data.portal_api_url || '').trim());
    }
    if (data.portal_admin_secret !== undefined) {
      props.setProperty(PROP_KEYS.PORTAL_ADMIN_SECRET, String(data.portal_admin_secret || '').trim());
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}

/**
 * ポータル API への接続テストを行う。
 * GET /api/tenants にアクセスして疎通を確認し、
 * 次に x-admin-secret ヘッダ付きで POST /api/admin/tenants に
 * 空ボディを送って認証を確認する（422が返れば認証OK）。
 * @param {Object} data { portal_api_url, portal_admin_secret }
 * @return {Object} { ok, reachable, authenticated, error }
 */
function adminTestPortalConnection(data) {
  try {
    var apiUrl = String(data.portal_api_url || '').trim();
    var secret = String(data.portal_admin_secret || '').trim();
    if (!apiUrl) return { ok: false, error: 'ポータル API URL を入力してください。' };

    // secret が空の場合、保存済みの値を使う
    if (!secret) {
      var props = PropertiesService.getScriptProperties();
      secret = String(props.getProperty(PROP_KEYS.PORTAL_ADMIN_SECRET) || '').trim();
    }
    if (!secret) return { ok: false, error: 'Admin Secret を入力してください（保存済みの値もありません）。' };

    // 1. 疎通確認: GET /api/tenants
    var reachable = false;
    try {
      var resp1 = UrlFetchApp.fetch(apiUrl.replace(/\/+$/, '') + '/api/tenants', {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
      });
      var code1 = resp1.getResponseCode();
      reachable = (code1 >= 200 && code1 < 500);
    } catch (e1) {
      return { ok: false, reachable: false, authenticated: false, error: 'ポータルに接続できません: ' + (e1.message || e1) };
    }

    if (!reachable) {
      return { ok: false, reachable: false, authenticated: false, error: 'ポータル API に到達できませんでした。URLを確認してください。' };
    }

    // 2. 認証確認: POST /api/admin/tenants（空ボディ → 401=認証NG, 422=認証OK(バリデーション), 201=OK）
    var authenticated = false;
    var authHint = '';
    try {
      var resp2 = UrlFetchApp.fetch(apiUrl.replace(/\/+$/, '') + '/api/admin/tenants', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        payload: JSON.stringify({}),
        muteHttpExceptions: true,
      });
      var code2 = resp2.getResponseCode();
      var body2 = resp2.getContentText();
      console.log('[adminTestPortalConnection] auth test: code=' + code2 + ' body=' + body2.substring(0, 300));
      // 401 = 認証失敗, それ以外（422等）= 認証は通った
      authenticated = (code2 !== 401);
      if (!authenticated) {
        try { var j = JSON.parse(body2); authHint = j.hint || ''; } catch(_) {}
      }
    } catch (e2) {
      return { ok: false, reachable: true, authenticated: false, error: '認証確認中にエラー: ' + (e2.message || e2) };
    }

    if (!authenticated) {
      var msg = 'Admin Secret が正しくありません（401 Unauthorized）。';
      if (authHint) {
        msg += '\n原因: ' + authHint;
      } else {
        msg += '\nVercel の ADMIN_SHARED_SECRET と一致しているか確認してください。';
      }
      return { ok: false, reachable: true, authenticated: false, error: msg };
    }

    // 接続成功 → 設定を保存（新しいsecretが入力された場合のみ更新）
    var saveData = { portal_api_url: apiUrl };
    if (String(data.portal_admin_secret || '').trim()) {
      saveData.portal_admin_secret = String(data.portal_admin_secret).trim();
    }
    adminSavePortalSettings(saveData);

    return { ok: true, reachable: true, authenticated: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}

/* ─────────────────────────────────────────
 * /copy URL 方式のヘルパー関数
 * ───────────────────────────────────────── */

/**
 * テンプレートSSの Google 公式コピーURLを返す。
 * setup.html で「テンプレをコピー」ボタン用に呼ばれる。
 * DriveApp も UrlFetchApp も不要 — ScriptProperties を読むだけ。
 */
function getTemplateCopyUrl() {
  var props = PropertiesService.getScriptProperties();
  var ssId = String(props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '').trim();
  // 指定されたテンプレートIDが未設定の場合のフォールバック（管理者がまだ設定していない場合に便利）
  // ここを更新すればテンプレートを切り替えられます。
  if (!ssId) {
    // フォールバック: ユーザー指定のテンプレートID
    ssId = '1hLNLYDjEyaq0DoKur69bnXQTFt0_NQrKXsVf-mcQ6AI';
    try {
      // 恒久的にこのテンプレートIDをスクリプトプロパティに保存しておく
      props.setProperty(PROP_KEYS.SPREADSHEET_ID, ssId);
    } catch (e) {
      // 保存に失敗しても継続（権限等の問題で例外が出る可能性あり）
      console.warn('Failed to persist template SS ID:', e && e.message ? e.message : e);
    }
  }
  return 'https://docs.google.com/spreadsheets/d/' + ssId + '/copy';
}

/**
 * ユーザーが /copy で作成したコピー先SSをレジストリに登録する。
 * setup.html Step 2 から呼ばれる。
 * @param {{ spreadsheet_id: string, spreadsheet_url: string }} payload
 */
function setupRegisterCopy(payload) {
  try {
    if (!payload || !payload.spreadsheet_id) {
      throw new Error('スプレッドシートIDが指定されていません。');
    }

    var ssId  = String(payload.spreadsheet_id).trim();
    var ssUrl = String(payload.spreadsheet_url || '').trim();
    if (!ssUrl) {
      ssUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit';
    }

    // ユーザーメールを取得
    var user = '';
    try { user = Session.getActiveUser().getEmail() || ''; } catch (_) {}
    if (!user) { try { user = Session.getEffectiveUser().getEmail() || ''; } catch (_) {} }
    if (!user) user = 'unknown';

    // ユーザーレジストリに登録
    var sh = getUserRegistry_();
    // 既存行を更新 or 新規追加
    var vals = sh.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0] || '').trim().toLowerCase() === user.trim().toLowerCase()) {
        // 既存ユーザー → SS情報を更新
        sh.getRange(i + 1, 2).setValue(ssId);
        sh.getRange(i + 1, 3).setValue(ssUrl);
        sh.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }
    if (!found) {
      sh.appendRow([user, ssId, ssUrl, new Date(), '', '', '']);
    }

    return {
      ok: true,
      spreadsheet_id: ssId,
      spreadsheet_url: ssUrl,
      message: '登録が完了しました。コピー先SSでデプロイを行ってください。',
    };
  } catch (e) {
    return {
      ok: false,
      error: (e && e.message) ? e.message : String(e),
    };
  }
}

/**
 * 旧 setupRunWizard — 後方互換ラッパー。
 * /copy URL 方式に移行したため、setupRegisterCopy に委譲する。
 */
function setupRunWizard(payload) {
  return setupRegisterCopy(payload);
}

/**
 * Apps Script API を使ってコピー先SSにスクリプトを複製し、Webアプリとしてデプロイする。
 * @param {string} copiedSSId コピー先スプレッドシートID
 * @param {string} projectName プロジェクト名
 * @return {string} デプロイされたWebアプリURL（失敗時は空文字列）
 */
function setupCopyScriptAndDeploy_(copiedSSId, projectName) {
  var token = ScriptApp.getOAuthToken();
  var headers = { 'Authorization': 'Bearer ' + token };
  var baseApi = 'https://script.googleapis.com/v1/projects/';
  var templateScriptId = ScriptApp.getScriptId();
  if (!templateScriptId) {
    try { templateScriptId = PropertiesService.getScriptProperties().getProperty(PROP_KEYS.TEMPLATE_SCRIPT_ID) || ''; } catch (_) { templateScriptId = ''; }
  }
  if (!templateScriptId) throw new Error('テンプレートのScript ID が取得できません。管理者がテンプレートスプレッドシートを一度開いてください。');

  // 1. テンプレートのソースファイルを取得
  console.log('setupCopyScriptAndDeploy_: fetching template script ' + templateScriptId);
  var srcResp = UrlFetchApp.fetch(baseApi + templateScriptId + '/content', {
    headers: headers,
    muteHttpExceptions: true
  });
  var srcCode = srcResp.getResponseCode();
  if (srcCode < 200 || srcCode >= 300) {
    var errBody = srcResp.getContentText().substring(0, 300);
    if (srcCode === 403 || errBody.indexOf('API has not been used') >= 0 || errBody.indexOf('accessNotConfigured') >= 0) {
      throw new Error('Apps Script API が有効になっていません。\\n\\n' +
        '【対処法】Google Cloud Console (https://console.cloud.google.com) で:\\n' +
        '1. このスクリプトに紐づく GCP プロジェクトを開く\\n' +
        '2. 「APIとサービス」→「ライブラリ」で「Apps Script API」を検索\\n' +
        '3. 「有効にする」をクリック\\n\\n' +
        'Response: ' + errBody);
    }
    throw new Error('テンプレート取得失敗 [' + srcCode + ']: ' + errBody);
  }
  var srcFiles = JSON.parse(srcResp.getContentText()).files || [];
  console.log('setupCopyScriptAndDeploy_: fetched ' + srcFiles.length + ' files from template');

  // 2. manifest (appsscript.json) を更新: webapp設定 + 必要なOAuthスコープを追加
  var manifestIdx = -1;
  for (var i = 0; i < srcFiles.length; i++) {
    if ((srcFiles[i].name || '').toLowerCase() === 'appsscript') { manifestIdx = i; break; }
  }
  
  var defaultManifest = {
    timeZone: Session.getScriptTimeZone() || 'Asia/Tokyo',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    webapp: { access: 'ANYONE', executeAs: 'USER_DEPLOYING' },
    oauthScopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/script.external_request',
      'https://www.googleapis.com/auth/script.send_mail',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  };
  
  if (manifestIdx >= 0) {
    try {
      var config = JSON.parse(srcFiles[manifestIdx].source || '{}');
      config.webapp = { access: 'ANYONE', executeAs: 'USER_DEPLOYING' };
      // 既存スコープがあればマージ、なければデフォルトを設定
      if (!config.oauthScopes || config.oauthScopes.length === 0) {
        config.oauthScopes = defaultManifest.oauthScopes;
      }
      if (!config.timeZone) config.timeZone = defaultManifest.timeZone;
      if (!config.runtimeVersion) config.runtimeVersion = 'V8';
      srcFiles[manifestIdx].source = JSON.stringify(config, null, 2);
    } catch (e) {
      srcFiles[manifestIdx].source = JSON.stringify(defaultManifest, null, 2);
    }
  } else {
    srcFiles.push({ name: 'appsscript', type: 'JSON', source: JSON.stringify(defaultManifest, null, 2) });
  }
  
  // ログ: コピーするファイル一覧
  console.log('setupCopyScriptAndDeploy_: copying ' + srcFiles.length + ' files: ' + srcFiles.map(function(f) { return f.name; }).join(', '));

  // 簡易検査: コピーするファイルの存在確認
  if (!srcFiles || srcFiles.length === 0) {
    throw new Error('テンプレートのソースファイルが見つかりません。');
  }

  // 3. コピー先SSにバインドされた新規プロジェクトを作成（リトライ）
  var newScriptId = null;
  var createErrs = [];
  for (var attempt = 0; attempt < 3; attempt++) {
    var createResp = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects', {
      method: 'post',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify({ title: projectName, parentId: copiedSSId }),
      muteHttpExceptions: true
    });
    var cc = createResp.getResponseCode();
    if (cc >= 200 && cc < 300) {
      newScriptId = JSON.parse(createResp.getContentText()).scriptId;
      break;
    }
    createErrs.push('[' + cc + '] ' + createResp.getContentText());
    Utilities.sleep(1200);
  }
  if (!newScriptId) {
    throw new Error('プロジェクト作成失敗（Apps Script API が有効か確認してください）: ' + createErrs.join(' | ').substring(0, 500));
  }
  console.log('setupCopyScriptAndDeploy_: created new script project: ' + newScriptId);

  // 4. ソースファイルをプッシュ（リトライ）
  var pushErrs = [];
  for (var attempt2 = 0; attempt2 < 3; attempt2++) {
    var pushResp = UrlFetchApp.fetch(baseApi + newScriptId + '/content', {
      method: 'put',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify({ files: srcFiles }),
      muteHttpExceptions: true
    });
    var pc = pushResp.getResponseCode();
    if (pc >= 200 && pc < 300) { break; }
    pushErrs.push('[' + pc + '] ' + pushResp.getContentText());
    Utilities.sleep(1200);
  }
  if (pushErrs.length === 3) {
    throw new Error('ソースプッシュ失敗: ' + pushErrs.join(' | ').substring(0, 500));
  }
  console.log('setupCopyScriptAndDeploy_: pushed ' + srcFiles.length + ' files to project ' + newScriptId);

  // 5. バージョンを作成
  var vResp = UrlFetchApp.fetch(baseApi + newScriptId + '/versions', {
    method: 'post',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({ description: '予約管理 自動デプロイ' }),
    muteHttpExceptions: true
  });
  if (vResp.getResponseCode() < 200 || vResp.getResponseCode() >= 300) {
    throw new Error('バージョン作成失敗: ' + vResp.getContentText().substring(0, 300));
  }
  var versionNumber = JSON.parse(vResp.getContentText()).versionNumber;
  console.log('setupCopyScriptAndDeploy_: created version ' + versionNumber);

  // 6. Webアプリとしてデプロイ
  var dResp = UrlFetchApp.fetch(baseApi + newScriptId + '/deployments', {
    method: 'post',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({
      versionNumber: versionNumber,
      description: '予約管理 自動デプロイ',
      manifestFileName: 'appsscript'
    }),
    muteHttpExceptions: true
  });
  if (dResp.getResponseCode() < 200 || dResp.getResponseCode() >= 300) {
    throw new Error('デプロイ失敗: ' + dResp.getContentText().substring(0, 300));
  }
  var deployData = JSON.parse(dResp.getContentText());
  var deploymentId = deployData.deploymentId || '';
  console.log('setupCopyScriptAndDeploy_: deployed as ' + deploymentId);

  // entryPoints から URL を取得
  if (deployData.entryPoints) {
    for (var j = 0; j < deployData.entryPoints.length; j++) {
      if (deployData.entryPoints[j].entryPointType === 'WEB_APP') {
        return deployData.entryPoints[j].url;
      }
    }
  }
  // fallback: URLを構築
  if (deploymentId) {
    return 'https://script.google.com/macros/s/' + deploymentId + '/exec';
  }
  return '';
}

/**
 * Apps Script API を使ってコピー先SSにスクリプトを複製（デプロイは行わない）
 * @param {string} copiedSSId
 * @param {string} projectName
 * @return {string} 新規作成されたスクリプトの scriptId
 */
function setupCopyScriptOnly_(copiedSSId, projectName) {
  var token = ScriptApp.getOAuthToken();
  var headers = { 'Authorization': 'Bearer ' + token };
  var baseApi = 'https://script.googleapis.com/v1/projects/';
  var templateScriptId = ScriptApp.getScriptId();
  if (!templateScriptId) {
    try { templateScriptId = PropertiesService.getScriptProperties().getProperty(PROP_KEYS.TEMPLATE_SCRIPT_ID) || ''; } catch (_) { templateScriptId = ''; }
  }
  if (!templateScriptId) throw new Error('テンプレートのScript ID が取得できません。管理者がテンプレートスプレッドシートを一度開いてください。');

  // テンプレートソース取得
  console.log('setupCopyScriptOnly_: fetching template ' + templateScriptId);
  var srcResp = UrlFetchApp.fetch(baseApi + templateScriptId + '/content', { headers: headers, muteHttpExceptions: true });
  var code = srcResp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('テンプレート取得失敗 [' + code + ']: ' + srcResp.getContentText().substring(0, 300));
  }
  var srcFiles = JSON.parse(srcResp.getContentText()).files || [];

  // manifest 保全 / 追加
  var manifestIdx = -1;
  for (var i = 0; i < srcFiles.length; i++) { if ((srcFiles[i].name || '').toLowerCase() === 'appsscript') { manifestIdx = i; break; } }
  var defaultManifest = { timeZone: Session.getScriptTimeZone() || 'Asia/Tokyo', dependencies: {}, exceptionLogging: 'STACKDRIVER', runtimeVersion: 'V8', webapp: { access: 'ANYONE', executeAs: 'USER_DEPLOYING' }, oauthScopes: ['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/script.external_request','https://www.googleapis.com/auth/script.send_mail','https://www.googleapis.com/auth/userinfo.email'] };
  // Ensure Drive scope included for template operations
  if (defaultManifest && Array.isArray(defaultManifest.oauthScopes)) {
    if (defaultManifest.oauthScopes.indexOf('https://www.googleapis.com/auth/drive') === -1) {
      defaultManifest.oauthScopes.unshift('https://www.googleapis.com/auth/drive');
    }
  }
  if (manifestIdx >= 0) {
    try { var cfg = JSON.parse(srcFiles[manifestIdx].source || '{}'); cfg.webapp = cfg.webapp || defaultManifest.webapp; cfg.oauthScopes = cfg.oauthScopes && cfg.oauthScopes.length ? cfg.oauthScopes : defaultManifest.oauthScopes; srcFiles[manifestIdx].source = JSON.stringify(cfg, null, 2); } catch (e) { srcFiles[manifestIdx].source = JSON.stringify(defaultManifest, null, 2); }
  } else {
    srcFiles.push({ name: 'appsscript', type: 'JSON', source: JSON.stringify(defaultManifest, null, 2) });
  }

  if (!srcFiles || srcFiles.length === 0) throw new Error('テンプレートのソースファイルが見つかりません。');

  // 新規プロジェクト作成（バインド）
  var newScriptId = null;
  var errs = [];
  for (var attempt = 0; attempt < 3; attempt++) {
    var createResp = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects', { method: 'post', headers: headers, contentType: 'application/json', payload: JSON.stringify({ title: projectName, parentId: copiedSSId }), muteHttpExceptions: true });
    var cc = createResp.getResponseCode();
    if (cc >= 200 && cc < 300) { newScriptId = JSON.parse(createResp.getContentText()).scriptId; break; }
    errs.push('[' + cc + '] ' + createResp.getContentText());
    Utilities.sleep(900);
  }
  if (!newScriptId) throw new Error('プロジェクト作成失敗: ' + errs.join(' | ').substring(0, 600));

  // ソースプッシュ
  var pushErrs = [];
  for (var a = 0; a < 3; a++) {
    var pushResp = UrlFetchApp.fetch(baseApi + newScriptId + '/content', { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify({ files: srcFiles }), muteHttpExceptions: true });
    var pc = pushResp.getResponseCode();
    if (pc >= 200 && pc < 300) break;
    pushErrs.push('[' + pc + '] ' + pushResp.getContentText());
    Utilities.sleep(900);
  }
  if (pushErrs.length === 3) throw new Error('ソースプッシュ失敗: ' + pushErrs.join(' | ').substring(0, 600));

  console.log('setupCopyScriptOnly_: created script ' + newScriptId);
  return newScriptId;
}

/** コピー先のスプレッドシートにシート/ヘッダ/ガイドを初期化 */
function setupInitializeSpreadsheet_(ss) {
  if (!ss) return;

  // 必要シートとヘッダ
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_BOOKINGS, [
    'booking_id', 'created_at', 'status',
    'service_id', 'service_name',
    'customer_name', 'customer_email',
    'start_iso', 'end_iso',
    'answers_json', 'event_id', 'cancel_token'
  ]);
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_AVAILABILITIES, [
    'availability_id', 'service_id', 'title', 'start_iso', 'end_iso', 'capacity', 'status', 'source', 'updated_at'
  ]);
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_EVENTS, [
    'event_id', 'source', 'status', 'title', 'service_id', 'start_iso', 'end_iso',
    'location', 'description', 'capacity', 'booking_id', 'updated_at', 'last_synced_at'
  ]);

  // 使い方ガイド
  setupEnsureGuideSheet_(ss);

  // 初期のSheet1を削除（空テンプレートコピー時のゴミ）
  try {
    const sh1 = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
    if (sh1 && ss.getSheets().length > 1) ss.deleteSheet(sh1);
  } catch (_) {}
}

function extractSpreadsheetId_(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const m = s.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m && m[1]) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}

function setupEnsureDefaults_() {
  const props = PropertiesService.getScriptProperties();
  const setIfEmpty = (k, v) => {
    if (!props.getProperty(k) && v !== undefined && v !== null) props.setProperty(k, String(v).trim());
  };
  setIfEmpty(PROP_KEYS.CALENDAR_ID, CFG_DEFAULT.CALENDAR_ID);
  setIfEmpty(PROP_KEYS.HORIZON_DAYS, CFG_DEFAULT.HORIZON_DAYS);
  setIfEmpty(PROP_KEYS.MIN_LEAD_MIN, CFG_DEFAULT.MIN_LEAD_MIN);
  setIfEmpty(PROP_KEYS.NOTIFY_OWNER_EMAIL, CFG_DEFAULT.NOTIFY_OWNER_EMAIL);
  setIfEmpty(PROP_KEYS.EVENT_SYNC_DAYS, CFG_DEFAULT.EVENT_SYNC_DAYS);
  const url = String(ScriptApp.getService().getUrl() || '').trim();
  if (url) {
    setIfEmpty(PROP_KEYS.PUBLIC_WEBAPP_URL, url);
    setIfEmpty(PROP_KEYS.ADMIN_WEBAPP_URL, url);
  }
}

function setupEnsureGuideSheet_(ss) {
  const target = ss || tryGetSS_();
  if (!target) return;
  const name = '使い方ガイド';
  let sh = target.getSheetByName(name);
  if (!sh) sh = target.insertSheet(name);

  const values = sh.getDataRange().getValues();
  if (values.length > 1) return;

  const lines = [
    ['予約管理 使い方ガイド'],
    [''],
    ['■ セットアップ完了後の手順'],
    ['1. このスプレッドシートを開いた状態で「拡張機能 > Apps Script」を開く'],
    ['2. 左上の「デプロイ > 新しいデプロイ」をクリック'],
    ['3. 種類の歯車アイコンで「ウェブアプリ」を選択'],
    ['4. 実行するユーザー:「自分」/ アクセスできるユーザー:「全員」を選択'],
    ['5. 「デプロイ」ボタンを押す → 表示されるURLがあなたの予約ページです'],
    [''],
    ['■ 予約枠の作成'],
    ['・管理画面（URL?admin=1）から Events を追加します。'],
    ['・カレンダーから取り込む場合は「カレンダーから取り込む」を実行します。'],
    [''],
    ['■ 予約の受付'],
    ['・公開ページ（デプロイURL）から予約を受け付けます。'],
    ['・予約が入ると Bookings シートに記録されます。'],
    [''],
    ['■ キャンセル対応'],
    ['・予約完了メールにあるキャンセルリンクから利用者がキャンセルできます。'],
    [''],
    ['■ カスタムメニュー'],
    ['・スプレッドシートの「予約管理」メニューから同期/URL表示が可能です。'],
    ['・メニューが表示されない場合はページをリロードしてください。'],
  ];
  sh.getRange(1, 1, lines.length, 1).setValues(lines);
  sh.setColumnWidth(1, 600);
  // タイトル行を太字に
  try { sh.getRange(1, 1).setFontWeight('bold').setFontSize(14); } catch (_) {}
}

function setupEnsureTimeDrivenTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction && t.getHandlerFunction() === 'timeDrivenSyncEvents_');
  if (exists) return;
  ScriptApp.newTrigger('timeDrivenSyncEvents_').timeBased().everyHours(1).create();
}

/** Time-driven trigger: keep Events in sync with Calendar
 * NOTE: assertAdminContext_ is bypassed here because this runs as a trigger, not from admin UI */
function timeDrivenSyncEvents_() {
  try {
    ensureBaseSheets_();
    const cfg = getRuntimeConfig_();
    const calId = cfg.CALENDAR_ID || 'primary';
    let cal;
    try { cal = CalendarApp.getCalendarById(calId); } catch (_) { cal = null; }
    if (!cal) { console.warn('timeDrivenSyncEvents_: calendar not found', calId); return; }
    const now = new Date();
    const days = Number(cfg.EVENT_SYNC_DAYS || 30);
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const events = cal.getEvents(from, to);
    for (const ev of events) {
      upsertEventToEventsSheet_(ev, { source: 'calendar', status: 'freebusy', booking_id: '' });
    }
  } catch (err) {
    console.warn('timeDrivenSyncEvents_ failed', err);
  }
}

/** 管理者用: 全ユーザーリストを取得 */
function adminListUsers() {
  assertAdminContext_();
  const sh = getUserRegistry_();
  const vals = sh.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < vals.length; i++) {
    users.push({ email: String(vals[i][0] || ''), spreadsheet_id: String(vals[i][1] || ''), created_at: vals[i][3] || '' });
  }
  return { ok: true, users: users };
}

// Services feature removed. Admin service operations have been deleted.

/** Admin: create a single Event row (simple helper for modal) */
function adminCreateEvent(evt) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!evt) throw new Error('event required');

  const cfg = getRuntimeConfig_();
  const ss = getSS_();
  const sh = ss.getSheetByName(cfg.SHEET_EVENTS);
  if (!sh) throw new Error('Events sheet not found');

  const vals = sh.getDataRange().getValues();
  const header = vals[0] || [];
  const idx = (n) => headerIndex_(header, n);

  const eventId = String(evt.event_id || ('m_' + Utilities.getUuid())).trim();
  const source = String(evt.source || 'manual');
  const status = String(evt.status || 'available');
  const title = String(evt.title || '').trim();
  const service_id = String(evt.service_id || '').trim();
  // normalize start/end to local ISO format
  const tz = cfg.TZ;
  let start_iso = String(evt.start_iso || '').trim();
  let end_iso = String(evt.end_iso || '').trim();
  try {
    if (start_iso) {
      const sd = parseLocalIso_(start_iso.replace(/\s+/g, 'T'));
      if (!isNaN(sd.getTime())) start_iso = toLocalIso_(sd, tz);
    }
    if (end_iso) {
      const ed = parseLocalIso_(end_iso.replace(/\s+/g, 'T'));
      if (!isNaN(ed.getTime())) end_iso = toLocalIso_(ed, tz);
    }
  } catch (_) {}
  const durationMin = Number(evt.duration_min || evt.duration || 60);
  const description = String(evt.description || '').trim();
  const capacity = evt.capacity !== undefined ? Number(evt.capacity) : '';

  // compute end_iso if not provided
  try {
    if (!end_iso && start_iso) {
      const sd = parseLocalIso_(start_iso.replace(/\s+/g, 'T'));
      const ed = new Date(sd.getTime() + (durationMin || 60) * 60 * 1000);
      if (!isNaN(ed.getTime())) end_iso = toLocalIso_(ed, tz);
    }
  } catch (e) { /* ignore */ }

  // build row according to header order
  const row = header.map(h => {
    if (h === 'event_id') return eventId;
    if (h === 'source') return source;
    if (h === 'status') return status;
    if (h === 'title') return title;
    if (h === 'service_id') return service_id;
    if (h === 'start_iso') return start_iso;
    if (h === 'end_iso') return end_iso;
    if (h === 'location') return '';
    if (h === 'description') return description;
    if (h === 'capacity') return capacity;
    if (h === 'booking_id') return '';
    if (h === 'updated_at') return new Date();
    if (h === 'last_synced_at') return '';
    return '';
  });

  try {
    sh.appendRow(row);
  } catch (err) {
    throw new Error('failed to append event: ' + String(err && err.message ? err.message : err));
  }

  // upsert availability derived from this event (best-effort)
  try {
    const evtObj = { event_id: eventId, status: status, title: title, service_id: service_id, start_iso: start_iso, end_iso: end_iso, capacity: capacity, source: source };
    if (typeof upsertAvailabilityFromEvent_ === 'function') {
      try { upsertAvailabilityFromEvent_(evtObj); } catch (_) {}
    }
  } catch (_) {}

  return { ok: true, event_id: eventId };
}

/** Admin: ensure Services exist for Events (batch)
 * - For each Events row, if `service_id` exists -> ensure service
 * - If `service_id` is empty but title present -> generate service_id from title, create service and write back to Events
 */
  // upsert availability derived from this event (best-effort)

function adminListBookings(limit) {
  assertAdminContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const ss = getSS_();
  const resolved = resolveBookingsSheetData_(ss, cfg.SHEET_BOOKINGS);
  if (!resolved || !resolved.header || !resolved.rows || resolved.rows.length === 0) return [];

  const header = resolved.header;
  const rows = resolved.rows.slice();

  // use tolerant header lookup helper
  const iCreated = headerIndex_(header, 'created_at');
  rows.sort((a, b) => {
    try {
      const aVal = iCreated >= 0 ? a[iCreated] : a[0];
      const bVal = iCreated >= 0 ? b[iCreated] : b[0];
      const da = aVal instanceof Date ? aVal : new Date(String(aVal || ''));
      const db = bVal instanceof Date ? bVal : new Date(String(bVal || ''));
      return db.getTime() - da.getTime();
    } catch (e) {
      return 0;
    }
  });

  const max = Math.max(1, Math.min(Number(limit || 200), 2000));
  return rows.slice(0, max).map(r => {
    const obj = {};
    header.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

/** Admin: raw preview of Bookings sheet for debugging (header + last N rows) */
function adminListBookingsRaw(limit) {
  assertAdminContext_();
  ensureBaseSheets_();
  const cfg = getRuntimeConfig_();
  const ss = getSS_();
  const resolved = resolveBookingsSheetData_(ss, cfg.SHEET_BOOKINGS);
  if (!resolved) return { ok: false, error: 'Bookings sheet not found' };
  const header = (resolved.header || []).map(c => (c === undefined ? '' : String(c)));
  const n = Math.max(1, Number(limit || 20));
  const rows = (resolved.rows || []).slice(Math.max(0, (resolved.rows || []).length - n)).map(r => r.map(c => (c === undefined ? '' : String(c))));
  return {
    ok: true,
    sheet: resolved.sheetName || cfg.SHEET_BOOKINGS,
    headerRow: resolved.headerRow,
    header: header,
    rows: rows,
    count: Number(resolved.count || 0)
  };
}

/** Resolve Bookings sheet even if name differs or header row is not the first row */
function resolveBookingsSheetData_(ss, preferredName) {
  if (!ss) return null;
  const sheets = ss.getSheets();
  if (!sheets || sheets.length === 0) return null;

  const preferred = preferredName && String(preferredName).trim() ? String(preferredName).trim() : 'Bookings';

  // 1) Try preferred sheet name first
  const primary = ss.getSheetByName(preferred);
  const primaryResolved = primary ? detectBookingsDataFromSheet_(primary) : null;
  if (primaryResolved && primaryResolved.rows && primaryResolved.rows.length > 0) return primaryResolved;

  // 2) Scan other sheets for matching headers
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    if (!sh) continue;
    if (primary && sh.getName() === primary.getName()) continue;
    const res = detectBookingsDataFromSheet_(sh);
    if (res && res.rows && res.rows.length > 0) return res;
  }

  // 3) If nothing has rows, return primary even if empty (for debug visibility)
  if (primaryResolved) return primaryResolved;
  return null;
}

/** Detect bookings header/rows within a sheet. Returns header/rows/count with headerRow index. */
function detectBookingsDataFromSheet_(sh) {
  try {
    const vals = sh.getDataRange().getValues();
    if (!vals || vals.length === 0) return { sheetName: sh.getName(), header: [], rows: [], count: 0, headerRow: -1 };

    const maxScan = Math.min(10, vals.length);
    const keys = ['booking_id','created_at','status','service_name','customer_name','customer_email','start_iso','end_iso','event_id','cancel_token'];

    let headerRow = -1;
    let header = [];

    for (let r = 0; r < maxScan; r++) {
      const row = vals[r] || [];
      const rowStr = row.map(c => String(c || '').trim());
      let hit = 0;
      for (let k = 0; k < keys.length; k++) {
        if (headerIndex_(rowStr, keys[k]) >= 0) hit++;
      }
      // require at least 3 booking-like headers
      if (hit >= 3) {
        headerRow = r;
        header = rowStr;
        break;
      }
    }

    if (headerRow < 0) {
      // fallback to first row as header
      headerRow = 0;
      header = (vals[0] || []).map(c => String(c || '').trim());
    }

    const rows = vals.slice(headerRow + 1);
    return {
      sheetName: sh.getName(),
      headerRow: headerRow + 1,
      header: header,
      rows: rows,
      count: Math.max(0, rows.length)
    };
  } catch (e) {
    return { sheetName: sh ? sh.getName() : '', header: [], rows: [], count: 0, headerRow: -1 };
  }
}

/** Admin: get a single booking by booking_id */
function adminGetBookingById(bookingId) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!bookingId) return null;
  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  if (!sh) return null;
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return null;
  const header = vals[0];
  const bi = (name) => headerIndex_(header, name);
  const iBooking = bi('booking_id');
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const id = iBooking >= 0 ? String(row[iBooking] || '') : '';
    if (!id) continue;
    if (String(id) === String(bookingId)) {
      const obj = {};
      header.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }
  }
  return null;
}

/** Admin: find a booking by customer name and start_iso (best-effort match) */
function adminGetBookingByNameAndStart(name, startIso) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!name) return null;
  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  if (!sh) return null;
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return null;
  const header = vals[0];
  const biName = headerIndex_(header, 'customer_name');
  let biStart = headerIndex_(header, 'start_iso');
  if (biStart < 0) biStart = inferDateColumn_(vals, 10);
  const needle = String(name || '').trim().toLowerCase();
  const want = String(startIso || '').trim();
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const candidateName = biName >= 0 ? String(row[biName] || '').trim().toLowerCase() : '';
    if (!candidateName) continue;
    if (candidateName !== needle) continue;
    // compare start times (best-effort)
    let rowStart = '';
    if (biStart >= 0) {
      const raw = row[biStart];
      if (raw instanceof Date) rowStart = toLocalIso_(raw, getRuntimeConfig_().TZ);
      else rowStart = String(raw || '').trim();
    }
    if (!want || !rowStart || rowStart.indexOf(want) === 0 || String(rowStart).trim() === String(want).trim()) {
      const obj = {};
      header.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }
  }
  return null;
}

function adminCancelBookingById(bookingId) {
  assertAdminContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'no bookings' };

  const header = values[0];
  const idx = (name) => headerIndex_(header, name);

  const iId = idx('booking_id');
  const iStatus = idx('status');
  const iEvent = idx('event_id');
  let iStart = idx('start_iso');
  if (iStart < 0) iStart = inferDateColumn_(values, 10);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (String(row[iId]) !== String(bookingId)) continue;

    if (String(row[iStatus]) !== 'confirmed') {
      return { ok: false, error: 'already canceled or invalid status' };
    }

    const eventId = String(row[iEvent] || '');
    let startIso = '';
    if (iStart >= 0) {
      const rawStart = row[iStart];
      if (rawStart instanceof Date) startIso = toLocalIso_(rawStart, cfg.TZ);
      else startIso = String(rawStart || '').trim();
    }

    sh.getRange(r + 1, iStatus + 1).setValue('canceled');
    updateEventAvailabilityAfterCancel_(eventId, startIso);

    // invalidate caches for admin cancel path as well
    try {
      const cfg = getRuntimeConfig_();
      const tz = cfg.TZ;
      const now2 = new Date();
      const rangeStart = new Date(now2.getTime() + cfg.MIN_LEAD_MIN * 60 * 1000);
      const rangeEnd = addDays_(startOfDay_(rangeStart, tz), cfg.HORIZON_DAYS + 1);
      cacheRemove_('slots:' + toLocalIso_(rangeStart, tz) + '|' + toLocalIso_(rangeEnd, tz));
      cacheRemove_('slots:' + toLocalIso_(startOfDay_(new Date(), tz), tz) + '|' + toLocalIso_(addDays_(startOfDay_(new Date(), tz), cfg.HORIZON_DAYS + 1), tz));
    } catch (_) {}
    try { deleteCalendarEventSafely_(cfg.CALENDAR_ID || '', '', bookingId); } catch (_) {}

    return { ok: true };
  }
  return { ok: false, error: 'not found' };
}

/** 管理画面：Eventsシート一覧 */
function adminListEvents(limit) {
  assertAdminContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_EVENTS);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0];
  const rows = values.slice(1);

  // updated_at desc
  const iUpdated = header.indexOf('updated_at');
  rows.sort((a, b) => new Date(b[iUpdated]).getTime() - new Date(a[iUpdated]).getTime());

  const max = Math.max(1, Math.min(Number(limit || 200), 5000));
  return rows.slice(0, max).map(r => {
    const obj = {};
    header.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

// adminListEventsInRange: replaced by adminListEventsInRangeWithBookings_ which
// merges Events + Bookings and provides customer_name/booking_id in returned objects.

/**
 * 管理画面向け: Events と Bookings をマージして返すバージョン
 * - Events に booking_id がある場合は該当 booking の顧客名でタイトルを拡張します
 * - 確定済みの Bookings (status === 'confirmed') が Events に紐づかない場合は booking レコードとして別途追加します
 */
function adminListEventsInRange(startIso, endIso) {
  // backward-compatible wrapper kept for other callers
  return adminListEventsInRangeWithBookings_(startIso, endIso);
}

function adminListEventsInRangeWithBookings_(startIso, endIso) {
  assertAdminContext_();
  ensureBaseSheets_();
  const cfg = getRuntimeConfig_();
  const tz = cfg.TZ;
  const start = parseLocalIso_(String(startIso || ''));
  const end = parseLocalIso_(String(endIso || ''));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('invalid range');

  const sh = getSS_().getSheetByName(cfg.SHEET_EVENTS);
  const outMap = {}; // eventId -> event obj
  const out = [];
  if (sh) {
    const values = sh.getDataRange().getValues();
    if (values.length >= 2) {
      const header = values[0];
      const idx = (name) => header.indexOf(name);
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const rawStart = row[idx('start_iso')];
        let sd = null;
        if (rawStart instanceof Date) sd = rawStart;
        else {
          const s = String(rawStart || '').trim();
          if (!s) continue;
          sd = parseLocalIso_(s);
        }
        if (isNaN(sd.getTime())) continue;
        let ed = null;
        const rawEnd = row[idx('end_iso')];
        if (rawEnd instanceof Date) ed = rawEnd;
        else {
          const eStr = String(rawEnd || '').trim();
          ed = eStr ? parseLocalIso_(eStr) : new Date(sd.getTime() + 60*60*1000);
        }
        if (sd.getTime() <= end.getTime() && ed.getTime() >= start.getTime()) {
          const evId = String(row[idx('event_id')] || ('s_' + Utilities.getUuid())).trim();
          const obj = {
            id: evId,
            title: String(row[idx('title')] || ''),
            service_id: String(row[idx('service_id')] || ''),
            status: String(row[idx('status')] || ''),
            source: String(row[idx('source')] || 'sheet'),
            start_iso: toLocalIso_(sd, tz),
            end_iso: toLocalIso_(ed, tz),
            capacity: row[idx('capacity')],
            booking_id: String(row[idx('booking_id')] || ''),
            description: String(row[idx('description')] || ''),
          };
          out.push(obj);
          outMap[obj.id] = obj;
        }
      }
    }
  }

  // merge bookings: include confirmed bookings; if linked to event, augment title with customer name
  const bsh = getSS_().getSheetByName(cfg.SHEET_BOOKINGS);
  if (bsh) {
    const bvals = bsh.getDataRange().getValues();
    if (bvals.length >= 2) {
      const bheader = bvals[0];
      const bi = (name) => bheader.indexOf(name);
      for (let r = 1; r < bvals.length; r++) {
        const brow = bvals[r];
        const rawStatus = bi('status') >= 0 ? String(brow[bi('status')] || '').trim() : '';
        const status = rawStatus || 'confirmed';
        // parse start/end
        let bStart = null; let bEnd = null;
        const rawBStart = bi('start_iso') >= 0 ? brow[bi('start_iso')] : '';
        if (rawBStart instanceof Date) bStart = rawBStart; else { const s = String(rawBStart || '').trim(); if (s) bStart = parseLocalIso_(s); }
        if (!bStart || isNaN(bStart.getTime())) continue;
        const rawBEnd = bi('end_iso') >= 0 ? brow[bi('end_iso')] : ''; if (rawBEnd instanceof Date) bEnd = rawBEnd; else { const es = String(rawBEnd || '').trim(); bEnd = es ? parseLocalIso_(es) : new Date(bStart.getTime() + 60*60*1000); }
        if (bStart.getTime() > end.getTime() || bEnd.getTime() < start.getTime()) continue;

        const bookingId = bi('booking_id') >= 0 ? String(brow[bi('booking_id')] || '') : ('b_' + Utilities.getUuid());
        const eventId = bi('event_id') >= 0 ? String(brow[bi('event_id')] || '').trim() : '';
        const customerName = bi('customer_name') >= 0 ? String(brow[bi('customer_name')] || '') : '';
        const customerEmail = bi('customer_email') >= 0 ? String(brow[bi('customer_email')] || '') : '';
        const serviceName = bi('service_name') >= 0 ? String(brow[bi('service_name')] || '') : '';
        let answersJson = bi('answers_json') >= 0 ? String(brow[bi('answers_json')] || '') : '';
        if (!answersJson && bi('answers') >= 0) answersJson = String(brow[bi('answers')] || '');

        if (eventId && outMap[eventId]) {
          // augment existing event
          const ev = outMap[eventId];
          // Do NOT expose customer name in title when booking is canceled.
          const isCanceled = (String(status || '').toLowerCase().indexOf('cancel') >= 0);
          const base = ev.title || serviceName || '';
          // Avoid double-prepending customer name when Events.title already contains it.
          const namePrefix = customerName ? String(customerName) + ' — ' : '';
          if (!isCanceled && customerName && base && base.indexOf(namePrefix) === 0) {
            // already prefixed, keep as-is
            ev.title = base;
          } else {
            ev.title = (!isCanceled && customerName) ? `${customerName} — ${base}` : (base || (isCanceled ? '' : customerName) || '予約');
          }
          ev.status = status || ev.status;
          ev.customer_name = isCanceled ? '' : customerName;
          ev.customer_email = customerEmail;
          ev.booking_id = bookingId;
          ev.answers_json = answersJson;
        } else {
          // add booking as its own representation
          const isCanceled = (String(status || '').toLowerCase().indexOf('cancel') >= 0);
          const obj = {
            id: bookingId || ('b_' + Utilities.getUuid()),
            title: (!isCanceled && customerName) ? `${customerName} — ${serviceName || ''}`.trim() : (serviceName || '予約'),
            service_id: '',
            status,
            source: 'booking',
            start_iso: toLocalIso_(bStart, tz),
            end_iso: toLocalIso_(bEnd, tz),
            capacity: '',
            booking_id: bookingId,
            description: answersJson,
            answers_json: answersJson,
            customer_name: isCanceled ? '' : customerName,
            customer_email: customerEmail,
          };
          out.push(obj);
        }
      }
    }
  }

  out.sort((a,b) => String(a.start_iso||'').localeCompare(String(b.start_iso||'')));
  return { ok: true, events: out };
}

/** 管理画面：Events を編集/上書き（UIからの書き込み） */
function adminUpsertEvent(evt) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!evt || !evt.event_id) throw new Error('event_id required');

  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_EVENTS);
  const values = sh.getDataRange().getValues();
  if (values.length < 1) throw new Error('Events sheet missing');

  const header = values[0];
  const idx = (name) => headerIndex_(header, name);

  const rowArr = [];
  // Build row in header order
  header.forEach(h => {
    const key = String(h || '');
    if (key === 'event_id') rowArr.push(String(evt.event_id || ''));
    else if (key === 'source') rowArr.push(String(evt.source || 'manual'));
    else if (key === 'status') rowArr.push(String(evt.status || 'freebusy'));
    else if (key === 'title') rowArr.push(String(evt.title || ''));
    else if (key === 'service_id') rowArr.push(String(evt.service_id || ''));
    else if (key === 'start_iso') {
      // normalize start_iso when writing
      let s = String(evt.start_iso || '').trim();
      try {
        if (s) {
          s = toLocalIso_(parseLocalIso_(s.replace(/\s+/g,'T')), getRuntimeConfig_().TZ);
        }
      } catch (_) {}
      rowArr.push(s || '');
    }
    else if (key === 'end_iso') {
      let e = String(evt.end_iso || '').trim();
      try {
        if (e) {
          e = toLocalIso_(parseLocalIso_(e.replace(/\s+/g,'T')), getRuntimeConfig_().TZ);
        }
      } catch (_) {}
      rowArr.push(e || '');
    }
    else if (key === 'location') rowArr.push(String(evt.location || ''));
    else if (key === 'description') rowArr.push(String(evt.description || ''));
    else if (key === 'booking_id') rowArr.push(String(evt.booking_id || ''));
    else if (key === 'updated_at') rowArr.push(new Date());
    else if (key === 'last_synced_at') rowArr.push(new Date());
    else rowArr.push(String(evt[key] || ''));
  });

  const iEventId = idx('event_id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iEventId]) === String(evt.event_id)) {
      sh.getRange(r + 1, 1, 1, rowArr.length).setValues([rowArr]);
      // sync to Availabilities if needed
      try { if (String(evt.status || '').trim() === 'available') { upsertAvailabilityFromEvent_(evt); } else { archiveAvailabilityForEvent_(evt.event_id); } } catch (_) {}
      return { ok: true, mode: 'update' };
    }
  }
  sh.appendRow(rowArr);
  // sync for inserted events
  try { if (String(evt.status || '').trim() === 'available') upsertAvailabilityFromEvent_(evt); } catch (_) {}
  return { ok: true, mode: 'insert' };
}

/** 管理画面：Events を削除（UIからの操作） */
function adminDeleteEvent(eventId) {
  assertAdminContext_();
  ensureBaseSheets_();
  if (!eventId) throw new Error('eventId required');

  const cfg = getRuntimeConfig_();
  const sh = getSS_().getSheetByName(cfg.SHEET_EVENTS);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'no events' };

  const header = values[0];
  const iEventId = header.indexOf('event_id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iEventId]) === String(eventId)) {
      sh.deleteRow(r + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

/** 管理画面：フォームから複数イベントを生成して Events シートに保存する
 * pattern: { title, start_date(YYYY-MM-DD), start_time(HH:MM), duration_min, recurrence('none'|'weekly'|'biweekly'), weekdays: [1..7], occurrences, end_date(YYYY-MM-DD), status, source, booking_id, description }
 */
function adminCreateEventsFromPattern(pattern) {
  assertAdminContext_();
  ensureEventsSheet_();

  if (!pattern || !pattern.title) throw new Error('title required');

  const maxCreate = 500; // safety cap
  const rows = generateEventRowsFromPattern_(pattern, maxCreate);
  if (!rows || rows.length === 0) return { ok: true, created: 0 };

  const sh = getSS_().getSheetByName(CFG_DEFAULT.SHEET_EVENTS);
  const header = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const idx = (name) => header.indexOf(name);

  let created = 0;
  for (const row of rows) {
    sh.appendRow(row);
    created++;
    try {
      const eventId = row[idx('event_id')];
      const ev = {
        event_id: eventId,
        title: row[idx('title')],
        service_id: row[idx('service_id')],
        start_iso: row[idx('start_iso')],
        end_iso: row[idx('end_iso')],
        capacity: row[idx('capacity')],
        status: (pattern && pattern.status) ? pattern.status : 'available',
        source: (pattern && pattern.source) ? pattern.source : 'manual'
      };
      try { upsertAvailabilityFromEvent_(ev); } catch (_) {}
    } catch (e) {
      // ignore per-row errors but continue
    }
  }
  return { ok: true, created: created };
}

/** 管理画面：指定期間のGoogleカレンダー情報を返す（読み取りのみ）
 * startIso, endIso are local ISO like '2026-02-01T00:00'
 * returns { ok: true, events: [ { id, title, start_iso, end_iso, source, status, booking_id, description } ] }
 */
function adminGetCalendar(startIso, endIso, calendarId) {
  assertAdminContext_();
  ensureBaseSheets_();

  const cfg = getRuntimeConfig_();
  const tz = cfg.TZ;
  const start = parseLocalIso_(String(startIso || ''));
  const end = parseLocalIso_(String(endIso || ''));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('invalid range');

  const res = [];

  try {
    const calId = (calendarId && String(calendarId).trim()) ? String(calendarId).trim() : (cfg.CALENDAR_ID || getAppCalendarId_());
    if (!calId) return { ok: false, error: 'calendar id not set', events: [] };
    const cal = CalendarApp.getCalendarById(calId);
    const evs = cal.getEvents(start, end);
    for (const ev of evs) {
      res.push({
        id: ev.getId ? ev.getId() : ('c_' + Utilities.getUuid()),
        title: ev.getTitle ? ev.getTitle() : '',
        start_iso: toLocalIso_(ev.getStartTime(), tz),
        end_iso: toLocalIso_(ev.getEndTime(), tz),
        source: 'calendar',
        status: 'calendar',
        booking_id: '',
        description: ev.getDescription ? (ev.getDescription() || '') : '',
      });
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err), events: [] };
  }

  return { ok: true, events: res };
}

/** helper: build event rows (array of array) matching Events header order */
function generateEventRowsFromPattern_(p, maxCreate) {
  const tz = getRuntimeConfig_().TZ;
  const sheet = ensureEventsSheet_();
  const header = sheet.getRange(1,1,1, sheet.getLastColumn()).getValues()[0];
  const idx = (name) => header.indexOf(name);

  // parse start datetime
  const startDate = String(p.start_date || '').trim();
  const startTime = String(p.start_time || '').trim();
  if (!startDate) throw new Error('start_date required');
  if (!startTime) throw new Error('start_time required');

  const dtStr = `${startDate}T${startTime}`;
  const first = new Date(dtStr);
  if (isNaN(first.getTime())) throw new Error('invalid start date/time');

  const durMin = Number(p.duration_min) || 60;

  // recurrence
  const recur = String(p.recurrence || 'none');
  const weekdays = (p.weekdays || []).map(Number).filter(Boolean); // ISO weekdays 1..7

  const occurrences = Number(p.occurrences) || 0;
  const endDateStr = p.end_date ? String(p.end_date).trim() : '';
  const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

  const rows = [];
  let date = first;
  let created = 0;

  function makeRow(dt) {
    const eventId = 'm_' + Utilities.getUuid();
    const startIso = toLocalIso_(dt, tz);
    const endIso = toLocalIso_(new Date(dt.getTime() + durMin * 60 * 1000), tz);

    const rowObj = {};
    header.forEach(h => { rowObj[h] = ''; });
    rowObj['event_id'] = eventId;
    rowObj['source'] = p.source || 'manual';
    rowObj['status'] = p.status || 'freebusy';
    rowObj['title'] = p.title || '';
    rowObj['service_id'] = p.service_id || '';
    rowObj['start_iso'] = startIso;
    rowObj['end_iso'] = endIso;
    rowObj['location'] = p.location || '';
    rowObj['description'] = p.description || '';
    rowObj['capacity'] = p.capacity || '';
    rowObj['booking_id'] = p.booking_id || '';
    rowObj['updated_at'] = new Date();
    rowObj['last_synced_at'] = '';

    // convert to ordered array
    const out = header.map(h => rowObj[h] === undefined ? '' : rowObj[h]);
    return out;
  }

  if (recur === 'none') {
    rows.push(makeRow(first));
    return rows;
  }

  // for weekly/biweekly, iterate forward until occurrences or endDate or cap
  const stepDays = (recur === 'biweekly') ? 14 : 7;
  // if weekdays specified, generate for upcoming range starting from first up to cap
  const maxLoop = Math.max(1, Number(occurrences) || 365);

  // We'll iterate day by day until conditions met, but stop at reasonable cap
  let loopCount = 0;
  let current = new Date(first.getTime());
  while (created < maxCreate && loopCount < 2000) {
    loopCount++;
    // if weekdays specified, check weekday match and also check recurrence period
    const w = isoWeekday_(current, tz);
    if (weekdays.length === 0 || weekdays.indexOf(w) !== -1) {
      // ensure not before first
      if (current.getTime() >= first.getTime()) {
        rows.push(makeRow(new Date(current.getTime())));
        created++;
        if (occurrences && created >= occurrences) break;
        if (endDate && current.getTime() > endDate.getTime()) break;
        if (created >= maxCreate) break;
      }
    }

    // advance by 1 day; if recurrence is weekly/biweekly and weekdays specified,
    // we still step day by day but to respect 14-day cycle we'd allow any weekday match and the stepping logic below handles period.
    current = addDays_(current, 1);

    // If recurrence is weekly/biweekly AND weekdays specified, we need to stop after enough weeks if occurrences specified.
    // To prevent infinite loops, break if current is more than 365 days from first and occurrences not specified.
    if (!occurrences && endDate == null) {
      const maxDays = 365;
      if ((current.getTime() - first.getTime()) / (24*60*60*1000) > maxDays) break;
    }
  }

  // For biweekly rule with weekdays, filter rows to keep only those that follow 14-day phase starting from first week
  if (recur === 'biweekly' && weekdays.length > 0) {
    const phaseStartWeek = Math.floor((first.getTime()) / (7*24*60*60*1000));
    const filtered = [];
    for (const r of rows) {
      const sIso = r[idx('start_iso')];
      const d = new Date(String(sIso) || '');
      const wk = Math.floor((d.getTime()) / (7*24*60*60*1000));
      if (((wk - phaseStartWeek) % 2) === 0) filtered.push(r);
    }
    return filtered.slice(0, maxCreate);
  }

  return rows.slice(0, maxCreate);
}

/** 管理画面：Calendar→Eventsシート同期（過去/未来 EVENT_SYNC_DAYS 日） */
function adminSyncEventsFromCalendar(calendarId) {
  assertAdminContext_();
  ensureBaseSheets_();
  const cfg = getRuntimeConfig_();
  const calId = (calendarId && String(calendarId).trim()) ? String(calendarId).trim() : (cfg.CALENDAR_ID || getAppCalendarId_());
  if (!calId) return { ok: false, error: 'calendar id not set' };
  let cal;
  try { cal = CalendarApp.getCalendarById(calId); } catch (e) { cal = null; }
  if (!cal) return { ok: false, error: 'calendar not found', calendarId: calId };

  const now = new Date();
  const days = Number(cfg.EVENT_SYNC_DAYS || 30);
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = cal.getEvents(from, to);

  for (const ev of events) {
    upsertEventToEventsSheet_(ev, { source: 'calendar', status: 'freebusy', booking_id: '' });
  }
  return { ok: true, count: events.length, range: { from, to }, calendarId: calId };
}

/** =========================
 * Guards
 * ========================= */
function assertPublicContext_() {
  // TEMP: public guard disabled to simplify. (If you want, re-enable enforcePublicDeployment_())
  // enforcePublicDeployment_();
  return;
}

function assertAdminContext_() {
  // アクセス制御なし: 誰でもアクセス可能
  return;
}

function assertOwnerContext_() {
  if (!isOwner_()) {
    throw new Error('この操作はスプレッドシート所有者のみが利用できます。');
  }
}

function isOwner_() {
  try {
    const ss = getSS_();
    const ownerEmail = ss && ss.getOwner && ss.getOwner() ? String(ss.getOwner().getEmail() || '').trim().toLowerCase() : '';

    // Collect candidate emails for current user
    const candidates = [];
    try { const a = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); if (a) candidates.push(a); } catch (_) {}
    try { const e = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); if (e) candidates.push(e); } catch (_) {}

    // If ownerEmail is available, check if any candidate matches
    if (ownerEmail) {
      for (const c of candidates) {
        if (c === ownerEmail) return true;
      }
    }

    // Fallback: when deployed as "Execute as me", getEffectiveUser returns script owner's email.
    // If that is the SS owner, the caller IS the owner (because only the owner's identity is used).
    // This covers the common case where getActiveUser returns empty in web-app context.
    if (ownerEmail && candidates.length === 0) {
      // No user email available at all — check if effectiveUser IS the owner
      // (happens when web-app runs as owner and OAuth scope doesn't expose active user)
      try {
        const eff = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
        if (eff === ownerEmail) return true;
      } catch (_) {}
    }

    // Additional fallback: if web app is set to "Execute as me" and the effective user
    // matches the owner, treat as owner even when active user is empty
    if (ownerEmail) {
      try {
        const eff = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
        if (eff && eff === ownerEmail) return true;
      } catch (_) {}
    }

    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Check whether the current user is the configured admin executor (deployer).
 * 
 * How it works:
 * - On first call, stores Session.getEffectiveUser() (deployer) as admin
 * - Checks Session.getActiveUser() (actual accessing user) against stored admin
 * - Falls back to Session.getEffectiveUser() only when getActiveUser() is unavailable
 * 
 * Deploy requirements for proper access control:
 * - Set "Execute the app as: Me (deployer email)"
 * - For public+admin in single webapp: users other than deployer won't be distinguished
 *   when getActiveUser() returns empty (common with insufficient OAuth scopes)
 * - Recommended: deploy admin as separate webapp with "Who has access: Only myself"
 */
function isExecutor_() {
  // TEMP: 誰でもアクセスできるようにするため、常にtrueを返します
  console.log('[isExecutor_] 🔓 Auth bypass: returning true for anyone');
  return true;

  try {
    const props = PropertiesService.getScriptProperties();
    const key = PROP_KEYS.ADMIN_EXECUTOR_EMAIL;
    let admin = String(props.getProperty(key) || '').trim().toLowerCase();

    // Get effective user (deployer when "Execute as: Me")
    let eff = '';
    try { eff = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { console.warn('[isExecutor_] getEffectiveUser failed:', e); }

    // Auto-register: if no admin configured, set effective user as admin on first access
    if (!admin && eff) {
      try {
        props.setProperty(key, eff);
        admin = eff;
        console.log('[isExecutor_] ✅ Auto-registered admin: ' + eff);
      } catch (err) {
        console.error('[isExecutor_] ❌ Failed to auto-register admin:', err);
        return false;
      }
    }

    if (!admin) {
      console.warn('[isExecutor_] ❌ No admin email configured and auto-register failed');
      return false;
    }

    // Get active user (the actual accessing user)
    let active = '';
    try { active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { console.warn('[isExecutor_] getActiveUser failed:', e); }

    console.log('[isExecutor_] 🔍 Checking: admin="' + admin + '", active="' + active + '", eff="' + eff + '"');

    // Priority 1: If active user is available, use it for precise access control
    if (active) {
      const match = (active === admin);
      console.log('[isExecutor_] ' + (match ? '✅' : '❌') + ' Active user check: ' + active + (match ? ' == ' : ' != ') + admin);
      return match;
    }

    // Priority 2: Fallback to effective user when active user is unavailable
    // (common in "Execute as: Me" mode). This allows deployer access.
    if (eff && eff === admin) {
      console.log('[isExecutor_] ✅ Effective user fallback matched: ' + eff + ' == ' + admin);
      return true;
    }

    console.log('[isExecutor_] ❌ No match found');
    return false;
  } catch (e) {
    console.error('[isExecutor_] ❌ Critical error:', e);
    return false;
  }
}

/** optional guards (not used in TEMP) */
function enforcePublicDeployment_() {
  const props = PropertiesService.getScriptProperties();
  const publicUrl = normalizeUrl_(props.getProperty(PROP_KEYS.PUBLIC_WEBAPP_URL) || '');
  const thisUrl = normalizeUrl_(ScriptApp.getService().getUrl() || '');
  if (!thisUrl) return;
  if (publicUrl && thisUrl !== publicUrl) {
    throw new Error('このURLは公開用として許可されていません（PUBLIC_WEBAPP_URL を確認してください）。');
  }
}

function enforceAdminDeployment_() {
  const props = PropertiesService.getScriptProperties();
  const adminUrl = normalizeUrl_(props.getProperty(PROP_KEYS.ADMIN_WEBAPP_URL) || '');
  const thisUrl = normalizeUrl_(ScriptApp.getService().getUrl() || '');
  if (!thisUrl) return;
  if (adminUrl && thisUrl !== adminUrl) {
    throw new Error('このURLは管理用として許可されていません（ADMIN_WEBAPP_URL を確認してください）。');
  }
}

/** =========================
 * Spreadsheet resolver
 * ========================= */
function tryGetSS_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (_) {}
  try {
    const props = PropertiesService.getScriptProperties();
    const id = String(props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '').trim();
    if (!id) return null;
    return SpreadsheetApp.openById(id);
  } catch (_) {
    return null;
  }
}

function getSS_() {
  // 1. Container-bound spreadsheet（各テナントのコピーSSに紐付き）
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (_) {}

  // 2. Fallback: SPREADSHEET_ID property
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  throw new Error('Spreadsheet not available. Bind this script to a Spreadsheet or set property SPREADSHEET_ID.');
}

/** =========================
 * Spreadsheet UI menu (custom menu)
 * ========================= */
function onOpen(e) {
  // Container-bound SS ID をプロパティに保存（Webアプリ実行時に getOwnerSS_() が見つけられるように）
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      const props = PropertiesService.getScriptProperties();
      props.setProperty(PROP_KEYS.SPREADSHEET_ID, ss.getId());
      try {
        var sid = ScriptApp.getScriptId();
        if (sid) props.setProperty(PROP_KEYS.TEMPLATE_SCRIPT_ID, sid);
      } catch (_) {}
    }
  } catch (_) {}
  try { createCustomMenu_(); } catch (_) {}
  try {
    var up = PropertiesService.getUserProperties();
    if (String(up.getProperty('setup_toast_shown') || '') !== '1') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) ss.toast('「予約管理」メニュー → 初回セットアップガイド を開いてください', 'セットアップ', 8);
      up.setProperty('setup_toast_shown', '1');
    }
  } catch (_) {}
}

function createCustomMenu_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('予約管理')
    .addItem('🚀 初回セットアップガイド', 'showSetupSidebar_')
    .addSeparator()
    .addItem('権限を承認', 'menuEnsureAuth_')
    .addItem('初期セットアップ（初回のみ）', 'menuRunSetup_')
    .addItem('デプロイ手順を表示', 'showDeployGuide_')
    .addSeparator()
    .addItem('予約ページURLを表示', 'showPublicUrlDialog_')
    .addItem('管理画面URLを表示', 'showAdminUrlDialog_')
    .addItem('� テナントプロフィール編集', 'menuOpenTenantProfile_')
    .addItem('�📡 ポータルサイトに登録', 'menuRegisterToPortal_')
    .addSeparator()
    .addItem('カレンダー同期（手動）', 'timeDrivenSyncEvents_')
    .addToUi();
}

/** サイドバーでセットアップを強調表示 */
function showSetupSidebar_() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Roboto,Meiryo,ヒラギノ; padding:16px;">\n' +
    '  <h2 style="margin-top:0;color:#0b3d91;">🚀 初回セットアップガイド</h2>\n' +
    '  <p>こちらから初回セットアップ手順を確認できます。まずは <strong>権限を承認</strong> を実行してください。</p>\n' +
    '  <div style="margin-top:12px;">\n' +
    '    <button onclick="google.script.run.menuEnsureAuth_();" style="background:#2563eb;color:#fff;border:none;padding:10px 14px;border-radius:8px;font-weight:700;">権限を承認</button>\n' +
    '' +
    '  </div>\n' +
    '  <hr style="margin:12px 0;">\n' +
    '  <div>自動デプロイが失敗する場合は、表示される案内に従い <strong>Apps Script API を有効化</strong> するか、<strong>デプロイ手順</strong> を手動で実行してください。</div>\n' +
    '</div>'
  ).setTitle('初回セットアップ');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** サイドバー: プロジェクトIAM付与フォームを表示 */
function showGrantIamSidebar_() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Roboto,Meiryo,ヒラギノ; padding:12px;">\n' +
    '<h3 style="margin-top:0;color:#0b3d91;">プロジェクト権限を付与する</h3>\n' +
    '<p>Project ID（番号）とユーザメールを入力して、該当ユーザに <strong>Editor</strong> 権限を付与します。実行するアカウントがプロジェクトのオーナーである必要があります。</p>\n' +
    '<div style="margin-top:8px;">\n' +
    '  <label>Project number: <input id="proj" style="width:220px"></label><br><br>\n' +
    '  <label>User email: <input id="email" style="width:220px"></label>\n' +
    '</div>\n' +
    '<div style="margin-top:12px;">\n' +
    '  <button onclick="grant()" style="background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:700">付与する</button>\n' +
    '  <button onclick="enableApi()" style="margin-left:8px;background:#0b7494;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:700">Apps Script API を有効化</button>\n' +
    '  <span id="msg" style="margin-left:10px;color:#0b3d91;font-weight:700"></span>\n' +
    '</div>\n' +
    '<script>function grant(){var p=document.getElementById("proj").value.trim();var e=document.getElementById("email").value.trim();if(!p||!e){document.getElementById("msg").textContent="両方入力してください";return;}document.getElementById("msg").textContent="処理中…";google.script.run.withSuccessHandler(function(r){document.getElementById("msg").textContent = r && r.ok?"完了":"失敗: " + (r && r.error? r.error : JSON.stringify(r));}).withFailureHandler(function(err){document.getElementById("msg").textContent = "エラー: " + (err && err.message? err.message: err);}).grantIamEditor(p,e);} function enableApi(){var p=document.getElementById("proj").value.trim();if(!p){document.getElementById("msg").textContent="Project number を入力してください";return;}document.getElementById("msg").textContent="API 有効化中…";google.script.run.withSuccessHandler(function(r){document.getElementById("msg").textContent = r && r.ok?"API 有効化済み":"失敗: " + (r && r.error? r.error : JSON.stringify(r));}).withFailureHandler(function(err){document.getElementById("msg").textContent = "エラー: " + (err && err.message? err.message: err);}).enableAppsScriptApi(p);} </script>\n' +
    '</div>'
  ).setTitle('権限付与');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Grant Editor role to a user on the given GCP project number.
 *  実行アカウントが該当プロジェクトで十分な権限を持っている必要があります。
 */
function grantIamEditor(projectNumber, userEmail) {
  try {
    if (!projectNumber || !userEmail) return { ok: false, error: 'projectNumber と userEmail を指定してください' };
    var token = ScriptApp.getOAuthToken();
    var headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    // getIamPolicy (POST)
    var getUrl = 'https://cloudresourcemanager.googleapis.com/v1/projects/' + encodeURIComponent(projectNumber) + ':getIamPolicy';
    var getResp = UrlFetchApp.fetch(getUrl, { method: 'post', headers: headers, muteHttpExceptions: true, payload: '{}' });
    if (getResp.getResponseCode() !== 200) {
      return { ok: false, error: 'getIamPolicy 失敗: ' + getResp.getResponseCode() + ' ' + getResp.getContentText().substring(0,500) };
    }
    var policy = JSON.parse(getResp.getContentText());
    policy.bindings = policy.bindings || [];

    var role = 'roles/editor';
    var member = 'user:' + userEmail;
    var found = false;
    for (var i = 0; i < policy.bindings.length; i++) {
      if (policy.bindings[i].role === role) {
        if (policy.bindings[i].members.indexOf(member) === -1) {
          policy.bindings[i].members.push(member);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      policy.bindings.push({ role: role, members: [member] });
    }

    // setIamPolicy
    var setUrl = 'https://cloudresourcemanager.googleapis.com/v1/projects/' + encodeURIComponent(projectNumber) + ':setIamPolicy';
    var payload = JSON.stringify({ policy: policy });
    var setResp = UrlFetchApp.fetch(setUrl, { method: 'post', headers: headers, contentType: 'application/json', payload: payload, muteHttpExceptions: true });
    if (setResp.getResponseCode() !== 200) {
      return { ok: false, error: 'setIamPolicy 失敗: ' + setResp.getResponseCode() + ' ' + setResp.getContentText().substring(0,500) };
    }
    return { ok: true, message: '付与しました: ' + userEmail + ' -> ' + projectNumber };
  } catch (e) {
    return { ok: false, error: String(e && (e.message || e)) };
  }
}

/** Enable Apps Script API (script.googleapis.com) on the given project number. */
function enableAppsScriptApi(projectNumber) {
  try {
    if (!projectNumber) return { ok: false, error: 'projectNumber を指定してください' };
    var token = ScriptApp.getOAuthToken();
    var headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    var url = 'https://serviceusage.googleapis.com/v1/projects/' + encodeURIComponent(projectNumber) + '/services/script.googleapis.com:enable';
    var resp = UrlFetchApp.fetch(url, { method: 'post', headers: headers, contentType: 'application/json', payload: '{}', muteHttpExceptions: true });
    var code = resp.getResponseCode();
    var txt = resp.getContentText();
    if (code === 200) {
      return { ok: true, message: 'Apps Script API を有効にしました' };
    }
    // Some responses return 400/409 when already enabled; treat 409/200 as success
    if (code === 409 || (txt && txt.indexOf('already enabled') !== -1)) {
      return { ok: true, message: 'Apps Script API は既に有効です' };
    }
    return { ok: false, error: 'API 有効化失敗: ' + code + ' ' + txt.substring(0,500) };
  } catch (e) {
    return { ok: false, error: String(e && (e.message || e)) };
  }
}

/**
 * メニューから権限確認用ヘルパー。
 * Drive, Spreadsheet, Calendar の各スコープをテストして結果を表示します。
 * スプレッドシートメニューから実行 → OAuth 承認ダイアログが表示されます。
 */
function menuEnsureAuth_() {
  const ui = SpreadsheetApp.getUi();
  var results = [];
  // 1) Drive スコープ確認
  try {
    var props = PropertiesService.getScriptProperties();
    var id = String(props.getProperty(PROP_KEYS.SPREADSHEET_ID) || '').trim();
    if (id) {
      var f = DriveApp.getFileById(id);
      results.push('✅ Drive: テンプレート「' + f.getName() + '」にアクセス可能');
    } else {
      DriveApp.getRootFolder();
      results.push('✅ Drive: アクセス可能（テンプレートID未設定 → SSを開き直してください）');
    }
  } catch (e) {
    results.push('❌ Drive: ' + (e.message || e));
  }
  // 2) Spreadsheet 確認
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    results.push('✅ Spreadsheet: 「' + ss.getName() + '」にアクセス可能');
  } catch (e3) {
    results.push('❌ Spreadsheet: ' + (e3.message || e3));
  }
  // 3) Calendar 確認
  try {
    CalendarApp.getDefaultCalendar();
    results.push('✅ Calendar: アクセス可能');
  } catch (e4) {
    results.push('❌ Calendar: ' + (e4.message || e4));
  }
  // 結果表示
  var allOk = results.every(function(r) { return r.indexOf('✅') === 0; });
  ui.alert(
    allOk ? '✅ 全権限の確認完了' : '⚠️ 一部の権限に問題があります',
    results.join('\n') + '\n\n' +
    (allOk
      ? '全ての権限が正常に付与されています。'
      : '❌ のある項目を確認してください。\nこのメニューを再度クリックすると承認ダイアログが表示されます。'),
    ui.ButtonSet.OK
  );
}

/** スプレッドシートメニューからワンクリックでWebアプリデプロイ */
function menuAutoDeploy_() {
  var ui = SpreadsheetApp.getUi();
  try {
    var token = ScriptApp.getOAuthToken();
    var scriptId = ScriptApp.getScriptId();
    var headers = { 'Authorization': 'Bearer ' + token };
    var baseApi = 'https://script.googleapis.com/v1/projects/';

    // manifest に webapp 設定を確保
    var srcResp = UrlFetchApp.fetch(baseApi + scriptId + '/content', {
      headers: headers, muteHttpExceptions: true
    });
    if (srcResp.getResponseCode() === 200) {
      var files = JSON.parse(srcResp.getContentText()).files;
      var needUpdate = false;
      for (var i = 0; i < files.length; i++) {
        if (files[i].name === 'appsscript') {
          var cfg = JSON.parse(files[i].source);
          if (!cfg.webapp) {
            cfg.webapp = { access: 'ANYONE', executeAs: 'USER_DEPLOYING' };
            files[i].source = JSON.stringify(cfg, null, 2);
            needUpdate = true;
          }
          break;
        }
      }
      if (needUpdate) {
        UrlFetchApp.fetch(baseApi + scriptId + '/content', {
          method: 'put', headers: headers, contentType: 'application/json',
          payload: JSON.stringify({ files: files }), muteHttpExceptions: true
        });
      }
    }

    // バージョン作成
    var vResp = UrlFetchApp.fetch(baseApi + scriptId + '/versions', {
      method: 'post', headers: headers, contentType: 'application/json',
      payload: JSON.stringify({ description: '予約管理 デプロイ ' + new Date().toLocaleString() }),
      muteHttpExceptions: true
    });
    if (vResp.getResponseCode() !== 200) {
      throw new Error('バージョン作成失敗: ' + vResp.getContentText().substring(0, 300));
    }
    var vNum = JSON.parse(vResp.getContentText()).versionNumber;

    // デプロイ
    var dResp = UrlFetchApp.fetch(baseApi + scriptId + '/deployments', {
      method: 'post', headers: headers, contentType: 'application/json',
      payload: JSON.stringify({
        versionNumber: vNum,
        description: '予約管理',
        manifestFileName: 'appsscript'
      }),
      muteHttpExceptions: true
    });
    if (dResp.getResponseCode() !== 200) {
      throw new Error('デプロイ失敗: ' + dResp.getContentText().substring(0, 300));
    }
    var dData = JSON.parse(dResp.getContentText());
    var webUrl = '';
    if (dData.entryPoints) {
      for (var j = 0; j < dData.entryPoints.length; j++) {
        if (dData.entryPoints[j].entryPointType === 'WEB_APP') {
          webUrl = dData.entryPoints[j].url;
          break;
        }
      }
    }
    if (!webUrl && dData.deploymentId) {
      webUrl = 'https://script.google.com/macros/s/' + dData.deploymentId + '/exec';
    }

    // URL をプロパティに保存
    if (webUrl) {
      var props = PropertiesService.getScriptProperties();
      props.setProperty(PROP_KEYS.PUBLIC_WEBAPP_URL, webUrl);
      props.setProperty(PROP_KEYS.ADMIN_WEBAPP_URL, webUrl + '?admin=1');
    }

    // ─── ポータルへ自動登録（設定されていればスキップ） ───
    var portalResult = { skipped: true };
    if (webUrl) {
      try {
        portalResult = registerToPortal_(webUrl);
        if (portalResult && !portalResult.ok && !portalResult.skipped) {
          console.warn('[menuAutoDeploy_] Portal registration failed:', portalResult.error);
        }
      } catch (portalErr) {
        console.warn('[menuAutoDeploy_] Portal registration error (non-fatal):', portalErr);
      }
    }

    var portalMsg = '';
    if (portalResult && portalResult.ok && !portalResult.skipped) {
      portalMsg = '\n\n✅ ポータルサイトへの登録も完了しました。';
    } else if (portalResult && portalResult.skipped) {
      portalMsg = '\n\n💡 ポータル連携を有効にするには、スクリプトプロパティに\nPORTAL_API_URL と PORTAL_ADMIN_SECRET を設定してください。';
    }

    ui.alert('🎉 デプロイ完了！',
      '予約ページURL:\n' + webUrl +
      '\n\n管理画面URL:\n' + webUrl + '?admin=1' +
      '\n\nこのURLをブックマークしてください。' + portalMsg,
      ui.ButtonSet.OK);
  } catch (e) {
    var msg = String(e && (e.message || e));
    // スコープ不足や403の場合は詳細な対処ダイアログを表示
    if (msg.indexOf('insufficient authentication') !== -1 || msg.indexOf('ACCESS_TOKEN_SCOPE_INSUFFICIENT') !== -1 || msg.indexOf('403') !== -1 || msg.indexOf('Apps Script API has not been used') !== -1 || msg.indexOf('script.googleapis.com') !== -1) {
      var scriptIdErr = '';
      try { scriptIdErr = ScriptApp.getScriptId(); } catch (_) { scriptIdErr = ''; }
      var editorLink = scriptIdErr ? 'https://script.google.com/d/' + scriptIdErr + '/edit' : '';
      var projectId = '';
      try {
        var m = msg.match(/project\s+(\d{6,})/);
        if (m && m[1]) projectId = m[1];
      } catch (_) { projectId = ''; }
      var apiLink = projectId
        ? 'https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=' + projectId
        : 'https://console.developers.google.com/apis/api/script.googleapis.com/overview';
      var esc = String(msg || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var html = '<div style="font-family:sans-serif;padding:12px;line-height:1.6">'
        + '<h3 style="margin-top:0">自動デプロイに失敗しました（権限／スコープ不足）</h3>'
        + '<p>エラー: <code>' + esc + '</code></p>'
        + '<p>対処方法:</p>'
        + '<ol>'
        + '<li>GCP コンソールで該当プロジェクトに入り、<strong>Apps Script API</strong> を有効化してください。</li>'
        + '<li>manifest (<code>appsscript.json</code>) に必要なスコープ（例: <code>https://www.googleapis.com/auth/script.projects</code>）を追加してください。</li>'
        + '<li>エディタで <strong>権限を承認</strong> を実行してください（下のボタン）。</li>'
        + '</ol>';
      html += '<p><a href="' + apiLink + '" target="_blank">Apps Script API を有効化する</a></p>';
      if (editorLink) html += '<p><a href="' + editorLink + '" target="_blank">Apps Script エディタを開く</a></p>';
      html += '<div style="margin-top:10px"><button onclick="google.script.run.menuEnsureAuth_()" style="background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:700">権限を承認</button>'
        + '&nbsp;<button onclick="google.script.run.showDeployGuide_()" style="background:#16a34a;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:700">デプロイ手順を表示</button></div>'
        + '</div>';
      var dlg = HtmlService.createHtmlOutput(html).setWidth(560).setHeight(360);
      SpreadsheetApp.getUi().showModalDialog(dlg, 'デプロイエラー — 対処');
    } else {
      ui.alert('デプロイエラー',
        '自動デプロイに失敗しました。\n\n' +
        'エラー: ' + (e.message || e) + '\n\n' +
        '→ Google Cloud Console で "Apps Script API" を有効にしてから再実行してください。\n' +
        'または「デプロイ手順を表示」から手動でデプロイしてください。',
        ui.ButtonSet.OK);
    }
  }
}

/** メニューからセットアップ実行 */
function menuRunSetup_() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  if (String(props.getProperty(PROP_KEYS.SETUP_DONE) || '') === '1') {
    ui.alert('セットアップ済み', 'このスプレッドシートは既にセットアップ済みです。\n再実行する場合はスクリプトプロパティの SETUP_DONE を削除してください。', ui.ButtonSet.OK);
    return;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) { ui.alert('エラー', 'スプレッドシートが取得できません。', ui.ButtonSet.OK); return; }
  setupInitializeSpreadsheet_(ss);
  setupEnsureDefaults_();
  setupEnsureTimeDrivenTrigger_();
  const email = Session.getActiveUser().getEmail() || '';
  if (email) props.setProperty(PROP_KEYS.NOTIFY_OWNER_EMAIL, email);
  props.setProperty(PROP_KEYS.SETUP_DONE, '1');
  ui.alert('完了', 'セットアップが完了しました。\n次に「デプロイ手順を表示」でWebアプリとしてデプロイしてください。', ui.ButtonSet.OK);
}

/** デプロイ手順ダイアログ */
function showDeployGuide_() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:14px;line-height:1.8;padding:8px">' +
    '<h3 style="margin:0 0 12px">Webアプリとしてデプロイする手順</h3>' +
    '<ol>' +
    '<li>このスプレッドシートで「<b>拡張機能</b> → <b>Apps Script</b>」を開く</li>' +
    '<li>左上の「<b>デプロイ</b>」→「<b>新しいデプロイ</b>」をクリック</li>' +
    '<li>⚙ 歯車アイコン → 「<b>ウェブアプリ</b>」を選択</li>' +
    '<li><b>実行するユーザー</b>: 「自分」を選択</li>' +
    '<li><b>アクセスできるユーザー</b>: 「全員」を選択</li>' +
    '<li>「<b>デプロイ</b>」ボタンを押す</li>' +
    '<li>表示されるURLがあなたの<b>予約ページ</b>です 🎉</li>' +
    '</ol>' +
    '<p style="color:#64748b;font-size:12px">管理画面は URL に <code>?admin=1</code> を付けて開けます。</p>' +
    '</div>'
  ).setWidth(520).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'デプロイ手順');
}

function showPublicUrlDialog_() {
  const url = getPublicWebAppUrl_();
  SpreadsheetApp.getUi().alert('予約ページURL', url || '未設定', SpreadsheetApp.getUi().ButtonSet.OK);
}

function showAdminUrlDialog_() {
  const url = getAdminUrl();
  SpreadsheetApp.getUi().alert('管理画面URL', url || '未設定', SpreadsheetApp.getUi().ButtonSet.OK);
}

/** シートが無い/ヘッダが無い で死なないようにする */
function ensureBaseSheets_() {
  const ss = getSS_();

  // Services sheet intentionally removed: do not create a Services sheet.

  // Bookings
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_BOOKINGS, [
    'booking_id', 'created_at', 'status',
    'service_id', 'service_name',
    'customer_name', 'customer_email',
    'start_iso', 'end_iso',
    'answers_json',
    'event_id',
    'cancel_token'
  ]);

  // Availabilities
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_AVAILABILITIES, [
    'availability_id', 'service_id', 'title', 'start_iso', 'end_iso', 'capacity', 'status', 'source', 'updated_at'
  ]);

  // Events mirror
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_EVENTS, [
    'event_id', 'source', 'status', 'title', 'service_id', 'start_iso', 'end_iso',
    'location', 'description', 'capacity', 'booking_id', 'updated_at', 'last_synced_at'
  ]);

  // Courses (metadata for public timeline)
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_COURSES, [
    'course_name', 'description', 'thumbnail_url', 'thumbnail_file_id', 'thumbnail_data', 'updated_at'
  ]);
}

/** ヘッダ一致を強制（違うなら整える） */
function ensureSheetWithHeader_(ss, name, headerArr) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  const want = headerArr.map(x => String(x).trim());

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, want.length).setValues([want]);
    return sh;
  }

  // Read existing header and trim trailing empty columns
  const currentRow = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), want.length)).getValues()[0];
  const current = currentRow.map(x => String(x || '').trim());
  while (current.length > 0 && current[current.length - 1] === '') current.pop();

  // Append only missing columns (safe: avoid overwriting/reordering existing columns)
  const missing = want.filter(col => current.indexOf(col) < 0);
  if (missing.length > 0) {
    sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
} 

/** Read Courses sheet into array of objects */
function listCourses_() {
  const ss = getSS_();
  const sh = ss.getSheetByName(CFG_DEFAULT.SHEET_COURSES);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const idx = (n) => headerIndex_(header, n);
  let iName = idx('course_name');
  let iDesc = idx('description');
  let iUrl = idx('thumbnail_url');
  let iFile = idx('thumbnail_file_id');
  let iUpdated = idx('updated_at');
  let iData = idx('thumbnail_data');
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = iName >= 0 ? String(row[iName] || '').trim() : '';
    if (!name) continue;
    out.push({
      course_name: name,
      description: iDesc >= 0 ? String(row[iDesc] || '').trim() : '',
      thumbnail_url: (iUrl >= 0 && String(row[iUrl] || '').trim()) ? String(row[iUrl] || '').trim() : (iData >= 0 ? String(row[iData] || '').trim() : ''),
      thumbnail_file_id: iFile >= 0 ? String(row[iFile] || '').trim() : '',
      thumbnail_data: iData >= 0 ? String(row[iData] || '').trim() : '',
      updated_at: iUpdated >= 0 ? row[iUpdated] : ''
    });
  }
  return out;
}

/** =========================
 * Config
 * ========================= */
function getRuntimeConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    SHEET_SERVICES: CFG_DEFAULT.SHEET_SERVICES,
    SHEET_AVAILABILITIES: CFG_DEFAULT.SHEET_AVAILABILITIES,
    SHEET_BOOKINGS: CFG_DEFAULT.SHEET_BOOKINGS,
    SHEET_EVENTS: CFG_DEFAULT.SHEET_EVENTS,
    SHEET_COURSES: CFG_DEFAULT.SHEET_COURSES,
    TZ: CFG_DEFAULT.TZ,
    CALENDAR_ID: props.getProperty(PROP_KEYS.CALENDAR_ID) || CFG_DEFAULT.CALENDAR_ID,
    HORIZON_DAYS: Number(props.getProperty(PROP_KEYS.HORIZON_DAYS) || CFG_DEFAULT.HORIZON_DAYS),
    MIN_LEAD_MIN: Number(props.getProperty(PROP_KEYS.MIN_LEAD_MIN) || CFG_DEFAULT.MIN_LEAD_MIN),
    NOTIFY_OWNER_EMAIL: props.getProperty(PROP_KEYS.NOTIFY_OWNER_EMAIL) || CFG_DEFAULT.NOTIFY_OWNER_EMAIL,
    EVENT_SYNC_DAYS: Number(props.getProperty(PROP_KEYS.EVENT_SYNC_DAYS) || CFG_DEFAULT.EVENT_SYNC_DAYS),
  };
}

function getPublicWebAppUrl_() {
  const props = PropertiesService.getScriptProperties();
  const url = String(props.getProperty(PROP_KEYS.PUBLIC_WEBAPP_URL) || '').trim();
  if (url) return normalizeUrl_(url);
  return normalizeUrl_(ScriptApp.getService().getUrl() || '');
}

// Build cancel link with optional embedded booking details for display on cancel.html
function buildCancelUrl_(token, booking) {
  const base = getPublicWebAppUrl_();
  const params = [];
  const add = (k, v) => {
    if (v === undefined || v === null || String(v).trim() === '') return;
    params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  };
  // Use query-based routing to avoid pathInfo differences between environments.
  // Keep identifiers minimal: token and booking id. Include cancel=1 to force cancel routing.
  add('cancel', '1');
  add('token', token);
  if (booking) add('bid', booking.booking_id);
  return `${base}?${params.join('&')}`;
}

function normalizeUrl_(s) {
  const u = String(s || '').trim();
  if (!u) return '';
  return u.replace(/\/+$/, '');
}

/** Services removed from codebase. */

/** =========================
 * Validation
 * ========================= */
function validatePayload_(payload) {
  if (!payload) throw new Error('invalid payload');
  // service_id is optional now; booking can be made against a specific event (start_iso)
  if (!payload.start_iso) throw new Error('start_iso is required');
  if (!payload.customer_name || String(payload.customer_name).trim().length < 1) {
    throw new Error('氏名を入力してください');
  }
  if (!payload.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.customer_email))) {
    throw new Error('メールアドレスが不正です');
  }
}

/** =========================
 * Events mirror
 * ========================= */
function ensureEventsSheet_() {
  const ss = getSS_();
  ensureSheetWithHeader_(ss, CFG_DEFAULT.SHEET_EVENTS, [
    'event_id', 'source', 'status', 'title', 'service_id', 'start_iso', 'end_iso',
    'location', 'description', 'capacity', 'booking_id', 'updated_at', 'last_synced_at'
  ]);
  return ss.getSheetByName(CFG_DEFAULT.SHEET_EVENTS);
} 

/** Availabilities sheet helper */
function ensureAvailabilitiesSheet_() {
  const ss = getSS_();
  const name = CFG_DEFAULT.SHEET_AVAILABILITIES;
  ensureSheetWithHeader_(ss, name, [
    'availability_id', 'service_id', 'title', 'start_iso', 'end_iso', 'capacity', 'status', 'source', 'updated_at'
  ]);
  return ss.getSheetByName(name);
}

/**
 * Upsert an availability row based on an Event-like object.
 * Uses event_id as availability_id so Events and Availabilities are linked.
 */
function upsertAvailabilityFromEvent_(evt) {
  try {
    if (!evt) return { ok: false, error: 'evt required' };
    ensureAvailabilitiesSheet_();
    const sh = getSS_().getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
    if (!sh) return { ok: false, error: 'Availabilities sheet not found' };

    const vals = sh.getDataRange().getValues();
    const header = vals[0] || [];
    const idx = (n) => headerIndex_(header, n);

    const id = String(evt.event_id || evt.availability_id || '').trim();
    if (!id) return { ok: false, error: 'event_id required' };

    const service_id = String(evt.service_id || '').trim();
    const title = String(evt.title || '').trim();
    const tz = getRuntimeConfig_().TZ;
    let start_iso = String(evt.start_iso || '').trim();
    let end_iso = String(evt.end_iso || '').trim();
    try {
      if (start_iso) {
        const sd = parseLocalIso_(start_iso.replace(/\s+/g, 'T'));
        if (!isNaN(sd.getTime())) start_iso = toLocalIso_(sd, tz);
      }
      if (end_iso) {
        const edt = parseLocalIso_(end_iso.replace(/\s+/g, 'T'));
        if (!isNaN(edt.getTime())) end_iso = toLocalIso_(edt, tz);
      }
    } catch (_) {}
    const capacity = (evt.capacity !== undefined && evt.capacity !== null) ? Number(evt.capacity) : '';
    const status = String(evt.status || 'available');
    const source = String(evt.source || 'event');
    const updated_at = new Date();

    // update existing if found
    for (let r = 1; r < vals.length; r++) {
      if (String(vals[r][idx('availability_id')] || '') === id) {
        try {
          sh.getRange(r+1, idx('service_id')+1).setValue(service_id);
          sh.getRange(r+1, idx('title')+1).setValue(title);
          sh.getRange(r+1, idx('start_iso')+1).setValue(start_iso);
          sh.getRange(r+1, idx('end_iso')+1).setValue(end_iso);
          sh.getRange(r+1, idx('capacity')+1).setValue(capacity);
          sh.getRange(r+1, idx('status')+1).setValue(status);
          sh.getRange(r+1, idx('source')+1).setValue(source);
          sh.getRange(r+1, idx('updated_at')+1).setValue(updated_at);
          return { ok: true, mode: 'update' };
        } catch (e) {
          return { ok: false, error: 'failed to update availability: ' + String(e && e.message ? e.message : e) };
        }
      }
    }

    // append new row
    const row = [id, service_id, title, start_iso, end_iso, capacity, status, source, updated_at];
    try {
      sh.appendRow(row);
      return { ok: true, mode: 'insert' };
    } catch (e) {
      return { ok: false, error: 'failed to append availability: ' + String(e && e.message ? e.message : e) };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** Archive availability rows linked to an event (set status=archived) */
function archiveAvailabilityForEvent_(eventId) {
  try {
    if (!eventId) return { ok: false, error: 'eventId required' };
    ensureAvailabilitiesSheet_();
    const sh = getSS_().getSheetByName(CFG_DEFAULT.SHEET_AVAILABILITIES);
    if (!sh) return { ok: false, error: 'Availabilities sheet not found' };

    const vals = sh.getDataRange().getValues();
    if (vals.length < 2) return { ok: false, error: 'no availabilities' };
    const header = vals[0];
    const idx = (n) => header.indexOf(n);

    const iId = idx('availability_id');
    const iStatus = idx('status');
    const iUpdated = idx('updated_at');

    for (let r = 1; r < vals.length; r++) {
      if (String(vals[r][iId] || '') === String(eventId)) {
        sh.getRange(r+1, iStatus+1).setValue('archived');
        sh.getRange(r+1, iUpdated+1).setValue(new Date());
        return { ok: true, mode: 'update' };
      }
    }

    // not found: append an archived row to record the archive
    const row = [String(eventId), '', '', '', '', '', 'archived', 'event', new Date()];
    try { sh.appendRow(row); return { ok: true, mode: 'insert' }; } catch (e) { return { ok: false, error: 'failed to append archive: ' + String(e && e.message ? e.message : e) }; }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function upsertEventToEventsSheet_(calendarEvent, meta) {
  const cfg = getRuntimeConfig_();
  const tz = cfg.TZ;
  const sheet = ensureEventsSheet_();

  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const idx = (name) => header.indexOf(name);

  const iEventId = idx('event_id');
  const eventId = calendarEvent.getId();

  // Build row object according to header order to keep columns stable
  const rowObj = {};
  header.forEach(h => {
    if (h === 'event_id') rowObj[h] = eventId;
    else if (h === 'source') rowObj[h] = (meta && meta.source) ? meta.source : 'calendar';
    else if (h === 'status') rowObj[h] = (meta && meta.status) ? meta.status : 'freebusy';
    else if (h === 'title') rowObj[h] = calendarEvent.getTitle ? (calendarEvent.getTitle() || '') : '';
    else if (h === 'service_id') rowObj[h] = (meta && meta.service_id) ? meta.service_id : '';
    else if (h === 'start_iso') rowObj[h] = toLocalIso_(calendarEvent.getStartTime(), tz);
    else if (h === 'end_iso') rowObj[h] = toLocalIso_(calendarEvent.getEndTime(), tz);
    else if (h === 'location') rowObj[h] = calendarEvent.getLocation ? (calendarEvent.getLocation() || '') : '';
    else if (h === 'description') rowObj[h] = calendarEvent.getDescription ? (calendarEvent.getDescription() || '') : '';
    else if (h === 'capacity') rowObj[h] = (meta && meta.capacity) ? meta.capacity : '';
    else if (h === 'booking_id') rowObj[h] = (meta && meta.booking_id) ? meta.booking_id : '';
    else if (h === 'updated_at') rowObj[h] = new Date();
    else if (h === 'last_synced_at') rowObj[h] = new Date();
    else rowObj[h] = '';
  });

  const row = header.map(h => rowObj[h]);

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iEventId]) === String(eventId)) {
      sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);

  // Also, if the calendar event is a free/open slot, reflect into Availabilities
  try {
    if ((meta && String(meta.status || '').trim() === 'available') || String(rowObj['status'] || '').trim() === 'available') {
      // upsert availability with id = eventId
      upsertAvailabilityFromEvent_({
        availability_id: eventId,
        service_id: rowObj['service_id'] || '',
        title: rowObj['title'] || '',
        start_iso: rowObj['start_iso'] || '',
        end_iso: rowObj['end_iso'] || '',
        capacity: rowObj['capacity'] || '',
        status: 'available',
        source: 'calendar'
      });
    }
  } catch (_) {}
}

function markEventCanceledInEventsSheet_(eventId) {
  if (!eventId) return;
  const sheet = ensureEventsSheet_();

  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const idx = (name) => header.indexOf(name);

  const iEventId = idx('event_id');
  const iStatus = idx('status');
  const iUpdated = idx('updated_at');

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iEventId]) === String(eventId)) {
      sheet.getRange(r + 1, iStatus + 1).setValue('canceled');
      sheet.getRange(r + 1, iUpdated + 1).setValue(new Date());
      // archive corresponding availability
      try { archiveAvailabilityForEvent_(eventId); } catch (_) {}
      return;
    }
  }

  // append a row aligned to current header order (safe when columns are extended)
  const rowObj = {};
  header.forEach(h => {
    if (h === 'event_id') rowObj[h] = eventId;
    else if (h === 'source') rowObj[h] = 'booking';
    else if (h === 'status') rowObj[h] = 'canceled';
    else if (h === 'updated_at' || h === 'last_synced_at') rowObj[h] = new Date();
    else rowObj[h] = '';
  });
  sheet.appendRow(header.map(h => rowObj[h]));
  try { archiveAvailabilityForEvent_(eventId); } catch (_) {}
}

/** Admin helper: normalize start_iso/end_iso formats across sheets (Events, Availabilities, Bookings)
 * This will parse existing values and rewrite them using toLocalIso_ (local 'YYYY-MM-DDTHH:mm') when possible.
 */
function adminNormalizeDateFormats() {
  assertAdminContext_();
  ensureBaseSheets_();
  const cfg = getRuntimeConfig_();
  const tz = cfg.TZ;
  const ss = getSS_();
  const res = { events: { updated: 0 }, availabilities: { updated: 0 }, bookings: { updated: 0 } };

  // Normalize Events
  try {
    const sh = ss.getSheetByName(cfg.SHEET_EVENTS);
    if (sh) {
      const vals = sh.getDataRange().getValues();
      if (vals.length >= 2) {
        const header = vals[0];
        const iStart = header.indexOf('start_iso');
        const iEnd = header.indexOf('end_iso');
        for (let r = 1; r < vals.length; r++) {
          let changed = false;
          const row = vals[r].slice();
          if (iStart >= 0) {
            const raw = String(row[iStart] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iStart] || '') !== norm) { row[iStart] = norm; changed = true; }
              }
            }
          }
          if (iEnd >= 0) {
            const raw = String(row[iEnd] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iEnd] || '') !== norm) { row[iEnd] = norm; changed = true; }
              }
            }
          }
          if (changed) {
            try { sh.getRange(r+1, 1, 1, row.length).setValues([row]); res.events.updated++; } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}

  // Normalize Availabilities
  try {
    const sh = ss.getSheetByName(cfg.SHEET_AVAILABILITIES);
    if (sh) {
      const vals = sh.getDataRange().getValues();
      if (vals.length >= 2) {
        const header = vals[0];
        const iStart = header.indexOf('start_iso');
        const iEnd = header.indexOf('end_iso');
        for (let r = 1; r < vals.length; r++) {
          let changed = false;
          const row = vals[r].slice();
          if (iStart >= 0) {
            const raw = String(row[iStart] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iStart] || '') !== norm) { row[iStart] = norm; changed = true; }
              }
            }
          }
          if (iEnd >= 0) {
            const raw = String(row[iEnd] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iEnd] || '') !== norm) { row[iEnd] = norm; changed = true; }
              }
            }
          }
          if (changed) {
            try { sh.getRange(r+1, 1, 1, row.length).setValues([row]); res.availabilities.updated++; } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}

  // Normalize Bookings start_iso/end_iso
  try {
    const sh = ss.getSheetByName(cfg.SHEET_BOOKINGS);
    if (sh) {
      const vals = sh.getDataRange().getValues();
      if (vals.length >= 2) {
        const header = vals[0];
        const iStart = header.indexOf('start_iso');
        const iEnd = header.indexOf('end_iso');
        for (let r = 1; r < vals.length; r++) {
          let changed = false;
          const row = vals[r].slice();
          if (iStart >= 0) {
            const raw = String(row[iStart] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iStart] || '') !== norm) { row[iStart] = norm; changed = true; }
              }
            }
          }
          if (iEnd >= 0) {
            const raw = String(row[iEnd] || '').trim();
            if (raw) {
              const d = parseLocalIso_(raw.replace(/\s+/g,'T'));
              if (!isNaN(d.getTime())) {
                const norm = toLocalIso_(d, tz);
                if (String(row[iEnd] || '') !== norm) { row[iEnd] = norm; changed = true; }
              }
            }
          }
          if (changed) {
            try { sh.getRange(r+1, 1, 1, row.length).setValues([row]); res.bookings.updated++; } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}

  return { ok: true, updated: res };
}

/** =========================
 * App sheet (configurable name) helpers
 * ========================= */
function getAppSheetName_() {
  const props = PropertiesService.getScriptProperties();
  return String(props.getProperty(PROP_KEYS.APP_SHEET_NAME) || 'AppCalendar').trim();
}

function ensureAppSheetWithName_(name) {
  const ss = getSS_();
  const nm = String(name || getAppSheetName_() || 'AppCalendar');
  ensureSheetWithHeader_(ss, nm, [
    'event_id', 'title', 'start_iso', 'end_iso', 'status', 'source', 'description', 'booking_id', 'updated_at'
  ]);
  return ss.getSheetByName(nm);
}

function adminListSheets() {
  assertAdminContext_();
  const ss = getSS_();
  return ss.getSheets().map(s => s.getName());
}

function adminGetAppSheetName() {
  assertAdminContext_();
  return getAppSheetName_();
}

function adminSetAppSheetName(name) {
  assertAdminContext_();
  if (!name || String(name).trim().length === 0) throw new Error('sheet name required');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_KEYS.APP_SHEET_NAME, String(name).trim());
  return { ok: true, name: String(name).trim() };
}

function adminCreateAppCalendarSheet(name) {
  assertAdminContext_();
  const nm = name && String(name).trim() ? String(name).trim() : getAppSheetName_();
  ensureAppSheetWithName_(nm);
  return { ok: true, name: nm };
}

function adminExportEventsToAppSheet(name) {
  assertAdminContext_();
  const ss = getSS_();
  const cfg = getRuntimeConfig_();
  const evSh = ss.getSheetByName(cfg.SHEET_EVENTS);
  if (!evSh) return { ok: false, error: 'Events sheet not found' };
  const targetName = name && String(name).trim() ? String(name).trim() : getAppSheetName_();
  const target = ensureAppSheetWithName_(targetName);

  const evVals = evSh.getDataRange().getValues();
  if (evVals.length < 2) return { ok: true, created: 0, updated: 0 };
  const evHeader = evVals[0];
  const idx = (n) => evHeader.indexOf(n);

  const rows = [];
  for (let r = 1; r < evVals.length; r++) {
    const row = evVals[r];
    if (!row[idx('event_id')]) continue;
    rows.push([
      String(row[idx('event_id')] || ''),
      String(row[idx('title')] || ''),
      String(row[idx('start_iso')] || ''),
      String(row[idx('end_iso')] || ''),
      String(row[idx('status')] || ''),
      String(row[idx('source')] || ''),
      String(row[idx('description')] || ''),
      String(row[idx('booking_id')] || ''),
      row[idx('updated_at')] || new Date(),
    ]);
  }

  const tgtVals = target.getDataRange().getValues();
  const tgtHeader = tgtVals[0];
  const tgtIdx = (n) => tgtHeader.indexOf(n);
  const existing = new Map();
  for (let r = 1; r < tgtVals.length; r++) {
    const id = String(tgtVals[r][tgtIdx('event_id')] || '');
    if (id) existing.set(id, r + 1);
  }

  let created = 0, updated = 0;
  rows.forEach(rw => {
    const id = String(rw[0] || '');
    if (!id) return;
    if (existing.has(id)) {
      const rowNum = existing.get(id);
      target.getRange(rowNum, 1, 1, rw.length).setValues([rw]);
      updated++;
    } else {
      target.appendRow(rw);
      created++;
    }
  });

  return { ok: true, created: created, updated: updated, sheet: targetName };
}

function adminGetAppCalendar(startIso, endIso, name) {
  assertAdminContext_();
  // This function supports two modes:
  // 1) If a calendar ID is provided (or stored in APP_CALENDAR_ID), return events from that Google Calendar.
  // 2) Otherwise, treat `name` as a sheet name and return rows from the sheet (legacy behavior).
  const tz = getRuntimeConfig_().TZ;
  const start = parseLocalIso_(String(startIso || ''));
  const end = parseLocalIso_(String(endIso || ''));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('invalid range');

  // Determine calendar id candidate: explicit `name` that looks like an id, or stored APP_CALENDAR_ID
  const props = PropertiesService.getScriptProperties();
  const candidate = (name && String(name).trim()) || String(props.getProperty(PROP_KEYS.APP_CALENDAR_ID) || '').trim();

  // Try calendar mode first when candidate looks like an id or contains '@'
  if (candidate && candidate.indexOf('@') !== -1) {
    let calendarDebug = { tried: true, found: false, error: null, eventsCount: 0 };
    try {
      const cal = CalendarApp.getCalendarById(candidate);
      if (cal) {
        calendarDebug.found = true;
        const evs = cal.getEvents(start, end);
        calendarDebug.eventsCount = evs ? evs.length : 0;
        const out = evs.map(ev => ({
          id: ev.getId ? ev.getId() : ('c_' + Utilities.getUuid()),
          title: ev.getTitle ? ev.getTitle() : '',
          start_iso: toLocalIso_(ev.getStartTime(), tz),
          end_iso: toLocalIso_(ev.getEndTime(), tz),
          source: 'calendar',
          status: 'calendar',
          booking_id: '',
          description: ev.getDescription ? (ev.getDescription() || '') : '',
        }));
        return { ok: true, events: out, calendar: candidate, debug: { calendar: calendarDebug } };
      }
    } catch (err) {
      calendarDebug.error = String(err && err.message ? err.message : err);
      // continue to sheet mode but include debug info
      return { ok: true, events: [], calendar: candidate, debug: { calendar: calendarDebug } };
    }
  }

  // Sheet mode (legacy)
  const nm = name && String(name).trim() ? String(name).trim() : getAppSheetName_();
  const ss = getSS_();
  const sh = ss.getSheetByName(nm);
  if (!sh) return { ok: true, events: [], sheet: nm };

  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return { ok: true, events: [], sheet: nm };
  const header = vals[0];
  const idx = (n) => headerIndex_(header, n);
  const res = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const rawS = row[idx('start_iso')];
    const rawE = row[idx('end_iso')];
    let sd = null;
    if (rawS instanceof Date) sd = rawS;
    else {
      const s = String(rawS || '').trim();
      if (!s) continue;
      sd = parseLocalIso_(s);
    }
    if (isNaN(sd.getTime())) continue;
    let ed = null;
    if (rawE instanceof Date) ed = rawE;
    else {
      const e = String(rawE || '').trim();
      ed = e ? parseLocalIso_(e) : new Date(sd.getTime() + 60*60*1000);
    }
    if (sd.getTime() <= end.getTime() && ed.getTime() >= start.getTime()) {
      res.push({
        id: String(row[idx('event_id')] || ('a_' + Utilities.getUuid())),
        title: String(row[idx('title')]),
        start_iso: s,
        end_iso: e,
        source: String(row[idx('source')] || 'app'),
        status: String(row[idx('status')] || ''),
        booking_id: String(row[idx('booking_id')] || ''),
        description: String(row[idx('description')] || ''),
      });
    }
  }
  return { ok: true, events: res, sheet: nm };
}

/** Admin diagnostic: preview Events sheet contents for given spreadsheet (or bound one) */
function adminGetEventsPreview(spreadsheetId, sheetName, limit) {
  assertAdminContext_();
  try {
    const ss = spreadsheetId && String(spreadsheetId).trim() ? SpreadsheetApp.openById(String(spreadsheetId).trim()) : getSS_();
    const name = sheetName && String(sheetName).trim() ? String(sheetName).trim() : CFG_DEFAULT.SHEET_EVENTS;
    const sh = ss.getSheetByName(name);
    if (!sh) return { ok: false, error: 'sheet not found', spreadsheet_id: ss.getId(), sheet: name };
    const vals = sh.getDataRange().getValues();
    if (!vals || vals.length === 0) return { ok: true, spreadsheet_id: ss.getId(), sheet: name, header: [], rows: [] };
    const header = vals[0].map(c => (c === undefined ? '' : String(c)));
    const n = Math.max(1, Number(limit || 20));
    const rows = vals.slice(Math.max(1, vals.length - n)).map(r => r.map(c => (c === undefined ? '' : String(c))));
    return { ok: true, spreadsheet_id: ss.getId(), sheet: name, header: header, rows: rows, count: Math.max(0, vals.length - 1) };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** Admin: Normalize Events sheet header safely (backup + rehydrate) */
function adminNormalizeEventsSheet() {
  assertAdminContext_();
  const ss = getSS_();
  const sh = ss.getSheetByName(CFG_DEFAULT.SHEET_EVENTS);
  if (!sh) return { ok: false, error: 'Events sheet not found' };

  // Backup copy (prefixed name). Use uuid to avoid name conflict
  const backup = sh.copyTo(ss);
  const backupName = `Events_backup_${Utilities.getUuid().slice(0,8)}`;
  try { backup.setName(backupName); } catch (e) { /* ignore name conflict */ }

  const vals = sh.getDataRange().getValues();
  if (!vals || vals.length === 0) return { ok: false, error: 'Events sheet empty' };

  const header = vals[0].map(c => String(c || ''));

  const desired = ['event_id','source','status','title','service_id','start_iso','end_iso','location','description','capacity','booking_id','updated_at','last_synced_at'];

  // Build new matrix preserving existing row count
  const outHeader = desired.slice();
  const rows = vals.slice(1);
  const newRows = rows.map(r => new Array(desired.length).fill(''));

  const usedCols = new Set();
  // Fill desired columns from first matching existing column
  for (let i = 0; i < desired.length; i++) {
    const name = desired[i];
    const idx = header.indexOf(name);
    if (idx >= 0) {
      usedCols.add(idx);
      for (let rr = 0; rr < rows.length; rr++) {
        const row = rows[rr];
        newRows[rr][i] = row[idx];
      }
    }
  }

  // Collect extra columns (those not used in desired) and append them after desired columns
  const extraHeaders = [];
  const extraCols = [];
  for (let j = 0; j < header.length; j++) {
    if (usedCols.has(j)) continue;
    extraHeaders.push(header[j] || `col_${j+1}`);
    const colVals = rows.map(r => r[j]);
    extraCols.push(colVals);
  }

  // Prepare final header and rows
  const finalHeader = outHeader.concat(extraHeaders);
  const finalRows = newRows.map((r, i) => r.concat(extraCols.map(col => col[i] === undefined ? '' : col[i])));

  // Clear sheet and write back (safe because we made a backup)
  sh.clearContents();
  sh.getRange(1, 1, 1, finalHeader.length).setValues([finalHeader]);
  if (finalRows.length > 0) sh.getRange(2, 1, finalRows.length, finalHeader.length).setValues(finalRows);

  return { ok: true, backup: backupName, header: finalHeader, rows: finalRows.length };
}

/** =========================
 * App-specific calendar sheet (AppCalendar)
 * - Keeps a simplified mirror of `Events` sheet for this app's internal calendar
 * ========================= */
function ensureAppCalendarSheet_() {
  const ss = getSS_();
  const name = 'AppCalendar';
  ensureSheetWithHeader_(ss, name, [
    'event_id', 'title', 'start_iso', 'end_iso', 'status', 'source', 'description', 'booking_id', 'updated_at'
  ]);
  return ss.getSheetByName(name);
}

// Duplicate no-arg helpers removed in favor of the single flexible implementations:
// - adminCreateAppCalendarSheet(name)
// - adminExportEventsToAppSheet(name)
// These earlier functions accept an optional `name` and are preferred to avoid duplicate definitions.


/** Admin: list events from AppCalendar sheet */
function adminListAppCalendarEvents(limit) {
  assertAdminContext_();
  const sheet = ensureAppCalendarSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const idx = (name) => header.indexOf(name);
  const res = [];
  limit = Number(limit || 500);
  for (let r = 1; r < values.length && res.length < limit; r++) {
    const row = values[r];
    if (!row[idx('event_id')]) continue;
    res.push({
      event_id: String(row[idx('event_id')] || ''),
      title: String(row[idx('title')] || ''),
      start_iso: String(row[idx('start_iso')] || ''),
      end_iso: String(row[idx('end_iso')] || ''),
      status: String(row[idx('status')] || ''),
      source: String(row[idx('source')] || ''),
      description: String(row[idx('description')] || ''),
      booking_id: String(row[idx('booking_id')] || ''),
      updated_at: row[idx('updated_at')] || '',
    });
  }
  return res;
}

/** Admin: list available calendars the script can access */
function adminListCalendars() {
  assertAdminContext_();
  const cals = CalendarApp.getAllCalendars();
  try {
    const out = (cals || []).map(c => ({ id: String(c.getId() || ''), name: String(c.getName() || '') }));
    // ensure default calendar included
    try {
      const def = CalendarApp.getDefaultCalendar && CalendarApp.getDefaultCalendar();
      if (def) {
        const defId = String(def.getId() || '');
        if (defId && !out.some(x => x.id === defId)) {
          out.unshift({ id: defId, name: String(def.getName() || '(default)') });
        }
      }
    } catch (e) {
      // ignore
    }
    // dedupe and sort
    const seen = Object.create(null);
    const uniq = [];
    for (const o of out) {
      if (!o || !o.id) continue;
      if (seen[o.id]) continue;
      seen[o.id] = true;
      uniq.push(o);
    }
    uniq.sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')));
    return uniq;
  } catch (err) {
    return [];
  }
}

function getAppCalendarId_() {
  const props = PropertiesService.getScriptProperties();
  return String(props.getProperty(PROP_KEYS.APP_CALENDAR_ID) || '').trim();
}

function adminGetAppCalendarId() {
  assertAdminContext_();
  return getAppCalendarId_();
}

function adminSetAppCalendarId(id) {
  assertAdminContext_();
  if (!id || String(id).trim().length === 0) throw new Error('calendar id required');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_KEYS.APP_CALENDAR_ID, String(id).trim());
  return { ok: true, id: String(id).trim() };
}

/** Admin: export Events sheet -> specified Google Calendar (upsert by event_id) */
function adminExportEventsToAppCalendar(calendarId) {
  assertAdminContext_();
  const cfg = getRuntimeConfig_();
  const ss = getSS_();
  const eventsSheet = ss.getSheetByName(cfg.SHEET_EVENTS);
  if (!eventsSheet) return { ok: false, error: 'Events sheet not found' };
  // ensure availabilities sheet exists for admin
  ensureAvailabilitiesSheet_();

  const calId = calendarId && String(calendarId).trim() ? String(calendarId).trim() : getAppCalendarId_();
  if (!calId) throw new Error('calendar id required');
  let cal;
  try { cal = CalendarApp.getCalendarById(calId); } catch (err) { cal = null; }
  if (!cal) return { ok: false, error: 'calendar not found' };

  const evVals = eventsSheet.getDataRange().getValues();
  if (evVals.length < 2) return { ok: true, created: 0, updated: 0 };

  const evHeader = evVals[0];
  const idx = (n) => evHeader.indexOf(n);

  let created = 0, updated = 0;
  for (let r = 1; r < evVals.length; r++) {
    const row = evVals[r];
    const eId = String(row[idx('event_id')] || '').trim();
    const title = String(row[idx('title')] || '');
    const rawS = row[idx('start_iso')];
    let sd = null;
    if (rawS instanceof Date) sd = rawS;
    else {
      const s = String(rawS || '').trim();
      if (!s) continue;
      sd = parseLocalIso_(s);
    }
    if (isNaN(sd.getTime())) continue;
    const rawE = row[idx('end_iso')];
    let ed = null;
    if (rawE instanceof Date) ed = rawE;
    else {
      const edStr = String(rawE || '').trim();
      ed = edStr ? parseLocalIso_(edStr) : new Date(sd.getTime() + 60*60*1000);
    }
    const desc = String(row[idx('description')] || '');

    if (isNaN(sd.getTime())) continue;

    try {
      let evObj = null;
      if (eId) {
        try { evObj = cal.getEventById(eId); } catch (_) { evObj = null; }
      }
      if (evObj) {
        // update
        try {
          evObj.setTitle(title);
          evObj.setTime(sd, ed);
          evObj.setDescription(desc);
          updated++;
        } catch (_) {}
      } else {
        // create
        try {
          const nev = cal.createEvent(title, sd, ed, { description: desc });
          const newId = nev.getId ? nev.getId() : '';
          if (newId) {
            // write back new id to Events sheet for future upserts
            const header = evHeader;
            const iEventId = header.indexOf('event_id');
            if (iEventId >= 0) eventsSheet.getRange(r + 1, iEventId + 1).setValue(newId);
          }
          created++;
        } catch (err) {
          // ignore single failures
        }
      }
    } catch (_) {
      // ignore per-row errors
    }
  }

  return { ok: true, created: created, updated: updated, calendar: calId };
}

// adminGetAppCalendar is implemented earlier with support for calendar ID or sheet.

/** =========================
 * Calendar deletion helper
 * ========================= */
function deleteCalendarEventSafely_(calendarId, eventId, bookingId) {
  let cal = null;
  if (calendarId && String(calendarId).trim()) {
    try { cal = CalendarApp.getCalendarById(calendarId); } catch (_) { cal = null; }
  }
  if (!cal) {
    try { cal = CalendarApp.getDefaultCalendar && CalendarApp.getDefaultCalendar(); } catch (_) { cal = null; }
  }
  if (!cal) return false;

  // 1) eventIdで削除
  try {
    const ev = cal.getEventById(eventId);
    if (ev) {
      ev.deleteEvent();
      return true;
    }
  } catch (_) {}

  // 2) 代替: BOOKING_ID を含む description を探す
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

    const evs = cal.getEvents(from, to);
    const needle = `BOOKING_ID: ${String(bookingId || '').trim()}`;

    for (const ev of evs) {
      const desc = ev.getDescription ? (ev.getDescription() || '') : '';
      if (desc.includes(needle)) {
        ev.deleteEvent();
        return true;
      }
    }
  } catch (_) {}

  return false;
}

/** =========================
 * Utils
 * ========================= */
function parseWeekdays_(s) {
  const set = new Set();
  String(s || '').split(',').map(x => x.trim()).filter(Boolean).forEach(x => set.add(Number(x)));
  return set;
}

function parseTimeWindows_(s) {
  const parts = String(s || '').split('|').map(x => x.trim()).filter(Boolean);
  const res = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const sh = Number(m[1]), sm = Number(m[2]), eh = Number(m[3]), em = Number(m[4]);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin > startMin) res.push({ startMin, endMin });
  }
  return res;
}

function startOfDay_(date, tz) {
  const y = Number(Utilities.formatDate(date, tz, 'yyyy'));
  const mo = Number(Utilities.formatDate(date, tz, 'MM'));
  const d = Number(Utilities.formatDate(date, tz, 'dd'));
  return new Date(`${y}-${pad2_(mo)}-${pad2_(d)}T00:00:00`);
}

function isoWeekday_(date, tz) {
  return Number(Utilities.formatDate(date, tz, 'u')); // Mon=1..Sun=7
}

function addDays_(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes_(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toLocalIso_(date, tz) {
  return Utilities.formatDate(date, tz, "yyyy-MM-dd'T'HH:mm");
}

function parseLocalIso_(iso) {
  // Parse an ISO-like string (e.g. "2026-02-03T09:00" or "2026-02-03 9:00")
  // and interpret it as local (no timezone) date/time.
  const s = String(iso || '').trim();
  if (!s) return new Date('Invalid');

  // Normalize separator to 'T' and ensure time is zero-padded
  let norm = s.replace(/\s+/, 'T').replace(/T(\d):/, 'T0$1:');
  // If seconds missing, allow both formats
  const m = norm.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    // If not matching the simple local pattern, try native Date parsing (handles timezone offsets/UTC)
    const d = new Date(norm.length === 16 ? (norm + ':00') : norm);
    if (!isNaN(d.getTime())) return d;
    return new Date('Invalid');
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = m[6] ? Number(m[6]) : 0;

  // Create date in the script's local timezone (Date constructor uses runtime zone)
  return new Date(year, month - 1, day, hour, min, sec);
}

function formatSlotLabel_(start, end, tz) {
  const d = Utilities.formatDate(start, tz, 'yyyy/MM/dd (E)');
  const s = Utilities.formatDate(start, tz, 'HH:mm');
  const e = Utilities.formatDate(end, tz, 'HH:mm');
  return `${d} ${s} - ${e}`;
}

function overlapsAny_(startMs, endMs, intervals) {
  for (const itv of intervals) {
    if (startMs < itv.end && endMs > itv.start) return true;
  }
  return false;
}

function escapeHtml_(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Render HTML file safely and return HtmlOutput
 * file: filename (without extension) in project
 * title: page title
 */
function safeHtmlOutput_(file, title) {
  try {
    const fname = String(file || CFG_DEFAULT.HTML_PUBLIC);
    const out = HtmlService.createHtmlOutputFromFile(fname).setTitle(String(title || ''));
    return out;
  } catch (err) {
    throw new Error('failed to render HTML file: ' + String(err && err.message ? err.message : err));
  }
}

/**
 * Returns the raw HTML content of `setup.html` as a string.
 * Useful as a fallback for clients that cannot navigate to the deployed webapp URL.
 */
function getSetupHtml() {
  try {
    const raw = HtmlService.createHtmlOutputFromFile('setup');
    return String(raw.getContent() || '');
  } catch (e) {
    return '<div style="padding:20px;font-family:sans-serif;color:#b91c1c;">failed to load setup.html: ' + (e && e.message ? e.message : String(e)) + '</div>';
  }
}

/**
 * Set X-Frame-Options safely on HtmlOutput
 * mode: 'ALLOWALL' or 'DEFAULT'
 */
function setXFrameSafe_(htmlOutput, mode) {
  try {
    if (!htmlOutput || typeof htmlOutput.setXFrameOptionsMode !== 'function') return htmlOutput;
    const m = String(mode || 'ALLOWALL').toUpperCase();
    if (m === 'ALLOWALL') htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    else htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    return htmlOutput;
  } catch (err) {
    return htmlOutput;
  }
}

/** Find index of a header name with tolerant matching.
 * Tries exact match, normalized match (lowercase, remove non-alphanum), and substring match.
 */
function headerIndex_(headerArr, name) {
  if (!headerArr || headerArr.length === 0) return -1;
  const want = String(name || '').trim();
  if (!want) return -1;
  // exact
  let idx = headerArr.indexOf(want);
  if (idx >= 0) return idx;
  // normalized exact
  const normWant = want.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let i = 0; i < headerArr.length; i++) {
    const h = String(headerArr[i] || '').trim();
    if (!h) continue;
    if (h === want) return i;
    const hn = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hn === normWant) return i;
  }
  // contains heuristics
  for (let i = 0; i < headerArr.length; i++) {
    const h = String(headerArr[i] || '').toLowerCase();
    if (h.indexOf(normWant) >= 0) return i;
  }
  // fragment match (e.g., look for 'start' when name='start_iso')
  const simple = normWant.replace(/iso$/, '');
  for (let i = 0; i < headerArr.length; i++) {
    const hn = String(headerArr[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hn.indexOf(simple) >= 0) return i;
  }
  return -1;
}

/** Infer which column index in a sheet likely contains datetime strings.
 * Scans up to first N rows and returns column index with most parsable datetimes.
 */
function inferDateColumn_(vals, maxRows) {
  if (!vals || vals.length < 1) return -1;
  const rows = Math.min(maxRows || 10, Math.max(1, vals.length - 1));
  const counts = [];
  const cols = vals[0].length;
  for (let c = 0; c < cols; c++) counts[c] = 0;
  for (let r = 1; r <= rows; r++) {
    const row = vals[r] || [];
    for (let c = 0; c < cols; c++) {
      const v = String(row[c] || '').trim();
      if (!v) continue;
      // normalize and try parse
      const tryStr = v.replace(/\s+/g, 'T').replace(/\//g, '-');
      const d = parseLocalIso_(tryStr);
      if (!isNaN(d.getTime())) counts[c]++;
    }
  }
  // select column with max count > 0
  let best = -1; let bestCnt = 0;
  for (let c = 0; c < counts.length; c++) {
    if (counts[c] > bestCnt) { best = c; bestCnt = counts[c]; }
  }
  return bestCnt > 0 ? best : -1;
}

/** Infer which column index likely contains numeric capacity values. */
function inferNumericColumn_(vals, maxRows, exclude) {
  if (!vals || vals.length < 1) return -1;
  const rows = Math.min(maxRows || 10, Math.max(1, vals.length - 1));
  const cols = vals[0].length;
  const counts = new Array(cols).fill(0);
  const skip = new Set((exclude || []).filter(v => v >= 0));
  for (let r = 1; r <= rows; r++) {
    const row = vals[r] || [];
    for (let c = 0; c < cols; c++) {
      if (skip.has(c)) continue;
      const v = String(row[c] || '').trim();
      if (!v) continue;
      const n = Number(v);
      if (!isNaN(n) && isFinite(n)) counts[c]++;
    }
  }
  let best = -1; let bestCnt = 0;
  for (let c = 0; c < counts.length; c++) {
    if (counts[c] > bestCnt) { best = c; bestCnt = counts[c]; }
  }
  return bestCnt > 0 ? best : -1;
}

/** Infer which column index likely contains status strings. */
function inferStatusColumn_(vals, maxRows, exclude) {
  if (!vals || vals.length < 1) return -1;
  const rows = Math.min(maxRows || 10, Math.max(1, vals.length - 1));
  const cols = vals[0].length;
  const counts = new Array(cols).fill(0);
  const skip = new Set((exclude || []).filter(v => v >= 0));
  const keys = ['available', 'confirmed', 'canceled', 'cancelled', 'freebusy', 'archived', 'calendar', 'キャンセル', 'キャンセル済み', '確定', '予約', '完了'];
  for (let r = 1; r <= rows; r++) {
    const row = vals[r] || [];
    for (let c = 0; c < cols; c++) {
      if (skip.has(c)) continue;
      const v = String(row[c] || '').trim().toLowerCase();
      if (!v) continue;
      if (keys.indexOf(v) >= 0) counts[c]++;
    }
  }
  let best = -1; let bestCnt = 0;
  for (let c = 0; c < counts.length; c++) {
    if (counts[c] > bestCnt) { best = c; bestCnt = counts[c]; }
  }
  return bestCnt > 0 ? best : -1;
}

/** Find first matching header index by multiple names */
function headerIndexByNames_(headerArr, names) {
  if (!headerArr || !names || names.length === 0) return -1;
  for (let i = 0; i < names.length; i++) {
    const idx = headerIndex_(headerArr, names[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Infer which column index likely contains event/availability IDs. */
function inferIdColumn_(vals, maxRows, exclude) {
  if (!vals || vals.length < 1) return -1;
  const rows = Math.min(maxRows || 10, Math.max(1, vals.length - 1));
  const cols = vals[0].length;
  const counts = new Array(cols).fill(0);
  const skip = new Set((exclude || []).filter(v => v >= 0));
  const re = /^(m_|e_|a_|b_|s_)/i;
  for (let r = 1; r <= rows; r++) {
    const row = vals[r] || [];
    for (let c = 0; c < cols; c++) {
      if (skip.has(c)) continue;
      const v = String(row[c] || '').trim();
      if (!v) continue;
      if (re.test(v)) counts[c]++;
    }
  }
  let best = -1; let bestCnt = 0;
  for (let c = 0; c < counts.length; c++) {
    if (counts[c] > bestCnt) { best = c; bestCnt = counts[c]; }
  }
  return bestCnt > 0 ? best : -1;
}

/** Infer a column that likely contains titles (text) */
function inferTitleColumn_(vals, maxRows, exclude) {
  if (!vals || vals.length < 1) return -1;
  const rows = Math.min(maxRows || 10, Math.max(1, vals.length - 1));
  const cols = vals[0].length;
  const scores = new Array(cols).fill(0);
  const skip = new Set((exclude || []).filter(v => v >= 0));
  for (let r = 1; r <= rows; r++) {
    const row = vals[r] || [];
    for (let c = 0; c < cols; c++) {
      if (skip.has(c)) continue;
      const v = String(row[c] || '').trim();
      if (!v) continue;
      const tryDate = parseLocalIso_(v.replace(/\s+/g, 'T').replace(/\//g, '-'));
      const n = Number(v);
      if (!isNaN(tryDate.getTime())) continue;
      if (!isNaN(n) && isFinite(n)) continue;
      scores[c] += Math.min(v.length, 30);
    }
  }
  let best = -1; let bestScore = 0;
  for (let c = 0; c < scores.length; c++) {
    if (scores[c] > bestScore) { best = c; bestScore = scores[c]; }
  }
  return bestScore > 0 ? best : -1;
}

/**
 * 画像をポータルにアップロードする。
 * @param {Object} data { endpoint, imageData }
 * @return {Object} { ok, result }
 */
function adminUploadImage(data) {
  try {
    var endpoint = String(data.endpoint || '').trim();
    var imageData = String(data.imageData || '').trim();

    if (!endpoint) return { ok: false, error: 'エンドポイントが指定されていません' };
    if (!imageData) return { ok: false, error: '画像データが指定されていません' };

    // 保存済みのシークレットを取得
    var props = PropertiesService.getScriptProperties();
    var secret = String(props.getProperty(PROP_KEYS.PORTAL_ADMIN_SECRET) || '').trim();

    if (!secret) return { ok: false, error: 'Admin Secret が設定されていません（Step 1で設定してください）' };

    var payload = {
      image: imageData
    };

    var resp = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var code = resp.getResponseCode();
    var body = resp.getContentText();

    console.log('[adminUploadImage] response ' + code + ': ' + body.substring(0, 500));

    if (code >= 200 && code < 300) {
      try {
        var result = JSON.parse(body);
        return { ok: true, result: result };
      } catch (_) {
        return { ok: true, result: { ok: true } };
      }
    } else {
      var errDetail = 'アップロード失敗 (' + code + ')';
      try {
        var errJson = JSON.parse(body);
        if (errJson.error) errDetail += ': ' + errJson.error;
      } catch (_) {
        errDetail += ': ' + body.substring(0, 200);
      }
      return { ok: false, error: errDetail };
    }
  } catch (e) {
    console.error('[adminUploadImage] error:', e);
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}
