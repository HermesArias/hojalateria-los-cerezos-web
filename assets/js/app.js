/**
 * HOJALATERÍA LOS CEREZOS - LITORAL CENTRAL (ALGARROBO, EL QUISCO, EL TABO)
 * Dirección: Los Cerezos 053, El Quisco
 * WhatsApp: +56 9 3332 4024
 */

const WORKSHOP_PHONE = "56933324024";
const WORKSHOP_NAME = "Hojalatería Los Cerezos";
const WORKSHOP_ADDRESS = "Los Cerezos 053, El Quisco, Región de Valparaíso";

// Estado de la campana interactiva (100% a medida)
const hoodState = {
  width: 120,    // cm (Ancho de la Base A)
  depth: 65,     // cm (Fondo de la Base B)
  height: 180,   // cm (Alto Total C)
  material: "Zincalum 0.5mm"
};

document.addEventListener("DOMContentLoaded", () => {
  initWorkshopStatus();
  initHoodInteractiveBlueprint();
  initCopyAddress();
  initCustomQuoteModalOrLinks();
});

/**
 * Indicador de estado en vivo del taller (Lunes a Sábado)
 */
function initWorkshopStatus() {
  const statusBadge = document.getElementById("workshop-status-indicator");
  const statusText = document.getElementById("workshop-status-text");
  if (!statusBadge || !statusText) return;

  const now = new Date();
  const day = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
  const hour = now.getHours();
  const min = now.getMinutes();
  const currentMinutes = hour * 60 + min;

  let isOpen = false;

  // Lun a Vie: 08:30 (510 min) a 18:30 (1110 min)
  if (day >= 1 && day <= 5) {
    if (currentMinutes >= 510 && currentMinutes < 1110) {
      isOpen = true;
    }
  } 
  // Sábado: 09:00 (540 min) a 14:00 (840 min)
  else if (day === 6) {
    if (currentMinutes >= 540 && currentMinutes < 840) {
      isOpen = true;
    }
  }

  if (isOpen) {
    statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2";
    statusText.textContent = "TALLER OPERATIVO (CORTE Y PLEGADO ACTIVO)";
  } else {
    statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-2";
    statusText.textContent = "TALLER CERRADO · RECEPCIÓN WHATSAPP 24/7";
  }
}

/**
 * Interactividad del Plano Técnico SVG de Campana de Quincho
 * Modelo fiel a fabricación real: Sombrerete plano rectangular + ducto rectangular + base trapezoidal
 */
function initHoodInteractiveBlueprint() {
  // 1. Selector de Material (Validación por lista blanca segura)
  const ALLOWED_MATERIALS = ["Zincalum 0.5mm", "Galvanizado 0.6mm", "Prepintado Negro 0.5mm"];
  const materialButtons = document.querySelectorAll("[data-hood-mat]");
  materialButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mat = btn.getAttribute("data-hood-mat");
      if (!ALLOWED_MATERIALS.includes(mat)) return;
      materialButtons.forEach(b => b.classList.remove("border-graphite", "bg-graphite/10", "font-bold"));
      materialButtons.forEach(b => b.classList.add("border-graphite/30", "bg-white"));
      btn.classList.remove("border-graphite/30", "bg-white");
      btn.classList.add("border-graphite", "bg-graphite/10", "font-bold");
      hoodState.material = mat;
      updateHoodBlueprint();
    });
  });

  // 2. Vinculación bidireccional Slider + Input Numérico
  setupDimensionControl("hood-width-slider", "hood-width-input", 60, 250, (val) => {
    hoodState.width = val;
    updateHoodBlueprint();
  });

  setupDimensionControl("hood-depth-slider", "hood-depth-input", 40, 120, (val) => {
    hoodState.depth = val;
    updateHoodBlueprint();
  });

  setupDimensionControl("hood-height-slider", "hood-height-input", 80, 300, (val) => {
    hoodState.height = val;
    updateHoodBlueprint();
  });

  // 3. Botón "Plano vs Realidad" (Ver fabricación real) con transición suave de 300ms
  initRealViewToggle();

  // Render inicial
  updateHoodBlueprint();
}

