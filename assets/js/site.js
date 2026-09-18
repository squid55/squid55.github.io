// memory bank — 테마 전환 · 검색 · 코드 복사 · 사진 확대 · 목차 강조
// 의존성 없음.
(() => {
  const root = document.documentElement;

  // ── 테마 ─────────────────────────────────────────────────────────
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const cur = root.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("theme", next);
  });

  // ── 검색 ─────────────────────────────────────────────────────────
  // /index.json 을 처음 열 때 한 번만 받는다. 글이 수백 개 수준이면 이걸로 충분하다.
  const dlg = document.getElementById("search");
  const input = document.getElementById("search-input");
  const out = document.getElementById("search-results");
  let index = null;

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const snippet = (text, q) => {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return "";
    const s = Math.max(0, i - 40);
    return (s > 0 ? "…" : "") + esc(text.slice(s, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length, i + q.length + 60)) + "…";
  };

  async function openSearch() {
    if (!dlg) return;
    dlg.showModal();
    input.focus();
    if (!index) {
      try {
        const base = document.querySelector('link[rel="canonical"]')?.href || location.href;
        index = await (await fetch(new URL("/index.json", base))).json();
      } catch { index = []; }
      run();
    }
  }

  function run() {
    const q = input.value.trim().toLowerCase();
    if (!q || !index) { out.innerHTML = ""; return; }
    const terms = q.split(/\s+/);
    const hits = index
      .map((p) => {
        const title = p.t.toLowerCase(), tags = (p.g || []).join(" ").toLowerCase(), body = p.c.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (title.includes(t)) score += 10;
          else if (tags.includes(t)) score += 5;
          else if (body.includes(t)) score += 1;
          else return null;             // 모든 단어가 어딘가엔 있어야 한다
        }
        return { p, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || b.p.d.localeCompare(a.p.d))
      .slice(0, 20);
    out.innerHTML = hits.length
      ? hits.map(({ p }) => `<li><a href="${esc(p.u)}">${esc(p.t)}<small>${esc(p.s)} · ${p.d}</small><small>${snippet(p.c, terms[0])}</small></a></li>`).join("")
      : '<li><a aria-disabled="true">결과 없음</a></li>';
  }

  document.getElementById("search-open")?.addEventListener("click", openSearch);
  input?.addEventListener("input", run);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !dlg.open) {
      e.preventDefault();
      openSearch();
    }
  });
  dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // ── 코드 복사 ────────────────────────────────────────────────────
  for (const block of document.querySelectorAll(".highlight")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn copy-btn";
    btn.textContent = "복사";
    btn.addEventListener("click", async () => {
      const code = block.querySelector("code")?.innerText ?? "";
      try { await navigator.clipboard.writeText(code); btn.textContent = "복사됨"; }
      catch { btn.textContent = "실패"; }
      setTimeout(() => (btn.textContent = "복사"), 1500);
    });
    block.appendChild(btn);
  }

  // ── 사진 확대 ────────────────────────────────────────────────────
  const links = [...document.querySelectorAll("a[data-lightbox]")];
  if (links.length) {
    const box = document.createElement("dialog");
    box.className = "lightbox";
    box.innerHTML = "<img alt=''><p></p>";
    document.body.appendChild(box);
    const img = box.querySelector("img"), cap = box.querySelector("p");
    let cur = 0;
    const show = (i) => {
      cur = (i + links.length) % links.length;
      const a = links[cur];
      img.src = a.href;
      img.alt = a.querySelector("img")?.alt || "";
      cap.textContent = a.closest("figure")?.querySelector("figcaption")?.textContent || "";
    };
    links.forEach((a, i) => a.addEventListener("click", (e) => {
      e.preventDefault();
      show(i);
      box.showModal();
    }));
    box.addEventListener("click", () => box.close());
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") show(cur + 1);
      if (e.key === "ArrowLeft") show(cur - 1);
    });
  }

  // ── 목차에서 지금 읽는 절 강조 ───────────────────────────────────
  const tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map([...tocLinks].map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        tocLinks.forEach((a) => a.classList.remove("active"));
        byId.get(en.target.id)?.classList.add("active");
      }
    }, { rootMargin: "0px 0px -70% 0px" });
    document.querySelectorAll(".prose h2[id], .prose h3[id]").forEach((h) => io.observe(h));
  }
})();
