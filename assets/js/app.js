let searchIndex = null;
let documentsData = [];

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const statusContainer = document.getElementById('status');

// Inizializza FlexSearch
const index = new FlexSearch.Document({
  document: {
    id: "id",
    index: ["content"],
    store: ["doc", "page", "content"]
  },
  tokenize: "forward"
});

// Carica il file JSON generato dallo script Python
fetch('data/index.json')
  .then(response => {
    if (!response.ok) throw new Error("File data/index.json non trovato.");
    return response.json();
  })
  .then(data => {
    documentsData = data;
    data.forEach((item, idx) => {
      index.add({
        id: idx,
        doc: item.doc,
        page: item.page,
        content: item.content
      });
    });
    statusContainer.textContent = `Pronto! Indicizzate ${data.length} pagine da consultare.`;
    searchInput.disabled = false;
    searchInput.focus();
  })
  .catch(err => {
    statusContainer.textContent = "Errore durante il caricamento dell'indice: " + err.message;
  });

// Gestore ricerca
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  resultsContainer.innerHTML = '';

  if (query.length < 2) return;

  const results = index.search(query, { enrich: true });

  if (results.length === 0 || !results[0].result.length) {
    resultsContainer.innerHTML = '<p>Nessun risultato trovato nei manuali.</p>';
    return;
  }

  results[0].result.forEach(item => {
    const doc = item.doc;
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Evidenzia breve estratto
    const snippet = doc.content.length > 250 ? doc.content.substring(0, 250) + '...' : doc.content;

    card.innerHTML = `
      <h3>${doc.doc}</h3>
      <div class="meta">Pagina ${doc.page}</div>
      <p>${snippet}</p>
      <a class="btn-open" href="pdfs/${doc.doc}#page=${doc.page}" target="_blank">Apri PDF alla Pagina ${doc.page}</a>
    `;
    resultsContainer.appendChild(card);
  });
});
