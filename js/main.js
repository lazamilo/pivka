/* Pivka — interaction + motion layer */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------- Ticker: fill so it loops with no gaps at any width ---------- */
  const tTrack = $('.ticker__track');
  const tSource = $('.ticker__group', tTrack).cloneNode(true);
  function buildTicker() {
    const group = tSource.cloneNode(true);
    tTrack.replaceChildren(group);
    while (group.scrollWidth < innerWidth) [...tSource.children].forEach(c => group.append(c.cloneNode(true)));
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    tTrack.append(copy);
    tTrack.style.animationDuration = (group.scrollWidth / 70) + 's';
  }
  buildTicker();
  document.fonts.ready.then(buildTicker);
  addEventListener('resize', buildTicker);

  /* ---------- Split text ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    text.split(/(\s+)/).forEach(chunk => {
      if (/^\s+$/.test(chunk)) { el.append(' '); return; }
      const w = document.createElement('span');
      w.className = 'word'; w.setAttribute('aria-hidden', 'true');
      [...chunk].forEach(c => { const s = document.createElement('span'); s.className = 'char'; s.textContent = c; w.append(s); });
      el.append(w);
    });
    return $$('.char', el);
  }
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
    return $$('.word', el);
  }

  const heroChars = $$('.hero__title .split, .hero__title .split-i').flatMap(splitChars);
  gsap.set(heroChars, { yPercent: 110 });
  gsap.set('.hero__foot', { autoAlpha: 0, y: 20 });

  /* ---------- Loader ---------- */
  const num = $('.loader__num');
  const counter = { v: 0 };
  let loaded = false;
  document.fonts.ready.then(() => { loaded = true; });
  const loadTl = gsap.timeline();
  loadTl.to(counter, {
    v: 82, duration: reduce ? .2 : 1.6, ease: 'power2.inOut',
    onUpdate: () => { num.textContent = Math.round(counter.v); gsap.set('.loader__fill', { attr: { y: 150 - counter.v * 1.5 } }); }
  });
  function finishLoader() {
    gsap.timeline({ onComplete: () => { document.body.classList.remove('is-loading'); lenis && lenis.start(); ScrollTrigger.refresh(); } })
      .to(counter, {
        v: 100, duration: .5, ease: 'power2.out',
        onUpdate: () => { num.textContent = Math.round(counter.v); gsap.set('.loader__fill', { attr: { y: 150 - counter.v * 1.5 } }); }
      })
      .add(() => window.PivkaGL.startIntro())
      .to('.loader__egg', { scale: 1.25, duration: .35, ease: 'power2.in' })
      .to('.loader__egg', { scale: 0, rotate: 20, duration: .45, ease: 'back.in(2)' })
      .to('.loader__count, .loader__line', { yPercent: -60, autoAlpha: 0, duration: .5, ease: 'power3.in' }, '<')
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.2')
      .set('.loader', { display: 'none' })
      .to(heroChars, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: { each: .022 } }, '-=.6')
      .to('.hero__foot', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .1 }, '-=1');
  }
  const waitLoad = () => (loaded || performance.now() > 3500) ? finishLoader() : setTimeout(waitLoad, 100);
  loadTl.eventCallback('onComplete', waitLoad);

  /* ---------- Hero scroll-away ---------- */
  gsap.to('.hero__title', {
    yPercent: -18, opacity: 0.15, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- GL themes per section ---------- */
  const sunsetAt = $('.journey');
  $$('[data-theme]').forEach(sec => {
    const afterSunset = sec === sunsetAt || !!(sunsetAt.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING);
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => self.isActive && window.PivkaGL.setTheme(sec.dataset.theme, afterSunset)
    });
  });

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  const menu = $('.menu');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 60);
      nav.classList.toggle('is-hidden', y > 400 && y > lastY && !menu.classList.contains('is-open'));
      lastY = y;
    }
  });

  /* ---------- Menu ---------- */
  const burger = $('.nav__burger');
  const menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 60px) 70px)', duration: 1, ease: 'expo.inOut' })
    .from('.menu__primary a', { yPercent: 110, duration: .9, ease: 'expo.out', stagger: .06 }, '-=.45')
    .from('.menu__cols > div', { y: 30, autoAlpha: 0, duration: .8, ease: 'expo.out', stagger: .08 }, '-=.7');
  function toggleMenu(open) {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    nav.style.color = open ? 'var(--ink)' : '';
    $('.nav__logo img').style.filter = open ? 'brightness(0)' : '';
    if (open) { menuTl.timeScale(1).play(); lenis && lenis.stop(); }
    else { menuTl.timeScale(1.6).reverse(); lenis && lenis.start(); }
  }
  burger.addEventListener('click', () => toggleMenu(!menu.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) toggleMenu(false); });

  /* ---------- Cursor ---------- */
  const cursor = $('.cursor');
  const ring = $('.cursor__ring'), dot = $('.cursor__dot'), label = $('.cursor__label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', e => {
    pos.x = e.clientX; pos.y = e.clientY;
    window.PivkaGL.setMouse((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  }, { passive: true });
  if (fine) {
    const rx = gsap.quickTo(ring, 'x', { duration: .5, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: .5, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: .1 });
    const dy = gsap.quickTo(dot, 'y', { duration: .1 });
    gsap.ticker.add(() => { rx(pos.x); ry(pos.y); dx(pos.x); dy(pos.y); });
    document.addEventListener('pointerover', e => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, input');
      cursor.classList.toggle('is-label', !!lab);
      label.textContent = lab ? lab.dataset.cursor : '';
      cursor.classList.toggle('is-hover', !!link && !lab);
    });
  }

  /* ---------- Magnetic ---------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .3);
        yTo((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Manifesto word scrub ---------- */
  const mWords = splitWords($('[data-words]'));
  if (!reduce) {
    gsap.to(mWords, {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'center 40%', scrub: true }
    });
  }
  gsap.from('.manifesto .btn', { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.manifesto .btn', start: 'top 90%' } });

  /* ---------- Journey horizontal ---------- */
  const track = $('.journey__track');
  const dist = () => track.scrollWidth - innerWidth;
  const jTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.journey', start: 'top top', end: () => '+=' + dist(),
      pin: '.journey__pin', scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
    }
  });
  jTl.to(track, { x: () => -dist(), ease: 'none' }, 0)
     .to('.journey__progress i', { scaleX: 1, ease: 'none' }, 0);
  $$('.stop').forEach(stop => {
    gsap.from(stop.querySelectorAll('.stop__icon, h2, p, img, .btn'), {
      y: 60, autoAlpha: 0, stagger: .08, ease: 'expo.out', duration: 1,
      scrollTrigger: { trigger: stop, containerAnimation: jTl, start: 'left 85%' }
    });
    const icon = stop.querySelector('.stop__icon');
    if (!icon) return;
    gsap.fromTo(icon, { rotate: -25 }, {
      rotate: 25, ease: 'none',
      scrollTrigger: { trigger: stop, containerAnimation: jTl, start: 'left right', end: 'right left', scrub: true }
    });
  });

  /* ---------- Fresh ---------- */
  gsap.fromTo('.fresh__img img', { yPercent: -12 }, {
    yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.fresh', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.fresh__copy > *', {
    y: 50, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.fresh__copy', start: 'top 75%' }
  });

  /* ---------- Big type reveals ---------- */
  $$('.big-type, .recipes h2, .news h2').forEach(h => {
    gsap.from(h, { yPercent: 30, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  /* ---------- Product rail (drag + inertia + tilt) ---------- */
  const rail = $('.rail'), rTrack = $('.rail__track'), bar = $('.rail__bar i');
  let rx = 0, rTarget = 0, dragging = false, startX = 0, startT = 0, moved = 0, vel = 0, lastPX = 0;
  const maxX = () => Math.max(0, rTrack.scrollWidth - innerWidth);
  const clamp = v => Math.min(0, Math.max(-maxX(), v));
  rail.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; startX = e.clientX; startT = rTarget; lastPX = e.clientX; vel = 0;
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', e => {
    if (!dragging) return;
    const d = e.clientX - startX; moved = Math.max(moved, Math.abs(d));
    vel = e.clientX - lastPX; lastPX = e.clientX;
    rTarget = clamp(startT + d * 1.2);
  });
  const endDrag = () => { if (!dragging) return; dragging = false; rTarget = clamp(rTarget + vel * 14); };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  // gentle scroll-linked drift so the rail moves even without dragging
  let scrollDrift = 0;
  ScrollTrigger.create({
    trigger: '.products', start: 'top bottom', end: 'bottom top',
    onUpdate: self => { scrollDrift = -self.progress * Math.min(maxX(), innerWidth * .35); }
  });
  gsap.ticker.add(() => {
    const goal = clamp(rTarget + scrollDrift);
    rx += (goal - rx) * .085;
    rTrack.style.transform = `translate3d(${rx}px,0,0)`;
    const m = maxX(); const p = m ? -rx / m : 0;
    bar.style.transform = `translateX(${p * 300}%)`;
  });
  if (fine && !reduce) {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, { rotateY: x * 12, rotateX: -y * 12, transformPerspective: 900, duration: .6, ease: 'power3' });
      });
      card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
    });
  }

  /* ---------- Stories (pinned slideshow) ---------- */
  // Warm the campaign images up front so none pops in mid-scroll.
  $$('.story img').forEach(img => { img.decode && img.decode().catch(() => {}); });
  gsap.fromTo('.story.is-active img', { scale: 1.4 }, {
    scale: 1.15, ease: 'none',
    scrollTrigger: { trigger: '.stories', start: 'top bottom', end: 'top top', scrub: true }
  });
  const stories = $$('.story'), titles = $$('.stitle');
  let active = 0;
  function showStory(i) {
    if (i === active) return;
    const dir = i > active ? 1 : -1;
    const from = stories[active], to = stories[i];
    gsap.set(stories, { zIndex: 0 }); gsap.set(from, { zIndex: 1 }); gsap.set(to, { zIndex: 2 });
    gsap.fromTo(to, { clipPath: dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 1.2, ease: 'expo.inOut' });
    gsap.fromTo(to.querySelector('img'), { scale: 1.35 }, { scale: 1.15, duration: 1.6, ease: 'expo.out' });
    stories.forEach((s, k) => s.classList.toggle('is-active', k === i));
    const outT = titles[active], inT = titles[i];
    gsap.to(outT, { autoAlpha: 0, y: -40 * dir, duration: .5, ease: 'power3.in', onComplete: () => outT.classList.remove('is-active') });
    inT.classList.add('is-active');
    gsap.fromTo(inT.children, { y: 60 * dir, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: .07, delay: .3 });
    gsap.set(inT, { autoAlpha: 1, y: 0 });
    active = i;
  }
  gsap.set(titles.slice(1), { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: '.stories', start: 'top top', end: '+=' + (stories.length * 80) + '%',
    pin: '.stories__pin', anticipatePin: 1,
    onUpdate: self => showStory(Math.min(stories.length - 1, Math.floor(self.progress * stories.length * .999)))
  });

  /* ---------- Marquee velocity ---------- */
  const rows = $$('.marquee__row');
  const mPos = rows.map(() => 0);
  let velocity = 0;
  if (lenis) lenis.on('scroll', e => { velocity = e.velocity; });
  gsap.ticker.add(() => {
    rows.forEach((row, i) => {
      const half = row.scrollWidth / 2;
      const dir = i % 2 ? 1 : -1;
      mPos[i] += dir * (reduce ? 0 : (1.1 + Math.abs(velocity) * .35));
      if (mPos[i] <= -half) mPos[i] += half;
      if (mPos[i] >= 0) mPos[i] -= half;
      row.style.transform = `translate3d(${mPos[i]}px,0,0) skewX(${gsap.utils.clamp(-10, 10, -velocity * .4)}deg)`;
    });
    velocity *= .92;
  });

  /* ---------- Recipe peek ---------- */
  const peek = $('.peek'), peekImg = $('img', peek);
  if (fine) {
    const px = gsap.quickTo(peek, 'x', { duration: .7, ease: 'power3' });
    const py = gsap.quickTo(peek, 'y', { duration: .7, ease: 'power3' });
    const pr = gsap.quickTo(peek, 'rotation', { duration: .9, ease: 'power3' });
    let lastX = 0;
    gsap.ticker.add(() => { px(pos.x); py(pos.y); pr(gsap.utils.clamp(-12, 12, (pos.x - lastX) * .4)); lastX = pos.x; });
    let peekItem = null;
    const showPeek = item => {
      if (item === peekItem) return;
      peekItem = item;
      if (item) {
        peekImg.src = item.dataset.img;
        gsap.to(peek, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: .7, ease: 'expo.out', overwrite: true });
        gsap.fromTo(peekImg, { scale: 1.4 }, { scale: 1.05, duration: 1, ease: 'expo.out' });
      } else {
        gsap.to(peek, { clipPath: 'inset(50% 50% 50% 50% round 14px)', duration: .5, ease: 'expo.in', overwrite: true });
      }
    };
    $$('.ritem').forEach(item => {
      item.dataset.cursor = 'Recept';
      item.addEventListener('pointerenter', () => showPeek(item));
      item.addEventListener('pointerleave', () => showPeek(null));
    });
    // Scrolling moves content under a still pointer without firing pointerleave,
    // so re-check what's under the cursor on every scroll.
    const syncUnderPointer = () => {
      const el = document.elementFromPoint(pos.x, pos.y);
      showPeek(el ? el.closest('.ritem') : null);
      const lab = el && el.closest('[data-cursor]');
      cursor.classList.toggle('is-label', !!lab);
      label.textContent = lab ? lab.dataset.cursor : '';
    };
    lenis ? lenis.on('scroll', syncUnderPointer) : addEventListener('scroll', syncUnderPointer, { passive: true });
  }
  gsap.from('.rlist li', { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.rlist', start: 'top 80%' } });

  /* ---------- Social + footer ---------- */
  gsap.from('.connect__social a', { yPercent: 100, duration: 1, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '.connect__social ul', start: 'top 80%' } });
  gsap.from('.foot__word span', {
    yPercent: 100, rotate: () => gsap.utils.random(-12, 12), duration: 1.4, ease: 'expo.out', stagger: .07,
    scrollTrigger: { trigger: '.foot__word', start: 'top 95%' }
  });
  $('.foot__top').addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 2.2 }) : scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- Newsletter ---------- */
  const form = $('.news'), msg = $('.news__msg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.email;
    if (!input.value || !input.checkValidity()) {
      msg.textContent = 'Prosimo, vpiši veljaven e-poštni naslov.';
      gsap.fromTo('.news__field', { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1,.3)' });
      return;
    }
    msg.textContent = 'Hvala! Kmalu prejmeš prve navdihe za Pivka momente.';
    input.value = '';
    gsap.fromTo(msg, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, ease: 'expo.out' });
  });

  /* ---------- Anchor links inside page via Lenis ---------- */
  addEventListener('resize', () => ScrollTrigger.refresh());
})();
