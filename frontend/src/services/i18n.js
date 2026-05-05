const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS', 'SVG', 'PATH', 'KBD']);
const ATTRIBUTE_NAMES = ['placeholder', 'aria-label', 'data-tooltip', 'title'];

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function keepCase(source, translated) {
  if (!translated) return source;
  if (source === source.toUpperCase() && /[A-Z]/.test(source)) return translated.toUpperCase();
  if (source[0] === source[0]?.toUpperCase()) return translated[0].toUpperCase() + translated.slice(1);
  return translated;
}

function translateByWords(text, words = {}) {
  return text.replace(/\b[A-Za-z][A-Za-z-]*\b/g, (token) => {
    const translated = words[token.toLowerCase()];
    return translated ? keepCase(token, translated) : token;
  });
}

export function createTranslator(state, log) {
  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  let packs = {};
  let observer = null;
  let applying = false;

  function activePack() {
    return packs[state.language] || packs.en || { phrases: {}, words: {} };
  }

  function translateText(text) {
    const pack = activePack();
    if (!text || state.language === 'en') return text;
    const trimmed = normalize(text);
    if (!trimmed) return text;
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    const exact = pack.phrases?.[trimmed] || pack.phrases?.[trimmed.toUpperCase()];
    if (exact) return `${leading}${exact}${trailing}`;
    return `${leading}${translateByWords(trimmed, pack.words)}${trailing}`;
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || SKIP_TEXT_TAGS.has(parent.tagName)) return;
    const original = textOriginals.get(node) || node.nodeValue;
    textOriginals.set(node, original);
    const next = translateText(original);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    const originals = attrOriginals.get(element) || {};
    ATTRIBUTE_NAMES.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      originals[name] ||= element.getAttribute(name);
      const next = translateText(originals[name]);
      if (element.getAttribute(name) !== next) element.setAttribute(name, next);
    });
    attrOriginals.set(element, originals);
  }

  function walk(root = document.body) {
    if (!root) return;
    applying = true;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')];
    elements.forEach(translateAttributes);
    document.documentElement.lang = state.language || 'en';
    document.body.dataset.language = state.language || 'en';
    applying = false;
  }

  async function load() {
    try {
      const payload = await fetch('/config/languages.json', { cache: 'no-store' }).then((response) => response.json());
      packs = payload.languages || {};
    } catch {
      packs = { en: { label: 'English', phrases: {}, words: {} } };
      log?.push?.('LANGUAGE PACK CONFIG UNAVAILABLE // USING ENGLISH');
    }
  }

  function observe() {
    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      if (applying || state.language === 'en') return;
      window.requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
            if (node.nodeType === Node.ELEMENT_NODE) walk(node);
          });
          if (mutation.type === 'characterData') translateTextNode(mutation.target);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  return {
    async init() {
      await load();
      observe();
      walk(document.body);
    },
    apply(scope = document.body) {
      walk(scope);
    },
    languages() {
      return Object.entries(packs).map(([id, pack]) => ({ id, label: pack.label || id }));
    },
  };
}
