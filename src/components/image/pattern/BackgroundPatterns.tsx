/**
 * VietTune Background Patterns
 * 6 hoa văn truyền thống Việt Nam cho background trang Login
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. SÓNG ÂM — Sound Waves
//    Sóng âm thanh + vòng tròn đồng tâm
//    Nền: nâu sẫm (#2c1810)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function SoundWaves(props: { opacity?: number }) {
  const waves = Array.from({ length: 8 }, (_, i) => {
    const y = 80 + i * 70;
    const amp = 15 + (i % 3) * 5;
    const d = `M0 ${y} ${Array.from({ length: 25 }, (_, j) => {
      const x = j * 20;
      const cy = y + (j % 2 === 0 ? -amp : amp);
      return `Q${x + 5} ${cy} ${x + 10} ${y}`;
    }).join(' ')}`;
    return { d, op: props.opacity ?? 0, w: i % 3 === 0 ? 0.8 : 0.5 };
  });

  const rings = [
    { cx: 120, cy: 200, rs: [60, 45, 30, 15] },
    { cx: 380, cy: 350, rs: [50, 35, 20] },
    { cx: 220, cy: 520, rs: [40, 25] },
  ];

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 480 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="sw-glow" cx="30%" cy="50%">
            <stop offset="0%" stopColor="#2c1810" stopOpacity="0" />
            <stop offset="100%" stopColor="#2c1810" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="480" height="600" fill="none" />
        <rect width="480" height="600" fill="url(#sw-glow)" />

        {waves.map((w, i) => (
          <path key={i} d={w.d} fill="none" stroke="#2c1810" strokeWidth={w.w} opacity={w.op} />
        ))}

        {rings.map((ring, ri) =>
          ring.rs.map((r, ci) => (
            <circle
              key={`${ri}-${ci}`}
              cx={ring.cx}
              cy={ring.cy}
              r={r}
              fill="none"
              stroke="#2c1810"
              strokeWidth="0.5"
              opacity={props.opacity ? props.opacity / 2 : 0}
            />
          )),
        )}

        {[100, 220, 340, 460].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="0"
            x2={x}
            y2="600"
            stroke="#2c1810"
            strokeWidth="0.2"
            opacity={props.opacity ? props.opacity / 4 : 0}
          />
        ))}
      </svg>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. THỔ CẨM — Brocade Diamonds
//    Hình thoi lồng nhau kiểu dệt thổ cẩm
//    Nền: xanh rêu đậm (#1a2418)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function BrocadeDiamonds() {
  const cols = 8;
  const rows = 10;
  const size = 55;
  const diamonds = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * size + size / 2 + (r % 2 === 0 ? 0 : size / 2);
      const cy = r * size + size / 2;
      diamonds.push({ cx, cy });
    }
  }

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 480 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2418" />
            <stop offset="50%" stopColor="#243020" />
            <stop offset="100%" stopColor="#1a2418" />
          </linearGradient>
        </defs>
        <rect width="480" height="600" fill="url(#bd-grad)" />

        {diamonds.map((d, i) => {
          const s1 = 22;
          const s2 = 12;
          return (
            <g key={i}>
              <polygon
                points={`${d.cx},${d.cy - s1} ${d.cx + s1},${d.cy} ${d.cx},${d.cy + s1} ${d.cx - s1},${d.cy}`}
                fill="none"
                stroke="#c9a84c"
                strokeWidth="0.6"
                opacity="0.1"
              />
              <polygon
                points={`${d.cx},${d.cy - s2} ${d.cx + s2},${d.cy} ${d.cx},${d.cy + s2} ${d.cx - s2},${d.cy}`}
                fill="none"
                stroke="#c9a84c"
                strokeWidth="0.4"
                opacity="0.07"
              />
              <circle cx={d.cx} cy={d.cy} r="1.5" fill="#c9a84c" opacity="0.08" />
            </g>
          );
        })}

        {/* Chấm nhỏ rải đều */}
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={`dot-${i}`}
            cx={(i * 37 + 15) % 480}
            cy={(i * 53 + 20) % 600}
            r="0.8"
            fill="#c9a84c"
            opacity="0.12"
          />
        ))}

        {[60, 160, 260, 360].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="0"
            x2={x}
            y2="600"
            stroke="#c9a84c"
            strokeWidth="0.2"
            opacity="0.03"
          />
        ))}
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(26,36,24,0.2) 0%, rgba(26,36,24,0.5) 50%, rgba(26,36,24,0.2) 100%)',
        }}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. DÂY ĐÀN — Zither Strings
