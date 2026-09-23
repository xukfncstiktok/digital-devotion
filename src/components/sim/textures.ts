import * as THREE from "three";

function canvas(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  return new THREE.CanvasTexture(c);
}

export function woodFloorTexture() {
  const t = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#6b4a2f";
    ctx.fillRect(0, 0, s, s);
    const plank = s / 6;
    for (let i = 0; i < 6; i++) {
      const shade = 34 + Math.random() * 22;
      ctx.fillStyle = `hsl(28 34% ${shade}%)`;
      ctx.fillRect(0, i * plank, s, plank - 2);
      for (let g = 0; g < 70; g++) {
        ctx.strokeStyle = `hsla(26 40% ${shade + (Math.random() * 14 - 7)}%, .5)`;
        ctx.lineWidth = Math.random() * 1.6;
        const y = i * plank + Math.random() * plank;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(s * 0.3, y + Math.random() * 6 - 3, s * 0.7, y + Math.random() * 6 - 3, s, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(0, i * plank + plank - 2, s, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.anisotropy = 8;
  return t;
}

export function plasterTexture(base = "#d9d2c6") {
  const t = canvas(256, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.045})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/** Islamic-geometry prayer rug, drawn procedurally. */
export function prayerMatTexture() {
  const t = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#123c33";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, s - 44, s - 44);
    ctx.strokeRect(38, 38, s - 76, s - 76);
    // mihrab arch pointing "forward"
    ctx.beginPath();
    ctx.moveTo(s * 0.26, s * 0.84);
    ctx.lineTo(s * 0.26, s * 0.42);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.74, s * 0.42);
    ctx.lineTo(s * 0.74, s * 0.84);
    ctx.closePath();
    ctx.strokeStyle = "#e6c766";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "rgba(220,190,110,.09)";
    ctx.fill();
    // eight-point star lattice
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 5; y++) {
        const cx = 70 + x * 124;
        const cy = 110 + y * 78;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(226,199,110,.35)";
        ctx.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          ctx.rotate(Math.PI / 4);
          ctx.strokeRect(-16, -16, 32, 32);
        }
        ctx.restore();
      }
    }
    for (let i = 0; i < 20000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
  });
  t.anisotropy = 8;
  return t;
}

export function screenTexture(lines = 26) {
  const t = canvas(512, (ctx, s) => {
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#132038";
    ctx.fillRect(0, 0, s, 26);
    for (let i = 0; i < lines; i++) {
      const w = 60 + Math.random() * 330;
      ctx.fillStyle = i % 6 === 0 ? "#4fe0b0" : i % 5 === 0 ? "#f5b942" : "#38506f";
      ctx.fillRect(28, 50 + i * 16, w, 6);
    }
  });
  return t;
}

export function marbleTexture() {
  const t = canvas(256, (ctx, s) => {
    ctx.fillStyle = "#e7e3da";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(120,120,130,${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = Math.random() * 2.5;
      ctx.beginPath();
      const y = Math.random() * s;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.3, y + 40 - Math.random() * 80, s * 0.6, y - 40 + Math.random() * 80, s, y);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
