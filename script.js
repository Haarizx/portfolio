(() => {
  const root = document.documentElement;
  const body = document.body;
  const revealSections = [...document.querySelectorAll(".reveal")];
  const parallaxNodes = [...document.querySelectorAll("[data-depth], [data-scroll-depth]")];
  const contactSection = document.getElementById("conversation");
  const dustCanvas = document.getElementById("dust-canvas");
  const themeButtons = [...document.querySelectorAll("[data-theme-option]")];
  const linkedProjectCards = [...document.querySelectorAll(".project-card[data-card-link]")];

  const THEME_STORAGE_KEY = "haarizx-theme";
  const VALID_THEMES = ["dark-luxury", "ivory-luxe", "ocean-noir"];
  const DEFAULT_THEME = "dark-luxury";

  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let dustResizeHandler = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const isValidTheme = (theme) => VALID_THEMES.includes(theme);

  const readStoredTheme = () => {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!value || !isValidTheme(value)) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures and keep in-session behavior.
    }
  };

  const updateThemeControls = (activeTheme) => {
    themeButtons.forEach((button) => {
      const isActive = button.dataset.themeOption === activeTheme;
      button.setAttribute("aria-checked", String(isActive));
      button.classList.toggle("is-active", isActive);
    });
  };

  const applyTheme = (theme, persist = false) => {
    const safeTheme = isValidTheme(theme) ? theme : DEFAULT_THEME;
    body.dataset.theme = safeTheme;
    root.style.colorScheme = safeTheme === "ivory-luxe" ? "light" : "dark";
    updateThemeControls(safeTheme);

    if (persist) {
      writeStoredTheme(safeTheme);
    }
  };

  const initializeTheme = () => {
    const storedTheme = readStoredTheme();
    applyTheme(storedTheme || DEFAULT_THEME, false);
  };

  const setupThemeControls = () => {
    if (!themeButtons.length) {
      return;
    }

    themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedTheme = button.dataset.themeOption;
        if (!isValidTheme(selectedTheme)) {
          return;
        }
        applyTheme(selectedTheme, true);
      });
    });
  };

  const setupProjectCardLinks = () => {
    if (!linkedProjectCards.length) {
      return;
    }

    const navigateFromCard = (card) => {
      const href = card.dataset.cardLink;
      if (!href) {
        return;
      }
      window.location.href = href;
    };

    linkedProjectCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) {
          return;
        }
        navigateFromCard(card);
      });

      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        navigateFromCard(card);
      });
    });
  };

  const setupStagger = () => {
    revealSections.forEach((section) => {
      const items = [...section.querySelectorAll(".reveal-item")];
      items.forEach((item, index) => {
        item.style.setProperty("--delay", `${index * 95}ms`);
      });
    });
  };

  const setupRevealObserver = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -12% 0px",
      }
    );

    revealSections.forEach((section) => observer.observe(section));
  };

  const setupContactObserver = () => {
    if (!contactSection) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
            body.classList.add("in-contact");
          } else {
            body.classList.remove("in-contact");
          }
        });
      },
      {
        threshold: [0.2, 0.35, 0.6],
      }
    );

    observer.observe(contactSection);
  };

  const setupPointerTracking = () => {
    window.addEventListener(
      "pointermove",
      (event) => {
        const normalizedX = event.clientX / viewportWidth - 0.5;
        const normalizedY = event.clientY / viewportHeight - 0.5;
        pointerTargetX = clamp(normalizedX, -0.5, 0.5);
        pointerTargetY = clamp(normalizedY, -0.5, 0.5);

        root.style.setProperty("--mouse-x", `${(pointerTargetX + 0.5) * 100}%`);
        root.style.setProperty("--mouse-y", `${(pointerTargetY + 0.5) * 100}%`);
      },
      { passive: true }
    );
  };

  const animateParallax = () => {
    pointerX += (pointerTargetX - pointerX) * 0.07;
    pointerY += (pointerTargetY - pointerY) * 0.07;
    const scrollY = window.scrollY;

    parallaxNodes.forEach((node) => {
      const depth = Number.parseFloat(node.dataset.depth || "0");
      const scrollDepth = Number.parseFloat(node.dataset.scrollDepth || "0");
      const px = pointerX * depth * 92;
      const py = pointerY * depth * 92;
      const sy = -scrollY * scrollDepth;

      node.style.setProperty("--px", `${px.toFixed(2)}px`);
      node.style.setProperty("--py", `${py.toFixed(2)}px`);
      node.style.setProperty("--sy", `${sy.toFixed(2)}px`);
    });

    window.requestAnimationFrame(animateParallax);
  };

  const setupDust = () => {
    if (!dustCanvas) {
      return null;
    }

    const context = dustCanvas.getContext("2d");
    if (!context) {
      return null;
    }

    const particles = [];
    let dpr = window.devicePixelRatio || 1;
    let dustWidth = viewportWidth;
    let dustHeight = viewportHeight;

    const particleCount = () =>
      clamp(Math.round((dustWidth * dustHeight) / 17000), 70, 190);

    const makeParticle = () => ({
      x: Math.random() * dustWidth,
      y: Math.random() * dustHeight,
      radius: Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.35 + 0.08,
      speedX: (Math.random() - 0.5) * 0.12,
      speedY: (Math.random() - 0.5) * 0.12,
      tint: Math.random() > 0.7 ? "cyan" : "gold",
      drift: Math.random() * 0.5 + 0.2,
    });

    const repopulate = () => {
      particles.length = 0;
      const count = particleCount();
      for (let i = 0; i < count; i += 1) {
        particles.push(makeParticle());
      }
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      dustWidth = viewportWidth;
      dustHeight = viewportHeight;
      dustCanvas.width = Math.floor(dustWidth * dpr);
      dustCanvas.height = Math.floor(dustHeight * dpr);
      dustCanvas.style.width = `${dustWidth}px`;
      dustCanvas.style.height = `${dustHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      repopulate();
    };

    const draw = () => {
      context.clearRect(0, 0, dustWidth, dustHeight);

      particles.forEach((particle) => {
        particle.x += particle.speedX + pointerX * particle.drift * 0.18;
        particle.y += particle.speedY + pointerY * particle.drift * 0.18;

        if (particle.x < -6) particle.x = dustWidth + 6;
        if (particle.x > dustWidth + 6) particle.x = -6;
        if (particle.y < -6) particle.y = dustHeight + 6;
        if (particle.y > dustHeight + 6) particle.y = -6;

        if (particle.tint === "cyan") {
          context.fillStyle = `rgba(78, 196, 207, ${particle.alpha})`;
        } else {
          context.fillStyle = `rgba(216, 173, 115, ${particle.alpha})`;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    return resize;
  };

  const onResize = () => {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    if (typeof dustResizeHandler === "function") {
      dustResizeHandler();
    }
  };

  initializeTheme();
  setupThemeControls();
  setupProjectCardLinks();
  setupStagger();
  setupRevealObserver();
  setupContactObserver();
  setupPointerTracking();
  dustResizeHandler = setupDust();
  window.requestAnimationFrame(animateParallax);
  window.addEventListener("resize", onResize, { passive: true });
})();
