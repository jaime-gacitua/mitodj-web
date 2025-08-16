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



  // Add Why section before the beats plot
  addWhySection();

  // Add What section to encapsulate the segments animation
  const whatSectionContainer = addWhatSection();

  // Generate Spinning Beats plot and table
  const beatsPlot = document.getElementById('beats-plot');
  if (beatsPlot && whatSectionContainer) {
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

    // Move the beats plot into the What section
    if (whatSectionContainer) {
      whatSectionContainer.appendChild(beatsPlot);
    }
    renderBeats(beatsPlot, segments);
  }

  function addWhatSection() {
    // Find the beats section to insert the What section after the Why section
    const whySection = document.querySelector('.why-section');
    if (!whySection) return;

    // Create container for the What section
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

    // Create the What section title
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

    // Create the What section subtitle
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

    // Insert the What section after the Why section
    whySection.parentElement.insertBefore(container, whySection.nextSibling);

    // Return the container for the animation to be added later
    return container;
  }

  function addWhySection() {
    // Find the beats quote to insert the Why section after it
    const beatsQuote = document.querySelector('.beats__quote');
    if (!beatsQuote) return;

    // Create container for the Why section
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

    // Create the Why section title
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

    // Create the cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    cardsContainer.style.cssText = `
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(3, 1fr);
    `;
    
    // Add mobile-specific inline styles as backup
    const mobileGridStyles = `
      @media (max-width: 768px) {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 24px !important;
        width: 100% !important;
      }
    `;
    
    if (!document.querySelector('#mobile-grid-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'mobile-grid-styles';
      styleSheet.textContent = mobileGridStyles;
      document.head.appendChild(styleSheet);
    }

    // Mobile responsive styles
    const mobileStyles = `
      @media (max-width: 768px) {
        .why-section, .what-section, .results-section {
          margin: 30px auto 50px auto !important;
          padding: 30px 20px !important;
          width: calc(100% - 32px) !important;
          max-width: 500px !important;
        }
        .why-section .cards-container {
          grid-template-columns: 1fr !important;
          gap: 24px !important;
          width: 100% !important;
        }
        .why-section .why-card {
          padding: 28px 24px !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
        }
        .why-section .why-card__icon {
          width: 56px !important;
          height: 56px !important;
          margin-bottom: 24px !important;
        }
        .why-section .why-card__title {
          font-size: 20px !important;
          margin-bottom: 16px !important;
        }
        .why-section .why-card__text {
          font-size: 16px !important;
          line-height: 1.6 !important;
          max-width: none !important;
        }
        .zone-cards {
          margin-top: 60px !important;
          margin-bottom: 60px !important;
        }
        .beats__svg {
          transform: scale(1.2) !important;
          transform-origin: center !important;
        }
        .fire-icon, .water-icon, .herb-icon {
          font-size: 96px !important;
        }
      }
      
      @media (max-width: 480px) {
        .why-section, .what-section, .results-section {
          margin: 20px auto 40px auto !important;
          padding: 24px 16px !important;
          width: calc(100% - 24px) !important;
          max-width: 450px !important;
        }
        .why-section .why-card {
          padding: 24px 20px !important;
        }
        .why-section .why-card__icon {
          width: 48px !important;
          height: 48px !important;
          margin-bottom: 20px !important;
        }
        .why-section .why-card__title {
          font-size: 18px !important;
        }
        .why-section .why-card__text {
          font-size: 15px !important;
        }
        .zone-cards {
          margin-top: 50px !important;
          margin-bottom: 50px !important;
        }
        .beats__svg {
          transform: scale(1.2) !important;
          transform-origin: center !important;
        }
        .fire-icon, .water-icon, .herb-icon {
          font-size: 96px !important;
        }
      }
    `;

    // Add mobile styles to head
    if (!document.querySelector('#why-section-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'why-section-styles';
      styleSheet.textContent = mobileStyles;
      document.head.appendChild(styleSheet);
    }

    // Create the three cards
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

    cards.forEach((card, index) => {
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

      // Add hover effects
      cardElement.addEventListener('mouseenter', () => {
        cardElement.style.transform = 'translateY(-4px)';
        cardElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        cardElement.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4)';
        
        // Enhance icon on hover
        const icon = cardElement.querySelector('.why-card__icon');
        if (icon) {
          icon.style.transform = 'scale(1.1) rotate(5deg)';
          icon.style.boxShadow = '0 12px 32px rgba(255, 71, 87, 0.6), 0 0 20px rgba(255, 71, 87, 0.4)';
        }
      });

      cardElement.addEventListener('mouseleave', () => {
        cardElement.style.transform = 'translateY(0)';
        cardElement.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        cardElement.style.boxShadow = 'none';
        
        // Reset icon on hover out
        const icon = cardElement.querySelector('.why-card__icon');
        if (icon) {
          icon.style.transform = 'scale(1) rotate(0deg)';
          icon.style.boxShadow = '0 8px 24px rgba(255, 71, 87, 0.4)';
        }
      });

      // Create icon container
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
      
      // Create image element
      const iconImage = document.createElement('img');
      iconImage.src = card.icon;
      iconImage.alt = `${card.title} icon`;
      iconImage.style.cssText = `
        width: 40px;
        height: 40px;
        object-fit: contain;
      `;
      
      iconContainer.appendChild(iconImage);

      // Create title
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

      // Create text
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

      // Assemble card
      cardElement.appendChild(iconContainer);
      cardElement.appendChild(title);
      cardElement.appendChild(text);
      cardsContainer.appendChild(cardElement);
    });

    // Add cards to container
    container.appendChild(cardsContainer);

    // Insert the Why section after the beats quote
    beatsQuote.parentElement.insertBefore(container, beatsQuote.nextSibling);
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

    // Add animated logo that jumps from bar to bar
    const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logoGroup.setAttribute('class', 'logo-animation');
    svgEl.appendChild(logoGroup);

    // Create the trail path first (lower z-index)
    const trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trailPath.setAttribute('fill', 'none');
    trailPath.setAttribute('stroke', '#b36bff');
    trailPath.setAttribute('stroke-width', '3');
    trailPath.setAttribute('stroke-linecap', 'round');
    trailPath.setAttribute('stroke-linejoin', 'round');
    trailPath.setAttribute('opacity', '0.8');
    trailPath.setAttribute('stroke-dasharray', '0 1000');
    trailPath.setAttribute('stroke-dashoffset', '0');
    logoGroup.appendChild(trailPath);

    // Create the logo image after trail (higher z-index)
    const logoImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    logoImage.setAttribute('href', '/images/logo-mito-dj-sin-fondo.png');
    logoImage.setAttribute('x', '0');
    logoImage.setAttribute('y', '0');
    logoImage.setAttribute('width', '64');
    logoImage.setAttribute('height', '64');
    logoImage.setAttribute('opacity', '0');
    logoGroup.appendChild(logoImage);

    // Add fire icon on the 13th bar
    const fireIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    fireIcon.setAttribute('x', '0');
    fireIcon.setAttribute('y', '0');
    fireIcon.setAttribute('font-size', '48');
    fireIcon.setAttribute('text-anchor', 'middle');
    fireIcon.setAttribute('dominant-baseline', 'middle');
    fireIcon.setAttribute('opacity', '0');
    fireIcon.setAttribute('class', 'fire-icon');
    fireIcon.textContent = '🔥';
    logoGroup.appendChild(fireIcon);

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
    let zoneCardsContainer = null; // For mobile HTML cards

    // Mobile: render cards instead of SVG text labels
    const isMobileForLabels = window.matchMedia('(max-width: 640px)').matches;

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

    if (!isMobileForLabels) {
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
    } else {
      // Build HTML cards above the plot
      const root = svgEl.parentElement; // .beats__root
      if (root) {
        // Remove any previous cards (defensive)
        const prev = root.querySelector('.zone-cards');
        if (prev) prev.remove();
        const cards = document.createElement('div');
        cards.className = 'zone-cards';
        // Insert before the SVG
        root.insertBefore(cards, svgEl);
        zoneCardsContainer = cards;

        function getTextColorForBg(hex) {
          const h = hex.replace('#','');
          const r = parseInt(h.substring(0,2),16);
          const g = parseInt(h.substring(2,4),16);
          const b = parseInt(h.substring(4,6),16);
          // Perceived luminance
          const l = 0.2126*r + 0.7152*g + 0.0722*b;
          return l > 150 ? '#111822' : '#ffffff';
        }

        for (let i = 0; i < 5; i += 1) {
          const color = zoneColors[i] || '#333';
          const card = document.createElement('div');
          card.className = `zone-card zone-card--${i+1}`;
          card.style.background = color;
          card.style.color = getTextColorForBg(color);
          card.style.opacity = '0'; // start hidden; animate in via GSAP timeline
          const title = document.createElement('div');
          title.className = 'zone-card__title';
          title.textContent = `Zone ${i+1}`;
          const subtitle = document.createElement('div');
          subtitle.className = 'zone-card__subtitle';
          const percent = (zoneMessages[i] || '').split(':')[1]?.trim() || '';
          subtitle.textContent = `${percent} FTP`;
          card.appendChild(title);
          card.appendChild(subtitle);
          cards.appendChild(card);
        }
      }
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
      const beatsRootEl = document.querySelector('.beats__root');
      const beatsTitle = document.getElementById('beats-title');
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      // Compute a tight scroll span based on plot height to avoid wasted scrolling
      const plotHeight = (beatsRootEl && beatsRootEl.getBoundingClientRect().height) || 600;
      const unifiedEnd = Math.max(500, Math.round(plotHeight * (isMobile ? 1.0 : 0.85)));
      if (DEBUG_SCROLL) {
        console.table({ bars: barNodes.length, targetWidth, unifiedEnd, vh: window.innerHeight, isMobile });
      }
      function updateStickyOffsets() {
        const projectsTitle = document.getElementById('projects-title');
        const beatsTitleEl = document.getElementById('beats-title');
        const ph = projectsTitle ? projectsTitle.offsetHeight : 0;
        const bh = beatsTitleEl ? beatsTitleEl.offsetHeight : 0;
        document.documentElement.style.setProperty('--projects-sticky-offset', ph + 'px');
        document.documentElement.style.setProperty('--beats-title-offset', bh + 'px');
      }

      updateStickyOffsets();
      window.addEventListener('resize', updateStickyOffsets, { passive: true });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.querySelector('.what-section h2'), // start when "WHAT" title hits center
          start: isMobile ? 'top 50%' : 'top 55%',
          end: isMobile ? 'top 15%' : 'top 35%', // end when WHAT section reaches 30% from top
          scrub: 0.5, // Increased for smoother scrolling
          pin: beatsRootEl || beatsContainer || true, // pin only the plot/root so titles can stay sticky
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
            updateStickyOffsets();
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
            updateStickyOffsets();
          },
          onRefresh: () => { updateStickyOffsets(); },
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

      // Unified bar animation: all bars appear in single batch
      const centerX = Math.round(leftEdge + targetWidth / 2);
      const fromY = baselineY + Math.round(barMaxHeight * 1.5);
      
      // All bars appear simultaneously
      barNodes.forEach((b) => {
        tl.fromTo(b.node,
          { attr: { x: centerX, y: fromY }, opacity: 0 },
          { attr: { x: b.x, y: b.y }, opacity: 1, duration: 0.3 },
          0 // All bars start at same time
        );
      });

      // Clock fades in from bottom-left with the bars and animates throughout
      tl.fromTo(clockGroup, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, 0);
      
      // Calculate total bar animation duration (bars appear quickly, then clock/logo animate)
      const barAppearDuration = 0.3; // Bars appear in 0.3 seconds
      const clockLogoDuration = 1.2; // Clock and logo animate over 1.2 seconds
      const totalBarDuration = barAppearDuration + clockLogoDuration; // Total duration
      
      // Animate minute hand: full 360-degree rotation after bars appear
      tl.to(minuteHand, { 
        rotation: 360, 
        svgOrigin: `${clockCx} ${clockCy}`,
        duration: clockLogoDuration,
        ease: 'none'
      }, barAppearDuration);
      
      // Animate hour hand: move from 12 to 1 o'clock (30 degrees) after bars appear
      tl.to(hourHand, { 
        rotation: 30, 
        svgOrigin: `${clockCx} ${clockCy}`,
        duration: clockLogoDuration,
        ease: 'none'
      }, barAppearDuration);

      // Animate logo jumping from bar to bar in parallel with clock
      const logoJumpDuration = clockLogoDuration; // Same duration as clock animation
      
      // Start logo at first bar after bars appear
      tl.set(logoImage, { 
        x: barNodes[0].x + barNodes[0].node.getAttribute('width') / 2 - 32, 
        y: barNodes[0].y - 64,
        opacity: 1 
      }, barAppearDuration);
      
      // Create keyframe animations for logo to follow bar heights
      const logoKeyframes = barNodes.map((bar, index) => {
        const barCenterX = bar.x + Number(bar.node.getAttribute('width')) / 2 - 32;
        const barTopY = bar.y - 64;
        const keyframeTime = (index / (barNodes.length - 1)) * clockLogoDuration;
        return { x: barCenterX, y: barTopY, time: keyframeTime };
      });

      // Build the trail path data - single continuous path
      const pathData = logoKeyframes.map((keyframe, index) => {
        if (index === 0) return `M ${keyframe.x + 32} ${keyframe.y + 32}`;
        return `L ${keyframe.x + 32} ${keyframe.y + 32}`;
      }).join(' ');
      trailPath.setAttribute('d', pathData);

      // Set initial trail state - completely hidden
      trailPath.setAttribute('stroke-dasharray', '0 1000');

      // Animate the trail to appear progressively from left to right
      tl.to(trailPath, {
        'stroke-dasharray': '1000 0',
        duration: clockLogoDuration,
        ease: 'none'
      }, barAppearDuration);

      // Animate logo through each keyframe after bars appear
      logoKeyframes.forEach((keyframe, index) => {
        if (index > 0) { // Skip first keyframe (starting position)
          tl.to(logoImage, {
            x: keyframe.x,
            y: keyframe.y,
            duration: keyframe.time - logoKeyframes[index - 1].time,
            ease: 'none'
          }, barAppearDuration + logoKeyframes[index - 1].time);
        }
      });

      // Position and animate fire icon on the 15th bar
      const fireBarIndex = 14; // 15th bar (0-indexed)
      if (barNodes[fireBarIndex]) {
        const fireBar = barNodes[fireBarIndex];
        const fireX = fireBar.x + Number(fireBar.node.getAttribute('width')) / 2; // Center on bar
        const fireY = fireBar.y ; // Closer to the bar
        
        // Position fire icon
        fireIcon.setAttribute('x', fireX);
        fireIcon.setAttribute('y', fireY);
        
        // Fade in fire icon when logo reaches that bar
        const fireFadeTime = barAppearDuration + (fireBarIndex / (barNodes.length - 1)) * clockLogoDuration;
        tl.to(fireIcon, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        }, fireFadeTime);
      }

      // Add water droplet icon on the 26th bar for calm segments
      const waterIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      waterIcon.setAttribute('x', '0');
      waterIcon.setAttribute('y', '0');
      waterIcon.setAttribute('font-size', '48');
      waterIcon.setAttribute('text-anchor', 'middle');
      waterIcon.setAttribute('dominant-baseline', 'middle');
      waterIcon.setAttribute('opacity', '0');
      waterIcon.setAttribute('class', 'water-icon');
      waterIcon.textContent = '💧';
      logoGroup.appendChild(waterIcon);

      // Add herb icon on the 27th bar for calm segments
      const herbIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      herbIcon.setAttribute('x', '0');
      herbIcon.setAttribute('y', '0');
      herbIcon.setAttribute('font-size', '48');
      herbIcon.setAttribute('text-anchor', 'middle');
      herbIcon.setAttribute('dominant-baseline', 'middle');
      herbIcon.setAttribute('opacity', '0');
      herbIcon.setAttribute('class', 'herb-icon');
      herbIcon.textContent = '🌿';
      logoGroup.appendChild(herbIcon);

      // Position and animate water droplet icon on the 26th bar
      const waterBarIndex = 25; // 26th bar (0-indexed)
      if (barNodes[waterBarIndex]) {
        const waterBar = barNodes[waterBarIndex];
        const waterX = waterBar.x + Number(waterBar.node.getAttribute('width')) / 2; // Center on bar
        const waterY = waterBar.y; // On the bar
        
        // Position water icon
        waterIcon.setAttribute('x', waterX);
        waterIcon.setAttribute('y', waterY);
        
        // Fade in water icon when logo reaches that bar
        const waterFadeTime = barAppearDuration + (waterBarIndex / (barNodes.length - 1)) * clockLogoDuration;
        tl.to(waterIcon, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        }, waterFadeTime);
      }

      // Position and animate herb icon on the 27th bar
      const herbBarIndex = 26; // 27th bar (0-indexed)
      if (barNodes[herbBarIndex]) {
        const herbBar = barNodes[herbBarIndex];
        const herbX = herbBar.x + Number(herbBar.node.getAttribute('width')) / 2; // Center on bar
        const herbY = herbBar.y; // On the bar
        
        // Position herb icon
        herbIcon.setAttribute('x', herbX);
        herbIcon.setAttribute('y', herbY);
        
        // Fade in herb icon when logo reaches that bar
        const herbFadeTime = barAppearDuration + (herbBarIndex / (barNodes.length - 1)) * clockLogoDuration;
        tl.to(herbIcon, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        }, herbFadeTime);
      }

      // Add trophy emoji at the bottom right of the last bar
      const trophyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      trophyIcon.setAttribute('x', '0');
      trophyIcon.setAttribute('y', '0');
      trophyIcon.setAttribute('font-size', '48');
      trophyIcon.setAttribute('text-anchor', 'end');
      trophyIcon.setAttribute('dominant-baseline', 'middle');
      trophyIcon.setAttribute('opacity', '0');
      trophyIcon.setAttribute('class', 'trophy-icon');
      trophyIcon.textContent = '🏆';
      logoGroup.appendChild(trophyIcon);

      // Position and animate trophy icon on the last bar
      const lastBarIndex = barNodes.length - 1;
      if (barNodes[lastBarIndex]) {
        const lastBar = barNodes[lastBarIndex];
        const trophyX = lastBar.x + Number(lastBar.node.getAttribute('width')) * 2; // Right edge of last bar
        const trophyY = baselineY; // on the baseline
        
        // Position trophy icon
        trophyIcon.setAttribute('x', trophyX);
        trophyIcon.setAttribute('y', trophyY);
        
        // Fade in trophy icon when logo reaches the last bar
        const trophyFadeTime = barAppearDuration + (lastBarIndex / (barNodes.length - 1)) * clockLogoDuration;
        tl.to(trophyIcon, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        }, trophyFadeTime);
      }

      // Zone labels/cards fade in as bars arrive
      if (zoneCardsContainer) {
        const items = Array.from(zoneCardsContainer.children);
        if (items.length) {
          tl.to(items, { opacity: 1, y: 0, duration: 0.2, stagger: 0.05, ease: 'none' }, 0.1);
        }
      } else {
        zoneTexts.forEach((tdata, i) => {
          if (tdata) tl.to(tdata.node, { opacity: 1, duration: 0.2, ease: 'none' }, 0.1 + i * 0.02);
        });
      }

      // Keep the end tight; avoid extra buffer animation to eliminate trailing scroll

      // After configuration, refresh ScrollTrigger to account for new pin spacing
      ScrollTrigger.refresh();
    }

    // Add the results section below the plot
    addResultsSection(svgEl);
  }

  function addResultsSection(svgEl) {
    // Create container for the results section
    const container = document.createElement('div');
    container.className = 'results-section';
    container.style.cssText = `
      margin-top: 40px;
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

    // Create the Results title
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

    // Create the three description items
    const descriptions = [
      {
        number: 1,
        title: '<span style="color: #CB6EEB; font-weight: bold;">Flow-state</span> Mastery',
        text: 'Lock riders into their rhythm with the perfect beat and pace for every segment, guiding them seamlessly into their peak performance zone.'
      },
      {
        number: 2,
        title: 'Ignite Their <span style="color: #CB6EEB; font-weight: bold;">120%</span>',
        text: 'Sync explosive music drops with every red-zone push. Drive the room’s energy sky-high and end with a finale they’ll never forget.'
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
      
      // Auto-rotate every 3 seconds - all bubbles synchronized
      const rotationInterval = setInterval(() => {
        if (isFlipped) {
          frontSide.style.transform = 'rotateY(0deg)';
          backSide.style.transform = 'rotateY(180deg)';
        } else {
          frontSide.style.transform = 'rotateY(180deg)';
          backSide.style.transform = 'rotateY(0deg)';
        }
        isFlipped = !isFlipped;
      }, 3000); // All bubbles flip every 3 seconds simultaneously
      
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

    // Add spin-girl image after descriptions
    const imageSection = document.createElement('div');
    imageSection.style.cssText = `
      margin-top: 30px;
      text-align: center;
    `;

    const spinGirlImage = document.createElement('img');
    spinGirlImage.src = '/images/spin-girl.png';
    spinGirlImage.alt = 'Spinning girl illustration';
    spinGirlImage.style.cssText = `
      width: 200px;
      height: auto;
      max-width: 100%;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      border-radius: 8px;
      box-shadow: 
        0 0 20px rgba(179, 107, 255, 0.6),
        0 0 40px rgba(179, 107, 255, 0.4),
        0 0 60px rgba(179, 107, 255, 0.2);
    `;

    imageSection.appendChild(spinGirlImage);
    container.appendChild(imageSection);

            // Insert the container after the WHAT section (not inside it)
    const whatSection = document.querySelector('.what-section');
    if (whatSection) {
      whatSection.parentElement.insertBefore(container, whatSection.nextSibling);
    }
    
    // Add See Demo section after the results section (same level)
    addSeeDemoSection();
    
    // Add How section after the see demo section (same level)
    addHowSection();
  }

  function addSeeDemoSection() {
    // Create container for the See Demo section
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

    // Create the See Demo title
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

    // Insert after the results section (same level)
    const parent = document.querySelector('.results-section')?.parentElement;
    if (parent) {
      const resultsContainer = parent.querySelector('.results-section');
      if (resultsContainer) {
        parent.insertBefore(container, resultsContainer.nextSibling);
      }
    }
  }

  function addHowSection() {
    // Create container for the How section
    const container = document.createElement('div');
    container.className = 'how-section';
    container.style.cssText = `
      margin-top: 40px;
      padding: 30px;
      background: #000000;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    `;

    // Create the How section content
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

    // Insert after the see-demo section (same level)
    const parent = document.querySelector('.see-demo-section')?.parentElement;
    if (parent) {
      const seeDemoContainer = parent.querySelector('.see-demo-section');
      if (seeDemoContainer) {
        parent.insertBefore(container, seeDemoContainer.nextSibling);
      }
    }
  }
})(); 