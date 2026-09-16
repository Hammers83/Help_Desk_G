import os
import json
import pdfplumber

# Percorsi relativi aggiornati alla nuova struttura
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_FOLDER = os.path.join(BASE_DIR, "pdfs")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "index.json")

def generate_index():
    search_data = []
    
    if not os.path.exists(PDF_FOLDER):
        print(f"Cartella {PDF_FOLDER} non trovata.")
        return

    for filename in os.listdir(PDF_FOLDER):
        if filename.lower().endswith(".pdf"):
            pdf_path = os.path.join(PDF_FOLDER, filename)
            print(f"Processando: {filename}...")
            
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        search_data.append({
                            "doc": filename,
                            "page": page_num + 1,
                            "content": text.strip().replace("\n", " ")
                        })

    # Assicura che la cartella /data esista
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(search_data, f, ensure_ascii=False, indent=2)

    print(f"Completato! Indice salvato in {OUTPUT_FILE} con {len(search_data)} pagine.")

if __name__ == "__main__":
    generate_index()
