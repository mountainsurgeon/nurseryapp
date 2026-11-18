import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, collection as fsCollection, doc as fsDoc, query as fsQuery, where as fsWhere, limit as fsLimit, getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot as fsOnSnapshot } from 'firebase/firestore';

// Firebase settings come from site/config.js (window.NURSERY_LOG_FIREBASE).
const CFG = (typeof window !== 'undefined' && window.NURSERY_LOG_FIREBASE) || null;
const CONFIGURED = !!(CFG && CFG.apiKey && CFG.projectId && CFG.appId && !/REPLACE|PASTE|YOUR[_-]/i.test([CFG.apiKey, CFG.projectId, CFG.appId].join(' ')));

function wrapDocSnap(s){ return { id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata }; }
function wrapQuerySnap(q){ return { docs: q.docs.map(wrapDocSnap), size: q.size, empty: q.empty, metadata: q.metadata }; }

function firebaseBackend(){
  const app = initializeApp(CFG);
  let auth;
  try { auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }); }
  catch (e) { auth = initializeAuth(app, { persistence: browserLocalPersistence }); }
  let fdb;
  try { fdb = initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch (e) { fdb = initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: memoryLocalCache() }); }
  function q(path, cons){
    cons = cons || [];
    const ref = fsCollection(fdb, path);
    return {
      path,
      where: (f, op, v) => q(path, cons.concat([fsWhere(f, op, v)])),
      limit: (n) => q(path, cons.concat([fsLimit(n)])),
      get: () => getDocs(fsQuery(ref, ...cons)).then(wrapQuerySnap),
      onSnapshot: (next, err) => fsOnSnapshot(fsQuery(ref, ...cons), (s) => next(wrapQuerySnap(s)), (e) => err && err(e)),
      doc: (id) => d(path + '/' + id)
    };
  }
  function d(path){
    const ref = fsDoc(fdb, path);
    return {
      id: ref.id, path,
      get: () => getDoc(ref).then(wrapDocSnap),
      set: (data) => setDoc(ref, data),
      merge: (data) => setDoc(ref, data, { merge: true }),
      update: (data) => updateDoc(ref, data),
      delete: () => deleteDoc(ref),
      onSnapshot: (next, err) => fsOnSnapshot(ref, (s) => next(wrapDocSnap(s)), (e) => err && err(e))
    };
  }
  return {
    db: { collection: (p) => q(p), doc: (p) => d(p) },
    onAuth: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || '' } : null)),
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    reset: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth)
  };
}
const B = window.__mockBackend || (CONFIGURED ? firebaseBackend() : null);

