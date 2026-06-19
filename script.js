const SELECTED_RENTAL_3_DAYS = 401.88;

const REFERENCE = {
  km: 306,
  consumption: 10,
  diesel: 1.6,
  campingAdult: 7.75,
  campingChild: 6,
  rvParking: 12
};

const INSURANCE = {
  basic: { name: "Seguro básico", daily: 6, deposit: 1500 },
  comfort: { name: "Seguro confort", daily: 11.99, deposit: 750 }
};

let currentStep = 1;
let selectedPreset = "manual";
let extras = [];

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function readNumber(id, fallback = 0) {
  const el = $(id);
  if (!el) return fallback;
  if (el.value === "") return fallback;

  const value = Number(el.value);
  return Number.isFinite(value) ? value : fallback;
}

function selectedRadio(name, fallback = "") {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getVehicleMode() {
  return selectedRadio("vehicleMode", "selected");
}

function getDays() {
  if (getVehicleMode() === "selected") return 3;
  return Number(selectedRadio("otherTripDays", "2"));
}

function getRental(days) {
  if (getVehicleMode() === "selected") return SELECTED_RENTAL_3_DAYS;
  if (days === 2) return Math.max(readNumber("otherRental2", 0), 0);
  return Math.max(readNumber("otherRental3", 0), 0);
}

function getVehicleName() {
  if (getVehicleMode() === "selected") return "Siena 435 7 Plazas";
  return $("otherVehicleName").value.trim() || "Otra autocaravana investigada";
}

function getInsurance() {
  return INSURANCE[selectedRadio("insurancePlan", "comfort")] || INSURANCE.comfort;
}

function getFuelCost() {
  if (selectedPreset !== "manual") {
    return (REFERENCE.km * REFERENCE.consumption / 100) * REFERENCE.diesel;
  }

  const mode = selectedRadio("fuelMode", "reference");

  if (mode === "reference") {
    return (REFERENCE.km * REFERENCE.consumption / 100) * REFERENCE.diesel;
  }

  const manualTotalRaw = $("manualFuelTotal").value;

  if (manualTotalRaw !== "") {
    return Math.max(readNumber("manualFuelTotal", 0), 0);
  }

  const km = Math.max(readNumber("manualKm", REFERENCE.km), 0);
  const consumption = Math.max(readNumber("manualConsumption", REFERENCE.consumption), 0);
  const diesel = Math.max(readNumber("manualDiesel", REFERENCE.diesel), 0);

  return (km * consumption / 100) * diesel;
}
function getFoodValues() {
  const mode = selectedRadio("foodMode", "reference");

  if (mode === "reference") {
    return {
      totalMeals: 6,
      mealCost: 5
    };
  }

  return {
    totalMeals: Math.max(Math.round(readNumber("totalMeals", 6)), 0),
    mealCost: Math.max(readNumber("mealCost", 5), 0)
  };
}

function getStayValues() {
  if (selectedPreset !== "manual") {
    return {
      mode: "reference",
      typeLabel: "Camping Pico Verde",
      adultNight: REFERENCE.campingAdult,
      childNight: REFERENCE.campingChild,
      rvParking: REFERENCE.rvParking,
      freeName: "",
      freeLocation: ""
    };
  }

  const mode = selectedRadio("stayMode", "reference");

  if (mode === "free") {
    return {
      mode,
      typeLabel: "Gratuita",
      adultNight: 0,
      childNight: 0,
      rvParking: 0,
      freeName: $("freeStayName").value.trim(),
      freeLocation: $("freeStayLocation").value.trim()
    };
  }

  if (mode === "manual") {
    return {
      mode,
      typeLabel: "Manual",
      adultNight: Math.max(readNumber("campingAdultNight", REFERENCE.campingAdult), 0),
      childNight: Math.max(readNumber("campingChildNight", REFERENCE.campingChild), 0),
      rvParking: Math.max(readNumber("rvParkingNight", REFERENCE.rvParking), 0),
      freeName: "",
      freeLocation: ""
    };
  }

  return {
    mode,
    typeLabel: "Camping investigado",
    adultNight: REFERENCE.campingAdult,
    childNight: REFERENCE.campingChild,
    rvParking: REFERENCE.rvParking,
    freeName: "",
    freeLocation: ""
  };
}

function getOtherCosts() {
  const people = Math.max(readNumber("adults", 5), 1) + Math.max(readNumber("children", 2), 0);

  const extrasCost = extras.reduce((sum, item) => {
    const amount = Math.max(Number(item.amount || 0), 0);
    const mode = item.mode || "trip";

    if (mode === "person") {
      return sum + (amount * people);
    }

    return sum + amount;
  }, 0);

  return {
    tolls: Math.max(readNumber("tollsCost", 0), 0),
    contingency: Math.max(readNumber("contingencyCost", 0), 0),
    extras: extrasCost
  };
}

function calculateForDays(days) {
  const adults = Math.max(Math.round(readNumber("adults", 5)), 1);
  const children = Math.max(Math.round(readNumber("children", 2)), 0);
  const nights = Math.max(days - 1, 0);
  const people = adults + children;

  const insurance = getInsurance();
  const rental = getRental(days);
  const insuranceCost = insurance.daily * days;
  const fuel = getFuelCost();

  const food = getFoodValues();
  const adultFoodCost = adults * food.totalMeals * food.mealCost;
  const childFoodCost = children * food.totalMeals * food.mealCost;

  const stay = getStayValues();
  const adultStayCost = adults * nights * stay.adultNight;
  const childStayCost = children * nights * stay.childNight;
  const parkingCost = nights * stay.rvParking;

  const other = getOtherCosts();

  const commonCosts =
    rental +
    insuranceCost +
    fuel +
    parkingCost +
    other.tolls +
    other.contingency +
    other.extras;

  const adultVariableCost = adultFoodCost + adultStayCost;
  const childVariableCost = childFoodCost + childStayCost;

  const total = commonCosts + adultVariableCost + childVariableCost;
  const sharedAdultCost = adults > 0 ? total / adults : 0;

  const adultBaseCost =
    adults > 0
      ? (commonCosts / adults) + (adultVariableCost / adults)
      : 0;

  const childUnitCost = children > 0 ? childVariableCost / children : 0;

  return {
    days,
    nights,
    adults,
    children,
    people,
    vehicleName: getVehicleName(),
    vehicleMode: getVehicleMode(),
    insurance,
    rental,
    insuranceCost,
    fuel,
    food,
    stay,
    other,
    adultFoodCost,
    childFoodCost,
    adultStayCost,
    childStayCost,
    parkingCost,
    commonCosts,
    adultVariableCost,
    childVariableCost,
    total,
    sharedAdultCost,
    adultWithoutChild: adultBaseCost,
    adultWithOneChild: adultBaseCost + childUnitCost,
    adultWithTwoChildren: adultBaseCost + (childUnitCost * 2)
  };
}

function calculate() {
  return calculateForDays(getDays());
}

function showError(message) {
  const error = $("formError");
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  const error = $("formError");
  error.textContent = "";
  error.hidden = true;

  document.querySelectorAll(".invalid").forEach((el) => {
    el.classList.remove("invalid");
  });
}

function validateStep1() {
  clearError();

  let valid = true;

  if (readNumber("adults", 0) < 1) {
    $("adults").classList.add("invalid");
    valid = false;
  }

  if (readNumber("children", -1) < 0) {
    $("children").classList.add("invalid");
    valid = false;
  }

  if (!selectedRadio("vehicleMode")) {
    document.querySelectorAll('input[name="vehicleMode"]')[0].closest(".option-grid").classList.add("invalid");
    valid = false;
  }

  if (getVehicleMode() === "other") {
    const days = getDays();

    if (days === 2 && readNumber("otherRental2", 0) <= 0) {
      $("otherRental2").classList.add("invalid");
      valid = false;
    }

    if (days === 3 && readNumber("otherRental3", 0) <= 0) {
      $("otherRental3").classList.add("invalid");
      valid = false;
    }
  }

  if (!selectedRadio("insurancePlan")) {
    document.querySelectorAll('input[name="insurancePlan"]')[0].closest(".option-grid").classList.add("invalid");
    valid = false;
  }

  if (!valid) {
    showError("Selecciona o introduce los datos necesarios antes de continuar.");
  }

  return valid;
}

function validateStep2() {
  clearError();

  if (!selectedPreset) {
    showError("Selecciona un perfil de gasto o introduce los valores manuales antes de continuar.");
    return false;
  }

  return true;
}

function updateStepState() {
  document.querySelectorAll(".step-tab").forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.step) === currentStep);
  });

  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.classList.toggle("active", Number(panel.dataset.panel) === currentStep);
  });
}

