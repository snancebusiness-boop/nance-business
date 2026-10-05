// Nance Group — core
let currentUser = null, currentBoutique = null, boutiques = [], currentTab = 'dashboard', currentView = 'boutique';
let chatBoutiqueId = null, chatInterval = null, notifInterval = null;
let lockTimer = null, lockDelay = 15; // minutes par défaut
const LOCK_EVENTS = ['mousemove','keydown','click','touchstart','scroll'];

function resetLockTimer() {
  if(lockTimer) clearTimeout(lockTimer);
  if(!currentUser) return;
  lockTimer = setTimeout(()=>{
    // Verrouiller l'écran
    afficherEcranVerrouillage();
  }, lockDelay * 60 * 1000);
}

function startLockTimer() {
  LOCK_EVENTS.forEach(e => document.addEventListener(e, resetLockTimer, {passive:true}));
  resetLockTimer();
}

function stopLockTimer() {
  if(lockTimer) clearTimeout(lockTimer);
  LOCK_EVENTS.forEach(e => document.removeEventListener(e, resetLockTimer));
}

// ===================== INDICATEUR DE CHARGEMENT =====================
function btnLoad(btn, loading=true) {
  if(!btn) return;
  if(loading) {
    btn._origText=btn.innerHTML;
    btn.innerHTML='<span style="display:inline-block;animation:spin 0.8s linear infinite">⏳</span>';
    btn.disabled=true;
    btn.style.opacity='0.7';
  } else {
    btn.innerHTML=btn._origText||btn.innerHTML;
    btn.disabled=false;
    btn.style.opacity='';
  }
}

// CSS animation spin
const spinStyle=document.createElement('style');
spinStyle.textContent='@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
document.head.appendChild(spinStyle);

// ===================== UTILS =====================
function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }

function notif(msg,type='success') {
  const el=document.getElementById('notif');
  el.textContent=(type==='success'?'✓ ':'✕ ')+msg;
  el.className='show '+type;
  clearTimeout(window._notifTimer);
  window._notifTimer=setTimeout(()=>{el.className='';},4000);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

document.addEventListener('click',e=>{
  const s=document.getElementById('sidebar'),t=document.getElementById('menu-toggle');
  if(window.innerWidth<=768&&s.classList.contains('open')&&!s.contains(e.target)&&!t.contains(e.target)) s.classList.remove('open');
});
