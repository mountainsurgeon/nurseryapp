/**
 * Nursery Log watch bridge (Google Apps Script web app).
 * The Apple Shortcut on iPhone / Apple Watch / Siri calls this script's /exec
 * link. It writes into the same Firestore database as the app and answers with
 * a short text reply (for example "Logged a wet diaper at 3:12 AM.").
 *
 * Setup
 *   1. Fill in the four settings below.
 *   2. Project Settings (gear) > Script properties > add WATCH_PASSWORD =
 *      the watch account's password.
 *   3. Run testStatus once and approve the permissions.
 *   4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   Later changes: Deploy > Manage deployments > pencil > Version: New version,
 *   so the /exec link stays the same.
 */

// ===== Settings: fill these in =====
// From your Firebase web app config (Project settings > General > Your apps):
var PROJECT = 'REPLACE_ME';                 // projectId
var API_KEY = 'REPLACE_ME';                 // apiKey
// The extra Firebase account you created for the watch (Authentication > Users):
var WATCH_EMAIL = 'watch@example.com';
// A random code of 20+ letters and digits that you make up. The shortcut link
// must include it as k=..., so nobody can use this script without it.
var SHORTCUT_KEY = 'REPLACE_ME';
// ===== End of settings =====

var TZ = Session.getScriptTimeZone() || 'America/New_York';
var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
var MIN = 60000, HOUR = 3600000, DAY = 86400000;

/* ---------------- entry point ---------------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var setup = setupProblem();
  if (setup) return reply(setup);
  if (p.k !== SHORTCUT_KEY) return reply('That link is missing the right key. Check the k= part of the shortcut URL.');
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    return reply(handle(p));
  } catch (err) {
    return reply('Something went wrong: ' + (err && err.message ? err.message : err));
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function setupProblem() {
  if (/REPLACE/i.test(PROJECT) || /REPLACE/i.test(API_KEY)) return 'Setup isn\'t finished: fill in PROJECT and API_KEY at the top of the script, then deploy a new version.';
  if (/REPLACE/i.test(SHORTCUT_KEY) || String(SHORTCUT_KEY).length < 16) return 'Setup isn\'t finished: set SHORTCUT_KEY at the top of the script to a random code of 20+ letters and digits, then deploy a new version.';
  return '';
}

function reply(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}

function parseAction(raw) {
  var s = String(raw || '').toLowerCase().replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  var m = /bottle\s*([\d.,]+)/.exec(s);
  if (m) return { a: 'bottle', v: parseFloat(m[1].replace(',', '.')) };
  if (/^bottle/.test(s)) return { a: 'bottle', v: null };
  if (/status|how|summary/.test(s)) return { a: 'status' };
  if (/resume|unpause|continue|restart/.test(s)) return { a: 'resume' };
  if (/pause/.test(s)) return { a: 'pause' };
  if (/switch/.test(s)) return { a: 'switch' };
  if (/done|finish|stop nurs/.test(s)) return { a: 'done' };
  if (/nurse ?l|left/.test(s)) return { a: 'nurseL' };
  if (/nurse ?r|right/.test(s)) return { a: 'nurseR' };
  if (/woke|wake|awake/.test(s)) return { a: 'wake' };
  if (/asleep|sleep|nap/.test(s)) return { a: 'sleep' };
  if (/both|mixed|wet.*dirty|dirty.*wet/.test(s)) return { a: 'diaper', kind: 'mixed' };
  if (/dirty|poop/.test(s)) return { a: 'diaper', kind: 'dirty' };
  if (/wet|pee/.test(s)) return { a: 'diaper', kind: 'wet' };
  if (/dry/.test(s)) return { a: 'diaper', kind: 'dry' };
  return { a: 'unknown', raw: s };
}

function handle(p) {
  var who = String(p.w || '').trim().slice(0, 40);
  var act = parseAction(p.a);
  if (act.a === 'bottle' && act.v == null && p.v != null) act.v = parseFloat(String(p.v).replace(',', '.'));
  if (act.a === 'unknown') return "I didn't recognize \"" + (act.raw || '') + '". Try Wet diaper, Bottle 4 oz, Fell asleep, Woke up, Nurse left, Pause nursing, Resume nursing, Done nursing, or Status.';

  var baby = defaultBaby();
  if (!baby) return 'No baby is set up yet. Add one in the Nursery Log app first.';
  var now = Date.now();

  switch (act.a) {
    case 'status': return statusText(baby);
    case 'diaper': return logDiaper(baby, who, act.kind, now);
    case 'bottle': return logBottle(baby, who, act.v, now);
    case 'sleep': return startSleep(baby, who, now);
    case 'wake': return wakeUp(baby, who, now);
    case 'nurseL': return nurseSide(baby, who, 'L', now);
    case 'nurseR': return nurseSide(baby, who, 'R', now);
    case 'switch': return nurseSwitch(baby, who, now);
    case 'pause': return nursePause(baby, who, now);
    case 'resume': return nurseResume(baby, who, now);
    case 'done': return nurseDone(baby, who, now);
  }
  return 'Nothing to do.';
}

/* ---------------- actions ---------------- */

