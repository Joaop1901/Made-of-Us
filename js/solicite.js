
// ================== SUPABASE ==================
const constellationStars = document.getElementById("constellationStars");

const SUPABASE_URL = "https://ygyloggscofzahazpqvh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UbeQxcKD8gO_1aWFwCLZWA_Nbaohyp4";
let supabaseClient = null;

function getSupabaseClient(){
  if(supabaseClient) return supabaseClient;
  if(!window.supabase || typeof window.supabase.createClient !== "function") return null;

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

// ================== ELEMENTOS ==================
const wishStage = document.getElementById("wishStage");
const starsLayer = document.getElementById("starsLayer");
const constellationTitle = document.querySelector(".constellation-title");
const wishInput = document.getElementById("wishInput");
const wishSendBtn = document.getElementById("wishSendBtn");
const wishStatus = document.getElementById("wishStatus");
const beamLayer = document.getElementById("beamLayer");
const capsuleCard = document.getElementById("capsuleCard");
const LOCAL_WISHES_KEY = "madeofus_wishes_local";
const REMOTE_BLOCKED_KEY = "madeofus_wishes_remote_blocked";
const REMOTE_BLOCKED_TTL_MS = 60 * 1000;
let remoteBlocked = false;

console.log("SOLICITE.JS CARREGOU");

// ================== AUX ==================
function clamp(val, min, max){
  return Math.max(min, Math.min(max, val));
}

function getErrorMessage(error){
  if(!error) return "Erro desconhecido.";
  if(typeof error === "string") return error;
  if(error.message) return error.message;
  return "Erro desconhecido.";
}

function setWishStatus(message, tone = "info"){
  if(!wishStatus) return;
  wishStatus.textContent = message || "";
  wishStatus.className = "wish-status";
  if(message){
    wishStatus.classList.add(`is-${tone}`);
  }
}

function getStoredWishes(){
  try {
    const raw = localStorage.getItem(LOCAL_WISHES_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function saveStoredWishes(list){
  try {
    localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(list));
  } catch {
    // sem bloqueio de fluxo
  }
}

function storeWishLocally(text){
  const current = getStoredWishes();
  current.push(text);
  saveStoredWishes(current);
}

function loadRemoteBlockedState(){
  const blockedUntilRaw = localStorage.getItem(REMOTE_BLOCKED_KEY);
  const blockedUntil = Number(blockedUntilRaw || 0);
  remoteBlocked = Number.isFinite(blockedUntil) && blockedUntil > Date.now();
  if(!remoteBlocked){
    localStorage.removeItem(REMOTE_BLOCKED_KEY);
  }
}

function clearRemoteBlockedState(){
  remoteBlocked = false;
  localStorage.removeItem(REMOTE_BLOCKED_KEY);
}

function isRlsOrAuthError(error){
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");
  const status = Number(error?.status || 0);
  return (
    code === "42501" ||
    status === 401 ||
    message.includes("row-level security") ||
    message.includes("unauthorized")
  );
}

function markRemoteBlocked(error){
  if(!isRlsOrAuthError(error)) return false;
  remoteBlocked = true;
  localStorage.setItem(REMOTE_BLOCKED_KEY, String(Date.now() + REMOTE_BLOCKED_TTL_MS));
  setWishStatus("Banco bloqueado por permissão (RLS). Pedido salvo só no aparelho por enquanto.", "error");
  return true;
}

function launchBeam(){
  if(!beamLayer || !wishStage || !capsuleCard) return;

  const stageRect = wishStage.getBoundingClientRect();
  const cardRect = capsuleCard.getBoundingClientRect();

  const beam = document.createElement("div");
  beam.className = "wish-beam";

  const x = cardRect.left + cardRect.width / 2 - stageRect.left;
  const beamStartY = cardRect.top + cardRect.height * 0.15 - stageRect.top;
  const height = clamp(beamStartY, 120, stageRect.height);

  beam.style.left = `${x}px`;
  beam.style.height = `${height}px`;

  beamLayer.appendChild(beam);
  beam.addEventListener("animationend", ()=> beam.remove());
}

function closeAllStars(){
  if(!starsLayer) return;
  starsLayer.querySelectorAll(".wish-star.is-open")
}

function getStarsBounds(){
  if(!starsLayer) return null;

  const rect = starsLayer.getBoundingClientRect();

  let exclusion = null;
  if(constellationTitle){
    const titleRect = constellationTitle.getBoundingClientRect();
    exclusion = {
      left: rect.left,
      top: rect.top,
      right: titleRect.right,
      bottom: titleRect.bottom
    };
  }

  return { rect, exclusion };
}

function pickStarPosition(padding){
  const bounds = getStarsBounds();
  if(!bounds) return null;

  const rect = bounds.rect;
  const width = Math.max(1, rect.width - padding * 2);
  const height = Math.max(1, rect.height - padding * 2);

  return {
    x: padding + Math.random() * width,
    y: padding + Math.random() * height
  };
}

function addStar(text, options = {}){
  if(!constellationStars) return;
  const { isNew = false } = options;

  const position = pickStarPosition(32);
  if(!position) return;

  const star = document.createElement("button");
  star.type = "button";
  star.setAttribute("aria-label", "Ver pedido");

  star.className = "wish-star";
  if(isNew){
    star.classList.add("is-new");
  }

  const starSize = 8 + Math.random() * 8;
  star.style.width = `${starSize}px`;
  star.style.height = `${starSize}px`;
  star.style.left = `${position.x}px`;
  star.style.top = `${position.y}px`;

  const popup = document.createElement("div");
  popup.className = "wish-popup";
  popup.textContent = text;

  star.appendChild(popup);
  starsLayer.appendChild(star);


  star.addEventListener("click", (event)=>{
    event.stopPropagation();
    const willOpen = !star.classList.contains("is-open");
    closeAllStars();
    if(willOpen){
      star.classList.add("is-open");
    }
  });

  star.addEventListener("keydown", (event)=>{
    if(event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const willOpen = !star.classList.contains("is-open");
    closeAllStars();
    if(willOpen){
      star.classList.add("is-open");
    }
  });
}

// ================== SALVAR ==================
async function sendWish(){
  loadRemoteBlockedState();
  const text = (wishInput?.value || "").trim();
  if(!text) return;

  if(wishSendBtn) wishSendBtn.disabled = true;
  setWishStatus("Pedido criado. Tentando salvar no banco...", "info");
  launchBeam();
  setTimeout(()=> addStar(text, { isNew: true }), 500);
  storeWishLocally(text);
  if(wishInput) wishInput.value = "";

  if(remoteBlocked){
    setWishStatus("Pedido salvo no aparelho. Banco ainda bloqueado por RLS.", "error");
    if(wishSendBtn) wishSendBtn.disabled = false;
    return;
  }

  try {
    const client = getSupabaseClient();
    if(!client){
      console.warn("Supabase nao carregou.");
      setWishStatus("Pedido salvo no aparelho. Nao foi possivel conectar ao banco.", "error");
      return;
    }

    const { error } = await client
      .from("solicitacoes")
      .insert([{ mensagem: text }]);

    if(error){
      if(markRemoteBlocked(error)){
        console.warn("Banco bloqueado por RLS/Auth:", error);
        return;
      }
      console.error("Erro ao salvar:", error);
      setWishStatus(`Pedido salvo no aparelho, mas nao salvou no banco: ${getErrorMessage(error)}`, "error");
      return;
    }

    clearRemoteBlockedState();
    console.log("Salvo no banco.");
    setWishStatus("Pedido salvo no banco e na constelacao.", "success");
  } catch(e){
    if(markRemoteBlocked(e)){
      console.warn("Banco bloqueado por RLS/Auth:", e);
    } else {
      console.error("Erro geral:", e);
      setWishStatus(`Pedido salvo no aparelho, mas houve erro no banco: ${getErrorMessage(e)}`, "error");
    }
  } finally {
    if(wishSendBtn) wishSendBtn.disabled = false;
  }
}

// ================== CARREGAR ==================
async function loadWishes(){
  loadRemoteBlockedState();
  const localWishes = getStoredWishes();
  if(localWishes.length){
    localWishes.forEach((message) => addStar(message));
    setWishStatus(`Pedidos locais carregados: ${localWishes.length}.`, "success");
  }

  if(remoteBlocked){
    if(!localWishes.length){
      setWishStatus("Banco bloqueado por RLS. Pedidos novos serao salvos no aparelho.", "error");
    }
    return;
  }

  try {
    const client = getSupabaseClient();
    if(!client){
      console.warn("Supabase nao carregou para listar desejos.");
      if(!localWishes.length){
        setWishStatus("Nao foi possivel conectar ao banco para carregar pedidos.", "error");
      }
      return;
    }

    const { data, error } = await client
      .from("solicitacoes")
      .select("mensagem");

    if(error){
      if(markRemoteBlocked(error)){
        console.warn("Banco bloqueado por RLS/Auth:", error);
        return;
      }
      console.error("Erro ao carregar:", error);
      setWishStatus(`Erro ao carregar pedidos do banco: ${getErrorMessage(error)}`, "error");
      return;
    }

    clearRemoteBlockedState();
    if(Array.isArray(data)){
      const remoteMessages = [];
      data.forEach((item) => {
        if(item?.mensagem){
          remoteMessages.push(item.mensagem);
          addStar(item.mensagem);
        }
      });

      if(remoteMessages.length){
        const merged = [...localWishes];
        remoteMessages.forEach((message) => {
          if(!merged.includes(message)) merged.push(message);
        });
        saveStoredWishes(merged);
      }

      if(data.length > 0){
        setWishStatus(`Pedidos carregados: ${data.length}.`, "success");
      }
    }
  } catch(e){
    if(markRemoteBlocked(e)){
      console.warn("Banco bloqueado por RLS/Auth:", e);
      return;
    }
    console.error("Erro geral:", e);
    setWishStatus(`Erro ao carregar pedidos: ${getErrorMessage(e)}`, "error");
  }
}

// ================== EVENTOS ==================
if(wishSendBtn){
  wishSendBtn.addEventListener("click", sendWish);
}

if(wishInput){
  wishInput.addEventListener("keydown", (event)=>{
    if(event.key === "Enter" && (event.ctrlKey || event.metaKey)){
      event.preventDefault();
      sendWish();
    }
  });
}

document.addEventListener("click", closeAllStars);

// ================== LIMPAR PEDIDOS ==================
function clearLocalWishes(){
  localStorage.removeItem(LOCAL_WISHES_KEY);
  localStorage.removeItem(REMOTE_BLOCKED_KEY);
  // Remove todas as estrelas da tela
  if(constellationStars){
    constellationStars.innerHTML = "";
  }
  setWishStatus("Todos os pedidos locais foram apagados.", "info");
}

// Adiciona um botão de limpar (opcional, para debug)
// window.clearWishes = clearLocalWishes;

// ================== INICIAR ==================
window.addEventListener("load", () => {
  loadWishes();
});


document.addEventListener("click", (e) => {
  const star = e.target.closest(".wish-star");

  // fecha todas
  document.querySelectorAll(".wish-star").forEach(s => {
    if (s !== star) s.classList.remove("is-open");
  });

  // abre a clicada
  if (star) {
    star.classList.toggle("is-open");
  }
});