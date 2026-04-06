const DATA_URL = "./data/product.json";
const CONTACTS = {
  phone: "+79274719121",
  telegram: "https://t.me/mam_insad_me",
  instagram: "https://www.instagram.com/mam.insad?igsh=c3g5dnNwYnN3dDc0&utm_source=qr",
  whatsapp: "https://wa.me/message/QA4UW2CU7JN7O1",
  max: "https://max.ru/id163604335366_biz",
  max_pm: "https://max.ru/u/f9LHodD0cOLr_DCrZ0es-3Cdx5Jctv35W82BgEFzqatYi4n9M9XTfVtEcmQ"
};

const state = {
  products: [],
  category: "all",
  priceFilter: "all",
  q: "",
  lastValidHash: "#/"
};

const grid = document.getElementById("grid");
const resultMeta = document.getElementById("resultMeta");
const searchInput = document.getElementById("searchInput");

const dlg = document.getElementById("productDialog");
const dlgTitle = document.getElementById("dlgTitle");
const dlgSubtitle = document.getElementById("dlgSubtitle");
const dlgClose = document.getElementById("dlgClose");
const dlgMainImg = document.getElementById("dlgMainImg");
const dlgThumbs = document.getElementById("dlgThumbs");
const dlgPrice = document.getElementById("dlgPrice");
const dlgDesc = document.getElementById("dlgDesc");
const dlgItems = document.getElementById("dlgItems");

const dlgOrderLink = document.getElementById("dlgOrderLink");
const dlgCopyLink = document.getElementById("dlgCopyLink");
const dlgPhone = document.getElementById("dlgPhone");
const dlgTelegram = document.getElementById("dlgTelegram");
const dlgInstagram = document.getElementById("dlgInstagram");
const dlgWhatsapp = document.getElementById("dlgWhatsapp");

