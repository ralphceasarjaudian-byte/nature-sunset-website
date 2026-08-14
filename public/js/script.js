const gradientByTime = {
  dawn: "var(--dawn-grad)",
  day: "var(--day-grad)",
  dusk: "var(--dusk-grad)",
  night: "var(--night-grad)",
};

const gallery = document.getElementById("gallery");
const entryCount = document.getElementById("entryCount");
const filterButtons = document.querySelectorAll(".filter-btn");

const panel = document.getElementById("panel");
const panelBackdrop = document.getElementById("panelBackdrop");
const panelClose = document.getElementById("panelClose");
const panelStripe = document.getElementById("panelStripe");
const panelImage = document.getElementById("panelImage");
const panelTime = document.getElementById("panelTime");
const panelTitle = document.getElementById("panelTitle");
const panelLocation = document.getElementById("panelLocation");
const panelDescription = document.getElementById("panelDescription");
const panelFact = document.getElementById("panelFact");

const termTooltip = document.getElementById("termTooltip");
const termTooltipWord = document.getElementById("termTooltipWord");
const termTooltipMeaning = document.getElementById("termTooltipMeaning");

let currentFilter = "all";
let activeTermEl = null;

// ---- Wrap glossary terms in a piece of text with clickable spans ----

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderWithGlossary(text, glossary = []) {
  let html = escapeHtml(text);
  glossary.forEach(({ term, meaning }) => {
    const re = new RegExp(`\\b(${escapeRegex(term)})\\b`, "i");
    html = html.replace(
      re,
      `<span class="term" tabindex="0" data-meaning="${escapeHtml(meaning)}">$1</span>`
    );
  });
  return html;
}

// ---- Fetch + render the gallery from the backend ----

async function loadItems(timeOfDay = "all") {
  const url = timeOfDay === "all" ? "/api/items" : `/api/items?timeOfDay=${timeOfDay}`;
  const res = await fetch(url);
  const items = await res.json();
  renderGallery(items);
}

function renderGallery(items) {
  gallery.innerHTML = "";
  entryCount.textContent = `${items.length} ${items.length === 1 ? "entry" : "entries"}`;

  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "card";
    card.setAttribute("aria-haspopup", "dialog");
    card.innerHTML = `
      <div class="card__image-wrap">
        <img class="card__image" src="${item.image}" alt="${item.name}, ${item.location}" loading="lazy" />
        <div class="card__stripe" style="background:${gradientByTime[item.timeOfDay]}"></div>
      </div>
      <div class="card__meta">
        <p class="card__time">${item.timeOfDay}</p>
        <h3 class="card__name">${item.name}</h3>
        <p class="card__location">${item.location}</p>
      </div>
    `;
    card.addEventListener("click", () => openPanel(item.id));
    gallery.appendChild(card);
  });
}

// ---- Click a photo -> fetch its full detail and open the field note panel ----

async function openPanel(id) {
  const res = await fetch(`/api/items/${id}`);
  if (!res.ok) return;
  const item = await res.json();

  panelStripe.style.background = gradientByTime[item.timeOfDay];
  panelImage.src = item.image;
  panelImage.alt = item.name;
  panelTime.textContent = item.timeOfDay;
  panelTitle.textContent = item.name;
  panelLocation.textContent = `${item.category} · ${item.location}`;
  panelDescription.innerHTML = renderWithGlossary(item.description, item.glossary);
  panelFact.innerHTML = renderWithGlossary(item.funFact, item.glossary);

  panel.classList.add("is-open");
  panelBackdrop.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  closeTermTooltip();
}

function closePanel() {
  panel.classList.remove("is-open");
  panelBackdrop.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  closeTermTooltip();
}

// ---- Clicking a highlighted term shows its meaning in a small popup ----

function openTermTooltip(el) {
  activeTermEl = el;
  const rect = el.getBoundingClientRect();

  termTooltipWord.textContent = el.textContent;
  termTooltipMeaning.textContent = el.dataset.meaning;
  termTooltip.classList.add("is-open");

  // Position it just below the clicked word, nudged to stay on screen.
  const tooltipWidth = 260;
  let left = rect.left;
  if (left + tooltipWidth > window.innerWidth - 16) {
    left = window.innerWidth - tooltipWidth - 16;
  }
  termTooltip.style.left = `${Math.max(16, left)}px`;
  termTooltip.style.top = `${rect.bottom + 10}px`;

  document.querySelectorAll(".term.is-active").forEach((t) => t.classList.remove("is-active"));
  el.classList.add("is-active");
}

function closeTermTooltip() {
  termTooltip.classList.remove("is-open");
  if (activeTermEl) activeTermEl.classList.remove("is-active");
  activeTermEl = null;
}

panel.addEventListener("click", (e) => {
  const term = e.target.closest(".term");
  if (!term) return;
  e.stopPropagation();
  if (activeTermEl === term) {
    closeTermTooltip();
  } else {
    openTermTooltip(term);
  }
});

panel.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const term = e.target.closest(".term");
  if (!term) return;
  e.preventDefault();
  openTermTooltip(term);
});

document.addEventListener("click", (e) => {
  if (!termTooltip.contains(e.target) && !e.target.closest(".term")) {
    closeTermTooltip();
  }
});

panelClose.addEventListener("click", closePanel);
panelBackdrop.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeTermTooltip();
    closePanel();
  }
});

// ---- Filters ----

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.time;
    loadItems(currentFilter);
  });
});

loadItems();