/**
 * Helper para sanitizar y validar entradas numéricas estrictamente
 * Protege contra inyecciones de caracteres o scripts en WhatsApp
 */
function sanitizeDimension(rawVal, min, max) {
  if (typeof rawVal === 'string') {
    rawVal = rawVal.replace(/[^0-9]/g, '');
  }
  let num = parseInt(rawVal, 10);
  if (isNaN(num) || num < min) num = min;
  if (num > max) num = max;
  return num;
}

/**
 * Helper para sincronizar un slider de rango y un input de número
 */
function setupDimensionControl(sliderId, inputId, min, max, onChange) {
  const slider = document.getElementById(sliderId);
  const input = document.getElementById(inputId);
  if (!slider || !input) return;

  slider.addEventListener("input", (e) => {
    const val = sanitizeDimension(e.target.value, min, max);
    input.value = val;
    onChange(val);
  });

  slider.addEventListener("change", (e) => {
    const val = sanitizeDimension(e.target.value, min, max);
    input.value = val;
    onChange(val);
  });

  input.addEventListener("input", (e) => {
    const val = sanitizeDimension(e.target.value, min, max);
    slider.value = val;
    onChange(val);
  });

  input.addEventListener("blur", () => {
    const val = sanitizeDimension(input.value, min, max);
    input.value = val;
    slider.value = val;
    onChange(val);
  });
}

/**
 * Lógica del botón de alternancia "Plano CAD vs Fabricación Real"
 * Soporta hover interactivo y clic persistente
 */
function initRealViewToggle() {
  const toggleBtn = document.getElementById("toggle-real-view-btn");
  const toggleText = document.getElementById("toggle-real-view-text");
  const blueprintLayer = document.getElementById("hood-blueprint-layer");
  const realPhotoOverlay = document.getElementById("hood-real-photo-overlay");
  
  if (!toggleBtn || !blueprintLayer || !realPhotoOverlay) return;

  let isRealViewLocked = false;

  function setRealPhotoVisible(show) {
    if (show) {
      realPhotoOverlay.classList.remove("opacity-0", "pointer-events-none");
      realPhotoOverlay.classList.add("opacity-100");
      blueprintLayer.classList.add("opacity-0");
      if (toggleText) toggleText.textContent = "Ver plano CAD";
      toggleBtn.classList.remove("bg-wagreen", "text-[#063013]");
      toggleBtn.classList.add("bg-white", "text-graphite");
    } else {
      realPhotoOverlay.classList.add("opacity-0", "pointer-events-none");
      realPhotoOverlay.classList.remove("opacity-100");
      blueprintLayer.classList.remove("opacity-0");
      if (toggleText) toggleText.textContent = "Ver fabricación real";
      toggleBtn.classList.remove("bg-white", "text-graphite");
      toggleBtn.classList.add("bg-wagreen", "text-[#063013]");
    }
  }

  // Clic: fija el modo
  toggleBtn.addEventListener("click", () => {
    isRealViewLocked = !isRealViewLocked;
    setRealPhotoVisible(isRealViewLocked);
  });

  // Hover: vista previa instantánea
  toggleBtn.addEventListener("mouseenter", () => {
    if (!isRealViewLocked) {
      setRealPhotoVisible(true);
    }
  });

  toggleBtn.addEventListener("mouseleave", () => {
    if (!isRealViewLocked) {
      setRealPhotoVisible(false);
    }
  });
}

/**
 * Actualiza la geometría del diagrama SVG en tiempo real y el enlace a WhatsApp
 */
