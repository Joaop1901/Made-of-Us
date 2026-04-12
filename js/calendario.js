let selectedDate = new Date();

(() => {
  "use strict";

  // DATA
  const SUPABASE_URL = "https://ygyloggscofzahazpqvh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UbeQxcKD8gO_1aWFwCLZWA_Nbaohyp4";
  const DB_TABLE = "menstrual_data";
  const DB_COLUMNS_CACHE_KEY = "calendar_db_columns";
  const DB_COLUMN_CANDIDATES = [
    { date: "data", type: "tipo" },
    { date: "date", type: "type" },
    { date: "dia", type: "tipo" },
    { date: "data", type: "type" },
    { date: "dia", type: "type" },
  ];

  const STORAGE_KEY = "calendar_data";
  const DOUBLE_CLICK_MS = 300;
  const PREDICTION_DAYS_AHEAD = 120;
  const MIN_CYCLE_INTERVALS_FOR_PREDICTION = 2;
  const MIN_VALID_CYCLE_LENGTH = 20;
  const MAX_VALID_CYCLE_LENGTH = 40;
  const MIN_VALID_PERIOD_LENGTH = 2;
  const MAX_VALID_PERIOD_LENGTH = 8;
  const MAX_CYCLE_SPREAD_DAYS = 9;
  const MAX_CONSECUTIVE_MISSED_PERIOD_DAYS = 2;
  const MAX_DAYS_UNTIL_NEXT_PERIOD_TO_DISPLAY = 45;
  const VALID_TYPES = new Set(["menstruation", "sex"]);

  // UI
  const bodyEl = document.body;
  const calendarGrid = document.getElementById("calendarGrid");
  const monthNameEl = document.getElementById("monthName");
  const yearNumberEl = document.getElementById("yearNumber");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const mainNavEl = document.getElementById("mainNav");

  const cycleCard = document.getElementById("cycleCard");
  const cycleSelectedDateEl = document.getElementById("cycleSelectedDate");
  const cycleLeadEl = document.getElementById("cycleLead");
  const cycleTitleEl = document.getElementById("cycleTitle");
  const cycleSubtitleEl = document.getElementById("cycleSubtitle");
  const cycleMetaNextEl = document.getElementById("cycleMetaNext");
  const cycleMetaCountdownEl = document.getElementById("cycleMetaCountdown");
  const cycleMetaFertileEl = document.getElementById("cycleMetaFertile");
  const cycleRegisterBtn = document.getElementById("cycleRegisterBtn");

  if (
    !calendarGrid ||
    !monthNameEl ||
    !yearNumberEl ||
    !prevMonthBtn ||
    !nextMonthBtn ||
    !cycleCard ||
    !cycleLeadEl
  ) {
    console.error("Calendario: elementos essenciais nao encontrados.");
    return;
  }

  // DATA
  function createSupabaseClient() {
    try {
      if (!window.supabase?.createClient) return null;
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (error) {
      console.error("Erro ao iniciar Supabase:", error);
      return null;
    }
  }

  const supabaseClient = createSupabaseClient();
  let resolvedDbColumns = loadCachedDbColumns();
  let dbWriteDisabled = false;

  function isValidDbColumns(value) {
    return (
      value &&
      typeof value === "object" &&
      typeof value.date === "string" &&
      value.date.trim().length > 0 &&
      typeof value.type === "string" &&
      value.type.trim().length > 0
    );
  }

  function loadCachedDbColumns() {
    try {
      const raw = localStorage.getItem(DB_COLUMNS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isValidDbColumns(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveCachedDbColumns(columns) {
    if (!isValidDbColumns(columns)) return;
    try {
      localStorage.setItem(DB_COLUMNS_CACHE_KEY, JSON.stringify(columns));
    } catch {
      // sem impacto no fluxo
    }
  }

  function clearCachedDbColumns() {
    try {
      localStorage.removeItem(DB_COLUMNS_CACHE_KEY);
    } catch {
      // sem impacto no fluxo
    }
  }

  function getDbCandidates() {
    if (!resolvedDbColumns) return DB_COLUMN_CANDIDATES;
    const merged = [resolvedDbColumns, ...DB_COLUMN_CANDIDATES];
    const deduped = [];
    const seen = new Set();

    merged.forEach((candidate) => {
      const key = `${candidate.date}::${candidate.type}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(candidate);
    });

    return deduped;
  }

  function isMissingColumnError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    return code === "PGRST204" || message.includes("could not find") && message.includes("column");
  }

  function isAuthOrPermissionError(error) {
    const code = String(error?.code || "");
    const status = Number(error?.status || 0);
    const message = String(error?.message || "").toLowerCase();
    return (
      code === "42501" ||
      status === 401 ||
      message.includes("unauthorized") ||
      message.includes("row-level security")
    );
  }

  function isPrimaryKeyConflict(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    return code === "23505" && message.includes("menstrual_data_pkey");
  }

  async function saveToDatabase(date, type) {
    if (!supabaseClient || dbWriteDisabled) return;

    const candidates = getDbCandidates();
    let lastError = null;

    for (const columns of candidates) {
      const payload = {
        [columns.date]: date,
        [columns.type]: type,
      };

      try {
        const { error } = await supabaseClient
          .from(DB_TABLE)
          .insert([payload]);

        if (!error) {
          if (!resolvedDbColumns || resolvedDbColumns.date !== columns.date || resolvedDbColumns.type !== columns.type) {
            resolvedDbColumns = columns;
            saveCachedDbColumns(columns);
            console.log(
              `Supabase: usando colunas ${resolvedDbColumns.date}/${resolvedDbColumns.type} em ${DB_TABLE}.`
            );
          }
          return;
        }

        lastError = error;

        // Se estamos tentando auto-descobrir e a coluna não existe, tenta próximo formato.
        if (isMissingColumnError(error)) {
          // Se o cache estiver incorreto, remove e tenta as próximas combinações.
          if (resolvedDbColumns && resolvedDbColumns.date === columns.date && resolvedDbColumns.type === columns.type) {
            resolvedDbColumns = null;
            clearCachedDbColumns();
          }
          continue;
        }

        if (isAuthOrPermissionError(error)) {
          dbWriteDisabled = true;
          console.warn("Supabase bloqueado por Auth/RLS no calendario:", error);
          return;
        }

        if (isPrimaryKeyConflict(error)) {
          dbWriteDisabled = true;
          console.error(
            "Conflito de chave primaria em menstrual_data (id duplicado). " +
            "A sequencia do id no Supabase precisa ser sincronizada.",
            error
          );
          return;
        }

        console.error("Erro ao salvar no banco:", error);
        return;
      } catch (error) {
        console.error("Falha de rede ao salvar no banco:", error);
        return;
      }
    }

    if (lastError) {
      dbWriteDisabled = true;
      console.error(
        `Nao foi possivel salvar em ${DB_TABLE}: ajuste os nomes das colunas (ex.: date/type ou data/tipo).`,
        lastError
      );
    }
  }

  function parseISODate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function formatDateLabel(date) {
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function diffInDays(startDate, endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((end - start) / msPerDay);
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function normalizeEntry(value) {
    const base = {
      types: [],
      symptoms: [],
      notes: "",
    };

    if (typeof value === "string") {
      if (VALID_TYPES.has(value)) base.types = [value];
      return base;
    }

    if (Array.isArray(value)) {
      base.types = [...new Set(value.filter((type) => VALID_TYPES.has(type)))];
      return base;
    }

    if (value && typeof value === "object") {
      const rawTypes = Array.isArray(value.types) ? value.types : [];
      base.types = [...new Set(rawTypes.filter((type) => VALID_TYPES.has(type)))];

      if (Array.isArray(value.symptoms)) {
        base.symptoms = [...new Set(value.symptoms.filter((symptom) => typeof symptom === "string" && symptom.trim()))];
      }

      if (typeof value.notes === "string") {
        base.notes = value.notes;
      }

      return base;
    }

    return base;
  }

  // 1) getData / saveData
  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const normalized = {};

      Object.entries(parsed).forEach(([date, value]) => {
        const entry = normalizeEntry(value);
        if (entry.types.length || entry.symptoms.length || entry.notes) {
          normalized[date] = entry;
        }
      });

      return normalized;
    } catch {
      return {};
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // LOGIC
  function getMenstruationDates(data) {
    return Object.keys(data)
      .filter((date) => data[date]?.types?.includes("menstruation"))
      .sort();
  }

  // 2) calculateCycle(data)
  function calculateCycle(data) {
    const menstruationDates = getMenstruationDates(data);
    if (menstruationDates.length < 2) return null;

    const menstruationDayObjects = menstruationDates.map(parseISODate);
    const cycleStarts = [menstruationDayObjects[0]];
    const periodLengths = [];

    let currentRunLength = 1;

    for (let i = 1; i < menstruationDayObjects.length; i++) {
      const gap = diffInDays(menstruationDayObjects[i - 1], menstruationDayObjects[i]);

      if (gap <= MAX_CONSECUTIVE_MISSED_PERIOD_DAYS) {
        currentRunLength += gap;
      } else {
        periodLengths.push(currentRunLength);
        cycleStarts.push(menstruationDayObjects[i]);
        currentRunLength = 1;
      }
    }

    periodLengths.push(currentRunLength);

    if (cycleStarts.length < 2) return null;

    const cycleLengths = [];
    for (let i = 1; i < cycleStarts.length; i++) {
      cycleLengths.push(diffInDays(cycleStarts[i - 1], cycleStarts[i]));
    }

    const intervalCount = cycleLengths.length;
    const avgCycleLength = Math.max(1, Math.round(average(cycleLengths)));
    const avgPeriodLength = Math.max(1, Math.round(average(periodLengths)));
    const minCycleLength = Math.min(...cycleLengths);
    const maxCycleLength = Math.max(...cycleLengths);
    const cycleSpread = maxCycleLength - minCycleLength;

    const hasValidCycleLength =
      avgCycleLength >= MIN_VALID_CYCLE_LENGTH &&
      avgCycleLength <= MAX_VALID_CYCLE_LENGTH;
    const hasValidPeriodLength =
      avgPeriodLength >= MIN_VALID_PERIOD_LENGTH &&
      avgPeriodLength <= MAX_VALID_PERIOD_LENGTH;
    const hasStableHistory = cycleSpread <= MAX_CYCLE_SPREAD_DAYS;
    const hasEnoughIntervals = intervalCount >= MIN_CYCLE_INTERVALS_FOR_PREDICTION;

    return {
      avgCycleLength,
      avgPeriodLength,
      lastCycleStart: cycleStarts[cycleStarts.length - 1],
      intervalCount,
      cycleStartCount: cycleStarts.length,
      cycleSpread,
      isReliable:
        hasEnoughIntervals &&
        hasValidCycleLength &&
        hasValidPeriodLength &&
        hasStableHistory,
    };
  }

  // 3) generatePredictions(data)
  function generatePredictions(data) {
    const cycle = calculateCycle(data);
    if (!cycle || !cycle.isReliable) {
      return {
        byDate: {},
        periods: [],
        fertileWindows: [],
        isReady: false,
        cycle,
      };
    }

    const byDate = {};
    const periods = [];
    const fertileWindows = [];

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const horizon = addDays(start, PREDICTION_DAYS_AHEAD);

    for (let cursor = new Date(start); cursor <= horizon; cursor = addDays(cursor, 1)) {
      byDate[toISODate(cursor)] = { type: "low" };
    }

    let nextPeriodStart = addDays(cycle.lastCycleStart, cycle.avgCycleLength);
    let firstPeriodAdded = false;

    while (nextPeriodStart <= horizon && !firstPeriodAdded) {
      const periodStart = new Date(nextPeriodStart);
      const periodEnd = addDays(periodStart, cycle.avgPeriodLength - 1);
      periods.push({ start: periodStart, end: periodEnd });

      for (let i = 0; i < cycle.avgPeriodLength; i++) {
        const date = addDays(periodStart, i);
        if (date >= start && date <= horizon) {
          byDate[toISODate(date)] = { type: "menstruation" };
        }
      }

      const ovulationDate = addDays(periodStart, -14);
      const fertileStart = addDays(ovulationDate, -5);
      const fertileEnd = ovulationDate;
      fertileWindows.push({ start: fertileStart, end: fertileEnd, ovulation: ovulationDate });

      for (let i = 0; i <= 5; i++) {
        const fertileDate = addDays(fertileStart, i);

        if (fertileDate >= start && fertileDate <= horizon) {
          const key = toISODate(fertileDate);

          if (byDate[key]?.type !== "menstruation") {
            byDate[key] = {
              type: key === toISODate(ovulationDate) ? "ovulation" : "fertile",
            };
          }
        }
      }

      firstPeriodAdded = true;
      nextPeriodStart = addDays(nextPeriodStart, cycle.avgCycleLength);
    }

    return {
      byDate,
      periods,
      fertileWindows,
      isReady: true,
      cycle,
    };
  }

  function findNextPeriod(periods, referenceDate) {
    const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    return periods.find((period) => period.start >= ref) || null;
  }

  function findRelevantFertileWindow(fertileWindows, referenceDate) {
    const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    return fertileWindows.find((window) => window.end >= ref) || null;
  }

  // LOGIC
  function getDayStatus(date, data, predictions) {
    const dateKey = toISODate(date);
    const entry = data[dateKey] || null;
    const realTypes = entry?.types || [];
    const predicted = predictions.byDate[dateKey]?.type || "low";

    let type = "low";

    if (realTypes.includes("menstruation")) {
      type = "menstruation";
    } else if (predicted === "menstruation") {
      type = "prediction";
    } else if (predicted === "ovulation") {
      type = "ovulation";
    } else if (predicted === "fertile") {
      type = "fertile";
    }

    const statusContent = {
      menstruation: {
        title: "Menstruação hoje",
        subtitle: "Registro real de menstruação para este dia.",
        theme: "theme-menstruation",
      },
      prediction: {
        title: "Menstruação prevista",
        subtitle: "Seu ciclo indica possibilidade de menstruação.",
        theme: "theme-prediction",
      },
      ovulation: {
        title: "Dia da ovulação",
        subtitle: "Alta chance de gravidez neste dia.",
        theme: "theme-ovulation",
      },
      fertile: {
        title: "Período fértil",
        subtitle: "Chance aumentada de gravidez.",
        theme: "theme-fertile",
      },
      low: {
        title: "Baixa chance hoje",
        subtitle: "Probabilidade menor neste dia.",
        theme: "theme-low",
      },
    };

    const nextPeriod = findNextPeriod(predictions.periods, date);
    const fertileWindow = findRelevantFertileWindow(predictions.fertileWindows, date);

    return {
      key: dateKey,
      type,
      hasSex: realTypes.includes("sex"),
      title: statusContent[type].title,
      subtitle: statusContent[type].subtitle,
      themeClass: statusContent[type].theme,
      nextPeriod,
      fertileWindow,
    };
  }

  function getMenstruationDayIndex(date, data) {
    const selectedKey = toISODate(date);
    if (!data[selectedKey]?.types?.includes("menstruation")) return null;

    let dayIndex = 1;
    let cursor = addDays(date, -1);

    while (data[toISODate(cursor)]?.types?.includes("menstruation")) {
      dayIndex += 1;
      cursor = addDays(cursor, -1);
    }

    return dayIndex;
  }

  function buildPrimaryCardContent(status, date, data, predictionReady) {
    if (status.type === "menstruation") {
      const menstruationDay = getMenstruationDayIndex(date, data);
      return {
        lead: "Menstruacao:",
        title: menstruationDay ? `${menstruationDay}º dia` : "Menstruacao hoje",
        subtitle: "Registro real de menstruacao para este dia.",
        buttonLabel: "Editar menstruacao",
      };
    }

    if (!predictionReady) {
      return {
        lead: "Previsao:",
        title: "Sem dados suficientes",
        subtitle: "Registre mais ciclos para liberar previsoes confiaveis.",
        buttonLabel: "Registrar informacoes do dia",
      };
    }

    if (status.type === "prediction") {
      const daysLeft = status.nextPeriod ? Math.max(0, diffInDays(date, status.nextPeriod.start)) : null;
      return {
        lead: "Previsao:",
        title: daysLeft === 0 ? "Menstruacao prevista" : `Menstruacao em ${daysLeft ?? "--"} dia(s)`,
        subtitle: "Seu ciclo indica aproximacao da menstruacao.",
        buttonLabel: "Registrar informacoes do dia",
      };
    }

    if (status.type === "ovulation") {
      return {
        lead: "Previsao:",
        title: "Dia da ovulacao",
        subtitle: "Alta chance de gravidez neste dia.",
        buttonLabel: "Registrar informacoes do dia",
      };
    }

    if (status.type === "fertile") {
      return {
        lead: "Periodo fertil:",
        title: "Alta fertilidade",
        subtitle: "Janela fertil ativa para este dia.",
        buttonLabel: "Registrar informacoes do dia",
      };
    }

    return {
      lead: "Hoje:",
      title: "Baixa chance",
      subtitle: "Probabilidade menor neste dia.",
      buttonLabel: "Registrar informacoes do dia",
    };
  }

  // UI
  const THEME_CLASSES = [
    "theme-menstruation",
    "theme-prediction",
    "theme-fertile",
    "theme-low",
    "theme-ovulation",
  ];

  function updateTheme(status) {
    bodyEl.classList.remove(...THEME_CLASSES);
    bodyEl.classList.add(status.themeClass);
  }

  function setCardUpdating(isUpdating) {
    cycleCard.classList.toggle("is-updating", isUpdating);
  }

  function renderDayCard(date) {
    const data = getData();
    const predictions = generatePredictions(data);
    const status = getDayStatus(date, data, predictions);
    const predictionReady = Boolean(predictions.isReady);
    const daysUntilNextPeriod = status.nextPeriod
      ? Math.max(0, diffInDays(date, status.nextPeriod.start))
      : null;
    const predictionVisible =
      predictionReady &&
      daysUntilNextPeriod !== null &&
      daysUntilNextPeriod <= MAX_DAYS_UNTIL_NEXT_PERIOD_TO_DISPLAY;
    const primaryContent = buildPrimaryCardContent(status, date, data, predictionVisible);

    setCardUpdating(true);

    requestAnimationFrame(() => {
      cycleSelectedDateEl.textContent = formatDateLabel(date);
      cycleLeadEl.textContent = primaryContent.lead;
      cycleTitleEl.textContent = primaryContent.title;

      cycleSubtitleEl.textContent = status.hasSex
        ? `${primaryContent.subtitle}  •  Relacao registrada ❤`
        : primaryContent.subtitle;

      if (predictionVisible && status.nextPeriod) {
        const daysLeft = Math.max(0, diffInDays(date, status.nextPeriod.start));
        cycleMetaNextEl.textContent = `Próxima menstruação: ${status.nextPeriod.start.toLocaleDateString("pt-BR")}`;
        cycleMetaCountdownEl.textContent = `Faltam: ${daysLeft} dia(s)`;
      } else {
        cycleMetaNextEl.textContent = "Proxima menstruacao: --";
        cycleMetaCountdownEl.textContent = "Faltam: 0 dia(s)";
      }

      if (predictionVisible && status.fertileWindow) {
        const startLabel = status.fertileWindow.start.toLocaleDateString("pt-BR");
        const endLabel = status.fertileWindow.end.toLocaleDateString("pt-BR");
        cycleMetaFertileEl.textContent = `Intervalo fértil: ${startLabel} até ${endLabel}`;
      } else {
        cycleMetaFertileEl.textContent = "Intervalo fertil: --";
      }

      updateTheme(status);
      if (cycleRegisterBtn) {
        cycleRegisterBtn.textContent = primaryContent.buttonLabel;
      }
      setTimeout(() => setCardUpdating(false), 140);
    });
  }

  function applyRealClasses(dayEl, realTypes) {
    if (realTypes.includes("menstruation")) {
      dayEl.classList.add("day-menstruation");
    }

    if (realTypes.includes("sex")) {
      dayEl.classList.add("day-sex");
    }
  }

  function applyPredictionClass(dayEl, predictionType) {
    if (predictionType === "menstruation") {
      dayEl.classList.add("day-menstruation", "day-prediction");
    } else if (predictionType === "fertile") {
      dayEl.classList.add("day-fertile");
    } else if (predictionType === "ovulation") {
      dayEl.classList.add("day-fertile", "day-ovulation");
    } else {
      dayEl.classList.add("day-low");
    }
  }

  function markSelectedDay(dayEl, day, month, year) {
    if (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    ) {
      dayEl.classList.add("is-selected");
    }
  }

  // UI
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = getDaysInMonth(year, month);

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];

    monthNameEl.textContent = monthNames[month];
    yearNumberEl.textContent = String(year);

    calendarGrid.innerHTML = "";

    const data = getData();
    const predictions = generatePredictions(data);

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-empty";
      calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= lastDate; day++) {
      const dateKey = formatDate(year, month, day);
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day";
      dayEl.textContent = String(day);

      // 1) hoje
      const today = new Date();
      if (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        dayEl.classList.add("today");
      }

      // 2) dados reais
      const realTypes = data[dateKey]?.types || [];
      const hasRealData = realTypes.length > 0;

      if (hasRealData) {
        applyRealClasses(dayEl, realTypes);
      }

      // 3) previsoes (apenas sem dados reais)
      if (!hasRealData) {
        const predictionType = predictions.byDate[dateKey]?.type || "low";
        applyPredictionClass(dayEl, predictionType);
      }

      // estado visual de seleção
      markSelectedDay(dayEl, day, month, year);

      // 4) eventos
      dayEl.addEventListener("click", handleDayClick(dateKey));

      calendarGrid.appendChild(dayEl);
    }
  }

  // EVENTS
  const clickTimers = new Map();
  let currentDate = new Date();

  // solicitado: variável global para seleção
  selectedDate = new Date();
  window.selectedDate = selectedDate;

  function setSelectedDateByISO(dateKey) {
    selectedDate = parseISODate(dateKey);
    window.selectedDate = selectedDate;
  }

  function toggleTypeForDate(dateKey, type) {
    const data = getData();
    const entry = data[dateKey] || { types: [], symptoms: [], notes: "" };

    if (!entry.types.includes(type)) {
      entry.types.push(type);
      void saveToDatabase(dateKey, type);
    } else {
      entry.types = entry.types.filter((item) => item !== type);
    }

    const shouldDeleteEntry = !entry.types.length && !entry.symptoms.length && !entry.notes;

    if (shouldDeleteEntry) {
      delete data[dateKey];
    } else {
      data[dateKey] = entry;
    }

    saveData(data);
  }

  function handleDayClick(dateKey) {
    return (event) => {
      event.preventDefault();

      setSelectedDateByISO(dateKey);
      renderDayCard(selectedDate);

      if (clickTimers.has(dateKey)) {
        clearTimeout(clickTimers.get(dateKey));
        clickTimers.delete(dateKey);

        // duplo clique -> relação sexual
        toggleTypeForDate(dateKey, "sex");
        renderCalendar();
        renderDayCard(selectedDate);
        return;
      }

      const timeoutId = setTimeout(() => {
        clickTimers.delete(dateKey);

        // clique simples -> menstruação
        toggleTypeForDate(dateKey, "menstruation");
        renderCalendar();
        renderDayCard(selectedDate);
      }, DOUBLE_CLICK_MS);

      clickTimers.set(dateKey, timeoutId);
    };
  }

  function moveMonth(delta) {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    currentDate = nextMonthDate;

    const lastDayOfTargetMonth = getDaysInMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
    const desiredDay = selectedDate.getDate();

    const dayToUse = desiredDay <= lastDayOfTargetMonth
      ? desiredDay
      : lastDayOfTargetMonth;

    selectedDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), dayToUse);
    window.selectedDate = selectedDate;

    renderCalendar();
    renderDayCard(selectedDate);
  }

  prevMonthBtn.addEventListener("click", () => moveMonth(-1));
  nextMonthBtn.addEventListener("click", () => moveMonth(1));

  cycleRegisterBtn?.addEventListener("click", () => {
    console.log("Base pronta para sintomas/notas:", toISODate(selectedDate));
  });

  if (mainNavEl && window.bootstrap?.Collapse) {
    const menuCollapse = window.bootstrap.Collapse.getOrCreateInstance(mainNavEl, { toggle: false });
    const menuLinks = mainNavEl.querySelectorAll("a");

    menuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        menuCollapse.hide();
      });
    });
  }

  // START
  renderCalendar();
  renderDayCard(selectedDate);
})();
