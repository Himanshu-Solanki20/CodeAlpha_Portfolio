// The contact form opens a mail draft to this address.
const MY_EMAIL = "himanshusolanki30744@gmail.com";

const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const progress = document.getElementById("progress");

document.getElementById("year").textContent = new Date().getFullYear();

// kick off the hero headline animation once fonts are ready,
// otherwise the lines can jump when the font swaps in
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  requestAnimationFrame(() => document.body.classList.add("is-loaded"));
});

/* ---------- scroll: progress bar + nav behaviour ---------- */

let lastY = window.scrollY;
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  nav.classList.toggle("is-scrolled", y > 20);

  // hide the nav when scrolling down, bring it back when scrolling up
  if (!nav.classList.contains("is-menu-open")) {
    nav.classList.toggle("is-hidden", y > lastY && y > 400);
  }
  lastY = y;
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });

/* ---------- mobile menu ---------- */

function setMenu(open) {
  nav.classList.toggle("is-menu-open", open);
  navToggle.setAttribute("aria-expanded", open);
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
}

navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-menu-open")));
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

/* ---------- reveal on scroll ---------- */

// stagger elements that share a parent so they don't all pop in at once
document.querySelectorAll(".reveal").forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  const i = siblings.indexOf(el);
  if (i > 0) el.style.setProperty("--d", `${Math.min(i, 5) * 0.08}s`);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-in");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- highlight current section in the nav ---------- */

const sectionLinks = new Map(
  [...navLinks.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const link = sectionLinks.get(entry.target.id);
    if (!link || !entry.isIntersecting) return;
    sectionLinks.forEach((l) => l.classList.remove("is-current"));
    link.classList.add("is-current");
  });
}, { rootMargin: "-45% 0px -50% 0px" });

document.querySelectorAll("section[id]").forEach((s) => sectionObserver.observe(s));

/* ---------- count-up numbers ---------- */

function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const decimals = Number(el.dataset.decimals || 0);
  const duration = 1400;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    countUp(entry.target);
    countObserver.unobserve(entry.target);
  });
}, { threshold: 0.6 });

document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

/* ---------- contact form ---------- */

const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");

function check(field) {
  const input = field.querySelector("input, textarea");
  let ok = input.value.trim().length > 0;
  if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  field.classList.toggle("has-error", !ok);
  return ok;
}

form.querySelectorAll(".field").forEach((field) => {
  field.querySelector("input, textarea").addEventListener("blur", () => {
    if (field.querySelector("input, textarea").value) check(field);
  });
});

/*
  Messages are delivered by FormSubmit (formsubmit.co), a free form-to-email
  service, so the site doesn't need its own server. The very first message
  triggers an activation email to MY_EMAIL; after clicking "Activate Form"
  every message lands straight in the inbox.
*/
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${MY_EMAIL}`;
const sendBtn = form.querySelector(".form__send");
const sendLabel = sendBtn.querySelector("span");

function setNote(text, isError) {
  note.style.color = isError ? "#b3412e" : "";
  note.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fields = [...form.querySelectorAll(".field")];
  const allGood = fields.map(check).every(Boolean);

  if (!allGood) {
    setNote("Please fill in every field with a valid email address.", true);
    return;
  }

  const { elements } = form;
  const name = elements["name"].value.trim();
  const email = elements["email"].value.trim();
  const message = elements["message"].value.trim();

  // bots fill hidden fields, people don't
  if (elements["_honey"].value) return;

  sendBtn.disabled = true;
  sendLabel.textContent = "Sending…";
  setNote("");

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name,
        email,                       // FormSubmit uses this as the reply-to address
        message,
        _subject: `Portfolio message from ${name}`,
        _template: "table",
        _captcha: "false",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== "true") throw new Error(data.message || res.statusText);

    form.reset();
    setNote("Thanks! Your message has been sent. I'll get back to you soon.");
  } catch (err) {
    // if the service is unreachable, fall back to the visitor's own mail app
    const subject = encodeURIComponent(`Hello from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    setNote("Couldn't send right now, so your mail app will open with the message instead.", true);
    setTimeout(() => {
      window.location.href = `mailto:${MY_EMAIL}?subject=${subject}&body=${body}`;
    }, 1200);
  } finally {
    sendBtn.disabled = false;
    sendLabel.textContent = "Send message";
  }
});
