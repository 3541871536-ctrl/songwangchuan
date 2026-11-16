(() => {
  "use strict";

  const FRAME_COUNT = 96;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (start, end, amount) => start + (end - start) * amount;
  const normalize = (value, start, end) =>
    clamp((value - start) / Math.max(0.000001, end - start), 0, 1);
  const smooth = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);

  const stage = document.querySelector(".stage");
  const stageInner = document.querySelector(".stage__inner");
  const canvas = document.getElementById("incense");
  const ctx = canvas.getContext("2d");
  const smokeCanvas = document.getElementById("incense-smoke");
  const smokeContext = smokeCanvas.getContext("2d");
  const progressLabel = document.querySelector("#asset-progress span");
  const burnReadout = document.querySelector(".incense-readout em");
  const burnReadoutBar = document.querySelector(".incense-readout b");
  const opening = document.getElementById("opening");
  const openingReveal = document.getElementById("opening-reveal");
  const openingRevealWindow = document.getElementById("opening-reveal-window");
  const openingGrid = document.querySelector(".opening__grid");
  const openingCopy = document.querySelector(".opening__copy");
  const openingCta = document.querySelector(".opening__cta");
  const openingScroll = document.querySelector(".opening__scroll");
  const hero = document.getElementById("hero");
  const story = document.getElementById("story");
  const storyCopy = document.getElementById("story-copy");
  const journey = document.getElementById("journey");
  const interlude = document.querySelector(".interlude");
  const finale = document.getElementById("finale");
  const footer = document.getElementById("contact");
  const heroScene = document.querySelector(".hero-scene");
  const heroImage = document.querySelector(".plane--back");
  const heroLeft = document.querySelector(".hero-foreground--left");
  const heroRight = document.querySelector(".hero-foreground--right");
  const heroTitleBack = document.querySelector(".hero-title-word--back");
  const heroTitleFront = document.querySelector(".hero-title-word--front");
  const finaleScene = document.querySelector(".finale-scene");
  const finaleScroll = document.querySelector(".finale-scroll");
  const finaleScrollSheet = document.querySelector(".finale-scroll__sheet");
  const finaleScrollRollers = [...document.querySelectorAll(".finale-scroll__roller")];
  const finaleScrollDetails = [...document.querySelectorAll(
    ".finale-scroll__mark, .finale-scroll__inscription, .finale-scroll__verse-en, .finale-seal",
  )];
  const finaleWords = [...document.querySelectorAll(".finale-word")];
  const finaleBackWord = document.querySelector(".finale-word--back");
  const finaleFrontWord = document.querySelector(".finale-word--front");
  const finaleCaptions = [...document.querySelectorAll(".finale-caption")];
  const finaleFireCanvas = null;
  const pageProgress = document.querySelector(".page-progress span");
  const passageFill = document.querySelector(".passage__line i");
  const passageLinks = [...document.querySelectorAll("[data-stage]")];
  const railLinks = [...document.querySelectorAll("[data-track]")];
  const chapters = [...document.querySelectorAll('[data-section="chapter"]')];
  const chapterVisuals = chapters.map((chapter) => chapter.querySelector(".chapter-visual"));
  const chapterLayers = chapterVisuals.map((visual) => ({
    visual,
    background: visual.querySelector(".arch-layer--bg"),
    middle: visual.querySelector(".arch-layer--mid"),
    front: visual.querySelector(".arch-layer--front"),
  }));

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let scrollYTarget = window.scrollY;
  let scrollYSmooth = scrollYTarget;
  let currentFrame = -1;
  let pointerX = 0;
  let pointerY = 0;
  let pointerXTarget = 0;
  let pointerYTarget = 0;
  let stageReady = false;
  let lastActiveId = "";
  let modalReturnFocus = null;
  let finaleFireSystem = null;
  let incenseSmokeSystem = null;
  let incenseBurn = 0;
  let lastBurnPercent = -1;
  let passageSequenceStarted = 0;
  let passageSequenceProgress = 0;
  let passageSequenceDone = false;
  let openingLit = false;
  let openingJourneyStarted = false;
  let audioController = null;
  let lastCenserOverlap = false;
  let lastCenserScroll = 0;
  let lastCenserBrushAt = 0;
  let lastPassageLitCount = 0;

  const frames = new Array(FRAME_COUNT);
  let loadedFrames = 0;
  let firstFrameReady = false;

  const framePath = (index) => `assets/frames/incense-${String(index).padStart(3, "0")}.webp`;

  function heroSectionProgress(scrollY) {
    return normalize(scrollY - hero.offsetTop, 0, viewportHeight * 0.9);
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const frameToDraw = currentFrame < 0 ? 0 : currentFrame;
    currentFrame = -1;
    drawFrame(frameToDraw);
  }

  function drawFrame(index) {
    const wrapped = ((index % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    const image = frames[wrapped];
    if (!image || !image.complete || !image.naturalWidth || wrapped === currentFrame) return;
    currentFrame = wrapped;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  function preloadFrames() {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = index < 8 ? "high" : "auto";
      image.onload = () => {
        loadedFrames += 1;
        progressLabel.textContent = `${loadedFrames} / ${FRAME_COUNT}`;
        if (!firstFrameReady) {
          firstFrameReady = true;
          stageReady = true;
          stage.classList.add("is-ready");
          sizeCanvas();
          drawFrame(0);
        }
        if (loadedFrames === FRAME_COUNT) {
          document.getElementById("asset-progress").classList.add("is-done");
          document.documentElement.classList.add("assets-ready");
        }
      };
      image.onerror = () => {
        loadedFrames += 1;
        progressLabel.textContent = `${loadedFrames} / ${FRAME_COUNT}`;
        if (loadedFrames === FRAME_COUNT) progressLabel.textContent = "部分帧载入失败";
      };
      image.src = framePath(index);
      frames[index] = image;
    }
  }

  function splitText(element) {
    const targets = element.children.length ? Array.from(element.children) : [element];
    let charIndex = 0;

    targets.forEach((target) => {
      if (target.querySelector(".char-mask")) return;
      const text = target.textContent;
      target.textContent = "";
      Array.from(text).forEach((character) => {
        if (/\s/.test(character)) {
          target.appendChild(document.createTextNode(character));
          return;
        }
        const mask = document.createElement("span");
        const characterElement = document.createElement("span");
        mask.className = "char-mask";
        characterElement.className = "char";
        characterElement.textContent = character;
        characterElement.style.setProperty("--char-index", String(charIndex));
        mask.appendChild(characterElement);
        target.appendChild(mask);
        charIndex += 1;
      });
    });
  }

  function splitFinaleText() {
    document.querySelectorAll("[data-finale-line]").forEach((line) => {
      if (line.querySelector(".finale-char")) return;
      const text = line.textContent;
      const isSecondLine = line.classList.contains("finale-word__line--2");
      line.textContent = "";
      Array.from(text).forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "finale-char";
        span.textContent = character;
        span.style.setProperty("--char-index", String(index + (isSecondLine ? 6 : 0)));
        line.appendChild(span);
      });
    });
  }

  function setupObservers() {
    document.querySelectorAll("[data-split]").forEach(splitText);

    const splitObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        splitObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

    document.querySelectorAll("[data-split]").forEach((element) => splitObserver.observe(element));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-inview", entry.isIntersecting));
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.06 });

    document.querySelectorAll("[data-reveal], .chapter-visual, .interlude, .site-footer").forEach((element) => {
      revealObserver.observe(element);
    });

    window.setTimeout(() => {
      document.querySelectorAll(".hero-title-word").forEach((title) => title.classList.add("is-inview"));
      document.querySelectorAll(".hero [data-reveal]").forEach((element, index) => {
        window.setTimeout(() => element.classList.add("is-inview"), 180 + index * 150);
      });
    }, 220);
  }

  function makeFlow() {
    if (!storyCopy) return;
    const segments = [];

    Array.from(storyCopy.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        segments.push({ text: node.textContent, latin: false });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        segments.push({
          text: node.textContent,
          latin: node.classList.contains("story-copy__en"),
        });
      }
    });

    storyCopy.textContent = "";
    const tokens = [];

    segments.forEach((segment, segmentIndex) => {
      const pattern = segment.latin
        ? /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:[.,!?;:…]+|[)"'”’\]}]+)*|[^\s]/gu
        : /[\p{Script=Han}](?:[，。！？；：、）》」』”’]+)?|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?|[^\s]/gu;
      const parts = segment.text.match(pattern) || [];
      parts.forEach((part, index) => {
        const element = document.createElement("span");
        element.className = `flow-token${segment.latin ? " is-latin" : ""}`;
        element.textContent = part;
        storyCopy.appendChild(element);
        tokens.push({
          element,
          width: 0,
          x: 0,
          y: 0,
          gapBefore: index > 0 && segment.latin && /[\p{L}\p{N}]/u.test(part),
          breakBefore: segmentIndex > 0 && index === 0,
        });
      });
    });

    const computed = getComputedStyle(storyCopy);
    const lineHeight = parseFloat(computed.lineHeight);
    const baseFontSize = parseFloat(computed.fontSize);
    const probe = document.createElement("span");
    probe.className = "flow-token";
    probe.textContent = "\u00a0";
    storyCopy.appendChild(probe);
    const spaceWidth = probe.getBoundingClientRect().width;
    probe.remove();
    const noLineStart = /^[，。！？；：、）》」』”’…,.!?;:）”’\]}]/u;

    let measured;

    const measure = () => {
      const width = storyCopy.clientWidth;
      tokens.forEach((token) => {
        token.width = token.element.getBoundingClientRect().width;
      });

      const lines = [];
      let line = { tokens: [], width: 0 };
      tokens.forEach((token) => {
        if (token.breakBefore && line.tokens.length) {
          lines.push(line);
          lines.push({ tokens: [], width: 0 });
          line = { tokens: [], width: 0 };
        }
        const gap = line.tokens.length && token.gapBefore ? spaceWidth : 0;
        const overflows = line.width + gap + token.width > width;
        const hangsPunctuation = noLineStart.test(token.element.textContent);
        if (overflows && line.tokens.length && !hangsPunctuation) {
          lines.push(line);
          line = { tokens: [], width: 0 };
        }
        const lineGap = line.tokens.length && token.gapBefore ? spaceWidth : 0;
        line.tokens.push({ token, gapBefore: lineGap });
        line.width += lineGap + token.width;
      });
      if (line.tokens.length) lines.push(line);

      lines.forEach((entry, lineIndex) => {
        let x = (width - entry.width) / 2;
        const y = lineIndex * lineHeight;
        entry.tokens.forEach(({ token, gapBefore }, tokenIndex) => {
          x += gapBefore;
          token.x = x;
          token.y = y;
          token.element.style.setProperty("--line-index", String(lineIndex));
          token.element.style.setProperty("--token-index", String(tokenIndex));
          token.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
          x += token.width;
        });
        entry.y = y;
      });

      storyCopy.style.height = `${Math.ceil(lines.length * lineHeight + baseFontSize * 0.4)}px`;
      measured = { lines, lineHeight };
    };

    const metricsForCanvas = () => {
      const copyRect = storyCopy.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.bottom < copyRect.top || canvasRect.top > copyRect.bottom) return null;
      return {
        centerX: canvasRect.left + canvasRect.width / 2 - copyRect.left,
        centerY: canvasRect.top + canvasRect.height / 2 - copyRect.top,
        radiusX: canvasRect.width * (viewportWidth <= 760 ? 0.42 : 0.46),
        radiusY: canvasRect.height * (viewportWidth <= 760 ? 0.5 : 0.56),
      };
    };

    const update = (metrics) => {
      if (!metrics || !measured) return;
      const { lines, lineHeight: lineSize } = measured;
      const margin = baseFontSize * 0.46;

      lines.forEach((line) => {
        const dy = Math.abs(line.y + lineSize / 2 - metrics.centerY);
        const halfGap = dy >= metrics.radiusY
          ? 0
          : Math.sqrt(1 - Math.pow(dy / metrics.radiusY, 2)) * metrics.radiusX + margin;
        const scatterDirection = line.y + lineSize / 2 < metrics.centerY ? -1 : 1;

        if (!halfGap) {
          line.tokens.forEach(({ token }) => {
            token.element.style.transform = `translate3d(${token.x.toFixed(2)}px, ${token.y.toFixed(2)}px, 0)`;
          });
          return;
        }

        const gapLeft = metrics.centerX - halfGap;
        const gapRight = metrics.centerX + halfGap;
        let splitIndex = line.tokens.findIndex(({ token }) => token.x + token.width / 2 >= metrics.centerX);
        if (splitIndex < 0) splitIndex = line.tokens.length;

        const left = line.tokens.slice(0, splitIndex);
        const right = line.tokens.slice(splitIndex);
        const leftEdge = left.length ? left[left.length - 1].token.x + left[left.length - 1].token.width : -Infinity;
        const rightEdge = right.length ? right[0].token.x : Infinity;
        const leftStart = left.length ? left[0].token.x : 0;
        const rightEnd = right.length ? right[right.length - 1].token.x + right[right.length - 1].token.width : 0;
        const shiftLeft = Math.min(Math.max(0, leftEdge - gapLeft), leftStart);
        const shiftRight = Math.min(Math.max(0, gapRight - rightEdge), storyCopy.clientWidth - rightEnd);

        line.tokens.forEach(({ token }, index) => {
          const shift = index < splitIndex ? -shiftLeft : shiftRight;
          const baseX = token.x + shift;
          const tokenCenterX = baseX + token.width / 2;
          const xInfluence = 1 - clamp(
            Math.abs(tokenCenterX - metrics.centerX) / (metrics.radiusX * 1.45),
            0,
            1,
          );
          const yInfluence = 1 - clamp(dy / metrics.radiusY, 0, 1);
          const proximity = Math.pow(smooth(xInfluence * yInfluence), 1.15);
          const side = tokenCenterX < metrics.centerX ? -1 : 1;
          const horizontalScatter =
            side * proximity * baseFontSize * (viewportWidth <= 760 ? 0.28 : 0.42);
          const verticalScatter =
            scatterDirection * proximity * baseFontSize * (viewportWidth <= 760 ? 0.46 : 0.68);
          const x = clamp(baseX + horizontalScatter, 0, Math.max(0, storyCopy.clientWidth - token.width));
          const rotation = side * proximity * (viewportWidth <= 760 ? 2.4 : 3.2);
          token.element.style.transform =
            `translate3d(${x.toFixed(2)}px, ${(token.y + verticalScatter).toFixed(2)}px, 0) ` +
            `rotate(${rotation.toFixed(2)}deg)`;
        });
      });
    };

    measure();
    update(metricsForCanvas());

    window.__storyFlow = {
      measure: () => {
        measure();
        update(metricsForCanvas());
      },
      update: () => update(metricsForCanvas()),
    };
  }

  function setupAtmosphere() {
    const atmosphereCanvas = document.getElementById("atmosphere");
    const atmosphereContext = atmosphereCanvas.getContext("2d");
    const smoke = Array.from({ length: 15 }, (_, index) => ({
      x: (index * 0.618) % 1,
      y: 0.1 + ((index * 0.37) % 0.8),
      size: 90 + (index % 4) * 42,
      speed: 0.0008 + (index % 5) * 0.00018,
      phase: index * 1.7,
    }));
    const sparks = Array.from({ length: 34 }, (_, index) => ({
      x: (index * 0.417 + 0.12) % 1,
      y: (index * 0.583) % 1,
      size: 0.55 + (index % 4) * 0.4,
      speed: 0.00009 + (index % 5) * 0.000025,
      drift: 0.01 + (index % 3) * 0.003,
      phase: index * 0.8,
    }));

    let smokeBoost = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      atmosphereCanvas.width = Math.round(window.innerWidth * dpr);
      atmosphereCanvas.height = Math.round(window.innerHeight * dpr);
      atmosphereContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(time) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      atmosphereContext.clearRect(0, 0, width, height);
      smokeBoost *= 0.982;

      if (!reducedMotion) {
        smoke.forEach((cloud) => {
          cloud.y -= cloud.speed * (1 + smokeBoost);
          if (cloud.y < -0.2) cloud.y = 1.2;
          const x =
            cloud.x * width +
            Math.sin(time * 0.00013 + cloud.phase) * 34 +
            pointerX * (18 + smokeBoost * 22);
          const y = cloud.y * height;
          const radius = cloud.size * (1 + smokeBoost * 0.32);
          const gradient = atmosphereContext.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(224, 205, 172, ${0.02 + smokeBoost * 0.018})`);
          gradient.addColorStop(0.45, "rgba(162, 112, 67, 0.01)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          atmosphereContext.fillStyle = gradient;
          atmosphereContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        });

        sparks.forEach((spark) => {
          spark.y -= spark.speed * (1 + smokeBoost);
          if (spark.y < -0.03) spark.y = 1.03;
          const x =
            spark.x * width +
            Math.sin(time * 0.00035 + spark.phase) * spark.drift * width +
            pointerX * 8;
          const y = spark.y * height;
          const alpha = 0.14 + (Math.sin(time * 0.001 + spark.phase) + 1) * 0.13 + smokeBoost * 0.32;
          atmosphereContext.fillStyle = `rgba(228, 123, 57, ${alpha.toFixed(3)})`;
          atmosphereContext.beginPath();
          atmosphereContext.arc(x, y, spark.size * (1 + smokeBoost), 0, Math.PI * 2);
          atmosphereContext.fill();
        });
      }

      requestAnimationFrame(draw);
    }

    resize();
    requestAnimationFrame(draw);
    return {
      resize,
      boost: () => {
        smokeBoost = Math.min(2.2, smokeBoost + 0.8);
      },
    };
  }

  function setupIncenseSmoke() {
    if (!smokeCanvas) return { resize: () => {} };
    let width = 1;
    let height = 1;
    let burnProgress = 0;
    const sources = [0.458, 0.503, 0.548];
    const puffs = [];
    const ribbons = Array.from({ length: 24 }, (_, index) => index);
    const nextEmit = [0, 0, 0];
    let previousTime = performance.now();
    const burnTipY = () => height * mix(0.105, 0.407, burnProgress);

    const sprite = document.createElement("canvas");
    sprite.width = 192;
    sprite.height = 192;
    const spriteContext = sprite.getContext("2d");
    for (let index = 0; index < 30; index += 1) {
      const angle = index * 2.399963;
      const distance = Math.sqrt((index + 1) / 30) * 62;
      const x = 96 + Math.cos(angle) * distance;
      const y = 96 + Math.sin(angle) * distance * 0.82;
      const radius = 18 + (index % 7) * 4.2;
      const gradient = spriteContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 253, 248, ${0.028 + (index % 4) * 0.006})`);
      gradient.addColorStop(0.42, `rgba(234, 226, 213, ${0.016 + (index % 3) * 0.004})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      spriteContext.fillStyle = gradient;
      spriteContext.beginPath();
      spriteContext.arc(x, y, radius, 0, Math.PI * 2);
      spriteContext.fill();
    }

    function makePuff(sourceIndex, initial = false) {
      const life = 3.6 + Math.random() * 3.8;
      const age = initial ? Math.random() * life : 0;
      const source = sources[sourceIndex];
      return {
        sourceIndex,
        age,
        life,
        phase: Math.random() * Math.PI * 2,
        pulse: 0.0007 + Math.random() * 0.0011,
        x: width * source + (Math.random() - 0.5) * width * 0.012,
        y: burnTipY() + (Math.random() - 0.5) * height * 0.014 - height * 0.025 * age,
        vx: (Math.random() - 0.5) * width * 0.0035,
        vy: -height * (0.025 + Math.random() * 0.018),
        drift: width * (0.012 + Math.random() * 0.028),
        curl: width * (0.0035 + Math.random() * 0.0075),
        size: width * (0.01 + Math.random() * 0.014),
        growth: 2.7 + Math.random() * 3.4,
        rotation: (Math.random() - 0.5) * 1.7,
        spin: (Math.random() - 0.5) * 0.16,
        stretch: 0.82 + Math.random() * 0.85,
        alpha: 0.17 + Math.random() * 0.13,
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, smokeCanvas.clientWidth);
      height = Math.max(1, smokeCanvas.clientHeight);
      smokeCanvas.width = Math.round(width * dpr);
      smokeCanvas.height = Math.round(height * dpr);
      smokeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      puffs.length = 0;
      sources.forEach((source, sourceIndex) => {
        for (let index = 0; index < 24; index += 1) {
          puffs.push(makePuff(sourceIndex, true));
        }
      });
    }

    function draw(time) {
      const delta = reducedMotion ? 0 : Math.min(0.04, (time - previousTime) / 1000);
      previousTime = time;
      smokeContext.clearRect(0, 0, width, height);
      smokeContext.globalCompositeOperation = "screen";

      if (!reducedMotion) {
        sources.forEach((source, sourceIndex) => {
          if (time >= nextEmit[sourceIndex]) {
            puffs.push(makePuff(sourceIndex));
            nextEmit[sourceIndex] = time + 52 + Math.random() * 46;
          }
        });
      }

      // A soft, widening core gives the plume continuity without drawing rigid lines.
      ribbons.forEach((ribbonIndex) => {
        const stickIndex = ribbonIndex % sources.length;
        const strand = Math.floor(ribbonIndex / sources.length);
        const source = sources[stickIndex];
        const phase = time * (0.00019 + strand * 0.000031) + stickIndex * 1.73 + strand * 0.91;
        const direction = ribbonIndex % 2 === 0 ? 1 : -1;
        const startX = width * source;
        const startY = burnTipY();
        const rise = height * (0.2 + strand * 0.012);
        const points = 18;

        for (let point = 0; point < points; point += 1) {
          const t = point / (points - 1);
          const envelope = Math.pow(t, 1.35);
          const wave =
            Math.sin(phase + t * 4.8 + strand * 0.8) *
            width *
            (0.007 + t * 0.033) *
            direction;
          const curl =
            Math.cos(phase * 0.63 + t * 7.2) *
            width *
            0.015 *
            Math.pow(t, 1.8);
          const wind = width * 0.105 * Math.pow(t, 2.2);
          const x = startX + wave + curl + wind + pointerX * width * 0.012 * t;
          const y = startY - rise * envelope;
          const size = width * (0.0045 + t * 0.031) * (1 + strand * 0.12);
          const alpha = (0.105 - t * 0.052) * (0.7 + (strand % 2) * 0.24);
          smokeContext.globalAlpha = clamp(alpha, 0, 1);
          smokeContext.drawImage(sprite, x - size, y - size * 1.18, size * 2, size * 2.36);
        }
      });

      for (let index = puffs.length - 1; index >= 0; index -= 1) {
        const puff = puffs[index];
        if (!reducedMotion) {
          puff.age += delta;
          const ratio = puff.age / puff.life;
          const turbulence =
            Math.sin(puff.age * 2.4 + puff.phase) * 0.65 +
            Math.sin(puff.age * 0.82 + puff.phase * 1.7) * 0.35;
          puff.x +=
            (puff.vx +
              puff.drift * (0.18 + ratio * 1.55) +
              turbulence * puff.curl +
              pointerX * width * 0.008 * ratio) *
            delta;
          puff.y += puff.vy * (1 - ratio * 0.36) * delta;
          puff.rotation += puff.spin * delta;
        }
        if (puff.age >= puff.life) {
          puffs.splice(index, 1);
          continue;
        }

        const ratio = puff.age / puff.life;
        const breathe = 1 + Math.sin(puff.age * 1.35 + puff.phase) * 0.08;
        const size = puff.size * (1 + ratio * ratio * puff.growth) * breathe;
        const alpha = puff.alpha * Math.pow(1 - ratio, 1.35) * smooth(Math.min(1, ratio * 7 + 0.18));
        smokeContext.globalAlpha = clamp(alpha, 0, 1);
        smokeContext.save();
        smokeContext.translate(puff.x, puff.y);
        smokeContext.rotate(puff.rotation + Math.sin(puff.age * 0.72 + puff.phase) * 0.23);
        smokeContext.drawImage(
          sprite,
          -size * puff.stretch,
          -size * 1.18,
          size * 2 * puff.stretch,
          size * 2.36,
        );
        smokeContext.restore();
      }

      // The visible ember sits on the moving burn line, so the smoke has a credible source.
      const tipY = burnTipY();
      sources.forEach((source, sourceIndex) => {
        const flicker =
          0.88 +
          Math.sin(time * 0.006 + sourceIndex * 2.1) * 0.08 +
          Math.sin(time * 0.013 + sourceIndex) * 0.04;
        const x = width * source + Math.sin(time * 0.0017 + sourceIndex) * width * 0.0015;
        const radius = width * 0.012 * flicker;
        const glow = smokeContext.createRadialGradient(x, tipY, 0, x, tipY, radius);
        glow.addColorStop(0, `rgba(255, 246, 207, ${0.72 * (1 - burnProgress * 0.35)})`);
        glow.addColorStop(0.17, `rgba(255, 124, 55, ${0.56 * (1 - burnProgress * 0.3)})`);
        glow.addColorStop(0.55, "rgba(212, 60, 24, 0.18)");
        glow.addColorStop(1, "rgba(212, 60, 24, 0)");
        smokeContext.fillStyle = glow;
        smokeContext.beginPath();
        smokeContext.arc(x, tipY, radius, 0, Math.PI * 2);
        smokeContext.fill();
        smokeContext.fillStyle = `rgba(255, 238, 187, ${0.82 * (1 - burnProgress * 0.28)})`;
        smokeContext.beginPath();
        smokeContext.arc(x, tipY - radius * 0.16, Math.max(0.75, width * 0.0014), 0, Math.PI * 2);
        smokeContext.fill();
      });

      smokeContext.globalAlpha = 1;
      smokeContext.globalCompositeOperation = "source-over";
      if (!reducedMotion) requestAnimationFrame(draw);
    }

    resize();
    requestAnimationFrame(draw);
    return {
      resize,
      setBurn: (value) => {
        burnProgress = clamp(value, 0, 1);
        if (reducedMotion) draw(performance.now());
      },
    };
  }

  function setupFinaleFire() {
    if (!finaleFireCanvas) {
      return { resize: () => {}, setProgress: () => {} };
    }
    const fireContext = finaleFireCanvas.getContext("2d");
    let width = 1;
    let height = 1;
    let progress = 0;
    let lastTime = performance.now();

    const flameCount = 54;
    const emberCount = 28;
    const particles = Array.from({ length: flameCount + emberCount }, (_, index) => ({
      kind: index < flameCount ? "flame" : "ember",
      phase: Math.random() * Math.PI * 2,
      ...spawnParticle(index < flameCount ? "flame" : "ember", true),
    }));

    function spawnParticle(kind, initial = false) {
      const isEmber = kind === "ember";
      const maxLife = isEmber ? 1.8 + Math.random() * 2.8 : 0.65 + Math.random() * 1.25;
      return {
        x: width * (0.46 + Math.random() * 0.08) + (Math.random() - 0.5) * width * (isEmber ? 0.18 : 0.12),
        y: height * (0.51 + Math.random() * 0.05),
        vx: (Math.random() - 0.5) * width * (isEmber ? 0.035 : 0.02),
        vy: -height * (isEmber ? 0.04 + Math.random() * 0.08 : 0.055 + Math.random() * 0.07),
        life: initial ? Math.random() * maxLife : 0,
        maxLife,
        size: isEmber
          ? 0.7 + Math.random() * 2.1
          : height * (0.008 + Math.random() * 0.022),
      };
    }

    function reset(particle, initial = false) {
      Object.assign(particle, spawnParticle(particle.kind, initial));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, finaleFireCanvas.clientWidth);
      height = Math.max(1, finaleFireCanvas.clientHeight);
      finaleFireCanvas.width = Math.round(width * dpr);
      finaleFireCanvas.height = Math.round(height * dpr);
      fireContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.forEach((particle) => reset(particle, true));
    }

    function draw(time) {
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      fireContext.clearRect(0, 0, width, height);
      finaleScene.style.setProperty("--fire-glow", (progress * 0.98).toFixed(3));

      if (progress > 0.015) {
        fireContext.globalCompositeOperation = "lighter";
        const pulse = 0.92 + Math.sin(time * 0.014) * 0.05 + Math.sin(time * 0.031) * 0.03;
        const coreX = width * 0.5;
        const coreY = height * 0.49;
        const coreRadius = Math.min(width, height) * 0.17 * pulse;
        const core = fireContext.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius);
        core.addColorStop(0, `rgba(255, 226, 137, ${(0.28 * progress).toFixed(3)})`);
        core.addColorStop(0.28, `rgba(255, 117, 23, ${(0.32 * progress).toFixed(3)})`);
        core.addColorStop(0.72, `rgba(172, 29, 5, ${(0.14 * progress).toFixed(3)})`);
        core.addColorStop(1, "rgba(0, 0, 0, 0)");
        fireContext.fillStyle = core;
        fireContext.beginPath();
        fireContext.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
        fireContext.fill();

        particles.forEach((particle) => {
          if (!reducedMotion) {
            particle.life += delta;
            if (particle.life >= particle.maxLife) reset(particle);
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
          }

          const ratio = clamp(particle.life / particle.maxLife, 0, 1);
          const sway = Math.sin(time * 0.0022 + particle.phase) * (particle.kind === "ember" ? 8 : 4) * ratio;
          const x = particle.x + sway;
          const y = particle.y;

          if (particle.kind === "ember") {
            const alpha = (1 - ratio) * progress * 1.25;
            fireContext.fillStyle = `rgba(255, ${150 + Math.round((1 - ratio) * 85)}, 76, ${alpha.toFixed(3)})`;
            fireContext.beginPath();
            fireContext.arc(x, y, particle.size, 0, Math.PI * 2);
            fireContext.fill();
            return;
          }

          const radius = particle.size * (0.78 + (1 - ratio) * 1.18);
          const gradient = fireContext.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(255, 235, 164, ${(0.34 * progress * (1 - ratio)).toFixed(3)})`);
          gradient.addColorStop(0.36, `rgba(255, 134, 38, ${(0.28 * progress * (1 - ratio)).toFixed(3)})`);
          gradient.addColorStop(0.72, `rgba(207, 35, 10, ${(0.17 * progress * (1 - ratio)).toFixed(3)})`);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          fireContext.fillStyle = gradient;
          fireContext.beginPath();
          fireContext.arc(x, y, radius, 0, Math.PI * 2);
          fireContext.fill();
        });
      }

      requestAnimationFrame(draw);
    }

    resize();
    requestAnimationFrame(draw);
    return {
      resize,
      setProgress: (value) => {
        progress = clamp(value, 0, 1);
      },
    };
  }

  function activeChapterData() {
    let active = null;
    let best = 0;
    chapterVisuals.forEach((visual, index) => {
      const rect = visual.getBoundingClientRect();
      if (rect.bottom < -viewportHeight * 0.3 || rect.top > viewportHeight * 1.3) return;
      const centerY = rect.top + rect.height * 0.46;
      const influence = 1 - clamp(Math.abs(centerY - viewportHeight * 0.51) / (viewportHeight * 0.72), 0, 1);
      if (influence > best) {
        best = influence;
        active = { index, visual, rect, influence: smooth(influence) };
      }
    });
    return active;
  }

  function chapterStageRoute() {
    if (!chapterVisuals.length) return null;
    const visible = chapterVisuals.some((visual) => {
      const rect = visual.getBoundingClientRect();
      return rect.bottom > -viewportHeight * 1.15 && rect.top < viewportHeight * 2.1;
    });
    if (!visible) return null;

    const points = chapterVisuals.map((visual, index) => {
      const rect = visual.getBoundingClientRect();
      return {
        index,
        pageY: rect.top + scrollYSmooth + rect.height * 0.5,
        screenY: rect.top + rect.height * 0.5,
        x: rect.left + rect.width * 0.5 - viewportWidth * 0.5,
        distance: Math.abs(rect.top + rect.height * 0.5 - viewportHeight * 0.51),
      };
    });
    const probe = scrollYSmooth + viewportHeight * 0.51;
    let from = points[0];
    let to = points[0];
    let travel = 0;

    if (probe >= points[points.length - 1].pageY) {
      from = points[points.length - 1];
      to = from;
    } else {
      for (let index = 0; index < points.length - 1; index += 1) {
        if (probe >= points[index].pageY && probe <= points[index + 1].pageY) {
          from = points[index];
          to = points[index + 1];
          travel = smooth(normalize(probe, from.pageY, to.pageY));
          break;
        }
      }
    }

    const nearestDistance = Math.min(...points.map((point) => point.distance));
    const dock = smooth(1 - clamp(nearestDistance / (viewportHeight * 0.34), 0, 1));
    return {
      x: mix(from.x, to.x, travel),
      y: mix(from.screenY - viewportHeight * 0.51, to.screenY - viewportHeight * 0.51, travel),
      dock,
    };
  }

  function updateStage(scrollY) {
    if (!stageReady) return;

    const heroProgress = heroSectionProgress(scrollY);
    const heroRect = hero.getBoundingClientRect();
    const openingRect = opening.getBoundingClientRect();
    const openingInfluence = normalize(openingRect.bottom, 0, viewportHeight * 0.9);
    stage.classList.toggle(
      "is-hero",
      heroRect.top < viewportHeight * 0.56 && heroRect.bottom > viewportHeight * 0.44
    );
    const storyRect = story.getBoundingClientRect();
    const storyInfluence = clamp(
      Math.min(
        normalize(viewportHeight * 0.88 - storyRect.top, 0, viewportHeight * 0.7),
        normalize(storyRect.bottom + viewportHeight * 0.2, 0, viewportHeight * 0.9)
      ),
      0,
      1
    );
    const journeyRect = journey.getBoundingClientRect();
    const journeyInfluence = clamp(
      Math.min(
        normalize(viewportHeight * 0.88 - journeyRect.top, 0, viewportHeight * 0.7),
        normalize(journeyRect.bottom + viewportHeight * 0.18, 0, viewportHeight * 0.85)
      ),
      0,
      1
    );
    const chapterData = activeChapterData();
    const chapterInfluence = chapterData?.influence || 0;
    const chapterRoute = chapterStageRoute();
    const interludeRect = interlude.getBoundingClientRect();
    const interludeInfluence = clamp(
      Math.min(
        normalize(viewportHeight * 0.88 - interludeRect.top, 0, viewportHeight * 0.52),
        normalize(interludeRect.bottom + viewportHeight * 0.18, 0, viewportHeight * 0.7)
      ),
      0,
      1
    );
    const finaleRect = finale.getBoundingClientRect();
    const finaleInfluence = normalize(viewportHeight * 1.18 - finaleRect.top, 0, viewportHeight * 0.72);
    const finaleProgress = normalize(-finaleRect.top, 0, Math.max(1, finale.offsetHeight - viewportHeight));
    const footerProgress = normalize(
      scrollY,
      document.documentElement.scrollHeight - viewportHeight * 1.6,
      document.documentElement.scrollHeight - viewportHeight
    );

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const burnStart = viewportHeight * 0.035;
    incenseBurn = smooth(normalize(scrollY, burnStart, maxScroll));
    if (scrollYTarget >= maxScroll - 2) incenseBurn = 1;
    const burnFront = mix(9, 40.7, incenseBurn);
    canvas.style.setProperty("--burn-front", `${burnFront.toFixed(2)}%`);
    incenseSmokeSystem?.setBurn(incenseBurn);
    stage.classList.toggle("is-burning", incenseBurn > 0.04);
    stage.classList.toggle("is-spent", incenseBurn > 0.94);

    const burnPercent = Math.round(incenseBurn * 100);
    if (burnPercent !== lastBurnPercent) {
      lastBurnPercent = burnPercent;
      if (burnReadout) burnReadout.textContent = String(burnPercent).padStart(2, "0");
      if (burnReadoutBar) burnReadoutBar.style.transform = `scaleX(${incenseBurn.toFixed(3)})`;
    }

    const heroThrowEnd = normalize(scrollY - hero.offsetTop, 0, viewportHeight * 1.5);
    const throwOut = smooth(normalize(heroThrowEnd, 0, 0.3));
    const throwReturn = smooth(normalize(heroThrowEnd, 0.3, 0.68));
    let scale = mix(0.5, 1, throwOut);
    scale = mix(scale, 0.5, throwReturn);
    const storyBreath = Math.sin(storyInfluence * Math.PI) * (viewportWidth <= 760 ? 0.022 : 0.035);
    const storyScale = (viewportWidth <= 760 ? 0.46 : 0.5) + storyBreath;
    scale = mix(scale, storyScale, storyInfluence * (1 - chapterInfluence));
    scale = mix(scale, viewportWidth <= 760 ? 0.24 : 0.25, smooth(journeyInfluence) * (1 - chapterInfluence));
    if (chapterRoute) {
      scale = mix(viewportWidth <= 760 ? 0.46 : 0.56, viewportWidth <= 760 ? 0.3 : 0.36, chapterRoute.dock);
    }
    scale = mix(scale, 0.5, finaleInfluence * (1 - footerProgress));

    let targetX = 0;
    let targetY =
      viewportHeight * 0.055 * storyInfluence -
      viewportHeight * 0.18 * smooth(journeyInfluence) * (1 - chapterInfluence);
    if (chapterRoute) {
      targetX = chapterRoute.x;
      targetY = chapterRoute.y;
    }

    const finaleScaleBoost = Math.sin(clamp(finaleInfluence, 0, 1) * Math.PI) * 0.065;
    const stageRotation =
      -0.5 * heroProgress +
      0.9 * storyInfluence * (1 - chapterInfluence) -
      0.45 * smooth(journeyInfluence);
    const opacity =
      (1 - smooth(openingInfluence) * 0.995) *
      (1 - smooth(footerProgress) * 0.96) *
      (1 - smooth(journeyInfluence) * 0.78) *
      (1 - smooth(interludeInfluence) * 0.975) *
      (1 - smooth(finaleInfluence) * 0.985);

    stageInner.style.transform =
      `translate3d(${(targetX + pointerX * 12).toFixed(2)}px, ${(targetY + pointerY * 8).toFixed(2)}px, 0) ` +
      `rotate(${stageRotation.toFixed(3)}deg) ` +
      `scale(${(scale + finaleScaleBoost).toFixed(4)})`;
    stage.style.opacity = opacity.toFixed(3);

    drawFrame(Math.floor(heroProgress * 22 + Math.max(0, scrollY - hero.offsetTop) * 0.034));
  }

  function updateScenes() {
    const scrollY = scrollYSmooth;
    const heroProgress = heroSectionProgress(scrollY);
    heroScene.style.opacity = String(1 - smooth(heroProgress) * 0.94);
    heroImage.style.transform =
      `translate3d(0, ${(heroProgress * viewportHeight * 0.035).toFixed(2)}px, 0) ` +
      `scale(${(1.06 + heroProgress * 0.055).toFixed(4)})`;
    const travel = smooth(heroProgress) * viewportWidth * 0.18;
    heroLeft.style.transform =
      `translate3d(${(-travel).toFixed(2)}px, ${(heroProgress * viewportHeight * 0.08).toFixed(2)}px, 0) scale(1.04)`;
    heroRight.style.transform =
      `translate3d(${travel.toFixed(2)}px, ${(heroProgress * viewportHeight * 0.1).toFixed(2)}px, 0) scale(1.04)`;
    if (heroTitleBack) {
      heroTitleBack.style.transform =
        `translate3d(-50%, -50%, 0) translate3d(${(-heroProgress * viewportWidth * 0.018).toFixed(2)}px, ${(heroProgress * viewportHeight * 0.028).toFixed(2)}px, 0)`;
    }
    if (heroTitleFront) {
      heroTitleFront.style.transform =
        `translate3d(-50%, -50%, 0) translate3d(${(heroProgress * viewportWidth * 0.026).toFixed(2)}px, ${(-heroProgress * viewportHeight * 0.018).toFixed(2)}px, 0)`;
    }

    chapterLayers.forEach(({ visual, background, middle, front }) => {
      const rect = visual.getBoundingClientRect();
      if (rect.bottom < -viewportHeight || rect.top > viewportHeight * 2) return;
      const progress = normalize(viewportHeight * 0.92 - rect.top, 0, viewportHeight * 1.05);
      middle.style.transform = `translate3d(0, ${mix(4.2, -4.0, progress).toFixed(2)}%, 0)`;
      front.style.transform = `translate3d(0, ${mix(9.2, -8.2, progress).toFixed(2)}%, 0)`;
      background.style.transform = `scale(${mix(1.04, 1.115, progress).toFixed(4)})`;
    });

    const finaleProgress = normalize(
      scrollY - finale.offsetTop,
      0,
      Math.max(1, finale.offsetHeight - viewportHeight),
    );
    finale.dataset.timelineProgress = finaleProgress.toFixed(4);
    const scrollEnter = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.01, 0.1));
    const unroll = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.04, 0.43));
    const zoom = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.08, 0.56));
    const paperWidth = mix(1.2, 100, unroll);
    const scrollScale = reducedMotion ? 1 : mix(0.3, 1, zoom);
    const scrollExit = reducedMotion ? 0 : smooth(normalize(finaleProgress, 0.94, 1));
    const scrollOpacity = scrollEnter * (1 - scrollExit * 0.82);
    const titleReveal = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.55, 0.76));
    const captionReveal = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.77, 0.94));
    const detailReveal = reducedMotion ? 1 : smooth(normalize(finaleProgress, 0.49, 0.72));

    finaleScrollSheet.style.width = `${paperWidth.toFixed(3)}%`;
    finaleScrollRollers[0].style.left = `${(50 - paperWidth * 0.5).toFixed(3)}%`;
    finaleScrollRollers[1].style.left = `${(50 + paperWidth * 0.5).toFixed(3)}%`;
    finaleScroll.style.opacity = scrollOpacity.toFixed(3);
    finaleScroll.style.transform =
      `translate3d(-50%, calc(-50% + ${mix(viewportHeight * 0.1, 0, zoom).toFixed(2)}px), 0) ` +
      `scale(${scrollScale.toFixed(4)}) rotate(${mix(-1.1, 0, unroll).toFixed(3)}deg)`;
    finaleScene.style.setProperty("--scroll-open", unroll.toFixed(3));

    finaleBackWord.classList.remove("is-revealed");
    finaleFrontWord.classList.toggle("is-revealed", titleReveal > 0.2);
    finaleWords.forEach((word) => {
      word.style.opacity = titleReveal.toFixed(3);
    });
    finaleScrollDetails.forEach((detail, index) => {
      const reveal = smooth(normalize(detailReveal, index * 0.08, 0.76 + index * 0.08));
      detail.style.opacity = reveal.toFixed(3);
      detail.style.transform = `translate3d(0, ${mix(12, 0, reveal).toFixed(2)}px, 0)`;
    });
    finaleCaptions.forEach((caption, index) => {
      const reveal = smooth(normalize(captionReveal, index * 0.12, 0.78 + index * 0.12));
      caption.style.opacity = (reveal * 0.74).toFixed(3);
      caption.style.transform = `translate3d(0, ${mix(10, 0, reveal).toFixed(2)}px, 0)`;
    });

    window.__storyFlow?.update();
  }

  function updateOpening() {
    if (!opening) return;
    const rect = opening.getBoundingClientRect();
    const progress = normalize(-rect.top, 0, Math.max(1, opening.offsetHeight));
    const leave = smooth(normalize(progress, 0.52, 1));
    const base = opening.querySelector(".opening__base");
    const arcs = opening.querySelector(".opening__arcs");

    openingCopy.style.transform = `translate3d(0, ${(-progress * viewportHeight * 0.08).toFixed(2)}px, 0)`;
    openingCopy.style.opacity = (1 - leave * 0.52).toFixed(3);
    openingReveal.style.transform =
      `translate3d(0, ${(progress * viewportHeight * 0.035).toFixed(2)}px, 0) scale(${(1.025 + progress * 0.035).toFixed(4)})`;
    if (base) base.style.transform = `translate3d(0, ${(progress * viewportHeight * 0.018).toFixed(2)}px, 0) scale(1.025)`;
    if (arcs) arcs.style.opacity = String((1 - leave * 0.72) * 0.95);

    document.body.classList.toggle("is-opening-active", rect.bottom > viewportHeight * 0.52);
  }

  function updateStoryReadState() {
    if (!storyCopy) return;
    const rect = storyCopy.getBoundingClientRect();
    const reading = rect.top < viewportHeight * 1.05 && rect.bottom > -viewportHeight * 0.2;
    storyCopy.classList.toggle("is-reading", reading);
  }

  function currentSectionId() {
    const sections = [opening, hero, story, journey, ...chapters, finale, footer];
    const probe = viewportHeight * 0.48;
    let current = "opening";
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= probe && rect.bottom > probe) current = section.id;
    });
    return current;
  }

  function updateNavigation() {
    const current = currentSectionId();
    audioController?.setMode(
      ["chapter-sendoff", "finale", "footer"].includes(current) ? "climax" : "main"
    );
    if (current !== lastActiveId) {
      const previous = lastActiveId;
      lastActiveId = current;
      if (previous && current.startsWith("chapter-")) {
        audioController?.playSfx("gong-deep", { volume: 0.18, rate: 0.96 });
      } else if (previous && (current === "finale" || current === "footer")) {
        audioController?.playSfx("bell-clear", { volume: 0.2 });
      } else if (previous && current === "journey") {
        audioController?.playSfx("wood-tick", { volume: 0.13, rate: 0.92 });
      }
      railLinks.forEach((link) => {
        const active =
          link.dataset.track === current ||
          (link.dataset.track === "opening" && current === "hero");
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      passageLinks.forEach((link) => {
        const active = link.dataset.stage === current;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }

    const passageRect = journey.getBoundingClientRect();
    if (passageSequenceDone && (passageRect.top > viewportHeight * 1.12 || passageRect.bottom < -viewportHeight * 0.12)) {
      passageSequenceStarted = 0;
      passageSequenceProgress = 0;
      passageSequenceDone = false;
      lastPassageLitCount = 0;
      passageLinks.forEach((link) => link.classList.remove("is-lit"));
    }

    const sequenceVisible =
      passageRect.top < viewportHeight * 0.76 &&
      passageRect.bottom > viewportHeight * 0.24;
    if (sequenceVisible && !passageSequenceStarted) {
      passageSequenceStarted = performance.now();
      lastPassageLitCount = 0;
      passageLinks.forEach((link) => link.classList.remove("is-lit"));
    }

    let sequenceLineProgress = 0;
    if (passageSequenceStarted) {
      passageSequenceProgress = clamp((performance.now() - passageSequenceStarted) / 1950, 0, 1);
      const thresholds = [0.03, 0.23, 0.43, 0.63, 0.83];
      let litCount = 0;
      passageLinks.forEach((link, index) => {
        const lit = passageSequenceProgress >= thresholds[index];
        link.classList.toggle("is-lit", lit);
        link.style.setProperty("--node-order", String(index));
        if (lit) litCount += 1;
      });
      if (litCount > lastPassageLitCount) {
        audioController?.playSfx("wood-tick", {
          volume: 0.085 + litCount * 0.008,
          rate: 0.92 + litCount * 0.035,
        });
      }
      lastPassageLitCount = litCount;
      if (passageSequenceProgress >= 1) passageSequenceDone = true;
      sequenceLineProgress = smooth(passageSequenceProgress);
    }

    let completed = 0;
    chapters.forEach((chapter) => {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= viewportHeight * 0.55) completed += 1;
    });
    const chapterData = activeChapterData();
    const base = chapterData
      ? (chapterData.index + normalize(viewportHeight * 0.7 - chapterData.rect.top, 0, viewportHeight)) / chapters.length
      : Math.max(0, completed - 1) / chapters.length;
    const finaleBoost = current === "finale" || current === footer ? 1 : 0;
    const passageProgress = passageSequenceDone
      ? 1
      : passageSequenceStarted
        ? sequenceLineProgress
        : Math.max(base, finaleBoost);
    passageFill.style.setProperty("--passage-progress", `${Math.round(clamp(passageProgress, 0, 1) * 100)}%`);
  }

  function setupOpening() {
    if (!opening || !openingReveal || !openingRevealWindow || !openingCta) return;

    let targetX = viewportWidth * 0.67;
    let targetY = viewportHeight * 0.48;
    let currentX = targetX;
    let currentY = targetY;
    let lastMaskX = Number.NaN;
    let lastMaskY = Number.NaN;
    let pointerTracked = false;

    opening.classList.add("is-reveal-ready");
    if (!reducedMotion) {
      openingReveal.play().catch(() => undefined);
    }

    const setMask = () => {
      if (openingLit) {
        openingRevealWindow.style.setProperty("clip-path", "inset(0)");
        openingRevealWindow.style.setProperty("-webkit-clip-path", "inset(0)");
        openingRevealWindow.style.setProperty("mask-image", "none");
        openingRevealWindow.style.setProperty("-webkit-mask-image", "none");
        return;
      }
      const radius = clamp(viewportWidth * 0.195, 205, 340);
      const maskPosition = `${currentX.toFixed(1)}px ${currentY.toFixed(1)}px`;
      const clip = `circle(${radius.toFixed(1)}px at ${maskPosition})`;
      const mask =
        `radial-gradient(circle ${radius.toFixed(1)}px at ${currentX.toFixed(1)}px ${currentY.toFixed(1)}px, ` +
        "rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,.75) 60%, " +
        "rgba(0,0,0,.4) 75%, rgba(0,0,0,.12) 88%, rgba(0,0,0,0) 100%)";
      openingRevealWindow.style.setProperty("clip-path", clip);
      openingRevealWindow.style.setProperty("-webkit-clip-path", clip);
      openingRevealWindow.style.setProperty("mask-image", mask);
      openingRevealWindow.style.setProperty("-webkit-mask-image", mask);
    };

    setMask();

    const trackPointer = (event) => {
      if (openingLit) return;
      if (event.pointerType === "touch") {
        opening.classList.add("is-touch", "has-pointer");
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!pointerTracked) {
        pointerTracked = true;
        currentX = targetX;
        currentY = targetY;
        lastMaskX = currentX;
        lastMaskY = currentY;
        setMask();
      }
      opening.classList.add("has-pointer");
    };

    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("mousemove", trackPointer, { passive: true });

    window.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") opening.classList.add("is-touch", "has-pointer");
    }, { passive: true });

    document.documentElement.addEventListener("pointerleave", () => {
      targetX = viewportWidth * 0.67;
      targetY = viewportHeight * 0.48;
    });

    const moveMask = () => {
      currentX = mix(currentX, targetX, reducedMotion ? 1 : 0.1);
      currentY = mix(currentY, targetY, reducedMotion ? 1 : 0.1);
      const gridX = (targetX / Math.max(1, viewportWidth) - 0.5) * 16;
      const gridY = (targetY / Math.max(1, viewportHeight) - 0.5) * 16;
      openingGrid.style.transform = `translate3d(${gridX.toFixed(2)}px, ${gridY.toFixed(2)}px, 0)`;

      if (
        Math.abs(currentX - lastMaskX) > 0.08 ||
        Math.abs(currentY - lastMaskY) > 0.08
      ) {
        setMask();
        lastMaskX = currentX;
        lastMaskY = currentY;
      }
      requestAnimationFrame(moveMask);
    };
    requestAnimationFrame(moveMask);

    const startJourney = () => {
      audioController?.playSfx("ignite-whoosh", { volume: 0.5 });
      if (!openingLit) {
        openingLit = true;
        opening.classList.add("is-lit");
        openingCta.setAttribute("aria-pressed", "true");
        openingCta.querySelector("span").textContent = "灯火已明";
        openingRevealWindow.style.setProperty("clip-path", "inset(0)");
        openingRevealWindow.style.setProperty("-webkit-clip-path", "inset(0)");
        openingRevealWindow.style.setProperty("mask-image", "none");
        openingRevealWindow.style.setProperty("-webkit-mask-image", "none");
        if (!reducedMotion) {
          window.setTimeout(() => {
            if (!openingJourneyStarted) {
              openingJourneyStarted = true;
              scrollToScreen("hero");
            }
          }, 900);
        }
        return;
      }
      openingJourneyStarted = true;
      scrollToScreen("hero");
    };

    openingCta.addEventListener("click", startJourney);
    openingScroll?.addEventListener("click", () => {
      audioController?.playSfx("paper-touch", { volume: 0.32 });
      openingLit = true;
      opening.classList.add("is-lit");
      openingJourneyStarted = true;
      scrollToScreen("hero");
    });

    openingReveal.addEventListener("canplay", () => {
      if (!reducedMotion) openingReveal.play().catch(() => undefined);
    });
  }

  function setupPointer() {
    const aura = document.querySelector(".cursor-aura");
    let auraX = viewportWidth / 2;
    let auraY = viewportHeight / 2;
    let targetX = auraX;
    let targetY = auraY;
    let visible = false;

    const interactiveSelector = "a, button, textarea, .chapter-visual";

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pointerXTarget = event.clientX / viewportWidth - 0.5;
      pointerYTarget = event.clientY / viewportHeight - 0.5;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        visible = true;
        aura.style.opacity = "1";
      }
      const eventTarget = event.target instanceof Element ? event.target : null;
      aura.classList.toggle("is-hovering", Boolean(eventTarget?.closest(interactiveSelector)));

      const visual = eventTarget?.closest(".chapter-visual");
      if (visual) {
        const rect = visual.getBoundingClientRect();
        const localX = (event.clientX - rect.left) / rect.width - 0.5;
        const localY = (event.clientY - rect.top) / rect.height - 0.5;
        visual.style.setProperty("--tilt-x", `${(localX * 4.5).toFixed(2)}deg`);
        visual.style.setProperty("--tilt-y", `${(-localY * 3.8).toFixed(2)}deg`);
      }
    }, { passive: true });

    window.addEventListener("pointerleave", () => {
      visible = false;
      aura.style.opacity = "0";
    });

    document.querySelectorAll(".chapter-visual").forEach((visual) => {
      visual.addEventListener("pointerenter", () => {
        audioController?.playSfx("paper-touch", { volume: 0.13, rate: 0.94 });
      });
      visual.addEventListener("pointerleave", () => {
        visual.style.setProperty("--tilt-x", "0deg");
        visual.style.setProperty("--tilt-y", "0deg");
      });
    });

    function drawAura() {
      auraX = mix(auraX, targetX, 0.13);
      auraY = mix(auraY, targetY, 0.13);
      aura.style.transform = `translate3d(${(auraX - 95).toFixed(2)}px, ${(auraY - 95).toFixed(2)}px, 0)`;
      requestAnimationFrame(drawAura);
    }
    requestAnimationFrame(drawAura);
  }

  function setupPrayerModal(atmosphere) {
    const modal = document.getElementById("vow-modal");
    const trigger = document.querySelector(".prayer-trigger");
    const closeButton = modal.querySelector(".vow-modal__close");
    const form = modal.querySelector(".vow-form");
    const input = modal.querySelector("#vow-input");
    const count = modal.querySelector("#vow-count");
    const result = modal.querySelector(".vow-modal__result");
    const embers = modal.querySelector(".vow-embers");
    const messages = [
      "愿已随香火升起，潮声会记得。",
      "向海的心愿，将循着风回来。",
      "香灰落定，愿仍在远航。",
    ];
    let messageIndex = 0;

    const open = () => {
      modalReturnFocus = document.activeElement;
      audioController?.playSfx("gong-deep", { volume: 0.24, rate: 0.93 });
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      window.setTimeout(() => input.focus(), 320);
    };

    const close = () => {
      audioController?.playSfx("paper-touch", { volume: 0.22, rate: 0.9 });
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (modalReturnFocus instanceof HTMLElement) modalReturnFocus.focus();
    };

    const createEmbers = (amount = 22) => {
      embers.textContent = "";
      for (let index = 0; index < amount; index += 1) {
        const ember = document.createElement("span");
        ember.style.setProperty("--x", `${8 + Math.random() * 84}%`);
        ember.style.setProperty("--size", `${1 + Math.random() * 3.6}px`);
        ember.style.setProperty("--duration", `${3.4 + Math.random() * 3.8}s`);
        ember.style.setProperty("--delay", `${Math.random() * 0.85}s`);
        ember.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
        embers.appendChild(ember);
      }
    };

    trigger.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) close();
    });

    input.addEventListener("input", () => {
      count.textContent = String(input.value.length);
      result.classList.remove("is-visible");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const vow = input.value.trim();
      if (!vow) {
        input.focus();
        input.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(5px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 260, easing: "ease-out" },
        );
        return;
      }

      try {
        window.localStorage.setItem("shunfeng-huaji-vow", JSON.stringify({
          text: vow,
          savedAt: new Date().toISOString(),
        }));
      } catch {
        // Local storage is optional.
      }

      result.textContent = messages[messageIndex % messages.length];
      messageIndex += 1;
      result.classList.add("is-visible");
      createEmbers();
      audioController?.playSfx("vow-bell", { volume: 0.32 });
      atmosphere.boost();
    });
  }

  function setupSound() {
    const mainAudio = document.getElementById("site-audio");
    const climaxAudio = document.getElementById("site-audio-climax");
    const toggle = document.querySelector(".sound-toggle");
    const label = toggle.querySelector(".sound-copy b");
    const detail = toggle.querySelector(".sound-copy small");
    let playing = false;
    let musicFadeFrame = 0;
    let activeMode = "main";
    let activeAudio = mainAudio;
    let lastSfx = "";
    let sfxCount = 0;
    const sfxSources = {
      "censer-brush": "assets/audio/censer-brush.wav",
      "paper-touch": "assets/audio/paper-touch.wav",
      "gong-deep": "assets/audio/gong-deep.wav",
      "wood-tick": "assets/audio/wood-tick.wav",
      "bell-clear": "assets/audio/bell-clear.wav",
      "ignite-whoosh": "assets/audio/ignite-whoosh.wav",
      "vow-bell": "assets/audio/vow-bell.wav",
    };
    const sfxPools = {};

    Object.entries(sfxSources).forEach(([name, source]) => {
      const poolSize = name === "censer-brush" ? 4 : 3;
      sfxPools[name] = Array.from({ length: poolSize }, () => {
        const effect = new Audio(source);
        effect.preload = "auto";
        effect.setAttribute("aria-hidden", "true");
        effect.dataset.sfx = name;
        return effect;
      });
    });

    function targetVolume() {
      return viewportWidth <= 760 ? 0.34 : 0.46;
    }

    function trackForMode(mode) {
      return mode === "climax" ? climaxAudio : mainAudio;
    }

    function musicDescription() {
      if (!playing) return "WAR DRUMS · CLICK TO HEAR";
      return activeMode === "climax"
        ? "CLASH DEFIANT · WAR HORNS"
        : "MOUNTAIN EMPEROR · WAR DRUMS";
    }

    function setInterface(state) {
      playing = state;
      toggle.classList.toggle("is-playing", state);
      toggle.setAttribute("aria-pressed", String(state));
      toggle.setAttribute("aria-label", state ? "关闭气势仪式声景" : "开启气势仪式声景");
      label.textContent = state ? "关闭声景" : "开启声景";
      detail.textContent = musicDescription();
      document.body.classList.toggle("is-sound-on", state);
      if (!state) {
        Object.values(sfxPools).flat().forEach((effect) => effect.pause());
      }
    }

    function playSfx(name, options = {}) {
      if (!playing) return false;
      const pool = sfxPools[name];
      if (!pool?.length) return false;
      const effect =
        pool.find((candidate) => candidate.paused || candidate.ended) ||
        pool.reduce((oldest, candidate) =>
          Number(oldest.dataset.startedAt || 0) <= Number(candidate.dataset.startedAt || 0)
            ? oldest
            : candidate
        );
      try {
        effect.pause();
        effect.currentTime = 0;
        effect.volume = clamp(options.volume ?? 0.24, 0, 1);
        effect.playbackRate = clamp(options.rate ?? 1, 0.72, 1.32);
        effect.dataset.startedAt = String(performance.now());
        lastSfx = name;
        sfxCount += 1;
        effect.play().catch(() => undefined);
        return true;
      } catch {
        return false;
      }
    }

    function fadeMusic(target, duration, onComplete) {
      cancelAnimationFrame(musicFadeFrame);
      const startVolumes = [mainAudio.volume, climaxAudio.volume];
      const start = performance.now();

      function step(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        mainAudio.volume = clamp(mix(startVolumes[0], target, eased), 0, 1);
        climaxAudio.volume = clamp(mix(startVolumes[1], target, eased), 0, 1);
        if (progress < 1) {
          musicFadeFrame = requestAnimationFrame(step);
        } else {
          onComplete?.();
        }
      }

      musicFadeFrame = requestAnimationFrame(step);
    }

    function crossfadeTo(mode) {
      const nextAudio = trackForMode(mode);
      if (nextAudio === activeAudio) return;
      cancelAnimationFrame(musicFadeFrame);
      const previousAudio = activeAudio;
      const level = targetVolume();
      const start = performance.now();

      activeAudio = nextAudio;
      nextAudio.volume = 0;
      nextAudio.play().catch(() => undefined);

      function step(now) {
        const progress = clamp((now - start) / 1450, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        previousAudio.volume = clamp(level * (1 - eased), 0, 1);
        nextAudio.volume = clamp(level * eased, 0, 1);
        if (progress < 1) {
          musicFadeFrame = requestAnimationFrame(step);
        } else {
          previousAudio.pause();
        }
      }

      musicFadeFrame = requestAnimationFrame(step);
    }

    function setMode(mode) {
      const nextMode = mode === "climax" ? "climax" : "main";
      if (nextMode === activeMode) return;
      activeMode = nextMode;
      document.body.dataset.musicMode = activeMode;
      detail.textContent = musicDescription();
      if (playing) crossfadeTo(activeMode);
    }

    toggle.addEventListener("click", async () => {
      if (!playing) {
        toggle.disabled = true;
        mainAudio.pause();
        climaxAudio.pause();
        const startAudio = trackForMode(activeMode);
        mainAudio.volume = 0;
        climaxAudio.volume = 0;
        try {
          await startAudio.play();
          activeAudio = startAudio;
          setInterface(true);
          fadeMusic(targetVolume(), 1100);
          playSfx("wood-tick", { volume: 0.16, rate: 1.08 });
        } catch {
          setInterface(false);
          detail.textContent = "暂时无法播放";
        } finally {
          toggle.disabled = false;
        }
      } else {
        setInterface(false);
        fadeMusic(0, 520, () => {
          mainAudio.pause();
          climaxAudio.pause();
          setInterface(false);
        });
      }
    });

    [mainAudio, climaxAudio].forEach((track) => track.addEventListener("error", () => {
      detail.textContent = "声音载入失败";
      toggle.disabled = true;
    }));

    audioController = {
      playSfx,
      setMode,
      get playing() {
        return playing;
      },
    };

    window.__shunfengAudio = {
      play: (name, options) => playSfx(name, options),
      get playing() {
        return playing;
      },
      get lastSfx() {
        return lastSfx;
      },
      get sfxCount() {
        return sfxCount;
      },
      get backgroundTime() {
        return activeAudio.currentTime;
      },
      get mode() {
        return activeMode;
      },
      get tracks() {
        return [mainAudio, climaxAudio].map((track) => ({
          src: track.currentSrc,
          paused: track.paused,
          volume: Number(track.volume.toFixed(3)),
          currentTime: Number(track.currentTime.toFixed(2)),
          duration: Number.isFinite(track.duration) ? Number(track.duration.toFixed(2)) : 0,
          readyState: track.readyState,
        }));
      },
      get sfxStates() {
        return Object.entries(sfxPools).flatMap(([name, pool]) =>
          pool.map((effect) => ({
            name,
            duration: Number.isFinite(effect.duration) ? Number(effect.duration.toFixed(2)) : 0,
            readyState: effect.readyState,
            paused: effect.paused,
          }))
        );
      },
    };

    document.body.dataset.musicMode = activeMode;
    setInterface(false);
  }

  function scrollToScreen(screen) {
    const map = {
      opening,
      hero,
      story,
      journey,
      finale,
      footer,
    };
    chapters.forEach((chapter) => {
      map[chapter.id] = chapter;
    });
    const target = map[screen];
    if (!target) return;
    const offset = viewportHeight * (screen === "opening" ? 0 : screen === "story" ? 0.35 : 0.18);
    window.scrollTo({ top: target.offsetTop + offset, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function setupInteractionAudio() {
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const navigationLink = target?.closest('a[href^="#"]');
      if (!navigationLink) return;
      audioController?.playSfx("wood-tick", {
        volume: navigationLink.closest(".chapter-rail") ? 0.1 : 0.13,
        rate: navigationLink.closest(".passage__track") ? 0.9 : 1.02,
      });
    });
  }

  function updateAudioInteractions() {
    if (!storyCopy || !canvas) return;
    const copyRect = storyCopy.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.left + canvasRect.width * 0.5;
    const centerY = canvasRect.top + canvasRect.height * 0.5;
    const overlaps =
      centerX > copyRect.left &&
      centerX < copyRect.right &&
      centerY > copyRect.top &&
      centerY < copyRect.bottom;
    const now = performance.now();

    if (!overlaps) {
      lastCenserOverlap = false;
      lastCenserScroll = scrollYSmooth;
      return;
    }

    const movement = Math.abs(scrollYSmooth - lastCenserScroll);
    const crossedText = !lastCenserOverlap || movement >= 28;
    if (crossedText && now - lastCenserBrushAt >= 520) {
      audioController?.playSfx("censer-brush", {
        volume: clamp(0.14 + movement / 420, 0.14, 0.3),
        rate: clamp(0.92 + movement / 1150, 0.92, 1.12),
      });
      lastCenserBrushAt = now;
      lastCenserScroll = scrollYSmooth;
    }
    lastCenserOverlap = true;
  }

  function animate() {
    scrollYTarget = window.scrollY;
    scrollYSmooth = reducedMotion ? scrollYTarget : mix(scrollYSmooth, scrollYTarget, 0.15);
    pointerX = mix(pointerX, pointerXTarget, 0.055);
    pointerY = mix(pointerY, pointerYTarget, 0.055);

    updateStage(scrollYSmooth);
    updateScenes();
    updateOpening();
    updateStoryReadState();
    updateNavigation();
    updateAudioInteractions();
    pageProgress.style.width = `${(scrollYTarget / Math.max(1, document.documentElement.scrollHeight - viewportHeight) * 100).toFixed(3)}%`;

    requestAnimationFrame(animate);
  }

  function handleResize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    sizeCanvas();
    window.__storyFlow?.measure();
  }

  async function init() {
    splitFinaleText();
    setupObservers();
    preloadFrames();
    sizeCanvas();
    setupOpening();
    setupPointer();
    const atmosphere = setupAtmosphere();
    incenseSmokeSystem = setupIncenseSmoke();
    finaleFireSystem = setupFinaleFire();
    setupPrayerModal(atmosphere);
    setupSound();
    setupInteractionAudio();

    if (document.fonts?.ready) await document.fonts.ready;
    makeFlow();
    handleResize();

    window.addEventListener("resize", () => {
      handleResize();
      atmosphere.resize();
      incenseSmokeSystem?.resize();
      finaleFireSystem?.resize();
    }, { passive: true });

    const requestedScreen = new URLSearchParams(window.location.search).get("screen");
    if (requestedScreen) {
      window.setTimeout(() => scrollToScreen(requestedScreen), 650);
    }

    window.__shunfengDemo = {
      scrollToScreen,
      frameCount: FRAME_COUNT,
      openPrayer: () => document.querySelector(".prayer-trigger").click(),
      get currentFrame() { return currentFrame; },
    };

    requestAnimationFrame(animate);
  }

  init();
})();