function formatRub(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toAssetUrl(path) {
  if (!path) return "";
  return String(path).startsWith("/") ? String(path).slice(1) : String(path);
}

function normalizePhoneDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function buildProductShareUrl(productId) {
  const base = location.href.split("#")[0];
  return `${base}#/product/${encodeURIComponent(productId)}`;
}

function buildOrderMessage(shareUrl) {
  return `Здравствуйте, хотел бы у вас купить ${shareUrl}`;
}

function buildWhatsAppUrl(phone, message) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    return CONTACTS.whatsapp;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildTelegramUrl(telegramUrl, message) {
  if (!telegramUrl) return "";
  const clean = telegramUrl.replace(/^https?:\/\//, "").replace(/^t\.me\//, "");
  const username = clean.split(/[/?#]/)[0];
  if (!username) return telegramUrl;
  return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
}

function buildMaxMessengerUrl(product) {
  const shareUrl = buildProductShareUrl(product.id);
  const message = buildOrderMessage(shareUrl);
  return `${CONTACTS.max_pm}?text=${encodeURIComponent(message)}`;
}

async function copyCurrentProductLink(productId) {
  const url = buildProductShareUrl(productId);
  await navigator.clipboard.writeText(url);
  dlgCopyLink.textContent = "Скопировано ✓";
  setTimeout(() => (dlgCopyLink.textContent = "Скопировать ссылку"), 1200);
}

function safeImages(arr) {
  const imgs = (arr || []).filter(Boolean);
  return imgs.length ? imgs : [];
}

const MOBILE_BP = 980;
function isMobileLike() {
  return window.matchMedia(`(max-width:${MOBILE_BP}px)`).matches;
}

function ensureMobileCategoryToggle() {
  const header = document.querySelector(".header");
  const headerInner = document.querySelector(".header__inner");
  const nav = document.querySelector(".nav");

  if (!header || !headerInner || !nav) return;

  let btn = document.querySelector(".nav-toggle");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "nav-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Открыть разделы");
    btn.setAttribute("aria-expanded", "false");

    btn.innerHTML = `
      <svg class="nav-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="4.5" width="15" height="15" rx="2.5"></rect>
        <line x1="8" y1="9" x2="16" y2="9"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
        <line x1="8" y1="15" x2="16" y2="15"></line>
      </svg>
    `;

    headerInner.insertBefore(btn, nav);

    btn.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      header.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (e) => {
      if (!header.contains(e.target)) {
        header.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (!isMobileLike()) {
    header.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
}

window.addEventListener("resize", ensureMobileCategoryToggle);

async function loadProducts() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Не удалось загрузить ${DATA_URL}. HTTP ${res.status}`);
  state.products = await res.json();
  console.log("products loaded:", state.products.length);
}

function getFiltered() {
  const q = state.q.trim().toLowerCase();

  return state.products.filter(p => {
    if (p.show === false) return false;
    const okCategory = state.category === "all" ? true : p.category === state.category;

    const price = Number(p.price);
    let okPrice = true;

    if (state.priceFilter !== "all") {
      const filter = state.priceFilter;

      if (filter === "0-1500") {
        okPrice = price <= 1500;
      } else if (filter === "1500-2500") {
        okPrice = price >= 1500 && price <= 2500;
      } else if (filter === "2500-3500") {
        okPrice = price >= 2500 && price <= 3500;
      } else if (filter === "3500-5000") {
        okPrice = price >= 3500 && price <= 5000;
      } else if (filter === "5000-inf") {
        okPrice = price >= 5000;
      }
    }

    const hay = (
      (p.title || "") + " " +
      (p.description || "") + " " +
      (p.items || []).join(" ")
    ).toLowerCase();

    const okQ = q ? hay.includes(q) : true;

    const excludePostcards = state.category === "all" && p.category === "postcards";

    return okCategory && okPrice && okQ && !excludePostcards;
  });
}

function sortByPriceRule(list) {
  const allPrices = state.priceFilter === "all";
  return list.sort((a, b) => {
    const pa = Number(a.price || 0);
    const pb = Number(b.price || 0);
    return allPrices ? (pa - pb) : (pb - pa);
  });
}

function render() {
  const list = sortByPriceRule(getFiltered());
  grid.innerHTML = "";

  const catLabel = state.category === "all" ? "Все разделы" : state.category;
  let priceLabel = "любая цена";

  if (state.priceFilter !== "all") {
    const filter = state.priceFilter;
    if (filter === "0-1500") priceLabel = "до 1 500 ₽";
    else if (filter === "1500-2500") priceLabel = "1 500–2 500 ₽";
    else if (filter === "2500-3500") priceLabel = "2 500–3 500 ₽";
    else if (filter === "3500-5000") priceLabel = "3 500–5 000 ₽";
    else if (filter === "5000-inf") priceLabel = "от 5 000 ₽";
  }

  resultMeta.textContent = `Показано: ${list.length} • Раздел: ${catLabel} • Цена: ${priceLabel}`;

  if (list.length === 0) {
    grid.innerHTML = `<div class="card" style="grid-column: span 12; cursor: default;">
      <div class="card__body">
        <h3 class="card__title">Ничего не найдено</h3>
        <div class="muted">Сними фильтры или измени запрос.</div>
      </div>
    </div>`;
    return;
  }

  for (const p of list) {
    const cover = (p.images && p.images[0]) ? toAssetUrl(p.images[0]) : "";
    const title = p.title || "Без названия";

    const el = document.createElement("article");
    el.className = "card";

    const mediaHtml = cover
      ? `<img class="card__img" src="${cover}" alt="${escapeHtml(title)}" loading="lazy" />`
      : `<div class="placeholder">NO PHOTO</div>`;

    el.innerHTML = `
      ${mediaHtml}
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(title)}</h3>
        <div class="card__price">${formatRub(Number(p.price || 0))}</div>
      </div>
    `;

    el.addEventListener("click", () => {
      location.hash = `#/product/${encodeURIComponent(p.id)}`;
    });

    grid.appendChild(el);
  }
}

function setActivePriceChip() {
  document.querySelectorAll(".chip[data-price]").forEach(btn => {
    const val = btn.getAttribute("data-price");
    btn.classList.toggle("is-active", String(state.priceFilter) === String(val));
  });
}

function highlightNav() {
  const h = location.hash || "#/";
  const cat = (h.match(/^#\/category\/([^/]+)$/)?.[1]) || "all";

  document.querySelectorAll(".nav__link").forEach(a => {
    const v = a.getAttribute("data-category");
    if (v === decodeURIComponent(cat)) {
      a.style.boxShadow = "0 0 0 5px rgba(152,175,162,.22)";
      a.style.borderColor = "rgba(152,175,162,.95)";
    } else {
      a.style.boxShadow = "none";
      a.style.borderColor = "rgba(62,67,73,.18)";
    }
  });
}

function openProduct(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) {
    location.hash = "#/";
    return;
  }

  dlgTitle.textContent = p.title || "";
  dlgSubtitle.textContent = `${p.categoryLabel || p.category || ""} • ${formatRub(Number(p.price || 0))}`;
  dlgPrice.textContent = formatRub(Number(p.price || 0));
  dlgDesc.textContent = p.description || "";

  dlgItems.innerHTML = "";
  (p.items || []).forEach(it => {
    const li = document.createElement("li");
    li.textContent = it;
    dlgItems.appendChild(li);
  });

  const imgs = safeImages(p.images).map(toAssetUrl);
  dlgThumbs.innerHTML = "";

  if (imgs.length) {
    dlgMainImg.style.display = "block";
    dlgMainImg.src = imgs[0];
    dlgMainImg.alt = p.title || "";

    imgs.forEach((src, idx) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "thumb" + (idx === 0 ? " is-active" : "");
      t.innerHTML = `<img src="${src}" alt="${escapeHtml(p.title)} — фото ${idx + 1}" loading="lazy" />`;
      t.addEventListener("click", () => {
        dlgMainImg.src = src;
        dlgThumbs.querySelectorAll(".thumb").forEach(x => x.classList.remove("is-active"));
        t.classList.add("is-active");
      });
      dlgThumbs.appendChild(t);
    });
  } else {
    dlgMainImg.src = "";
    dlgMainImg.alt = "";
    dlgMainImg.style.display = "none";
    dlgThumbs.innerHTML = `<div class="muted">Фотографии пока не добавлены.</div>`;
  }

  const shareUrl = buildProductShareUrl(p.id);
  const orderMessage = buildOrderMessage(shareUrl);

  dlgOrderLink.href = buildMaxMessengerUrl(p);
  dlgOrderLink.textContent = "Оформить заказ";

  dlgPhone.textContent = "Позвонить";
  dlgPhone.href = `tel:${CONTACTS.phone.replace(/\s/g, "")}`;
  dlgPhone.style.display = "inline-flex";

  dlgInstagram.textContent = "Instagram";
  dlgInstagram.href = CONTACTS.instagram;
  dlgInstagram.style.display = "inline-flex";

  if (dlgWhatsapp) {
    dlgWhatsapp.textContent = "WhatsApp";
    dlgWhatsapp.href = buildWhatsAppUrl(CONTACTS.phone, orderMessage);
    dlgWhatsapp.style.display = "inline-flex";
  }
  if (dlgTelegram) {
    dlgTelegram.textContent = "Telegram";
    dlgTelegram.href = buildTelegramUrl(CONTACTS.telegram, orderMessage);
    dlgTelegram.style.display = "inline-flex";
  }

  dlgCopyLink.onclick = () => copyCurrentProductLink(p.id);

  if (!dlg.open) dlg.showModal();
}

function closeDialog() {
  if (dlg.open) dlg.close();
  if (location.hash.startsWith("#/product/")) {
    location.hash = state.lastValidHash || "#/";
  }
}

dlgClose.addEventListener("click", closeDialog);
dlg.addEventListener("click", (e) => {
  const rect = dlg.getBoundingClientRect();
  const inDialog =
    e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;

  if (!inDialog) closeDialog();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDialog();
});

function applyRoute() {
  const h = location.hash || "#/";

  const catMatch = h.match(/^#\/category\/([^/]+)$/);
  if (catMatch) {
    state.category = decodeURIComponent(catMatch[1]);
    state.lastValidHash = h;
    if (dlg.open) dlg.close();
    render();
    return;
  }

  const prodMatch = h.match(/^#\/product\/([^/]+)$/);
  if (prodMatch) {
    const id = decodeURIComponent(prodMatch[1]);
    openProduct(id);
    return;
  }

  if (h === "#/") {
    state.lastValidHash = "#/";
  }

  state.category = "all";
  if (dlg.open) dlg.close();
  render();
}

function bindUI() {
  document.querySelectorAll(".chip[data-price]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.priceFilter = btn.getAttribute("data-price");
      setActivePriceChip();
      render();
    });
  });
  setActivePriceChip();

  let t = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = searchInput.value;
      render();
    }, 150);
  });
}

window.addEventListener("hashchange", () => {
  applyRoute();
  highlightNav();

  const header = document.querySelector(".header");
  const btn = document.querySelector(".nav-toggle");
  if (header && btn) {
    header.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
});

(async function main() {
  try {
    await loadProducts();
    bindUI();
    ensureMobileCategoryToggle();
    applyRoute();
    highlightNav();
  } catch (e) {
    console.error(e);
    const root = document.querySelector("#catalog") || document.body;
    const msg = document.createElement("div");
    msg.style.padding = "12px";
    msg.style.border = "1px solid #f00";
    msg.style.borderRadius = "8px";
    msg.style.margin = "12px 0";
    msg.textContent = `Не удалось загрузить каталог (${DATA_URL}). Подробности — в консоли (F12).`;
    root.prepend(msg);
  }
})();