var DIAPER_LABEL = { wet: 'wet', dirty: 'dirty', mixed: 'wet + dirty', dry: 'dry' };

function logDiaper(baby, who, kind, now) {
  writeEntry(newEntry(baby, who, 'diaper', now, now, { kind: kind, color: null, cons: null, rash: false }));
  return 'Logged a ' + DIAPER_LABEL[kind] + ' diaper at ' + clock(now) + '.';
}

function logBottle(baby, who, amt, now) {
  if (!(amt > 0)) return 'How much? Use an item like "Bottle 4 oz".';
  var settings = getDoc('settings/family') || {};
  var unit = settings.units === 'metric' ? 'ml' : 'oz';
  var recent = recentEntries(baby.id, now - 7 * DAY);
  var lastBottle = first(recent, ['bottle']);
  var milk = lastBottle && lastBottle.d && lastBottle.d.milk ? lastBottle.d.milk : 'breast';
  writeEntry(newEntry(baby, who, 'bottle', now, now, { amt: amt, u: unit, milk: milk }));
  return 'Logged a ' + trimNum(amt) + ' ' + unit + ' bottle (' + (milk === 'formula' ? 'formula' : milk === 'breast' ? 'breast milk' : milk) + ') at ' + clock(now) + '.';
}

function startSleep(baby, who, now) {
  var key = 'sleep~' + baby.id;
  var t = getDoc('timers/' + key);
  if (t) return 'Already asleep since ' + clock(t.a) + ' (' + dur(now - t.a) + ').';
  setDoc('timers/' + key, { kind: 'sleep', baby: baby.id, id: newId(), a: now, by: null, wk: 'watch', w: who, u: now });
  return 'Sleep timer started at ' + clock(now) + '. Choose "Woke up" when they wake.';
}

function wakeUp(baby, who, now) {
  var key = 'sleep~' + baby.id;
  var t = getDoc('timers/' + key);
  if (!t) return 'No sleep timer is running. Choose "Fell asleep" to start one.';
  var e = {
    id: t.id || newId(), baby: baby.id, type: 'sleep', t: t.a, end: now, d: {}, note: '',
    by: t.by || null, wk: t.wk || 'watch', w: t.w || who, eb: null, u: now
  };
  writeEntry(e);
  deleteDoc('timers/' + key);
  return 'Woke up at ' + clock(now) + '. Slept ' + dur(now - t.a) + '.';
}

