// In-memory stand-in for Firebase Auth + Firestore, used by dev/mock.html.
// Defines window.__mockBackend, which app.js uses instead of Firebase when present.
(function(){
  function makeHub(){return {store:{},listeners:[],allow:['mom@example.com','dad@example.com'],calls:[]}}
  var hub=(window.parent&&window.parent!==window&&window.parent.__hub)||(window.__hub=window.__hub||makeHub());
  var params=new URLSearchParams(location.search);
  var USERS={'mom@example.com':{uid:'uMom',pw:'pw'},'dad@example.com':{uid:'uDad',pw:'pw'},'stranger@example.com':{uid:'uX',pw:'pw'}};
  var cur=null,authCbs=[];
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function merge(t,s){for(var k in s){var v=s[k];if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object')t[k]={};merge(t[k],v)}else t[k]=clone(v)}}
  function allowed(){return cur&&hub.allow.indexOf(cur.email)>=0}
  function denied(){return Promise.reject({code:'permission-denied',message:'denied'})}
  function snapDoc(path){var d=hub.store[path];return {id:path.split('/').pop(),exists:!!d,data:function(){return d?clone(d):undefined},metadata:{fromCache:false,hasPendingWrites:false}}}
  function notify(){setTimeout(function(){hub.listeners.slice().forEach(function(l){try{l()}catch(e){}})},10)}
  function listen(run,next,err){if(!allowed()){setTimeout(function(){err&&err({code:'permission-denied'})},10);return function(){}}
    var l=function(){next(run())};hub.listeners.push(l);setTimeout(l,15);return function(){var i=hub.listeners.indexOf(l);if(i>=0)hub.listeners.splice(i,1)}}
  function q(col,filters,lim){filters=filters||[];
    function run(){var docs=Object.keys(hub.store).filter(function(p){return p.split('/').slice(0,-1).join('/')===col}).sort();
      filters.forEach(function(f){docs=docs.filter(function(p){var x=hub.store[p][f[0]];switch(f[1]){case '==':return x===f[2];case '>=':return x>=f[2];case '<':return x<f[2]}return true})});
      if(lim)docs=docs.slice(0,lim);var ds=docs.map(snapDoc);return {docs:ds,size:ds.length,empty:!ds.length}}
    return {path:col,where:function(f,o,v){return q(col,filters.concat([[f,o,v]]),lim)},limit:function(n){return q(col,filters,n)},
      get:function(){return allowed()?Promise.resolve(run()):denied()},onSnapshot:function(n,e){return listen(run,n,e)},doc:function(id){return d(col+'/'+id)}}}
  function d(path){return {id:path.split('/').pop(),path:path,
    get:function(){return allowed()?Promise.resolve(snapDoc(path)):denied()},
    set:function(x){if(!allowed())return denied();hub.calls.push(['set',path]);hub.store[path]=clone(x);notify();return Promise.resolve()},
    merge:function(x){if(!allowed())return denied();hub.calls.push(['merge',path]);hub.store[path]=hub.store[path]||{};merge(hub.store[path],x);notify();return Promise.resolve()},
    update:function(x){if(!allowed())return denied();if(!hub.store[path])return Promise.reject({code:'not-found'});merge(hub.store[path],x);notify();return Promise.resolve()},
    delete:function(){if(!allowed())return denied();hub.calls.push(['delete',path]);delete hub.store[path];notify();return Promise.resolve()},
    onSnapshot:function(n,e){return listen(function(){return snapDoc(path)},n,e)}}}
  function fire(){var u=cur?{uid:cur.uid,email:cur.email}:null;authCbs.forEach(function(cb){cb(u)})}
  window.__mockBackend={db:{collection:function(p){return q(p)},doc:function(p){return d(p)}},
    onAuth:function(cb){authCbs.push(cb);setTimeout(function(){cb(cur?{uid:cur.uid,email:cur.email}:null)},20);return function(){}},
    signIn:function(email,pw){return new Promise(function(res,rej){setTimeout(function(){var u=USERS[String(email).toLowerCase()];if(!u||u.pw!==pw)return rej({code:'auth/invalid-credential'});cur={uid:u.uid,email:String(email).toLowerCase()};res();fire()},50)})},
    reset:function(email){hub.calls.push(['reset',email]);return Promise.resolve()},
    signOut:function(){cur=null;fire();return Promise.resolve()}};
  var auto=params.get('auto');if(auto&&USERS[auto]){cur={uid:USERS[auto].uid,email:auto}}
})();