(function(){
'use strict';
var MIN=6e4, HOUR=36e5, DAY=864e5;
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var LS={get:function(k,d){try{var v=localStorage.getItem('nl.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem('nl.'+k,JSON.stringify(v))}catch(e){}}};
function newId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function num(v){if(v==null||v==='')return null;var n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null}
function trim(n,dp){return String(Number(Number(n).toFixed(dp==null?1:dp)))}
function pad(n){return String(n).padStart(2,'0')}

/* ---------- dates ---------- */
function dayKey(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDay(k){var p=String(k).split('-').map(Number);return new Date(p[0],p[1]-1,p[2]).getTime()}
function startOfDay(ms){var d=new Date(ms);d.setHours(0,0,0,0);return d.getTime()}
function addDays(ms,n){var d=new Date(ms);d.setDate(d.getDate()+n);return d.getTime()}
function weekKey(ms){var d=new Date(startOfDay(ms));var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return dayKey(d.getTime())}
function fmtTime(ms){return new Date(ms).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function fmtDate(ms,o){return new Date(ms).toLocaleDateString([],o||{weekday:'short',month:'short',day:'numeric'})}
function fmtDur(ms){ms=Math.max(0,ms);if(ms<MIN)return Math.round(ms/1000)+'s';var m=Math.round(ms/MIN),h=Math.floor(m/60),r=m%60;return h?(h+'h'+(r?' '+r+'m':'')):r+'m'}
function fmtShort(ms){return fmtTime(ms).replace(/\s?([AaPp])\.?\s?[Mm]\.?$/,function(x,a){return a.toLowerCase()})}
function fmtDurHM(ms){ms=Math.max(0,ms);if(ms<MIN)return '<1m';var m=Math.floor(ms/MIN),h=Math.floor(m/60);return h?h+'h '+pad(m%60)+'m':(m%60)+'m'}
function fmtClock(ms){ms=Math.max(0,ms);var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?h+':'+pad(m)+':'+pad(x):pad(m)+':'+pad(x)}
function fmtAgo(ms){var d=Date.now()-ms;return d<MIN?'just now':fmtDurHM(d)+' ago'}
function toLocalInput(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function fromLocalInput(v){var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v||'');return m?new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5]).getTime():null}
function dayLabel(ms){var t=startOfDay(Date.now()),d=startOfDay(ms);if(d===t)return 'Today';if(d===addDays(t,-1))return 'Yesterday';return fmtDate(ms,{weekday:'long'})}
function overlap(a,b,c,d){return Math.max(0,Math.min(b,d)-Math.max(a,c))}

/* ---------- vocab ---------- */
var TYPES={
  nurse:{label:'Nursing',cat:'feed',icon:'nurse',sheet:'nurse'},
  bottle:{label:'Bottle',cat:'feed',icon:'bottle',sheet:'bottle'},
  pump:{label:'Pumping',cat:'pump',icon:'pump',sheet:'pump'},
  diaper:{label:'Diaper',cat:'diaper',icon:'diaper',sheet:'diaper'},
  sleep:{label:'Sleep',cat:'sleep',icon:'sleep',sheet:'sleep'},
  solids:{label:'Solids',cat:'solids',icon:'solids',sheet:'solids'},
  med:{label:'Medicine',cat:'health',icon:'med',sheet:'med'},
  temp:{label:'Temperature',cat:'health',icon:'temp',sheet:'temp'},
  symptom:{label:'Symptom',cat:'health',icon:'health',sheet:'health'},
  activity:{label:'Activity',cat:'activity',icon:'activity',sheet:'activity'},
  note:{label:'Note',cat:'note',icon:'note',sheet:'note'},
  growth:{label:'Growth',cat:'growth',icon:'growth',sheet:'growth',rec:true},
  vaccine:{label:'Vaccine',cat:'health',icon:'vaccine',sheet:'health',rec:true},
  visit:{label:'Doctor visit',cat:'health',icon:'visit',sheet:'health',rec:true},
  milestone:{label:'Milestone',cat:'milestone',icon:'milestone',sheet:'milestone',rec:true}
};
var MILK={breast:'Breast milk',formula:'Formula',mixed:'Mixed',other:'Other'};
var DIAPER={wet:'Wet',dirty:'Dirty',mixed:'Wet + dirty',dry:'Dry'};
var COLORS={yellow:['Yellow','#d9b23b'],green:['Green','#738f2c'],brown:['Brown','#7b5331'],black:['Black','#2a2320'],red:['Red','#b4382c'],pale:['Pale / white','#ede7d6']};
var CONS={runny:'Runny',seedy:'Seedy',soft:'Soft',formed:'Formed',hard:'Hard'};
var WHERE={crib:'Crib',bassinet:'Bassinet',arms:'Held',carrier:'Carrier',stroller:'Stroller',car:'Car seat',bed:'Our bed'};
var REACT={loved:'Loved it',liked:'Liked it',neutral:'Neutral',disliked:'Disliked'};
var PREP={puree:'Purée',mashed:'Mashed',steamed:'Steamed',roasted:'Roasted',raw:'Raw',finger:'Finger food'};
var METHOD={rectal:'Rectal',armpit:'Armpit',forehead:'Forehead',ear:'Ear',oral:'Oral'};
var SEV={mild:'Mild',moderate:'Moderate',severe:'Severe'};
var ACT={tummy:'Tummy time',bath:'Bath',skin:'Skin-to-skin',story:'Story time',outdoor:'Outdoors',play:'Play',massage:'Massage',other:'Other'};
var FOODS=['Avocado','Banana','Sweet potato','Carrot','Peas','Butternut squash','Apple','Pear','Oatmeal','Rice cereal','Peanut butter (thinned)','Egg','Yogurt','Chicken','Beef','Salmon','Broccoli','Green beans','Blueberries','Mango'];
var MEDS=['Acetaminophen (Tylenol)','Ibuprofen (Motrin)','Vitamin D drops','Iron drops','Simethicone (gas drops)','Amoxicillin','Saline drops'];
var SYMPTOMS=['Congestion','Cough','Fever','Rash','Spit-up','Vomiting','Diarrhea','Constipation','Fussiness','Jaundice','Teething','Eczema'];
var VACCINES=['Hep B','DTaP','Hib','IPV (polio)','PCV','Rotavirus','RSV antibody','Flu','COVID-19','MMR','Varicella','Hep A'];
var VISITS=['Newborn visit','First-week checkup','2-week checkup','1-month checkup','2-month checkup','4-month checkup','6-month checkup','9-month checkup','12-month checkup','Sick visit','Lactation consult'];
var MILESTONES=['First smile','Laughs','Holds head up','Rolls tummy to back','Rolls back to tummy','Sits without support','First tooth','Crawls','Pulls to stand','First steps','First word','Waves bye-bye','Sleeps through the night','First solid food'];
var FILTERS=[['all','All'],['feed','Feeding'],['sleep','Sleep'],['diaper','Diapers'],['pump','Pumping'],['health','Health'],['growth','Growth & milestones'],['activity','Activities'],['note','Notes']];
function inFilter(e,f){if(f==='all')return true;var c=TYPES[e.type].cat;if(f==='feed')return e.type==='nurse'||e.type==='bottle'||e.type==='solids';if(f==='growth')return c==='growth'||c==='milestone';return c===f}

var ICONS={
  nurse:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z"/>',
  bottle:'<path d="M10 2.8h4M10.6 2.8V5M13.4 2.8V5"/><path d="M8.6 5h6.8l1.1 3.6V19a2.2 2.2 0 0 1-2.2 2.2H9.7A2.2 2.2 0 0 1 7.5 19V8.6z"/><path d="M7.6 12h3.6M7.6 15.6h3.6"/>',
  pump:'<path d="M12 3.2c3.3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.7-6.8 6-11z"/><path d="M9.3 14.6a2.8 2.8 0 0 0 2.7 2.6"/>',
  diaper:'<path d="M3.5 6.5h17v3.2c0 5.1-3.8 8.3-8.5 8.3s-8.5-3.2-8.5-8.3z"/><path d="M8.2 6.5v1.8a3.8 3.8 0 0 0 7.6 0V6.5"/>',
  sleep:'<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/>',
  solids:'<path d="M12 3c-2 0-3.4 2-3.4 4.4S10 11.6 12 11.6s3.4-1.8 3.4-4.2S14 3 12 3z"/><path d="M12 11.6V21"/>',
  activity:'<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.6 2.4 3.6 5.2 3.6 8.2s-1 5.8-3.6 8.2M12 3.8C9.4 6.2 8.4 9 8.4 12s1 5.8 3.6 8.2"/>',
  med:'<path d="M8 3.5h8v3H8z"/><path d="M7 6.5h10v12.3a1.7 1.7 0 0 1-1.7 1.7H8.7A1.7 1.7 0 0 1 7 18.8z"/><path d="M12 10.5v5M9.5 13h5"/>',
  temp:'<path d="M10 4.8a2 2 0 0 1 4 0v8.9a4 4 0 1 1-4 0z"/><path d="M12 9v7.5"/>',
  health:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  vaccine:'<path d="M15 3.5l5.5 5.5M17.8 6.2l-9.6 9.6-3.4 1 1-3.4 9.6-9.6M11.2 8.3l4.5 4.5M7.3 16.7L3.5 20.5"/>',
  visit:'<path d="M8.5 3.5h7v3h-7z"/><path d="M8.5 5H6v15.5h12V5h-2.5"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/>',
  growth:'<path d="M4.2 16.8L16.8 4.2l3 3L7.2 19.8z"/><path d="M8.4 12.6l1.8 1.8M11 10l1.8 1.8M13.6 7.4l1.8 1.8"/>',
  milestone:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  note:'<path d="M4.5 19.5h4l10.6-10.6-4-4L4.5 15.5z"/><path d="M13.6 6.4l4 4"/>',
  today:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  history:'<path d="M5 6.5h14M5 12h14M5 17.5h9"/>',
  trends:'<path d="M4 19.5h16"/><path d="M6 16v-5M10.3 16V6.5M14.6 16v-3.5M18.9 16V9"/>',
  baby:'<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c.8-3.7 3.8-6 7.5-6s6.7 2.3 7.5 6"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  left:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  right:'<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  chev:'<path d="M9.5 6l6 6-6 6"/>',
  download:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'
};
function icon(n){return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||'')+'</svg>'}

/* ---------- state ---------- */
var S={
  db:null,uid:null,email:'',wk:null,people:{},peopleReady:false,askedWho:false,exportFile:null,offline:!navigator.onLine,
  status:'loading',canWrite:true,roMsg:'',subErr:'',
  babies:{},babiesReady:false,babyId:LS.get('baby',null),
  timers:{},records:{},settings:{units:'us'},
  live:{},older:{},olderWeeks:{},liveFrom:null,logsReady:false,ver:0,
  view:LS.get('view','today'),histDay:null,histFilter:'all',trendDays:7,
  names:{},who:LS.get('who',''),sheet:null,unsubs:[],logUnsub:null,curDay:dayKey(Date.now())
};
if(['today','history','trends','baby'].indexOf(S.view)<0)S.view='today';

function isUS(){return S.settings.units!=='metric'}
function volUnit(){return isUS()?'oz':'ml'}
function toMl(a,u){return u==='ml'?a:a*29.5735}
function convVol(a,from,to){if(a==null)return null;if(from===to)return a;return to==='ml'?Math.round(a*29.5735/5)*5:Number((a/29.5735).toFixed(1))}
function fmtVol(ml){return isUS()?trim(ml/29.5735,1)+' oz':Math.round(ml)+' ml'}
function fmtAmt(a,u){if(a==null)return '';return u===volUnit()?trim(a,u==='oz'?2:0)+' '+u:fmtVol(toMl(a,u))}
function fmtWeight(g){if(isUS()){var oz=g/28.349523,lb=Math.floor(oz/16),r=Math.round((oz-lb*16)*10)/10;if(r>=16){lb++;r=0}return lb+' lb '+trim(r,1)+' oz'}return trim(g/1000,2)+' kg'}
function fmtLen(cm){return isUS()?trim(cm/2.54,2)+' in':trim(cm,1)+' cm'}
function tempIn(v,from,to){return from===to?v:(to==='F'?v*9/5+32:(v-32)*5/9)}
function fmtTemp(v,u){var want=isUS()?'F':'C';return trim(tempIn(v,u,want),1)+' °'+want}
function pumpTotal(d){if(d.total!=null)return d.total;if(d.L==null&&d.R==null)return null;return (d.L||0)+(d.R||0)}

/* ---------- derived data ---------- */
var cache={ver:-1,list:[]};
function allEntries(){
  if(cache.ver===S.ver)return cache.list;
  var m={};
  function absorb(docs){for(var id in docs){var ents=(docs[id]&&docs[id].entries)||{};for(var k in ents){var e;try{e=typeof ents[k]==='string'?JSON.parse(ents[k]):Object.assign({},ents[k])}catch(x){continue}
    if(!e||!e.id||!TYPES[e.type])continue;var p=m[e.id];if(!p||e.u>p.u||(e.u===p.u&&p.del&&!e.del))m[e.id]=e}}}
  absorb(S.older);absorb(S.live);
  var list=[];for(var k in m){if(!m[k].del){var e=m[k];if(!e.d)e.d={};if(e.end==null)e.end=e.t;list.push(e)}}
  list.sort(function(a,b){return b.t-a.t});
  cache={ver:S.ver,list:list};return list;
}
function babyEntries(){var b=S.babyId;return allEntries().filter(function(e){return e.baby===b})}
function babyRecords(kind){var out=[];for(var id in S.records){var r=S.records[id];if(r.baby!==S.babyId)continue;if(kind&&r.kind!==kind)continue;if(!TYPES[r.kind])continue;
  out.push({id:id,type:r.kind,rec:true,date:r.date,t:parseDay(r.date),end:parseDay(r.date),d:r.d||{},note:r.note||'',by:r.by||null,wk:r.wk||null,w:r.w||'',baby:r.baby})}
  out.sort(function(a,b){return b.t-a.t});return out}
function lastOf(types){var l=babyEntries();for(var i=0;i<l.length;i++)if(types.indexOf(l[i].type)>=0)return l[i];return null}
function tk(kind){return kind+'~'+S.babyId}
function timer(kind){return S.timers[tk(kind)]||null}
function baby(){return S.babies[S.babyId]||null}
function nextSide(){var n=lastOf(['nurse']);if(!n||!n.d.last)return null;return n.d.last==='L'?'R':'L'}
function dayList(D0,D1){var out=babyEntries().filter(function(e){return e.t<D1&&Math.max(e.end,e.t)>=D0&&(e.t>=D0||e.type==='sleep')});
  babyRecords().forEach(function(r){if(r.t>=D0&&r.t<D1)out.push(r)});out.sort(function(a,b){return b.t-a.t});return out}
function dayTotals(D0,D1){
  var T={feeds:0,nurse:0,ml:0,bottles:0,wet:0,dirty:0,diapers:0,sleep:0,naps:0,pumpMl:0,solids:0,act:0};
  babyEntries().forEach(function(e){var inDay=e.t>=D0&&e.t<D1,d=e.d;
    if(e.type==='sleep'){var o=overlap(e.t,e.end,D0,D1);if(o>0){T.sleep+=o;if(inDay)T.naps++}return}
    if(!inDay)return;
    switch(e.type){
      case 'nurse':T.feeds++;T.nurse+=(d.L||0)+(d.R||0);break;
      case 'bottle':T.feeds++;T.bottles++;if(d.amt!=null)T.ml+=toMl(d.amt,d.u);break;
      case 'diaper':T.diapers++;if(d.kind==='wet'||d.kind==='mixed')T.wet++;if(d.kind==='dirty'||d.kind==='mixed')T.dirty++;break;
      case 'pump':var p=pumpTotal(d);if(p!=null)T.pumpMl+=toMl(p,d.u);break;
      case 'solids':T.solids++;break;
      case 'activity':T.act+=d.dur||0;break;
    }});
  var st=timer('sleep');if(st)T.sleep+=overlap(st.a,Date.now(),D0,D1);
  return T;
}
function personName(e){if(!e)return '';if((e.by&&e.by===S.uid)||(e.wk&&e.wk===S.wk))return 'You';var p=e.by&&S.people[e.by];if(p&&p.name)return String(p.name).split(' ')[0];return e.w||''}

function describe(e){
  var d=e.d||{},parts=[];
  switch(e.type){
    case 'nurse':var L=d.L||0,R=d.R||0;if(L)parts.push('L '+fmtDur(L));if(R)parts.push('R '+fmtDur(R));if(d.last)parts.push('ended on '+(d.last==='L'?'left':'right'));return {title:'Nursed '+fmtDur(L+R),sub:parts.join(' · ')};
    case 'bottle':return {title:'Bottle'+(d.amt!=null?' '+fmtAmt(d.amt,d.u):''),sub:MILK[d.milk]||''};
    case 'pump':var tot=pumpTotal(d);if(d.L!=null)parts.push('L '+fmtAmt(d.L,d.u));if(d.R!=null)parts.push('R '+fmtAmt(d.R,d.u));if(d.dur)parts.push(fmtDur(d.dur));return {title:'Pumped'+(tot!=null?' '+fmtAmt(tot,d.u):''),sub:parts.join(' · ')||'Add amounts'};
    case 'diaper':if(d.color&&COLORS[d.color])parts.push(COLORS[d.color][0]);if(d.cons)parts.push(CONS[d.cons]);if(d.rash)parts.push('Rash');return {title:'Diaper · '+(DIAPER[d.kind]||'—'),sub:parts.join(' · ')};
    case 'sleep':parts.push(fmtTime(e.t)+' – '+fmtTime(e.end));if(d.where)parts.push(WHERE[d.where]||d.where);return {title:'Slept '+fmtDur(e.end-e.t),sub:parts.join(' · ')};
    case 'solids':if(d.amt)parts.push(d.amt);if(d.react)parts.push(REACT[d.react]);if(d.prep)parts.push(PREP[d.prep]);if(d.allergy)parts.push('Possible reaction');return {title:'Solids · '+(d.food||'food'),sub:parts.join(' · ')};
    case 'med':return {title:(d.name||'Medicine')+(d.dose!=null?' '+trim(d.dose,2)+' '+(d.unit||''):''),sub:'Medicine'};
    case 'temp':return {title:'Temp '+(d.v!=null?fmtTemp(d.v,d.u):''),sub:METHOD[d.method]||''};
    case 'symptom':return {title:d.what||'Symptom',sub:['Symptom',SEV[d.sev]].filter(Boolean).join(' · ')};
    case 'activity':return {title:(ACT[d.act]||'Activity')+(d.dur?' '+fmtDur(d.dur):''),sub:''};
    case 'note':return {title:'Note',sub:''};
    case 'growth':if(d.g)parts.push(fmtWeight(d.g));if(d.cm)parts.push(fmtLen(d.cm)+' long');if(d.head)parts.push(fmtLen(d.head)+' head');return {title:'Growth check',sub:parts.join(' · ')};
    case 'vaccine':return {title:d.name||'Vaccine',sub:'Vaccine'};
    case 'visit':return {title:d.what||'Doctor visit',sub:['Doctor visit',d.who].filter(Boolean).join(' · ')};
    case 'milestone':return {title:d.name||'Milestone',sub:'Milestone'};
  }
  return {title:e.type,sub:''};
}
function ageText(birth){
  if(!birth)return '';
  var b=parseDay(birth),now=startOfDay(Date.now()),days=Math.round((now-b)/DAY);
  if(days<0)return 'Due in '+(-days)+' day'+(days===-1?'':'s');
  if(days===0)return 'Born today';
  if(days<14)return days+' day'+(days===1?'':'s')+' old';
  var bd=new Date(b),nd=new Date(now),months=(nd.getFullYear()-bd.getFullYear())*12+nd.getMonth()-bd.getMonth();if(nd.getDate()<bd.getDate())months--;
  if(months<3){var w=Math.floor(days/7),r=days%7;return w+' weeks'+(r?', '+r+' day'+(r===1?'':'s'):'')}
  if(months<24){var anchor=new Date(bd);anchor.setMonth(anchor.getMonth()+months);var wk=Math.floor((now-anchor.getTime())/DAY/7);return months+' months'+(wk?', '+wk+' wk':'')}
  var y=Math.floor(months/12),mo=months%12;return y+' yr'+(mo?' '+mo+' mo':'');
}

/* ---------- writes ---------- */
function enqueue(key,fn){return Promise.resolve().then(fn)}
function handleWriteError(err){
  var code=err&&err.code;
  if(code==='permission-denied'){S.canWrite=false;S.roMsg='This account isn\'t allowed to save. Check that its email is in the Firestore security rules, then reload.';toast("Couldn't save. This account isn't on the family list.");}
  else if(code==='resource-exhausted')toast('Firebase\'s free daily limit was reached. Saving resumes tomorrow.');
  else if(code==='unauthenticated')toast('You were signed out. Sign in again.');
  else toast("Couldn't save. Check your connection and try again.");
  render();
}
function writeEntry(e){
  var week=weekKey(e.t),docId=week+'~'+S.wk,json=JSON.stringify(e),patch={};patch[e.id]=json;
  if(week<S.liveFrom){var od=S.older[docId]||{week:week,entries:{}};var ne=Object.assign({},od.entries);ne[e.id]=json;S.older[docId]={week:week,entries:ne};}
  else{var ld=S.live[docId]||{week:week,entries:{}};var le=Object.assign({},ld.entries);le[e.id]=json;S.live[docId]=Object.assign({},ld,{entries:le});}
  S.ver++;render();
  return S.db.collection('logs').doc(docId).merge({week:week,by:S.uid,wk:S.wk,entries:patch,u:Date.now()}).catch(function(err){handleWriteError(err);throw err});
}
function buildEntry(part,old,id){
  var now=Date.now();
  return {id:old?old.id:(id||newId('e')),baby:old?old.baby:S.babyId,type:part.type,t:part.t,end:part.end!=null?part.end:part.t,d:part.d||{},note:String(part.note||'').trim(),
    by:old?(old.by||null):(S.uid||null),wk:old?(old.wk||null):S.wk,w:old?(old.w||''):S.who,eb:S.uid||null,u:now};
}
function commitEntry(part,old,id){
  var e=buildEntry(part,old,id);
  if(old&&!old.rec&&weekKey(old.t)!==weekKey(e.t)){var tomb=Object.assign({},old,{del:true,u:e.u});writeEntry(tomb).catch(function(){})}
  return writeEntry(e).then(function(){return e});
}
function deleteEntry(old){
  if(old.rec){delete S.records[old.id];render();return S.db.collection('records').doc(old.id).delete().catch(function(err){handleWriteError(err);throw err})}
  return writeEntry(Object.assign({},old,{del:true,u:Date.now(),eb:S.uid||null}));
}
function commitRecord(part,old){
  var id=old?old.id:newId('r');
  var body={kind:part.type,baby:old?old.baby:S.babyId,date:part.date,d:part.d||{},note:String(part.note||'').trim(),by:old?(old.by||null):(S.uid||null),wk:old?(old.wk||null):S.wk,w:old?(old.w||''):S.who,u:Date.now()};
  S.records[id]=body;render();
  return S.db.collection('records').doc(id).set(body).catch(function(err){handleWriteError(err);throw err});
}
function putTimer(kind,body){var key=tk(kind);S.timers[key]=body;render();
  return S.db.collection('timers').doc(key).set(body).catch(function(err){handleWriteError(err)})}
function dropTimer(kind){var key=tk(kind);delete S.timers[key];render();
  return S.db.collection('timers').doc(key).delete().catch(function(err){handleWriteError(err)})}
function saveBaby(id,body){S.babies[id]=body;render();
  return S.db.collection('babies').doc(id).set(body).catch(function(err){handleWriteError(err);throw err})}
function saveSettings(patch){var body=Object.assign({},S.settings,patch);S.settings=body;render();
  return S.db.doc('settings/family').set(body).catch(function(err){handleWriteError(err)})}

/* ---------- timers ---------- */
function timerBase(extra){var now=Date.now();return Object.assign({baby:S.babyId,id:newId('e'),by:S.uid||null,wk:S.wk,w:S.who,u:now},extra)}
function nurseCalc(t){var segs=t.segs||[],now=Date.now(),o={L:0,R:0,accL:0,accR:0,runL:null,runR:null,running:false,side:null,end:null};
  segs.forEach(function(s){var end=s.b!=null?s.b:now;o[s.s]+=end-s.a;if(s.b!=null)o['acc'+s.s]+=s.b-s.a;else{o['run'+s.s]=s.a;o.running=true}});
  var last=segs[segs.length-1];if(last){o.side=last.s;o.end=last.b!=null?last.b:now}return o}
function startNurse(side){putTimer('nurse',timerBase({kind:'nurse',segs:[{s:side,a:Date.now(),b:null}]}))}
function nurseSide(side){var t=timer('nurse');if(!t)return;var segs=t.segs.map(function(s){return Object.assign({},s)}),last=segs[segs.length-1],now=Date.now();
  if(last&&last.b==null){if(last.s===side)last.b=now;else{last.b=now;segs.push({s:side,a:now,b:null})}}else segs.push({s:side,a:now,b:null});
  putTimer('nurse',Object.assign({},t,{segs:segs,u:now}))}
function nursePause(){var t=timer('nurse');if(!t)return;var segs=t.segs.map(function(s){return Object.assign({},s)}),last=segs[segs.length-1],now=Date.now();
  if(last.b==null)last.b=now;else segs.push({s:last.s,a:now,b:null});putTimer('nurse',Object.assign({},t,{segs:segs,u:now}))}
function nurseDone(){var t=timer('nurse');if(!t)return;var c=nurseCalc(t);
  if(c.L+c.R<5000){dropTimer('nurse');toast('Timer discarded (under 5 seconds).');return}
  var e={id:t.id,baby:t.baby,type:'nurse',t:t.segs[0].a,end:c.end,d:{L:Math.round(c.L),R:Math.round(c.R),last:c.side},note:'',by:t.by||null,wk:t.wk||null,w:t.w||'',eb:S.uid||null,u:Date.now()};
  writeEntry(e).catch(function(){});dropTimer('nurse');
  toast('Nursing saved · '+fmtDur(c.L+c.R),{label:'Edit',fn:function(){openEdit(e.id)}})}
function startSimple(kind,extra){putTimer(kind,timerBase(Object.assign({kind:kind,a:Date.now()},extra||{})))}
function finishSimple(kind){var t=timer(kind);if(!t)return;var now=Date.now(),dur=now-t.a;
  if(dur<5000){dropTimer(kind);toast('Timer discarded (under 5 seconds).');return}
  var base={id:t.id,baby:t.baby,t:t.a,end:now,note:'',by:t.by||null,wk:t.wk||null,w:t.w||'',eb:S.uid||null,u:now},e;
  if(kind==='sleep')e=Object.assign(base,{type:'sleep',d:{}});
  else if(kind==='pump')e=Object.assign(base,{type:'pump',d:{dur:dur,u:volUnit(),L:null,R:null,total:null}});
  else e=Object.assign(base,{type:'activity',d:{act:t.act||'tummy',dur:dur}});
  writeEntry(e).catch(function(){});dropTimer(kind);
  if(kind==='pump'){openSheet('pump',{entry:e});return}
  toast((kind==='sleep'?'Sleep saved · ':(ACT[t.act]||'Activity')+' saved · ')+fmtDur(dur),{label:'Edit',fn:function(){openEdit(e.id)}})}

/* ---------- rendering ---------- */
var raf=0;
function render(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;doRender()});}
function doRender(){
  renderTop();renderTabs();
  var v=$('#view'),html;
  if(S.status==='loading'||(S.status==='ready'&&!S.babiesReady))html='<div class="loading">Opening your log…</div>';
  else if(S.status==='unconfigured')html=viewUnconfigured();
  else if(S.status==='signedout')html=viewLogin();
  else if(S.status==='blocked')html=viewBlocked();
  else if(!baby()&&S.view!=='baby')html=viewOnboard();
  else if(S.view==='history')html=viewHistory();
  else if(S.view==='trends')html=viewTrends();
  else if(S.view==='baby')html=viewBaby();
  else html=viewToday();
  var banners='';
  if(S.subErr)banners+='<div class="banner">'+esc(S.subErr)+'</div>';
  if(!S.canWrite&&S.status==='ready')banners+='<div class="banner">'+esc(S.roMsg||'You can view this log but not add to it.')+'</div>';
  v.innerHTML=banners+html;
  tick();resolveNames();
}
function renderTop(){
  var b=baby(),el=$('#top');
  var sync=S.status==='ready'?(S.offline?'<span class="sync off"><i></i>Offline · will sync</span>':(S.subErr?'<span class="sync off"><i></i>Not syncing</span>':(S.logsReady?'<span class="sync"><i></i>Shared</span>':'<span class="sync">Syncing…</span>'))):'';
  if(!b){el.innerHTML='<div class="baby-btn"><span class="baby-mark">N</span><span class="baby-txt"><span class="baby-name">Nursery Log</span><span class="baby-age">Shared baby tracker</span></span></div>'+sync;return}
  var n=Object.keys(S.babies).length;
  el.innerHTML='<button class="baby-btn" data-action="go" data-view="baby" aria-label="Baby profile'+(n>1?' and switch baby':'')+'"><span class="baby-mark">'+esc((b.name||'?').trim().charAt(0).toUpperCase())+'</span><span class="baby-txt"><span class="baby-name">'+esc(b.name||'Baby')+'</span><span class="baby-age">'+esc(ageText(b.birth))+(n>1?' · switch':'')+'</span></span></button>'+sync;
}
function renderTabs(){
  var nav=$('.tabs');if(nav)nav.hidden=S.status!=='ready';if(S.status!=='ready'){$('#tabs').innerHTML='';return}
  var tabs=[['today','Today'],['history','History'],['trends','Trends'],['baby','Baby']];
  $('#tabs').innerHTML=tabs.map(function(t){return '<button class="tab" data-action="go" data-view="'+t[0]+'"'+(S.view===t[0]?' aria-current="page"':'')+'>'+icon(t[0])+'<span>'+t[1]+'</span></button>'}).join('');
}
function viewLogin(){
  return '<div class="login"><div class="hero-baby"><h1>Nursery Log</h1><p>Sign in with the email and password set up for you. You\'ll stay signed in on this phone.</p></div>'+
    '<form id="login-form" class="sheet-in" novalidate style="padding:0">'+
    field('Email','<input type="email" id="f-email" name="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false">','f-email')+
    field('Password','<input type="password" id="f-pass" name="password" autocomplete="current-password">','f-pass')+
    '<p class="form-err" id="login-err" hidden></p><p class="notice" id="login-note" hidden></p>'+
    '<button type="submit" class="btn primary" id="login-btn">Sign in</button>'+
    '<button type="button" class="linkish" data-action="forgot" style="align-self:flex-start">Forgot password?</button></form></div>';
}
function viewUnconfigured(){
  return '<div class="empty" style="margin-top:24px"><b>Setup isn\'t finished</b>Open <code>config.js</code> in this folder, paste in the <code>firebaseConfig</code> block from your Firebase project, save it, and upload the folder again.</div>';
}
function viewBlocked(){
  return '<div class="empty" style="margin-top:24px"><b>This account isn\'t on the family list</b>You\'re signed in as '+esc(S.email||'this account')+', but the database only lets in the emails listed in its Firestore security rules. Add this email there (all lowercase), click Publish, then reload.</div><button class="btn plain" data-action="signout">Sign out</button>';
}
function viewOnboard(){
  if(!S.canWrite)return '<div class="empty" style="margin-top:24px"><b>No baby set up yet</b>Once the person who shared this page adds a baby, the log will appear here.</div>';
  return '<div class="hero-baby" style="padding-top:18px"><h1>Set up your shared log</h1><p>Add your baby first. Everything either of you logs (feeds, diapers, sleep, pumping, growth, medicine) shows up on both phones within a second or two.</p></div>'+
    '<button class="btn primary" style="--cat:var(--accent);--on-cat:var(--on-accent)" data-action="open" data-sheet="baby">Add your baby</button>'+
    '<p class="prose">Not born yet? Use the due date. The header will count down, then switch to age once you update it.</p>';
}

function liveCards(){
  var out='',nt=timer('nurse'),st=timer('sleep'),pt=timer('pump'),at=timer('act');
  if(nt){var c=nurseCalc(nt),total=c.accL+c.accR,run=c.runL||c.runR||'';
    out+='<section class="live" style="--cat:var(--feed)" id="live-nurse"><div class="live-head"><span class="live-kind"><span class="dot'+(c.running?'':' paused')+'"></span>Nursing'+(c.running?'':' · paused')+'</span><span class="live-by">'+esc(startedBy(nt))+'</span></div>'+
      '<div class="live-clock" data-clock data-acc="'+total+'" data-run="'+run+'">'+fmtClock(c.L+c.R)+'</div>'+
      '<div class="sides">'+['L','R'].map(function(s){var on=c.side===s&&c.running;return '<button class="side'+(on?' on':'')+'" data-action="nurse-side" data-side="'+s+'"><span>'+(s==='L'?'Left':'Right')+(on?' · tap to pause':(c.side===s?' · tap to resume':' · tap to switch'))+'</span><b data-clock data-acc="'+c['acc'+s]+'" data-run="'+(c['run'+s]||'')+'">'+fmtClock(c[s])+'</b></button>'}).join('')+'</div>'+
      '<div class="live-actions"><button class="btn plain" data-action="nurse-pause">'+(c.running?'Pause':'Resume')+'</button><button class="btn primary" data-action="nurse-done">Done</button></div>'+
      '<div class="live-foot"><button class="linkish" data-action="timer-adjust" data-kind="nurse">Started '+fmtTime(nt.segs[0].a)+' · adjust</button><button class="linkish" data-action="timer-discard" data-kind="nurse">Discard</button></div></section>';}
  [['sleep',st,'Asleep','Woke up','sleep'],['pump',pt,'Pumping','Done','pump'],['act',at,at?(ACT[at.act]||'Activity'):'','Done','activity']].forEach(function(x){var t=x[1];if(!t)return;
    out+='<section class="live" style="--cat:var(--'+x[4]+')"><div class="live-head"><span class="live-kind"><span class="dot"></span>'+esc(x[2])+'</span><span class="live-by">'+esc(startedBy(t))+'</span></div>'+
      '<div class="live-clock" data-clock data-acc="0" data-run="'+t.a+'">'+fmtClock(Date.now()-t.a)+'<small>since '+fmtTime(t.a)+'</small></div>'+
      '<div class="live-actions"><button class="btn plain" data-action="timer-adjust" data-kind="'+x[0]+'">Adjust start</button><button class="btn primary" data-action="timer-done" data-kind="'+x[0]+'">'+x[3]+'</button></div>'+
      '<div class="live-foot"><span></span><button class="linkish" data-action="timer-discard" data-kind="'+x[0]+'">Discard</button></div></section>';});
  return out;
}
function startedBy(t){var n=personName(t);return n==='You'?'Started by you':(n?'Started by '+n:'')}

function viewToday(){
  var now=Date.now(),D0=startOfDay(now),D1=addDays(D0,1),T=dayTotals(D0,D1);
  var nt=timer('nurse'),st=timer('sleep');
  var lf=lastOf(['nurse','bottle']),ld=lastOf(['diaper']),ls=lastOf(['sleep']),lb=lastOf(['bottle']);
  var feedCell=nt?cell('Feeding','<span data-clock data-acc="0" data-run="'+nt.segs[0].a+'">'+fmtClock(now-nt.segs[0].a)+'</span>','nursing now'):
    lf?cell('Last feed','<span data-since="'+lf.t+'">'+fmtDurHM(now-lf.t)+'</span>',(lf.type==='nurse'?'Nursed ':'Bottle ')+fmtShort(lf.t)):cell('Last feed','—','none yet');
  var diaperCell=ld?cell('Diaper','<span data-since="'+ld.t+'">'+fmtDurHM(now-ld.t)+'</span>',({wet:'Wet',dirty:'Dirty',mixed:'Both',dry:'Dry'}[ld.d.kind]||'')+' '+fmtShort(ld.t)):cell('Diaper','—','none yet');
  var sleepCell=st?cell('Asleep','<span data-since="'+st.a+'">'+fmtDurHM(now-st.a)+'</span>','Since '+fmtShort(st.a)):
    ls?cell('Awake','<span data-since="'+ls.end+'">'+fmtDurHM(now-ls.end)+'</span>','Woke '+fmtShort(ls.end)):cell('Sleep','—','none yet');
  var ns=nextSide();
  var html=liveCards()+'<div class="since">'+feedCell+diaperCell+sleepCell+'</div>'+medRows();
  html+='<div class="tiles primary">'+
    tile('nurse','Nurse',nt?'In progress':(ns?'Next side: <b>'+(ns==='L'?'Left':'Right')+'</b>':'Left / right timer'),'feed',nt)+
    tile('bottle','Bottle',lb?'Last: '+esc(fmtAmt(lb.d.amt,lb.d.u))+' '+esc((MILK[lb.d.milk]||'').toLowerCase()):'Breast milk or formula','feed')+
    tile('diaper','Diaper',T.diapers?T.wet+' wet · '+T.dirty+' dirty today':'Wet, dirty, or both','diaper')+
    tile('sleep','Sleep',st?'Asleep now':(T.sleep?fmtDur(T.sleep)+' today':'Start a timer'),'sleep',st)+'</div>';
  html+='<div class="tiles secondary">'+
    tile('pump','Pump','','pump',timer('pump'))+tile('solids','Solids','','solids')+tile('activity','Activity','','activity',timer('act'))+
    tile('med','Medicine','','health')+tile('temp','Temp','','health')+tile('health','Health','','health')+
    tile('growth','Growth','','growth')+tile('milestone','Milestone','','milestone')+tile('note','Note','','note')+'</div>';
  html+=daySection(D0,D1,'Today','all',T);
  return html;
}
function cell(lab,val,sub){return '<div><span class="lab">'+lab+'</span><span class="val">'+val+'</span><span class="sub">'+esc(sub)+'</span></div>'}
function tile(kind,label,sub,cat,running){return '<button class="tile'+(running?' running':'')+'" style="--cat:var(--'+cat+')" data-action="log" data-kind="'+kind+'">'+icon(TYPES[kind]?TYPES[kind].icon:kind)+'<span class="t-label">'+label+'</span>'+(sub?'<span class="t-sub">'+sub+'</span>':'')+'</button>'}
function medRows(){
  var since=Date.now()-DAY,seen={},rows=[];
  babyEntries().forEach(function(e){if(e.type!=='med'||e.t<since)return;var k=(e.d.name||'').toLowerCase();if(seen[k])return;seen[k]=1;rows.push(e)});
  if(!rows.length)return '';
  return '<div class="meds" aria-label="Medicine in the last 24 hours">'+rows.map(function(e){var who=personName(e);
    return '<button class="med-row" data-action="edit" data-id="'+esc(e.id)+'">'+icon('med')+'<span class="grow"><b>'+esc(e.d.name||'Medicine')+'</b>'+(e.d.dose!=null?' '+esc(trim(e.d.dose,2)+' '+(e.d.unit||'')):'')+'<small>Given '+fmtTime(e.t)+(who?' by '+esc(who==='You'?'you':who):'')+'</small></span><span class="mono" data-ago="'+e.t+'">'+fmtAgo(e.t)+'</span></button>'}).join('')+'</div>';
}
function totalsGrid(T){
  var items=[];
  items.push(['Feeds',String(T.feeds),'feed']);
  if(T.ml)items.push(['Bottle',fmtVol(T.ml),'feed']);
  if(T.nurse)items.push(['Nursing',fmtDur(T.nurse),'feed']);
  items.push(['Wet',String(T.wet),'diaper']);items.push(['Dirty',String(T.dirty),'diaper']);
  items.push(['Sleep',T.sleep?fmtDur(T.sleep):'0m','sleep']);
  if(T.pumpMl)items.push(['Pumped',fmtVol(T.pumpMl),'pump']);
  if(T.solids)items.push(['Solids',String(T.solids),'solids']);
  if(T.act)items.push(['Activity',fmtDur(T.act),'activity']);
  return '<div class="totals">'+items.map(function(i){return '<div class="tot" style="--cat:var(--'+i[2]+')"><span>'+i[0]+'</span><b>'+esc(i[1])+'</b></div>'}).join('')+'</div>';
}
function daySection(D0,D1,title,filter,T){
  var list=dayList(D0,D1).filter(function(e){return inFilter(e,filter)});
  var html='<section style="display:flex;flex-direction:column;gap:12px"><div class="sec-head"><h2>'+esc(title)+'</h2><span class="meta">'+fmtDate(D0,{weekday:'short',month:'short',day:'numeric'})+'</span></div>';
  html+=totalsGrid(T||dayTotals(D0,D1));
  if(!list.length){html+='<div class="empty"><b>'+(startOfDay(Date.now())===D0?'Nothing logged yet today':'Nothing logged this day')+'</b>'+(startOfDay(Date.now())===D0?'Tap a button above to add the first entry. Anything your partner logs shows up here too.':'Use the arrows to check another day.')+'</div>';}
  else html+='<ul class="list">'+list.map(function(e){return entryRow(e,D0)}).join('')+'</ul>';
  return html+'</section>';
}
function entryRow(e,D0){
  var ty=TYPES[e.type],ds=describe(e),who=personName(e);
  var time=e.rec?'<small>all day</small>':(e.t<D0?fmtTime(e.t)+'<small>prev. day</small>':fmtTime(e.t));
  var note=e.note?'<span class="e-note">'+esc(e.note)+'</span>':'';
  return '<li><button class="entry" style="--cat:var(--'+ty.cat+')" data-action="edit" data-id="'+esc(e.id)+'"><span class="e-time">'+time+'</span><span class="e-ico">'+icon(ty.icon)+'</span><span class="e-body"><span class="e-title">'+esc(ds.title)+'</span>'+(ds.sub?'<span class="e-sub">'+esc(ds.sub)+'</span>':'')+note+'</span><span class="e-who">'+esc(who)+'</span></button></li>';
}

function viewHistory(){
  var today=startOfDay(Date.now());var D0=S.histDay!=null?S.histDay:today;if(D0>today)D0=today;var D1=addDays(D0,1);
  var pending=ensureWeek(D0)|ensureWeek(addDays(D0,-1));
  var html='<div class="daynav"><button class="arrow" data-action="hist-step" data-step="-1" aria-label="Previous day">'+icon('left')+'</button><button class="mid" data-action="hist-today"><b>'+esc(dayLabel(D0))+'</b><small>'+fmtDate(D0,{month:'long',day:'numeric',year:'numeric'})+(D0!==today?' · tap for today':'')+'</small></button><button class="arrow" data-action="hist-step" data-step="1" aria-label="Next day"'+(D0>=today?' disabled':'')+'>'+icon('right')+'</button></div>';
  html+='<div class="filters" role="toolbar" aria-label="Filter entries">'+FILTERS.map(function(f){return '<button class="fchip" data-action="hist-filter" data-f="'+f[0]+'" aria-pressed="'+(S.histFilter===f[0])+'">'+f[1]+'</button>'}).join('')+'</div>';
  if(pending)html+='<div class="loading">Loading that week…</div>';
  else html+=daySection(D0,D1,dayLabel(D0),S.histFilter);
  return html;
}
function ensureWeek(D0){
  var wkk=weekKey(D0);if(!S.liveFrom||wkk>=S.liveFrom)return 0;
  var st=S.olderWeeks[wkk];if(st==='done')return 0;if(st==='pending')return 1;
  S.olderWeeks[wkk]='pending';
  S.db.collection('logs').where('week','==',wkk).get().then(function(snap){
    snap.docs.forEach(function(d){var cur=S.older[d.id],data=d.data();if(cur){var ne=Object.assign({},data.entries,cur.entries);S.older[d.id]=Object.assign({},data,{entries:Object.assign({},data.entries,ne)})}else S.older[d.id]=data});
    S.olderWeeks[wkk]='done';S.ver++;render();
  }).catch(function(){S.olderWeeks[wkk]=null;toast("Couldn't load that week. Try again.");render()});
  return 1;
}

/* ---------- trends ---------- */
function viewTrends(){
  var N=S.trendDays,today=startOfDay(Date.now()),days=[];for(var i=N-1;i>=0;i--)days.push(addDays(today,-i));
  var tots=days.map(function(D0){return dayTotals(D0,addDays(D0,1))});
  var list=babyEntries();
  var html='<div class="sec-head"><h2>Trends</h2><div class="seg" role="group" aria-label="Range"><button data-action="trend-range" data-n="7" aria-pressed="'+(N===7)+'">7 days</button><button data-action="trend-range" data-n="14" aria-pressed="'+(N===14)+'">14 days</button></div></div>';
  var any=list.some(function(e){return e.t>=days[0]});
  if(!any&&!timer('sleep')){html+='<div class="empty"><b>Charts fill in as you log</b>After a day or two of feeds, diapers and sleep, this page shows daily totals and a 24-hour rhythm chart.</div>';}
  else{
    html+='<section class="card"><h3>24-hour rhythm <small>newest day on top</small></h3>'+rhythmChart(days.slice().reverse(),list)+'<div class="legend"><span><i style="background:var(--sleep)"></i>Sleep</span><span><i style="background:var(--feed)"></i>Feed</span><span><i style="background:var(--diaper)"></i>Diaper</span></div></section>';
    var full=tots.slice(0,-1);function avg(f){if(!full.length)return null;var s=0;full.forEach(function(t){s+=f(t)});return s/full.length}
    var charts=[];
    charts.push(chartCard('Sleep','sleep',tots.map(function(t){return t.sleep/HOUR}),days,function(v){return fmtDur(v*HOUR)},avg(function(t){return t.sleep/HOUR})));
    charts.push(chartCard('Feeds','feed',tots.map(function(t){return t.feeds}),days,function(v){return trim(v,1)},avg(function(t){return t.feeds})));
    if(tots.some(function(t){return t.ml}))charts.push(chartCard('Bottle volume','feed',tots.map(function(t){return isUS()?t.ml/29.5735:t.ml}),days,function(v){return trim(v,isUS()?1:0)+' '+volUnit()},avg(function(t){return isUS()?t.ml/29.5735:t.ml})));
    if(tots.some(function(t){return t.nurse}))charts.push(chartCard('Nursing time','feed',tots.map(function(t){return t.nurse/MIN}),days,function(v){return fmtDur(v*MIN)},avg(function(t){return t.nurse/MIN})));
    var td=tots[tots.length-1];charts.push(chartCard('Diapers','diaper',tots.map(function(t){return [t.wet,t.dirty]}),days,function(v){return trim(v,1)},avg(function(t){return t.diapers}),true,td.wet+' wet · '+td.dirty+' dirty'));
    if(tots.some(function(t){return t.pumpMl}))charts.push(chartCard('Pumped','pump',tots.map(function(t){return isUS()?t.pumpMl/29.5735:t.pumpMl}),days,function(v){return trim(v,isUS()?1:0)+' '+volUnit()},avg(function(t){return isUS()?t.pumpMl/29.5735:t.pumpMl})));
    html+='<p class="caption">Each chart\'s last bar is today so far. Averages leave today out.</p><div class="chart-grid">'+charts.join('')+'</div>';
  }
  html+=growthSection();
  return html;
}
function niceMax(v){if(!(v>0))return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p,steps=[1,1.2,1.5,2,2.5,3,4,5,6,8,10];for(var i=0;i<steps.length;i++)if(m<=steps[i]+1e-9)return steps[i]*p;return 10*p}
function chartCard(title,cat,vals,days,fmt,avg,stack,bigText){
  var W=320,H=104,T=14,B=18,L=2,R=2,n=vals.length,ch=H-T-B;
  var tot=vals.map(function(v){return Array.isArray(v)?v[0]+v[1]:v}),max=niceMax(Math.max.apply(null,tot.concat([0]))),bw=(W-L-R)/n,w=Math.min(24,bw*.62);
  var s='<line class="grid" x1="0" x2="'+W+'" y1="'+T+'" y2="'+T+'"/><line class="grid" x1="0" x2="'+W+'" y1="'+(T+ch/2)+'" y2="'+(T+ch/2)+'"/><line class="grid" x1="0" x2="'+W+'" y1="'+(T+ch)+'" y2="'+(T+ch)+'"/>';
  s+='<text x="'+W+'" y="'+(T-4)+'" text-anchor="end">'+esc(fmt(max))+'</text>';
  vals.forEach(function(v,i){var x=L+i*bw+(bw-w)/2,cur=i===n-1?' cur':'';
    if(stack){var a=v[0]/max*ch,b=v[1]/max*ch;if(a>0)s+='<rect class="bar'+cur+'" x="'+x.toFixed(1)+'" y="'+(T+ch-a).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+a.toFixed(1)+'" rx="2"/>';if(b>0)s+='<rect class="bar2'+cur+'" x="'+x.toFixed(1)+'" y="'+(T+ch-a-b).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+b.toFixed(1)+'" rx="2"/>'}
    else{var h=tot[i]/max*ch;if(h>0)s+='<rect class="bar'+cur+'" x="'+x.toFixed(1)+'" y="'+(T+ch-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,h).toFixed(1)+'" rx="2"/>'}
    var lab=n<=7?fmtDate(days[i],{weekday:'narrow'}):(i%2===(n-1)%2?String(new Date(days[i]).getDate()):'');
    if(lab)s+='<text x="'+(L+i*bw+bw/2).toFixed(1)+'" y="'+(H-4)+'" text-anchor="middle">'+esc(lab)+'</text>';});
  var last=tot[n-1];
  return '<section class="card" style="--cat:var(--'+cat+')"><h3><span>'+title+'</span><small>'+(avg!=null?'avg '+esc(fmt(avg))+' a day':'')+'</small></h3><div class="big">'+esc(bigText||fmt(last))+' <small class="caption">today</small></div><svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(title)+' per day">'+s+'</svg>'+(stack?'<div class="legend"><span><i style="background:color-mix(in srgb,var(--diaper) 55%,var(--surface))"></i>Wet</span><span><i style="background:color-mix(in srgb,var(--solids) 60%,var(--surface))"></i>Dirty</span></div>':'')+'</section>';
}
function rhythmChart(days,list){
  var W=340,LW=46,TW=W-LW-2,RH=21,n=days.length,H=n*RH+18,s='',now=Date.now(),st=timer('sleep');
  days.forEach(function(D0,i){var D1=addDays(D0,1),span=D1-D0,y=i*RH+2,h=RH-7;function X(t){return LW+(t-D0)/span*TW}
    var lab=D0===startOfDay(now)?'Today':fmtDate(D0,{weekday:'short'})+' '+new Date(D0).getDate();
    s+='<text x="0" y="'+(y+h-3)+'">'+esc(lab)+'</text><rect class="track" x="'+LW+'" y="'+y+'" width="'+TW+'" height="'+h+'" rx="3"/>';
    function sleepBar(a,b){a=Math.max(a,D0);b=Math.min(b,D1);if(b>a)s+='<rect class="m-sleep" x="'+X(a).toFixed(1)+'" y="'+y+'" width="'+Math.max(1,X(b)-X(a)).toFixed(1)+'" height="'+h+'" rx="2"/>'}
    list.forEach(function(e){if(e.type==='sleep')sleepBar(e.t,e.end)});
    if(st)sleepBar(st.a,now);
    list.forEach(function(e){if(e.t<D0||e.t>=D1)return;
      if(e.type==='nurse'||e.type==='bottle'){var w=e.type==='nurse'?Math.max(2.5,(e.end-e.t)/span*TW):2.5;s+='<rect class="m-feed" x="'+X(e.t).toFixed(1)+'" y="'+(y+h*.22).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(h*.56).toFixed(1)+'" rx="1"/>'}
      else if(e.type==='diaper')s+='<circle class="m-diaper" cx="'+X(e.t).toFixed(1)+'" cy="'+(y+h+2.4).toFixed(1)+'" r="1.8"/>';});
    if(D0===startOfDay(now))s+='<line class="now" x1="'+X(now).toFixed(1)+'" x2="'+X(now).toFixed(1)+'" y1="'+(y-1)+'" y2="'+(y+h+1)+'"/>';
  });
  [['12a',0],['6a',.25],['12p',.5],['6p',.75],['12a',1]].forEach(function(t,i){s+='<text x="'+(LW+t[1]*TW).toFixed(1)+'" y="'+(H-3)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'">'+t[0]+'</text>'});
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Sleep, feeds and diapers by time of day">'+s+'</svg>';
}
function growthSection(){
  var recs=babyRecords('growth').slice().reverse(),b=baby();
  var html='<section class="card" style="--cat:var(--growth)"><h3><span>Growth</span><button class="linkish" data-action="open" data-sheet="growth">Add measurement</button></h3>';
  if(!recs.length)return html+'<p class="caption">Log weight, length and head size after each checkup to see the curve here.</p></section>';
  var pts=recs.filter(function(r){return r.d.g});
  if(pts.length>=2){
    var W=320,H=150,L=40,R=10,T=10,B=22,xs=pts.map(function(r){return r.t}),ys=pts.map(function(r){return isUS()?r.d.g/453.59237:r.d.g/1000});
    var x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs);if(x1===x0)x1=x0+DAY;
    var ymin=Math.min.apply(null,ys),ymax=Math.max.apply(null,ys),padY=Math.max(.25,(ymax-ymin)*.15);ymin=Math.max(0,Math.floor((ymin-padY)*2)/2);ymax=Math.ceil((ymax+padY)*2)/2;
    function X(t){return L+(t-x0)/(x1-x0)*(W-L-R)}function Y(v){return T+(1-(v-ymin)/(ymax-ymin))*(H-T-B)}
    var s='';[ymin,(ymin+ymax)/2,ymax].forEach(function(v){s+='<line class="grid" x1="'+L+'" x2="'+W+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'"/><text x="'+(L-6)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end">'+trim(v,1)+' '+(isUS()?'lb':'kg')+'</text>'});
    s+='<path class="line" d="'+pts.map(function(r,i){return (i?'L':'M')+X(r.t).toFixed(1)+' '+Y(ys[i]).toFixed(1)}).join(' ')+'"/>';
    pts.forEach(function(r,i){s+='<circle class="pt" cx="'+X(r.t).toFixed(1)+'" cy="'+Y(ys[i]).toFixed(1)+'" r="3.5"/>'});
    s+='<text x="'+L+'" y="'+(H-4)+'" text-anchor="start">'+fmtDate(x0,{month:'short',day:'numeric'})+'</text><text x="'+W+'" y="'+(H-4)+'" text-anchor="end">'+fmtDate(x1,{month:'short',day:'numeric'})+'</text>';
    html+='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Weight over time">'+s+'</svg>';
  }
  html+='<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Length</th><th>Head</th></tr></thead><tbody>'+recs.slice().reverse().map(function(r){
    return '<tr class="tap" data-action="edit" data-id="'+esc(r.id)+'"><td>'+fmtDate(r.t,{month:'short',day:'numeric',year:'2-digit'})+(b&&b.birth&&r.t>=parseDay(b.birth)?'<br><small class="caption">'+esc(ageAt(b.birth,r.t))+'</small>':'')+'</td><td>'+(r.d.g?esc(fmtWeight(r.d.g)):'—')+'</td><td>'+(r.d.cm?esc(fmtLen(r.d.cm)):'—')+'</td><td>'+(r.d.head?esc(fmtLen(r.d.head)):'—')+'</td></tr>'}).join('')+'</tbody></table></div>';
  return html+'</section>';
}
function ageAt(birth,t){var d=Math.round((t-parseDay(birth))/DAY);return d<14?d+' days':d<120?Math.floor(d/7)+' wk':Math.floor(d/30.44)+' mo'}

/* ---------- baby / family ---------- */
function viewBaby(){
  var b=baby(),ids=Object.keys(S.babies).sort(function(a,c){return (S.babies[a].created||0)-(S.babies[c].created||0)});
  var html='';
  if(b)html+='<div class="hero-baby"><h1>'+esc(b.name||'Baby')+'</h1><p>'+esc(ageText(b.birth))+(b.birth?' · '+(parseDay(b.birth)>Date.now()?'due ':'born ')+fmtDate(parseDay(b.birth),{month:'long',day:'numeric',year:'numeric'}):'')+'</p></div>';
  else html+='<div class="hero-baby"><h1>Your baby</h1><p>Nobody has been added yet.</p></div>';
  html+='<div class="rows">'+ids.map(function(id){var x=S.babies[id];return '<div class="row"><button class="row" style="padding:0;min-height:0;flex:1" data-action="pick-baby" data-id="'+esc(id)+'" aria-pressed="'+(id===S.babyId)+'"><span class="radio-dot'+(id===S.babyId?' on':'')+'"></span><span class="grow"><b>'+esc(x.name||'Baby')+'</b><small>'+esc(ageText(x.birth))+'</small></span></button>'+(S.canWrite?'<button class="linkish" data-action="edit-baby" data-id="'+esc(id)+'">Edit</button>':'')+'</div>'}).join('')+
    (S.canWrite?'<button class="row" data-action="open" data-sheet="baby"><span class="radio-dot" style="border-style:dashed"></span><span class="grow"><b>'+(ids.length?'Add another child':'Add your baby')+'</b><small>Twins, or tracking a sibling too</small></span></button>':'')+'</div>';
  if(b){
    html+=recordList('Milestones','milestone','milestone','Add milestone');
    html+=recordList('Vaccines','vaccine','health','Add vaccine','vaccine');
    html+=recordList('Doctor visits','visit','health','Add visit','visit');
  }
  html+='<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2>Units</h2></div><div class="seg" role="group" aria-label="Units"><button data-action="units" data-u="us" aria-pressed="'+isUS()+'">oz · lb · in · °F</button><button data-action="units" data-u="metric" aria-pressed="'+(!isUS())+'">ml · kg · cm · °C</button></div><p class="prose">Units are shared, so both phones show the same numbers. Entries keep the unit they were logged in.</p></section>';
  html+=caregivers();
  if(b)html+='<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2>Export</h2></div>'+(S.exportFile?'<button class="btn primary" style="--cat:var(--accent);--on-cat:var(--on-accent)" data-action="share-export">'+icon('download')+'Save or share '+esc(S.exportFile.name)+'</button>':'<button class="btn plain" data-action="export">'+icon('download')+'Export full log as CSV</button>')+'<p class="prose">Every entry for '+esc(b.name||'this baby')+' as a spreadsheet, handy for the pediatrician or a lactation consultant.</p></section>';
  return html;
}
function recordList(title,kind,cat,addLabel,tab){
  var recs=babyRecords(kind);
  return '<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2>'+title+'</h2>'+(S.canWrite?'<button class="linkish" data-action="open" data-sheet="'+TYPES[kind].sheet+'"'+(tab?' data-tab="'+tab+'"':'')+'>'+addLabel+'</button>':'')+'</div>'+
    (recs.length?'<ul class="list">'+recs.map(function(r){return entryRowRec(r)}).join('')+'</ul>':'<p class="prose">None logged yet.</p>')+'</section>';
}
function entryRowRec(r){var ty=TYPES[r.type],ds=describe(r);
  return '<li><button class="entry" style="--cat:var(--'+ty.cat+')" data-action="edit" data-id="'+esc(r.id)+'"><span class="e-time">'+fmtDate(r.t,{month:'short',day:'numeric'})+'<small>'+new Date(r.t).getFullYear()+'</small></span><span class="e-ico">'+icon(ty.icon)+'</span><span class="e-body"><span class="e-title">'+esc(ds.title)+'</span>'+(r.note?'<span class="e-note">'+esc(r.note)+'</span>':'')+'</span><span class="e-who">'+esc(personName(r))+'</span></button></li>'}
function caregivers(){
  var ids=Object.keys(S.people).filter(function(id){return id!==S.uid});
  var me=S.people[S.uid];
  var html='<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2>Caregivers</h2></div><div class="rows">';
  html+='<div class="row"><span class="avatar" style="display:grid;place-items:center;font-weight:700">'+esc(((me&&me.name)||'Y').charAt(0).toUpperCase())+'</span><span class="grow"><b>'+esc((me&&me.name)||'You')+' (you)</b><small>'+esc(S.email)+'</small></span><button class="linkish" data-action="open" data-sheet="who">Change name</button></div>';
  ids.forEach(function(id){var p=S.people[id];html+='<div class="row"><span class="avatar" style="display:grid;place-items:center;font-weight:700">'+esc(((p&&p.name)||'?').charAt(0).toUpperCase())+'</span><span class="grow"><b>'+esc((p&&p.name)||'Caregiver')+'</b><small>'+esc((p&&p.email)||'')+'</small></span></div>'});
  html+='</div><p class="prose">To add another caregiver, create their account under Authentication → Users in the Firebase console, and add their email to the Firestore security rules.</p>';
  html+='<button class="btn plain" data-action="signout">Sign out</button>';
  return html+'</section>';
}

/* ---------- names ---------- */
function resolveNames(){}

/* ---------- ticking ---------- */
function tick(){
  var now=Date.now();
  $$('[data-since]').forEach(function(el){var v=fmtDurHM(now-+el.getAttribute('data-since'));if(el.textContent!==v)el.textContent=v});
  $$('[data-ago]').forEach(function(el){var v=fmtAgo(+el.getAttribute('data-ago'));if(el.textContent!==v)el.textContent=v});
  $$('[data-clock]').forEach(function(el){var acc=+el.getAttribute('data-acc')||0,run=el.getAttribute('data-run');var v=fmtClock(acc+(run?now-+run:0));var tn=el.firstChild;if(tn&&tn.nodeType===3){if(tn.nodeValue!==v)tn.nodeValue=v}else el.insertBefore(document.createTextNode(v),el.firstChild)});
}
setInterval(function(){
  if(document.hidden)return;tick();
  var dk=dayKey(Date.now());if(dk!==S.curDay){S.curDay=dk;if(S.db&&weekKey(Date.now()-14*DAY)!==S.liveFrom)subscribeLogs();render()}
},1000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();render()}});

/* ---------- toast ---------- */
var toastTimer=0,toastFn=null;
function toast(msg,action){
  var el=$('#toast');toastFn=action&&action.fn||null;
  el.innerHTML='<div class="t" role="status"><span>'+esc(msg)+'</span>'+(action?'<button data-action="toast-act">'+esc(action.label)+'</button>':'')+'</div>';
  el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true},action?5000:3200);
}

