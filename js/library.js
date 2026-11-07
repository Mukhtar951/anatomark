document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("librarySections");
  const tools = document.getElementById("libraryTools");
  if (!root) return;
  const systems = window.ANATOMARK_SYSTEMS || [];
  const regions = window.ANATOMARK_REGIONS || [];

  const esc = (str) =>
    String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  if (!systems.length) {
    root.innerHTML = '<p class="library-empty">The library couldn’t be loaded. Please refresh the page.</p>';
    return;
  }

  const active = systems.find((s) => s.status === "active");
  const locked = systems.filter((s) => s.status !== "active");
  const all = active ? active.structures : [];

  let query = "";
  let region = "all";

  function card(s) {
    return `
      <a class="library-card" href="structure-detail.html?id=${encodeURIComponent(s.id)}&from=library">
        <span class="lib-thumb"><img ${anatomarkImgAttrs(s, "../")} alt="" loading="lazy" decoding="async" /></span>
        <span class="tag">${esc(s.tag)}</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.summary)}</p>
        <span class="lib-cta">View in AR <span aria-hidden="true">&rarr;</span></span>
      </a>`;
  }

  function matches(s) {
    if (region !== "all" && s.region !== region) return false;
    if (!query) return true;
    const hay = [s.name, s.regionLabel, s.tag, s.summary, s.spec && s.spec.region, s.spec && s.spec.function].join(" ").toLowerCase();
    return query.split(/\s+/).every((word) => hay.indexOf(word) >= 0);
  }

  function render() {
    let shown = 0;
    let html = "";

    if (active) {
      const groups = regions
        .map((r) => ({ r, items: all.filter((s) => s.region === r.id && matches(s)) }))
        .filter((g) => g.items.length);
      shown = groups.reduce((n, g) => n + g.items.length, 0);

      html += `
        <section class="system-section">
          <div class="system-head">
            <h2>${esc(active.name)}</h2>
            <span class="system-status-tag active">ACTIVE</span>
            <span class="system-count">${all.length} structures</span>
          </div>
          ${
            shown
              ? groups
                  .map(
                    (g) => `
            <details class="region-group" open>
              <summary><span>${esc(g.r.label)}</span><span class="region-count">${g.items.length}</span></summary>
              <div class="library-grid">${g.items.map(card).join("")}</div>
            </details>`
                  )
                  .join("")
              : `<p class="library-empty" role="status">No structures match &ldquo;${esc(query)}&rdquo;. <button type="button" class="link-btn" id="clearFilters">Clear search</button></p>`
          }
        </section>`;
    }

    if (locked.length) {
      html += `<section class="locked-list" aria-label="More systems">` +
        locked
          .map(
            (s) => `
        <div class="locked-row">
          <svg class="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
          <span class="locked-name">${esc(s.name)}</span>
          <span class="system-status-tag locked">COMING SOON</span>
        </div>`
          )
          .join("") +
        `</section>`;
    }

    root.innerHTML = html;
    const clear = document.getElementById("clearFilters");
    if (clear) clear.addEventListener("click", reset);
  }

  function reset() {
    query = ""; region = "all";
    if (search) search.value = "";
    syncChips();
    render();
  }

  let search = null, chipsEl = null;
  function syncChips() {
    if (!chipsEl) return;
    chipsEl.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.region === region;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  if (tools && all.length > 1) {
    tools.innerHTML = `
      <label class="lib-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" id="libSearch" placeholder="Search bones (e.g. femur, forearm)" autocomplete="off" aria-label="Search the library" />
      </label>
      <div class="lib-chips" id="libChips" role="group" aria-label="Filter by region">
        <button type="button" data-region="all" aria-pressed="true" class="on">All</button>
        ${regions.map((r) => `<button type="button" data-region="${esc(r.id)}" aria-pressed="false">${esc(r.label)}</button>`).join("")}
      </div>`;
    search = document.getElementById("libSearch");
    chipsEl = document.getElementById("libChips");
    search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); render(); });
    chipsEl.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-region]");
      if (!b) return;
      region = b.dataset.region;
      syncChips();
      render();
    });
  }

  render();
});
