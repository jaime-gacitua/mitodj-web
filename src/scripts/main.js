/* MITO DJ intro animation with GSAP */
(function () {
  if (typeof gsap === 'undefined') {
    console.warn('GSAP failed to load; skipping animations.');
    return;
  }

  const title = document.querySelector('.hero__title .word');
  if (!title) return;

  const letters = Array.from(title.querySelectorAll('.letter')).filter(l => !l.classList.contains('letter--space'));
  const portrait = document.getElementById('portrait');
  const siteLogo = document.querySelector('.site-logo');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Extract two dominant colors from the logo and set CSS variables
  if (siteLogo && siteLogo.complete) {
    tryExtractLogoPalette(siteLogo);
  } else if (siteLogo) {
    siteLogo.addEventListener('load', () => tryExtractLogoPalette(siteLogo), { once: true });
  }

  function tryExtractLogoPalette(imgEl) {
    try {
      const { accentA, accentB } = extractTwoColors(imgEl, { downsample: 10000 });
      if (accentA && accentB) {
        const root = document.documentElement;
        root.style.setProperty('--color-accent', rgbToHex(accentA));
        root.style.setProperty('--color-accent-2', rgbToHex(accentB));
      }
    } catch (_) {
      // Ignore extraction errors
    }
  }

  function extractTwoColors(img, { downsample = 8000 } = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = Math.min(512, img.naturalWidth || 512);
    const h = Math.min(512, img.naturalHeight || 512);
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const pixels = [];
    const step = Math.max(1, Math.floor((w * h) / downsample));
    for (let i = 0; i < data.length; i += 4 * step) {
      const a = data[i + 3];
      if (a < 16) continue; // skip near-transparent
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Simple k-means (k=2)
    let c1 = pixels[0] || [179, 107, 255];
    let c2 = pixels[1] || [24, 231, 255];
    for (let iter = 0; iter < 8; iter++) {
      const g1 = [0, 0, 0]; const g2 = [0, 0, 0];
      let n1 = 0, n2 = 0;
      for (const p of pixels) {
        const d1 = dist2(p, c1); const d2 = dist2(p, c2);
        if (d1 < d2) { g1[0]+=p[0]; g1[1]+=p[1]; g1[2]+=p[2]; n1++; }
        else { g2[0]+=p[0]; g2[1]+=p[1]; g2[2]+=p[2]; n2++; }
      }
      if (n1) c1 = [g1[0]/n1, g1[1]/n1, g1[2]/n1];
      if (n2) c2 = [g2[0]/n2, g2[1]/n2, g2[2]/n2];
    }

    // Ensure distinctness (swap if needed so c1 is more magenta/violet, c2 more cyan)
    const hue1 = rgbToHue(c1); const hue2 = rgbToHue(c2);
    if (hue1 < hue2) { const tmp = c1; c1 = c2; c2 = tmp; }

    return { accentA: c1.map(Math.round), accentB: c2.map(Math.round) };
  }

  function dist2(a, b) { const dx=a[0]-b[0], dy=a[1]-b[1], dz=a[2]-b[2]; return dx*dx+dy*dy+dz*dz; }
  function rgbToHex([r,g,b]) { return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
  function rgbToHue([r,g,b]) {
    r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0; const d=max-min;
    if (d===0) h=0; else if (max===r) h=60*(((g-b)/d)%6); else if (max===g) h=60*(((b-r)/d)+2); else h=60*(((r-g)/d)+4);
    if (h<0) h+=360; return h;
  }

  // Reusable letters animation
  const directions = ['left', 'right', 'top', 'bottom'];
  function animateLetters() {
    // Remove previous glows to avoid duplicates
    letters.forEach(el => {
      el.querySelectorAll('.glow').forEach(n => n.remove());
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overshoot = Math.max(500, Math.round(Math.min(vw, vh) * 0.35)); // push letters farther offscreen

    letters.forEach((el, idx) => {
      const dir = directions[idx % directions.length];
      let fromX = 0, fromY = 0, rot = 0;
      if (dir === 'left') { fromX = -vw - overshoot; rot = -12; }
      if (dir === 'right') { fromX = vw + overshoot; rot = 12; }
      if (dir === 'top') { fromY = -vh - overshoot; rot = -12; }
      if (dir === 'bottom') { fromY = vh + overshoot; rot = 12; }

      gsap.fromTo(
        el,
        { x: fromX, y: fromY, rotate: rot, opacity: 0 },
        {
          x: 0,
          y: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.45,
          ease: 'back.out(2.2)',
          delay: 0.12 + idx * 0.06,
        }
      );

      const glow = document.createElement('span');
      glow.className = 'glow';
      el.appendChild(glow);
      gsap.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.2, delay: 0.15 + idx * 0.06, yoyo: true, repeat: 1 });
    });

    // Shimmer sweep, reusing single element
    const existingShimmer = title.parentElement.querySelector('.title-shimmer');
    const shimmer = existingShimmer || (() => {
      const s = document.createElement('span');
      s.className = 'title-shimmer';
      title.parentElement.appendChild(s);
      return s;
    })();
    gsap.fromTo(shimmer, { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 0.18, duration: 1.4, ease: 'power2.out' });
  }

  // Initial states
  if (portrait) {
    // Keep CSS-based centering transform intact; only initialize opacity here
    portrait.style.opacity = '0';
  }

  if (prefersReduced) {
    if (portrait) gsap.to(portrait, { opacity: 0.12, duration: 0.3 });
    gsap.to(letters, { opacity: 1, duration: 0.3, stagger: 0.02 });
    return; // Skip complex motion
  }

  // Build timeline
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  // Animate portrait subtle parallax fade
  if (portrait) {
    tl.to(portrait, { opacity: 0.12, scale: 1, duration: 0.9, y: 0 }, 0.1);

    // TV-style fade loop: visible 5s, glitch-out 0.6s, hidden 2s, glitch-in 0.6s, loop
    const tv = gsap.timeline({ repeat: -1, repeatDelay: 0, defaults: { ease: 'power2.out' } });
    tv.to(portrait, { opacity: 0.12, duration: 0.2 })         // ensure baseline visible
      .to(portrait, { duration: 5.0 })                        // hold
      // glitch-out burst
      .to(portrait, { opacity: 0.35, filter: 'saturate(160%) contrast(130%) hue-rotate(8deg)', duration: 0.08, ease: 'power1.in' })
      .to(portrait, { opacity: 0.05, filter: 'saturate(80%) contrast(140%) blur(1px)', duration: 0.1 }, '>-0.02')
      .to(portrait, { opacity: 0.0, filter: 'saturate(60%) contrast(160%) blur(2px)', duration: 0.42, ease: 'power3.in' })
      // stay off
      .to(portrait, { duration: 2.0 })
      // glitch-in burst
      .to(portrait, { opacity: 0.18, filter: 'saturate(180%) contrast(130%) hue-rotate(-8deg)', duration: 0.1, ease: 'power1.out' })
      .to(portrait, { opacity: 0.1, filter: 'saturate(120%) contrast(115%)', duration: 0.08 }, '>-0.02')
      .to(portrait, { opacity: 0.12, filter: 'saturate(120%) contrast(110%)', duration: 0.42, ease: 'power3.out' })
      .call(animateLetters); // re-run title animation on reappear
  }

  // Run letters animation initially
  animateLetters();

  // Scroll indicator subtle bounce
  gsap.to('.scroll-indicator .arrow', { y: 6, repeat: -1, yoyo: true, duration: 0.9, ease: 'sine.inOut' });

  // Generate Spinning Beats plot and table
  const beatsPlot = document.getElementById('beats-plot');
  if (beatsPlot) {
    // Input in seconds
    const segments = [
      { id: 1, intensity: 1, seconds: 120 },
      { id: 2, intensity: 2, seconds: 120 },
      { id: 3, intensity: 3, seconds: 120 },
      { id: 4, intensity: 4, seconds: 120 },
      { id: 5, intensity: 5, seconds: 120 },
      { id: 6, intensity: 4, seconds: 90 },
      { id: 7, intensity: 3, seconds: 120 },
      { id: 8, intensity: 5, seconds: 45 },
      { id: 9, intensity: 2, seconds: 20 },
      { id: 10, intensity: 4, seconds: 90 },
      { id: 11, intensity: 3, seconds: 90 },
      { id: 12, intensity: 5, seconds: 60 },
      { id: 13, intensity: 2, seconds: 90 },
      { id: 14, intensity: 4, seconds: 60 },
      { id: 15, intensity: 5, seconds: 45 },
      { id: 16, intensity: 1, seconds: 20 },
      { id: 17, intensity: 4, seconds: 60 },
      { id: 18, intensity: 5, seconds: 45 },
      { id: 19, intensity: 1, seconds: 20 },
      { id: 20, intensity: 4, seconds: 60 },
      { id: 21, intensity: 5, seconds: 45 },
      { id: 22, intensity: 1, seconds: 20 },
      { id: 23, intensity: 4, seconds: 60 },
      { id: 24, intensity: 5, seconds: 45 },
      { id: 25, intensity: 1, seconds: 20 },
      { id: 26, intensity: 2, seconds: 120 },
      { id: 27, intensity: 3, seconds: 120 },
      { id: 28, intensity: 2, seconds: 20 },
      { id: 29, intensity: 4, seconds: 60 },
      { id: 30, intensity: 3, seconds: 120 },
      { id: 31, intensity: 2, seconds: 20 },
      { id: 32, intensity: 4, seconds: 60 },
      { id: 33, intensity: 3, seconds: 90 },
      { id: 34, intensity: 5, seconds: 60 },
    ];

    renderBeats(beatsPlot, segments);
  }

  function renderBeats(svgEl, segments) {
    // Clear
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    const data = segments.map(s => ({ ...s }));
    const totalSeconds = data.reduce((sum, s) => sum + s.seconds, 0);

    // Layout settings
    const vb = svgEl.viewBox.baseVal; // 1200x200
    const width = vb ? vb.width : 1200;
    const baselineY = 140;
    const barMaxHeight = 120;

    // Baseline
    const baseline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    baseline.setAttribute('x', '0');
    baseline.setAttribute('y', String(baselineY));
    baseline.setAttribute('width', String(width));
    baseline.setAttribute('height', '28');
    baseline.setAttribute('rx', '8');
    baseline.setAttribute('class', 'beat-baseline');
    svgEl.appendChild(baseline);

    // Scale and center
    const targetWidth = Math.round(width * 0.8);
    const pxPerSecond = targetWidth / totalSeconds;

    const intensityToHeight = (i) => ({1:0.25,2:0.45,3:0.7,4:0.85,5:1}[i] ?? 0.5);
    const intensityClass = (i) => `intensity-${i}`;

    const leftEdge = Math.round((width - targetWidth) / 2);
    let x = leftEdge;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svgEl.appendChild(group);

    const barNodes = [];
    for (const s of data) {
      const w = Math.max(2, Math.round(pxPerSecond * s.seconds));
      const h = Math.round(barMaxHeight * intensityToHeight(s.intensity));
      const y = baselineY - h;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', intensityClass(s.intensity));
      group.appendChild(rect);
      barNodes.push({ node: rect, x, y, intensity: s.intensity });
      x += w;
    }

    // Progress overlay: black rectangle that grows from left to right, covering bars
    const progressRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    progressRect.setAttribute('x', String(leftEdge));
    const overlayPad = 4; // cover stroke highlights above and below
    progressRect.setAttribute('y', String(baselineY - barMaxHeight - overlayPad));
    progressRect.setAttribute('width', '0');
    progressRect.setAttribute('height', String(barMaxHeight + overlayPad * 2));
    progressRect.setAttribute('fill', '#000');
    progressRect.setAttribute('opacity', '0.8');
    svgEl.appendChild(progressRect);

    // Small clock at top-right of the plot
    const clockRadius = 22;
    const clockPadding = 12;
    const clockCx = leftEdge + targetWidth - clockRadius - clockPadding;
    const clockCy = (baselineY - barMaxHeight) - clockRadius - clockPadding; // lift above bars

    const clockGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svgEl.appendChild(clockGroup);

    const clockFace = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clockFace.setAttribute('cx', String(clockCx));
    clockFace.setAttribute('cy', String(clockCy));
    clockFace.setAttribute('r', String(clockRadius));
    clockFace.setAttribute('fill', 'none');
    clockFace.setAttribute('stroke', '#ffffff');
    clockFace.setAttribute('stroke-width', '2');
    clockFace.setAttribute('opacity', '1');
    clockGroup.appendChild(clockFace);

    // Hour hand: static pointing up
    const hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hourHand.setAttribute('x1', String(clockCx));
    hourHand.setAttribute('y1', String(clockCy));
    hourHand.setAttribute('x2', String(clockCx));
    hourHand.setAttribute('y2', String(clockCy - clockRadius * 0.5));
    hourHand.setAttribute('stroke', '#ffffff');
    hourHand.setAttribute('stroke-width', '2.5');
    hourHand.setAttribute('stroke-linecap', 'round');
    clockGroup.appendChild(hourHand);

    // Minute hand: starts up, rotates to 45-minute mark
    const minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minuteHand.setAttribute('x1', String(clockCx));
    minuteHand.setAttribute('y1', String(clockCy));
    minuteHand.setAttribute('x2', String(clockCx));
    minuteHand.setAttribute('y2', String(clockCy - clockRadius * 0.85));
    minuteHand.setAttribute('stroke', '#ffffff');
    minuteHand.setAttribute('stroke-width', '2');
    minuteHand.setAttribute('stroke-linecap', 'round');
    clockGroup.appendChild(minuteHand);

    // Label for Zone 1
    const zoneMessages = [
      'Zone 1: Intro beats, 0% effort',
      'Zone 2: Warm-up beats, 40% effort',
      'Zone 3: Workout beats, 70% effort',
      'Zone 4: Intense beats, 90% effort',
      'Zone 5: Legend beats, 120% effort',
    ];
    const zoneColors = ['#a2a9b3', '#6aa7ff', '#3df06a', '#fff661', '#ff2a2a'];
    const zoneTexts = zoneMessages.map((msg, i) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(leftEdge + 8));
      t.setAttribute('y', String((baselineY - barMaxHeight) - 10));
      t.setAttribute('text-anchor', 'start');
      t.setAttribute('fill', zoneColors[i] || '#eaf1ff');
      t.setAttribute('font-size', '20');
      t.setAttribute('font-weight', '800');
      t.setAttribute('opacity', '0');
      t.textContent = msg;
      svgEl.appendChild(t);
      return t;
    });

    // Scroll-triggered entrance: bars fly from edges then settle
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canScrollTrigger = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (canScrollTrigger && !prefersReduced) {
      gsap.registerPlugin(ScrollTrigger);

      const directions = ['left','right','top','bottom'];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const overshoot = Math.max(400, Math.round(Math.min(vw, vh) * 0.35));

      const sectionEl = document.getElementById('projects');
      const beatsContainer = document.querySelector('.beats');
      const beatsTitle = document.getElementById('beats-title');
      // Compute a reasonable end distance that finishes within typical page height
      const endDistance = Math.max(1000, Math.min(1200, Math.round(window.innerHeight * 1.2)));
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: beatsTitle || sectionEl || svgEl, // start when "Spinning Beats" hits center
          start: 'top 35%',
          end: () => '+=' + endDistance,
          scrub: 0.45,
          pin: beatsContainer || true,              // pin only the beats block; leave section title at top
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        },
        defaults: { ease: 'back.out(1.6)' }
      });

      barNodes.forEach((b, idx) => {
        const dir = directions[idx % directions.length];
        const from = { x: b.x, y: b.y };
        if (dir === 'left') from.x = -vw - overshoot;
        if (dir === 'right') from.x = vw + overshoot;
        if (dir === 'top') from.y = -vh - overshoot;
        if (dir === 'bottom') from.y = vh + overshoot;

        tl.fromTo(b.node,
          { attr: { x: from.x, y: from.y }, opacity: 0 },
          { attr: { x: b.x, y: b.y }, opacity: 1, duration: 0.6 },
          idx * 0.015
        );
      });

      // Clock flies in from the top-right with the bars
      tl.fromTo(clockGroup,
        { x: width * 0.25, y: -vh * 0.5, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.65, ease: 'back.out(1.4)' },
        0.05
      );

      // Stage labels and highlights across the first five bars while growing the progress overlay
      const segDur = 0.16; // per-zone duration; 5 zones ~0.8 total
      const firstFive = barNodes.slice(0, 5);
      const cumWidths = firstFive.map((b, i) => {
        const w = Number(b.node.getAttribute('width')) || 0;
        return w + (i > 0 ? firstFive.slice(0, i).reduce((s, bb) => s + Number(bb.node.getAttribute('width')) || 0, 0) : 0);
      });

      firstFive.forEach((b, i) => {
        const prev = i > 0 ? firstFive[i - 1] : null;
        const showText = zoneTexts[i];
        const hideText = i > 0 ? zoneTexts[i - 1] : null;

        // Progress to cover up to the end of this bar
        tl.to(progressRect, { attr: { width: cumWidths[i] }, duration: segDur, ease: 'none' }, i === 0 ? '+=0.12' : '>');

        // Toggle zone labels and bar highlight
        if (hideText) tl.to(hideText, { opacity: 0, duration: 0.05 }, '<');
        tl.to(showText, { opacity: 1, duration: 0.08 }, '<');
        if (prev) tl.to(prev.node, { attr: { 'stroke-width': 0 }, duration: 0.05 }, '<');
        tl.to(b.node, { attr: { stroke: '#ffffff', 'stroke-width': 2 }, duration: 0.08 }, '<');
      });

      // Finish covering the remaining bars
      const remainingDur = 0.4;
      tl.to(progressRect, { attr: { width: targetWidth }, duration: remainingDur, ease: 'none' }, '>');

      // Rotate minute hand over the whole progress span
      tl.fromTo(minuteHand,
        { rotation: 0 },
        { rotation: 270, duration: segDur * 5 + remainingDur, ease: 'none', svgOrigin: `${clockCx} ${clockCy}` },
        `-=${remainingDur + segDur * 5}` // align at the start of progress sequence
      );
    }
  }
})(); 