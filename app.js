```
const API_URL =
  "https://ros-material-api.peter-hasselberg.workers.dev";


/* =====================================================
   STATIONER
===================================================== */

const STATIONS = [
  "Nyköping",
  "Oxelösund",
  "Trosa",
  "Gnesta",
  "Vagnhärad",
  "Jönåker",
  "Nykvarn",
  "Tystberga",
  "Nävekvarn",
  "Stigtomta"
];


/* =====================================================
   STATE
===================================================== */

let currentMaterial = null;
let scanner = null;
let currentHistory = [];
let materialCache = [];
let scannerPurpose = "normal";


/* =====================================================
   ELEMENT
===================================================== */

const $ = id => document.getElementById(id);


/* =====================================================
   VIEW
===================================================== */

function showView(id) {

  document.querySelectorAll(".view").forEach(view => {
    view.classList.remove("active");
  });

  const view = $(id);

  if (view) {
    view.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =====================================================
   MODAL
===================================================== */

function openModal(title, content) {

  $("modalTitle").textContent = title;
  $("modalContent").innerHTML = content;
  $("modal").classList.remove("hidden");
}

function closeModal() {

  $("modal").classList.add("hidden");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {

  if (event.target === $("modal")) {
    closeModal();
  }

});


/* =====================================================
   API
===================================================== */

async function apiGet(path) {

  const response = await fetch(
    API_URL + path
  );

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || "Ett fel inträffade."
    );
  }

  return data;
}


async function apiPost(path, body) {

  const response = await fetch(
    API_URL + path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || "Ett fel inträffade."
    );
  }

  return data;
}


/* =====================================================
   FORMAT
===================================================== */

function valueOf(value) {

  if (
    value &&
    typeof value === "object" &&
    "value" in value
  ) {
    return value.value;
  }

  return value ?? "";
}


function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(
    "sv-SE",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );
}


function statusClass(status) {

  if (status === "Tillgänglig") {
    return "available";
  }

  if (status === "Utlånad") {
    return "loaned";
  }

  if (status === "Service") {
    return "service";
  }

  return "other";
}


/* =====================================================
   MATERIAL
===================================================== */

async function loadMaterial(materialId) {

  materialId = String(materialId || "").trim();

  if (!materialId) {
    showToast("Ange Material-ID.");
    return;
  }

  try {

    showToast("Hämtar material...");

    const data =
      await apiGet(
        `/material/${encodeURIComponent(materialId)}`
      );

    currentMaterial = data.material;

    renderMaterial();

    showView("materialView");

  } catch (error) {

    openModal(
      "Material hittades inte",
      `
        <div class="error-message">
          ${escapeHtml(error.message)}
        </div>
      `
    );

  }
}


function getQrImageUrl(materialId) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(materialId)}`;
}

function showMaterialQr(materialId, materialName = "Material") {
  const safeId = String(materialId || "").trim();
  const safeName = String(materialName || "Material");

  if (!safeId) {
    showToast("Material-ID saknas.");
    return;
  }

  const qrUrl = getQrImageUrl(safeId);

  openModal(
    "QR-kod",
    `
      <div class="qr-material-print" style="text-align:center;">
        <h3>${escapeHtml(safeName)}</h3>
        <p style="font-weight:700;">${escapeHtml(safeId)}</p>
        <img
          src="${qrUrl}"
          alt="QR-kod för ${escapeHtml(safeId)}"
          style="display:block;width:320px;max-width:100%;margin:16px auto;"
        >
        <button id="printMaterialQrButton" type="button">
          Skriv ut QR-kod
        </button>
      </div>
    `
  );

  const printButton = $("printMaterialQrButton");

  if (printButton) {
    printButton.addEventListener("click", () => {
      printMaterialQr(safeId, safeName, qrUrl);
    });
  }
}