function updateHoodBlueprint() {
  // Etiquetas dinámicas
  const widthLabel = document.getElementById("svg-cota-width");
  const depthLabel = document.getElementById("svg-cota-depth");
  const heightLabel = document.getElementById("svg-cota-height");
  const summarySpecs = document.getElementById("hood-summary-specs");
  const quoteCtaBtn = document.getElementById("hood-whatsapp-cta");

  if (widthLabel) widthLabel.textContent = `Ancho (A): ${hoodState.width} cm`;
  if (depthLabel) depthLabel.textContent = `Fondo (B): ${hoodState.depth} cm`;
  if (heightLabel) heightLabel.textContent = `Alto (C): ${hoodState.height} cm`;

  if (summarySpecs) {
    summarySpecs.textContent = `Ancho: ${hoodState.width}cm | Fondo: ${hoodState.depth}cm | Alto: ${hoodState.height}cm | ${hoodState.material}`;
  }

  // ================= CÁLCULO PROPORCIONAL DE GEOMETRÍA SVG =================
  const centerX = 200;

  // 1. ANCHO BASE: Mapeo de 60..250 cm a 75..170 px (media anchura)
  const minW = 60, maxW = 250;
  const clampedW = Math.max(minW, Math.min(maxW, hoodState.width));
  const normW = (clampedW - minW) / (maxW - minW);
  const baseHalfW = 75 + normW * 95; // 75px a 170px

  // Ancho del ducto rectangular proporcional
  const ductHalfW = Math.round(Math.max(26, Math.min(48, baseHalfW * 0.28)));
  const roofHalfW = ductHalfW + 24;

  // 2. ALTO TOTAL: Mapeo de 80..300 cm a elongación vertical del ducto
  const minH = 80, maxH = 300;
  const clampedH = Math.max(minH, Math.min(maxH, hoodState.height));
  const normH = (clampedH - minH) / (maxH - minH);

  const yBottom = 267;
  const skirtH = 22;
  const ySkirtTop = yBottom - skirtH; // 245
  const trapH = 71;                   // Altura fija de quiebre de base piramidal
  const yCollar = ySkirtTop - trapH;  // 174
  const collarH = 8;
  const yCollarTop = yCollar - collarH; // 166

  // El ducto sube más arriba a mayor altura requerida
  const yRoof = Math.round(18 + (1 - normH) * 70); // 18 a 88
  const roofH = 8;
  const yRoofBot = yRoof + roofH;
  const pillarH = 18;
  const yDuctTop = yRoofBot + pillarH;
  const ductHeight = Math.max(20, yCollarTop - yDuctTop);

  // ================= APLICACIÓN AL DOM SVG =================
  // Sombrerete plano rectangular
  const roofEl = document.getElementById("svg-hood-roof");
  if (roofEl) {
    roofEl.setAttribute("x", `${centerX - roofHalfW}`);
    roofEl.setAttribute("y", `${yRoof}`);
    roofEl.setAttribute("width", `${roofHalfW * 2}`);
  }

  // Pilares esquineros de soporte
  const pillarLeft = document.getElementById("svg-pillar-left");
  const pillarRight = document.getElementById("svg-pillar-right");
  const ventGap = document.getElementById("svg-vent-gap");

  if (pillarLeft) {
    pillarLeft.setAttribute("x", `${centerX - ductHalfW + 3}`);
    pillarLeft.setAttribute("y", `${yRoofBot}`);
    pillarLeft.setAttribute("height", `${pillarH}`);
  }
  if (pillarRight) {
    pillarRight.setAttribute("x", `${centerX + ductHalfW - 9}`);
    pillarRight.setAttribute("y", `${yRoofBot}`);
    pillarRight.setAttribute("height", `${pillarH}`);
  }
  if (ventGap) {
    ventGap.setAttribute("x1", `${centerX - ductHalfW}`);
    ventGap.setAttribute("y1", `${yRoofBot + Math.round(pillarH / 2)}`);
    ventGap.setAttribute("x2", `${centerX + ductHalfW}`);
    ventGap.setAttribute("y2", `${yRoofBot + Math.round(pillarH / 2)}`);
  }

  // Ducto rectangular
  const flueEl = document.getElementById("svg-hood-flue");
  const flueRib = document.getElementById("svg-flue-rib");
  if (flueEl) {
    flueEl.setAttribute("x", `${centerX - ductHalfW}`);
    flueEl.setAttribute("y", `${yDuctTop}`);
    flueEl.setAttribute("width", `${ductHalfW * 2}`);
    flueEl.setAttribute("height", `${ductHeight}`);
  }
  if (flueRib) {
    flueRib.setAttribute("x1", `${centerX}`);
    flueRib.setAttribute("y1", `${yDuctTop}`);
    flueRib.setAttribute("x2", `${centerX}`);
    flueRib.setAttribute("y2", `${yCollarTop}`);
  }

  // Collarín de base
  const collarEl = document.getElementById("svg-hood-collar");
  if (collarEl) {
    collarEl.setAttribute("x", `${centerX - (ductHalfW + 5)}`);
    collarEl.setAttribute("y", `${yCollarTop}`);
    collarEl.setAttribute("width", `${(ductHalfW + 5) * 2}`);
  }

  // Base trapezoidal y líneas de quiebre
  const hoodBody = document.getElementById("svg-hood-body");
  const creaseL = document.getElementById("svg-crease-left");
  const creaseR = document.getElementById("svg-crease-right");

  if (hoodBody) {
    const pathD = `M ${centerX - (ductHalfW + 5)},${yCollar} L ${centerX + (ductHalfW + 5)},${yCollar} L ${centerX + baseHalfW},${ySkirtTop} L ${centerX - baseHalfW},${ySkirtTop} Z`;
    hoodBody.setAttribute("d", pathD);
  }
  if (creaseL) {
    creaseL.setAttribute("x1", `${centerX - (ductHalfW + 5)}`);
    creaseL.setAttribute("y1", `${yCollar}`);
    creaseL.setAttribute("x2", `${centerX - baseHalfW}`);
    creaseL.setAttribute("y2", `${ySkirtTop}`);
  }
  if (creaseR) {
    creaseR.setAttribute("x1", `${centerX + (ductHalfW + 5)}`);
    creaseR.setAttribute("y1", `${yCollar}`);
    creaseR.setAttribute("x2", `${centerX + baseHalfW}`);
    creaseR.setAttribute("y2", `${ySkirtTop}`);
  }

  // Faldón inferior
  const skirtEl = document.getElementById("svg-hood-skirt");
  const skirtL = document.getElementById("svg-skirt-notch-l");
  const skirtR = document.getElementById("svg-skirt-notch-r");

  if (skirtEl) {
    skirtEl.setAttribute("x", `${centerX - baseHalfW}`);
    skirtEl.setAttribute("y", `${ySkirtTop}`);
    skirtEl.setAttribute("width", `${baseHalfW * 2}`);
  }
  if (skirtL) {
    skirtL.setAttribute("x1", `${centerX - baseHalfW}`);
    skirtL.setAttribute("x2", `${centerX - baseHalfW}`);
  }
  if (skirtR) {
    skirtR.setAttribute("x1", `${centerX + baseHalfW}`);
    skirtR.setAttribute("x2", `${centerX + baseHalfW}`);
  }

  // Cotas de Ancho (A)
  const dimWLine = document.getElementById("svg-dim-w-line");
  const dimWStart = document.getElementById("svg-dim-w-start");
  const dimWEnd = document.getElementById("svg-dim-w-end");
  const dimWArrL = document.getElementById("svg-dim-w-arr-l");
  const dimWArrR = document.getElementById("svg-dim-w-arr-r");

  if (dimWLine) {
    dimWLine.setAttribute("x1", `${centerX - baseHalfW}`);
    dimWLine.setAttribute("x2", `${centerX + baseHalfW}`);
  }
  if (dimWStart) {
    dimWStart.setAttribute("x1", `${centerX - baseHalfW}`);
    dimWStart.setAttribute("x2", `${centerX - baseHalfW}`);
  }
  if (dimWEnd) {
    dimWEnd.setAttribute("x1", `${centerX + baseHalfW}`);
    dimWEnd.setAttribute("x2", `${centerX + baseHalfW}`);
  }
  if (dimWArrL) {
    dimWArrL.setAttribute("d", `M ${centerX - baseHalfW + 7},282 L ${centerX - baseHalfW},285 L ${centerX - baseHalfW + 7},288`);
  }
  if (dimWArrR) {
    dimWArrR.setAttribute("d", `M ${centerX + baseHalfW - 7},282 L ${centerX + baseHalfW},285 L ${centerX + baseHalfW - 7},288`);
  }

  // Cotas de Alto (C)
  const dimHLine = document.getElementById("svg-dim-h-line");
  const dimHTop = document.getElementById("svg-dim-h-top");
  const dimHBot = document.getElementById("svg-dim-h-bot");
  const dimHArrT = document.getElementById("svg-dim-h-arr-t");
  const dimHArrB = document.getElementById("svg-dim-h-arr-b");

  if (dimHLine) {
    dimHLine.setAttribute("y1", `${yRoof}`);
    dimHLine.setAttribute("y2", `${yBottom}`);
  }
  if (dimHTop) {
    dimHTop.setAttribute("y1", `${yRoof}`);
    dimHTop.setAttribute("y2", `${yRoof}`);
  }
  if (dimHBot) {
    dimHBot.setAttribute("y1", `${yBottom}`);
    dimHBot.setAttribute("y2", `${yBottom}`);
  }
  if (dimHArrT) {
    dimHArrT.setAttribute("d", `M 372,${yRoof + 7} L 375,${yRoof} L 378,${yRoof + 7}`);
  }
  if (dimHArrB) {
    dimHArrB.setAttribute("d", `M 372,${yBottom - 7} L 375,${yBottom} L 378,${yBottom - 7}`);
  }

  // ================= ENLACE A WHATSAPP EXACTO SOLICITADO =================
  if (quoteCtaBtn) {
    const message = encodeURIComponent(
      `Hola Hojalatería Los Cerezos, quiero cotizar una Campana de Quincho a medida con las siguientes dimensiones: Ancho: ${hoodState.width}cm, Fondo: ${hoodState.depth}cm, Alto: ${hoodState.height}cm, en material ${hoodState.material}.`
    );
    quoteCtaBtn.href = `https://wa.me/${WORKSHOP_PHONE}?text=${message}`;
  }
}