function nurseSide(baby, who, side, now) {
  var key = 'nurse~' + baby.id;
  var t = getDoc('timers/' + key);
  var name = side === 'L' ? 'left' : 'right';
  if (!t) {
    setDoc('timers/' + key, { kind: 'nurse', baby: baby.id, id: newId(), segs: [{ s: side, a: now, b: null }], by: null, wk: 'watch', w: who, u: now });
    return 'Nursing timer started on the ' + name + ' at ' + clock(now) + '.';
  }
  var segs = (t.segs || []).map(function (s) { return { s: s.s, a: s.a, b: s.b == null ? null : s.b }; });
  var last = segs[segs.length - 1];
  if (last && last.b == null && last.s === side) return 'Already nursing on the ' + name + ' (' + dur(nurseCalc(segs, now).total) + ' so far).';
  var wasPaused = !!(last && last.b != null);
  if (last && last.b == null) last.b = now;
  segs.push({ s: side, a: now, b: null });
  t.segs = segs; t.u = now;
  setDoc('timers/' + key, t);
  return wasPaused ? 'Resumed nursing on the ' + name + '.' : 'Switched to the ' + name + '.';
}

function nursePause(baby, who, now) {
  var key = 'nurse~' + baby.id;
  var t = getDoc('timers/' + key);
  if (!t || !t.segs || !t.segs.length) return 'No nursing timer is running.';
  var segs = t.segs.map(function (s) { return { s: s.s, a: s.a, b: s.b == null ? null : s.b }; });
  var last = segs[segs.length - 1];
  if (last.b != null) return 'Nursing is already paused (' + dur(nurseCalc(segs, now).total) + ' so far). Choose "Resume nursing" to continue.';
  last.b = now;
  t.segs = segs; t.u = now;
  setDoc('timers/' + key, t);
  return 'Paused nursing on the ' + (last.s === 'L' ? 'left' : 'right') + ' at ' + clock(now) + ', ' + dur(nurseCalc(segs, now).total) + ' so far.';
}

function nurseResume(baby, who, now) {
  var key = 'nurse~' + baby.id;
  var t = getDoc('timers/' + key);
  if (!t || !t.segs || !t.segs.length) return 'No nursing timer is running. Choose "Nurse left" or "Nurse right" to start one.';
  var segs = t.segs.map(function (s) { return { s: s.s, a: s.a, b: s.b == null ? null : s.b }; });
  var last = segs[segs.length - 1], name = last.s === 'L' ? 'left' : 'right';
  if (last.b == null) return 'Already nursing on the ' + name + ' (' + dur(nurseCalc(segs, now).total) + ' so far).';
  segs.push({ s: last.s, a: now, b: null });
  t.segs = segs; t.u = now;
  setDoc('timers/' + key, t);
  return 'Resumed nursing on the ' + name + '.';
}

function nurseSwitch(baby, who, now) {
  var t = getDoc('timers/nurse~' + baby.id);
  if (!t || !t.segs || !t.segs.length) return 'No nursing timer is running. Choose "Nurse left" or "Nurse right" to start one.';
  var last = t.segs[t.segs.length - 1];
  return nurseSide(baby, who, last.s === 'L' ? 'R' : 'L', now);
}

function nurseDone(baby, who, now) {
  var key = 'nurse~' + baby.id;
  var t = getDoc('timers/' + key);
  if (!t || !t.segs || !t.segs.length) return 'No nursing timer is running.';
  var c = nurseCalc(t.segs, now);
  if (c.total < 5000) { deleteDoc('timers/' + key); return 'That timer was under 5 seconds, so I discarded it.'; }
  var e = {
    id: t.id || newId(), baby: baby.id, type: 'nurse', t: t.segs[0].a, end: c.end,
    d: { L: Math.round(c.L), R: Math.round(c.R), last: c.side }, note: '',
    by: t.by || null, wk: t.wk || 'watch', w: t.w || who, eb: null, u: now
  };
  writeEntry(e);
  deleteDoc('timers/' + key);
  var parts = [];
  if (c.L) parts.push('L ' + dur(c.L));
  if (c.R) parts.push('R ' + dur(c.R));
  return 'Nursing saved: ' + dur(c.total) + ' (' + parts.join(', ') + '). Next side: ' + (c.side === 'L' ? 'right' : 'left') + '.';
}

