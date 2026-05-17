// Registers a Paint Worklet that renders a parameterised grid + glow pulse.
registerPaint(
  'grid',
  class {
    static get inputProperties() {
      return ['--grid-density', '--hue', '--glow-r'];
    }
    paint(ctx, size, props) {
      const density = Math.max(4, parseFloat(props.get('--grid-density').toString()) || 28);
      const hue = parseFloat(props.get('--hue').toString()) || 220;
      const glow = parseFloat(props.get('--glow-r').toString()) || 0;
      const cell = size.width / density;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, size.height);
      bg.addColorStop(0, '#0e0e14');
      bg.addColorStop(1, '#06060a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.width, size.height);

      // Grid lines
      ctx.strokeStyle = `hsla(${hue}, 80%, 56%, 0.18)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= density; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size.width, i * cell);
        ctx.stroke();
      }

      // Dots at intersections, brighter near the glow ring.
      const cx = size.width / 2;
      const cy = size.height / 2;
      const ringR = Math.min(size.width, size.height) * (0.15 + glow * 0.0015);
      for (let y = 0; y <= density; y++) {
        for (let x = 0; x <= density; x++) {
          const px = x * cell;
          const py = y * cell;
          const d = Math.hypot(px - cx, py - cy);
          const k = Math.max(0, 1 - Math.abs(d - ringR) / (ringR * 0.6));
          if (k <= 0.02) continue;
          ctx.fillStyle = `hsla(${hue}, 90%, ${30 + 50 * k}%, ${0.2 + 0.7 * k})`;
          ctx.beginPath();
          ctx.arc(px, py, 1 + 2.4 * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },
);