function printMaterialQr(materialId, materialName, qrUrl) {
  const printWindow = window.open("", "_blank", "width=700,height=800");

  if (!printWindow) {
    showToast("Utskriftsfönstret blockerades av webbläsaren.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8">
        <title>QR-kod - ${escapeHtml(materialId)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 32px;
          }
          img {
            display: block;
            width: 320px;
            max-width: 100%;
            margin: 24px auto;
          }
          .id {
            font-size: 20px;
            font-weight: bold;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(materialName)}</h1>
        <div class="id">${escapeHtml(materialId)}</div>
        <img src="${qrUrl}" alt="QR-kod för ${escapeHtml(materialId)}">
        <button onclick="window.print()">Skriv ut</button>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
}

function renderMaterial() {

  const material = currentMaterial;

  if (!material) {
    return;
  }

  const materialId =
    valueOf(material["Material-ID"]);

  const name =
    valueOf(material["Material"]);

  const category =
    valueOf(material["Kategori"]);

  const serial =
    valueOf(material["Serienummer"]);

  const quantity =
    valueOf(material["Antal"]);

  const station =
    valueOf(material["Station"]);

  const status =
    valueOf(material["Status"]);

  const controlDate =
    valueOf(material["Kontrolldatum"]);

  const comment =
    valueOf(material["Kommentar"]);

  $("materialCard").innerHTML = `

    <div class="material-card">

      <div class="material-title">
        ${escapeHtml(name)}
      </div>

      <div class="material-id">
        ${escapeHtml(materialId)}
      </div>

      <div style="margin:14px 0;">
        <button
          type="button"
          onclick="showMaterialQr('${escapeHtml(materialId).replace("'", "\'")}', '${escapeHtml(name).replace("'", "\'")}')"
        >
          Visa QR-kod / Skriv ut
        </button>
      </div>

      <div class="material-row">
        <span class="material-label">Kategori</span>
        <span class="material-value">
          ${escapeHtml(category || "-")}
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Serienummer</span>
        <span class="material-value">
          ${escapeHtml(serial || "-")}
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Antal</span>
        <span class="material-value">
          ${escapeHtml(quantity || "-")}
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Station</span>
        <span class="material-value">
          ${escapeHtml(station || "-")}
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Status</span>
        <span class="material-value">
          <span class="status ${statusClass(status)}">
            ${escapeHtml(status || "-")}
          </span>
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Kontrolldatum</span>
        <span class="material-value">
          ${escapeHtml(controlDate || "-")}
        </span>
      </div>

      <div class="material-row">
        <span class="material-label">Kommentar</span>
        <span class="material-value">
          ${escapeHtml(comment || "-")}
        </span>
      </div>

    </div>
  `;

}


/* =====================================================
   ACTION MODAL
===================================================== */

function askForPerson(
  title,
  action,
  extraFields = ""
) {

  openModal(
    title,
    `
      <div class="form-group">

        <label for="actionPerson">
          Utförd av
        </label>

        <input
          id="actionPerson"
          type="text"
          placeholder="Namn">

      </div>

      ${extraFields}

      <button
        id="confirmActionButton"
        class="button primary-button full">
        Bekräfta
      </button>
    `
  );

  $("confirmActionButton")
    .addEventListener(
      "click",
      async () => {

        const person =
          $("actionPerson").value.trim();

        if (!person) {
          showToast("Ange vem som utfört åtgärden.");
          return;
        }

        await performAction(
          action,
          person
        );

      }
    );
}


async function performAction(
  action,
  person
) {

  if (!currentMaterial) {
    return;
  }

  const materialId =
    valueOf(
      currentMaterial["Material-ID"]
    );

  let path = "";
  let body = {
    "Material-ID": materialId,
    "Utförd av": person
  };

  if (action === "checkin") {

    path = "/checka-in";

  }

  else if (action === "checkout") {

    path = "/checka-ut";

  }

  else if (action === "service") {

    path = "/service";

  }

  else if (action === "inventory") {

    path = "/inventering";

  }

  try {

    $("confirmActionButton").disabled = true;

    const result =
      await apiPost(path, body);

    closeModal();

    showToast(
      result.message ||
      "Åtgärden är registrerad."
    );

    await loadMaterial(materialId);

  } catch (error) {

    showToast(error.message);

    if ($("confirmActionButton")) {
      $("confirmActionButton").disabled = false;
    }

  }
}


/* =====================================================
   FLYTTA
===================================================== */

function openMoveModal() {

  const currentStation =
    valueOf(
      currentMaterial?.["Station"]
    );

  const options = STATIONS
    .filter(station =>
      station !== currentStation
    )
    .map(station =>
      `<option value="${escapeAttribute(station)}">
        ${escapeHtml(station)}
      </option>`
    )
    .join("");

  openModal(
    "Flytta material",
    `
      <label for="moveStation">
        Till station
      </label>

      <select id="moveStation">

        <option value="">
          Välj station
        </option>

        ${options}

      </select>

      <label for="movePerson">
        Utförd av
      </label>

      <input
        id="movePerson"
        type="text"
        placeholder="Namn">

      <button
        id="confirmMoveButton"
        class="button primary-button full">
        Flytta
      </button>
    `
  );

  $("confirmMoveButton")
    .addEventListener(
      "click",
      performMove
    );
}


async function performMove() {

  const station =
    $("moveStation").value;

  const person =
    $("movePerson").value.trim();

  if (!station) {
    showToast("Välj station.");
    return;
  }

  if (!person) {
    showToast("Ange vem som utfört flytten.");
    return;
  }

  try {

    $("confirmMoveButton").disabled = true;

    const result =
      await apiPost(
        "/flytta",
        {
          "Material-ID":
            valueOf(
              currentMaterial["Material-ID"]
            ),

          "Till station": station,

          "Utförd av": person
        }
      );

    closeModal();

    showToast(result.message);

    await loadMaterial(
      valueOf(
        currentMaterial["Material-ID"]
      )
    );

  } catch (error) {

    showToast(error.message);

    $("confirmMoveButton").disabled = false;
  }
}


/* =====================================================
   HISTORIK
===================================================== */

async function loadHistory() {

  if (!currentMaterial) {
    return;
  }

  const materialId =
    valueOf(
      currentMaterial["Material-ID"]
    );

  $("historyList").innerHTML =
    `<p class="muted">Hämtar historik...</p>`;

  showView("historyView");

  try {

    const data =
      await apiGet(
        `/historik/${encodeURIComponent(materialId)}`
      );

    currentHistory =
      data.historik || [];

    renderHistory();

  } catch (error) {

    $("historyList").innerHTML = `
      <div class="error-message">
        ${escapeHtml(error.message)}
      </div>
    `;

  }
}


function renderHistory() {

  if (!currentHistory.length) {

    $("historyList").innerHTML =
      `<p class="muted">
        Ingen historik registrerad.
      </p>`;

    return;
  }

  $("historyList").innerHTML =
    currentHistory
      .map(row => {

        const action =
          valueOf(row["Åtgärd"]);

        const from =
          valueOf(row["Från station"]);

        const to =
          valueOf(row["Till station"]);

        const person =
          valueOf(row["Utförd av"]);

        const comment =
          valueOf(row["Kommentar"]);

        return `

          <div class="history-item">

            <div class="history-action">
              ${escapeHtml(action || "-")}
            </div>

            <div class="history-date">
              ${escapeHtml(
                formatDate(row["Datum"])
              )}
            </div>

            <div class="history-details">

              ${
                from
                  ? `<div><strong>Från:</strong>
                       ${escapeHtml(from)}
                     </div>`
                  : ""
              }

              ${
                to
                  ? `<div><strong>Till:</strong>
                       ${escapeHtml(to)}
                     </div>`
                  : ""
              }

              ${
                person
                  ? `<div><strong>Utförd av:</strong>
                       ${escapeHtml(person)}
                     </div>`
                  : ""
              }

              ${
                comment
                  ? `<div><strong>Kommentar:</strong>
                       ${escapeHtml(comment)}
                     </div>`
                  : ""
              }

            </div>

          </div>
        `;

      })
      .join("");
}


/* =====================================================
   NYTT MATERIAL
===================================================== */

function populateStationSelect() {

  const select =
    $("newMaterialStation");

  select.innerHTML =
    `<option value="">Välj station</option>`;

  STATIONS.forEach(station => {

    const option =
      document.createElement("option");

    option.value = station;
    option.textContent = station;

    select.appendChild(option);

  });
}


function generateMaterialId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `SKRTJ-${timestamp}${random}`;
}


async function createNewMaterial() {

  const name =
    $("newMaterialName").value.trim();

  const category =
    $("newMaterialCategory").value.trim();

  const serial =
    $("newMaterialSerial").value.trim();

  const quantity =
    $("newMaterialQuantity").value;

  const station =
    $("newMaterialStation").value;

  const controlDate =
    $("newMaterialDate").value;

  const comment =
    $("newMaterialComment").value.trim();

  const message =
    $("newMaterialMessage");

  message.innerHTML = "";

  if (!name) {

    message.innerHTML = `
      <div class="error-message">
        Material måste anges.
      </div>
    `;

    return;
  }

  if (!category) {

    message.innerHTML = `
      <div class="error-message">
        Kategori måste anges.
      </div>
    `;

    return;
  }

  if (!station) {

    message.innerHTML = `
      <div class="error-message">
        Station måste väljas.
      </div>
    `;

    return;
  }

  try {

    $("createMaterialButton").disabled = true;

    message.innerHTML = `
      <div class="info-message">
        Registrerar material...
      </div>
    `;

    const result =
      await apiPost(
        "/material",
        {
          "Material-ID": generateMaterialId(),
          Material: name,
          Kategori: category,
          Serienummer: serial,
          Antal: Number(quantity || 1),
          Station: station,
          Status: "Tillgänglig",
          Kontrolldatum: controlDate || null,
          Kommentar: comment
        }
      );

    const created =
      result.material;

    const materialId =
      valueOf(
        created["Material-ID"]
      );

    message.innerHTML = `
      <div class="success-message">

        <strong>Materialet är registrerat.</strong>

        <div style="margin-top:8px;font-size:20px;">
          ${escapeHtml(materialId)}
        </div>

      </div>
    `;

    showToast(
      `Material ${materialId} skapat.`
    );

    $("newMaterialName").value = "";
    $("newMaterialCategory").value = "";
    $("newMaterialSerial").value = "";
    $("newMaterialQuantity").value = "1";
    $("newMaterialStation").value = "";
    $("newMaterialDate").value = "";
    $("newMaterialComment").value = "";

  } catch (error) {

    message.innerHTML = `
      <div class="error-message">
        ${escapeHtml(error.message)}
      </div>
    `;

  } finally {

    $("createMaterialButton").disabled = false;

  }
}


/* =====================================================
   ALLA MATERIAL
===================================================== */

async function loadAllMaterials() {

  $("materialList").innerHTML =
    `<p class="muted">Hämtar material...</p>`;

  showView("allMaterialsView");

  try {

    const data =
      await apiGet("/material-list");

    materialCache = Array.isArray(data.materials)
      ? data.materials
      : (Array.isArray(data.material) ? data.material : []);

    if (!Array.isArray(data.materials) && !Array.isArray(data.material)) {
      throw new Error("API-svaret innehåller ingen materials-lista.");
    }

    renderMaterialList();

  } catch (error) {

    /*
      Worker-versionen vi precis byggde har ännu
      ingen /material-list endpoint.

      Därför visas ett tydligt meddelande istället
      för ett tyst fel.
    */

    $("materialList").innerHTML = `
      <div class="info-message">
        Kunde inte läsa material: ${escapeHtml(error.message)}
      </div>
    `;

  }
}


function renderMaterialList() {
  const searchInput = $("materialListSearch");
  const search = searchInput
    ? (searchInput.value || "").trim().toLowerCase()
    : "";

  const filtered = (Array.isArray(materialCache) ? materialCache : [])
    .filter(material => {
      const text = [
        valueOf(material["Material-ID"]),
        valueOf(material["Material"]),
        valueOf(material["Kategori"]),
        valueOf(material["Station"]),
        valueOf(material["Status"])
      ].join(" ").toLowerCase();

      return text.includes(search);
    });

  if (!filtered.length) {
    const count = Array.isArray(materialCache) ? materialCache.length : 0;
    $("materialList").innerHTML =
      "<p class=\"muted\">Inget material hittades. Antal från API: " +
      count +
      "</p>";
    return;
  }

  $("materialList").innerHTML = filtered.map(material => {
    const id = valueOf(material["Material-ID"]);
    const name = valueOf(material["Material"]) || "Namnlöst material";
    const station = valueOf(material["Station"]) || "-";
    const status = valueOf(material["Status"]) || "-";

    return `
      <div class="material-card">
        <h3>${escapeHtml(name)}</h3>
        <p><strong>Material-ID:</strong> ${escapeHtml(id)}</p>
        <p><strong>Station:</strong> ${escapeHtml(station)}</p>
        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      </div>
    `;
  }).join("");
}

/* =====================================================
   STATIONER
===================================================== */

function renderStations() {

  $("stationList").innerHTML =
    STATIONS
      .map(station => `

        <div class="station-item">

          <div class="station-name">
            🏢 ${escapeHtml(station)}
          </div>

          <div class="station-count">
            Station
          </div>

        </div>

      `)
      .join("");

}


/* =====================================================
   QR SCANNER
===================================================== */

async function startScanner(purpose = "normal") {

  scannerPurpose = purpose;

  showView("scannerView");

  $("scannerMessage").textContent =
    "Startar kamera...";

  try {

    if (scanner) {
      await stopScanner();
    }

    scanner =
      new Html5Qrcode("reader");

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250
      }
    };

    await scanner.start(
      {
        facingMode: "environment"
      },
      config,
      decodedText => {

        handleQrResult(decodedText);

      },
      () => {}
    );

    $("scannerMessage").textContent =
      "Rikta kameran mot QR-koden.";

  } catch (error) {

    $("scannerMessage").innerHTML = `
      <span class="error-message">
        Kunde inte starta kameran.
        ${escapeHtml(error.message)}
      </span>
    `;

  }
}