/* ---------- sheets ---------- */
function field(label,inner,id){return '<div class="field">'+(label?'<label class="f-label"'+(id?' for="'+id+'"':'')+'>'+label+'</label>':'')+inner+'</div>'}
function group(label,inner){return '<div class="field" role="group" aria-label="'+esc(label)+'"><span class="f-label">'+label+'</span>'+inner+'</div>'}
function chips(name,opts,val,big){return '<div class="chips'+(big?' big':'')+'">'+opts.map(function(o){var id='c-'+name+'-'+o[0];return '<label class="chip" for="'+id+'"><input type="radio" id="'+id+'" name="'+name+'" value="'+esc(o[0])+'"'+(o[0]===val?' checked':'')+'><span>'+(o[2]||'')+esc(o[1])+'</span></label>'}).join('')+'</div>'}
function objOpts(o){return Object.keys(o).map(function(k){return [k,o[k]]})}
function timeInput(id,ms){return '<input type="datetime-local" id="'+id+'" name="'+id+'" value="'+toLocalInput(ms)+'">'}
function dateInput(id,k){return '<input type="date" id="'+id+'" name="'+id+'" value="'+esc(k||'')+'">'}
function textInput(id,val,ph,list){return '<input type="text" id="'+id+'" name="'+id+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'" autocomplete="off"'+(list?' list="'+id+'-list"':'')+'>'+(list?'<datalist id="'+id+'-list">'+list.map(function(x){return '<option value="'+esc(x)+'"></option>'}).join('')+'</datalist>':'')}
function numStep(id,val,step,unit){return '<div class="stepper"><button type="button" class="step" data-action="step" data-for="'+id+'" data-step="-'+step+'" aria-label="Decrease">−</button><input type="number" inputmode="decimal" step="any" min="0" id="'+id+'" name="'+id+'" value="'+(val==null?'':esc(val))+'"><span class="unit">'+esc(unit)+'</span><button type="button" class="step" data-action="step" data-for="'+id+'" data-step="'+step+'" aria-label="Increase">+</button></div>'}
function numPlain(id,val,ph){return '<div class="plain-num"><input type="number" inputmode="decimal" step="any" min="0" id="'+id+'" name="'+id+'" value="'+(val==null?'':esc(val))+'" placeholder="'+esc(ph||'')+'"></div>'}
function noteField(v){return field('Note','<textarea id="f-note" name="note" rows="2" placeholder="Optional">'+esc(v||'')+'</textarea>','f-note')}
function frame(o){
  return '<div class="grab"></div><form id="sheet-form" class="sheet-in gutter" style="--cat:var(--'+o.cat+')" novalidate><div class="sheet-head"><span class="sh-ico">'+icon(o.icon)+'</span><h2 id="sheet-title">'+esc(o.title)+'</h2><button type="button" class="x" data-action="close-sheet" aria-label="Close">'+icon('x')+'</button></div>'+
    o.body+'<p class="form-err" id="form-err" hidden></p>'+
    (o.noSave?'':'<div class="sheet-actions">'+(o.edit?'<button type="button" class="btn danger" data-action="delete-entry">Delete</button>':'')+'<button type="submit" class="btn primary">'+esc(o.saveLabel||'Save')+'</button></div>')+'</form>';
}
function prior(field,type){var seen={},out=[];babyEntries().forEach(function(e){if(e.type===type&&e.d[field]){var k=e.d[field];if(!seen[k]){seen[k]=1;out.push(k)}}});return out}
function uniq(a){var s={},o=[];a.forEach(function(x){if(!s[x.toLowerCase()]){s[x.toLowerCase()]=1;o.push(x)}});return o}
function tIn(f){return fromLocalInput(f.get('f-t'))}

