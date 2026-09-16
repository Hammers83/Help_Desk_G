pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let docIdCounter = 0;
let loadedDocuments = [];

// Inizializza FlexSearch
const searchIndex = new FlexSearch.Document({
  document: {
    id: "id",
    index: ["content"],
    store: ["doc", "page", "content"]
  },
  tokenize: "forward"
});

// Elementi DOM
const uploadScreen = document.getElementById('uploadScreen');
const appScreen = document.getElementById('appScreen');
const fileInput = document.getElementById('pdfUploader');
const uploadStatus = document.getElementById('uploadStatus');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const docList = document.getElementById('docList');
const addMorePdfBtn = document.getElementById('addMorePdfBtn');

// Controllo se ci sono già manuali salvati nel browser
initStorage();

// Pulsante per aggiungere altri PDF dalla vista consumatore
addMorePdfBtn.addEventListener('click', () => fileInput.click());

// Evento Upload File
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  uploadStatus.textContent = "Elaborazione ed indicizzazione in corso...";

  for (let file of files) {
    if (file.type === "application/pdf") {
      await processPDF(file);
    }
  }

  // Scomparsa schermata upload e attivazione vista consumatore
  showConsumerApp();
});

// Processa e indicizza il PDF
async function processPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let docPages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');

    if (pageText.trim().length > 0) {
      const entry = {
        id: docIdCounter++,
        doc: file.name,
        page: pageNum,
        content: pageText
      };
      searchIndex.add(entry);
      docPages.push(entry);
    }
  }

  saveToIndexedDB(file.name, docPages);
  updateDocList(file.name, pdf.numPages);
}

// Passaggio alla vista finale dell'utente
function showConsumerApp() {
  uploadScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  searchInput.focus();
}

function updateDocList(filename, totalPages) {
  if (!loadedDocuments.includes(filename)) {
    loadedDocuments.push(filename);
    const li = document.createElement('li');
    li.textContent = `📄 ${filename} (${totalPages} pagine)`;
    docList.appendChild(li);
  }
}

// Logica di ricerca
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  resultsContainer.innerHTML = '';

  if (query.length < 2) return;

  const results = searchIndex.search(query, { enrich: true });

  if (!results.length || !results[0].result.length) {
    resultsContainer.innerHTML = '<p class="no-results">Nessun risultato trovato nel manuale.</p>';
    return;
  }

  results[0].result.forEach(item => {
    const data = item.doc;
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const snippet = data.content.length > 220 ? data.content.substring(0, 220) + '...' : data.content;

    card.innerHTML = `
      <h3>${data.doc}</h3>
      <div class="meta">Pagina ${data.page}</div>
      <p>${snippet}</p>
    `;
    resultsContainer.appendChild(card);
  });
});

// --- Persistenza locale (IndexedDB) ---
function initStorage() {
  const request = indexedDB.open("HelpDeskDB", 1);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("manuals")) {
      db.createObjectStore("manuals", { keyPath: "name" });
    }
  };
  request.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction("manuals", "readonly");
    const store = tx.objectStore("manuals");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      if (getAll.result.length > 0) {
        getAll.result.forEach(item => {
          item.pages.forEach(p => searchIndex.add(p));
          updateDocList(item.name, item.pages.length);
        });
        // Se ci sono già dati salvati, mostra direttamente l'app
        showConsumerApp();
      }
    };
  };
}

function saveToIndexedDB(name, pages) {
  const request = indexedDB.open("HelpDeskDB", 1);
  request.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction("manuals", "readwrite");
    const store = tx.objectStore("manuals");
    store.put({ name: name, pages: pages });
  };
}
