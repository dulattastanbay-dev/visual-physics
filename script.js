(function () {
  'use strict';

  /* Помечаем, что JS активен — анимации появления включаются только при этом,
     иначе (JS отключён) контент остаётся видимым. */
  document.documentElement.classList.add('vp-js');
  document.body.classList.add('vp-booting');
  var VP_PATH = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.body.classList.add(
    VP_PATH === 'index.html' ? 'vp-page-home' :
    VP_PATH === 'object.html' ? 'vp-page-catalog' :
    VP_PATH === 'team.html' ? 'vp-page-team' :
    VP_PATH === 'contacts.html' ? 'vp-page-contacts' :
    /detail\.html$/.test(VP_PATH) ? 'vp-page-detail' :
    VP_PATH === 'thanks.html' ? 'vp-page-thanks' : 'vp-page-inner'
  );
  window.addEventListener('load', function () { document.body.classList.remove('vp-booting'); });

  (function () {
    var loader = document.createElement('div');
    loader.className = 'vp-loader';
    loader.setAttribute('aria-hidden', 'true');
    loader.innerHTML =
      '<div class="vp-loader__atom">' +
        '<span></span><span></span><span></span><b>VP</b>' +
      '</div>' +
      '<div class="vp-loader__txt">Visual Physics</div>';
    document.body.appendChild(loader);

    function hideLoader() {
      loader.classList.add('is-hidden');
      setTimeout(function () { loader.remove(); }, 520);
    }
    window.addEventListener('load', function () { setTimeout(hideLoader, 260); });
    setTimeout(hideLoader, 1800);
  })();

  (function () {
    var transition = document.createElement('div');
    transition.className = 'vp-page-transition';
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(transition);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      transition.classList.add('is-active');
      setTimeout(function () { location.href = url.href; }, 190);
    }, true);
  })();

  (function () {
    var labels = {
      ru: { home: 'Главная', models: 'Модели', team: 'Команда', request: 'Заявка' },
      en: { home: 'Home', models: 'Models', team: 'Team', request: 'Request' },
      kk: { home: 'Басты', models: 'Модельдер', team: 'Команда', request: 'Өтінім' }
    };
    var items = [
      { key: 'home', href: 'index.html', icon: '⌂' },
      { key: 'models', href: 'object.html', icon: '◌' },
      { key: 'team', href: 'team.html', icon: '✦' },
      { key: 'request', href: 'contacts.html', icon: '↗' }
    ];
    var dock = document.createElement('nav');
    dock.className = 'vp-smart-dock';
    dock.setAttribute('aria-label', 'Quick navigation');
    document.body.appendChild(dock);

    function currentLang() {
      var l = document.documentElement.getAttribute('lang') || 'ru';
      return labels[l] ? l : 'ru';
    }
    function isActive(href) {
      if (VP_PATH === href) return true;
      return href === 'object.html' && /detail\.html$/.test(VP_PATH);
    }
    function renderDock() {
      var dict = labels[currentLang()];
      dock.innerHTML = items.map(function (item) {
        return '<a class="' + (isActive(item.href) ? 'is-active' : '') + '" href="' + item.href + '">' +
          '<span class="vp-smart-dock__ic">' + item.icon + '</span>' +
          '<span class="vp-smart-dock__txt">' + dict[item.key] + '</span>' +
        '</a>';
      }).join('');
    }
    renderDock();
    document.addEventListener('vp:lang', renderDock);
  })();

  /* ── Smooth scroll ──────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ══════════════════════════════════════════════════════
     PROJECTS CAROUSEL — simple scroll-snap with arrow buttons
  ══════════════════════════════════════════════════════ */
  (function () {
    var track   = document.getElementById('projTrack');
    var btnLeft = document.getElementById('projLeft');
    var btnRight= document.getElementById('projRight');
    if (!track || !btnLeft || !btnRight) return;

    function scrollByCard(dir) {
      var card = track.querySelector('.proj-card');
      if (!card) return;
      var step = card.offsetWidth + 18; // 18 = gap
      track.scrollBy({ left: dir * step, behavior: 'smooth' });
    }

    btnLeft.addEventListener('click',  function () { scrollByCard(-1); });
    btnRight.addEventListener('click', function () { scrollByCard(1);  });
  })();

  /* ══════════════════════════════════════════════════════
     SCHOOLS CAROUSEL
     Все размеры кешируются один раз при старте.
     Трек двигается с шагом STEP = cardW + GAP.
     Центр: translateX = -(pos * STEP - (vpW - cardW) / 2)
  ══════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════
     REUSABLE CAROUSEL FACTORY
     Принимает объект с id-ами элементов, запускает
     ту же механику что для школ — работает для любого
     набора .sc-card внутри .sc-track.
  ══════════════════════════════════════════════════════ */
  function initCarousel(opts) {
    /* opts: { trackId, viewportSelector, leftId, rightId, dotsId } */
    var track    = document.getElementById(opts.trackId);
    var viewport = opts.viewportEl || (opts.viewportSelector ? track && track.closest(opts.viewportSelector) : null);
    if (!viewport && track) viewport = track.parentElement;
    var btnLeft  = document.getElementById(opts.leftId);
    var btnRight = document.getElementById(opts.rightId);
    var dotsWrap = document.getElementById(opts.dotsId);

    if (!track || !viewport || !btnLeft || !btnRight) return;

    var GAP  = 24;
    var ANIM = 460;

    var origCards = Array.from(track.children);
    var N = origCards.length;
    if (N === 0) return;

    var before = origCards.map(function (c) {
      var cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); return cl;
    });
    var after = origCards.map(function (c) {
      var cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); return cl;
    });

    track.innerHTML = '';
    before.forEach(function (c) { track.appendChild(c); });
    origCards.forEach(function (c) { track.appendChild(c); });
    after.forEach(function (c)  { track.appendChild(c); });

    var allCards = Array.from(track.children);

    var dots = [];
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < N; i++) {
        (function (idx) {
          var d = document.createElement('button');
          d.className = 'sc-dot';
          d.type = 'button';
          d.setAttribute('aria-label', (opts.dotLabel || 'Слайд ') + (idx + 1));
          d.addEventListener('click', function () { if (!animating) goTo(idx, true); });
          dotsWrap.appendChild(d);
          dots.push(d);
        })(i);
      }
    }

    var CARD_W, STEP, CENTER_OFFSET;

    function cacheMetrics() {
      var vp = viewport.clientWidth;
      CARD_W        = allCards[0].offsetWidth;
      STEP          = CARD_W + GAP;
      CENTER_OFFSET = (vp - CARD_W) / 2;
    }

    var pos       = N;
    var origIdx   = 0;
    var animating = false;

    function applyTransform(domPos, animate) {
      var tx = -(domPos * STEP - CENTER_OFFSET);
      if (animate) {
        track.style.transition = 'transform ' + ANIM + 'ms cubic-bezier(0.4,0,0.2,1)';
      } else {
        track.style.transition = 'none';
        void track.offsetWidth;
      }
      track.style.transform = 'translateX(' + tx + 'px)';
    }

    function updateUI() {
      allCards.forEach(function (c, i) {
        c.classList.toggle('is-active', (i % N) === origIdx);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === origIdx);
      });
    }

    function goTo(idx, animate) {
      origIdx = ((idx % N) + N) % N;
      pos     = N + origIdx;
      applyTransform(pos, animate);
      updateUI();
    }

    track.addEventListener('transitionend', function (e) {
      if (e.propertyName !== 'transform') return;
      animating = false;
      if (pos < N || pos >= 2 * N) {
        pos = N + origIdx;
        applyTransform(pos, false);
      }
    });

    function step(dir) {
      if (animating) return;
      animating = true;
      origIdx = ((origIdx + dir) % N + N) % N;
      pos     = pos + dir;
      if (pos < 0)      pos = N + origIdx;
      if (pos >= 3 * N) pos = N + origIdx;
      applyTransform(pos, true);
      updateUI();
    }

    btnLeft.addEventListener('click',  function () { step(-1); });
    btnRight.addEventListener('click', function () { step(1);  });

    track.addEventListener('click', function (e) {
      if (animating) return;
      var card = e.target.closest('.sc-card');
      if (!card || card.classList.contains('is-active')) return;
      var domIdx = allCards.indexOf(card);
      if (domIdx < 0) return;
      var clickedOrig = domIdx % N;
      var diff = clickedOrig - origIdx;
      if (diff >  N / 2) diff -= N;
      if (diff < -N / 2) diff += N;
      if (diff !== 0) step(diff > 0 ? 1 : -1);
    });

    cacheMetrics();
    goTo(0, false);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        cacheMetrics();
        goTo(origIdx, false);
      }, 80);
    });
  }

  window.addEventListener('load', function () {

    /* Школы */
    initCarousel({
      trackId:  'schoolsTrack',
      leftId:   'schoolsLeft',
      rightId:  'schoolsRight',
      dotsId:   'schoolsDots',
      dotLabel: 'Школа '
    });

    /* Команда */
    initCarousel({
      trackId:  'teamTrack',
      leftId:   'teamLeft',
      rightId:  'teamRight',
      dotsId:   'teamDots',
      dotLabel: 'Участник '
    });

  });

  /* ══════════════════════════════════════════════════════
     HAMBURGER MENU — mobile only
  ══════════════════════════════════════════════════════ */
  (function () {
    var toggle = document.querySelector('.nav-toggle');
    var header = document.querySelector('.header');
    if (!toggle || !header) return;

    /* Create overlay */
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    function openMenu() {
      header.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      overlay.style.display = 'block';
    }

    function closeMenu() {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      overlay.style.display = 'none';
    }

    toggle.addEventListener('click', function () {
      if (header.classList.contains('nav-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    /* Close when clicking overlay */
    overlay.addEventListener('click', closeMenu);

    /* Close when a nav link is tapped */
    var navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    /* Close on resize to desktop */
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  })();

  /* ══════════════════════════════════════════════════════
     SCROLL REVEAL — мягкое появление блоков при прокрутке
  ══════════════════════════════════════════════════════ */
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function addReveal(el) { if (el && !el.classList.contains('reveal')) el.classList.add('reveal'); }

    // одиночные элементы
    Array.prototype.forEach.call(
      document.querySelectorAll('.section .h2, .section > .container > .p, .install-note, .detail-cta, .funnel-wrap'),
      addReveal
    );
    // сетки — с лёгким каскадом
    ['.cards', '.features', '.kpis', '.twin-cta', '.museum-photos', '.models', '.takeaways', '.detail-grid', '.app-grid', '.wiw__grid'].forEach(function (gridSel) {
      Array.prototype.forEach.call(document.querySelectorAll(gridSel), function (grid) {
        Array.prototype.forEach.call(grid.children, function (child, i) {
          addReveal(child);
          child.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
          if (!child.classList.contains('reveal--left') && !child.classList.contains('reveal--right') && !child.classList.contains('reveal--scale')) {
            child.classList.add(i % 3 === 0 ? 'reveal--left' : (i % 3 === 1 ? 'reveal--scale' : 'reveal--right'));
          }
        });
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.contact-info, .detail__media, .museum-text, .team-hero__copy'), function (el) {
      el.classList.add('reveal--left');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.contact-card, .detail__head, .museum-photos, .team-hero__visual'), function (el) {
      el.classList.add('reveal--right');
    });

    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (reduce) {
      els.forEach(function (e) { e.classList.add('is-visible'); });
      return;
    }

    // Надёжный показ при попадании в зону видимости (работает во всех окружениях)
    function revealInView() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = els.length - 1; i >= 0; i--) {
        var r = els[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > -10) {
          els[i].classList.add('is-visible');
          els.splice(i, 1);
        }
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { revealInView(); ticking = false; });
    }
    revealInView();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', revealInView);
  })();

  /* ══════════════════════════════════════════════════════
     COUNT-UP — анимация чисел [data-count]
  ══════════════════════════════════════════════════════ */
  (function () {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0, dur = 1100, start = 0;
      var suffix = el.getAttribute('data-suffix') || '';
      function tick(now) {
        if (!start) start = now;
        var p = Math.min((now - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick); else el.textContent = String(target) + suffix;
      }
      requestAnimationFrame(tick);
    }
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(counters, run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(counters, function (c) { io.observe(c); });
  })();

  /* ══════════════════════════════════════════════════════
     BACK TO TOP
  ══════════════════════════════════════════════════════ */
  (function () {
    var btn = document.createElement('button');
    btn.className = 'vp-totop';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);
    function onScroll() { btn.classList.toggle('is-visible', window.scrollY > 600); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  })();

  /* ══════════════════════════════════════════════════════
     LEAD FORM → /api/lead  (с мягким fallback на Netlify)
  ══════════════════════════════════════════════════════ */
  (function () {
    var form = document.getElementById('leadForm');
    if (!form) return;
    var statusEl = document.getElementById('leadStatus');
    var srcEl = document.getElementById('lead-source');
    if (srcEl && !srcEl.value) srcEl.value = location.pathname + location.search;

    function setStatus(msg, type) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'cf-status' + (type ? ' cf-status--' + type : '');
    }
    function nativeSubmit() { HTMLFormElement.prototype.submit.call(form); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.classList.contains('is-loading')) return;

      var payload = {};
      new FormData(form).forEach(function (v, k) { payload[k] = v; });

      form.classList.add('is-loading');
      setStatus('Отправляем заявку…', '');

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (r.ok) { window.location.href = 'thanks.html'; return; }
        if (r.status === 404) { // нет backend (статичный хостинг) → Netlify
          if (form.hasAttribute('data-netlify')) { nativeSubmit(); return; }
        }
        return r.json().catch(function () { return {}; }).then(function (d) {
          form.classList.remove('is-loading');
          setStatus(d.error || 'Не удалось отправить. Попробуйте ещё раз.', 'error');
        });
      }).catch(function () {
        // сеть недоступна — пробуем нативную отправку (Netlify) либо показываем подсказку
        if (form.hasAttribute('data-netlify')) { nativeSubmit(); return; }
        form.classList.remove('is-loading');
        setStatus('Сервер недоступен. Напишите нам в Instagram @visual.physics_', 'error');
      });
    });
  })();

  /* ══════════════════════════════════════════════════════
     AI CHAT WIDGET — плавающий чат-бот на всех страницах
  ══════════════════════════════════════════════════════ */
  (function () {
    if (document.querySelector('.vp-chat-fab')) return;

    function getLang() { return document.documentElement.getAttribute('lang') || 'ru'; }

    /* Интерфейс чата на 3 языках */
    var CHATUI = {
      ru: { title: 'Помощник Visual Physics', sub: 'Обычно отвечает сразу', ph: 'Спросите о проекте…',
            footA: 'Бот может ошибаться. Для заявки — ', footLink: 'оставьте контакты', footB: '.',
            open: 'Открыть чат', close: 'Закрыть чат',
            greet: 'Привет! 👋 Я помощник Visual Physics. Помогу узнать о проекте, моделях и как привести их в вашу школу. О чём расскажу?',
            hi: 'Привет! Я помощник Visual Physics 🤖 Спросите про модели, заявку или стоимость.',
            thanks: 'Пожалуйста! Если захотите модели в школу — оставьте заявку 🙂',
            idk: 'Я ещё учусь 🙂 Могу рассказать про проект, модели, заявку и стоимость. Точный ответ — оставьте заявку на странице контактов.',
            quick: ['Что такое Visual Physics?', 'Какие есть модели?', 'Как оставить заявку?', 'Сколько это стоит?'] },
      kk: { title: 'Visual Physics көмекшісі', sub: 'Әдетте бірден жауап береді', ph: 'Жоба туралы сұраңыз…',
            footA: 'Бот қателесуі мүмкін. Өтінім үшін — ', footLink: 'байланыс қалдырыңыз', footB: '.',
            open: 'Чатты ашу', close: 'Чатты жабу',
            greet: 'Сәлем! 👋 Мен Visual Physics көмекшісімін. Жоба, модельдер және оларды мектебіңізге қалай әкелу туралы айтып беремін. Не қызықтырады?',
            hi: 'Сәлем! Мен Visual Physics көмекшісімін 🤖 Модельдер, өтінім немесе баға туралы сұраңыз.',
            thanks: 'Рахмет! Мектепке модель қаласаңыз — өтінім қалдырыңыз 🙂',
            idk: 'Мен әлі үйреніп жатырмын 🙂 Жоба, модельдер, өтінім және баға туралы айта аламын. Нақты жауап — байланыс бетінде өтінім қалдырыңыз.',
            quick: ['Visual Physics дегеніміз не?', 'Қандай модельдер бар?', 'Өтінімді қалай қалдыруға болады?', 'Бұл қанша тұрады?'] },
      en: { title: 'Visual Physics assistant', sub: 'Usually replies instantly', ph: 'Ask about the project…',
            footA: 'The bot can make mistakes. To apply — ', footLink: 'leave your contacts', footB: '.',
            open: 'Open chat', close: 'Close chat',
            greet: "Hi! 👋 I'm the Visual Physics assistant. I can tell you about the project, the models and how to bring them to your school. What would you like to know?",
            hi: "Hi! I'm the Visual Physics assistant 🤖 Ask about models, requests or pricing.",
            thanks: "You're welcome! If you'd like models in your school — leave a request 🙂",
            idk: "I'm still learning 🙂 I can tell you about the project, models, requests and pricing. For an exact answer — leave a request on the contacts page.",
            quick: ['What is Visual Physics?', 'What models are there?', 'How do I leave a request?', 'How much does it cost?'] }
    };

    /* Трёхъязычная база ответов (ключевые слова на RU/KZ/EN) */
    var FALLBACK = [
      { k: ['что такое', 'visual physics', 'о проекте', 'кто вы', 'чем заним', 'не туралы', 'жоба туралы', 'дегеніміз', 'about', 'who are you', 'what is'],
        a: { ru: 'Visual Physics — образовательный проект: мы делаем интерактивные физические модели и ставим их прямо в школах, чтобы ученики понимали физику наглядно. Хотите модели в свою школу? Оставьте заявку 🙂',
             kk: 'Visual Physics — білім беру жобасы: біз интерактивті физикалық модельдер жасап, оларды тікелей мектептерге орнатамыз, осылайша оқушылар физиканы көрнекі түсінеді. Мектебіңізге модель керек пе? Өтінім қалдырыңыз 🙂',
             en: 'Visual Physics is an educational project: we build interactive physics models and install them right in schools so students understand physics visually. Want models in your school? Leave a request 🙂' } },
      { k: ['модел', 'проект', 'каталог', 'что есть', 'установк', 'қандай', 'модельдер', 'жоба', 'model', 'catalog', 'what models'],
        a: { ru: 'Сейчас 6 моделей: «Стул с шариками» (инерция), «Вес тела в жидкости» (Архимед), «Броуновское движение» (термодинамика), «Велоколесо» (гироскоп), «Блочная система» (механизмы) и «Набор грузов» (плотность). Подробнее — на странице «О наших проектах».',
             kk: 'Қазір 6 модель бар: «Шарикті орындық» (инерция), «Дененің сұйықтықтағы салмағы» (Архимед), «Броундық қозғалыс» (термодинамика), «Велодөңгелек» (гироскоп), «Блок жүйесі» (механизмдер) және «Жүктер жинағы» (тығыздық). Толығырақ — «Жобаларымыз» бетінде.',
             en: 'There are 6 models: "Chair with balls" (inertia), "Weight in a liquid" (Archimedes), "Brownian motion" (thermodynamics), "Bicycle wheel" (gyroscope), "Pulley system" (machines) and "Set of weights" (density). More on the "Our projects" page.' } },
      { k: ['заявк', 'заказ', 'хочу', 'для школ', 'связат', 'подключ', 'өтінім', 'қалдыр', 'мектепке', 'request', 'apply', 'order', 'for school'],
        a: { ru: 'Чтобы получить модели в школу — оставьте заявку (имя и телефон) на странице «Оставить заявку». Мы свяжемся и подберём набор под ваши классы.',
             kk: 'Мектепке модель алу үшін — «Өтінім қалдыру» бетінде өтінім (аты және телефон) қалдырыңыз. Біз хабарласып, сыныптарыңызға жинақ таңдаймыз.',
             en: 'To get models for your school — leave a request (name and phone) on the "Submit a request" page. We\'ll get in touch and pick a set for your grades.' } },
      { k: ['цена', 'стоим', 'сколько стоит', 'прайс', 'бюджет', 'оплат', 'қанша', 'баға', 'price', 'cost', 'how much'],
        a: { ru: 'Стоимость зависит от набора моделей и условий школы. Точную смету считаем индивидуально — оставьте заявку, и мы рассчитаем 🙂',
             kk: 'Бағасы модельдер жинағына және мектеп жағдайына байланысты. Нақты сметаны жеке есептейміз — өтінім қалдырыңыз, есептеп береміз 🙂',
             en: 'The price depends on the set of models and the school. We calculate an exact quote individually — leave a request and we\'ll work it out 🙂' } },
      { k: ['класс', 'возраст', 'для кого', 'ученик', 'сынып', 'жас', 'оқушы', 'grade', 'age', 'for whom', 'student'],
        a: { ru: 'Модели рассчитаны на школьную физику (примерно 7–11 классы) и используются учителем прямо на уроке.',
             kk: 'Модельдер мектеп физикасына (шамамен 7–11 сыныптар) арналған және мұғалім сабақта тікелей қолданады.',
             en: 'The models target school physics (roughly grades 7–11) and are used by the teacher right in the lesson.' } },
      { k: ['безопас', 'опасно', 'дети', 'қауіпсіз', 'қауіпті', 'бала', 'safe', 'danger', 'children'],
        a: { ru: 'Да, модели полностью безопасны — их можно давать ученикам для самостоятельной работы.',
             kk: 'Иә, модельдер толық қауіпсіз — оларды оқушыларға өздігінен жұмыс істеуге беруге болады.',
             en: 'Yes, the models are completely safe — they can be given to students for independent work.' } },
      { k: ['школ', 'партнер', 'рфмш', 'tamos', 'alkyz', 'мектеп', 'серіктес', 'school', 'partner'],
        a: { ru: 'Мы уже работаем с РФМШ, TAMOS и ALKYZ и открыты к новым школам.',
             kk: 'Біз қазірдің өзінде РФМШ, TAMOS және ALKYZ-пен жұмыс істейміз әрі жаңа мектептерге ашықпыз.',
             en: 'We already work with RFMSH, TAMOS and ALKYZ and are open to new schools.' } },
      { k: ['поддерж', 'донат', 'помочь', 'пожертв', 'қолда', 'көмек', 'support', 'donate', 'help'],
        a: { ru: 'Поддержать проект можно в разделе «Поддержать проект» на главной — спасибо! 💙',
             kk: 'Жобаны басты беттегі «Жобаны қолдау» бөлімінде қолдай аласыз — рахмет! 💙',
             en: 'You can support the project in the "Support the project" section on the homepage — thank you! 💙' } },
      { k: ['контакт', 'инстаграм', 'instagram', 'связь', 'соцсет', 'байланыс', 'contact', 'social'],
        a: { ru: 'Мы в Instagram: @visual.physics_ . А для заявки — оставьте телефон на странице «Оставить заявку».',
             kk: 'Біз Instagram-дамыз: @visual.physics_ . Ал өтінім үшін — «Өтінім қалдыру» бетінде телефон қалдырыңыз.',
             en: 'We\'re on Instagram: @visual.physics_ . And to apply — leave your phone on the "Submit a request" page.' } },
      { k: ['команд', 'кто делает', 'участник', 'кім жаса', 'команда', 'team', 'who makes'],
        a: { ru: 'Над проектом работает небольшая команда: руководитель и проектировщики, IT/веб, финансы и SMM. В команде есть Дулат Тастанбай и Омирбек Тунгышбек. Подробнее — на странице «О нашей команде».',
             kk: 'Жоба үстінде шағын команда жұмыс істейді: жетекші және жобалаушылар, IT/веб, қаржы және SMM. Командада Дулат Тастанбай мен Омирбек Тунгышбек бар. Толығырақ — «Біздің команда» бетінде.',
             en: 'A small team works on the project: a lead and designers, IT/web, finance and SMM. The team includes Dulat Tastanbay and Omirbek Tungyshbek. More on the "Our team" page.' } }
    ];

    function localReply(text) {
      var lang = getLang(); var ui = CHATUI[lang] || CHATUI.ru;
      var t = (text || '').toLowerCase().replace(/ё/g, 'е');
      if (/привет|здравств|добр(ый|ое)|hello|hi|салам|сәлем/.test(t)) return { reply: ui.hi, suggestions: ui.quick };
      if (/спасибо|благодар|рахмет|thank/.test(t)) return { reply: ui.thanks, suggestions: ui.quick };
      var best = null, score = 0;
      FALLBACK.forEach(function (e) {
        var s = 0; e.k.forEach(function (k) { if (t.indexOf(k) !== -1) s += k.length >= 5 ? 2 : 1; });
        if (s > score) { score = s; best = e; }
      });
      if (best && score >= 2) return { reply: best.a[lang] || best.a.ru, suggestions: ui.quick };
      return { reply: ui.idk, suggestions: ui.quick };
    }

    var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    var fab = document.createElement('button');
    fab.className = 'vp-chat-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Открыть чат');
    fab.innerHTML = '<span class="vp-chat-fab__ic vp-chat-fab__ic--chat">' + ICON_CHAT + '</span><span class="vp-chat-fab__ic vp-chat-fab__ic--close">' + ICON_CLOSE + '</span><span class="vp-chat-fab__dot"></span>';

    var panel = document.createElement('div');
    panel.className = 'vp-chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Чат с помощником Visual Physics');
    panel.innerHTML =
      '<div class="vp-chat__head">' +
        '<div class="vp-chat__ava"><span>AI</span></div>' +
        '<div class="vp-chat__htxt"><div class="vp-chat__title">Помощник Visual Physics</div><div class="vp-chat__sub">Обычно отвечает сразу</div></div>' +
        '<button class="vp-chat__x" type="button" aria-label="Закрыть">' + ICON_CLOSE + '</button>' +
      '</div>' +
      '<div class="vp-chat__lab" aria-hidden="true">' +
        '<span>AI lab</span><span data-chat-provider>FAQ mode</span><span>24/7</span>' +
      '</div>' +
      '<div class="vp-chat__msgs" id="vpMsgs"></div>' +
      '<div class="vp-chat__quick" id="vpQuick"></div>' +
      '<form class="vp-chat__form" id="vpForm">' +
        '<textarea id="vpText" class="vp-chat__text" rows="1" placeholder="Спросите о проекте…" autocomplete="off"></textarea>' +
        '<button type="submit" class="vp-chat__send" aria-label="Отправить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>' +
      '</form>' +
      '<div class="vp-chat__foot">Бот может ошибаться. Для заявки — <a href="contacts.html">оставьте контакты</a>.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var msgsEl = panel.querySelector('#vpMsgs');
    var quickEl = panel.querySelector('#vpQuick');
    var formEl = panel.querySelector('#vpForm');
    var textEl = panel.querySelector('#vpText');
    var providerEl = panel.querySelector('[data-chat-provider]');
    var history = [];
    var greeted = false;
    var sending = false;

    fetch('/api/health').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !providerEl) return;
      var provider = d.ai_provider || (d.ai ? 'AI' : 'FAQ');
      providerEl.textContent = d.ai ? (String(provider).toUpperCase() + ' live') : 'FAQ mode';
      panel.classList.toggle('is-ai-live', Boolean(d.ai));
    }).catch(function () {});

    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function linkify(s) {
      s = esc(s);
      s = s.replace(/\b([a-z0-9_]+detail\.html|index\.html|object\.html|team\.html|contacts\.html)\b/gi, '<a href="$1">$1</a>');
      s = s.replace(/@visual\.physics_/g, '<a href="https://www.instagram.com/visual.physics_/" target="_blank" rel="noopener">@visual.physics_</a>');
      return s;
    }
    function scrollDown() { msgsEl.scrollTop = msgsEl.scrollHeight; }

    function addMsg(role, text) {
      var row = document.createElement('div');
      row.className = 'vp-msg vp-msg--' + role;
      row.innerHTML = '<div class="vp-bubble">' + (role === 'bot' ? linkify(text) : esc(text)) + '</div>';
      msgsEl.appendChild(row);
      scrollDown();
      return row;
    }
    function showTyping() {
      var row = document.createElement('div');
      row.className = 'vp-msg vp-msg--bot vp-typing';
      row.innerHTML = '<div class="vp-bubble"><span class="vp-dot"></span><span class="vp-dot"></span><span class="vp-dot"></span></div>';
      msgsEl.appendChild(row); scrollDown();
      return row;
    }
    function setQuick(list) {
      quickEl.innerHTML = '';
      (list || []).forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'vp-q'; b.textContent = q;
        b.addEventListener('click', function () { send(q); });
        quickEl.appendChild(b);
      });
    }

    function send(text) {
      text = (text || '').trim();
      if (!text || sending) return;
      sending = true;
      addMsg('user', text);
      history.push({ role: 'user', content: text });
      setQuick([]);
      textEl.value = ''; autoGrow();
      var typing = showTyping();
      var lang = getLang();

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-10), lang: lang })
      }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (data) {
        typing.remove();
        var reply = (data && data.reply) || localReply(text).reply;
        addMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
        setQuick((data && data.suggestions) || (CHATUI[getLang()] || CHATUI.ru).quick);
      }).catch(function () {
        typing.remove();
        var loc = localReply(text);
        addMsg('bot', loc.reply);
        history.push({ role: 'assistant', content: loc.reply });
        setQuick(loc.suggestions);
      }).then(function () { sending = false; });
    }

    function greet() {
      if (greeted) return;
      greeted = true;
      var ui = CHATUI[getLang()] || CHATUI.ru;
      addMsg('bot', ui.greet);
      setQuick(ui.quick);
    }

    function open() {
      panel.classList.add('is-open');
      fab.classList.add('is-active');
      fab.setAttribute('aria-label', (CHATUI[getLang()] || CHATUI.ru).close);
      greet();
      setTimeout(function () { if (window.innerWidth > 640) textEl.focus(); }, 200);
    }
    function close() {
      panel.classList.remove('is-open');
      fab.classList.remove('is-active');
      fab.setAttribute('aria-label', (CHATUI[getLang()] || CHATUI.ru).open);
    }
    function toggle() { panel.classList.contains('is-open') ? close() : open(); }

    function autoGrow() {
      textEl.style.height = 'auto';
      textEl.style.height = Math.min(textEl.scrollHeight, 110) + 'px';
    }

    // применяет язык к интерфейсу чата (заголовок, плейсхолдер, подвал, быстрые ответы)
    function applyChatLang() {
      var ui = CHATUI[getLang()] || CHATUI.ru;
      panel.querySelector('.vp-chat__title').textContent = ui.title;
      panel.querySelector('.vp-chat__sub').textContent = ui.sub;
      textEl.setAttribute('placeholder', ui.ph);
      panel.querySelector('.vp-chat__foot').innerHTML = esc(ui.footA) + '<a href="contacts.html">' + esc(ui.footLink) + '</a>' + esc(ui.footB);
      fab.setAttribute('aria-label', panel.classList.contains('is-open') ? ui.close : ui.open);
      if (greeted) setQuick(ui.quick);
    }
    applyChatLang();
    document.addEventListener('vp:lang', applyChatLang);

    fab.addEventListener('click', toggle);
    panel.querySelector('.vp-chat__x').addEventListener('click', close);
    formEl.addEventListener('submit', function (e) { e.preventDefault(); send(textEl.value); });
    textEl.addEventListener('input', autoGrow);
    textEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(textEl.value); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* ══════════════════════════════════════════════════════
     HEADER — сжатие при прокрутке + активная страница
  ══════════════════════════════════════════════════════ */
  (function () {
    var header = document.querySelector('.header');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var isProjects = path === 'object.html' || /detail\.html$/.test(path);
    Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
      var raw = a.getAttribute('href') || '';
      if (raw.indexOf('#') !== -1) return; // пропускаем якорные ссылки
      var href = raw.split('/').pop().toLowerCase();
      if ((href && href === path) || (isProjects && href === 'object.html')) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ══════════════════════════════════════════════════════
     MORE MOTION — прогресс, споты, параллакс, частицы
  ══════════════════════════════════════════════════════ */
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  (function () {
    if (REDUCE || !window.requestAnimationFrame) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'vp-ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, dpr = 1, pts = [], raf = null, pointer = { x: -999, y: -999, on: false };
    var mobile = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth || document.documentElement.clientWidth;
      H = window.innerHeight || document.documentElement.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      var count = mobile ? 22 : Math.min(62, Math.max(36, Math.round(W / 26)));
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - .5) * .18,
          vy: (Math.random() - .5) * .18,
          r: Math.random() * 1.4 + .55,
          hue: i % 4
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (pointer.on) {
          var ax = pointer.x - p.x, ay = pointer.y - p.y, d = ax * ax + ay * ay;
          if (d < 18000 && d > 60) {
            var f = (1 - d / 18000) * .008;
            p.vx += ax * f / Math.sqrt(d);
            p.vy += ay * f / Math.sqrt(d);
          }
        }
        p.x += p.vx; p.y += p.vy; p.vx *= .996; p.vy *= .996;
        if (p.x < -16) p.x = W + 16;
        if (p.x > W + 16) p.x = -16;
        if (p.y < -16) p.y = H + 16;
        if (p.y > H + 16) p.y = -16;
      }
      for (i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dist = dx * dx + dy * dy;
          if (dist < 8200) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = 'rgba(79,70,229,' + (.08 * (1 - dist / 8200)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 0 ? 'rgba(6,182,212,.24)' : (p.hue === 1 ? 'rgba(124,58,237,.20)' : 'rgba(79,70,229,.20)');
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    if (FINE_POINTER) {
      window.addEventListener('pointermove', function (e) {
        pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
      }, { passive: true });
      window.addEventListener('pointerleave', function () { pointer.on = false; }, { passive: true });
    }

    resize(); start();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  })();

  (function () {
    if (REDUCE || !FINE_POINTER) return;
    var dot = document.createElement('span');
    var ring = document.createElement('span');
    dot.className = 'vp-cursor-dot';
    ring.className = 'vp-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var x = (window.innerWidth || document.documentElement.clientWidth) / 2;
    var y = (window.innerHeight || document.documentElement.clientHeight) / 2;
    var rx = x, ry = y;
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
    }, { passive: true });
    function loop() {
      rx += (x - rx) * .18; ry += (y - ry) * .18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    }
    loop();
    document.addEventListener('pointerdown', function (e) {
      var pulse = document.createElement('span');
      pulse.className = 'vp-click-pulse';
      pulse.style.left = e.clientX + 'px';
      pulse.style.top = e.clientY + 'px';
      document.body.appendChild(pulse);
      setTimeout(function () { pulse.remove(); }, 720);
    }, { passive: true });
  })();

  (function () {
    Array.prototype.forEach.call(document.querySelectorAll('.model__body'), function (body) {
      if (body.querySelector('.model__badges')) return;
      var wrap = document.createElement('div');
      wrap.className = 'model__badges';
      wrap.innerHTML = '<span>7–11 класс</span><span>5–10 мин</span><span>safe</span>';
      var actions = body.querySelector('.model__actions');
      body.insertBefore(wrap, actions || null);
      var meter = document.createElement('div');
      meter.className = 'model__meter';
      meter.setAttribute('aria-hidden', 'true');
      meter.innerHTML = '<span></span><span></span><span></span><em>interactive model</em>';
      body.insertBefore(meter, actions || null);
    });
  })();

  /* индикатор прокрутки */
  (function () {
    if (REDUCE) return;
    var bar = document.createElement('div');
    bar.className = 'vp-progress';
    document.body.appendChild(bar);
    function upd() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  })();

  /* спот-свечение за курсором */
  (function () {
    if (REDUCE || !FINE_POINTER) return;
    var sel = '.proj-card, .model, .features .card, .cards--numbered .card, .museum-photo-card, .takeaway, .detail-block, .cta-block, .kpi, .contact-card, .perk, .team-member, .sc-card, .catalog-tools, .app-card, .wiw__item';
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (card) {
      card.classList.add('vp-spotlight');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  })();

  /* лёгкий параллакс фонового фото в hero (только если у hero есть фото-фон) */
  (function () {
    if (REDUCE) return;
    var hero = document.querySelector('.hero');
    if (!hero) return;
    if (getComputedStyle(hero).backgroundImage.indexOf('url(') === -1) return; // нет фото — параллакс не нужен (аврора-градиент)
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < 900) hero.style.backgroundPosition = 'center ' + (y * 0.28) + 'px';
        ticking = false;
      });
    }, { passive: true });
  })();

  /* частицы-«созвездие» в CTA-баннере */
  (function () {
    if (REDUCE) return;
    var band = document.querySelector('.cta-band');
    if (!band || !window.requestAnimationFrame) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'vp-particles';
    band.insertBefore(canvas, band.firstChild);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, pts = [], raf = null;

    function resize() {
      W = canvas.width = band.offsetWidth;
      H = canvas.height = band.offsetHeight;
    }
    function init() {
      pts = [];
      var n = Math.max(18, Math.min(50, Math.round(W / 26)));
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32, r: Math.random() * 1.8 + 0.7 });
      }
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(232,165,90,.55)';
        ctx.fill();
      }
      for (i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = dx * dx + dy * dy;
          if (d < 9500) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = 'rgba(159,177,212,' + (0.14 * (1 - d / 9500)) + ')';
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf) tick(); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    resize(); init(); start();
    window.addEventListener('resize', function () { resize(); init(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }).observe(band);
    }
  })();

  /* ══════════════════════════════════════════════════════
     PHYSICS MOTION ENGINE — интерактивное поле и инерция
  ══════════════════════════════════════════════════════ */
  /* Живое поле только в первом экране: эффект заметен, но не расходует ресурсы всей страницы. */
  (function () {
    if (REDUCE || !window.requestAnimationFrame) return;
    var visual = document.querySelector('.hero__visual');
    if (!visual) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'vp-force-field';
    canvas.setAttribute('aria-hidden', 'true');
    visual.insertBefore(canvas, visual.firstChild);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, dpr = 1, particles = [], raf = null, inView = true;
    var pointer = { x: -9999, y: -9999, active: false };

    function resetParticles() {
      particles = [];
      var count = Math.max(22, Math.min(54, Math.round(W / 11)));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - .5) * .28,
          vy: (Math.random() - .5) * .28,
          r: Math.random() * 1.5 + .55,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    function resize() {
      var rect = visual.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetParticles();
    }
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var t = now * .001;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.vx += Math.sin(t + p.phase) * .0022;
        p.vy += Math.cos(t * .8 + p.phase) * .0022;
        if (pointer.active) {
          var px = pointer.x - p.x, py = pointer.y - p.y;
          var dist2 = px * px + py * py;
          if (dist2 < 18000 && dist2 > 25) {
            var force = (1 - dist2 / 18000) * .012;
            p.vx += px * force / Math.sqrt(dist2);
            p.vy += py * force / Math.sqrt(dist2);
          }
        }
        p.vx *= .992; p.vy *= .992;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -12) p.x = W + 12;
        if (p.x > W + 12) p.x = -12;
        if (p.y < -12) p.y = H + 12;
        if (p.y > H + 12) p.y = -12;
      }
      for (i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var distance = dx * dx + dy * dy;
          if (distance < 4800) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(99,102,241,' + (.19 * (1 - distance / 4800)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(6,182,212,.56)' : 'rgba(99,102,241,.52)';
        ctx.fill();
      }
      if (inView) raf = requestAnimationFrame(draw);
    }
    function start() { if (!raf && inView) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    if (FINE_POINTER) {
      visual.addEventListener('pointermove', function (event) {
        var rect = visual.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.active = true;
        visual.style.setProperty('--hero-rotate-x', ((pointer.y / rect.height - .5) * -4.5).toFixed(2) + 'deg');
        visual.style.setProperty('--hero-rotate-y', ((pointer.x / rect.width - .5) * 5.5).toFixed(2) + 'deg');
      });
      visual.addEventListener('pointerleave', function () {
        pointer.active = false;
        visual.style.setProperty('--hero-rotate-x', '0deg');
        visual.style.setProperty('--hero-rotate-y', '0deg');
      });
    }
    resize(); start();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start(); else stop();
      }, { threshold: .03 }).observe(visual);
    }
  })();

  /* Лёгкая инерция для карточек: 3D-наклон на десктопе, обычный hover на тач-устройствах. */
  (function () {
    if (REDUCE || !FINE_POINTER) return;
    var selector = '.card, .proj-card, .model, .app-card, .wiw__item, .takeaway, .museum-photo-card, .detail-block, .kpi, .cta-block, .contact-card, .perk, .team-member, .catalog-tools';
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (card) {
      card.classList.add('vp-tilt');
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var rx = ((event.clientY - rect.top) / rect.height - .5) * -5;
        var ry = ((event.clientX - rect.left) / rect.width - .5) * 5;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-5px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  })();

  /* Ключевые CTA слегка тянутся к курсору — как магнитное поле. */
  (function () {
    if (REDUCE || !FINE_POINTER) return;
    var selector = '.hero__actions .btn--primary, .cta-band__btn, .nav .btn--primary, .cf-submit, .vp-chat-fab, .vp-chat__send';
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (button) {
      button.classList.add('vp-magnetic');
      button.addEventListener('pointermove', function (event) {
        var rect = button.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - .5;
        var y = (event.clientY - rect.top) / rect.height - .5;
        button.style.transform = 'translate(' + (x * 7).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
      });
      button.addEventListener('pointerleave', function () { button.style.transform = ''; });
    });
  })();

  /* ══════════════════════════════════════════════════════
     CATALOG FILTERS — быстрый выбор моделей по теме
  ══════════════════════════════════════════════════════ */
  (function () {
    var catalog = document.querySelector('[data-model-catalog]');
    var controls = document.querySelector('.catalog-filters');
    if (!catalog || !controls) return;

    var cards = Array.prototype.slice.call(catalog.querySelectorAll('.model[data-topic]'));
    var buttons = Array.prototype.slice.call(controls.querySelectorAll('.catalog-filter'));
    var count = document.querySelector('[data-catalog-count]');

    function applyFilter(topic) {
      var shown = 0;
      cards.forEach(function (card) {
        var matches = topic === 'all' || card.getAttribute('data-topic') === topic;
        var wasHidden = card.hidden;
        card.hidden = !matches;
        if (matches) {
          shown += 1;
          if (wasHidden && !REDUCE) {
            card.classList.remove('is-filter-enter');
            requestAnimationFrame(function () { card.classList.add('is-filter-enter'); });
          }
        }
      });
      if (count) count.textContent = shown;
      buttons.forEach(function (button) {
        var active = button.getAttribute('data-filter') === topic;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () { applyFilter(button.getAttribute('data-filter') || 'all'); });
    });
  })();

  /* ══════════════════════════════════════════════════════
     I18N — переключатель языков RU / KZ / EN
     Русский берётся прямо из разметки; задаём только KZ и EN,
     непереведённые строки автоматически откатываются на русский.
  ══════════════════════════════════════════════════════ */
  (function () {
    var DICT = {
      en: {
        'nav.team': 'Our team', 'nav.projects': 'Our projects', 'nav.support': 'Support us', 'nav.cta': 'Request for your school',
        'footer.tagline': 'Our mission — make physics clear through visual models, simulations and experiments.',
        'footer.team': 'Our team', 'footer.projects': 'Our projects', 'footer.support': 'Support us', 'footer.request': 'Submit a request',
        'hero.eyebrow': '✦ Educational project for schools',
        'hero.h1': 'Making physics clear through interactive visualizations and experiments',
        'hero.lead': 'We turn abstract formulas into visual models, simulations and hands-on activities, so students truly understand instead of memorizing.',
        'hero.desc': 'Our models are installed right in schools and used by teachers in class — no museum trips, no extra equipment.',
        'hero.cta1': 'Request for your school', 'hero.cta2': 'View projects',
        'hero.stat1': 'ready models', 'hero.stat2': 'partner schools', 'hero.stat3': 'visual & safe',
        'why.h2': 'Why it matters',
        'why.intro': "Most students don't struggle with physics because they're 'weak' — but because it's taught too abstractly. We close that gap.",
        'why.c1t': 'Too abstract', 'why.c1d': 'Formulas with no intuition or link to real phenomena',
        'why.c2t': 'Little visualization', 'why.c2d': 'Not enough visual models and experiments in class',
        'why.c3t': 'Engagement drops', 'why.c3d': 'Students lose interest and start fearing mistakes',
        'give.h2': 'What Visual Physics gives',
        'give.intro': 'We build models that are easy for teachers to adopt and easy for students to understand',
        'give.f1t': 'Interactive simulations', 'give.f1d': 'Motion, waves, optics — the hard-to-imagine becomes visible',
        'give.f2t': 'Clear explanations', 'give.f2d': 'Short and to the point: meaning, examples, common mistakes',
        'give.f3t': 'Safe models', 'give.f3d': 'Models are fully safe for students to use on their own',
        'give.f4t': 'Practice & models', 'give.f4d': 'Visual models and setups',
        'give.kpi1t': 'Better understanding', 'give.kpi1d': 'Intuition and cause-effect links',
        'give.kpi2t': 'Higher motivation', 'give.kpi2d': 'Physics comes alive',
        'give.kpi3t': 'Exam confidence', 'give.kpi3d': 'Less memorizing, more meaning',
        'give.note': '<strong>All of it — right in your school.</strong> Visual Physics models and interactive setups are mounted in the classroom and used by teachers in every lesson. No trips, no special equipment.',
        'proj.h2': 'Our projects', 'proj.intro': 'Examples of models and projects. The full list is on the projects page.',
        'proj.more': 'Details', 'proj.openall': 'Open all projects',
        'proj.t1': 'Chair with balls', 'proj.d1': "Visible inertia: the base moves while the balls 'lag behind'.",
        'proj.t2': 'Weight in a liquid', 'proj.d2': "In water the load gets 'lighter' — Archimedes' force in action.",
        'proj.t3': 'Brownian motion', 'proj.d3': 'Balls on a vibrating table move like molecules — a model of heat.',
        'proj.t4': 'Bicycle wheel on a frame', 'proj.d4': 'Gyroscope: a spinning wheel holds its axis and amazes students.',
        'proj.t5': 'Pulley system', 'proj.d5': 'Lift a load with less effort — the golden rule of mechanics.',
        'proj.t6': 'Set of metal weights', 'proj.d6': "Equal volume, different mass — students 'feel' density.",
        'chip.mech': 'Mechanics', 'chip.arch': "Archimedes' law", 'chip.thermo': 'Thermodynamics', 'chip.density': 'Density',
        'mus.h2': 'How we arrived at Visual Physics', 'mus.intro': "Inspiration from the world's best science museums — into every school.",
        'mus.p1': "In the world's best science museums physics isn't crammed — it's touched with your hands. Visitors turn, push and launch the exhibits and see for themselves how the laws of nature work.",
        'mus.p2': 'We were inspired by this approach and asked: why should such setups exist only in big-city museums? That is how Visual Physics was born — we bring the "science museum" right into the classroom.',
        'mus.p3': 'Each of our models is a small interactive exhibit a student interacts with during an ordinary lesson.',
        'sch.h2': 'Schools we work with',
        'sup.h2': 'Support the project', 'sup.intro': 'Your contribution helps Visual Physics scale and reach new schools.',
        'sup.atitle': 'Support Visual Physics', 'sup.adesc': 'Donations go toward materials and assembling models. Every contribution helps make physics clearer for more students', 'sup.abtn': 'Support the project',
        'sup.btitle': 'Want Visual Physics in your school?', 'sup.bdesc': "Leave a request — we'll get in touch and propose models and a rollout plan. We work with public and private schools", 'sup.bbtn': 'Submit a request',
        'sup.othertitle': 'Other SM projects', 'sup.otherdesc': 'Visual Physics is one of SM\'s projects. <br>Other SM projects:',
        'cta.title': 'Ready to show students physics for real?', 'cta.sub': "Leave a request — we'll pick models for your curriculum and install them right in the classroom. It's free and commitment-free.", 'cta.btn': 'Submit a request',
        'c.badge': 'For schools', 'c.title': 'Request Visual Physics<br>for your school',
        'c.desc': "We'll tell you about the models, pick a set for your grades and draw up a rollout plan. No commitment.",
        'c.perk1t': 'Curriculum fit', 'c.perk1s': 'Models for the right topics and grades',
        'c.perk2t': 'In-class setup', 'c.perk2s': 'We install and train teachers',
        'c.perk3t': 'Quick response', 'c.perk3s': "We'll get back within a couple of days",
        'c.cardTitle': 'Submit a request', 'c.cardSub': "Fill the form — we'll call you back",
        'c.name': 'Name', 'c.phone': 'Phone', 'c.school': 'School name', 'c.role': 'Your role',
        'c.roleSelect': 'Choose a role', 'c.roleTeacher': 'Physics teacher', 'c.roleDirector': 'Principal / vice-principal', 'c.roleParent': 'Parent', 'c.roleOther': 'Other',
        'c.msg': 'Message', 'c.msgOpt': '(optional)', 'c.msgPh': 'E.g.: interested in mechanics models for grades 8–9',
        'c.submit': 'Send request', 'c.note': 'By clicking the button you agree to the processing of personal data',
        't.title': 'Thank you for your request!', 't.sub': "We've received your request and will contact you soon. Meanwhile — take a look at our projects or meet the team.",
        't.home': 'Home', 't.projects': 'View projects',
        // detail pages — shared
        'detail.back': 'All projects', 'detail.principleLabel': 'Principle',
        'detail.shows': 'What the model shows', 'detail.physics': 'Physics in simple words',
        'detail.formula': 'Formula', 'detail.students': 'What students do', 'detail.learns': 'What it teaches',
        'detail.ctaTitle': 'Like this model?', 'detail.ctaSub': "We'll install it in your school and show teachers how to use it in lessons.",
        'dtopic.mech': 'Topic: Mechanics', 'dtopic.arch': "Topic: Archimedes' law", 'dtopic.thermo': 'Topic: Thermodynamics', 'dtopic.density': 'Topic: Density',
        // chair with balls
        'dst.title': 'Chair with balls', 'dst.prin': "Inertia · Newton's laws",
        'dst.lead': "A vivid demonstration of inertia: the base suddenly starts or stops while the balls 'lag behind' — because they tend to keep their state.",
        'dst.p1': "When the platform with balls is pushed or stopped abruptly, the balls don't move with it instantly — they 'lag'. That is inertia: a body keeps its state of rest or uniform motion until a force acts on it.",
        'dst.p2': 'The heavier a body, the harder it is to change its motion — mass is a measure of inertia. That is why a vehicle throws us forward when braking and presses us into the seat when accelerating. The model makes this invisible effect obvious.',
        'dst.p3': "A body's acceleration is directly proportional to the applied force and inversely proportional to its mass (Newton's second law). With no force (F = 0) there is no acceleration — the body moves by inertia.",
        'dst.l1': 'Sharply move and stop the platform, watching how the balls behave',
        'dst.l2': "Compare light and heavy balls — whose 'inertia' is more noticeable",
        'dst.l3': 'Link what they see to real examples: seat belts, braking',
        'dst.k1t': 'Inertia', 'dst.k1s': "A body 'resists' a change in motion",
        'dst.k2t': 'Role of mass', 'dst.k2s': "Mass is a measure of a body's inertia",
        'dst.k3t': 'Link to life', 'dst.k3s': 'Transport, seat belts, safety',
        // weight in a liquid (Archimedes)
        'dar.title': 'Weight of a body in a liquid', 'dar.prin': "Buoyant force (Archimedes' force)",
        'dar.lead': "First the load is weighed in air, then lowered into water — and the scale shows less weight. The 'lost' weight is the Archimedes buoyant force.",
        'dar.p1': 'A body immersed in a liquid experiences an upward buoyant force. That is why a body weighs less in water than in air. The model lets you catch this difference on a dynamometer.',
        'dar.p2': "Liquid presses on the immersed body from all sides, but the pressure is greater below than above. This difference pushes the body up. The force equals the weight of the displaced liquid — which is why a steel ship floats while a nail sinks.",
        'dar.p3': 'The Archimedes force equals the liquid density (ρ) times the free-fall acceleration (g) and the volume of displaced liquid (V). Apparent weight = mg − F_A.',
        'dar.l1': 'Weigh the load in air and in water and compute the difference',
        'dar.l2': 'Check whether the buoyant force depends on the body volume',
        'dar.l3': 'Calculate the liquid density or the body volume from the formula',
        'dar.k1t': 'Buoyant force', 'dar.k1s': 'Where it comes from and what it depends on',
        'dar.k2t': 'Floating of bodies', 'dar.k2s': 'Why some sink and others float',
        'dar.k3t': 'Measurements', 'dar.k3s': 'Working with a dynamometer and calculations',
        // Brownian motion
        'dbr.title': 'Granular dynamics: Brownian motion', 'dbr.prin': 'Thermal motion of particles',
        'dbr.lead': 'On a vibrating table many balls move chaotically like gas molecules. Increase the vibration — the "temperature" rises and the motion becomes ever more disordered.',
        'dbr.p1': "Balls on a vibrating surface behave like molecules: they collide, scatter and move randomly. It is a mechanical model of Brownian motion and the thermal chaos you normally can't see.",
        'dbr.p2': 'Temperature is a measure of how fast and chaotically the particles of a substance move. The stronger the vibration (the higher the "temperature"), the more active the balls and the more often they hit the walls — that is how gas pressure arises.',
        'dbr.p3': "A particle's average kinetic energy is directly proportional to the absolute temperature T (k is the Boltzmann constant). Higher temperature — faster particle motion.",
        'dbr.l1': 'Change the vibration intensity — "heat" and "cool" the system',
        'dbr.l2': 'Watch how the chaos and the collision rate grow',
        'dbr.l3': 'Link particle motion to gas temperature and pressure',
        'dbr.k1t': 'What temperature is', 'dbr.k1s': 'At the level of particle motion',
        'dbr.k2t': 'Nature of pressure', 'dbr.k2s': 'Particles hitting the walls',
        'dbr.k3t': 'Randomness', 'dbr.k3s': 'The statistical nature of heat',
        // bicycle wheel (gyroscope)
        'dko.title': 'Bicycle wheel on a frame', 'dko.prin': 'Angular momentum · Gyroscope',
        'dko.lead': 'A spinning wheel stubbornly resists attempts to tilt its axis. This "gyroscopic" effect is what keeps a bicycle balanced.',
        'dko.p1': 'While the wheel is not spinning, it is easy to tilt in any direction. But once spun up, it resists changing the axis position and, when you try to tilt it, the axis turns sideways. This is a direct manifestation of the conservation of angular momentum.',
        'dko.p2': 'A rotating body has a "store of rotation" — angular momentum, which tends to keep its magnitude and direction. That is why a fast wheel stabilizes a bicycle, and gyroscopes are used in aircraft, phones and spacecraft.',
        'dko.p3': 'Angular momentum L equals the moment of inertia I times the angular velocity ω. With no external torques, L is conserved — the axis "holds" its direction.',
        'dko.l1': 'Compare the behavior of a still and a spinning wheel',
        'dko.l2': 'Try to tilt the axis and feel the gyroscopic torque',
        'dko.l3': 'Discuss why a moving bicycle is more stable than a standing one',
        'dko.k1t': 'Angular momentum', 'dko.k1s': 'What it is and why it is conserved',
        'dko.k2t': 'Gyroscopes', 'dko.k2s': 'Where they are used in technology',
        'dko.k3t': 'Balance', 'dko.k3s': 'Why a bicycle does not fall',
        // pulley system
        'dbl.title': 'Block (pulley) system', 'dbl.prin': 'Simple machines · Pulley block',
        'dbl.lead': 'With a system of pulleys you can lift a heavy load — or even yourself — with noticeably less effort. The model shows how simple machines give a force advantage.',
        'dbl.p1': 'The more pulleys and rope strands involved, the less force is needed to lift the load. But for the gain in force you pay in length — the rope has to be pulled that many times more.',
        'dbl.p2': 'Pulleys do not create energy from nothing — they only "redistribute" the effort. This is the golden rule of mechanics: as many times as you gain in force, you lose the same in distance. That is how cranes, winches and hoists work.',
        'dbl.p3': 'The applied force F is roughly the load weight P divided by the number of strands n carrying the movable pulley. The larger n — the easier to lift (ignoring friction).',
        'dbl.l1': 'Lift the same load through 1, 2 and more pulleys',
        'dbl.l2': 'Measure the effort and the length of rope pulled',
        'dbl.l3': 'Verify the golden rule of mechanics and compute the force gain',
        'dbl.k1t': 'Simple machines', 'dbl.k1s': 'Pulleys and pulley blocks',
        'dbl.k2t': 'Golden rule', 'dbl.k2s': 'Force in exchange for distance',
        'dbl.k3t': 'Applications', 'dbl.k3s': 'Cranes, winches, hoists',
        // set of metal weights (density)
        'dna.title': 'Set of metal weights', 'dna.prin': 'Density of a substance',
        'dna.lead': 'Weights of equal volume but made of different metals weigh differently. Comparing the mass, students "grasp" what density is.',
        'dna.p1': "Take two cubes of the same size — one aluminum, one steel. They look alike, but feel completely different in the hand. The reason is different density: the same volume 'packs' a different amount of substance.",
        'dna.p2': 'Density is "how heavy" a material is for an equal volume. It helps tell metals apart, check the composition of alloys and understand why a lead ball sinks while a wooden one of the same size floats.',
        'dna.p3': 'Density ρ equals the mass m divided by the volume V. Knowing the mass and volume of a weight, you can compute the density and identify the metal from a table.',
        'dna.l1': 'Weigh the loads and measure their volume',
        'dna.l2': 'Compute the density of each sample',
        'dna.l3': 'Identify the metal from a density table',
        'dna.k1t': 'Density', 'dna.k1s': 'A property of a substance, not of size',
        'dna.k2t': 'Link m, V, ρ', 'dna.k2s': 'How they depend on one another',
        'dna.k3t': 'Recognition', 'dna.k3s': 'Identifying material by calculation',
        // team page
        'tm.badge': 'The Visual Physics team', 'tm.h2': 'About our team',
        'tm.intro': 'Visual Physics is built by a small team of enthusiasts: model designers, developers, finance and SMM. Everyone owns their part — from the idea and engineering to rolling models out in schools.',
        'tm.stat1': 'members', 'tm.stat2': 'models', 'tm.stat3': 'partner schools',
        'tm.n1': 'Dmitry Pilyavsky', 'tm.n2': 'Dulat Tastanbay', 'tm.n3': 'Omirbek Tungyshbek', 'tm.n4': 'Elnur Nurkenova', 'tm.n5': 'Eldana Mulkibayeva',
        'tm.r1': 'Project lead & Designer', 'tm.r2': 'IT & Web development', 'tm.r3': 'Designer / Engineer', 'tm.r4': 'SMM & Designer', 'tm.r5': 'Finance & Procurement',
        'tm.d1': 'Leads the project and owns the engineering of the models.',
        'tm.d2': 'Develops and maintains the website, chatbot and the leads database.',
        'tm.d3': 'Designs and builds physical models for schools.',
        'tm.d4': 'Social media, content and help with designing models.',
        'tm.d5': 'Budget, materials procurement and team supply.',
        // catalog (object.html)
        'ob.badge': 'Model catalog', 'ob.h1': 'Projects and learning models', 'ob.filterAll': 'All models', 'ob.filterMech': 'Mechanics', 'ob.filterArch': 'Archimedes', 'ob.filterThermo': 'Thermodynamics', 'ob.filterDensity': 'Density', 'ob.count': 'models in catalog',
        'ob.sub': 'Ready-made physics setups for the school classroom. Each model shows one principle — clearly, safely and without special equipment.',
        'ob.t1': 'Chair with balls', 'ob.d1': "Visible inertia and Newton's laws: the base moves abruptly while the balls 'lag behind'.",
        'ob.t2': 'Weight of a body in a liquid (Archimedes’ force)', 'ob.d2': "The load is weighed in air and in water — the difference is the Archimedes buoyant force.",
        'ob.t3': 'Granular dynamics: Brownian motion', 'ob.d3': 'Balls on a vibrating table move chaotically like molecules — a model of thermal motion.',
        'ob.t4': 'Bicycle wheel on a frame', 'ob.d4': 'Gyroscopic effect: a spinning wheel resists tilting of its axis.',
        'ob.t5': 'Chair with rope and pulleys — a block system', 'ob.d5': 'A system of pulleys gives a force advantage — the golden rule of mechanics in action.',
        'ob.t6': 'Set of metal weights — density', 'ob.d6': 'Equal-volume weights from different metals: different mass — different density.'
      },
      kk: {
        'nav.team': 'Біздің команда', 'nav.projects': 'Жобаларымыз', 'nav.support': 'Жобаны қолдау', 'nav.cta': 'Мектебіңізге өтінім',
        'footer.tagline': 'Мақсатымыз — физиканы көрнекі модельдер, симуляциялар және тәжірибелер арқылы түсінікті ету.',
        'footer.team': 'Біздің команда', 'footer.projects': 'Жобаларымыз', 'footer.support': 'Жобаны қолдау', 'footer.request': 'Өтінім қалдыру',
        'hero.eyebrow': '✦ Мектептерге арналған білім жобасы',
        'hero.h1': 'Физиканы интерактивті визуализация мен тәжірибелер арқылы түсінікті етеміз',
        'hero.lead': 'Біз абстрактілі формулаларды көрнекі модельдерге, симуляциялар мен практикалық сабақтарға айналдырамыз — оқушылар жаттап алмай, шынымен түсінеді.',
        'hero.desc': 'Модельдеріміз тікелей мектептерге орнатылып, мұғалімдер сабақта қолданады — мұражайға бармай, қосымша жабдықсыз.',
        'hero.cta1': 'Мектебіңізге өтінім', 'hero.cta2': 'Жобаларды көру',
        'hero.stat1': 'дайын модель', 'hero.stat2': 'серіктес мектеп', 'hero.stat3': 'көрнекі әрі қауіпсіз',
        'why.h2': 'Неге маңызды',
        'why.intro': 'Көп оқушы физиканы «нашар» болғандықтан емес, оны тым абстрактілі түсіндіретіндіктен түсінбейді. Біз осы олқылықты жоямыз.',
        'why.c1t': 'Тым абстрактілі', 'why.c1d': 'Интуициясыз, нақты құбылыстармен байланыссыз формулалар',
        'why.c2t': 'Көрнекілік аз', 'why.c2d': 'Сыныпта көрнекі модельдер мен тәжірибелер жеткіліксіз',
        'why.c3t': 'Қызығушылық төмендейді', 'why.c3d': 'Оқушылар қызығушылығын жоғалтып, қателесуден қорқа бастайды',
        'give.h2': 'Visual Physics не береді',
        'give.intro': 'Біз мұғалімге енгізуге, оқушыға түсінуге оңай модельдер жасаймыз',
        'give.f1t': 'Интерактивті симуляциялар', 'give.f1d': 'Қозғалыс, толқын, оптика — елестету қиынды көрінетін етеді',
        'give.f2t': 'Түсінікті түсіндірмелер', 'give.f2d': 'Қысқа әрі нақты: мағынасы, мысалдары, жиі қателер',
        'give.f3t': 'Қауіпсіз модельдер', 'give.f3d': 'Модельдер оқушылар өздігінен пайдалануға толық қауіпсіз',
        'give.f4t': 'Тәжірибе мен модельдер', 'give.f4d': 'Көрнекі модельдер мен қондырғылар',
        'give.kpi1t': 'Жақсырақ түсіну', 'give.kpi1d': 'Интуиция және себеп-салдар байланысы',
        'give.kpi2t': 'Жоғары мотивация', 'give.kpi2d': 'Физика «тірі» болады',
        'give.kpi3t': 'Емтиханда сенімділік', 'give.kpi3d': 'Жаттау азаяды, мағына көбейеді',
        'give.note': '<strong>Осының бәрі — тікелей мектебіңізде.</strong> Visual Physics-тің физикалық модельдері мен интерактивті қондырғылары сыныпқа орнатылып, мұғалімдер әр сабақта пайдаланады. Сапарсыз, арнайы жабдықсыз.',
        'proj.h2': 'Жобаларымыз', 'proj.intro': 'Модельдер мен жобалардың мысалдары. Толық тізім — жобалар бетінде.',
        'proj.more': 'Толығырақ', 'proj.openall': 'Барлық жобаларды ашу',
        'proj.t1': 'Шарикті орындық', 'proj.d1': 'Көрнекі инерция: негіз қозғалады, ал шариктер «кешігеді».',
        'proj.t2': 'Дененің сұйықтықтағы салмағы', 'proj.d2': 'Суда жүк «жеңілдейді» — Архимед күші көрінеді.',
        'proj.t3': 'Броундық қозғалыс', 'proj.d3': 'Дірілдейтін үстелдегі шариктер молекула сияқты қозғалады — жылу моделі.',
        'proj.t4': 'Жақтаудағы велодөңгелек', 'proj.d4': 'Гироскоп: айналған дөңгелек осін ұстап, оқушыларды таңғалдырады.',
        'proj.t5': 'Блок жүйесі', 'proj.d5': 'Жүкті аз күшпен көтереміз — механиканың алтын ережесі.',
        'proj.t6': 'Металл жүктер жинағы', 'proj.d6': 'Бірдей көлем, әртүрлі масса — оқушылар тығыздықты «сезінеді».',
        'chip.mech': 'Механика', 'chip.arch': 'Архимед заңы', 'chip.thermo': 'Термодинамика', 'chip.density': 'Тығыздық',
        'mus.h2': 'Visual Physics-ке қалай келдік', 'mus.intro': 'Әлемдегі үздік ғылым мұражайларынан шабыт — әр мектепке.',
        'mus.p1': 'Әлемнің үздік ғылым мұражайларында физиканы жаттамайды — оны қолмен ұстайды. Келушілер экспонаттарды бұрап, итеріп, іске қосып, табиғат заңдарының қалай жұмыс істейтінін өздері көреді.',
        'mus.p2': 'Біз осы тәсілден шабыттанып: мұндай қондырғылар неге тек үлкен қалалардың мұражайларында ғана болуы керек деп ойладық. Осылай Visual Physics пайда болды — біз «ғылым мұражайын» тікелей сыныпқа әкелеміз.',
        'mus.p3': 'Әр модель — оқушы кәдімгі сабақта өзара әрекеттесетін шағын интерактивті экспонат.',
        'sch.h2': 'Біз ынтымақтасатын мектептер',
        'sup.h2': 'Жобаны қолдау', 'sup.intro': 'Сіздің үлесіңіз Visual Physics-ке кеңейіп, жаңа мектептерге жетуге көмектеседі.',
        'sup.atitle': 'Visual Physics-ті қолдау', 'sup.adesc': 'Қайырымдылық материалдар мен модельдерді жинауға жұмсалады. Кез келген үлес физиканы көбірек оқушыға түсінікті етуге көмектеседі', 'sup.abtn': 'Жобаны қолдау',
        'sup.btitle': 'Мектебіңізде Visual Physics керек пе?', 'sup.bdesc': 'Өтінім қалдырыңыз — хабарласып, модельдер мен іске қосу жоспарын ұсынамыз. Мемлекеттік және жеке мектептермен жұмыс істейміз', 'sup.bbtn': 'Өтінім қалдыру',
        'sup.othertitle': 'SM-нің басқа жобалары', 'sup.otherdesc': 'Visual Physics — SM жобаларының бірі. <br>SM-нің басқа жобалары:',
        'cta.title': 'Оқушыларға физиканы шынайы көрсетуге дайынсыз ба?', 'cta.sub': 'Өтінім қалдырыңыз — бағдарламаңызға модель таңдап, тікелей сыныпқа орнатамыз. Тегін әрі ешқандай міндеттемесіз.', 'cta.btn': 'Өтінім қалдыру',
        'c.badge': 'Мектептерге', 'c.title': 'Мектебіңізге<br>өтінім қалдырыңыз',
        'c.desc': 'Модельдер туралы айтып береміз, сыныптарыңызға жинақ таңдап, іске қосу жоспарын құрамыз. Ешқандай міндеттеме жоқ.',
        'c.perk1t': 'Бағдарламаға сай', 'c.perk1s': 'Қажет тақырып пен сыныптарға модельдер',
        'c.perk2t': 'Сыныпта орнату', 'c.perk2s': 'Орнатамыз және мұғалімдерді оқытамыз',
        'c.perk3t': 'Жылдам жауап', 'c.perk3s': 'Бірер күн ішінде хабарласамыз',
        'c.cardTitle': 'Өтінім қалдыру', 'c.cardSub': 'Форманы толтырыңыз — қоңырау шаламыз',
        'c.name': 'Аты', 'c.phone': 'Телефон', 'c.school': 'Мектеп атауы', 'c.role': 'Сіздің рөліңіз',
        'c.roleSelect': 'Рөлді таңдаңыз', 'c.roleTeacher': 'Физика мұғалімі', 'c.roleDirector': 'Директор / оқу ісі', 'c.roleParent': 'Ата-ана', 'c.roleOther': 'Басқа',
        'c.msg': 'Хабарлама', 'c.msgOpt': '(міндетті емес)', 'c.msgPh': 'Мысалы: 8–9 сыныптарға арналған механика модельдері қызықтырады',
        'c.submit': 'Өтінімді жіберу', 'c.note': 'Батырманы басу арқылы дербес деректерді өңдеуге келісесіз',
        't.title': 'Өтінім үшін рахмет!', 't.sub': 'Өтінішіңізді алдық, жақын арада хабарласамыз. Әзірше — жобаларымызды қарап шығыңыз немесе командамен танысыңыз.',
        't.home': 'Басты бетке', 't.projects': 'Жобаларды көру',
        // detail pages — shared
        'detail.back': 'Барлық жобалар', 'detail.principleLabel': 'Принципі',
        'detail.shows': 'Модель нені көрсетеді', 'detail.physics': 'Қарапайым тілмен физика',
        'detail.formula': 'Формула', 'detail.students': 'Оқушылар не істейді', 'detail.learns': 'Нені үйретеді',
        'detail.ctaTitle': 'Модель ұнады ма?', 'detail.ctaSub': 'Оны мектебіңізге орнатып, мұғалімдерге сабақта қалай қолдануды көрсетеміз.',
        'dtopic.mech': 'Тақырыбы: Механика', 'dtopic.arch': 'Тақырыбы: Архимед заңы', 'dtopic.thermo': 'Тақырыбы: Термодинамика', 'dtopic.density': 'Тақырыбы: Тығыздық',
        // шарикті орындық
        'dst.title': 'Шарикті орындық', 'dst.prin': 'Инерция · Ньютон заңдары',
        'dst.lead': 'Инерцияның көрнекі көрінісі: негіз кенет қозғалады немесе тоқтайды, ал шариктер «кешігеді» — өйткені өз күйін сақтауға тырысады.',
        'dst.p1': 'Шариктері бар платформаны кенет итергенде немесе тоқтатқанда, шариктер онымен бірден қозғалмайды — олар «кешігеді». Бұл — инерция: денеге күш әсер етпегенше, ол тыныштық немесе бірқалыпты қозғалыс күйін сақтайды.',
        'dst.p2': 'Дене неғұрлым ауыр болса, оның қозғалысын өзгерту соғұрлым қиын — масса инерттіліктің өлшемі. Сондықтан көлікте тежегенде бізді алға лақтырады, ал жылдамдағанда орындыққа басады. Модель осы көрінбейтін әсерді айқын етеді.',
        'dst.p3': 'Дененің үдеуі түсірілген күшке тура, ал массасына кері пропорционал (Ньютонның екінші заңы). Күш болмаса (F = 0) үдеу де жоқ — дене инерция бойынша қозғалады.',
        'dst.l1': 'Платформаны кенет қозғалтып, тоқтатып, шариктердің әрекетін бақылайды',
        'dst.l2': 'Жеңіл және ауыр шариктерді салыстырады — кімнің «инерциясы» байқалады',
        'dst.l3': 'Көргенін нақты мысалдармен байланыстырады: қауіпсіздік белдіктері, тежеу',
        'dst.k1t': 'Инерция', 'dst.k1s': 'Дене қозғалыс өзгерісіне «қарсылық» көрсетеді',
        'dst.k2t': 'Массаның рөлі', 'dst.k2s': 'Масса — дененің инерттілік өлшемі',
        'dst.k3t': 'Өмірмен байланыс', 'dst.k3s': 'Көлік, белдіктер, қауіпсіздік',
        // дененің сұйықтықтағы салмағы (Архимед)
        'dar.title': 'Дененің сұйықтықтағы салмағы', 'dar.prin': 'Кері итеруші күш (Архимед күші)',
        'dar.lead': 'Алдымен жүк ауада, содан кейін суда өлшенеді — таразы кіші салмақты көрсетеді. «Жоғалған» салмақ — Архимедтің кері итеруші күші.',
        'dar.p1': 'Сұйықтыққа батырылған денеге жоғары бағытталған кері итеруші күш әсер етеді. Сондықтан судағы дененің салмағы ауадағыдан аз болып көрінеді. Модель осы айырманы динамометрден көруге мүмкіндік береді.',
        'dar.p2': 'Сұйықтық батырылған денеге барлық жағынан қысым жасайды, бірақ төменнен қысым жоғарыдан көбірек. Осы айырма денені жоғары итереді. Күш ығыстырылған сұйықтықтың салмағына тең — сондықтан болат кеме батпайды, ал шеге түбіне кетеді.',
        'dar.p3': 'Архимед күші сұйықтық тығыздығына (ρ), еркін түсу үдеуіне (g) және ығыстырылған сұйықтық көлеміне (V) тең. Көрінетін салмақ = mg − F_A.',
        'dar.l1': 'Жүкті ауада және суда өлшеп, айырмасын есептейді',
        'dar.l2': 'Кері итеруші күш дене көлеміне тәуелді ме — тексереді',
        'dar.l3': 'Формула бойынша сұйықтық тығыздығын немесе дене көлемін есептейді',
        'dar.k1t': 'Кері итеруші күш', 'dar.k1s': 'Қайдан шығады және неге тәуелді',
        'dar.k2t': 'Денелердің жүзуі', 'dar.k2s': 'Неге біреуі батады, екіншісі жүзеді',
        'dar.k3t': 'Өлшеулер', 'dar.k3s': 'Динамометрмен жұмыс және есептеулер',
        // броундық қозғалыс
        'dbr.title': 'Гранулярлық динамика: броундық қозғалыс', 'dbr.prin': 'Бөлшектердің жылулық қозғалысы',
        'dbr.lead': 'Дірілдейтін үстелде көптеген шарик газ молекулалары сияқты ретсіз қозғалады. Дірілді күшейтсең — «температура» өсіп, қозғалыс барған сайын ретсіз болады.',
        'dbr.p1': 'Дірілдейтін беттегі шариктер молекулалар сияқты әрекет етеді: соқтығысады, шашырайды, ретсіз қозғалады. Бұл — броундық қозғалыстың және әдетте көзге көрінбейтін жылулық хаостың механикалық моделі.',
        'dbr.p2': 'Температура — зат бөлшектерінің қаншалықты жылдам әрі ретсіз қозғалатынының өлшемі. Діріл неғұрлым күшті болса («температура» жоғары), шариктер соғұрлым белсенді әрі қабырғаларға жиі соғылады — газ қысымы осылай пайда болады.',
        'dbr.p3': 'Бөлшектің орташа кинетикалық энергиясы абсолют температураға T тура пропорционал (k — Больцман тұрақтысы). Температура жоғары болса — бөлшектер жылдам қозғалады.',
        'dbr.l1': 'Діріл қарқынын өзгертеді — жүйені «қыздырады» және «суытады»',
        'dbr.l2': 'Хаос пен соқтығысу жиілігінің қалай өсетінін бақылайды',
        'dbr.l3': 'Бөлшектер қозғалысын газдың температурасы мен қысымымен байланыстырады',
        'dbr.k1t': 'Температура дегеніміз не', 'dbr.k1s': 'Бөлшектер қозғалысы деңгейінде',
        'dbr.k2t': 'Қысым табиғаты', 'dbr.k2s': 'Бөлшектердің қабырғаға соғылуы',
        'dbr.k3t': 'Кездейсоқтық', 'dbr.k3s': 'Жылудың статистикалық табиғаты',
        // велодөңгелек (гироскоп)
        'dko.title': 'Жақтаудағы велодөңгелек', 'dko.prin': 'Импульс моменті · Гироскоп',
        'dko.lead': 'Айналған дөңгелек өз осін еңкейтуге қыңырлықпен қарсылық көрсетеді. Дәл осы «гироскоптық» әсер велосипедті тепе-теңдікте ұстайды.',
        'dko.p1': 'Дөңгелек айналмай тұрғанда оны кез келген бағытта еңкейту оңай. Бірақ айналдырғаннан кейін ол ось орнын өзгертуге қарсылық көрсетеді, ал еңкейтуге тырысқанда осін бүйірге бұрады. Бұл — импульс моментінің сақталуының тікелей көрінісі.',
        'dko.p2': 'Айналып тұрған денеде «айналу қоры» — импульс моменті бар, ол шамасы мен бағытын сақтауға тырысады. Сондықтан жылдам дөңгелек велосипедті тұрақтандырады, ал гироскоптар ұшақтарда, телефондарда және ғарыш аппараттарында қолданылады.',
        'dko.p3': 'Импульс моменті L инерция моменті I мен бұрыштық жылдамдық ω көбейтіндісіне тең. Сыртқы күш моменттері болмаса, L сақталады — ось бағытын «ұстайды».',
        'dko.l1': 'Қозғалмайтын және айналған дөңгелектің әрекетін салыстырады',
        'dko.l2': 'Осін еңкейтіп көріп, гироскоптық моментті сезінеді',
        'dko.l3': 'Жүріп келе жатқан велосипед неге тұрақтырақ екенін талқылайды',
        'dko.k1t': 'Импульс моменті', 'dko.k1s': 'Бұл не және неге сақталады',
        'dko.k2t': 'Гироскоптар', 'dko.k2s': 'Техникада қайда қолданылады',
        'dko.k3t': 'Тепе-теңдік', 'dko.k3s': 'Велосипед неге құламайды',
        // блок жүйесі
        'dbl.title': 'Блок жүйесі', 'dbl.prin': 'Қарапайым механизмдер · Полиспаст',
        'dbl.lead': 'Блоктар жүйесімен ауыр жүкті — тіпті өзіңді де — әлдеқайда аз күшпен көтеруге болады. Модель қарапайым механизмдер күштен қалай ұтыс беретінін көрсетеді.',
        'dbl.p1': 'Неғұрлым көп блок пен жіп қатысса, жүкті көтеруге соғұрлым аз күш қажет. Бірақ күштен ұтыс үшін ұзындықпен төлейсің — жіпті сонша есе көп тарту керек.',
        'dbl.p2': 'Блоктар энергияны жоқтан жасамайды — олар тек күшті «қайта бөледі». Бұл — механиканың алтын ережесі: күштен неше есе ұтсаң, қашықтықтан сонша есе ұтыласың. Крандар, шығырлар мен көтергіштер осылай жұмыс істейді.',
        'dbl.p3': 'Түсірілетін күш F шамамен жүк салмағы P-ні жылжымалы блокты ұстап тұрған жіптер саны n-ге бөлгенге тең. n неғұрлым көп — көтеру соғұрлым жеңіл (үйкеліссіз).',
        'dbl.l1': 'Бір жүкті 1, 2 және одан көп блок арқылы көтереді',
        'dbl.l2': 'Күш пен тартылған жіп ұзындығын өлшейді',
        'dbl.l3': 'Механиканың алтын ережесін тексеріп, күш ұтысын есептейді',
        'dbl.k1t': 'Қарапайым механизмдер', 'dbl.k1s': 'Блоктар мен полиспасттар',
        'dbl.k2t': 'Алтын ереже', 'dbl.k2s': 'Қашықтық есебінен күш',
        'dbl.k3t': 'Қолданылуы', 'dbl.k3s': 'Крандар, шығырлар, көтергіштер',
        // металл жүктер жинағы (тығыздық)
        'dna.title': 'Металл жүктер жинағы', 'dna.prin': 'Заттың тығыздығы',
        'dna.lead': 'Көлемі бірдей, бірақ әртүрлі металдан жасалған жүктер әртүрлі салмаққа ие. Массаны салыстыра отырып, оқушылар тығыздық дегеннің не екенін «ұстайды».',
        'dna.p1': 'Өлшемі бірдей екі текшені алыңыз — бірі алюминийден, бірі болаттан. Сырттай ұқсас, бірақ қолда мүлде басқаша сезіледі. Себебі — әртүрлі тығыздық: бірдей көлемге әртүрлі мөлшерде зат «оралған».',
        'dna.p2': 'Тығыздық — материалдың бірдей көлемде «қаншалықты ауыр» екені. Ол металдарды ажыратуға, қорытпалар құрамын тексеруге және неге қорғасын шарик батып, дәл сондай ағаш шарик жүзетінін түсінуге көмектеседі.',
        'dna.p3': 'Тығыздық ρ масса m-ді көлем V-ге бөлгенге тең. Жүктің массасы мен көлемін біле отырып, тығыздықты есептеп, кесте бойынша металды анықтауға болады.',
        'dna.l1': 'Жүктерді өлшеп, көлемін анықтайды',
        'dna.l2': 'Әр үлгінің тығыздығын есептейді',
        'dna.l3': 'Тығыздық кестесі бойынша металды анықтайды',
        'dna.k1t': 'Тығыздық', 'dna.k1s': 'Өлшемнің емес, заттың қасиеті',
        'dna.k2t': 'm, V, ρ байланысы', 'dna.k2s': 'Олар бір-біріне қалай тәуелді',
        'dna.k3t': 'Тану', 'dna.k3s': 'Материалды есептеу арқылы анықтау',
        // команда
        'tm.badge': 'Visual Physics командасы', 'tm.h2': 'Біздің команда туралы',
        'tm.intro': 'Visual Physics-ті энтузиастардың шағын командасы жасайды: модель жобалаушылары, әзірлеушілер, қаржы және SMM. Әрқайсысы өз бөлігіне жауапты — идея мен инженериядан мектептерге модель енгізуге дейін.',
        'tm.stat1': 'қатысушы', 'tm.stat2': 'модель', 'tm.stat3': 'серіктес мектеп',
        'tm.n1': 'Пилявский Дмитрий', 'tm.n2': 'Дулат Тастанбай', 'tm.n3': 'Омирбек Тунгышбек', 'tm.n4': 'Нуркенова Елнур', 'tm.n5': 'Эльдана Мулкибаева',
        'tm.r1': 'Жоба жетекшісі & Жобалаушы', 'tm.r2': 'IT & Веб-әзірлеу', 'tm.r3': 'Жобалаушы', 'tm.r4': 'SMM & Жобалаушы', 'tm.r5': 'Қаржы & Сатып алу',
        'tm.d1': 'Жобаны басқарады және модельдердің инженерлік бөлігіне жауап береді.',
        'tm.d2': 'Сайтты, чат-ботты және өтінімдер базасын әзірлейді әрі қолдайды.',
        'tm.d3': 'Мектептерге физикалық модельдер жобалайды және құрастырады.',
        'tm.d4': 'Әлеуметтік желілер, контент және модельдерді жобалауға қатысу.',
        'tm.d5': 'Бюджет, материалдар сатып алу және команданы жабдықтау.',
        // каталог (object.html)
        'ob.badge': 'Модельдер каталогы', 'ob.h1': 'Жобалар мен оқу модельдері', 'ob.filterAll': 'Барлық модельдер', 'ob.filterMech': 'Механика', 'ob.filterArch': 'Архимед', 'ob.filterThermo': 'Термодинамика', 'ob.filterDensity': 'Тығыздық', 'ob.count': 'модель каталогта',
        'ob.sub': 'Мектеп сыныбына арналған дайын физикалық қондырғылар. Әр модель бір принципті көрсетеді — көрнекі, қауіпсіз және арнайы жабдықсыз.',
        'ob.t1': 'Шарикті орындық', 'ob.d1': 'Көрнекі инерция және Ньютон заңдары: негіз кенет қозғалады, ал шариктер «кешігеді».',
        'ob.t2': 'Дененің сұйықтықтағы салмағы (Архимед күші)', 'ob.d2': 'Жүк ауада және суда өлшенеді — айырма дегеніміз Архимедтің кері итеруші күші.',
        'ob.t3': 'Гранулярлық динамика: броундық қозғалыс', 'ob.d3': 'Дірілдейтін үстелдегі шариктер молекула сияқты ретсіз қозғалады — жылулық қозғалыс моделі.',
        'ob.t4': 'Жақтаудағы велодөңгелек', 'ob.d4': 'Гироскоптық әсер: айналған дөңгелек ось еңкеюіне қарсылық көрсетеді.',
        'ob.t5': 'Жіп пен блоктары бар орындық — блок жүйесі', 'ob.d5': 'Блоктар жүйесі күштен ұтыс береді — механиканың алтын ережесі көрнекі түрде.',
        'ob.t6': 'Металл жүктер жинағы — тығыздық', 'ob.d6': 'Көлемі бірдей, әртүрлі металдан жасалған жүктер: әртүрлі масса — әртүрлі тығыздық.'
      }
    };

    var RU = {};
    function capture() {
      document.querySelectorAll('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (RU[k] == null) RU[k] = el.textContent; });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (RU[k] == null) RU[k] = el.innerHTML; });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { var k = el.getAttribute('data-i18n-ph'); if (RU[k] == null) RU[k] = el.getAttribute('placeholder'); });
    }
    function tr(lang, k) { if (lang === 'ru') return RU[k]; var d = DICT[lang]; return (d && d[k] != null) ? d[k] : RU[k]; }
    function apply(lang) {
      if (lang !== 'ru' && lang !== 'en' && lang !== 'kk') lang = 'ru';
      document.documentElement.setAttribute('lang', lang);
      document.querySelectorAll('[data-i18n]').forEach(function (el) { var v = tr(lang, el.getAttribute('data-i18n')); if (v != null) el.textContent = v; });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) { var v = tr(lang, el.getAttribute('data-i18n-html')); if (v != null) el.innerHTML = v; });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { var v = tr(lang, el.getAttribute('data-i18n-ph')); if (v != null) el.setAttribute('placeholder', v); });
      try { localStorage.setItem('vp_lang', lang); } catch (e) {}
      Array.prototype.forEach.call(document.querySelectorAll('.vp-lang__btn'), function (b) {
        var on = b.getAttribute('data-lang') === lang;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      try { document.dispatchEvent(new CustomEvent('vp:lang', { detail: lang })); } catch (e) {}
    }

    var inner = document.querySelector('.header__inner');
    if (inner) {
      var wrap = document.createElement('div');
      wrap.className = 'vp-lang';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Язык / Тіл / Language');
      [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']].forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'vp-lang__btn'; b.setAttribute('data-lang', l[0]); b.textContent = l[1];
        b.addEventListener('click', function () { apply(l[0]); });
        wrap.appendChild(b);
      });
      var toggle = inner.querySelector('.nav-toggle');
      if (toggle) inner.insertBefore(wrap, toggle); else inner.appendChild(wrap);
    }

    capture();
    var saved = 'ru';
    try { saved = localStorage.getItem('vp_lang') || 'ru'; } catch (e) {}
    apply(saved);
  })();

})();