var SHEETS={
  nurse:{html:function(sh){var e=sh.entry,d=e?e.d:{},ns=nextSide(),running=timer('nurse');
    var start=(!e&&!running)?'<div class="start-row">'+['L','R'].map(function(s){return '<button type="button" class="big-start'+(ns===s?' suggest':'')+'" data-action="start-nurse" data-side="'+s+'">Start '+(s==='L'?'left':'right')+(ns===s?'<small>Next side</small>':'<small>&nbsp;</small>')+'</button>'}).join('')+'</div><div class="or">or log a past feed</div>':'';
    var body=start+field('Started',timeInput('f-t',e?e.t:Date.now()-20*MIN),'f-t')+
      '<div class="row2">'+field('Left',numStep('f-L',e?Math.round((d.L||0)/MIN):'',1,'min'),'f-L')+field('Right',numStep('f-R',e?Math.round((d.R||0)/MIN):'',1,'min'),'f-R')+'</div>'+
      group('Ended on',chips('last',[['L','Left'],['R','Right']],d.last||null))+noteField(e&&e.note);
    return frame({title:e?'Edit nursing':'Nursing',cat:'feed',icon:'nurse',body:body,edit:!!e,saveLabel:e?'Save':'Log feed'})},
   save:function(sh,f){var e=sh.entry,d=e?e.d:{},Lm=num(f.get('f-L'))||0,Rm=num(f.get('f-R'))||0;
    var L=e&&Math.round((d.L||0)/MIN)===Lm?d.L||0:Lm*MIN,R=e&&Math.round((d.R||0)/MIN)===Rm?d.R||0:Rm*MIN;
    if(L+R<=0)return 'Enter minutes for at least one side.';var t=tIn(f);if(t==null)return 'Pick a start time.';
    var last=f.get('last')||(R&&!L?'R':(L&&!R?'L':null));var end=(e&&e.t===t&&L===(d.L||0)&&R===(d.R||0))?e.end:t+L+R;
    return {type:'nurse',t:t,end:end,d:{L:L,R:R,last:last},note:f.get('note')}}},
  bottle:{html:function(sh){var e=sh.entry,d=e?e.d:{},lb=lastOf(['bottle']),u=volUnit();
    var amt=e?convVol(d.amt,d.u,u):(lb&&lb.d.amt!=null?convVol(lb.d.amt,lb.d.u,u):(u==='oz'?3:90));
    var quick=u==='oz'?[1,2,3,4,5,6]:[30,60,90,120,150,180];
    var body=field('Time',timeInput('f-t',e?e.t:Date.now()),'f-t')+group('Milk',chips('milk',objOpts(MILK),d.milk||(lb&&lb.d.milk)||'breast',true))+
      field('Amount',numStep('f-amt',amt,u==='oz'?.5:10,u)+'<div class="quick">'+quick.map(function(q){return '<button type="button" class="q" data-action="set" data-for="f-amt" data-val="'+q+'">'+q+'</button>'}).join('')+'</div>','f-amt')+noteField(e&&e.note);
    return frame({title:e?'Edit bottle':'Bottle',cat:'feed',icon:'bottle',body:body,edit:!!e,saveLabel:e?'Save':'Log bottle'})},
   save:function(sh,f){var amt=num(f.get('f-amt'));if(amt==null||amt<=0)return 'Enter an amount.';var t=tIn(f);if(t==null)return 'Pick a time.';
    return {type:'bottle',t:t,d:{amt:amt,u:volUnit(),milk:f.get('milk')||'breast'},note:f.get('note')}}},
  pump:{html:function(sh){var e=sh.entry,d=e?e.d:{},u=volUnit(),running=timer('pump');
    var start=(!e&&!running)?'<div class="start-row one"><button type="button" class="big-start suggest" data-action="start-timer" data-kind="pump">Start pump timer<small>Add amounts when you finish</small></button></div><div class="or">or log a past session</div>':'';
    var body=start+'<div class="row2">'+field('Started',timeInput('f-t',e?e.t:Date.now()-20*MIN),'f-t')+field('Minutes',numPlain('f-dur',e&&d.dur?Math.round(d.dur/MIN):'','e.g. 15'),'f-dur')+'</div>'+
      '<div class="row3">'+field('Left',numPlain('f-pl',d.L!=null?convVol(d.L,d.u,u):'',u),'f-pl')+field('Right',numPlain('f-pr',d.R!=null?convVol(d.R,d.u,u):'',u),'f-pr')+field('Total',numPlain('f-pt',(d.L==null&&d.R==null&&d.total!=null)?convVol(d.total,d.u,u):'',u),'f-pt')+'</div>'+
      '<p class="hint">Fill in left and right, or just the total if you pumped both sides into one bottle.</p>'+noteField(e&&e.note);
    return frame({title:e?'Pumping session':'Pumping',cat:'pump',icon:'pump',body:body,edit:!!e,saveLabel:e?'Save':'Log session'})},
   save:function(sh,f){var u=volUnit(),L=num(f.get('f-pl')),R=num(f.get('f-pr')),tot=num(f.get('f-pt')),dm=num(f.get('f-dur'));var t=tIn(f);if(t==null)return 'Pick a start time.';
    if(L==null&&R==null&&tot==null&&!dm)return 'Enter an amount or how long you pumped.';
    if(L!=null||R!=null)tot=(L||0)+(R||0);var e=sh.entry,dur=dm!=null?(e&&e.d.dur&&Math.round(e.d.dur/MIN)===dm?e.d.dur:dm*MIN):null;
    return {type:'pump',t:t,end:dur?t+dur:t,d:{L:L,R:R,total:tot,u:u,dur:dur},note:f.get('note')}}},
  diaper:{html:function(sh){var e=sh.entry,d=e?e.d:{};
    var colors=objOpts(COLORS).map(function(o){return [o[0],o[1][0],'<i class="sw" style="background:'+o[1][1]+'"></i>']});
    var body=field('Time',timeInput('f-t',e?e.t:Date.now()),'f-t')+group('Type',chips('kind',objOpts(DIAPER),d.kind||null,true))+
      '<div id="dirty-box" class="sheet-in" style="padding:0;gap:16px"'+(d.kind==='dirty'||d.kind==='mixed'?'':' hidden')+'>'+group('Color',chips('color',colors,d.color||null))+
      '<p class="hint warn" id="stool-hint"'+(d.color==='red'||d.color==='black'||d.color==='pale'?'':' hidden')+'>Red, pale/white, or black stool after the first few days of life is worth a call to your pediatrician.</p>'+
      group('Consistency',chips('cons',objOpts(CONS),d.cons||null))+'</div>'+
      '<label class="check" for="f-rash"><input type="checkbox" id="f-rash" name="rash"'+(d.rash?' checked':'')+'> Diaper rash</label>'+noteField(e&&e.note);
    return frame({title:e?'Edit diaper':'Diaper',cat:'diaper',icon:'diaper',body:body,edit:!!e,saveLabel:e?'Save':'Log diaper'})},
   change:function(f){var k=f.get('kind'),c=f.get('color');var box=$('#dirty-box');if(box)box.hidden=!(k==='dirty'||k==='mixed');var h=$('#stool-hint');if(h)h.hidden=!(c==='red'||c==='black'||c==='pale')},
   save:function(sh,f){var k=f.get('kind');if(!k)return 'Pick wet, dirty, both, or dry.';var t=tIn(f);if(t==null)return 'Pick a time.';var dirty=k==='dirty'||k==='mixed';
    return {type:'diaper',t:t,d:{kind:k,color:dirty?(f.get('color')||null):null,cons:dirty?(f.get('cons')||null):null,rash:!!f.get('rash')},note:f.get('note')}}},
  sleep:{html:function(sh){var e=sh.entry,d=e?e.d:{},running=timer('sleep'),now=Date.now();
    var start=(!e&&!running)?'<div class="start-row one"><button type="button" class="big-start suggest" data-action="start-timer" data-kind="sleep">Start sleep timer<small>Tap "Woke up" when they wake</small></button></div><div class="or">or log a past sleep</div>':'';
    var body=start+'<div class="row2">'+field('Fell asleep',timeInput('f-t',e?e.t:now-HOUR),'f-t')+field('Woke up',timeInput('f-end',e?e.end:now),'f-end')+'</div>'+group('Where',chips('where',objOpts(WHERE),d.where||null))+noteField(e&&e.note);
    return frame({title:e?'Edit sleep':'Sleep',cat:'sleep',icon:'sleep',body:body,edit:!!e,saveLabel:e?'Save':'Log sleep'})},
   save:function(sh,f){var t=tIn(f),end=fromLocalInput(f.get('f-end'));if(t==null||end==null)return 'Pick both times.';if(end<=t)return 'Wake time needs to be after the start.';if(end-t>20*HOUR)return 'That sleep is over 20 hours. Check the times.';
    return {type:'sleep',t:t,end:end,d:{where:f.get('where')||null},note:f.get('note')}}},
  solids:{html:function(sh){var e=sh.entry,d=e?e.d:{};
    var body=field('Time',timeInput('f-t',e?e.t:Date.now()),'f-t')+field('Food',textInput('f-food',d.food,'e.g. sweet potato',uniq(prior('food','solids').concat(FOODS))),'f-food')+
      field('Amount',textInput('f-amtx',d.amt,'e.g. 2 tbsp, half a pouch'),'f-amtx')+group('Reaction',chips('react',objOpts(REACT),d.react||null))+group('Prepared',chips('prep',objOpts(PREP),d.prep||null))+
      '<label class="check" for="f-allergy"><input type="checkbox" id="f-allergy" name="allergy"'+(d.allergy?' checked':'')+'> Possible allergic reaction (rash, hives, vomiting)</label>'+noteField(e&&e.note);
    return frame({title:e?'Edit solids':'Solids',cat:'solids',icon:'solids',body:body,edit:!!e,saveLabel:e?'Save':'Log solids'})},
   save:function(sh,f){var food=String(f.get('f-food')||'').trim();if(!food)return 'What did they eat?';var t=tIn(f);if(t==null)return 'Pick a time.';
    return {type:'solids',t:t,d:{food:food,amt:String(f.get('f-amtx')||'').trim(),react:f.get('react')||null,prep:f.get('prep')||null,allergy:!!f.get('allergy')},note:f.get('note')}}},
  med:{html:function(sh){var e=sh.entry,d=e?e.d:{};
    var body=field('Time given',timeInput('f-t',e?e.t:Date.now()),'f-t')+field('Medicine',textInput('f-med',d.name,'e.g. Vitamin D drops',uniq(prior('name','med').concat(MEDS))),'f-med')+
      '<div class="row2">'+field('Dose',numPlain('f-dose',d.dose,'amount'),'f-dose')+group('Unit',chips('unit',[['ml','ml'],['mg','mg'],['drops','drops'],['dose','dose']],d.unit||'ml'))+'</div>'+
      '<p class="hint">Doses given in the last 24 hours show at the top of Today with who gave them, so you don\'t double up.</p>'+noteField(e&&e.note);
    return frame({title:e?'Edit medicine':'Medicine',cat:'health',icon:'med',body:body,edit:!!e,saveLabel:e?'Save':'Log dose'})},
   save:function(sh,f){var name=String(f.get('f-med')||'').trim();if(!name)return 'Which medicine?';var t=tIn(f);if(t==null)return 'Pick a time.';
    return {type:'med',t:t,d:{name:name,dose:num(f.get('f-dose')),unit:f.get('unit')||'ml'},note:f.get('note')}}},
  temp:{html:function(sh){var e=sh.entry,d=e?e.d:{},u=d.u||(isUS()?'F':'C');
    var body=field('Time',timeInput('f-t',e?e.t:Date.now()),'f-t')+'<div class="row2">'+field('Temperature',numPlain('f-temp',d.v,u==='F'?'98.6':'37.0'),'f-temp')+group('Scale',chips('tu',[['F','°F'],['C','°C']],u))+'</div>'+
      group('Taken',chips('method',objOpts(METHOD),d.method||null))+'<p class="hint warn" id="fever-hint" hidden>100.4 °F (38 °C) or higher counts as a fever. Under 3 months old, call your pediatrician right away.</p>'+noteField(e&&e.note);
    return frame({title:e?'Edit temperature':'Temperature',cat:'health',icon:'temp',body:body,edit:!!e,saveLabel:e?'Save':'Log temp'})},
   change:function(f){var v=num(f.get('f-temp')),u=f.get('tu')||'F',h=$('#fever-hint');if(h)h.hidden=!(v!=null&&tempIn(v,u,'F')>=100.4&&tempIn(v,u,'F')<115)},
   mount:function(){var f=$('#sheet-form');if(f)SHEETS.temp.change(new FormData(f))},
   save:function(sh,f){var v=num(f.get('f-temp')),u=f.get('tu')||'F';if(v==null)return 'Enter the reading.';var F=tempIn(v,u,'F');if(F<90||F>110)return 'That reading looks off. Check the number and the °F/°C setting.';var t=tIn(f);if(t==null)return 'Pick a time.';
    return {type:'temp',t:t,d:{v:v,u:u,method:f.get('method')||null},note:f.get('note')}}},
  health:{html:function(sh){var e=sh.entry,d=e?e.d:{},tab=e?(e.type==='symptom'?'symptom':e.type):(sh.tab||'symptom');
    var tabs=e?'':group('What are you logging?',chips('htype',[['symptom','Symptom'],['vaccine','Vaccine'],['visit','Doctor visit']],tab));
    var today=dayKey(Date.now());
    var body=tabs+
      '<div class="sheet-in" style="padding:0" data-h="symptom"'+(tab==='symptom'?'':' hidden')+'>'+field('Time',timeInput('f-t',e&&!e.rec?e.t:Date.now()),'f-t')+field('Symptom',textInput('f-what',e&&e.type==='symptom'?d.what:'','e.g. congestion',uniq(prior('what','symptom').concat(SYMPTOMS))),'f-what')+group('Severity',chips('sev',objOpts(SEV),d.sev||null))+'</div>'+
      '<div class="sheet-in" style="padding:0" data-h="vaccine"'+(tab==='vaccine'?'':' hidden')+'>'+field('Date',dateInput('f-vdate',e&&e.type==='vaccine'?e.date:today),'f-vdate')+field('Vaccine',textInput('f-vname',e&&e.type==='vaccine'?d.name:'','e.g. Hep B, DTaP',VACCINES),'f-vname')+'<p class="hint">Log several at once as a comma list, e.g. "DTaP, Hib, PCV".</p></div>'+
      '<div class="sheet-in" style="padding:0" data-h="visit"'+(tab==='visit'?'':' hidden')+'>'+field('Date',dateInput('f-vsdate',e&&e.type==='visit'?e.date:today),'f-vsdate')+field('Visit',textInput('f-vswhat',e&&e.type==='visit'?d.what:'','e.g. 2-week checkup',VISITS),'f-vswhat')+field('With',textInput('f-vswho',e&&e.type==='visit'?d.who:'','Pediatrician or clinic (optional)'),'f-vswho')+'</div>'+
      noteField(e&&e.note);
    var titles={symptom:'Symptom',vaccine:'Vaccine',visit:'Doctor visit'};
    return frame({title:e?'Edit '+titles[tab].toLowerCase():'Health',cat:'health',icon:e?TYPES[e.type].icon:'health',body:body,edit:!!e})},
   change:function(f){var tab=f.get('htype');if(!tab)return;$$('[data-h]').forEach(function(el){el.hidden=el.getAttribute('data-h')!==tab})},
   save:function(sh,f){var e=sh.entry,tab=e?(e.type==='symptom'?'symptom':e.type):(f.get('htype')||'symptom');
    if(tab==='symptom'){var what=String(f.get('f-what')||'').trim();if(!what)return 'Describe the symptom.';var t=tIn(f);if(t==null)return 'Pick a time.';return {type:'symptom',t:t,d:{what:what,sev:f.get('sev')||null},note:f.get('note')}}
    if(tab==='vaccine'){var n=String(f.get('f-vname')||'').trim(),dt=f.get('f-vdate');if(!n)return 'Which vaccine?';if(!dt)return 'Pick a date.';return {type:'vaccine',rec:true,date:dt,d:{name:n},note:f.get('note')}}
    var w=String(f.get('f-vswhat')||'').trim(),dv=f.get('f-vsdate');if(!w)return 'What was the visit for?';if(!dv)return 'Pick a date.';return {type:'visit',rec:true,date:dv,d:{what:w,who:String(f.get('f-vswho')||'').trim()},note:f.get('note')}}},
  growth:{html:function(sh){var e=sh.entry,d=e?e.d:{},us=isUS();
    var wIn;if(us){var lb='',oz='';if(d.g){var toz=d.g/28.349523;lb=Math.floor(toz/16);oz=Math.round((toz-lb*16)*10)/10}wIn='<div class="row2">'+numPlain('f-lb',lb,'lb')+numPlain('f-oz',oz,'oz')+'</div>'}
    else wIn=numPlain('f-kg',d.g?trim(d.g/1000,3):'','kg');
    var body=field('Date',dateInput('f-date',e?e.date:dayKey(Date.now())),'f-date')+field('Weight ('+(us?'lb + oz':'kg')+')',wIn)+
      '<div class="row2">'+field('Length ('+(us?'in':'cm')+')',numPlain('f-len',d.cm?(us?trim(d.cm/2.54,2):trim(d.cm,1)):'',us?'in':'cm'),'f-len')+field('Head ('+(us?'in':'cm')+')',numPlain('f-head',d.head?(us?trim(d.head/2.54,2):trim(d.head,1)):'',us?'in':'cm'),'f-head')+'</div>'+noteField(e&&e.note);
    return frame({title:e?'Edit measurement':'Growth',cat:'growth',icon:'growth',body:body,edit:!!e})},
   save:function(sh,f){var us=isUS(),g=null;
    if(us){var lb=num(f.get('f-lb')),oz=num(f.get('f-oz'));if(lb!=null||oz!=null)g=((lb||0)*16+(oz||0))*28.349523}else{var kg=num(f.get('f-kg'));if(kg!=null)g=kg*1000}
    var len=num(f.get('f-len')),head=num(f.get('f-head'));var cm=len!=null?(us?len*2.54:len):null,hd=head!=null?(us?head*2.54:head):null;
    var e=sh.entry;if(e){if(e.d.cm&&len!=null&&trim(us?e.d.cm/2.54:e.d.cm,us?2:1)===trim(len,us?2:1))cm=e.d.cm;if(e.d.head&&head!=null&&trim(us?e.d.head/2.54:e.d.head,us?2:1)===trim(head,us?2:1))hd=e.d.head}
    if(!g&&!cm&&!hd)return 'Enter at least one measurement.';var dt=f.get('f-date');if(!dt)return 'Pick a date.';
    return {type:'growth',rec:true,date:dt,d:{g:g,cm:cm,head:hd},note:f.get('note')}}},
  activity:{html:function(sh){var e=sh.entry,d=e?e.d:{},running=timer('act');
    var body=group('Activity',chips('act',objOpts(ACT),d.act||'tummy'))+
      ((!e&&!running)?'<div class="start-row one"><button type="button" class="big-start suggest" data-action="start-activity">Start timer<small>for the activity picked above</small></button></div><div class="or">or log one you did</div>':'')+
      '<div class="row2">'+field('Started',timeInput('f-t',e?e.t:Date.now()-15*MIN),'f-t')+field('Minutes',numPlain('f-dur',e&&d.dur?Math.round(d.dur/MIN):'','optional'),'f-dur')+'</div>'+noteField(e&&e.note);
    return frame({title:e?'Edit activity':'Activity',cat:'activity',icon:'activity',body:body,edit:!!e,saveLabel:e?'Save':'Log activity'})},
   save:function(sh,f){var t=tIn(f);if(t==null)return 'Pick a time.';var m=num(f.get('f-dur')),e=sh.entry,dur=m!=null?(e&&e.d.dur&&Math.round(e.d.dur/MIN)===m?e.d.dur:m*MIN):null;
    return {type:'activity',t:t,end:dur?t+dur:t,d:{act:f.get('act')||'other',dur:dur},note:f.get('note')}}},
  milestone:{html:function(sh){var e=sh.entry,d=e?e.d:{};
    var body=field('Date',dateInput('f-date',e?e.date:dayKey(Date.now())),'f-date')+field('Milestone',textInput('f-ms',d.name,'e.g. first smile',MILESTONES),'f-ms')+noteField(e&&e.note);
    return frame({title:e?'Edit milestone':'Milestone',cat:'milestone',icon:'milestone',body:body,edit:!!e})},
   save:function(sh,f){var n=String(f.get('f-ms')||'').trim();if(!n)return 'Name the milestone.';var dt=f.get('f-date');if(!dt)return 'Pick a date.';return {type:'milestone',rec:true,date:dt,d:{name:n},note:f.get('note')}}},
  note:{html:function(sh){var e=sh.entry;
    var body=field('Time',timeInput('f-t',e?e.t:Date.now()),'f-t')+field('Note','<textarea id="f-note" name="note" rows="4" placeholder="Anything worth remembering: a question for the doctor, a rough night, a new trick">'+esc(e?e.note:'')+'</textarea>','f-note');
    return frame({title:e?'Edit note':'Note',cat:'note',icon:'note',body:body,edit:!!e})},
   save:function(sh,f){var t=tIn(f),n=String(f.get('note')||'').trim();if(!n)return 'Write something first.';if(t==null)return 'Pick a time.';return {type:'note',t:t,d:{},note:n}}},
  baby:{html:function(sh){var b=sh.id?S.babies[sh.id]:null;
    var body=field('Name',textInput('f-bname',b?b.name:'','Name or nickname'),'f-bname')+field('Birth date (or due date)',dateInput('f-birth',b?b.birth:''),'f-birth')+group('Sex',chips('sex',[['boy','Boy'],['girl','Girl'],['','Not set']],b?(b.sex||''):''))+
      (b&&Object.keys(S.babies).length>1?'<button type="button" class="btn danger" data-action="remove-baby">Remove from app</button><p class="hint">Removing hides this child here. Logged entries stay in the shared history.</p>':'');
    return frame({title:b?'Edit '+(b.name||'baby'):'Add baby',cat:'sleep',icon:'baby',body:body})},
   save:function(sh,f){var n=String(f.get('f-bname')||'').trim();if(!n)return 'Add a name (a nickname is fine).';var b=sh.id?S.babies[sh.id]:null,id=sh.id||newId('b');
    saveBaby(id,{name:n,birth:f.get('f-birth')||'',sex:f.get('sex')||'',created:b?b.created||Date.now():Date.now(),by:b?b.by||null:(S.uid||null)}).catch(function(){});
    S.babyId=id;LS.set('baby',id);return 'done'}},
  who:{html:function(){var me=S.people[S.uid];var body='<p class="hint">Shown next to what you log, so your partner can tell who did the last feed.</p>'+field('Your name',textInput('f-who',(me&&me.name)||S.who,'e.g. Mom, Dad, Grandma'),'f-who')+
      '<div class="quick">'+['Mom','Dad','Grandma','Grandpa','Nanny'].map(function(x){return '<button type="button" class="q" style="font-family:var(--f-body)" data-action="set" data-for="f-who" data-val="'+x+'">'+x+'</button>'}).join('')+'</div>';
    return frame({title:'Who\'s logging?',cat:'note',icon:'baby',body:body})},
   save:function(sh,f){var n=String(f.get('f-who')||'').trim();if(!n)return 'Add a name.';S.who=n;LS.set('who',n);var body={name:n,email:S.email||'',u:Date.now()};S.people[S.uid]=body;
    S.db.collection('people').doc(S.uid).set(body).catch(handleWriteError);render();return 'done'}},
  adjust:{html:function(sh){var t=timer(sh.kind);if(!t)return frame({title:'Timer finished',cat:'note',icon:'today',body:'<p class="hint">This timer was already stopped, possibly on your partner\'s phone.</p>',noSave:true});var a=sh.kind==='nurse'?t.segs[0].a:t.a;
    var body=field('Started at',timeInput('f-t',a),'f-t')+'<p class="hint">Forgot to start the timer? Set when it really began. The clock keeps running.</p>';
    return frame({title:'Adjust start',cat:sh.kind==='nurse'?'feed':sh.kind==='act'?'activity':sh.kind,icon:sh.kind==='nurse'?'nurse':sh.kind==='act'?'activity':sh.kind,body:body})},
   save:function(sh,f){var t=timer(sh.kind);if(!t)return 'done';var a=tIn(f);if(a==null)return 'Pick a time.';if(a>Date.now())return 'Start time can\'t be in the future.';
    if(sh.kind==='nurse'){var segs=t.segs.map(function(s){return Object.assign({},s)});var lim=segs[0].b!=null?segs[0].b:Date.now();if(a>=lim)return 'Start needs to be before the first side ended.';segs[0].a=a;putTimer('nurse',Object.assign({},t,{segs:segs,u:Date.now()}))}
    else putTimer(sh.kind,Object.assign({},t,{a:a,u:Date.now()}));return 'done'}}
};

