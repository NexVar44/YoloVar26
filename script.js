let currentStep = 1;

const BASE_RENTAL_COST = 401.88;
const BASE_RENTAL_DAYS = 3;
const FIXED_CONSUMPTION = 10;
const RV_PAGE_URL = "https://www.camplify.es/rv/17531?startDate=2026-08-11&endDate=2026-08-13&hireType=4&excessReductionId=208";

let extraItems = [
  { name: "Otros gastos", amount: 0 }
];

const stepTitles = {
  1: "Datos del viaje",
  2: "Tarifas investigadas",
  3: "Comida y pernocta",
  4: "Resumen y compartir"
};

const defaults = {
  userName: "",
  startDate: "2026-08-11",
  endDate: "2026-08-13",
  origin: "Oviedo, Asturias",
  destination: "Valencia de Don Juan, León",
  adults: 5,
  children: 2,
  payingAdults: 5,
  shareMode: "all",
  familyAdults: 1,
  familyChildren: 0,
  customCoveredPeople: 1,
  customPayers: 1,
  personalBudget: "",
  insurancePlan: "comfort",
  baseKm: 306,
  extraKm: 0,
  dieselPrice: 1.60,
  foodPlan: "balanced",
  totalMealsInput: 8,
  mealCost: 5,
  stayName: "Área o camping por confirmar",
  stayAddress: "Valencia de Don Juan, León",
  isFreeStay: false,
  stayCostNight: 0
};

function euro(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";

  if (el.type === "checkbox") return el.checked;

  if (el.type === "number") {
    if (el.value === "") return "";
    return Number(el.value || 0);
  }

  return el.value;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.type === "checkbox") {
    el.checked = Boolean(value);
    return;
  }

  el.value = value;
}

function getNumber(id, fallback = 0) {
  const value = getValue(id);
  if (value === "") return fallback;
  return Number(value);
}

function getTripDuration() {
  const start = new Date(getValue("startDate"));
  const end = new Date(getValue("endDate"));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { tripDays: 3, stayNights: 2 };
  }

  const diffMs = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    return { tripDays: 1, stayNights: 0 };
  }

  return {
    tripDays: diffDays + 1,
    stayNights: diffDays
  };
}

function openRvPage() {
  window.open(RV_PAGE_URL, "_blank", "noopener,noreferrer");
}

function selectInsurance(plan) {
  setValue("insurancePlan", plan);

  document.getElementById("insuranceBasicCard").classList.toggle("active", plan === "basic");
  document.getElementById("insuranceComfortCard").classList.toggle("active", plan === "comfort");

  render();
}

function getInsurance() {
  const plan = getValue("insurancePlan");

  if (plan === "basic") {
    return {
      name: "Protección básica",
      dailyCost: 6,
      deposit: 1500
    };
  }

  return {
    name: "Protección confort",
    dailyCost: 11.99,
    deposit: 750
  };
}

function syncFoodPlan() {
  const plan = getValue("foodPlan");

  if (plan === "home") {
    setValue("mealCost", 3);
  }

  if (plan === "balanced") {
    setValue("mealCost", 5);
  }
}

function normalizeIntegerField(id, minValue = 0) {
  const value = Math.max(Math.round(getNumber(id, minValue)), minValue);
  setValue(id, value);
}

function normalizeIntegerInputs() {
  [
    ["adults", 1],
    ["children", 0],
    ["payingAdults", 1],
    ["familyAdults", 1],
    ["familyChildren", 0],
    ["customCoveredPeople", 1],
    ["customPayers", 1],
    ["baseKm", 0],
    ["extraKm", 0],
    ["totalMealsInput", 0]
  ].forEach(([id, min]) => normalizeIntegerField(id, min));
}

function updateConditionalFields() {
  const mode = getValue("shareMode");

  document.getElementById("familyFields").style.display = mode === "family" ? "block" : "none";
  document.getElementById("customFields").style.display = mode === "custom" ? "block" : "none";
}

