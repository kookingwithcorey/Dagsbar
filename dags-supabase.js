/* DAGS shared Supabase login/session helper
   One login for DAGS + Dramhub.
   Include this on DAGS app pages with:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="dags-supabase.js"></script>
*/
(function () {
  const SUPABASE_URL = "https://yfbficwfvscipodbvsfh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_hTHG1nFVWSBnvgwUozGcpg_IUrtsn2B";
  const THEME_KEY = "dags-shared-theme";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function getCurrentPage() {
    return window.location.pathname.split("/").pop().toLowerCase() || "index.html";
  }

  function pageClassName() {
    return "dags-page-" + getCurrentPage().replace(/\.html$/, "").replace(/[^a-z0-9_-]/g, "-");
  }

  function shouldShowSharedControls() {
    const page = getCurrentPage();
    return page === "blind-tasting.html" ||
      page === "history.html" ||
      page === "whiskeyiqupgrade.html" ||
      page === "whiskeyiq.html" ||
      page === "menu.html";
  }

  function shouldShowThemeControl() {
    const page = getCurrentPage();
    return page === "blind-tasting.html" ||
      page === "history.html" ||
      page === "whiskeyiqupgrade.html" ||
      page === "menu.html";
  }

  function getClient() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("DAGS Auth: Supabase library not loaded. Add @supabase/supabase-js before dags-supabase.js.");
      return null;
    }
    if (!window.dagsSupabaseClient) {
      window.dagsSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window.dagsSupabaseClient;
  }

  async function getSession() {
    const db = getClient();
    if (!db) return null;
    const { data } = await db.auth.getSession();
    return data.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  async function getProfile() {
    const db = getClient();
    const user = await getUser();
    if (!db || !user) return null;
    const { data, error } = await db
      .from("profiles")
      .select("id, username, display_name, role, status, hide_profile")
      .eq("id", user.id)
      .single();
    if (error) return null;
    return data;
  }

  async function requireLogin(returnUrl) {
    const user = await getUser();
    if (user) return user;
    const next = returnUrl || getCurrentPage();
    window.location.href = "auth.html?next=" + encodeURIComponent(next);
    return null;
  }

  async function signOut() {
    const db = getClient();
    if (!db) return;
    await db.auth.signOut();
    window.location.href = "auth.html";
  }

  async function saveWhiskeyIQLog(score) {
    const db = getClient();
    const user = await requireLogin();
    if (!db || !user) return { error: "Not logged in" };
    const row = {
      user_id: user.id,
      bottle_id: score.bottle_id || null,
      bottle_name: score.bottle_name || score.bottleName || score.name || "Blind Taste",
      bottle_type: score.bottle_type || score.type || null,
      proof: score.proof ? Number(score.proof) : null,
      aroma_score: score.aroma_score ?? score.aroma ?? null,
      flavor_score: score.flavor_score ?? score.flavor ?? null,
      finish_score: score.finish_score ?? score.finish ?? null,
      drink_again_score: score.drink_again_score ?? score.drinkAgain ?? null,
      recommend_score: score.recommend_score ?? score.recommend ?? null,
      value_score: score.value_score ?? score.value ?? null,
      total_score: score.total_score ?? score.total ?? score.score ?? null,
      notes: score.notes || null,
      is_public: !!score.is_public
    };
    return await db.from("whiskey_iq_logs").insert(row).select().single();
  }

  async function saveWhiskeyLog(entry) {
    const db = getClient();
    const user = await requireLogin();
    if (!db || !user) return { error: "Not logged in" };
    const row = {
      user_id: user.id,
      bottle_id: entry.bottle_id || null,
      bottle_name: entry.bottle_name || entry.whiskey || entry.name || "Untitled Bottle",
      distillery: entry.distillery || entry.brand || null,
      proof: entry.proof ? Number(entry.proof) : null,
      rating: entry.rating ? Number(entry.rating) : null,
      notes: entry.notes || entry.other || null,
      review_text: entry.review_text || entry.review || entry.notes || null,
      is_public: !!entry.is_public,
      publish_review: !!entry.publish_review
    };
    return await db.from("whiskey_logs").insert(row).select().single();
  }

  async function saveBlindTasting(tasting, bottles) {
    const db = getClient();
    const user = await requireLogin();
    if (!db || !user) return { error: "Not logged in" };
    const { data: parent, error: parentError } = await db
      .from("blind_tastings")
      .insert({ user_id: user.id, title: tasting.title || "Blind Tasting", notes: tasting.notes || null, is_public: !!tasting.is_public })
      .select()
      .single();
    if (parentError) return { error: parentError };
    const childRows = (bottles || []).map((bottle, index) => ({
      tasting_id: parent.id,
      user_id: user.id,
      bottle_id: bottle.bottle_id || null,
      label: bottle.label || String.fromCharCode(65 + index),
      revealed_name: bottle.revealed_name || bottle.name || null,
      nose_score: bottle.nose_score ?? bottle.nose ?? null,
      palate_score: bottle.palate_score ?? bottle.palate ?? null,
      finish_score: bottle.finish_score ?? bottle.finish ?? null,
      total_score: bottle.total_score ?? bottle.total ?? null,
      ranking: bottle.ranking || null,
      notes: bottle.notes || null
    }));
    if (childRows.length) {
      const { error: childError } = await db.from("blind_tasting_bottles").insert(childRows);
      if (childError) return { data: parent, error: childError };
    }
    return { data: parent, error: null };
  }

  function updateWhiskeyIQNav() {
    if (getCurrentPage() !== "whiskeyiqupgrade.html") return;
    const nav = document.querySelector(".nav");
    if (!nav || nav.dataset.dagsIqNavUpdated === "true") return;

    Array.from(nav.querySelectorAll("a, button")).forEach((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      const href = (el.getAttribute("href") || "").toLowerCase();
      if (text === "view dashboard" || text === "dashboard" || href.includes("dashboard")) el.remove();
    });

    const links = [
      { text: "Blind Tasting", href: "blind-tasting.html" },
      { text: "Logbook", href: "history.html" },
      { text: "Dramhub", href: "https://dramhub.lovable.app", external: true }
    ];

    links.forEach((link) => {
      const exists = Array.from(nav.querySelectorAll("a")).some((a) => (a.textContent || "").trim().toLowerCase() === link.text.toLowerCase());
      if (exists) return;
      const a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.text;
      if (link.external) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      const legacy = nav.querySelector(".legacy-iq-btn");
      if (legacy) nav.insertBefore(a, legacy);
      else nav.appendChild(a);
    });

    nav.dataset.dagsIqNavUpdated = "true";
  }

  function shouldHideSharedControls() {
    if (getCurrentPage() !== "whiskeyiqupgrade.html") return false;
    if (document.body.classList.contains("modal-open")) return true;
    const activeModal = document.querySelector(".modal-backdrop.active, .modal.active, [aria-modal='true']");
    return !!activeModal;
  }

  function syncSharedControlsVisibility() {
    const control = document.getElementById("dagsAccountControl");
    if (!control) return;
    control.classList.toggle("dags-login-hidden", shouldHideSharedControls());
  }

  function watchSharedControlsVisibility() {
    if (getCurrentPage() !== "whiskeyiqupgrade.html") return;
    syncSharedControlsVisibility();
    const observer = new MutationObserver(syncSharedControlsVisibility);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "aria-hidden"] });
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || localStorage.getItem(THEME_KEY) || "dark";
  }

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    localStorage.setItem("dags-home-theme", next);
    localStorage.setItem("dags-theme", next);
    updateThemeButton();
  }

  function toggleTheme() {
    applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
  }

  function themeIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z"></path></svg>`;
  }

  function updateThemeButton() {
    const btn = document.querySelector("#dagsThemeControl");
    if (!btn) return;
    const current = getCurrentTheme();
    btn.setAttribute("aria-label", current === "dark" ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title", current === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  function getOrCreateThemeButton() {
    let btn = document.getElementById("themeToggle") || document.querySelector(".theme-toggle") || document.getElementById("dagsThemeControl");

    if (btn) {
      btn.id = "dagsThemeControl";
      btn.classList.add("dags-theme-control");
      btn.type = "button";
      if (!btn.innerHTML.trim()) btn.innerHTML = themeIcon();
      if (!btn.dataset.dagsThemeBound) {
        btn.addEventListener("click", toggleTheme);
        btn.dataset.dagsThemeBound = "true";
      }
      updateThemeButton();
      return btn;
    }

    btn = document.createElement("button");
    btn.id = "dagsThemeControl";
    btn.className = "dags-theme-control";
    btn.type = "button";
    btn.innerHTML = themeIcon();
    btn.addEventListener("click", toggleTheme);
    btn.dataset.dagsThemeBound = "true";
    updateThemeButton();
    return btn;
  }

  function injectFloatingAccountControl() {
    if (!shouldShowSharedControls()) return;
    if (document.getElementById("dagsAccountControl")) return;

    document.documentElement.classList.add("dags-shared-controls-active", pageClassName());

    const style = document.createElement("style");
    style.setAttribute("data-dags-account-control", "true");
    style.textContent = `
      .dags-account-control {
        position: fixed;
        top: 28px;
        right: 28px;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .dags-account-control.dags-login-hidden,
      body.modal-open .dags-account-control {
        display: none !important;
      }
      .dags-page-whiskeyiqupgrade .nav .icon-btn:not(#dagsThemeControl),
      .dags-page-whiskeyiqupgrade .nav button[aria-label*="theme" i]:not(#dagsThemeControl),
      .dags-page-whiskeyiqupgrade .nav button[title*="theme" i]:not(#dagsThemeControl),
      .dags-page-whiskeyiqupgrade .nav button[aria-label*="mode" i]:not(#dagsThemeControl),
      .dags-page-whiskeyiqupgrade .nav button[title*="mode" i]:not(#dagsThemeControl) {
        display: none !important;
      }
      .dags-account-link,
      .dags-theme-control {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 38px !important;
        border-radius: 999px !important;
        color: #fff !important;
        text-decoration: none !important;
        backdrop-filter: blur(14px);
        white-space: nowrap;
        position: static !important;
        top: auto !important;
        right: auto !important;
        margin: 0 !important;
      }
      .dags-account-link {
        padding: 9px 14px !important;
        border: 1px solid rgba(15,139,107,.75) !important;
        background: linear-gradient(135deg, #0f8b6b, #064c35) !important;
        box-shadow: 0 10px 30px rgba(6,76,53,.28) !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        letter-spacing: .1em !important;
        text-transform: uppercase !important;
      }
      .dags-theme-control {
        width: 38px !important;
        height: 38px !important;
        padding: 0 !important;
        flex: 0 0 38px !important;
        border: 1px solid var(--line, rgba(255,255,255,.16)) !important;
        background: rgba(255,255,255,.08) !important;
        box-shadow: none !important;
      }
      html[data-theme="light"] .dags-theme-control {
        color: var(--text, #111510) !important;
        background: rgba(255,255,255,.34) !important;
      }
      .dags-theme-control svg {
        width: 20px !important;
        height: 20px !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 2.35 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      .dags-account-link:hover {
        transform: translateY(-1px);
        border-color: rgba(15,139,107,.95) !important;
        background: linear-gradient(135deg, #18b98f, #064c35) !important;
      }
      .dags-theme-control:hover {
        transform: translateY(-1px);
        border-color: rgba(15,139,107,.55) !important;
        background: rgba(255,255,255,.12) !important;
      }
      @media (max-width: 830px) {
        .dags-account-control { top: 24px; right: 22px; gap: 7px; }
        .dags-account-link { min-height: 34px !important; padding: 8px 11px !important; font-size: 10px !important; letter-spacing: .08em !important; }
        .dags-theme-control { width: 34px !important; height: 34px !important; min-height: 34px !important; flex-basis: 34px !important; }
        .dags-theme-control svg { width: 18px !important; height: 18px !important; }
      }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "dagsAccountControl";
    wrap.className = "dags-account-control";

    if (shouldShowThemeControl()) {
      const theme = getOrCreateThemeButton();
      wrap.appendChild(theme);
    }

    const account = document.createElement("a");
    account.href = "auth.html";
    account.className = "dags-account-link";
    account.textContent = "Log In";
    wrap.appendChild(account);

    document.body.appendChild(wrap);
    syncSharedControlsVisibility();
  }

  function injectAccountLink() {
    injectFloatingAccountControl();
  }

  async function updateAccountLabels() {
    const profile = await getProfile();
    const labels = document.querySelectorAll(".dags-account-link");
    labels.forEach((label) => {
      label.textContent = profile ? "Account" : "Log In";
      label.title = profile ? `Logged in${profile.display_name ? " as " + profile.display_name : ""}` : "Log in to DAGS";
    });
  }

  window.DAGSAuth = {
    getClient,
    getSession,
    getUser,
    getProfile,
    requireLogin,
    signOut,
    saveWhiskeyIQLog,
    saveWhiskeyLog,
    saveBlindTasting,
    injectAccountLink,
    injectFloatingAccountControl,
    updateAccountLabels,
    updateWhiskeyIQNav,
    syncSharedControlsVisibility,
    applyTheme,
    toggleTheme
  };

  ready(async function () {
    updateWhiskeyIQNav();
    if (shouldShowSharedControls()) {
      if (shouldShowThemeControl()) {
        const savedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem("dags-theme") || localStorage.getItem("dags-home-theme");
        if (savedTheme) applyTheme(savedTheme);
      }
      injectAccountLink();
      await updateAccountLabels();
      watchSharedControlsVisibility();
    }
    const db = getClient();
    if (db && shouldShowSharedControls()) db.auth.onAuthStateChange(updateAccountLabels);
  });
})();
