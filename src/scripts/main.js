/* MITO DJ intro animation with GSAP */
(function () {
  if (typeof gsap === 'undefined') {
    console.warn('GSAP failed to load; skipping animations.');
    return;
  }

  const DEBUG_SCROLL = false;

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
      if (a < 16) continue;
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

    // Ensure distinctness
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
    const overshoot = Math.max(500, Math.round(Math.min(vw, vh) * 0.35));

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

    // Shimmer sweep
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
    portrait.style.opacity = '0';
  }

  if (prefersReduced) {
    if (portrait) gsap.to(portrait, { opacity: 0.5, duration: 0.3 });
    gsap.to(letters, { opacity: 1, duration: 0.3, stagger: 0.02 });
    return;
  }

  // Build timeline
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  // Animate portrait
  if (portrait) {
    gsap.set(portrait, { opacity: 0 });
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

  // Initialize content sections
  initializeContentSections();

  function initializeContentSections() {
    // Add Why section
    addWhySection();
    
    // Add What section
    addWhatSection();
    
    // Generate beats plot
    const beatsPlot = document.getElementById('beats-plot');
    if (beatsPlot) {
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
    
    // Add other sections
    addResultsSection();
    addSeeDemoSection();
    addHowSection();
  }

  function addWhySection() {
    const contentSection = document.querySelector('.section--content .container');
    if (!contentSection) return;

    const container = document.createElement('div');
    container.className = 'why-section';
    container.style.cssText = `
      margin: 40px auto 60px auto;
      padding: 40px 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 1000px;
      width: calc(100% - 60px);
      box-sizing: border-box;
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    `;
    title.textContent = 'Why?';
    container.appendChild(title);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    cardsContainer.style.cssText = `
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(3, 1fr);
    `;

    const cards = [
      {
        title: 'Mismatch',
        text: 'The workout changes pace, but the music falls flat.',
        icon: '/images/01-mismatch.png'
      },
      {
        title: 'Off-beat',
        text: 'The cadence of the ride and the rhythm of the music don\'t align.',
        icon: '/images/02-off-beat.png'
      },
      {
        title: 'Distraction',
        text: 'Coaches lose focus when juggling playlists instead of leading the class.',
        icon: '/images/03-distraction.png'
      }
    ];

    cards.forEach((card) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'why-card';
      cardElement.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 32px 24px;
        background: #000000;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s ease;
        cursor: pointer;
      `;

      const iconContainer = document.createElement('div');
      iconContainer.className = 'why-card__icon';
      iconContainer.style.cssText = `
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        box-shadow: 0 8px 24px rgba(255, 71, 87, 0.4);
        overflow: hidden;
        position: relative;
        transition: all 0.3s ease;
      `;
      
      const iconImage = document.createElement('img');
      iconImage.src = card.icon;
      iconImage.alt = `${card.title} icon`;
      iconImage.style.cssText = `
        width: 40px;
        height: 40px;
        object-fit: contain;
      `;
      
      iconContainer.appendChild(iconImage);

      const title = document.createElement('h3');
      title.className = 'why-card__title';
      title.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 20px;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      `;
      title.textContent = card.title;

      const text = document.createElement('p');
      text.className = 'why-card__text';
      text.style.cssText = `
        margin: 0;
        font-size: 15px;
        line-height: 1.5;
        color: #a2a9b3;
        max-width: 280px;
      `;
      text.textContent = card.text;

      cardElement.appendChild(iconContainer);
      cardElement.appendChild(title);
      cardElement.appendChild(text);
      cardsContainer.appendChild(cardElement);
    });

    container.appendChild(cardsContainer);
    contentSection.appendChild(container);
  }

  function addWhatSection() {
    const contentSection = document.querySelector('.section--content .container');
    if (!contentSection) return;

    const container = document.createElement('div');
    container.className = 'what-section';
    container.style.cssText = `
      margin: 40px auto 60px auto;
      padding: 40px 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 1000px;
      width: calc(100% - 60px);
      box-sizing: border-box;
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    `;
    title.textContent = 'What?';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 18px;
      line-height: 1.6;
      color: #a2a9b3;
      text-align: center;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    `;
    subtitle.textContent = 'Precision-mixed music that matches the entire course plan.';
    container.appendChild(subtitle);

    // Move the beats plot into this section
    const beatsPlot = document.getElementById('beats-plot');
    if (beatsPlot) {
      container.appendChild(beatsPlot);
    }

    contentSection.appendChild(container);
  }

  function renderBeats(svgEl, segments) {
    // Clear
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    const data = segments.map(s => ({ ...s }));
    const totalSeconds = data.reduce((sum, s) => sum + s.seconds, 0);

    // Layout settings
    const vb = svgEl.viewBox.baseVal;
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

    // Add animated logo
    const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logoGroup.setAttribute('class', 'logo-animation');
    svgEl.appendChild(logoGroup);

    const trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trailPath.setAttribute('fill', 'none');
    trailPath.setAttribute('stroke', '#b36bff');
    trailPath.setAttribute('stroke-width', '3');
    trailPath.setAttribute('stroke-linecap', 'round');
    trailPath.setAttribute('stroke-linejoin', 'round');
    trailPath.setAttribute('opacity', '0.8');
    trailPath.setAttribute('stroke-dasharray', '0 1000');
    logoGroup.appendChild(trailPath);

    const logoImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    logoImage.setAttribute('href', '/images/logo-mito-dj-sin-fondo.png');
    logoImage.setAttribute('x', '0');
    logoImage.setAttribute('y', '0');
    logoImage.setAttribute('width', '64');
    logoImage.setAttribute('height', '64');
    logoImage.setAttribute('opacity', '0');
    logoGroup.appendChild(logoImage);

    // Add clock
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

    const hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hourHand.setAttribute('x1', String(clockCx));
    hourHand.setAttribute('y1', String(clockCy));
    hourHand.setAttribute('x2', String(clockCx));
    hourHand.setAttribute('y2', String(clockCy - clockRadius * 0.5));
    hourHand.setAttribute('stroke', '#ffffff');
    hourHand.setAttribute('stroke-width', '2.5');
    hourHand.setAttribute('stroke-linecap', 'round');
    clockGroup.appendChild(hourHand);

    const minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minuteHand.setAttribute('x1', String(clockCx));
    minuteHand.setAttribute('y1', String(clockCy));
    minuteHand.setAttribute('x2', String(clockCx));
    minuteHand.setAttribute('y2', String(clockCy - clockRadius * 0.85));
    minuteHand.setAttribute('stroke', '#ffffff');
    minuteHand.setAttribute('stroke-width', '2');
    minuteHand.setAttribute('stroke-linecap', 'round');
    clockGroup.appendChild(minuteHand);

    // Zone labels
    const zoneMessages = [
      'Zone 1: 0%',
      'Zone 2: 40%',
      'Zone 3: 70%',
      'Zone 4: 90%',
      'Zone 5: 120%',
    ];
    const zoneColors = ['#a2a9b3', '#6aa7ff', '#3df06a', '#fff661', '#ff2a2a'];
    const labelsY = (baselineY - barMaxHeight) - 6;
    const firstFiveBars = barNodes.slice(0, 5);
    const firstLeft = firstFiveBars[0] ? firstFiveBars[0].x : leftEdge;
    const lastBar = firstFiveBars[4];
    const lastRight = lastBar ? lastBar.x + Number(lastBar.node.getAttribute('width')) : (leftEdge + targetWidth * 0.25);
    const totalSpan = Math.max(1, lastRight - firstLeft);
    const pushRight = 28;
    const zone1X = Math.round(firstLeft + pushRight);
    const avgGap = totalSpan / Math.max(1, 5 - 1);
    const spacing = Math.max(36, Math.round(avgGap * 0.76));

    for (let i = 0; i < 5; i += 1) {
      const tx = i === 0 ? zone1X : zone1X + i * spacing;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
    }

    // Add scroll-triggered animations
    const canScrollTrigger = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (canScrollTrigger && !prefersReduced) {
      gsap.registerPlugin(ScrollTrigger);

      // Check if mobile device
      const isMobile = window.innerWidth <= 768;
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: svgEl,
          start: isMobile ? 'top 90%' : 'top 90%',
          end: isMobile ? 'top 50%' : 'bottom 60%',
          scrub: 0.5,
          markers: DEBUG_SCROLL,
        },
        defaults: { ease: 'power2.out' }
      });

      // Animate bars
      const centerX = Math.round(leftEdge + targetWidth / 2);
      const fromY = baselineY + Math.round(barMaxHeight * 1.5);
      
      barNodes.forEach((b) => {
        tl.fromTo(b.node,
          { attr: { x: centerX, y: fromY }, opacity: 0 },
          { attr: { x: b.x, y: b.y }, opacity: 1, duration: 0.3 },
          0
        );
      });

      // Animate clock
      tl.fromTo(clockGroup, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
      tl.to(minuteHand, { 
        rotation: 360, 
        svgOrigin: `${clockCx} ${clockCy}`,
        duration: 1.2,
        ease: 'none'
      }, 0.3);

      // Animate logo
      tl.set(logoImage, { 
        x: barNodes[0].x + barNodes[0].node.getAttribute('width') / 2 - 32, 
        y: barNodes[0].y - 64,
        opacity: 1 
      }, 0.3);

      const logoKeyframes = barNodes.map((bar, index) => {
        const barCenterX = bar.x + Number(bar.node.getAttribute('width')) / 2 - 32;
        const barTopY = bar.y - 64;
        const keyframeTime = (index / (barNodes.length - 1)) * 1.2;
        return { x: barCenterX, y: barTopY, time: keyframeTime };
      });

      const pathData = logoKeyframes.map((keyframe, index) => {
        if (index === 0) return `M ${keyframe.x + 32} ${keyframe.y + 32}`;
        return `L ${keyframe.x + 32} ${keyframe.y + 32}`;
      }).join(' ');
      trailPath.setAttribute('d', pathData);

      tl.to(trailPath, {
        'stroke-dasharray': '1000 0',
        duration: 1.2,
        ease: 'none'
      }, 0.3);

      logoKeyframes.forEach((keyframe, index) => {
        if (index > 0) {
          tl.to(logoImage, {
            x: keyframe.x,
            y: keyframe.y,
            duration: keyframe.time - logoKeyframes[index - 1].time,
            ease: 'none'
          }, 0.3 + logoKeyframes[index - 1].time);
        }
      });
    }
  }

  function addResultsSection() {
    const contentSection = document.querySelector('.section--content .container');
    if (!contentSection) return;

    const container = document.createElement('div');
    container.className = 'results-section';
    container.style.cssText = `
      margin: 40px auto 60px auto;
      padding: 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 25px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    `;

    const resultsTitle = document.createElement('h2');
    resultsTitle.style.cssText = `
      margin: 0 0 30px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    `;
    resultsTitle.textContent = 'Results';
    container.appendChild(resultsTitle);

    const descriptions = [
      {
        number: 1,
        title: '<span style="color: #CB6EEB; font-weight: bold;">Flow-state</span> Mastery',
        text: 'Lock riders into their rhythm with the perfect beat and pace for every segment, guiding them seamlessly into their peak performance zone.'
      },
      {
        number: 2,
        title: 'Ignite Their <span style="color: #CB6EEB; font-weight: bold;">120%</span>',
        text: 'Sync explosive music drops with every red-zone push. Drive the room\'s energy sky-high and end with a finale they\'ll never forget.'
      },
      {
        number: 3,
        title: 'Ride the <span style="color: #CB6EEB; font-weight: bold;">epic journey</span>',
        text: 'Transform every class into an unforgettable quest — from battles of courage, to waves of empowerment, or pure 90s pop euphoria.'
      }
    ];

    descriptions.forEach((desc, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        background: #000000;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s ease;
      `;

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
      
      const bubbleIcon = document.createElement('img');
      bubbleIcon.style.cssText = `
        width: 48px;
        height: 48px;
        object-fit: contain;
        opacity: 0.9;
      `;
      
      const iconSources = ['/images/icon1_flowstate.png', '/images/icon2_heart_energy.png', '/images/icon3_knight_journey.png'];
      bubbleIcon.src = iconSources[index];
      bubbleIcon.alt = `Icon ${index + 1}`;
      
      backSide.appendChild(bubbleIcon);
      bubble.appendChild(frontSide);
      bubble.appendChild(backSide);
      
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
      
      bubble.style.cursor = 'pointer';

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

    contentSection.appendChild(container);
  }

  function addSeeDemoSection() {
    const contentSection = document.querySelector('.section--content .container');
    if (!contentSection) return;

    const container = document.createElement('div');
    container.className = 'see-demo-section';
    container.style.cssText = `
      margin: 40px auto 60px auto;
      padding: 40px 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 1000px;
      width: calc(100% - 60px);
      box-sizing: border-box;
      text-align: center;
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 30px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    `;
    title.textContent = 'See Demo';
    container.appendChild(title);
    
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
    iframe.src = 'https://www.youtube.com/embed/ROaMPcNN5mE?rel=0&modestbranding=1&disablekb=1';
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
    iframe.setAttribute('loading', 'lazy');

    videoContainer.appendChild(iframe);
    container.appendChild(videoContainer);
    contentSection.appendChild(container);
  }

  function addHowSection() {
    const contentSection = document.querySelector('.section--content .container');
    if (!contentSection) return;

    const container = document.createElement('div');
    container.className = 'how-section';
    container.style.cssText = `
      margin: 40px auto 60px auto;
      padding: 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    `;

    container.innerHTML = `
      <h2 style="
        margin: 0 0 30px 0;
        font-size: 24px;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      ">How?</h2>
      
      <div style="display: grid; gap: 20px;">
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 20px;
          background: #000000;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        ">
          <span style="
            font-size: 24px;
            font-weight: 700;
            color: #b36bff;
            min-width: 40px;
            text-align: center;
            line-height: 1;
          ">1/</span>
          <div>
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: #ffffff;
            ">Submit your course plan</h3>
            <p style="
              margin: 0;
              color: #9aa7b6;
              font-size: 14px;
              line-height: 1.5;
            ">Send us your spin class plan with the workout segments and intensity levels.</p>
          </div>
        </div>
        
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 20px;
          background: #000000;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        ">
          <span style="
            font-size: 24px;
            font-weight: 700;
            color: #b36bff;
            min-width: 40px;
            text-align: center;
            line-height: 1;
          ">2/</span>
          <div>
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: #ffffff;
            ">(Optional) Add your music picks</h3>
            <p style="
              margin: 0;
              color: #9aa7b6;
              font-size: 14px;
              line-height: 1.5;
            ">Share a playlist or song ideas to guide the vibe.</p>
          </div>
        </div>
        
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 20px;
          background: #000000;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        ">
          <span style="
            font-size: 24px;
            font-weight: 700;
            color: #b36bff;
            min-width: 40px;
            text-align: center;
            line-height: 1;
          ">3/</span>
          <div>
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: #ffffff;
            ">Get your custom 45-minute mix</h3>
            <p style="
              margin: 0;
              color: #9aa7b6;
              font-size: 14px;
              line-height: 1.5;
            ">We deliver a precision-mixed track that matches every climb, sprint, and recovery.</p>
          </div>
        </div>
        
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 20px;
          background: #000000;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        ">
          <span style="
            font-size: 24px;
            font-weight: 700;
            color: #b36bff;
            min-width: 40px;
            text-align: center;
            line-height: 1;
          ">4/</span>
          <div>
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: #ffffff;
            ">Stream it in your class</h3>
            <p style="
              margin: 0;
              color: #9aa7b6;
              font-size: 14px;
              line-height: 1.5;
            ">Play the full mix straight from the cloud — ready to ride.</p>
          </div>
        </div>
      </div>
    `;

    contentSection.appendChild(container);
  }
})();