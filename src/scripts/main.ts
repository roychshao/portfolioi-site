// main.ts — the page's only behavior script (module → deferred until DOM is parsed).
// Owns: the html.js class (fail-open contract: every hidden state is gated on .js,
// see global.css), the case accordion (button[data-case-toggle] + sibling
// div[data-case-panel]), #case-<id> deep links, .reveal scroll-reveal, and the
// nav-menu a11y sync (deferred Task 4 minors: aria-expanded on focus moves + Escape).

const doc = document;
doc.documentElement.classList.add('js');

// --- case accordion --------------------------------------------------------
type Toggle = HTMLButtonElement;
const toggles = Array.from(doc.querySelectorAll<Toggle>('[data-case-toggle]'));

// Markup contract: button[data-case-toggle] + div[data-case-panel] are siblings
// in the article's header; fall back to the whole article for robustness.
const panelFor = (btn: Element): HTMLElement | null =>
  btn.parentElement?.querySelector<HTMLElement>('[data-case-panel]') ??
  btn.closest('article')?.querySelector<HTMLElement>('[data-case-panel]') ??
  null;

function setOpen(btn: Toggle, open: boolean): void {
  const panel = panelFor(btn);
  if (!panel) return;
  btn.setAttribute('aria-expanded', String(open));
  panel.hidden = !open; // `hidden` attr: no-JS/CSS keeps semantics, not max-height hacks
}

for (const btn of toggles) {
  btn.addEventListener('click', () =>
    setOpen(btn, btn.getAttribute('aria-expanded') !== 'true'));
}

// --- deep links --------------------------------------------------------------
// On load and on hashchange: if the hash is #case-<id>, open that panel, close
// the others, scroll the card into view. Unknown or empty hash: leave state as
// is — everything stays closed on a cold load with no matching hash.
function applyHash(): void {
  const m = /^#case-([\w-]+)$/.exec(window.location.hash || '');
  if (!m) return;
  const hit = toggles.find((btn) => btn.closest(`[data-case-id="${m[1]}"]`));
  if (!hit) return; // unknown case id: leave all closed
  for (const btn of toggles) setOpen(btn, btn === hit);
  hit.closest('article')?.scrollIntoView({ block: 'start' });
}
window.addEventListener('hashchange', applyHash);
applyHash();

// --- scroll reveal ------------------------------------------------------------
// Reveal .reveal blocks once, then unobserve. No IntersectionObserver (or none
// supported) → reveal everything immediately: never trap content in the hidden state.
const revealEls = Array.from(doc.querySelectorAll<HTMLElement>('.reveal'));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -5% 0px' },
  );
  for (const el of revealEls) io.observe(el);
} else {
  for (const el of revealEls) el.classList.add('is-visible');
}

// --- nav menu a11y sync (Task 4 deferred minors) ------------------------------
// The :focus-within CSS reveal is the no-JS fallback; with JS present, keep
// aria-expanded honest for AT and add Escape-to-close with focus return.
const navBtn = doc.getElementById('nav-toggle');
const navMenu = doc.getElementById('nav-menu');
if (navBtn instanceof HTMLElement && navMenu) {
  const capsule = navMenu.closest('nav');
  const setNav = (open: boolean): void => {
    navBtn.setAttribute('aria-expanded', String(open));
    navMenu.classList.toggle('is-open', open);
  };
  // The hamburger is display:none on desktop; offsetParent is null there,
  // so these handlers only act while the collapsible layout is in effect.
  const collapsible = () => navBtn.offsetParent !== null;
  navMenu.addEventListener('focusin', () => {
    if (collapsible()) setNav(true);
  });
  capsule?.addEventListener('focusout', (e: FocusEvent) => {
    if (collapsible() && !capsule.contains(e.relatedTarget as Node | null)) setNav(false);
  });
  doc.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && navBtn.getAttribute('aria-expanded') === 'true') {
      setNav(false);
      if (collapsible()) navBtn.focus();
    }
  });
}
