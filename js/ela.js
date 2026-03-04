const text = `
A incrivel mulher que você é, me ensinou tanto sobre o amor,
sobre paciência,
sobre cumplicidade,
sobre parceria.
Voce se fez ao meu lado nos momentos mais dificeis,
e celebrou comigo as vitorias mais doces.
Voce e unicam a unica que eu quero para minha vida 
voce e engraçada, inteligente, carinhosa, linda, 
bondosa, forte, determinada, inspiradora, incrivel, companheira, e minha melhor amiga.
Você me mostra cada dia o valor que a vida tem, pois pagaria qualquer preço pra reviver cada momento ao seu lado, cada sorriso, cada abraço, cada beijo, cada olhar.
tudo isso só é especial por que é com você.

Você transformou dias comuns em memórias,
silêncios em conforto,
e o simples em algo extraordinário.

Cada detalhe seu ficou guardado em mim.
O jeito que você sorri,
o jeito que me olha,
o jeito que me faz sentir em casa.

Amar você e algo que transcende palavras, e complicado, as vezes me sinto confuso doque está acontecendo, mas agente superou e supera cada obstaculo juntos, e isso fortaleceu nosso relacionamento ate aqui.


Espero superar tudas suas expectativas, e ser o homem que você merece.
Quero ser seu porto seguro, seu apoio incondicional, seu parceiro de vida.
Quero construir um futuro ao seu lado, cheio de amor, risos e aventuras.
E se eu pudesse viver tudo de novo,
eu escolheria você.
Todas as vezes.
`;

const typedText = document.getElementById("typed-text");
const btn = document.getElementById("startBtn");

let index = 0;

btn.addEventListener("click", () => {
  btn.style.display = "none";
  typeWriter();
});

function typeWriter() {
  if (index < text.length) {
    typedText.innerHTML += text.charAt(index);
    index++;
    setTimeout(typeWriter, 35);
  }
}
