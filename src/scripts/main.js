/* MITO DJ intro animation with GSAP */
(function () {
  if (typeof gsap === 'undefined') {
    console.warn('GSAP failed to load; skipping animations.');
    return;
  }

  const DEBUG_SCROLL = false; // set to false to disable markers/logs

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
    if (portrait) gsap.to(portrait, { opacity: 0.5, duration: 0.3 });
    gsap.to(letters, { opacity: 1, duration: 0.3, stagger: 0.02 });
    return; // Skip complex motion
  }

  // Build timeline
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  // Animate portrait with broken TV effect after 3 seconds
  if (portrait) {
    // Start with portrait hidden
    gsap.set(portrait, { opacity: 0 });
    
    // Wait for MITO DJ title animation to end, then fade in portrait
    tl.to(portrait, { 
      opacity: 0.5, 
      duration: 0.8, 
      delay: 2.0,
      ease: 'power2.out'
    });
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

    // (Alternate version without progress overlay)

    // Small clock at bottom-left of the plot with white time arrow
    const clockRadius = 22;
    const clockPadding = 12;
    const clockCx = leftEdge + clockRadius + clockPadding;
    const clockCy = baselineY + clockRadius + (clockPadding / 2);

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

    // Time axis arrow to the right of the clock
    const axisStartX = clockCx + clockRadius + 10;
    const axisEndX = axisStartX + 70;
    const axisY = clockCy;
    const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axis.setAttribute('x1', String(axisStartX));
    axis.setAttribute('y1', String(axisY));
    axis.setAttribute('x2', String(axisEndX));
    axis.setAttribute('y2', String(axisY));
    axis.setAttribute('stroke', '#ffffff');
    axis.setAttribute('stroke-width', '2');
    axis.setAttribute('stroke-linecap', 'round');
    clockGroup.appendChild(axis);
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', `${axisEndX},${axisY} ${axisEndX - 8},${axisY - 5} ${axisEndX - 8},${axisY + 5}`);
    arrow.setAttribute('fill', '#ffffff');
    clockGroup.appendChild(arrow);
    const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timeText.setAttribute('x', String(axisStartX + 8));
    timeText.setAttribute('y', String(axisY + 16));
    timeText.setAttribute('fill', '#ffffff');
    timeText.setAttribute('font-size', '12');
    timeText.setAttribute('opacity', '0.9');
    timeText.textContent = 'time →';
    clockGroup.appendChild(timeText);

    const zoneMessages = [
      'Zone 1: 0%',
      'Zone 2: 40%',
      'Zone 3: 70%',
      'Zone 4: 90%',
      'Zone 5: 120%',
    ];
    const zoneColors = ['#a2a9b3', '#6aa7ff', '#3df06a', '#fff661', '#ff2a2a'];
    const zoneTexts = [];
    // Create labels equally spaced from left of first bar; keep Zone 1 position, reduce spacing for others
    const labelsY = (baselineY - barMaxHeight) - 6; // raised above bars
    const firstFiveBars = barNodes.slice(0, 5);
    const firstLeft = firstFiveBars[0] ? firstFiveBars[0].x : leftEdge;
    const lastBar = firstFiveBars[4];
    const lastRight = lastBar ? lastBar.x + Number(lastBar.node.getAttribute('width')) : (leftEdge + targetWidth * 0.25);
    const totalSpan = Math.max(1, lastRight - firstLeft);
    const pushRight = 28; // keep Zone 1 where it was
    const zone1X = Math.round(firstLeft + pushRight);
    // Reduce spacing versus full span
    const avgGap = totalSpan / Math.max(1, 5 - 1);
    const spacing = Math.max(36, Math.round(avgGap * 0.76));
    for (let i = 0; i < 5; i += 1) {
      const tx = i === 0 ? zone1X : zone1X + i * spacing;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // Set final position immediately; animation will only fade in
      t.setAttribute('x', String(tx));
      t.setAttribute('y', String(labelsY));
      t.setAttribute('text-anchor', 'start');
      t.setAttribute('dominant-baseline', 'alphabetic');
      t.setAttribute('fill', zoneColors[i] || '#eaf1ff');
      t.setAttribute('font-size', '20');
      t.setAttribute('font-weight', '800');
      t.setAttribute('opacity', '0');
      t.textContent = zoneMessages[i];
      svgEl.appendChild(t);
      zoneTexts[i] = { node: t, tx, ty: labelsY };
    }

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
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      // Unified, short-and-sweet scroll span (viewport-relative for all)
      const unifiedEnd = Math.max(900, Math.round(window.innerHeight * 1.25));
      if (DEBUG_SCROLL) {
        console.table({ bars: barNodes.length, targetWidth, unifiedEnd, vh: window.innerHeight, isMobile });
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: beatsTitle || sectionEl || svgEl, // start when "Spinning Beats" hits center
          start: isMobile ? 'top 20%' : 'top 35%', // earlier trigger on mobile to prevent overlap
          end: () => {
            if (sectionEl) {
              // Add extra spacing on mobile to prevent title overlap
              const extraSpacing = isMobile ? 100 : 0;
              sectionEl.style.minHeight = `calc(100vh + ${unifiedEnd + extraSpacing}px)`;
            }
            return '+=' + unifiedEnd;
          },
          scrub: 0.5, // Increased for smoother scrolling
          pin: beatsContainer || true,              // pin only the beats block; leave section title at top
          pinSpacing: true,
          anticipatePin: isMobile ? 1 : 3,         // less anticipation on mobile
          invalidateOnRefresh: true,
          markers: DEBUG_SCROLL,
          onEnter: () => {
            document.body.classList.add('in-projects');
            // Ensure Projects title becomes sticky when entering the section
            const projectsTitle = document.getElementById('projects-title');
            if (projectsTitle) {
              projectsTitle.style.position = 'sticky';
              projectsTitle.style.top = isMobile ? 'env(safe-area-inset-top, 0)' : '0';
              projectsTitle.style.zIndex = '50';
            }
          },
          onEnterBack: () => {
            document.body.classList.add('in-projects');
            // Ensure Projects title becomes sticky when entering back
            const projectsTitle = document.getElementById('projects-title');
            if (projectsTitle) {
              projectsTitle.style.position = 'sticky';
              projectsTitle.style.top = isMobile ? 'env(safe-area-inset-top, 0)' : '0';
              projectsTitle.style.zIndex = '50';
            }
          },
          onLeave: () => document.body.classList.remove('in-projects'),
          onLeaveBack: () => document.body.classList.remove('in-projects'),
          onUpdate: DEBUG_SCROLL ? (self) => {
            const p = Math.round(self.progress * 100);
            if (!renderBeats._lastP || Math.abs(p - renderBeats._lastP) >= 10) {
              renderBeats._lastP = p;
              console.log(`[Beats] progress: ${p}% start:${self.start} end:${self.end} scroll:${Math.round(self.scroll())}`);
            }
          } : undefined
        },
        defaults: { ease: 'power2.out' }
      });

      // Rotate labels to -45 degrees and fade them in place (no movement)
      zoneTexts.forEach((tdata) => {
        if (tdata) {
          gsap.set(tdata.node, { rotation: -45, svgOrigin: `${tdata.tx} ${tdata.ty}` });
        }
      });

      // Unified bar animation: fly from bottom-center in batches of 10
      const centerX = Math.round(leftEdge + targetWidth / 2);
      const batchSize = 10;
      const batchGap = 0.05; // delay between batches
      const fromY = baselineY + Math.round(barMaxHeight * 1.5);
      for (let i = 0; i < barNodes.length; i += batchSize) {
        const batch = barNodes.slice(i, i + batchSize);
        const batchStart = (i / batchSize) * batchGap;
        batch.forEach((b) => {
          tl.fromTo(b.node,
            { attr: { x: centerX, y: fromY }, opacity: 0 },
            { attr: { x: b.x, y: b.y }, opacity: 1, duration: 0.22 },
            batchStart
          );
        });
      }

      // Clock fades in from bottom-left with the bars and animates throughout
      tl.fromTo(clockGroup, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, 0);
      
      // Calculate total bar animation duration
      const barCount = barNodes.length;
      const numBatches = Math.ceil(barCount / batchSize);
      const totalBarDuration = (numBatches - 1) * batchGap + 0.22; // batch delays + individual bar duration
      
      // Animate minute hand: full 360-degree rotation in the same time as bars
      tl.to(minuteHand, { 
        rotation: 360, 
        svgOrigin: `${clockCx} ${clockCy}`,
        duration: totalBarDuration,
        ease: 'none'
      }, 0);
      
      // Animate hour hand: move from 12 to 1 o'clock (30 degrees) in the same time as bars
      tl.to(hourHand, { 
        rotation: 30, 
        svgOrigin: `${clockCx} ${clockCy}`,
        duration: totalBarDuration,
        ease: 'none'
      }, 0);

      // Zone labels fade in as bars arrive
      zoneTexts.forEach((tdata, i) => {
        if (tdata) tl.to(tdata.node, { opacity: 1, duration: 0.2, ease: 'none' }, 0.1 + i * 0.02);
      });

      // Add 3 non-interactive numbered bubbles (created now, faded in at the end)
      function addBubbleAtBar(barIdx, number, finalX = null, finalY = null) {
        const b = barNodes[barIdx];
        if (!b) return null;
        
        let bx, by;
        if (finalX !== null && finalY !== null) {
          // Use the provided final position
          bx = finalX;
          by = finalY;
        } else {
          // Fallback to bar-based positioning
          const bbox = b.node.getBBox();
          bx = bbox.x + bbox.width / 2;
          by = Math.max(10, bbox.y - 24);
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'note-bubble');
        g.setAttribute('opacity', '0');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(bx));
        circle.setAttribute('cy', String(by));
        
        // Mobile-specific bubble size adjustment
        if (isMobile) {
          circle.setAttribute('r', '36'); // Larger radius on mobile for bigger numbers
        } else {
          circle.setAttribute('r', '24'); // Original size on desktop
        }
        
        circle.setAttribute('fill', '#ffffff');
        circle.setAttribute('stroke', '#111822');
        circle.setAttribute('stroke-width', '3');
        g.appendChild(circle);

        const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        num.setAttribute('x', String(bx));
        num.setAttribute('y', String(by + 8));
        num.setAttribute('text-anchor', 'middle');
        num.setAttribute('fill', '#111822');
        num.setAttribute('font-size', '20');
        num.setAttribute('font-weight', '900');
        
        // Mobile-specific font size adjustment
        if (isMobile) {
          num.setAttribute('font-size', '40'); // Twice bigger on mobile
        }
        
        num.textContent = String(number);
        g.appendChild(num);

        svgEl.appendChild(g);
        return g;
      }
      // Create bubbles now, positioned at their final locations from the start
      const totalBars = barNodes.length;
      const fixedIdx = [0, Math.floor(totalBars / 2), Math.max(0, totalBars - 1)];
      
      // Calculate final positions for bubbles before creating them
      const bubblePositions = fixedIdx.map((idx, i) => {
        const bar = barNodes[Math.max(0, Math.min(totalBars - 1, idx))];
        if (bar && bar.node) {
          const bbox = bar.node.getBBox();
          let bx = bbox.x + bbox.width / 2;
          const by = Math.max(10, bbox.y - 24);
          
          // Special positioning for bubble 1: place it between zone 4 and zone 5
          if (i === 0) {
            // Calculate position between zone 4 and zone 5
            const zone4X = zone1X + 3 * spacing; // Zone 4 position
            const zone5X = zone1X + 4 * spacing; // Zone 5 position
            bx = (zone4X + zone5X) / 2; // Center between zones
            
            // Debug logging for bubble 1 positioning
            if (DEBUG_SCROLL) {
              console.log(`Bubble 1 positioning: zone4X=${zone4X}, zone5X=${zone5X}, bx=${bx}, isMobile=${isMobile}`);
            }
          }
          
          return { bx, by };
        }
        return { bx: 0, by: 0 };
      });
      
      // Create bubbles at their final positions
      const bubbles = fixedIdx.map((idx, i) => {
        const pos = bubblePositions[i];
        return addBubbleAtBar(Math.max(0, Math.min(totalBars - 1, idx)), i + 1, pos.bx, pos.by);
      });
      bubbles.forEach((b) => { if (b) gsap.set(b, { opacity: 0 }); });
      
      // Fade in bubbles at the same time as the last batch of bars finish
      // Calculate duration so bubbles finish fading in when bars finish animating
      const bubbleFadeDuration = 0.2 + (bubbles.filter(Boolean).length - 1) * 0.05; // Account for stagger
      tl.to(bubbles.filter(Boolean), { opacity: 1, duration: 0.2, stagger: 0.05, ease: 'power2.out' }, totalBarDuration - bubbleFadeDuration);
      
      // Add a smooth transition at the end to prevent abrupt scrolling bounce
      tl.to({}, { duration: 0.3, ease: 'power3.out' }, '+=0.1');

      // After configuration, refresh ScrollTrigger to account for new pin spacing
      ScrollTrigger.refresh();
    }

    // Add the description section below the plot
    addDescriptionSection(svgEl);
  }

  function addDescriptionSection(svgEl) {
    // Create container for the description section
    const container = document.createElement('div');
    container.className = 'bubble-descriptions';
    container.style.cssText = `
      margin-top: 40px;
      padding: 30px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 25px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    `;

    // Create the three description items
    const descriptions = [
      {
        number: 1,
        title: 'Lead spinners into their <span style="color: #CB6EEB; font-weight: bold;">flow-state</span>',
        text: 'Play the right energy with the right speed in each segment.'
      },
      {
        number: 2,
        title: 'Inspire people\'s <span style="color: #CB6EEB; font-weight: bold;">120%</span>',
        text: 'Match the music explosions with the red zones. Build towards a memorable grand finale.'
      },
      {
        number: 3,
        title: 'Turn the class into an <span style="color: #CB6EEB; font-weight: bold;">epic journey</span>',
        text: 'with themed courses like personal courage, women empowerment, or just 90s\' pop classics.'
      }
    ];

    descriptions.forEach((desc, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s ease;
      `;

      // Create the turning coin effect container
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        position: relative;
        perspective: 1000px;
      `;
      
      // Create the front side (number)
      const frontSide = document.createElement('div');
      frontSide.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 3px solid #111822;
        border-radius: 50%;
        color: #111822;
        font-size: 24px;
        font-weight: 900;
        backface-visibility: hidden;
        transition: transform 0.6s ease-in-out;
      `;
      frontSide.textContent = String(index + 1);
      
      // Create the back side (icon)
      const backSide = document.createElement('div');
      backSide.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000000;
        border-radius: 50%;
        backface-visibility: hidden;
        transform: rotateY(180deg);
        transition: transform 0.6s ease-in-out;
      `;
      
      // Create the icon inside the back side
      const bubbleIcon = document.createElement('img');
      bubbleIcon.style.cssText = `
        width: 48px;
        height: 48px;
        object-fit: contain;
        opacity: 0.9;
      `;
      
      // Set icon source based on index
      const iconSources = ['/images/icon1_flowstate.png', '/images/icon2_heart_energy.png', '/images/icon3_knight_journey.png'];
      bubbleIcon.src = iconSources[index];
      bubbleIcon.alt = `Icon ${index + 1}`;
      
      backSide.appendChild(bubbleIcon);
      
      // Add both sides to the bubble
      bubble.appendChild(frontSide);
      bubble.appendChild(backSide);
      
      // Add click event for turning coin effect
      let isFlipped = false;
      bubble.addEventListener('click', () => {
        if (isFlipped) {
          frontSide.style.transform = 'rotateY(0deg)';
          backSide.style.transform = 'rotateY(180deg)';
        } else {
          frontSide.style.transform = 'rotateY(180deg)';
          backSide.style.transform = 'rotateY(0deg)';
        }
        isFlipped = !isFlipped;
      });
      
      // Add hover effect to indicate it's clickable
      bubble.style.cursor = 'pointer';
      bubble.addEventListener('mouseenter', () => {
        bubble.style.transform = 'scale(1.05)';
      });
      bubble.addEventListener('mouseleave', () => {
        bubble.style.transform = 'scale(1)';
      });
      
      // Auto-rotate every 3 seconds with offset for each bubble
      const rotationInterval = setInterval(() => {
        if (isFlipped) {
          frontSide.style.transform = 'rotateY(0deg)';
          backSide.style.transform = 'rotateY(180deg)';
        } else {
          frontSide.style.transform = 'rotateY(180deg)';
          backSide.style.transform = 'rotateY(0deg)';
        }
        isFlipped = !isFlipped;
      }, 3000 + (index * 1000)); // 3 seconds + 1 second offset per bubble
      
      // Store the interval for cleanup if needed
      bubble.dataset.rotationInterval = rotationInterval;

      // Create the text content
      const textContent = document.createElement('div');
      textContent.style.cssText = `
        flex: 1;
        color: #eaf1ff;
      `;

      const title = document.createElement('h3');
      title.style.cssText = `
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
      `;
      title.innerHTML = desc.title;

      const text = document.createElement('p');
      text.style.cssText = `
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #a2a9b3;
      `;
      text.textContent = desc.text;

      textContent.appendChild(title);
      textContent.appendChild(text);
      item.appendChild(bubble);
      item.appendChild(textContent);
      container.appendChild(item);
    });

    // Add YouTube video section
    const videoSection = document.createElement('div');
    videoSection.style.cssText = `
      margin-top: 30px;
      text-align: center;
    `;

    const videoTitle = document.createElement('h3');
    videoTitle.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
    `;
    videoTitle.textContent = 'See Demo';

    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      aspect-ratio: 16/9;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/ROaMPcNN5mE';
    iframe.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    `;
    iframe.setAttribute('title', 'MITO DJ Demo Video');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');

    videoContainer.appendChild(iframe);
    videoSection.appendChild(videoTitle);
    videoSection.appendChild(videoContainer);
    container.appendChild(videoSection);

    // Insert the container after the SVG element
    const parent = svgEl.parentElement;
    if (parent) {
      parent.insertBefore(container, svgEl.nextSibling);
    }
  }
})(); 