function goToStep(step, shouldScroll = true) {
  clearError();

  if (step > currentStep) {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
  }

  currentStep = Math.min(Math.max(step, 1), 3);
  updateStepState();

  if (currentStep === 3) {
    $("sharePanel").hidden = true;
  }

  render();

  if (shouldScroll) {
    $("app").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function renderVehicleVisibility() {
  const mode = getVehicleMode();

  $("selectedVehicleBox").hidden = mode !== "selected";
  $("otherVehicleBox").hidden = mode !== "other";
}

function renderDepositIntro() {
  const insurance = getInsurance();
  $("depositIntroTitle").textContent = `Fianza bloqueada según ${insurance.name}: ${money(insurance.deposit)}`;
}

  detail.innerHTML = `
    <strong>${preset.label}</strong>
    <ul>
      <li>Comidas: ${preset.mealsPerDay} al día · ${money(preset.mealCost)} por persona</li>
      <li>Actividades: ${money(preset.activities)}</li>
      <li>Peajes: ${money(preset.tolls)}</li>
      <li>Imprevistos: ${money(preset.contingency)}</li>
      <li>Otros gastos extra: ${money(preset.other)}</li>
    </ul>
  `;

  $("manualDetails").hidden = true;
}

function renderManualVisibility() {
  $("fuelManualFields").hidden = selectedRadio("fuelMode", "reference") !== "manual";
  $("foodManualFields").hidden = selectedRadio("foodMode", "reference") !== "manual";

  const stayMode = selectedRadio("stayMode", "reference");
  $("stayManualFields").hidden = stayMode !== "manual";
  $("stayFreeFields").hidden = stayMode !== "free";
}

function renderExtras() {
  const list = $("extrasList");

  list.innerHTML = extras.map((item, index) => `
    <div class="extra-row">
  <input type="text" value="${escapeHtml(item.name)}" placeholder="Nombre del gasto extra" data-extra-index="${index}" data-extra-field="name">

  <input type="number" min="0" step="0.01" value="${Number(item.amount || 0)}" placeholder="Coste (€)" data-extra-index="${index}" data-extra-field="amount">

  <select data-extra-index="${index}" data-extra-field="mode">
    <option value="trip" ${item.mode === "trip" ? "selected" : ""}>Sumarse una sola vez al viaje</option>
    <option value="person" ${item.mode === "person" ? "selected" : ""}>Sumarse a cada persona del viaje</option>
  </select>

  <button class="icon-btn" type="button" data-remove-extra="${index}">×</button>
</div>
  `).join("");

  list.querySelectorAll("[data-extra-index]").forEach((input) => {
    input.addEventListener("input", function () {
  const index = Number(this.dataset.extraIndex);
  const field = this.dataset.extraField;

  if (!extras[index]) return;

  extras[index][field] = field === "amount" ? Number(this.value || 0) : this.value;
  render();
});

input.addEventListener("change", function () {
  const index = Number(this.dataset.extraIndex);
  const field = this.dataset.extraField;

  if (!extras[index]) return;

  extras[index][field] = field === "amount" ? Number(this.value || 0) : this.value;
  render();
});
  });

  list.querySelectorAll("[data-remove-extra]").forEach((button) => {
    button.addEventListener("click", function () {
      extras.splice(Number(this.dataset.removeExtra), 1);
      renderExtras();
      render();
    });
  });
}

function addExtra() {
  extras.push({
    name: "",
    amount: 0,
    mode: "trip"
  });

  renderExtras();
  render();
}

function getBreakdownSections(c) {
  const sections = [
    {
      title: "Datos del viaje",
      rows: [
        ["Autocaravana", c.vehicleName],
        ["Duración", `${c.days} días / ${c.nights} noche${c.nights === 1 ? "" : "s"}`],
        ["Adultos", c.adults],
        ["Niños", c.children],
        ["Seguro seleccionado", c.insurance.name],
        ["Fianza bloqueada", money(c.insurance.deposit)]
      ]
    },
    {
      title: "Resultado",
      rows: [
        ["Total estimado sin fianza", money(c.total)],
        ["Opción A · coste por adulto", money(c.sharedAdultCost)],
        ["Opción B · adulto sin niño", money(c.adultWithoutChild)],
        ["Opción B · adulto con 1 niño", money(c.adultWithOneChild)],
        ["Opción B · adulto con 2 niños", money(c.adultWithTwoChildren)]
      ]
    },
    {
      title: "Distribución del coste",
      rows: [
        ["Grupo", `${c.adults} adulto(s) y ${c.children} niño(s)`],
        ["Opción A", "Divide el total del viaje entre los adultos asistentes."],
        ["Opción B", "Separa el coste de un adulto sin niño y el coste de un adulto responsable de un niño."]
      ]
    },
    {
      title: "Gastos principales",
      rows: [
        ["Alquiler autocaravana", money(c.rental)],
        ["Seguro", money(c.insuranceCost)],
        ["Combustible", money(c.fuel)],
        ["Comidas adultos", money(c.adultFoodCost)],
        ["Comidas niños", money(c.childFoodCost)],
        ["Pernocta adultos", money(c.adultStayCost)],
        ["Pernocta niños", money(c.childStayCost)],
        ["Parking autocaravana", money(c.parkingCost)],
        ["Peajes", money(c.other.tolls)],
        ["Imprevistos", money(c.other.contingency)],
        ["Gastos extra", money(c.other.extras)]
      ]
    },
    {
      title: "Pernocta seleccionada",
      rows: [
        ["Tipo", c.stay.typeLabel]
      ]
    }
  ];

  if (c.stay.mode === "free") {
    sections[4].rows.push(["Lugar", c.stay.freeName || "No indicado"]);
    sections[4].rows.push(["Ubicación", c.stay.freeLocation || "No indicada"]);
  }

  if (c.stay.mode === "manual") {
    sections[4].rows.push(["Adulto/noche", money(c.stay.adultNight)]);
    sections[4].rows.push(["Niño/noche", money(c.stay.childNight)]);
    sections[4].rows.push(["Parking/noche", money(c.stay.rvParking)]);
  }

  if (extras.length > 0 && selectedPreset === "manual") {
    sections.push({
      title: "Gastos extra introducidos",
      rows: extras.map((item) => [
        item.name || "Gasto extra",
        money(item.amount)
      ])
    });
  }

  return sections;
}

function renderBreakdown(c) {
  const sections = getBreakdownSections(c);

  $("breakdownList").innerHTML = sections.map((section) => {
    const rows = section.rows.map(([label, value]) => {
      const safeLabel = escapeHtml(label);
      const safeValue = escapeHtml(value);

      if (label === "Ubicación" && isValidUrl(value)) {
        return `
          <div class="break-row">
            <span>${safeLabel}</span>
            <a href="${safeValue}" target="_blank" rel="noopener noreferrer">Ver ubicación en Google Maps</a>
          </div>
        `;
      }

      return `
        <div class="break-row">
          <span>${safeLabel}</span>
          <strong>${safeValue}</strong>
        </div>
      `;
    }).join("");

    return `
      <section class="breakdown-section">
        <h4>${escapeHtml(section.title)}</h4>
        ${rows}
      </section>
    `;
  }).join("");
}

function buildShareText(c) {
  const sections = getBreakdownSections(c);

  return sections.map((section) => {
    const rows = section.rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    return `${section.title}\n${rows}`;
  }).join("\n\n");
}

function renderResults(c) {
  $("selectedRental3Label").textContent = money(SELECTED_RENTAL_3_DAYS);

  $("sharedAdultCost").textContent = money(c.sharedAdultCost);
  $("tripTotal").textContent = money(c.total);
  $("adultWithoutChild").textContent = money(c.adultWithoutChild);
  $("adultWithOneChild").textContent = money(c.adultWithOneChild);

  $("depositShortLabel").textContent = `+ ${money(c.insurance.deposit)} bloqueados en cuenta`;
  $("depositResultTitle").textContent = `Fianza bloqueada: ${money(c.insurance.deposit)}`;
}

function renderShare(c) {
  $("shareText").value = buildShareText(c);
}

function openMaps() {
  const location = $("freeStayLocation").value.trim() || "Valencia de Don Juan, León";
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function render() {
  renderVehicleVisibility();
  renderDepositIntro();
  renderManualVisibility();

  const c = calculate();

  renderResults(c);
  renderBreakdown(c);
  renderShare(c);
}

function init() {
  $("selectedRental3Label").textContent = money(SELECTED_RENTAL_3_DAYS);

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  });

  document.querySelectorAll(".step-tab").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(Number(btn.dataset.step), true));
  });

  $("startBtn").addEventListener("click", () => {
    $("app").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("step1NextBtn").addEventListener("click", () => goToStep(2, true));
  $("step2BackBtn").addEventListener("click", () => goToStep(1, true));
  $("step2NextBtn").addEventListener("click", () => goToStep(3, true));
  $("restartNavBtn").addEventListener("click", () => goToStep(1, true));

  $("addExtraBtn").addEventListener("click", addExtra);
  $("mapsBtn").addEventListener("click", openMaps);

  $("showShareBtn").addEventListener("click", () => {
    $("sharePanel").hidden = false;
    $("shareText").value = buildShareText(calculate());
    $("sharePanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("closeShareBtn").addEventListener("click", () => {
    $("sharePanel").hidden = true;
    $("breakdownList").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("shareText").value);
      alert("Resumen copiado.");
    } catch {
      $("shareText").select();
      document.execCommand("copy");
      alert("Resumen copiado.");
    }
  });

  $("whatsappBtn").addEventListener("click", () => {
    const text = encodeURIComponent($("shareText").value);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  });

  renderExtras();
  updateStepState();
  render();
}

document.addEventListener("DOMContentLoaded", init);
