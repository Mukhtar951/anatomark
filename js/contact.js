/* Renders the Contact buttons from js/site-config.js into #contactActions */
(function () {
  const box = document.getElementById("contactActions");
  if (!box) return;
  const cfg = window.ANATOMARK_CONTACT || {};

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const mailIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  const chatIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 01-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1121 12z"/></svg>';

  function btn({ href, icon, label, primary, pending, external }) {
    const cls = "contact-btn" + (primary ? " is-primary" : "") + (pending ? " is-pending" : "");
    const inner = `<span class="contact-ico">${icon}</span><span>${esc(label)}</span>` + (pending ? '<small>Coming soon</small>' : "");
    return pending
      ? `<span class="${cls}" role="link" aria-disabled="true">${inner}</span>`
      : `<a class="${cls}" href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${inner}</a>`;
  }

  // ---- email ----
  const email = String(cfg.email || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (email && !emailOk) console.warn("[AnatoMark] site-config.js: email looks invalid:", email);

  // ---- WhatsApp (needs international format: digits only, no leading 0) ----
  let digits = String(cfg.whatsapp || "").replace(/\D/g, "");
  // Accept the way numbers are usually written in Nigeria and convert them:
  //   08012345678 -> 2348012345678     2340801… (stray 0 after 234) -> 234801…
  if (/^0\d{10}$/.test(digits)) digits = "234" + digits.slice(1);
  else if (/^2340\d{10}$/.test(digits)) digits = "234" + digits.slice(4);
  const waOk = digits.length >= 10 && digits.length <= 15 && !digits.startsWith("0");
  if (digits && !waOk) console.warn("[AnatoMark] site-config.js: whatsapp must include the country code with no leading 0, e.g. 2348012345678. Got:", cfg.whatsapp);

  const waUrl = waOk ? `https://wa.me/${digits}?text=${encodeURIComponent(cfg.whatsappMessage || "")}` : "";
  const mailUrl = emailOk ? `mailto:${email}?subject=${encodeURIComponent(cfg.emailSubject || "AnatoMark enquiry")}` : "";

  // The WhatsApp number is deliberately never printed; only the button carries it.
  box.innerHTML =
    '<div class="contact-btns">' +
    btn({ href: waUrl, icon: chatIcon, label: "Message on WhatsApp", primary: true, pending: !waOk, external: true }) +
    btn({ href: mailUrl, icon: mailIcon, label: "Send an email", pending: !emailOk }) +
    "</div>" +
    (emailOk
      ? `<div class="contact-email"><span class="contact-email-text" id="contactEmailText">${esc(email)}</span>` +
        '<button type="button" class="contact-copy" id="contactCopy">Copy</button></div>'
      : "") +
    '<p class="contact-note">Replies usually within a day.</p>';

  const copy = document.getElementById("contactCopy");
  if (copy) copy.addEventListener("click", async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(email); ok = true; } catch (e) {
      try {
        const r = document.createRange(); r.selectNodeContents(document.getElementById("contactEmailText"));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); ok = document.execCommand("copy");
      } catch (e2) {}
    }
    copy.textContent = ok ? "Copied" : "Press Ctrl+C";
    setTimeout(() => { copy.textContent = "Copy"; }, 1800);
  });
})();
