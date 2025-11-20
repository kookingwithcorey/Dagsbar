<script>
  // IDs for the sliders
  const sliderConfig = [
    "sweetness",
    "spice",
    "oak",
    "fruit",
    "heat",
    "finishLen"
  ];

  // Hook slider events
  sliderConfig.forEach((id) => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + "Value");
    if (!slider || !valueSpan) return;

    const sync = () => {
      valueSpan.textContent = slider.value;
     // ---- Simple localStorage-based history ----
const HISTORY_KEY = "dags_tastings_v1";

// grab all current form + slider values as one object
function getCurrentTastingEntry() {
  const vals = sliderConfig.reduce((acc, id) => {
    const el = document.getElementById(id);
    acc[id] = el ? Number(el.value) : 0;
    return acc;
  }, {});

  return {
    id: Date.now(), // simple unique id
    createdAt: new Date().toISOString(),
    whiskeyName: document.getElementById("whiskeyName")?.value || "",
    distillery: document.getElementById("distillery")?.value || "",
    age: document.getElementById("age")?.value || "",
    proof: document.getElementById("proof")?.value || "",
    batch: document.getElementById("batch")?.value || "",
    price: document.getElementById("price")?.value || "",
    nose: document.getElementById("nose")?.value || "",
    palate: document.getElementById("palate")?.value || "",
    finish: document.getElementById("finish")?.value || "",
    other: document.getElementById("other")?.value || "",
    rating: document.getElementById("rating")?.value || "",
    flavors: vals   // all your slider values
  };
}

function loadTastingHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTastingHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// handle "Save Tasting" click
document.getElementById("saveBtn")?.addEventListener("click", () => {
  const entry = getCurrentTastingEntry();

  // basic guard: don't save empty sheets
  if (!entry.whiskeyName && !entry.distillery && !entry.rating) {
    alert("Fill in at least the whiskey name, distillery, or rating before saving.");
    return;
  }

  const history = loadTastingHistory();
  history.push(entry);
  saveTastingHistory(history);

  alert("Tasting saved to your browser history!");
  console.log("Current tasting history:", history);
});

      buildSummary();
    };
    slider.addEventListener("input", sync);
    sync();
  });

  // Draw the SVG line based on slider values
  function updateFlavorChart(vals) {
    const svg = document.getElementById("flavorChart");
    if (!svg) return;

    const width = 600;
    const height = 200;
    const topPad = 25;
    const bottomPad = 35;
    const usableHeight = height - topPad - bottomPad;

    const metricIds = sliderConfig;
    const n = metricIds.length;
    if (n === 0) return;

    const points = metricIds.map((id, index) => {
      const x = (index / (n - 1 || 1)) * width;
      const value = vals[id] ?? 0; // 0–5
      const ratio = Math.max(0, Math.min(5, value)) / 5;
      const y = height - bottomPad - ratio * usableHeight;
      return { x, y };
    });

    const pathD = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");

    const circles = points
      .map(
        (p) =>
          `<circle class="profile-point" cx="${p.x}" cy="${p.y}" />`
      )
      .join("");

    svg.innerHTML = `
      <path class="profile-line" d="${pathD}" />
      ${circles}
    `;
  }

  // Compute the profile title (like "FRUITY & SPICY")
  function updateFlavorProfile(vals) {
    const titleEl = document.getElementById("flavorProfileTitle");
    if (!titleEl) return;

    const profiles = [
      { id: "sweetness", label: "Sweet" },
      { id: "spice", label: "Spicy" },
      { id: "oak", label: "Oaky" },
      { id: "fruit", label: "Fruity" },
      { id: "heat", label: "Bold" },
      { id: "finishLen", label: "Long Finish" }
    ];

    // Find top values
    const sorted = [...profiles].sort(
      (a, b) => (vals[b.id] ?? 0) - (vals[a.id] ?? 0)
    );

    const topVal = vals[sorted[0].id] ?? 0;
    const secondVal = vals[sorted[1].id] ?? 0;

    let words;

    if (topVal <= 0) {
      words = "NEUTRAL";
    } else if (Math.abs(topVal - secondVal) <= 1 && secondVal > 0) {
      // Combine two if they're close (like "FRUITY & SPICY")
      words = `${sorted[0].label} & ${sorted[1].label}`.toUpperCase();
    } else {
      words = sorted[0].label.toUpperCase();
    }

    // If everything is dead-center, call it Balanced
    const allMid = profiles.every(
      (p) => Math.round(vals[p.id] ?? 3) === 3
    );
    if (allMid) {
      words = "BALANCED";
    }

    titleEl.textContent = words;
  }

  // Build flavor summary chips + feed chart + profile
  function buildSummary() {
    const summaryEl = document.getElementById("summaryChips");
    if (!summaryEl) return;

    const vals = sliderConfig.reduce((acc, id) => {
      const el = document.getElementById(id);
      acc[id] = el ? Number(el.value) : 0;
      return acc;
    }, {});

    const chips = [];

    if (vals.sweetness >= 4) chips.push("Sweet-leaning");
    if (vals.sweetness <= 1) chips.push("Dry");
    if (vals.spice >= 4) chips.push("Spice / Rye-forward");
    if (vals.oak >= 4) chips.push("Oak-heavy");
    if (vals.oak <= 1) chips.push("Light oak");
    if (vals.fruit >= 4) chips.push("Fruity");
    if (vals.heat >= 4) chips.push("High perceived heat");
    if (vals.heat <= 1) chips.push("Drinks below proof");
    if (vals.finishLen >= 4) chips.push("Long finish");
    if (vals.finishLen <= 1) chips.push("Short finish");

    summaryEl.innerHTML = chips
      .map((c) => '<span class="chip">' + c + "</span>")
      .join("");

    updateFlavorChart(vals);
    updateFlavorProfile(vals);
  }

  // Print button
  document.getElementById("printBtn")?.addEventListener("click", () => {
    window.print();
  });

  // Clear button
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    const form = document.getElementById("tastingForm");
    if (!form) return;
    form.reset();

    // Reset sliders to middle and rebuild everything
    sliderConfig.forEach((id) => {
      const slider = document.getElementById(id);
      const valueSpan = document.getElementById(id + "Value");
      if (slider && valueSpan) {
        slider.value = 3;
        valueSpan.textContent = "3";
      }
    });

    buildSummary();
  });

  // Initial summary + chart + profile on load
  buildSummary();
</script>
