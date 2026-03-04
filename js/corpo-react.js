function Hotspot({ x, y, text, size = 120 }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="hotspot"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
      }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(!visible)}
    >
      {visible && <div className="tooltip">{text}</div>}
    </div>
  );
}

function CorpoInterativo() {
  return (
    <div className="corpo-wrapper">
      <h2 className="text-center mb-4">Descubra você 💖</h2>

      <div className="corpo-container">
        <img src="img/ela1.png" alt="Você" className="corpo-img" />

        <Hotspot x={50} y={20} text="O seu sorriso tem um jeito calmo de bagunçar tudo aqui dentro." size={20} />
        <Hotspot x={50} y={33} text="Vou falar baixo pra não parecer pecado, mas… eles são lindos demais." size={50} />
        <Hotspot x={66} y={35} text="Esses braços aí já estão ficando perigosos." size={60} />
        <Hotspot x={48} y={68} text="Você anda e o resto do mundo desacelera." size={70} />
        <Hotspot x={48} y={15} text="Seus olhos têm um charme absurdo, principalmente quando você sorri." size={25} />
        <Hotspot x={55} y={48} text="Você tem uma cintura que parece abraçar todas as curvas do jeito certo." size={50} />
        <Hotspot x={66} y={58} text="Essa sua bunda é daquelas que a gente admira com respeito… e um pouco de desejo" size={80} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(
  document.getElementById("corpo-react-root")
).render(<CorpoInterativo />);

container.addEventListener("mousemove", (e) => {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const moveX = ((x / rect.width) - 0.5) * 15;
  const moveY = ((y / rect.height) - 0.5) * 15;

  image.style.transform = `
    translate(${moveX}px, ${moveY}px)
    scale(1.03)
  `;
});