function updateFreeStayState() {
  const isFree = getValue("isFreeStay");
  const costInput = document.getElementById("stayCostNight");

  if (isFree) {
    setValue("stayCostNight", 0);
    costInput.disabled = true;
  } else {
    costInput.disabled = false;
  }
}

function markFreeStay() {
  const currentName = getValue("stayName");
  const currentAddress = getValue("stayAddress");

  if (!currentName || currentName === "Área o camping por confirmar") {
    setValue("stayName", "Área gratuita o aparcamiento permitido");
  }

  if (!currentAddress) {
    setValue("stayAddress", "Valencia de Don Juan, León");
  }

  setValue("isFreeStay", true);
  updateFreeStayState();
  render();
}

function useReferenceStay() {
  setValue("stayName", "Referencia de precio: camping sin disponibilidad confirmada");
  setValue("isFreeStay", false);
  setValue("stayCostNight", 62.75);
  updateFreeStayState();
  render();
}

function addExtraItem() {
  extraItems.push({ name: "", amount: 0 });
  renderExtraItems();
  render();
}

function removeExtraItem(index) {
  extraItems.splice(index, 1);

  if (extraItems.length === 0) {
    extraItems.push({ name: "", amount: 0 });
  }

  renderExtraItems();
  render();
}

function updateExtraName(index, value) {
  extraItems[index].name = value;
  render();
}

function updateExtraAmount(index, value) {
  extraItems[index].amount = Number(value || 0);
  render();
}

function renderExtraItems() {
  const container = document.getElementById("extrasList");

  container.innerHTML = extraItems.map((item, index) => `
    <div class="extra-item">
      <div class="extra-item-header">
        <strong>Gasto extra ${index + 1}</strong>
        <button class="remove-btn" onclick="removeExtraItem(${index})">Quitar</button>
      </div>

      <div class="grid-2">
        <label>
          Nombre del gasto
          <input
            class="editable-control auto-select"
            type="text"
            value="${item.name || ""}"
            placeholder="Ejemplo: pañales, peajes, electricidad"
            oninput="updateExtraName(${index}, this.value)"
          >
        </label>

        <label>
          Monto (€)
          <input
            class="editable-control auto-select"
            type="number"
            min="0"
            step="0.01"
            value="${item.amount || 0}"
            oninput="updateExtraAmount(${index}, this.value)"
          >
        </label>
      </div>
    </div>
  `).join("");

  attachAutoSelect();
}