async function stopScanner() {

  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {}

  try {
    await scanner.clear();
  } catch {}

  scanner = null;
}


async function handleQrResult(decodedText) {

  await stopScanner();

  let materialId =
    String(decodedText).trim();

  /*
    Om QR-koden senare innehåller en komplett URL
    försöker vi läsa Material-ID från URL:en.
  */

  try {

    if (
      materialId.startsWith("http://") ||
      materialId.startsWith("https://")
    ) {

      const url =
        new URL(materialId);

      const id =
        url.searchParams.get("id") ||
        url.searchParams.get("material");

      if (id) {
        materialId = id;
      }

    }

  } catch {}

  await loadMaterial(materialId);
}


/* =====================================================
   INVENTERING
===================================================== */

$("inventorySearchButton")
  .addEventListener(
    "click",
    () => {

      scannerPurpose = "inventory";

      showView("searchView");

    }
  );


$("inventoryScanButton")
  .addEventListener(
    "click",
    () => {

      startScanner("inventory");

    }
  );


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


/* =====================================================
   STARTSIDA
===================================================== */

$("scanButton")
  .addEventListener(
    "click",
    () => startScanner("normal")
  );


$("searchButton")
  .addEventListener(
    "click",
    () => {

      scannerPurpose = "normal";

      $("materialSearch").value = "";

      showView("searchView");

      setTimeout(
        () => $("materialSearch").focus(),
        100
      );

    }
  );