/**
 * Inicializar enlaces de cotización rápida de catálogo
 */
function initCustomQuoteModalOrLinks() {
  document.querySelectorAll("[data-quote-product]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const rawProduct = btn.getAttribute("data-quote-product") || "Pieza en zinc";
      // Sanitizar texto para evitar inyecciones
      const product = rawProduct.replace(/[<>"'&]/g, '').trim();
      const defaultMsg = encodeURIComponent(
        `Hola Hojalatería Los Cerezos! Quisiera cotizar ${product} a medida para retirar en el taller de Los Cerezos 053, El Quisco.\nMis medidas o detalles son:`
      );
      // Seguridad: mitigación estricta contra Reverse Tabnabbing
      window.open(`https://wa.me/${WORKSHOP_PHONE}?text=${defaultMsg}`, "_blank", "noopener,noreferrer");
    });
  });
}

/**
 * Función para copiar dirección física con feedback visual
 */
function initCopyAddress() {
  const copyBtn = document.getElementById("btn-copy-address");
  const copyFeedback = document.getElementById("copy-address-feedback");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(WORKSHOP_ADDRESS).then(() => {
      if (copyFeedback) {
        copyFeedback.classList.remove("opacity-0");
        copyFeedback.classList.add("opacity-100");
        setTimeout(() => {
          copyFeedback.classList.remove("opacity-100");
          copyFeedback.classList.add("opacity-0");
        }, 2500);
      }
    });
  });
}