function getExtrasTotal() {
  return extraItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getValidExtras() {
  return extraItems.filter(item => item.name || Number(item.amount || 0) > 0);
}

function getExtrasSummary() {
  const valid = getValidExtras();
  if (!valid.length) return "Sin gastos extra añadidos";
  return valid.map(item => `${item.name || "Gasto extra"}: ${euro(item.amount)}`).join(" · ");
}

function getShareResult(baseCosts) {
  const mode = getValue("shareMode");
  const adults = Math.max(Math.round(getNumber("adults", 1)), 1);
  const children = Math.max(Math.round(getNumber("children", 0)), 0);
  const travelers = adults + children;
  const payingAdults = Math.max(Math.round(getNumber("payingAdults", 1)), 1);

  const familyAdults = Math.max(Math.round(getNumber("familyAdults", 1)), 1);
  const familyChildren = Math.max(Math.round(getNumber("familyChildren", 0)), 0);
  const familyPeople = familyAdults + familyChildren;

  const customCoveredPeople = Math.max(Math.round(getNumber("customCoveredPeople", 1)), 1);
  const customPayers = Math.max(Math.round(getNumber("customPayers", 1)), 1);

  const operationalTotal = baseCosts.operationalTotal;

  if (mode === "family") {
    const proportionalCost = travelers > 0
      ? operationalTotal * (familyPeople / travelers)
      : operationalTotal;

    return {
      label: "Coste estimado de tu grupo familiar",
      perAdultCost: proportionalCost / familyAdults,
      note: `Distribución familiar: se estima la parte correspondiente a ${familyAdults} adulto(s) y ${familyChildren} niño(s), dentro de un total de ${travelers} personas.`
    };
  }

  if (mode === "custom") {
    const proportionalCost = travelers > 0
      ? operationalTotal * (customCoveredPeople / travelers)
      : operationalTotal;

    return {
      label: "Coste estimado de la distribución personalizada",
      perAdultCost: proportionalCost / customPayers,
      note: `Distribución personalizada: se calcula la parte de ${customCoveredPeople} persona(s), repartida entre ${customPayers} adulto(s).`
    };
  }

  return {
    label: "Coste estimado por adulto responsable",
    perAdultCost: operationalTotal / payingAdults,
    note: `Distribución común: los gastos de ${adults} adultos y ${children} niños se reparten entre ${payingAdults} adulto(s) responsable(s).`
  };
}

function calculate() {
  const { tripDays, stayNights } = getTripDuration();

  const adults = Math.max(Math.round(getNumber("adults", 1)), 1);
  const children = Math.max(Math.round(getNumber("children", 0)), 0);
  const travelers = adults + children;

  const dailyRentalCost = BASE_RENTAL_COST / BASE_RENTAL_DAYS;
  const rentalCost = dailyRentalCost * tripDays;

  const insurance = getInsurance();
  const insuranceDays = tripDays;
  const insuranceTotal = insurance.dailyCost * insuranceDays;

  const baseKm = Math.max(Math.round(getNumber("baseKm", 0)), 0);
  const extraKm = Math.max(Math.round(getNumber("extraKm", 0)), 0);
  const totalKm = baseKm + extraKm;
  const dieselPrice = Math.max(getNumber("dieselPrice", 0), 0);
  const fuelLiters = (totalKm * FIXED_CONSUMPTION) / 100;
  const fuelTotal = fuelLiters * dieselPrice;

  const totalMeals = Math.max(Math.round(getNumber("totalMealsInput", 0)), 0);
  const mealCost = Math.max(getNumber("mealCost", 0), 0);
  const foodTotal = totalMeals * mealCost * travelers;

  const isFreeStay = getValue("isFreeStay");
  const stayCostNight = isFreeStay ? 0 : Math.max(getNumber("stayCostNight", 0), 0);
  const stayTotal = stayCostNight * stayNights;

  const extraCost = getExtrasTotal();

  const operationalTotal =
    rentalCost +
    insuranceTotal +
    fuelTotal +
    foodTotal +
    stayTotal +
    extraCost;

  const share = getShareResult({ operationalTotal });
  const initialBlock = operationalTotal + insurance.deposit;

  const personalBudgetRaw = getValue("personalBudget");
  const personalBudget = personalBudgetRaw === "" ? null : Number(personalBudgetRaw);
  const missing = personalBudget === null ? null : share.perAdultCost - personalBudget;

  return {
    adults,
    children,
    travelers,
    tripDays,
    stayNights,
    dailyRentalCost,
    rentalCost,
    insurance,
    insuranceDays,
    insuranceTotal,
    baseKm,
    extraKm,
    totalKm,
    dieselPrice,
    fuelLiters,
    fuelTotal,
    totalMeals,
    mealCost,
    foodTotal,
    isFreeStay,
    stayCostNight,
    stayTotal,
    extraCost,
    operationalTotal,
    initialBlock,
    personalBudget,
    missing,
    share
  };
}

function renderCart(c) {
  const validExtras = getValidExtras();

  const rows = [
    { label: `Vehículo · alquiler estimado (${c.tripDays} día(s))`, value: c.rentalCost },
    { label: `${c.insurance.name} · ${c.insuranceDays} día(s)`, value: c.insuranceTotal },
    { label: `Combustible · ${c.baseKm} km base + ${c.extraKm} km extra`, value: c.fuelTotal },
    { label: `Comida · ${c.totalMeals} comida(s) · ${c.travelers} personas`, value: c.foodTotal },
    { label: `Pernocta · ${c.stayNights} noche(s)`, value: c.stayTotal },
    { label: "Total gastos extra", value: c.extraCost, emphasis: validExtras.length > 0 }
  ];

  validExtras.forEach(item => {
    rows.push({
      label: `• ${item.name || "Gasto extra"}`,
      value: Number(item.amount || 0),
      subitem: true
    });
  });

  rows.push(
    { label: "Coste operativo total del grupo", value: c.operationalTotal, emphasis: true },
    { label: c.share.label, value: c.share.perAdultCost, emphasis: true },
    { label: "Fianza bloqueada aparte", value: c.insurance.deposit },
    { label: "Desembolso inicial con fianza", value: c.initialBlock }
  );

  document.getElementById("cartList").innerHTML = rows
    .map(row => `
      <div class="cart-row ${row.emphasis ? "emphasis" : ""} ${row.subitem ? "subitem" : ""}">
        <span>${row.label}</span>
        <strong>${euro(row.value)}</strong>
      </div>
    `)
    .join("");
}

function renderBudgetStatus(c) {
  const status = document.getElementById("budgetStatus");

  if (c.personalBudget === null) {
    status.textContent = "Sin presupuesto personal indicado. Se muestra solo el coste estimado por adulto.";
    return;
  }

  if (c.missing <= 0) {
    status.textContent = `Presupuesto personal indicado: ${euro(c.personalBudget)}. El cálculo queda por debajo de ese límite por ${euro(Math.abs(c.missing))}.`;
    return;
  }

  status.textContent = `Presupuesto personal indicado: ${euro(c.personalBudget)}. Para cubrir este escenario faltarían ${euro(c.missing)}.`;
}

function renderStepUI() {
  document.getElementById("stepCounter").textContent = `${currentStep}/4 · ${stepTitles[currentStep]}`;
  document.getElementById("progressFill").style.width = `${currentStep * 25}%`;

  document.querySelectorAll(".step-tab").forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.step) === currentStep);
  });

  document.querySelector(".app-card").classList.toggle("steps-mode", currentStep !== 1);
}

