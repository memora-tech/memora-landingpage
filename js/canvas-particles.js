/**
 * @file canvas-particles.js
 * @description Rede Neural Interativa com Sinapses em Tempo Real (Hero Section).
 * - Neurônios (soma + núcleo + halo) distribuídos com camadas de profundidade (parallax)
 * - Conexões dendríticas/axônios dinâmicas entre neurônios próximos
 * - Sinapses (pulsos de informação luminosos com cauda) transitando entre neurônios
 *   e gerando propagação em cadeia quando o sinal chega ao neurônio de destino
 * - Interação com o mouse: movimenta suavemente os neurônios e estimula novas sinapses
 * - Totalmente responsivo (mobile e desktop), adaptável ao tema claro/escuro e acessível
 */

export function initSynapseCanvas() {
  const canvas = document.getElementById('synapse-canvas');
  if (!canvas) return;

  const container = canvas.parentElement || document.getElementById('hero');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let isVisible = true;
  let animationFrameId = null;
  let time = 0;

  let neurons = [];
  let synapses = [];

  const pointer = {
    x: -9999,
    y: -9999,
    nx: 0,
    ny: 0,
    targetNx: 0,
    targetNy: 0,
    vx: 0,
    vy: 0,
    lastX: -9999,
    lastY: -9999,
    active: false,
  };

  function getConfig() {
    const isMobile = width < 768;
    const isSmallMobile = width < 480;
    return {
      count: isSmallMobile ? 34 : isMobile ? 48 : 82,
      connectDist: isSmallMobile ? 125 : isMobile ? 145 : 175,
      mouseRadius: isMobile ? 120 : 170,
      maxSynapses: isSmallMobile ? 14 : isMobile ? 22 : 42,
      spontaneousRate: isMobile ? 0.08 : 0.16,
    };
  }

  function createNetwork() {
    const cfg = getConfig();
    neurons = [];
    synapses = [];

    for (let i = 0; i < cfg.count; i++) {
      const depth = 0.45 + Math.random() * 0.55; // 0.45 (fundo) a 1.0 (frente)
      const hx = Math.random() * width;
      const hy = Math.random() * height;
      const isPrimary = i % 3 !== 0;

      neurons.push({
        id: i,
        x: hx,
        y: hy,
        homeX: hx,
        homeY: hy,
        vx: 0,
        vy: 0,
        depth,
        radius: (isPrimary ? 2.2 : 1.7) * (0.7 + depth * 0.5),
        isPrimary,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        freqX: 0.22 + Math.random() * 0.28,
        freqY: 0.18 + Math.random() * 0.25,
        ampX: (10 + Math.random() * 18) * depth,
        ampY: (10 + Math.random() * 18) * depth,
        excitation: Math.random() * 0.3, // Brilho ao receber/disparar sinapse
        cooldown: 0,
      });
    }

    // Inicia algumas sinapses ativas imediatamente
    for (let s = 0; s < Math.min(8, cfg.maxSynapses); s++) {
      spawnRandomSynapse(cfg);
    }
  }

  function spawnSynapseBetween(fromIndex, toIndex, boost = 1) {
    const cfg = getConfig();
    if (synapses.length >= cfg.maxSynapses) return false;

    // Evita duplicar sinapse idêntica no mesmo sentido ao mesmo tempo
    for (let i = 0; i < synapses.length; i++) {
      const s = synapses[i];
      if (s.from === fromIndex && s.to === toIndex && s.progress < 0.45) {
        return false;
      }
    }

    const nA = neurons[fromIndex];
    const nB = neurons[toIndex];
    if (!nA || !nB) return false;

    const dist = Math.hypot(nB.x - nA.x, nB.y - nA.y);
    const speed = (140 + Math.random() * 90) / Math.max(dist, 40); // Velocidade proporcional à distância

    nA.excitation = Math.min(1, nA.excitation + 0.55 * boost);
    nA.cooldown = 0.25;

    synapses.push({
      from: fromIndex,
      to: toIndex,
      progress: 0,
      speed,
      intensity: Math.min(1, 0.75 + Math.random() * 0.25),
      hops: 0,
    });
    return true;
  }

  function findConnectedNeighbors(index, maxDist) {
    const nA = neurons[index];
    const neighbors = [];
    for (let j = 0; j < neurons.length; j++) {
      if (j === index) continue;
      const nB = neurons[j];
      const d = Math.hypot(nB.x - nA.x, nB.y - nA.y);
      if (d < maxDist && d > 18) {
        neighbors.push({ index: j, dist: d });
      }
    }
    return neighbors;
  }

  function spawnRandomSynapse(cfg) {
    if (!neurons.length || synapses.length >= cfg.maxSynapses) return;
    const startIdx = Math.floor(Math.random() * neurons.length);
    const neighbors = findConnectedNeighbors(startIdx, cfg.connectDist);
    if (neighbors.length > 0) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      spawnSynapseBetween(startIdx, target.index, 0.9);
    }
  }

  function updatePhysics(dt, cfg, reduced) {
    time += dt;

    // Parallax suave baseado na posição normalizada do mouse
    pointer.nx += (pointer.targetNx - pointer.nx) * 0.05;
    pointer.ny += (pointer.targetNy - pointer.ny) * 0.05;

    for (let i = 0; i < neurons.length; i++) {
      const n = neurons[i];

      if (!reduced) {
        const parallaxX = pointer.nx * 18 * n.depth;
        const parallaxY = pointer.ny * 14 * n.depth;

        const targetX = n.homeX + Math.sin(time * n.freqX + n.phaseX) * n.ampX + parallaxX;
        const targetY = n.homeY + Math.cos(time * n.freqY + n.phaseY) * n.ampY + parallaxY;

        n.vx += (targetX - n.x) * 0.028;
        n.vy += (targetY - n.y) * 0.028;

        // Interação com o cursor: movimenta os neurônios e dispara sinapses
        if (pointer.active) {
          const dx = n.x - pointer.x;
          const dy = n.y - pointer.y;
          const dist = Math.hypot(dx, dy);

          if (dist < cfg.mouseRadius && dist > 0.1) {
            const factor = Math.pow(1 - dist / cfg.mouseRadius, 2);
            // Movimento fluido acompanhando/abrindo espaço suave ao redor do cursor
            n.vx += (dx / dist) * factor * 0.55 * n.depth + pointer.vx * 0.025 * factor;
            n.vy += (dy / dist) * factor * 0.55 * n.depth + pointer.vy * 0.025 * factor;

            // Excita o neurônio próximo ao mouse e estimula sinapses
            n.excitation = Math.max(n.excitation, factor * 0.85);
            if (n.cooldown <= 0 && Math.random() < 0.045 * factor) {
              const neighbors = findConnectedNeighbors(i, cfg.connectDist);
              if (neighbors.length > 0) {
                const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                spawnSynapseBetween(i, chosen.index, 1.2);
              }
            }
          }
        }

        n.vx *= 0.87;
        n.vy *= 0.87;
        n.x += n.vx;
        n.y += n.vy;
      }

      // Decaimento suave da excitação luminosa e cooldown
      n.excitation = Math.max(0, n.excitation - dt * 1.4);
      n.cooldown = Math.max(0, n.cooldown - dt);
    }

    pointer.vx *= 0.8;
    pointer.vy *= 0.8;

    if (reduced) return;

    // Disparo espontâneo de sinapses pela rede
    if (Math.random() < cfg.spontaneousRate) {
      spawnRandomSynapse(cfg);
    }

    // Atualiza sinapses em trânsito e propaga em cadeia ao chegar no neurônio destino
    for (let i = synapses.length - 1; i >= 0; i--) {
      const s = synapses[i];
      s.progress += s.speed * dt;

      if (s.progress >= 1) {
        const targetNeuron = neurons[s.to];
        if (targetNeuron) {
          targetNeuron.excitation = 1.0;

          // Propagação sináptica em cadeia (até 3 saltos)
          if (s.hops < 3 && Math.random() < 0.62 && synapses.length < cfg.maxSynapses) {
            const neighbors = findConnectedNeighbors(s.to, cfg.connectDist).filter(
              (nb) => nb.index !== s.from
            );
            if (neighbors.length > 0) {
              const next = neighbors[Math.floor(Math.random() * neighbors.length)];
              const spawned = spawnSynapseBetween(s.to, next.index, 0.95);
              if (spawned && synapses.length > 0) {
                synapses[synapses.length - 1].hops = s.hops + 1;
              }
            }
          }
        }
        synapses.splice(i, 1);
      }
    }
  }

  function renderFrame() {
    const cfg = getConfig();
    const reduced = prefersReducedMotion;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    updatePhysics(0.016, cfg, reduced);

    ctx.clearRect(0, 0, width, height);

    const brandRgb = '0, 161, 224';
    const pulseCoreRgb = isLight ? '2, 132, 199' : '186, 230, 253';
    const neutralRgb = isLight ? '71, 85, 105' : '148, 163, 184';

    // 1. Desenha as conexões (axônios / dendritos) entre neurônios próximos
    const maxDist = cfg.connectDist;
    for (let i = 0; i < neurons.length; i++) {
      const nA = neurons[i];
      for (let j = i + 1; j < neurons.length; j++) {
        const nB = neurons[j];
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;

        // Filtro rápido por bounding box antes de Math.hypot
        if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;

        const dist = Math.hypot(dx, dy);
        if (dist < maxDist) {
          const proximity = 1 - dist / maxDist;
          const boost = (nA.excitation + nB.excitation) * 0.35;
          const baseAlpha = isLight ? 0.16 : 0.22;
          const alpha = Math.min(0.65, proximity * baseAlpha + boost * proximity);

          ctx.beginPath();
          ctx.moveTo(nA.x, nA.y);
          ctx.lineTo(nB.x, nB.y);
          ctx.strokeStyle =
            boost > 0.15
              ? `rgba(${brandRgb}, ${alpha * 1.25})`
              : `rgba(${brandRgb}, ${alpha})`;
          ctx.lineWidth = 0.8 + boost * 0.9;
          ctx.stroke();
        }
      }
    }

    // 2. Desenha as sinapses (impulsos luminosos transitando pelas conexões)
    for (let i = 0; i < synapses.length; i++) {
      const s = synapses[i];
      const nA = neurons[s.from];
      const nB = neurons[s.to];
      if (!nA || !nB) continue;

      const dx = nB.x - nA.x;
      const dy = nB.y - nA.y;
      const dist = Math.hypot(dx, dy);
      if (dist > cfg.connectDist * 1.25) continue;

      const headX = nA.x + dx * s.progress;
      const headY = nA.y + dy * s.progress;

      const tailProgress = Math.max(0, s.progress - 0.28);
      const tailX = nA.x + dx * tailProgress;
      const tailY = nA.y + dy * tailProgress;

      // Cauda luminosa do impulso sináptico
      const tailGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      tailGrad.addColorStop(0, `rgba(${brandRgb}, 0)`);
      tailGrad.addColorStop(0.6, `rgba(${brandRgb}, ${0.55 * s.intensity})`);
      tailGrad.addColorStop(1, `rgba(${pulseCoreRgb}, ${0.95 * s.intensity})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Cabeça da sinapse (partícula de informação brilhante)
      const glowRadius = 6.5;
      const headGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, glowRadius);
      headGrad.addColorStop(0, isLight ? 'rgba(0, 161, 224, 0.95)' : 'rgba(255, 255, 255, 0.98)');
      headGrad.addColorStop(0.35, `rgba(${brandRgb}, 0.75)`);
      headGrad.addColorStop(1, `rgba(${brandRgb}, 0)`);

      ctx.beginPath();
      ctx.arc(headX, headY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();
    }

    // 3. Desenha os neurônios (halo dendrítico + soma + núcleo)
    for (let i = 0; i < neurons.length; i++) {
      const n = neurons[i];
      const exc = n.excitation;
      const r = n.radius + exc * 1.6;

      // Halo externo suave (expande quando o neurônio dispara ou recebe sinapse)
      const haloRadius = r * (2.8 + exc * 2.2);
      const haloAlpha = (isLight ? 0.18 : 0.28) * n.depth + exc * 0.38;
      const haloGrad = ctx.createRadialGradient(n.x, n.y, r * 0.2, n.x, n.y, haloRadius);
      haloGrad.addColorStop(0, `rgba(${brandRgb}, ${Math.min(0.75, haloAlpha)})`);
      haloGrad.addColorStop(1, `rgba(${brandRgb}, 0)`);

      ctx.beginPath();
      ctx.arc(n.x, n.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // Corpo celular (Soma)
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const somaAlpha = Math.min(1, (isLight ? 0.65 : 0.78) * n.depth + exc * 0.35);
      ctx.fillStyle =
        n.isPrimary || exc > 0.2
          ? `rgba(${brandRgb}, ${somaAlpha})`
          : `rgba(${neutralRgb}, ${somaAlpha})`;
      ctx.fill();

      // Núcleo brilhante do neurônio
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = isLight
        ? `rgba(255, 255, 255, ${0.7 + exc * 0.3})`
        : `rgba(224, 242, 254, ${0.75 + exc * 0.25})`;
      ctx.fill();
    }
  }

  function animate() {
    if (!isVisible || prefersReducedMotion) {
      animationFrameId = null;
      return;
    }
    renderFrame();
    animationFrameId = requestAnimationFrame(animate);
  }

  function startLoop() {
    if (!animationFrameId && isVisible && !prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(rect.width, 1);
    height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createNetwork();
    renderFrame();
  }

  function onPointerMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (clientY < rect.top - 60 || clientY > rect.bottom + 60) {
      pointer.active = false;
      pointer.targetNx = 0;
      pointer.targetNy = 0;
      return;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (pointer.active && pointer.lastX > -9000) {
      pointer.vx = x - pointer.lastX;
      pointer.vy = y - pointer.lastY;
    }

    pointer.lastX = x;
    pointer.lastY = y;
    pointer.x = x;
    pointer.y = y;

    const nx = (x / Math.max(rect.width, 1)) * 2 - 1;
    const ny = (y / Math.max(rect.height, 1)) * 2 - 1;
    pointer.targetNx = Math.max(-1, Math.min(1, nx));
    pointer.targetNy = Math.max(-1, Math.min(1, ny));
    pointer.active = true;
  }

  window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );
  window.addEventListener('mouseleave', () => {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
    pointer.targetNx = 0;
    pointer.targetNy = 0;
  });

  window.addEventListener('resize', resize);
  window.addEventListener('memora:themechange', () => {
    renderFrame();
  });

  motionQuery.addEventListener?.('change', (e) => {
    prefersReducedMotion = e.matches;
    if (prefersReducedMotion) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      renderFrame();
    } else {
      startLoop();
    }
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) startLoop();
      },
      { threshold: 0.02 }
    );
    io.observe(container);
  }

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible) startLoop();
  });

  resize();
  startLoop();

  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };
}