function nurseCalc(segs, now) {
  var o = { L: 0, R: 0, total: 0, side: null, end: now };
  segs.forEach(function (s) { var end = s.b != null ? s.b : now; o[s.s] += end - s.a; });
  var last = segs[segs.length - 1];
  if (last) { o.side = last.s; o.end = last.b != null ? last.b : now; }
  o.total = o.L + o.R;
  return o;
}

/* ---------------- status ---------------- */

function statusText(baby) {
  var now = Date.now();
  var list = recentEntries(baby.id, now - 8 * DAY);
  var timers = {};
  listDocs('timers').forEach(function (d) { timers[d.id] = d.data; });
  var people = {};
  listDocs('people').forEach(function (d) { people[d.id] = d.data; });
  function whoOf(x) {
    if (!x) return '';
    if (x.by && people[x.by] && people[x.by].name) return String(people[x.by].name).split(' ')[0];
    return x.w || '';
  }
  function by(x) { var n = whoOf(x); return n ? ', ' + n : ''; }

  var lines = [];
  var nt = timers['nurse~' + baby.id], st = timers['sleep~' + baby.id];

  if (nt && nt.segs && nt.segs.length) {
    var c = nurseCalc(nt.segs, now), lastSeg = nt.segs[nt.segs.length - 1];
    lines.push((lastSeg.b == null ? 'Nursing now on the ' + (lastSeg.s === 'L' ? 'left' : 'right') : 'Nursing paused') + ', ' + dur(c.total) + ' so far (started ' + when(nt.segs[0].a, now) + by(nt) + ')');
  } else {
    var lf = first(list, ['nurse', 'bottle']);
    if (lf) {
      var what = lf.type === 'bottle' ? 'bottle ' + trimNum(lf.d.amt) + ' ' + (lf.d.u || '') : 'nursed ' + dur((lf.d.L || 0) + (lf.d.R || 0));
      lines.push('Last feed: ' + dur(now - lf.t) + ' ago, ' + what.trim() + ' (' + when(lf.t, now) + by(lf) + ')');
    } else lines.push('Last feed: none logged yet');
  }
  var ln = first(list, ['nurse']);
  if (ln && ln.d && ln.d.last && !nt) lines.push('Next side: ' + (ln.d.last === 'L' ? 'right' : 'left'));

  if (st) lines.push('Asleep ' + dur(now - st.a) + ' (since ' + when(st.a, now) + by(st) + ')');
  else {
    var ls = first(list, ['sleep']);
    if (ls) lines.push('Awake ' + dur(now - ls.end) + ' (woke ' + when(ls.end, now) + ')');
  }

  var ld = first(list, ['diaper']);
  if (ld) lines.push('Last diaper: ' + dur(now - ld.t) + ' ago, ' + (DIAPER_LABEL[ld.d.kind] || 'diaper') + ' (' + when(ld.t, now) + by(ld) + ')');
  var today = ymd(now), wet = 0, dirty = 0, feeds = 0;
  list.forEach(function (e) {
    if (ymd(e.t) !== today) return;
    if (e.type === 'diaper') { if (e.d.kind === 'wet' || e.d.kind === 'mixed') wet++; if (e.d.kind === 'dirty' || e.d.kind === 'mixed') dirty++; }
    if (e.type === 'nurse' || e.type === 'bottle') feeds++;
  });
  lines.push('Today: ' + feeds + ' feed' + (feeds === 1 ? '' : 's') + ', ' + wet + ' wet, ' + dirty + ' dirty');

  var seen = {};
  list.forEach(function (e) {
    if (e.type !== 'med' || now - e.t > DAY) return;
    var k = String(e.d.name || '').toLowerCase();
    if (seen[k]) return; seen[k] = 1;
    lines.push((e.d.name || 'Medicine') + ': ' + dur(now - e.t) + ' ago (' + when(e.t, now) + by(e) + ')');
  });
  return lines.join('\n');
}