function renderComputedLabels(c) {
  const durationText = `${c.tripDays} día(s) / ${c.stayNights} noche(s)`;

  document.getElementById("computedDurationMain").textContent = durationText;
  document.getElementById("derivedDurationStep2").textContent = durationText;
  document.getElementById("derivedTripDaysStep3").textContent = c.tripDays;
  document.getElementById("derivedStayNightsStep3").textContent = c.stayNights;

  document.getElementById("baseRentalLabel").textContent = euro(BASE_RENTAL_COST);
  document.getElementById("dailyRentalLabel").textContent = euro(c.dailyRentalCost);

  document.getElementById("computedRentalCost").textContent = euro(c.rentalCost);
  document.getElementById("computedInsuranceCost").textContent = euro(c.insuranceTotal);
  document.getElementById("computedFuelCost").textContent = euro(c.fuelTotal);
  document.getElementById("computedFoodCost").textContent = euro(c.foodTotal);
  document.getElementById("computedStayCost").textContent = euro(c.stayTotal);

  document.getElementById("depositLabel").textContent = euro(c.insurance.deposit);
  document.getElementById("insuranceNameLabel").textContent = c.insurance.name;
  document.getElementById("insuranceDailyLabel").textContent = euro(c.insurance.dailyCost);
  document.getElementById("insuranceDaysLabel").textContent = c.insuranceDays;
}

function render() {
  updateConditionalFields();
  updateFreeStayState();

  const c = calculate();

  document.getElementById("adultTotal").textContent = euro(c.share.perAdultCost);
  document.getElementById("shareModeNote").textContent = c.share.note;

  renderBudgetStatus(c);
  renderCart(c);
  renderStepUI();
  renderComputedLabels(c);

  const plan = getValue("insurancePlan");
  document.getElementById("insuranceBasicCard").classList.toggle("active", plan === "basic");
  document.getElementById("insuranceComfortCard").classList.toggle("active", plan === "comfort");
}