function openSheet(kind,opts){S.sheet=Object.assign({kind:kind},opts||{});renderSheet()}
function openEdit(id){var e=babyEntries().concat(babyRecords()).filter(function(x){return x.id===id})[0]||allEntries().filter(function(x){return x.id===id})[0];if(!e){toast('That entry was removed.');return}
  if(!S.canWrite){toast('View only. You can\'t edit entries.');return}
  openSheet(TYPES[e.type].sheet,{entry:e})}
function renderSheet(){var sh=S.sheet,def=SHEETS[sh.kind],el=$('#sheet');
  el.innerHTML='<div class="scrim" data-action="close-sheet"></div><div class="panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">'+def.html(sh)+'</div>';
  el.hidden=false;document.body.classList.add('locked');if(def.mount)def.mount(sh);
  var p=$('.panel',el);if(p)p.scrollTop=0;}
function closeSheet(){S.sheet=null;var el=$('#sheet');el.hidden=true;el.innerHTML='';document.body.classList.remove('locked')}
function formErr(msg){var el=$('#form-err');if(el){el.textContent=msg;el.hidden=false;el.scrollIntoView({block:'nearest'})}}

/* ---------- events ---------- */
document.addEventListener('change',function(ev){var f=ev.target.form;if(!f||f.id!=='sheet-form'||!S.sheet)return;var def=SHEETS[S.sheet.kind];if(def.change)def.change(new FormData(f))});
document.addEventListener('input',function(ev){var f=ev.target.form;if(!f||f.id!=='sheet-form'||!S.sheet)return;var def=SHEETS[S.sheet.kind];if(def.change)def.change(new FormData(f))});
document.addEventListener('submit',function(ev){if(ev.target.id==='login-form'){ev.preventDefault();doLogin(ev.target);return}if(ev.target.id!=='sheet-form')return;ev.preventDefault();var sh=S.sheet;if(!sh)return;var def=SHEETS[sh.kind];
  if(!S.canWrite&&sh.kind!=='who'){formErr('This page is view-only for you.');return}
  var res;try{res=def.save(sh,new FormData(ev.target))}catch(err){console.error(err);formErr('Something went wrong saving that. Try again.');return}
  if(typeof res==='string'&&res!=='done'){formErr(res);return}
  if(res==='done'){closeSheet();render();return}
  if(!res)return;
  var old=sh.entry,label=TYPES[res.type].label;
  var p=res.rec?commitRecord(res,old):commitEntry(res,old,sh.entryId);
  closeSheet();toast(old?label+' updated':label+' logged');p.catch(function(){});
});
document.addEventListener('click',function(ev){
  var btn=ev.target.closest('[data-action]');if(!btn)return;var a=btn.getAttribute('data-action');
  var needsWrite={'log':1,'nurse-side':1,'nurse-pause':1,'nurse-done':1,'timer-done':1,'timer-discard':1,'timer-adjust':1,'start-nurse':1,'start-timer':1,'start-activity':1,'units':1,'edit-baby':1};
  if(needsWrite[a]&&!S.canWrite){toast('View only. Ask for Editor access to log.');return}
  switch(a){
    case 'go':S.view=btn.getAttribute('data-view');LS.set('view',S.view);if(S.view==='history'&&S.histDay==null)S.histDay=startOfDay(Date.now());window.scrollTo(0,0);doRender();break;
    case 'log':var k=btn.getAttribute('data-kind');
      var tmap={nurse:'nurse',sleep:'sleep',pump:'pump',activity:'act'};var tkind=tmap[k];
      if(tkind&&timer(tkind)){var card=$('.live');if(card)card.scrollIntoView({behavior:'smooth',block:'start'});toast('Already running. Use the timer card at the top.');break}
      var smap={temp:'temp',med:'med',health:'health'};openSheet(smap[k]||k);break;
    case 'open':openSheet(btn.getAttribute('data-sheet'),{tab:btn.getAttribute('data-tab')});break;
    case 'close-sheet':closeSheet();break;
    case 'edit':openEdit(btn.getAttribute('data-id'));break;
    case 'step':var inp=$('#'+btn.getAttribute('data-for'));if(inp){var st=parseFloat(btn.getAttribute('data-step')),v=(num(inp.value)||0)+st;inp.value=String(Math.max(0,Number(v.toFixed(2))));inp.dispatchEvent(new Event('input',{bubbles:true}))}break;
    case 'set':var inp2=$('#'+btn.getAttribute('data-for'));if(inp2){inp2.value=btn.getAttribute('data-val');inp2.dispatchEvent(new Event('input',{bubbles:true}))}break;
    case 'start-nurse':closeSheet();startNurse(btn.getAttribute('data-side'));window.scrollTo({top:0,behavior:'smooth'});break;
    case 'start-timer':var kk=btn.getAttribute('data-kind');closeSheet();startSimple(kk);window.scrollTo({top:0,behavior:'smooth'});break;
    case 'start-activity':var f=$('#sheet-form');var act=f?new FormData(f).get('act')||'tummy':'tummy';closeSheet();startSimple('act',{act:act});window.scrollTo({top:0,behavior:'smooth'});break;
    case 'nurse-side':nurseSide(btn.getAttribute('data-side'));break;
    case 'nurse-pause':nursePause();break;
    case 'nurse-done':nurseDone();break;
    case 'timer-done':finishSimple(btn.getAttribute('data-kind'));break;
    case 'timer-adjust':openSheet('adjust',{kind:btn.getAttribute('data-kind')});break;
    case 'timer-discard':if(armed(btn,'Tap again to discard'))dropTimer(btn.getAttribute('data-kind'));break;
    case 'delete-entry':if(armed(btn,'Tap again to delete')){var old=S.sheet&&S.sheet.entry;if(old){var lbl=TYPES[old.type].label;deleteEntry(old).catch(function(){});closeSheet();toast(lbl+' deleted')}}break;
    case 'hist-step':var today=startOfDay(Date.now()),cur=S.histDay!=null?S.histDay:today;S.histDay=Math.min(today,addDays(cur,+btn.getAttribute('data-step')));doRender();break;
    case 'hist-today':S.histDay=startOfDay(Date.now());doRender();break;
    case 'hist-filter':S.histFilter=btn.getAttribute('data-f');doRender();break;
    case 'trend-range':S.trendDays=+btn.getAttribute('data-n');doRender();break;
    case 'pick-baby':S.babyId=btn.getAttribute('data-id');LS.set('baby',S.babyId);S.ver++;doRender();break;
    case 'edit-baby':openSheet('baby',{id:btn.getAttribute('data-id')});break;
    case 'remove-baby':if(armed(btn,'Tap again to remove')){var id=S.sheet&&S.sheet.id;if(id){delete S.babies[id];enqueue('b:'+id,function(){return S.db.collection('babies').doc(id).delete()}).catch(handleWriteError);closeSheet();pickBaby();render();toast('Removed')}}break;
    case 'units':saveSettings({units:btn.getAttribute('data-u')});break;
    case 'export':exportCsv();break;
    case 'forgot':doForgot();break;
    case 'signout':B.signOut().catch(function(){});break;
    case 'share-export':shareExport();break;
    case 'toast-act':$('#toast').hidden=true;if(toastFn)toastFn();break;
  }
});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&S.sheet)closeSheet()});
function armed(btn,label){var t=+btn.getAttribute('data-armed')||0;if(t&&Date.now()-t<3500)return true;btn.setAttribute('data-armed',String(Date.now()));var orig=btn.textContent;btn.textContent=label;btn.classList.add('armed');
  setTimeout(function(){if(btn.isConnected&&btn.getAttribute('data-armed')){btn.textContent=orig;btn.classList.remove('armed');btn.removeAttribute('data-armed')}},3500);return false}

