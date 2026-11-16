/*
 * Tribe World — faithful HUD capture
 * Renders the real #res and #bot DOM trees through SVG foreignObject instead
 * of redrawing text/icons by hand. Computed styles, SVGs, pseudo-elements,
 * borders, gradients, shadows, font settings and layout are retained.
 * The WebGL scene remains the original renderer canvas.
 */
export function createHudCapture(src, roots) {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d', { alpha: false });
  const scaleX = () => out.width / Math.max(1, innerWidth);
  const scaleY = () => out.height / Math.max(1, innerHeight);
  const layers = new Map();
  const jobs = new Map();
  let last = 0;
  let stopped = false;

  const px = n => Number.parseFloat(n) || 0;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function copyComputed(source, target, pseudo = null) {
    const cs = getComputedStyle(source, pseudo);
    let css = '';
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      // Backdrop blur is painted from the actual game canvas below. Keeping it
      // in the isolated SVG would blur transparency instead of the 3D scene.
      if (name === 'backdrop-filter' || name === '-webkit-backdrop-filter') continue;
      const value = cs.getPropertyValue(name);
      if (value) css += `${name}:${value};`;
    }
    target.setAttribute('style', css);
    return cs;
  }

  function pseudoNode(source, which) {
    const cs = getComputedStyle(source, which);
    const content = cs.content;
    if (!content || content === 'none' || content === 'normal' || content === '""' || content === "''") return null;
    const node = document.createElement('span');
    let css = '';
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name === 'content' || name === 'backdrop-filter' || name === '-webkit-backdrop-filter') continue;
      const value = cs.getPropertyValue(name);
      if (value) css += `${name}:${value};`;
    }
    node.setAttribute('style', css);
    // Most pseudo-elements in this HUD use plain textual/symbol content.
    if ((content[0] === '"' && content.at(-1) === '"') || (content[0] === "'" && content.at(-1) === "'")) {
      node.textContent = content.slice(1, -1).replace(/\\A/g, '\n').replace(/\\(["'])/g, '$1');
    }
    return node;
  }

  function cloneStyled(source) {
    const clone = source.cloneNode(false);
    copyComputed(source, clone);

    if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement || source instanceof HTMLSelectElement) {
      try { clone.value = source.value; } catch (_) {}
      if (source instanceof HTMLInputElement && (source.type === 'checkbox' || source.type === 'radio')) clone.checked = source.checked;
    }

    if (source instanceof HTMLCanvasElement) {
      try {
        const image = document.createElement('img');
        image.src = source.toDataURL('image/png');
        image.setAttribute('style', `width:${source.width}px;height:${source.height}px;`);
        return image;
      } catch (_) { return clone; }
    }

    const before = pseudoNode(source, '::before');
    if (before) clone.appendChild(before);
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) clone.appendChild(document.createTextNode(child.nodeValue || ''));
      else if (child.nodeType === Node.ELEMENT_NODE) clone.appendChild(cloneStyled(child));
    }
    const after = pseudoNode(source, '::after');
    if (after) clone.appendChild(after);
    return clone;
  }

  function roundedPath(c, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Paint the real scene blurred behind translucent glass HUD cards. The
  // overlay SVG itself is rendered separately, so backdrop-filter needs this.
  function paintBackdropFilters(root) {
    const sx = scaleX(), sy = scaleY();
    const all = [root, ...root.querySelectorAll('*')];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const filter = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
      if (!filter || filter === 'none') continue;
      const m = filter.match(/blur\(([-\d.]+)px\)/i);
      const blur = m ? Math.max(0, px(m[1])) : 0;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const x = r.left * sx, y = r.top * sy, w = r.width * sx, h = r.height * sy;
      const rad = px(cs.borderTopLeftRadius) * Math.min(sx, sy);
      ctx.save();
      roundedPath(ctx, x, y, w, h, rad);
      ctx.clip();
      ctx.filter = `${blur ? `blur(${blur * Math.max(sx, sy)}px)` : ''} ${filter.includes('saturate') ? filter.match(/saturate\([^)]*\)/)[0] : ''}`.trim() || 'none';
      // Draw a slightly expanded source region to avoid clear edges after blur.
      const pad = Math.ceil(blur * 2 * Math.max(sx, sy));
      ctx.drawImage(src, Math.max(0, x - pad), Math.max(0, y - pad), Math.min(src.width, w + pad * 2), Math.min(src.height, h + pad * 2), Math.max(0, x - pad), Math.max(0, y - pad), Math.min(src.width, w + pad * 2), Math.min(src.height, h + pad * 2));
      ctx.restore();
    }
    ctx.filter = 'none';
  }

  function renderRoot(selector, el) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return;
    let state = layers.get(selector);
    if (!state) {
      state = { canvas: document.createElement('canvas'), busy: false, visible: false, x: 0, y: 0, w: 0, h: 0, url: null };
      layers.set(selector, state);
    }
    const sx = scaleX(), sy = scaleY();
    const w = Math.max(1, Math.round(r.width * sx));
    const h = Math.max(1, Math.round(r.height * sy));
    state.x = r.left * sx; state.y = r.top * sy; state.w = w; state.h = h; state.visible = true;
    if (state.canvas.width !== w || state.canvas.height !== h) {
      state.canvas.width = w; state.canvas.height = h;
    }
    if (state.busy) return;
    state.busy = true;

    try {
      const clone = cloneStyled(el);
      // The root is positioned at its measured viewport coordinates by the
      // destination canvas; reset only its outer placement, not inner styling.
      const rootStyle = clone.getAttribute('style') || '';
      clone.setAttribute('style', `${rootStyle};position:relative!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;margin:0!important;width:${r.width}px!important;height:${r.height}px!important;max-width:none!important;max-height:none!important;transform:none!important;`);
      const markup = new XMLSerializer().serializeToString(clone);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${w}" height="${h}" viewBox="0 0 ${r.width} ${r.height}"><foreignObject x="0" y="0" width="${r.width}" height="${r.height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${r.width}px;height:${r.height}px;overflow:visible;direction:${getComputedStyle(el).direction};">${markup}</div></foreignObject></svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      state.url = url;
      img.onload = () => {
        try {
          const c = state.canvas.getContext('2d');
          c.clearRect(0, 0, w, h);
          c.drawImage(img, 0, 0, w, h);
        } catch (e) { console.warn('HUD layer render failed', selector, e); }
        URL.revokeObjectURL(url);
        if (state.url === url) state.url = null;
        state.busy = false;
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        if (state.url === url) state.url = null;
        state.busy = false;
        console.warn('HUD SVG rendering is not supported for', selector);
      };
      img.src = url;
    } catch (e) {
      state.busy = false;
      console.warn('HUD capture failed', selector, e);
    }
  }

  function frame() {
    if (stopped) return;
    const now = performance.now();
    if (now - last < 20) return;
    last = now;
    const sx = scaleX(), sy = scaleY();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(src, 0, 0, out.width, out.height);

    for (const selector of roots) {
      const el = document.querySelector(selector);
      const state = layers.get(selector);
      if (!el) { if (state) state.visible = false; continue; }
      renderRoot(selector, el);
    }

    // Recreate glass blur from the real WebGL frame, then place exact DOM layers.
    for (const selector of roots) {
      const el = document.querySelector(selector);
      const state = layers.get(selector);
      if (el && state && state.visible) paintBackdropFilters(el);
      if (state && state.visible && state.canvas.width && state.canvas.height) {
        ctx.globalAlpha = 1;
        ctx.drawImage(state.canvas, state.x, state.y, state.w, state.h);
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    canvas: out,
    frame,
    destroy() {
      stopped = true;
      for (const state of layers.values()) if (state.url) URL.revokeObjectURL(state.url);
      layers.clear();
    }
  };
}
