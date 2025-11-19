const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
<script>
  // Sliders used for both text values and radar chart
  const sliderConfig = [
    "sweetness",
    "spice",
    "oak",
    "fruit",
    "heat",
    "finishLen"
  ];

  const radarCategories = [
    { id: "sweetness", label: "Sweetness" },
    { id: "spice", label: "Spice / Rye" },
    { id: "oak", label: "Oak / Tannin" },
    { id: "fruit", label: "Fruit" },
    { id: "heat", label: "Heat" },
    { id: "finishLen", label: "Finish" }
  ];

  // --- Radar chart drawing ---

  function getSliderValues() {
    return radarCategories.map((c) => {
      const el = document.getElementById(c.id);
      return el ? Number(el.value || 0) : 0;
    });
  }

  function drawRadar() {
    const canvas = document.getElementById("flavorChart");
    if (!canvas) return;

    // Handle HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    const logicalSize = 360;
    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    canvas.style.width = logicalSize + "px";
    canvas.style.height = logicalSize + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = logicalSize;
    const h = logicalSize;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(w, h) / 2 - 40;
    const steps = 5;
    const count = radarCategories.length;
    const angleStep = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);

    // Grid polygons (1–5)
    for (let level = 1; level <= steps; level++) {
      const r = (maxRadius * level) / steps;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axes
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * maxRadius, Math.sin(angle) * maxRadius);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    const values = getSliderValues();
    ctx.beginPath();
    values.forEach((val, i) => {
      const ratio = val / steps;
      const r = maxRadius * ratio;
      const angle = -Math.PI / 2 + i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(15,139,107,0.20)";
    ctx.strokeStyle = "rgba(15,139,107,0.9)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Points (little squares)
    values.forEach((val, i) => {
      const ratio = val / steps;
      const r = maxRadius * ratio;
      const angle = -Math.PI / 2 + i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const size = 6;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(15,139,107,1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();

    // Labels around outside
    ctx.font = "11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(163,172,185,0.9)";
    ctx.textBaseline = "middle";

    radarCategories.forEach((cat, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const r = maxRadius + 16;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      let align = "center";
      if (Math.cos(angle) > 0.3) align = "left";
      else if (Math.cos(angle) < -0.3) align = "right";

      ctx.textAlign = align;
      ctx.fillText(cat.label, x, y);
    });
  }

  // --- Slider text + summary chips (existing logic) ---

  sliderConfig.forEach((id) => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + "Value");
    if (!slider || !valueSpan) return;

    const sync = () => {
      valueSpan.textContent = slider.value;
      buildSummary();
      drawRadar();
    };
    slider.addEventListener("input", sync);
    sync();
  });

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
    sliderConfig.forEach((id) => {
      const slider = document.getElementById(id);
      const valueSpan = document.getElementById(id + "Value");
      if (slider && valueSpan) {
        slider.value = 3;
        valueSpan.textContent = "3";
      }
    });
    document.getElementById("summaryChips").innerHTML = "";
    drawRadar();
  });

  // Initial draw
  buildSummary();
  drawRadar();
</script>