/* ---------- export ---------- */
function csvCell(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function exportCsv(){
  var b=baby();toast('Preparing export…');
  S.db.collection('logs').limit(1000).get().then(function(snap){
    var m={};snap.docs.forEach(function(d){var ents=(d.data()||{}).entries||{};for(var k in ents){var e;try{e=JSON.parse(ents[k])}catch(x){continue}if(!e||!TYPES[e.type])continue;var p=m[e.id];if(!p||e.u>p.u||(e.u===p.u&&p.del&&!e.del))m[e.id]=e}});
    var rows=[];for(var k2 in m){var e2=m[k2];if(!e2.del&&e2.baby===S.babyId){e2.d=e2.d||{};if(e2.end==null)e2.end=e2.t;rows.push(e2)}}
    rows=rows.concat(babyRecords());rows.sort(function(a,c){return a.t-c.t});
    var out=[['Date','Start','End','Minutes','Type','Details','Note','Logged by'].join(',')];
    rows.forEach(function(e){var ds=describe(e),dur=e.end&&e.end>e.t?Math.round((e.end-e.t)/MIN):'';
      out.push([dayKey(e.t),e.rec?'':fmtTime(e.t),e.rec||e.end===e.t?'':fmtTime(e.end),dur,TYPES[e.type].label,[ds.title,ds.sub].filter(Boolean).join(' — '),e.note||'',personName(e)].map(csvCell).join(','))});
    var fname=((b&&b.name)||'baby').replace(/[^A-Za-z0-9 _-]/g,'').trim().replace(/\s+/g,'-')+'-log-'+dayKey(Date.now())+'.csv';
    S.exportFile={name:fname,data:out.join('\n'),rows:rows.length};render();toast('Export ready · '+rows.length+' entries');
  }).catch(function(){toast("Couldn't load the full log. Check your connection and try again.")});
}
function shareExport(){
  var x=S.exportFile;if(!x)return;var blob=new Blob([x.data],{type:'text/csv'});var file;try{file=new File([blob],x.name,{type:'text/csv'})}catch(e){file=null}
  function download(){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=x.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(url);a.remove()},1500)}
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:x.name}).catch(function(err){if(!err||err.name!=='AbortError')download()})}
  else download();
}

