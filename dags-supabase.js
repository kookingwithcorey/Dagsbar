/* DAGS shared Supabase login/session helper
   One login for DAGS + Dramhub.
   Include this on Blind Tasting, Logbook, and Whiskey IQ pages with:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="dags-supabase.js"></script>
*/
(function () {
  const SUPABASE_URL = "https://yfbficwfvscipodbvsfh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_hTHG1nFVWSBnvgwUozGcpg_IUrtsn2B";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function getCurrentPage() {
    return window.location.pathname.split("/").pop().toLowerCase() || "index.html";
  }

  function shouldShowLoginButton() {
    const page = getCurrentPage();
    return page === "blind-tasting.html" || page === "history.html" || page === "whiskeyiqupgrade.html";
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

  function injectFloatingAccountControl() {
    if (!shouldShowLoginButton()) return;
    if (document.getElementById("dagsAccountControl")) return;

    const style = document.createElement("style");
    style.setAttribute("data-dags-account-control", "true");
    style.textContent = `
      .dags-account-control {
        position: fixed;
        top: 20px;
        right: 28px;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .dags-account-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 9px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.16);
        background: rgba(5, 8, 8, .72);
        color: #f7f7f7 !important;
        text-decoration: none !important;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .1em;
        text-transform: uppercase;
        backdrop-filter: blur(14px);
        box-shadow: 0 10px 30px rgba(0,0,0,.32);
        white-space: nowrap;
      }
      .dags-account-link:hover { border-color: rgba(15,139,107,.7); background: rgba(15,139,107,.22); }
      @media (max-width: 830px) {
        .dags-account-control { top: 14px; right: 22px; }
        .dags-account-link { min-height: 34px; padding: 8px 11px; font-size: 10px; letter-spacing: .08em; }
      }
      @media (max-width: 430px) {
        .dags-account-control { top: 14px; right: 22px; }
      }
    `;
    document.head.appendChild(style);

    const account = document.createElement("a");
    account.href = "auth.html";
    account.className = "dags-account-link";
    account.textContent = "Log In";

    const wrap = document.createElement("div");
    wrap.id = "dagsAccountControl";
    wrap.className = "dags-account-control";
    wrap.appendChild(account);
    document.body.appendChild(wrap);
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
    updateAccountLabels
  };

  ready(async function () {
    if (shouldShowLoginButton()) {
      injectAccountLink();
      await updateAccountLabels();
    }
    const db = getClient();
    if (db && shouldShowLoginButton()) db.auth.onAuthStateChange(updateAccountLabels);
  });
})();