/* ---------------- data helpers ---------------- */

function defaultBaby() {
  var babies = listDocs('babies');
  if (!babies.length) return null;
  babies.sort(function (a, b) { return (a.data.created || 0) - (b.data.created || 0); });
  return { id: babies[0].id, name: babies[0].data.name || 'Baby' };
}

function newId() { return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function newEntry(baby, who, type, t, end, d) {
  var now = Date.now();
  return { id: newId(), baby: baby.id, type: type, t: t, end: end, d: d, note: '', by: null, wk: 'watch', w: who, eb: null, u: now };
}

// Same storage layout as the app: logs/<monday>~<writer> with entries.<id> = JSON string.
function writeEntry(e) {
  var week = weekKey(e.t), docId = week + '~watch';
  var entries = {}; entries[e.id] = JSON.stringify(e);
  var mask = ['week', 'by', 'wk', 'u', 'entries.' + e.id];
  patchDoc('logs/' + docId, { week: week, by: null, wk: 'watch', u: Date.now(), entries: entries }, mask);
}

function recentEntries(babyId, sinceMs) {
  var docs = runQuery('logs', 'week', 'GREATER_THAN_OR_EQUAL', weekKey(sinceMs));
  var m = {};
  docs.forEach(function (d) {
    var ents = d.data.entries || {};
    Object.keys(ents).forEach(function (k) {
      var e;
      try { e = typeof ents[k] === 'string' ? JSON.parse(ents[k]) : ents[k]; } catch (x) { return; }
      if (!e || !e.id) return;
      var p = m[e.id];
      if (!p || e.u > p.u || (e.u === p.u && p.del && !e.del)) m[e.id] = e;
    });
  });
  var list = [];
  Object.keys(m).forEach(function (k) {
    var e = m[k];
    if (e.del || e.baby !== babyId) return;
    if (!e.d) e.d = {};
    if (e.end == null) e.end = e.t;
    list.push(e);
  });
  list.sort(function (a, b) { return b.t - a.t; });
  return list;
}

function first(list, types) {
  for (var i = 0; i < list.length; i++) if (types.indexOf(list[i].type) >= 0) return list[i];
  return null;
}

/* ---------------- Firestore REST ---------------- */

function token() {
  var cache = CacheService.getScriptCache();
  var t = cache.get('idToken');
  if (t) return t;
  var pw = PropertiesService.getScriptProperties().getProperty('WATCH_PASSWORD');
  if (!pw) throw new Error('Add the WATCH_PASSWORD script property (Project Settings → Script properties).');
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ email: WATCH_EMAIL, password: pw, returnSecureToken: true })
  });
  var j = JSON.parse(r.getContentText() || '{}');
  if (!j.idToken) {
    var msg = j.error && j.error.message ? j.error.message : 'HTTP ' + r.getResponseCode();
    throw new Error('the watch account could not sign in (' + msg + '). Check the email in Firebase and the WATCH_PASSWORD property.');
  }
  cache.put('idToken', j.idToken, 3000);
  return j.idToken;
}

function api(method, path, body, query) {
  var url = BASE + path + (query ? '?' + query : '');
  var opt = { method: method, headers: { Authorization: 'Bearer ' + token() }, muteHttpExceptions: true };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var r = UrlFetchApp.fetch(url, opt);
  var code = r.getResponseCode(), txt = r.getContentText();
  if (code === 404 && method === 'get') return null;
  if (code === 401) { CacheService.getScriptCache().remove('idToken'); }
  if (code === 403) throw new Error('the database refused the watch account. Add ' + WATCH_EMAIL + ' to the email list in your Firestore rules and click Publish.');
  if (code >= 300) throw new Error('Firestore said ' + code + ': ' + String(txt).slice(0, 160));
  return txt ? JSON.parse(txt) : {};
}

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return (Math.floor(v) === v && Math.abs(v) < 9e15) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Object.prototype.toString.call(v) === '[object Array]') return { arrayValue: { values: v.map(enc) } };
  var f = {};
  Object.keys(v).forEach(function (k) { f[k] = enc(v[k]); });
  return { mapValue: { fields: f } };
}