/* ---------- data wiring ---------- */
function onSubErr(err){
  var code=err&&err.code;
  if(code==='permission-denied'){S.status='blocked';teardown(true);render();return}
  S.subErr='Live updates stopped. Reload the app to reconnect.';render();
}
function pickBaby(){var ids=Object.keys(S.babies);if(S.babyId&&S.babies[S.babyId])return;ids.sort(function(a,c){return (S.babies[a].created||0)-(S.babies[c].created||0)});S.babyId=ids[0]||null;LS.set('baby',S.babyId)}
function subscribe(){
  teardown(false);var db=S.db;
  S.unsubs.push(db.collection('babies').onSnapshot(function(snap){var o={};snap.docs.forEach(function(d){o[d.id]=d.data()});S.babies=o;S.babiesReady=true;pickBaby();render()},onSubErr));
  S.unsubs.push(db.doc('settings/family').onSnapshot(function(d){S.settings=Object.assign({units:'us'},d.exists?d.data():{});render()},onSubErr));
  S.unsubs.push(db.collection('timers').onSnapshot(function(snap){var o={};snap.docs.forEach(function(d){o[d.id]=d.data()});S.timers=o;render()},onSubErr));
  S.unsubs.push(db.collection('records').onSnapshot(function(snap){var o={};snap.docs.forEach(function(d){o[d.id]=d.data()});S.records=o;render()},onSubErr));
  S.unsubs.push(db.collection('people').onSnapshot(function(snap){var o={};snap.docs.forEach(function(d){o[d.id]=d.data()});S.people=o;S.peopleReady=true;render();maybeAskWho()},onSubErr));
  subscribeLogs();
}
function subscribeLogs(){
  if(S.logUnsub)try{S.logUnsub()}catch(e){}
  S.liveFrom=weekKey(Date.now()-14*DAY);
  S.logUnsub=S.db.collection('logs').where('week','>=',S.liveFrom).onSnapshot(function(snap){var o={};snap.docs.forEach(function(d){o[d.id]=d.data()});S.live=o;S.logsReady=true;S.ver++;render()},onSubErr);
}
function teardown(keepStatus){
  S.unsubs.forEach(function(u){try{u()}catch(e){}});S.unsubs=[];if(S.logUnsub){try{S.logUnsub()}catch(e){}S.logUnsub=null}
}
function maybeAskWho(){
  if(S.askedWho||!S.peopleReady||!S.uid||S.status!=='ready')return;
  if(S.people[S.uid]&&S.people[S.uid].name)return;
  S.askedWho=true;
  if(S.who){var body={name:S.who,email:S.email||'',u:Date.now()};S.people[S.uid]=body;S.db.collection('people').doc(S.uid).set(body).catch(function(){});return}
  setTimeout(function(){if(!S.sheet)openSheet('who')},500);
}
function authErr(err){
  var c=err&&err.code||'';
  if(c==='auth/invalid-credential'||c==='auth/wrong-password'||c==='auth/user-not-found'||c==='auth/invalid-login-credentials')return "That email and password don't match. Check both, or reset your password below.";
  if(c==='auth/invalid-email')return 'That email address looks incomplete.';
  if(c==='auth/too-many-requests')return 'Too many tries. Wait a few minutes, or reset your password below.';
  if(c==='auth/network-request-failed')return 'No connection. Check your signal and try again.';
  if(c==='auth/user-disabled')return 'This account is turned off in Firebase.';
  if(c==='auth/missing-password')return 'Enter your password.';
  return 'Sign-in failed ('+(c||'unknown error')+'). Try again.';
}
function doLogin(form){
  var f=new FormData(form),email=String(f.get('email')||'').trim(),pw=String(f.get('password')||'');
  var err=$('#login-err'),btn=$('#login-btn'),note=$('#login-note');if(note)note.hidden=true;
  if(!email||!pw){err.textContent='Enter your email and password.';err.hidden=false;return}
  err.hidden=true;btn.disabled=true;btn.textContent='Signing in…';
  B.signIn(email,pw).catch(function(e){err.textContent=authErr(e);err.hidden=false;btn.disabled=false;btn.textContent='Sign in'});
}
function doForgot(){
  var inp=$('#f-email'),err=$('#login-err'),note=$('#login-note');var email=inp?String(inp.value).trim():'';
  if(!email){err.textContent='Type your email above first, then tap Forgot password.';err.hidden=false;return}
  err.hidden=true;
  B.reset(email).then(function(){note.textContent='If '+email+' has an account, a reset link is on its way. Check spam too.';note.hidden=false}).catch(function(e){err.textContent=authErr(e);err.hidden=false});
}
window.addEventListener('online',function(){S.offline=false;render()});
window.addEventListener('offline',function(){S.offline=true;render()});
function init(){
  render();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(function(){});
  if(!B){S.status='unconfigured';doRender();return}
  S.db=B.db;
  B.onAuth(function(u){
    if(u){
      if(S.uid&&S.uid!==u.uid){S.live={};S.older={};S.olderWeeks={};S.babies={};S.timers={};S.records={};S.people={};S.ver++}
      S.uid=u.uid;S.email=u.email;S.wk=String(u.uid).replace(/[^A-Za-z0-9_\-.:@+]/g,'-');S.status='ready';S.canWrite=true;S.subErr='';S.babiesReady=false;S.peopleReady=false;S.askedWho=false;
      subscribe();
    }else{
      teardown(false);closeSheet();S.uid=null;S.email='';S.status='signedout';S.live={};S.older={};S.olderWeeks={};S.babies={};S.timers={};S.records={};S.people={};S.logsReady=false;S.babiesReady=false;S.exportFile=null;S.ver++;
    }
    doRender();
  });
}
init();
})();