//    Dây đàn tranh dọc + nốt nhạc trừu tượng
//    Nền: maroon tối (#1e1518)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ZitherStrings() {
  const strings = Array.from({ length: 20 }, (_, i) => ({
    x: 20 + i * 22,
    thick: i % 3 === 0,
  }));

  const notes = [
    { cx: 50, cy: 90, flag: true, op: 0.08 },
    { cx: 180, cy: 220, flag: false, op: 0.06 },
    { cx: 310, cy: 140, flag: true, op: 0.09 },
    { cx: 390, cy: 380, flag: false, op: 0.05 },
    { cx: 100, cy: 460, flag: true, op: 0.07 },
    { cx: 260, cy: 530, flag: false, op: 0.06 },
    { cx: 410, cy: 350, flag: true, op: 0.08 },
    { cx: 80, cy: 560, flag: false, op: 0.05 },
  ];

  const circles = [
    { cx: 100, cy: 250, r: 40, op: 0.04 },
    { cx: 100, cy: 250, r: 24, op: 0.05 },
    { cx: 340, cy: 420, r: 50, op: 0.03 },
    { cx: 340, cy: 420, r: 30, op: 0.04 },
    { cx: 210, cy: 570, r: 35, op: 0.04 },
  ];

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 440 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="zs-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a1c20" />
            <stop offset="50%" stopColor="#1e1518" />
            <stop offset="100%" stopColor="#2a1c20" />
          </linearGradient>
        </defs>
        <rect width="440" height="600" fill="url(#zs-bg)" />

        {strings.map((s, i) => (
          <line
            key={i}
            x1={s.x}
            y1="0"
            x2={s.x}
            y2="600"
            stroke="#c9a84c"
            strokeWidth={s.thick ? 0.8 : 0.3}
            opacity={s.thick ? 0.12 : 0.06}
          />
        ))}

        {notes.map((n, i) => (
          <g key={i} opacity={n.op}>
            <ellipse cx={n.cx} cy={n.cy} rx="6" ry="4.5" fill="#c9a84c" />
            <line
              x1={n.cx + 6}
              y1={n.cy}
              x2={n.cx + 6}
              y2={n.cy - 25}
              stroke="#c9a84c"
              strokeWidth="0.8"
            />
            {n.flag && (
              <path
                d={`M${n.cx + 6} ${n.cy - 25} Q${n.cx + 12} ${n.cy - 22} ${n.cx + 12} ${n.cy - 15}`}
                fill="none"
                stroke="#c9a84c"
                strokeWidth="0.8"
              />
            )}
          </g>
        ))}

        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke="#c9a84c"
            strokeWidth="0.3"
            opacity={c.op}
          />
        ))}
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(30,21,24,0.2) 0%, rgba(44,24,16,0.5) 50%, rgba(30,21,24,0.2) 100%)',
        }}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MÂY & RỒNG — Cloud Scrolls
