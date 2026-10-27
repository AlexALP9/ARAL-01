/*
 * Связывает утверждённые черновики в один сайт, не изменяя их.
 * Адрес сайта: index.html#/<раздел>. Черновик открывается во фрейме на весь экран;
 * клики по меню и межстраничным ссылкам внутри черновика перехватываются здесь.
 */
(function () {
  'use strict';

  var frame = document.getElementById('page');

  // Раздел сайта → черновик и его собственный адрес внутри файла.
  function resolve(path) {
    var m = path.match(/^\/product\/(ARAL-\d{3})$/);
    if (m) return { file: 'pages/products.html', frag: '#/product/' + m[1] };
    switch (path) {
      case '/company': return { file: 'pages/v8.html', frag: '#company' };
      case '/interesting': return { file: 'pages/v8.html', frag: '#interesting' };
      case '/catalog': return { file: 'pages/products.html', frag: '#/catalog' };
      case '/compare': return { file: 'pages/products.html', frag: '#/compare' };
      case '/drivers': return { file: 'pages/drivers.html', frag: '' };
      case '/partners': return { file: 'pages/partners.html', frag: '' };
      case '/advantages': return { file: 'pages/advantages.html', frag: '' };
      case '/contacts': return { file: 'pages/contacts.html', frag: '' };
      case '/where': return { file: 'pages/contacts.html', frag: '#contacts-stores' };
      default: return null;
    }
  }

  // Пункты главного меню черновиков (в части черновиков они без href) — по тексту.
  var LABELS = {
    'Компания': '/company', 'Продукция': '/catalog', 'Для водителей': '/drivers',
    'Для партнёров': '/partners', 'Преимущества ARAL': '/advantages',
    'Интересное': '/interesting', 'Контакты': '/contacts'
  };
  // Маршруты меню V8 (#company …) и прототипа Продукции (#/company …).
  var V8_ROUTES = {
    company: '/company', products: '/catalog', drivers: '/drivers', partners: '/partners',
    advantages: '/advantages', interesting: '/interesting', contacts: '/contacts'
  };
  // Разделы, которые прототип Продукции обрабатывает сам (каталог, карточка, сравнение).
  var CATALOG_INTERNAL = /^#\/(catalog|compare|product\/)/;
  // Черновики ссылаются на прежний сайт — ведём в соответствующий раздел этого сайта.
  var OLD_SITE = /^https?:\/\/alexalp9\.github\.io\/ARAL-\/?#(\/[^?]*)/i;

  function currentPath() {
    var p = decodeURIComponent(location.hash.replace(/^#/, '')) || '/company';
    return resolve(p) ? p : '/company';
  }

  var loadedFile = null;

  function show() {
    var path = currentPath();
    var target = resolve(path);
    var win = frame.contentWindow;
    if (loadedFile === target.file && win) {
      // Тот же черновик: меняем только его собственный адрес (без перезагрузки и лишней записи в истории).
      if (win.location.hash !== target.frag) win.location.replace(target.file + target.frag);
      if (!target.frag) win.scrollTo(0, 0);
    } else {
      loadedFile = target.file;
      if (win && frame.getAttribute('src')) win.location.replace(target.file + target.frag);
      else frame.src = target.file + target.frag;
    }
  }

  function go(path) {
    if (('#' + path) === location.hash) show();
    else location.hash = path;
  }

  function routeForLink(el, doc) {
    var a = el.closest('a');
    var inMenu = el.closest('header nav, header .menu, .nav .menu, nav.menu, .site-nav, .topnav');
    var href = a ? a.getAttribute('href') : null;

    if (href) {
      var old = href.match(OLD_SITE);
      if (old && resolve(old[1])) return old[1];
      if (/^#\/[a-z]/.test(href)) {
        // Внутри прототипа Продукции его разделы работают сами.
        if (loadedFile === 'pages/products.html' && CATALOG_INTERNAL.test(href)) return null;
        var p = href.slice(1);
        return resolve(p) ? p : null;
      }
      if (loadedFile === 'pages/v8.html' && /^#[a-z]+$/.test(href) && V8_ROUTES[href.slice(1)]) return V8_ROUTES[href.slice(1)];
    }
    if (inMenu) {
      var label = (a || el).textContent.replace(/\s+/g, ' ').trim();
      if (LABELS[label]) return LABELS[label];
    }
    return undefined;
  }

  function wire() {
    var win = frame.contentWindow;
    var doc;
    try { doc = frame.contentDocument; } catch (e) { return; }
    if (!doc || doc.__aralWired) return;
    doc.__aralWired = true;
    loadedFile = (win.location.pathname.match(/pages\/[^/]+$/) || [loadedFile])[0];

    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var el = e.target && e.target.closest ? e.target : e.target.parentElement;
      if (!el) return;
      var path = routeForLink(el, doc);
      if (path) {
        e.preventDefault();
        e.stopPropagation();
        go(path);
        return;
      }
      // Внешние ссылки и tel:/mailto: без новой вкладки открываем во всём окне, а не во фрейме.
      var a = el.closest('a[href]');
      if (a && !a.target && /^(https?:|tel:|mailto:)/i.test(a.getAttribute('href')) && a.origin !== location.origin) {
        e.preventDefault();
        window.location.href = a.href;
      }
    }, true);

    // Разделы Продукции переключаются внутри черновика — отражаем их в адресе сайта.
    win.addEventListener('hashchange', function () { syncFromFrame(); });
    syncFromFrame();
  }

  function syncFromFrame() {
    var win = frame.contentWindow;
    try { document.title = frame.contentDocument.title || 'ARAL'; } catch (e) { /* ignore */ }
    if (loadedFile !== 'pages/products.html') return;
    var h = win.location.hash;
    var path = h === '#/compare' ? '/compare' : (h.match(/^#(\/product\/ARAL-\d{3})/) || [])[1] || (h.indexOf('#/catalog') === 0 || !h ? '/catalog' : null);
    if (path && ('#' + path) !== location.hash) history.replaceState(null, '', '#' + path);
  }

  frame.addEventListener('load', wire);
  window.addEventListener('hashchange', show);
  if (!location.hash || !resolve(decodeURIComponent(location.hash.slice(1)))) history.replaceState(null, '', '#/company');
  show();
})();