$("searchScanButton")
  .addEventListener(
    "click",
    () => startScanner("normal")
  );


$("newMaterialButton")
  .addEventListener(
    "click",
    () => {

      $("newMaterialMessage").innerHTML = "";

      showView("newMaterialView");

    }
  );


$("allMaterialsButton")
  .addEventListener(
    "click",
    loadAllMaterials
  );


$("stationsButton")
  .addEventListener(
    "click",
    () => {

      renderStations();

      showView("stationsView");

    }
  );


$("inventoryButton")
  .addEventListener(
    "click",
    () => {

      showView("inventoryView");

    }
  );



/* =====================================================
   STATISTIK OCH ÖVERSIKT
===================================================== */

function normalizeMaterial(material) {
  return {
    id: valueOf(material["Material-ID"]),
    name: valueOf(material["Material"]) || "Namnlöst material",
    category: valueOf(material["Kategori"]) || "Okänd kategori",
    station: valueOf(material["Station"]) || "Ej angiven",
    status: valueOf(material["Status"]) || "Ej angiven",
    quantity: Number(valueOf(material["Antal"])) || 0
  };
}

async function loadDashboard() {
  showView("dashboardView");

  const target = $("dashboardContent");

  if (!target) {
    return;
  }

  target.innerHTML = '<p class="muted">Hämtar statistik...</p>';

  try {
    const data = await apiGet("/material-list");

    const materials = Array.isArray(data.materials)
      ? data.materials
      : (Array.isArray(data.material) ? data.material : []);

    const normalized = materials.map(normalizeMaterial);

    const totalItems = normalized.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const byStatus = {};
    const byStation = {};

    normalized.forEach(item => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byStation[item.station] = (byStation[item.station] || 0) + 1;
    });

    const statusRows = Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) =>
        "<li><strong>" +
        escapeHtml(status) +
        "</strong>: " +
        count +
        " materialposter</li>"
      )
      .join("");

    const stationRows = Object.entries(byStation)
      .sort((a, b) => b[1] - a[1])
      .map(([station, count]) =>
        "<li><strong>" +
        escapeHtml(station) +
        "</strong>: " +
        count +
        " materialposter</li>"
      )
      .join("");

    target.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card">
          <h3>Materialposter</h3>
          <strong>${normalized.length}</strong>
        </div>

        <div class="stat-card">
          <h3>Totalt antal</h3>
          <strong>${totalItems}</strong>
        </div>

        <div class="stat-card">
          <h3>Stationer</h3>
          <strong>${Object.keys(byStation).length}</strong>
        </div>

        <div class="stat-card">
          <h3>Statusar</h3>
          <strong>${Object.keys(byStatus).length}</strong>
        </div>
      </div>

      <div class="card">
        <h3>Fördelning per status</h3>
        <ul>${statusRows || "<li>Ingen data</li>"}</ul>
      </div>

      <div class="card">
        <h3>Fördelning per station</h3>
        <ul>${stationRows || "<li>Ingen data</li>"}</ul>
      </div>
    `;
  } catch (error) {
    target.innerHTML =
      '<div class="info-message">Kunde inte läsa statistik: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

const dashboardButton = $("dashboardButton");

if (dashboardButton) {
  dashboardButton.addEventListener("click", loadDashboard);
}

/* =====================================================
   SÖK
===================================================== */

$("searchMaterialButton")
  .addEventListener(
    "click",
    () => {

      loadMaterial(
        $("materialSearch").value
      );

    }
  );


$("materialSearch")
  .addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        loadMaterial(
          $("materialSearch").value
        );

      }

    }
  );


/* =====================================================
   MATERIAL ACTIONS
===================================================== */

$("checkinButton")
  .addEventListener(
    "click",
    () => {

      askForPerson(
        "Checka in material",
        "checkin"
      );

    }
  );


$("checkoutButton")
  .addEventListener(
    "click",
    () => {

      askForPerson(
        "Checka ut material",
        "checkout"
      );

    }
  );


$("serviceButton")
  .addEventListener(
    "click",
    () => {

      askForPerson(
        "Skicka material till service",
        "service"
      );

    }
  );


$("materialInventoryButton")
  .addEventListener(
    "click",
    () => {

      askForPerson(
        "Registrera inventering",
        "inventory"
      );

    }
  );


$("moveButton")
  .addEventListener(
    "click",
    openMoveModal
  );


$("historyButton")
  .addEventListener(
    "click",
    loadHistory
  );


$("newSearchButton")
  .addEventListener(
    "click",
    () => {

      $("materialSearch").value = "";

      showView("searchView");

      setTimeout(
        () => $("materialSearch").focus(),
        100
      );

    }
  );


/* =====================================================
   MATERIAL TILLBAKA
===================================================== */

$("materialBackButton")
  .addEventListener(
    "click",
    () => showView("homeView")
  );


$("historyBackButton")
  .addEventListener(
    "click",
    () => {

      showView("materialView");

    }
  );


$("stopScannerButton")
  .addEventListener(
    "click",
    async () => {

      await stopScanner();

      showView("homeView");

    }
  );


/* =====================================================
   GENERELLA TILLBAKA-KNAPPAR
===================================================== */

document
  .querySelectorAll("[data-back]")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        await stopScanner();

        showView("homeView");

      }
    );

  });


/* =====================================================
   NYTT MATERIAL
===================================================== */

$("createMaterialButton")
  .addEventListener(
    "click",
    createNewMaterial
  );


/* =====================================================
   ALLA MATERIAL SÖK
===================================================== */

$("materialListSearch")
  .addEventListener(
    "input",
    renderMaterialList
  );


/* =====================================================
   INIT
===================================================== */

populateStationSelect();

$("newMaterialDate").value =
  new Date()
    .toISOString()
    .slice(0, 10);
```
