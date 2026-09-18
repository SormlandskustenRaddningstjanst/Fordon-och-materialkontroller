const API_URL =
  "https://ros-material-api.peter-hasselberg.workers.dev";


let currentMaterial = null;
let qrScanner = null;


/* --------------------------------------------------
   ELEMENT
-------------------------------------------------- */

const startSection = document.getElementById("startSection");
const materialSection = document.getElementById("materialSection");

const materialSearch = document.getElementById("materialSearch");
const searchButton = document.getElementById("searchButton");

const scanButton = document.getElementById("scanButton");
const scannerContainer = document.getElementById("scannerContainer");
const closeScannerButton = document.getElementById("closeScannerButton");

const message = document.getElementById("message");

const materialId = document.getElementById("materialId");
const materialName = document.getElementById("materialName");
const materialCategory = document.getElementById("materialCategory");
const materialSerial = document.getElementById("materialSerial");
const materialQuantity = document.getElementById("materialQuantity");
const materialStation = document.getElementById("materialStation");
const materialControlDate = document.getElementById("materialControlDate");
const materialComment = document.getElementById("materialComment");

const statusBadge = document.getElementById("statusBadge");

const checkInButton = document.getElementById("checkInButton");
const checkOutButton = document.getElementById("checkOutButton");
const moveButton = document.getElementById("moveButton");
const serviceButton = document.getElementById("serviceButton");
const inventoryButton = document.getElementById("inventoryButton");

const historyButton = document.getElementById("historyButton");
const historyContainer = document.getElementById("historyContainer");

const newSearchButton = document.getElementById("newSearchButton");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

const closeModalButton = document.getElementById("closeModalButton");
const cancelModalButton = document.getElementById("cancelModalButton");
const confirmModalButton = document.getElementById("confirmModalButton");

const loading = document.getElementById("loading");


/* --------------------------------------------------
   START
-------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

  searchButton.addEventListener("click", searchMaterial);

  materialSearch.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchMaterial();
    }
  });

  scanButton.addEventListener("click", startScanner);

  closeScannerButton.addEventListener(
    "click",
    stopScanner
  );

  checkInButton.addEventListener(
    "click",
    () => openActionModal("checka-in")
  );

  checkOutButton.addEventListener(
    "click",
    () => openActionModal("checka-ut")
  );

  moveButton.addEventListener(
    "click",
    () => openActionModal("flytta")
  );

  serviceButton.addEventListener(
    "click",
    () => openActionModal("service")
  );

  inventoryButton.addEventListener(
    "click",
    () => openActionModal("inventering")
  );

  historyButton.addEventListener(
    "click",
    loadHistory
  );

  newSearchButton.addEventListener(
    "click",
    resetApp
  );

  closeModalButton.addEventListener(
    "click",
    closeModal
  );

  cancelModalButton.addEventListener(
    "click",
    closeModal
  );

  confirmModalButton.addEventListener(
    "click",
    confirmAction
  );

});


/* --------------------------------------------------
   SEARCH
-------------------------------------------------- */

async function searchMaterial() {

  const id = materialSearch.value.trim();

  if (!id) {
    showMessage(
      "Skriv in ett Material-ID.",
      "error"
    );

    return;
  }

  await loadMaterial(id);
}


/* --------------------------------------------------
   LOAD MATERIAL
-------------------------------------------------- */

