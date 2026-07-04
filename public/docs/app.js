/* ===== Apocalypse Hub Docs — interactions ===== */
(function () {
  const pages = document.querySelectorAll('.doc-page');
  const navLinks = document.querySelectorAll('.nav-link');
  const content = document.getElementById('content');
  const tocList = document.getElementById('tocList');

  /* ---------- Page routing ---------- */
  function showPage(id, push) {
    const page = document.getElementById(id);
    if (!page) return;
    pages.forEach(p => p.classList.remove('active'));
    page.classList.add('active');

    navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === id));

    buildToc(page);
    content.scrollTo ? content.scrollTo(0, 0) : window.scrollTo(0, 0);
    window.scrollTo(0, 0);
    closeSidebar();

    if (push !== false) history.replaceState(null, '', '#' + id);
  }

  /* Delegate all [data-page] clicks (nav, cards, links, footer, brand) */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-page]');
    if (el) {
      e.preventDefault();
      showPage(el.dataset.page);
    }
  });

  /* ---------- Build "On this page" TOC ---------- */
  function buildToc(page) {
    tocList.innerHTML = '';
    const heads = page.querySelectorAll('h2, h3');
    if (!heads.length) { document.getElementById('toc').style.visibility = 'hidden'; return; }
    document.getElementById('toc').style.visibility = 'visible';
    heads.forEach(h => {
      if (!h.id) h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      if (h.tagName === 'H3') a.classList.add('sub');
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tocList.appendChild(a);
    });
    setupScrollSpy(page, heads);
  }

  /* ---------- Scroll spy for TOC ---------- */
  let spyObserver = null;
  function setupScrollSpy(page, heads) {
    if (spyObserver) spyObserver.disconnect();
    const links = tocList.querySelectorAll('a');
    spyObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
        }
      });
    }, { rootMargin: '-70px 0px -70% 0px', threshold: 0 });
    heads.forEach(h => spyObserver.observe(h));
  }

  /* ---------- Response tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(group => {
    const btns = group.querySelectorAll('.tab-btn');
    const panels = group.querySelectorAll('.tab-panel');
    btns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        if (panels[i]) panels[i].classList.add('active');
      });
    });
  });

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pre = btn.closest('.code-wrap').querySelector('pre');
      const text = pre ? pre.innerText : '';
      navigator.clipboard.writeText(text).then(() => {
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = '#34c77b';
        setTimeout(() => { btn.textContent = old; btn.style.color = ''; }, 1400);
      }).catch(() => {});
    });
  });

  /* ---------- Search filter ---------- */
  const search = document.getElementById('search');
  search.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    document.querySelectorAll('.nav-group').forEach(group => {
      let anyVisible = false;
      group.querySelectorAll('.nav-link').forEach(link => {
        const match = link.textContent.toLowerCase().includes(q);
        link.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      group.style.display = anyVisible ? '' : 'none';
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')); search.blur(); }
  });

  /* ---------- Mobile sidebar ---------- */
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
  menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  overlay.addEventListener('click', closeSidebar);

  /* ---------- Init from hash ---------- */
  const initial = location.hash.replace('#', '');
  showPage(document.getElementById(initial) ? initial : 'introduction', false);
})();