function scrollToActiveStep() {
  const anchor = document.getElementById("stepAnchor");
  if (!anchor) return;

  setTimeout(() => {
    anchor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 40);
}

function setActiveStep(step, shouldScroll = true) {
  currentStep = Math.min(Math.max(step, 1), 4);

  document.querySelectorAll(".step").forEach((el) => {
    el.classList.remove("active");
  });

  const activeStep = document.getElementById(`step${currentStep}`);
  if (activeStep) {
    activeStep.classList.add("active");
  }

  render();

  if (shouldScroll) {
    scrollToActiveStep();
  }
}

function goToStep(step) {
  setActiveStep(step, true);
}

function nextStep() {
  setActiveStep(currentStep + 1, true);
}

function prevStep() {
  setActiveStep(currentStep - 1, true);
}

function goHome() {
  setActiveStep(1, true);
}

function openMaps() {
  const origin = encodeURIComponent(getValue("origin"));
  const destination = encodeURIComponent(getValue("stayAddress") || getValue("destination"));

  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function confirmResetAll() {
  const confirmed = window.confirm("¿Seguro que quieres reiniciar toda la simulación? Se perderán los cambios realizados.");

  if (confirmed) {
    resetApp();
  }
}

function resetApp() {
  Object.entries(defaults).forEach(([key, value]) => {
    setValue(key, value);
  });

  extraItems = [
    { name: "Otros gastos", amount: 0 }
  ];

  renderExtraItems();
  updateFreeStayState();
  setActiveStep(1, true);
}

function buildSummary() {
  const c = calculate();
  const userName = getValue("userName") || "Invitado sin nombre seleccionado";
  const validExtras = getValidExtras();

  let budgetLine = "No se indicó presupuesto personal para comparar.";

  if (c.personalBudget !== null) {
    budgetLine =
      c.missing > 0
        ? `Presupuesto indicado: ${euro(c.personalBudget)}. Faltaría cubrir: ${euro(c.missing)}.`
        : `Presupuesto indicado: ${euro(c.personalBudget)}. El cálculo queda por debajo de ese límite por ${euro(Math.abs(c.missing))}.`;
  }

  const extrasText = validExtras.length
    ? validExtras.map(item => `- ${item.name || "Gasto extra"}: ${euro(item.amount)}`).join("\n")
    : "- Sin gastos extra añadidos";

  return `YoloVar · Presupuesto viaje en autocaravana

Consulta de: ${userName}
Fechas: ${getValue("startDate")} al ${getValue("endDate")}
Duración calculada: ${c.tripDays} día(s) / ${c.stayNights} noche(s)
Ruta investigada: ${getValue("origin")} → ${getValue("destination")} → ${getValue("origin")}

Autocaravana:
Iguana Camp SIENA 435 “triple 7”
Ficha: ${RV_PAGE_URL}
Precio base investigado: ${euro(BASE_RENTAL_COST)} para 3 días / 2 noches
Alquiler estimado según fechas: ${euro(c.rentalCost)}

Personas:
${c.adults} adultos + ${c.children} niños
Adultos que pagan: ${getValue("payingAdults")}
Distribución de gastos: ${c.share.note}

Seguro:
${c.insurance.name}
Coste diario: ${euro(c.insurance.dailyCost)}
Días calculados: ${c.insuranceDays}
Total seguro: ${euro(c.insuranceTotal)}
Fianza bloqueada: ${euro(c.insurance.deposit)}
La fianza es un bloqueo, no un gasto si no hay daños.

Combustible:
Ruta base: ${c.baseKm} km
Km extra: ${c.extraKm} km
Consumo fijo usado: 10 L/100 km
Diésel estimado: ${euro(c.fuelTotal)}

Comida:
Comidas totales consideradas: ${c.totalMeals}
Coste por comida/persona: ${euro(c.mealCost)}
Total comida: ${euro(c.foodTotal)}

Pernocta:
${getValue("stayName")}
${getValue("stayAddress")}
Área gratuita: ${c.isFreeStay ? "Sí" : "No"}
Noches calculadas: ${c.stayNights}
Coste por noche: ${euro(c.stayCostNight)}
Coste pernocta: ${euro(c.stayTotal)}

Gastos extra:
${extrasText}
Total gastos extra: ${euro(c.extraCost)}

Coste operativo total del grupo: ${euro(c.operationalTotal)}
Coste estimado por adulto: ${euro(c.share.perAdultCost)}

${budgetLine}`;
}

async function copySummary() {
  const text = buildSummary();

  try {
    await navigator.clipboard.writeText(text);
    alert("Resumen copiado. Ya puedes pegarlo en WhatsApp.");
  } catch (error) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    alert("Resumen copiado.");
  }
}

function downloadCSV() {
  const c = calculate();
  const userName = getValue("userName") || "Invitado sin nombre seleccionado";

  const rows = [
    ["Concepto", "Detalle", "Importe"],
    ["Usuario", userName, ""],
    ["Fechas", `${getValue("startDate")} al ${getValue("endDate")}`, ""],
    ["Duración calculada", `${c.tripDays} días / ${c.stayNights} noches`, ""],
    ["Ruta investigada", `${getValue("origin")} a ${getValue("destination")} y regreso`, ""],
    ["Autocaravana", "Iguana Camp SIENA 435 triple 7", ""],
    ["Ficha autocaravana", RV_PAGE_URL, ""],
    ["Precio base investigado", "3 días / 2 noches", BASE_RENTAL_COST],
    ["Alquiler estimado", "Proporcional según fechas", c.rentalCost],
    ["Adultos", c.adults, ""],
    ["Niños", c.children, ""],
    ["Adultos que pagan", getValue("payingAdults"), ""],
    ["Distribución de gastos", c.share.note, ""],
    ["Seguro", `${c.insurance.name} · ${c.insuranceDays} días`, c.insuranceTotal],
    ["Fianza bloqueada", c.insurance.name, c.insurance.deposit],
    ["Ruta base km", c.baseKm, ""],
    ["Km extra", c.extraKm, ""],
    ["Diésel", `${c.totalKm} km · ${c.fuelLiters.toFixed(1)} litros`, c.fuelTotal],
    ["Comidas totales consideradas", c.totalMeals, ""],
    ["Comida", `${c.totalMeals} comidas · ${c.travelers} personas`, c.foodTotal],
    ["Área gratuita", c.isFreeStay ? "Sí" : "No", ""],
    ["Noches de pernocta", c.stayNights, ""],
    ["Pernocta", `${getValue("stayName")} · ${getValue("stayAddress")}`, c.stayTotal],
    ["Total gastos extra", getExtrasSummary(), c.extraCost],
    ["Coste operativo total", "Sin fianza", c.operationalTotal],
    ["Coste estimado por adulto", c.share.label, c.share.perAdultCost],
    ["Desembolso inicial", "Coste operativo + fianza", c.initialBlock]
  ];

  getValidExtras().forEach(item => {
    rows.push(["Gasto extra individual", item.name || "Gasto extra", Number(item.amount || 0)]);
  });

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "presupuesto-yolovar-autocaravana.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

async function shareSummary() {
  const text = buildSummary();

  if (navigator.share) {
    try {
      await navigator.share({
        title: "YoloVar · Presupuesto viaje",
        text
      });
    } catch (error) {
      console.log("Compartir cancelado o no disponible");
    }
  } else {
    await copySummary();
  }
}

function attachAutoSelect() {
  document.querySelectorAll("input.auto-select, input.editable-control").forEach((input) => {
    input.addEventListener("focus", function () {
      if (this.type !== "checkbox" && !this.disabled) {
        setTimeout(() => this.select(), 40);
      }
    });
  });
}

document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => {
    if (input.id === "foodPlan") {
      syncFoodPlan();
    }

    if (input.id === "isFreeStay") {
      updateFreeStayState();
    }

    normalizeIntegerInputs();
    render();
  });

  input.addEventListener("change", () => {
    if (input.id === "foodPlan") {
      syncFoodPlan();
    }

    if (input.id === "isFreeStay") {
      updateFreeStayState();
    }

    normalizeIntegerInputs();
    render();
  });
});

renderExtraItems();
attachAutoSelect();
updateFreeStayState();
setActiveStep(1, false);