async function loadMaterial(id) {

  showLoading(true);
  hideMessage();

  try {

    const response = await fetch(
      `${API_URL}/material/${encodeURIComponent(id)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {

      throw new Error(
        data.error || "Materialet hittades inte."
      );
    }

    currentMaterial = data.material;

    displayMaterial(currentMaterial);

  } catch (error) {

    showMessage(
      error.message ||
      "Kunde inte hämta materialet.",
      "error"
    );

  } finally {

    showLoading(false);

  }
}


/* --------------------------------------------------
   DISPLAY MATERIAL
-------------------------------------------------- */

function displayMaterial(material) {

  startSection.classList.add("hidden");
  materialSection.classList.remove("hidden");

  const id =
    material["Material-ID"] ||
    "";

  const name =
    material["Material"] ||
    "Okänt material";

  const category =
    material["Kategori"]?.value ||
    material["Kategori"] ||
    "–";

  const serial =
    material["Serienummer"] ||
    "–";

  const quantity =
    material["Antal"] ||
    "–";

  const station =
    material["Station"]?.value ||
    material["Station"] ||
    "–";

  const status =
    material["Status"]?.value ||
    material["Status"] ||
    "–";

  const controlDate =
    material["Kontrolldatum"] ||
    "–";

  const comment =
    material["Kommentar"] ||
    "–";


  materialId.textContent = id;

  materialName.textContent = name;

  materialCategory.textContent = category;

  materialSerial.textContent = serial;

  materialQuantity.textContent = quantity;

  materialStation.textContent = station;

  materialControlDate.textContent =
    formatDate(controlDate);

  materialComment.textContent = comment;


  setStatus(status);

  updateActionButtons(status);

  historyContainer.innerHTML = "";

  historyContainer.classList.add("hidden");
}


/* --------------------------------------------------
   STATUS
-------------------------------------------------- */

function setStatus(status) {

  statusBadge.textContent = status;

  statusBadge.className =
    "status-badge";

  if (status === "Tillgänglig") {

    statusBadge.classList.add(
      "status-available"
    );

  } else if (status === "Utlånad") {

    statusBadge.classList.add(
      "status-loaned"
    );

  } else if (status === "Service") {

    statusBadge.classList.add(
      "status-service"
    );

  } else {

    statusBadge.classList.add(
      "status-other"
    );
  }
}


/* --------------------------------------------------
   ACTION BUTTONS
-------------------------------------------------- */

function updateActionButtons(status) {

  checkInButton.disabled =
    status !== "Utlånad";

  checkOutButton.disabled =
    status === "Utlånad";

  serviceButton.disabled =
    status === "Service";

}


/* --------------------------------------------------
   MODAL
-------------------------------------------------- */

let currentAction = null;

function openActionModal(action) {

  if (!currentMaterial) {
    return;
  }

  currentAction = action;

  modalBody.innerHTML = "";

  let title = "";

  if (action === "checka-in") {
    title = "CHECKA IN";
  }

  if (action === "checka-ut") {
    title = "CHECKA UT";
  }

  if (action === "flytta") {
    title = "FLYTTA MATERIAL";
  }

  if (action === "service") {
    title = "SERVICE";
  }

  if (action === "inventering") {
    title = "INVENTERING";
  }

  modalTitle.textContent = title;


  /* UTFÖRD AV */

  const userGroup =
    createFormGroup(
      "utfördAv",
      "Utförd av",
      "text",
      "",
      "Namn"
    );

  modalBody.appendChild(userGroup);


  /* STATION VID FLYTT */

  if (action === "flytta") {

    const stationGroup =
      document.createElement("div");

    stationGroup.className =
      "form-group";

    stationGroup.innerHTML = `
      <label for="tillStation">
        Till station
      </label>

      <select id="tillStation">

        <option value="">
          Välj station
        </option>

        <option value="Nyköping">
          Nyköping
        </option>

        <option value="Oxelösund">
          Oxelösund
        </option>

        <option value="Trosa">
          Trosa
        </option>

        <option value="Gnesta">
          Gnesta
        </option>

        <option value="Vagnhärad">
          Vagnhärad
        </option>

        <option value="Jönåker">
          Jönåker
        </option>

        <option value="Nykvarn">
          Nykvarn
        </option>

        <option value="Tystberga">
          Tystberga
        </option>

        <option value="Nävekvarn">
          Nävekvarn
        </option>

        <option value="Stigtomta">
          Stigtomta
        </option>

      </select>
    `;

    modalBody.appendChild(
      stationGroup
    );
  }


  /* KOMMENTAR */

  const commentGroup =
    createTextareaGroup(
      "kommentar",
      "Kommentar"
    );

  modalBody.appendChild(
    commentGroup
  );


  modal.classList.remove("hidden");
}


function createFormGroup(
  id,
  label,
  type,
  value = "",
  placeholder = ""
) {

  const group =
    document.createElement("div");

  group.className =
    "form-group";

  group.innerHTML = `
    <label for="${id}">
      ${label}
    </label>

    <input
      id="${id}"
      type="${type}"
      value="${escapeHtml(value)}"
      placeholder="${placeholder}"
      autocomplete="off"
    >
  `;

  return group;
}


function createTextareaGroup(
  id,
  label
) {

  const group =
    document.createElement("div");

  group.className =
    "form-group";

  group.innerHTML = `
    <label for="${id}">
      ${label}
    </label>

    <textarea
      id="${id}"
      placeholder="Valfri kommentar"
    ></textarea>
  `;

  return group;
}


/* --------------------------------------------------
   CONFIRM ACTION
-------------------------------------------------- */

async function confirmAction() {

  if (!currentMaterial || !currentAction) {
    return;
  }

  const utfördAv =
    document
      .getElementById("utfördAv")
      ?.value
      .trim();

  const kommentar =
    document
      .getElementById("kommentar")
      ?.value
      .trim() || "";

  if (!utfördAv) {

    showModalError(
      "Fyll i vem som utfört åtgärden."
    );

    return;
  }


  const materialId =
    currentMaterial["Material-ID"];


  const body = {
    "Material-ID": materialId,
    "Utförd av": utfördAv,
    "Kommentar": kommentar
  };


  if (currentAction === "flytta") {

    const tillStation =
      document
        .getElementById("tillStation")
        ?.value;

    if (!tillStation) {

      showModalError(
        "Välj till vilken station materialet ska flyttas."
      );

      return;
    }

    body["Till station"] =
      tillStation;
  }


  let endpoint = "";

  if (currentAction === "checka-in") {
    endpoint = "/checka-in";
  }

  if (currentAction === "checka-ut") {
    endpoint = "/checka-ut";
  }

  if (currentAction === "flytta") {
    endpoint = "/flytta";
  }

  if (currentAction === "service") {
    endpoint = "/service";
  }

  if (currentAction === "inventering") {
    endpoint = "/inventering";
  }


  showLoading(true);

  try {

    const response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      throw new Error(
        data.error ||
        "Åtgärden kunde inte genomföras."
      );
    }


    closeModal();

    showMessage(
      data.message ||
      "Åtgärden är registrerad.",
      "success"
    );


    /*
      Hämta materialet igen så att
      status/station uppdateras direkt.
    */

    await loadMaterial(
      materialId
    );


  } catch (error) {

    showModalError(
      error.message ||
      "Ett fel uppstod."
    );

  } finally {

    showLoading(false);

  }
}


/* --------------------------------------------------
   HISTORY
-------------------------------------------------- */

async function loadHistory() {

  if (!currentMaterial) {
    return;
  }

  const id =
    currentMaterial["Material-ID"];

  showLoading(true);

  try {

    const response =
      await fetch(
        `${API_URL}/historik/${encodeURIComponent(id)}`
      );

    const data =
      await response.json();


    if (!response.ok || !data.success) {

      throw new Error(
        data.error ||
        "Kunde inte hämta historiken."
      );
    }


    renderHistory(
      data.historik || []
    );


  } catch (error) {

    showMessage(
      error.message ||
      "Kunde inte hämta historiken.",
      "error"
    );

  } finally {

    showLoading(false);

  }
}


/* --------------------------------------------------
   RENDER HISTORY
-------------------------------------------------- */

function renderHistory(rows) {

  historyContainer.innerHTML = "";

  historyContainer.classList.remove(
    "hidden"
  );


  if (!rows.length) {

    historyContainer.innerHTML = `
      <div class="history-item">
        Ingen historik registrerad.
      </div>
    `;

    return;
  }


  rows.forEach(row => {

    const item =
      document.createElement("div");

    item.className =
      "history-item";


    const action =
      row["Åtgärd"]?.value ||
      row["Åtgärd"] ||
      "Åtgärd";


    const from =
      row["Från station"] || "";

    const to =
      row["Till station"] || "";

    const user =
      row["Utförd av"] || "";

    const date =
      formatDateTime(
        row["Datum"]
      );

    const comment =
      row["Kommentar"] || "";


    let movement = "";

    if (from && to) {

      movement =
        `${from} → ${to}`;

    } else if (from) {

      movement =
        from;
    }


    item.innerHTML = `
      <div class="history-action">
        ${escapeHtml(action)}
      </div>

      <div class="history-meta">
        ${escapeHtml(date)}
        ${user ? " • " + escapeHtml(user) : ""}
        ${movement ? " • " + escapeHtml(movement) : ""}
      </div>

      ${
        comment
          ? `
            <div class="history-comment">
              ${escapeHtml(comment)}
            </div>
          `
          : ""
      }
    `;


    historyContainer.appendChild(
      item
    );

  });
}


/* --------------------------------------------------
   QR SCANNER
-------------------------------------------------- */

async function startScanner() {

  if (
    typeof Html5Qrcode ===
    "undefined"
  ) {

    showMessage(
      "QR-skannern kunde inte laddas. Kontrollera internetanslutningen.",
      "error"
    );

    return;
  }


  scannerContainer.classList.remove(
    "hidden"
  );

  scanButton.classList.add(
    "hidden"
  );


  qrScanner =
    new Html5Qrcode("reader");


  try {

    await qrScanner.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      },

      decodedText => {

        materialSearch.value =
          decodedText.trim();

        stopScanner();

        searchMaterial();

      },

      errorMessage => {
        // Ignorera löpande
        // skanningsfel.
      }

    );

  } catch (error) {

    scannerContainer.classList.add(
      "hidden"
    );

    scanButton.classList.remove(
      "hidden"
    );

    showMessage(
      "Kunde inte starta kameran. Kontrollera att webbläsaren har tillgång till kameran.",
      "error"
    );
  }
}


/* --------------------------------------------------
   STOP SCANNER
-------------------------------------------------- */

async function stopScanner() {

  if (qrScanner) {

    try {

      await qrScanner.stop();

      await qrScanner.clear();

    } catch (error) {
      // Ingen åtgärd behövs.
    }

    qrScanner = null;
  }


  scannerContainer.classList.add(
    "hidden"
  );

  scanButton.classList.remove(
    "hidden"
  );
}


/* --------------------------------------------------
   RESET
-------------------------------------------------- */

function resetApp() {

  currentMaterial = null;

  materialSection.classList.add(
    "hidden"
  );

  startSection.classList.remove(
    "hidden"
  );

  materialSearch.value = "";

  hideMessage();

  historyContainer.innerHTML = "";

  historyContainer.classList.add(
    "hidden"
  );

  materialSearch.focus();
}


/* --------------------------------------------------
   MODAL
-------------------------------------------------- */

function closeModal() {

  modal.classList.add(
    "hidden"
  );

  modalBody.innerHTML = "";

  currentAction = null;
}


function showModalError(text) {

  const old =
    document.getElementById(
      "modalError"
    );

  if (old) {
    old.remove();
  }


  const error =
    document.createElement("div");

  error.id =
    "modalError";

  error.className =
    "message error";

  error.textContent =
    text;

  modalBody.prepend(
    error
  );
}


/* --------------------------------------------------
   MESSAGE
-------------------------------------------------- */

function showMessage(
  text,
  type = "info"
) {

  message.textContent =
    text;

  message.className =
    `message ${type}`;

  message.classList.remove(
    "hidden"
  );
}


function hideMessage() {

  message.classList.add(
    "hidden"
  );

  message.textContent = "";
}


/* --------------------------------------------------
   LOADING
-------------------------------------------------- */

function showLoading(show) {

  if (show) {

    loading.classList.remove(
      "hidden"
    );

  } else {

    loading.classList.add(
      "hidden"
    );
  }
}


/* --------------------------------------------------
   DATE
-------------------------------------------------- */

function formatDate(date) {

  if (!date || date === "–") {
    return "–";
  }

  const d =
    new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString(
    "sv-SE"
  );
}


function formatDateTime(date) {

  if (!date) {
    return "–";
  }

  const d =
    new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleString(
    "sv-SE",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );
}


/* --------------------------------------------------
   SECURITY / HTML
-------------------------------------------------- */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