function dec(x) {
  if (!x) return null;
  if ('nullValue' in x) return null;
  if ('booleanValue' in x) return x.booleanValue;
  if ('integerValue' in x) return Number(x.integerValue);
  if ('doubleValue' in x) return x.doubleValue;
  if ('stringValue' in x) return x.stringValue;
  if ('timestampValue' in x) return x.timestampValue;
  if ('arrayValue' in x) return (x.arrayValue.values || []).map(dec);
  if ('mapValue' in x) {
    var o = {}, f = x.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { o[k] = dec(f[k]); });
    return o;
  }
  return null;
}

function toFields(obj) { var f = {}; Object.keys(obj).forEach(function (k) { f[k] = enc(obj[k]); }); return f; }
function fromDoc(d) { var o = {}, f = d.fields || {}; Object.keys(f).forEach(function (k) { o[k] = dec(f[k]); }); return o; }
function idOf(d) { return String(d.name).split('/').pop(); }

function getDoc(path) { var d = api('get', '/' + path); return d ? fromDoc(d) : null; }
function setDoc(path, obj) { api('patch', '/' + path, { fields: toFields(obj) }); }
function patchDoc(path, obj, mask) {
  var q = mask.map(function (f) { return 'updateMask.fieldPaths=' + encodeURIComponent(f); }).join('&');
  api('patch', '/' + path, { fields: toFields(obj) }, q);
}
function deleteDoc(path) { api('delete', '/' + path); }
function listDocs(col) {
  var out = [], pageToken = '';
  do {
    var j = api('get', '/' + col, null, 'pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''));
    ((j && j.documents) || []).forEach(function (d) { out.push({ id: idOf(d), data: fromDoc(d) }); });
    pageToken = j && j.nextPageToken;
  } while (pageToken);
  return out;
}
function runQuery(col, field, op, value) {
  var j = api('post', ':runQuery', { structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: op, value: enc(value) } } } });
  return (j || []).filter(function (r) { return r.document; }).map(function (r) { return { id: idOf(r.document), data: fromDoc(r.document) }; });
}

/* ---------------- time helpers ---------------- */

function ymd(ms) { return Utilities.formatDate(new Date(ms), TZ, 'yyyy-MM-dd'); }
function weekKey(ms) {
  var dow = Number(Utilities.formatDate(new Date(ms), TZ, 'u')); // 1 = Monday … 7 = Sunday
  var noon = Utilities.parseDate(ymd(ms) + ' 12:00', TZ, 'yyyy-MM-dd HH:mm').getTime();
  return ymd(noon - (dow - 1) * DAY);
}
function clock(ms) { return Utilities.formatDate(new Date(ms), TZ, 'h:mm a'); }
function when(ms, now) {
  var d = ymd(ms), t = ymd(now), y = ymd(now - DAY);
  if (d === t) return clock(ms);
  if (d === y) return 'yesterday ' + clock(ms);
  return Utilities.formatDate(new Date(ms), TZ, 'EEE h:mm a');
}
function dur(ms) {
  ms = Math.max(0, ms);
  if (ms < MIN) return Math.round(ms / 1000) + 's';
  var m = Math.round(ms / MIN), h = Math.floor(m / 60), r = m % 60;
  return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm';
}
function trimNum(n) { return String(Number(Number(n).toFixed(2))); }

/** Run this once from the editor (select testStatus, click Run) to check the setup. */
function testStatus() {
  var setup = setupProblem();
  if (setup) { Logger.log(setup); return; }
  var baby = defaultBaby();
  Logger.log(baby ? statusText(baby) : 'No baby set up yet.');
}
