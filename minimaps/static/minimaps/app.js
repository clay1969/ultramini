/* minimaps/app.js
 * Auto-add a flat DistortableImage overlay on load.
 */

/* -------------------------
   Map: base + draw controls
------------------------- */
const map = L.map('map', {
  center: [39.4938, -76.6597], // pick your default center
  zoom: 16,
  zoomControl: true
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Optional: Draw tools (if you use them elsewhere)
const drawControl = new L.Control.Draw({
  edit: { featureGroup: new L.FeatureGroup().addTo(map) },
  draw: false
});
map.addControl(drawControl);

/* -------------------------
   Overlay management
------------------------- */
let overlay = null;

/**
 * Seed corners for an image so it starts FLAT (axis-aligned rectangle),
 * sized to image aspect ratio, around the map center.
 */
function seedCornersForImageDims(imgWidth, imgHeight, pixelHalfWidth = 180) {
  const center = map.getCenter();
  const centerPx = map.latLngToContainerPoint(center);

  // Keep rectangle aspect-ratio tied to the image
  const halfW = pixelHalfWidth;
  const halfH = Math.max(80, Math.round(halfW * (imgHeight / imgWidth)));

  // Build rect in screen pixels, convert back to LatLng
  const tl = map.containerPointToLatLng([centerPx.x - halfW, centerPx.y - halfH]); // NW
  const tr = map.containerPointToLatLng([centerPx.x + halfW, centerPx.y - halfH]); // NE
  const br = map.containerPointToLatLng([centerPx.x + halfW, centerPx.y + halfH]); // SE
  const bl = map.containerPointToLatLng([centerPx.x - halfW, centerPx.y + halfH]); // SW

  // IMPORTANT: clockwise order NW -> NE -> SE -> SW
  return [tl, tr, br, bl];
}

/**
 * Add (or replace) the image overlay, starting FLAT.
 */
function addFlatOverlay(imgSrc, imgWidth, imgHeight) {
  const corners = seedCornersForImageDims(imgWidth, imgHeight);

  if (overlay) map.removeLayer(overlay);

  // DistortableImage overlay; initial corners form a flat rectangle
  overlay = L.distortableImageOverlay(imgSrc, {
    corners,
    mode: 'lock' // start in locked mode so it stays flat until user unlocks
  }).addTo(map);
}

/* -------------------------
   Auto-start overlay (“down”)
------------------------- */

/**
 * Auto-load a default image so layer 2 appears immediately, flat.
 * Replace this path with your actual default overlay image in /static/.
 */
const DEFAULT_OVERLAY_URL = window.DEFAULT_OVERLAY_URL ||
  (window.STATIC_URL ? (window.STATIC_URL + 'minimaps/demo-overlay.jpg') : null);

/**
 * Load an image to get its dimensions before adding as flat overlay.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = reject;
    img.src = src;
  });
}

async function bootOverlayIfAvailable() {
  try {
    if (!DEFAULT_OVERLAY_URL) return;
    const { width, height } = await loadImage(DEFAULT_OVERLAY_URL);
    addFlatOverlay(DEFAULT_OVERLAY_URL, width, height);
  } catch (e) {
    console.warn('Default overlay failed to load:', e);
    document.getElementById('loaderWarning')?.setAttribute('style', 'display:block;');
  }
}

/* -------------------------
   UI wiring
------------------------- */

// Brightness sliders (scoped to map + overlay only)
const mapBright = document.getElementById('mapBright');
const overlayBright = document.getElementById('overlayBright');

function applyMapBrightness() {
  const val = parseFloat(mapBright.value || '1');
  document.getElementById('map').style.filter = `brightness(${val})`;
}
function applyOverlayBrightness() {
  const val = parseFloat(overlayBright.value || '1');
  // Distortable image uses <img> inside a pane with class leaflet-image-layer
  const paneImgs = document.querySelectorAll('.leaflet-pane .leaflet-image-layer img, .leaflet-pane .leaflet-overlay-pane img');
  paneImgs.forEach(el => { el.style.filter = `brightness(${val})`; });
}

mapBright?.addEventListener('input', applyMapBrightness);
overlayBright?.addEventListener('input', applyOverlayBrightness);

// Lock / Unlock controls (keep overlay “down/flat” by default)
const lockBtn = document.getElementById('lockMapBtn');
const unlockBtn = document.getElementById('unlockMapBtn');

lockBtn?.addEventListener('click', () => {
  if (!overlay) return;
  overlay.lock();            // prevents dragging control points
  lockBtn.disabled = true;
  unlockBtn.disabled = false;
});

unlockBtn?.addEventListener('click', () => {
  if (!overlay) return;
  overlay.unlock();          // user can distort if they *choose* to
  lockBtn.disabled = false;
  unlockBtn.disabled = true;
});

// Demo overlay button replaces current overlay and starts flat
document.getElementById('demoOverlayBtn')?.addEventListener('click', async () => {
  if (!DEFAULT_OVERLAY_URL) return;
  const { width, height } = await loadImage(DEFAULT_OVERLAY_URL);
  addFlatOverlay(DEFAULT_OVERLAY_URL, width, height);
  // Keep it “down” initially
  lockBtn.click();
});

// File upload -> add as flat overlay
document.getElementById('imageUpload')?.addEventListener('change', (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const src = e.target.result;
    const tempImg = new Image();
    tempImg.onload = () => {
      addFlatOverlay(src, tempImg.naturalWidth || tempImg.width, tempImg.naturalHeight || tempImg.height);
      lockBtn.click(); // keep it flat at first
      applyOverlayBrightness();
    };
    tempImg.src = src;
  };
  reader.readAsDataURL(file);
});

/* -------------------------
   Initialize
------------------------- */
window.addEventListener('load', async () => {
  applyMapBrightness();
  applyOverlayBrightness();
  await bootOverlayIfAvailable(); // <- auto start “down/flat” on page load
  // Default to locked state if overlay exists
  if (overlay) {
    lockBtn.disabled = true;
    unlockBtn.disabled = false;
  }
});