//    Vân mây cuộn phong cách cung đình Huế
//    Nền: nâu ấm (#2C1810)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CloudScrolls() {
  const clouds = [
    { x: 40, y: 100, s: 1 },
    { x: 250, y: 80, s: 0.8 },
    { x: 100, y: 280, s: 0.9 },
    { x: 320, y: 250, s: 0.7 },
    { x: 60, y: 430, s: 0.85 },
    { x: 280, y: 450, s: 1.1 },
    { x: 180, y: 550, s: 0.6 },
    { x: 400, y: 380, s: 0.75 },
  ];

  const swirls = [
    { cx: 200, cy: 180, r: 20 },
    { cx: 380, cy: 150, r: 15 },
    { cx: 100, cy: 380, r: 18 },
    { cx: 350, cy: 520, r: 16 },
    { cx: 440, cy: 280, r: 14 },
  ];

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 480 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="cs-glow" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#4a3020" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2C1810" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="480" height="600" fill="#2C1810" />
        <rect width="480" height="600" fill="url(#cs-glow)" />

        {/* Đám mây */}
        {clouds.map((c, i) => (
          <g
            key={i}
            transform={`translate(${c.x}, ${c.y}) scale(${c.s})`}
            opacity={0.08 + (i % 3) * 0.02}
          >
            <path
              d="M0 30 Q0 10 20 10 Q20 -5 45 5 Q60 -5 70 10 Q95 10 95 30"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.7"
            />
            <path
              d="M5 32 Q10 22 25 20 Q28 8 48 12 Q58 5 68 18 Q85 20 90 32"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.4"
              opacity="0.6"
            />
          </g>
        ))}

        {/* Xoắn ốc */}
        {swirls.map((s, i) => (
          <g key={i} opacity={0.05 + (i % 2) * 0.02}>
            <path
              d={`M${s.cx} ${s.cy} Q${s.cx + s.r} ${s.cy - s.r} ${s.cx + s.r * 1.5} ${s.cy} Q${s.cx + s.r} ${s.cy + s.r} ${s.cx} ${s.cy}`}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.5"
            />
            <path
              d={`M${s.cx} ${s.cy} Q${s.cx - s.r * 0.6} ${s.cy - s.r * 0.6} ${s.cx - s.r} ${s.cy} Q${s.cx - s.r * 0.6} ${s.cy + s.r * 0.6} ${s.cx} ${s.cy}`}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.3"
            />
          </g>
        ))}

        {/* Chấm trang trí nhỏ */}
        {Array.from({ length: 20 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 47 + 30) % 480}
            cy={(i * 71 + 40) % 600}
            r="1"
            fill="#c9a84c"
            opacity="0.06"
          />
        ))}
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(44,24,16,0.2) 0%, rgba(44,24,16,0.5) 50%, rgba(44,24,16,0.2) 100%)',
        }}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. HOA VĂN TRỐNG ĐỒNG — Bronze Drum
//    Vòng tròn đồng tâm + tia sáng Đông Sơn
//    Nền: nâu đồng (#261a10)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function BronzeDrum() {
  const rays = 16;
  const concentricRings = [40, 60, 80, 100, 130, 160];
  const smallSuns = [
    { cx: 380, cy: 120, scale: 0.35 },
    { cx: 80, cy: 480, scale: 0.3 },
    { cx: 400, cy: 520, scale: 0.25 },
  ];

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 480 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="bd-glow" cx="40%" cy="45%">
            <stop offset="0%" stopColor="#4a3520" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#261a10" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="480" height="600" fill="#261a10" />
        <rect width="480" height="600" fill="url(#bd-glow)" />

        {/* Mặt trời trung tâm */}
        <g transform="translate(200, 280)" opacity="0.14">
          {Array.from({ length: rays }, (_, i) => {
            const angle = (((i * 360) / rays) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.cos(angle) * 30}
                y1={Math.sin(angle) * 30}
                x2={Math.cos(angle) * 140}
                y2={Math.sin(angle) * 140}
                stroke="#c9a84c"
                strokeWidth="0.6"
              />
            );
          })}
          {concentricRings.map((r, i) => (
            <circle
              key={i}
              cx="0"
              cy="0"
              r={r}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.5"
              opacity={0.7 - i * 0.08}
            />
          ))}
          <circle cx="0" cy="0" r="25" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="0" cy="0" r="8" fill="#c9a84c" opacity="0.25" />
        </g>

        {/* Mặt trời nhỏ */}
        {smallSuns.map((sun, si) => (
          <g
            key={si}
            transform={`translate(${sun.cx}, ${sun.cy}) scale(${sun.scale})`}
            opacity="0.08"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={Math.cos(angle) * 20}
                  y1={Math.sin(angle) * 20}
                  x2={Math.cos(angle) * 80}
                  y2={Math.sin(angle) * 80}
                  stroke="#c9a84c"
                  strokeWidth="0.6"
                />
              );
            })}
            {[25, 40, 55, 70].map((r, i) => (
              <circle key={i} cx="0" cy="0" r={r} fill="none" stroke="#c9a84c" strokeWidth="0.5" />
            ))}
          </g>
        ))}

        {/* Zigzag border */}
        <g opacity="0.06">
          {Array.from({ length: 32 }, (_, i) => (
            <path
              key={`t-${i}`}
              d={`M${i * 15},0 L${i * 15 + 7.5},14 L${i * 15 + 15},0`}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.6"
            />
          ))}
          {Array.from({ length: 32 }, (_, i) => (
            <path
              key={`b-${i}`}
              d={`M${i * 15},600 L${i * 15 + 7.5},586 L${i * 15 + 15},600`}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.6"
            />
          ))}
        </g>
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(38,26,16,0.2) 0%, rgba(38,26,16,0.5) 50%, rgba(38,26,16,0.2) 100%)',
        }}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. TRE & LÁ — Bamboo Grid
