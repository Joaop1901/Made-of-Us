/* =========================
   PERSONALIZE AQUI
========================= */
const START_DATE = "2023-04-12"; // yyyy-mm-dd (data do começo)
const FULL_MESSAGE = `A incrível mulher que você é me ensinou tanto sobre o amor, sobre paciência, sobre cumplicidade, sobre parceria.
Você se fez ao meu lado nos momentos mais difíceis, e celebrou comigo as vitórias mais doces.
Você é engraçada, inteligente, carinhosa, linda… e minha melhor amiga.
Você transformou dias comuns em memórias, silêncios em conforto, e o simples em algo extraordinário.
E se eu pudesse viver tudo de novo, eu escolheria você.
Todas as vezes.`;

const paper = document.getElementById("letter");
const startBtn = document.getElementById("startBtn");
const typedEl = document.getElementById("typed-text");
const titleEl = document.getElementById("paperTitle");
const doneEl = document.getElementById("paperDone");

function typeWriter(el, text, speed = 16) {
  el.textContent = "";
  let i = 0;
  return new Promise(resolve => {
    function tick() {
      el.textContent += text[i] ?? "";
      i++;
      if (i < text.length) setTimeout(tick, speed);
      else resolve();
    }
    tick();
  });
}

function startTitleCursor() {
  let on = true;
  return setInterval(() => {
    titleEl.textContent = on ? "Para _" : "Para  ";
    on = !on;
  }, 420);
}

/* =========================
   DIAS JUNTOS
========================= */
function calcDays(startISO) {
  const start = new Date(startISO + "T00:00:00");
  const now = new Date();
  const diff = now - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function formatBRDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

/* =========================
   CANVAS: ÁRVORE + FLORES + FOLHAS CAINDO
========================= */
const canvas = document.getElementById("fx-canvas");
const ctx = canvas.getContext("2d");

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* Posição da base da árvore: embaixo da carta */
function getTreeOrigin() {
  const r = document.getElementById("letter").getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.bottom + 40 };
}

