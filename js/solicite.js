// js/solicite.js
const wishStage = document.getElementById("wishStage");
const constellationStars = document.getElementById("constellationStars");
const constellationTitle = document.querySelector(".constellation-title");
const wishInput = document.getElementById("wishInput");
const wishSendBtn = document.getElementById("wishSendBtn");
const beamLayer = document.getElementById("beamLayer");
const capsuleCard = document.getElementById("capsuleCard");

const BEAM_DURATION_MS = 1200;
const N8N_WEBHOOK_URL = "https://joaop1901.app.n8n.cloud/webhook/fe398477-1132-424e-bbf8-643e6bcb1326";
console.log("SOLICITE.JS CARREGOU ✅");
console.log("WEBHOOK ATUAL:", N8N_WEBHOOK_URL);


function clamp(val, min, max){
  return Math.max(min, Math.min(max, val));
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
  if(!constellationStars) return;
  constellationStars.querySelectorAll(".wish-star.is-open").forEach((star)=>{
    star.classList.remove("is-open");
  });
}

function getStarsBounds(){
  if(!constellationStars) return null;

  let rect = constellationStars.getBoundingClientRect();
  if(rect.width < 50 || rect.height < 50){
    const parentRect = constellationStars.parentElement?.getBoundingClientRect();
    if(parentRect && parentRect.width > 50 && parentRect.height > 50){
      rect = parentRect;
    }
  }

  let exclusion = null;
  if(constellationTitle){
    const titleRect = constellationTitle.getBoundingClientRect();
    const marginX = 28;
    const marginY = 28;
    const maxRight = rect.right;
    const maxBottom = rect.bottom;
    const exclusionBottom = Math.min(titleRect.bottom + marginY, maxBottom);

    // Se o título ocupa quase toda a largura, exclui só a faixa de cima
    const titleCoversWidth = (titleRect.right + marginX) >= (rect.right - 40);
    const exclusionRight = titleCoversWidth
      ? maxRight
      : Math.min(titleRect.right + marginX, maxRight);

    if(exclusionBottom > rect.top + 40){
      exclusion = {
        left: rect.left,
        top: rect.top,
        right: exclusionRight,
        bottom: exclusionBottom
      };
    }
  }

  return { rect, exclusion };
}

function pickStarPosition(padding){
  const bounds = getStarsBounds();
  if(!bounds) return null;

  const rect = bounds.rect;
  const width = Math.max(1, rect.width - padding * 2);
  const height = Math.max(1, rect.height - padding * 2);
  const exclusion = bounds.exclusion;

  let x = padding + Math.random() * width;
  let y = padding + Math.random() * height;

  if(!exclusion) return { x, y };

  for(let i = 0; i < 30; i++){
    x = padding + Math.random() * width;
    y = padding + Math.random() * height;

    const absX = rect.left + x;
    const absY = rect.top + y;
    const insideExclusion =
      absX >= exclusion.left &&
      absX <= exclusion.right &&
      absY >= exclusion.top &&
      absY <= exclusion.bottom;

    if(!insideExclusion){
      return { x, y };
    }
  }

  return { x, y };
}

function addStar(text){
  if(!constellationStars) return;

  const padding = 32;
  const position = pickStarPosition(padding);
  if(!position) return;

  const star = document.createElement("button");
  const size = 5 + Math.random() * 8;
  const x = position.x;
  const y = position.y;

  const message = text.length > 240 ? `${text.slice(0, 240)}...` : text;

  star.type = "button";
  star.className = "wish-star";
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.style.left = `${x}px`;
  star.style.top = `${y}px`;
  star.style.animationDelay = `${Math.random() * 2}s`;

  const popup = document.createElement("div");
  popup.className = "wish-popup";
  popup.textContent = message;

  star.appendChild(popup);
  constellationStars.appendChild(star);
  star.classList.add("is-new");
  setTimeout(()=> star.classList.remove("is-new"), 1600);

  star.addEventListener("click", (event)=>{
    event.stopPropagation();
    const isOpen = star.classList.contains("is-open");
    closeAllStars();
    if(!isOpen) star.classList.add("is-open");
  });
}

function seedAmbientStars(count){
  if(!constellationStars) return;
  constellationStars.querySelectorAll(".ambient-star").forEach((star)=>star.remove());

  for(let i=0;i<count;i++){
    const position = pickStarPosition(12);
    if(!position) continue;
    const star = document.createElement("div");
    const size = Math.random() * 2 + 1;
    star.className = "ambient-star";
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${position.x}px`;
    star.style.top = `${position.y}px`;
    star.style.opacity = `${0.35 + Math.random() * 0.65}`;
    constellationStars.appendChild(star);
  }
}

async function sendWishToN8N(text){
  const payload = new URLSearchParams({
    mensagem: text,
    origem: "solicite",
    criadoEm: new Date().toISOString()
  });

  console.log("Enviando pro N8N...", payload.toString());

  try{
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: payload.toString()
    });

    console.log("N8N status:", res.status);
    const t = await res.text().catch(()=> "");
    console.log("N8N resposta:", t);
  } catch (e){
    console.error("ERRO no envio pro N8N:", e);
  }
}

function sendWish(){
  const text = (wishInput?.value || "").trim();
  if(!text) return;

  if(wishStage) wishStage.classList.add("constellation-active");

  launchBeam();
  const delay = Math.min(700, BEAM_DURATION_MS - 200);
  requestAnimationFrame(()=> setTimeout(()=> addStar(text), delay));

  sendWishToN8N(text);

  if(wishInput) wishInput.value = "";
}

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

if(constellationStars){
  const seed = ()=> seedAmbientStars(320);
  requestAnimationFrame(seed);
  window.addEventListener("resize", ()=>{
    clearTimeout(window.__starSeedTimer);
    window.__starSeedTimer = setTimeout(seed, 200);
  });
}

document.addEventListener("click", closeAllStars);
