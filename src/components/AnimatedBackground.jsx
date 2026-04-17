import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    let animationId = 0;
    let particles = [];

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(88, Math.max(40, Math.floor(width / 18)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: (index * 97) % width,
        y: (index * 53) % height,
        speed: 0.18 + (index % 7) * 0.035,
        drift: (index % 5) * 0.18 + 0.28,
        size: 1.1 + (index % 4) * 0.4,
      }));
    };

    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      const styles = getComputedStyle(document.documentElement);
      const dotColor = styles.getPropertyValue("--particle").trim() || "rgba(31,188,160,0.52)";
      const lineColor = styles.getPropertyValue("--particle-line").trim() || "rgba(31,188,160,0.16)";

      particles.forEach((particle, index) => {
        particle.x += Math.sin(frame * 0.004 + index) * particle.speed;
        particle.y -= particle.drift;

        if (particle.y < -20) {
          particle.y = height + 20;
          particle.x = (particle.x + 137) % width;
        }

        context.beginPath();
        context.fillStyle = dotColor;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const first = particles[i];
          const second = particles[j];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance < 118) {
            context.globalAlpha = 1 - distance / 118;
            context.strokeStyle = lineColor;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(first.x, first.y);
            context.lineTo(second.x, second.y);
            context.stroke();
            context.globalAlpha = 1;
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[color:var(--bg)]">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-80" />
      <motion.div
        className="wave-layer wave-layer-one"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="wave-layer wave-layer-two"
        animate={{ backgroundPosition: ["100% 50%", "0% 50%", "100% 50%"] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:64px_64px] opacity-45" />
    </div>
  );
}