class BranchSeg {
  constructor(x1, y1, x2, y2, w) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.w = w;
  }
  draw(t) {
    const x = this.x1 + (this.x2 - this.x1) * t;
    const y = this.y1 + (this.y2 - this.y1) * t;
    ctx.lineWidth = this.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

/* Coração/folha caindo */
class Leaf {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.9;
    this.vy = 0.7 + Math.random() * 1.3;
    this.rot = Math.random() * Math.PI * 2;
    this.vr = (Math.random() - 0.5) * 0.08;
    this.size = 6 + Math.random() * 9;
    this.life = 1;
  }
  step() {
    this.vx += (Math.random() - 0.5) * 0.05; // vento leve
    this.y += this.vy;
    this.x += this.vx;
    this.rot += this.vr;
    if (this.y > innerHeight + 50) this.life = 0;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = 0.9;

    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.25);
    ctx.bezierCurveTo(0, -s * 0.2, -s * 0.55, -s * 0.2, -s * 0.55, s * 0.25);
    ctx.bezierCurveTo(-s * 0.55, s * 0.6, 0, s * 0.75, 0, s);
    ctx.bezierCurveTo(0, s * 0.75, s * 0.55, s * 0.6, s * 0.55, s * 0.25);
    ctx.bezierCurveTo(s * 0.55, -s * 0.2, 0, -s * 0.2, 0, s * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/* Florzinha fixa na ponta do galho */
class Blossom {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 2 + Math.random() * 4;
    this.a = 0;
    this.target = 0.75 + Math.random() * 0.25;
  }
  step() {
    this.a += 0.02;
    if (this.a > this.target) this.a = this.target;
  }
  draw() {
    ctx.globalAlpha = this.a;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Gera uma árvore com segmentos (recursivo) */
function buildTree(originX, originY) {
  const segs = [];
  const tips = [];

  function grow(x, y, len, ang, depth, w) {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;

    segs.push(new BranchSeg(x, y, x2, y2, w));

    if (depth <= 0) {
      tips.push({ x: x2, y: y2 });
      return;
    }

    const split = 0.35 + Math.random() * 0.2;
    const len1 = len * (0.7 + Math.random() * 0.08);
    const len2 = len * (0.7 + Math.random() * 0.08);

    const a1 = ang - split;
    const a2 = ang + split;

    // pequeno "desvio" ocasional (mais orgânico)
    if (Math.random() < 0.18) {
      grow(x2, y2, len * 0.18, ang + (Math.random() - 0.5) * 0.7, depth - 1, w * 0.78);
    }

    grow(x2, y2, len1, a1, depth - 1, w * 0.78);
    grow(x2, y2, len2, a2, depth - 1, w * 0.78);
  }

  const trunkLen = Math.min(260, innerHeight * 0.3);
  grow(originX, originY, trunkLen, -Math.PI / 2, 6, 10);

  return { segs, tips };
}

let running = false;
let tGrow = 0;
let blossoms = [];
let leaves = [];
let tree = null;
let treeOrigin = { x: 0, y: 0 };

function startFX() {
  running = true;
  tGrow = 0;
  blossoms = [];
  leaves = [];

  treeOrigin = getTreeOrigin();
  tree = buildTree(treeOrigin.x, treeOrigin.y);

  blossoms = tree.tips.map(
    p =>
      new Blossom(
        p.x + (Math.random() - 0.5) * 6,
        p.y + (Math.random() - 0.5) * 6
      )
  );

  // Adiciona flores ao longo de todos os segmentos do galho, não só nas pontas
  for (const seg of tree.segs) {
    // Adiciona várias flores distribuídas ao longo de cada segmento
    for (let i = 0; i < 3; i++) {
      const t = Math.random(); // posição aleatória no segmento (0 a 1)
      const x = seg.x1 + (seg.x2 - seg.x1) * t;
      const y = seg.y1 + (seg.y2 - seg.y1) * t;
      
      blossoms.push(
        new Blossom(
          x + (Math.random() - 0.5) * 8,
          y + (Math.random() - 0.5) * 8
        )
      );
    }
  }

  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;

  // Recalcula a posição atual da carta a cada frame
  const currentOrigin = getTreeOrigin();
  const offsetX = currentOrigin.x - treeOrigin.x;
  const offsetY = currentOrigin.y - treeOrigin.y;

  ctx.clearRect(0, 0, innerWidth, innerHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // tronco/galhos
  ctx.strokeStyle = "rgba(90,52,20,0.95)";

  // flores/folhas (corações) - cor rosa/vermelho
  ctx.fillStyle = "rgba(255,80,120,0.95)";

  // 1) Crescer árvore
  tGrow = Math.min(1, tGrow + 0.012);

  const total = tree.segs.length;
  const drawCount = Math.floor(total * tGrow);

  for (let i = 0; i < drawCount; i++) {
    tree.segs[i].draw(1);
  }
  if (drawCount < total) {
    const partial = (total * tGrow) - drawCount;
    tree.segs[drawCount]?.draw(partial);
  }

  // 2) Flores + folhas caindo quando árvore está quase pronta
  if (tGrow > 0.72) {
    for (const b of blossoms) {
      b.step();
      b.draw();
    }

    // spawn de folhas/corações caindo
    if (Math.random() < 0.6) {
      const p = tree.tips[(Math.random() * tree.tips.length) | 0];
      leaves.push(new Leaf(p.x, p.y));
    }
  }

  for (const lf of leaves) {
    lf.step();
    lf.draw();
  }
  leaves = leaves.filter(l => l.life > 0);

  ctx.restore();

  requestAnimationFrame(loop);
}

/* =========================
   ABRIR CARTA: inicia tudo + escreve texto
========================= */
let opened = false;
let titleCursorInterval = null;

startBtn.addEventListener("click", async () => {
  if (opened) return;
  opened = true;

  startBtn.disabled = true;
  startBtn.textContent = "Lendo…";

  if (titleCursorInterval) clearInterval(titleCursorInterval);
  titleEl.textContent = "Para você";

  startFX();
  await typeWriter(typedEl, FULL_MESSAGE, 16);

  startBtn.textContent = "Pronto ✅";
  doneEl.textContent = "Obrigado por esses " + calcDays(START_DATE) + " dias lindos juntos 💕";
  doneEl.classList.remove("hidden");
});

/* Fechar carta ao clicar fora */
document.addEventListener("click", (e) => {
  const letter = document.getElementById("letter");
  if (!letter.contains(e.target) && opened) {
    opened = false;
    running = false;

    // Limpar texto e reset botão
    typedEl.textContent = "";
    doneEl.classList.add("hidden");
    titleEl.textContent = "Para você";
    startBtn.disabled = false;
    startBtn.textContent = "Ler a carta 💖";

    // Limpar canvas (árvore desaparece)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

/* Garanta que o canvas está pronto na load */
window.addEventListener("load", resize);