//    Lưới tre cách điệu tối giản
//    Nền: xanh rêu đậm (#1a1f16)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function BambooGrid() {
  const stalks = [
    { x: 30, w: 1.5, op: 0.08, nodes: [80, 200, 320, 440, 560] },
    { x: 90, w: 1.0, op: 0.06, nodes: [120, 260, 400, 540] },
    { x: 150, w: 1.3, op: 0.07, nodes: [60, 180, 310, 450, 580] },
    { x: 210, w: 0.8, op: 0.05, nodes: [100, 250, 390, 530] },
    { x: 270, w: 1.5, op: 0.08, nodes: [70, 210, 340, 470, 590] },
    { x: 330, w: 1.0, op: 0.06, nodes: [130, 270, 410, 550] },
    { x: 390, w: 1.3, op: 0.07, nodes: [90, 230, 360, 500] },
    { x: 450, w: 0.8, op: 0.05, nodes: [110, 240, 380, 520] },
  ];

  const leaves = [
    { x: 34, y: 78, angle: 30 },
    { x: 154, y: 58, angle: -25 },
    { x: 274, y: 68, angle: 35 },
    { x: 94, y: 258, angle: -30 },
    { x: 334, y: 268, angle: 20 },
    { x: 214, y: 388, angle: -35 },
    { x: 394, y: 358, angle: 25 },
    { x: 154, y: 448, angle: -20 },
    { x: 274, y: 468, angle: 30 },
    { x: 454, y: 518, angle: -25 },
    { x: 34, y: 558, angle: 35 },
    { x: 334, y: 548, angle: -30 },
  ];

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 480 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1f16" />
            <stop offset="50%" stopColor="#222a1e" />
            <stop offset="100%" stopColor="#1a1f16" />
          </linearGradient>
        </defs>
        <rect width="480" height="600" fill="url(#bg-grad)" />

        {/* Thân tre */}
        {stalks.map((s, i) => (
          <g key={i}>
            <line
              x1={s.x}
              y1="0"
              x2={s.x}
              y2="600"
              stroke="#c9a84c"
              strokeWidth={s.w}
              opacity={s.op}
            />
            {s.nodes.map((ny, ni) => (
              <line
                key={ni}
                x1={s.x - 5}
                y1={ny}
                x2={s.x + 5}
                y2={ny}
                stroke="#c9a84c"
                strokeWidth={s.w * 0.6}
                opacity={s.op * 1.3}
              />
            ))}
          </g>
        ))}

        {/* Lá tre */}
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x}, ${l.y}) rotate(${l.angle})`} opacity="0.08">
            <path d="M0 0 Q12 -8 28 -4 Q12 -2 0 0" fill="none" stroke="#6b8c52" strokeWidth="0.6" />
          </g>
        ))}

        {/* Đường ngang nhẹ */}
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1={i * 75 + 30}
            x2="480"
            y2={i * 75 + 30}
            stroke="#c9a84c"
            strokeWidth="0.2"
            opacity="0.03"
          />
        ))}
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(26,31,22,0.2) 0%, rgba(26,31,22,0.5) 50%, rgba(26,31,22,0.2) 100%)',
        }}
      />
    </>
  );
}
