"""
Knowledge Base Indexer (PDF-based)
===================================
Memuat data dari file PDF di folder knowledge_pdfs/,
mengonversi menjadi chunk teks, lalu meng-embed dan
menyimpannya ke ChromaDB vector store.

Jalankan sekali saat setup awal atau saat PDF diperbarui.
"""

import os
import time
import re
from PyPDF2 import PdfReader
from google import genai
from config import Config

VECTORSTORE_PATH = "./vectorstore"
COLLECTION_NAME = "nutrilicious_kb"
EMBEDDING_MODEL = "gemini-embedding-001"
PDF_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_pdfs")


def _get_client():
    """Buat Gemini API client"""
    return genai.Client(api_key=Config.GEMINI_API_KEY)


# ──────────────────────────────────────────────
#  PDF Reader: Extract teks dari semua PDF
# ──────────────────────────────────────────────

def _extract_text_from_pdf(pdf_path):
    """
    Ekstrak seluruh teks dari satu file PDF.

    Args:
        pdf_path: Path absolut ke file PDF

    Returns:
        str — seluruh teks dari PDF
    """
    reader = PdfReader(pdf_path)
    full_text = ""
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            full_text += text + "\n"
    return full_text


def _clean_text(text):
    """
    Bersihkan teks dari karakter yang tidak perlu.

    Args:
        text: Teks mentah dari PDF

    Returns:
        str — teks yang sudah dibersihkan
    """
    # Hapus multiple whitespace/newline berlebihan
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    # Hapus karakter non-printable
    text = re.sub(r'[^\S\n]+', ' ', text)
    return text.strip()


# ──────────────────────────────────────────────
#  Chunking: Pecah teks menjadi potongan kecil
# ──────────────────────────────────────────────

def _chunk_text(text, chunk_size=500, chunk_overlap=100):
    """
    Pecah teks panjang menjadi chunk-chunk kecil
    dengan overlap untuk menjaga konteks.

    Args:
        text: Teks panjang yang akan di-chunk
        chunk_size: Ukuran maksimal tiap chunk (karakter)
        chunk_overlap: Jumlah karakter overlap antar chunk

    Returns:
        List[str] — daftar chunk teks
    """
    if not text or len(text) < 50:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # Cari titik potong natural (akhir kalimat/paragraf)
        if end < len(text):
            # Coba potong di akhir paragraf
            newline_pos = text.rfind('\n\n', start, end)
            if newline_pos > start + chunk_size // 2:
                end = newline_pos + 2
            else:
                # Coba potong di akhir kalimat
                period_pos = text.rfind('. ', start, end)
                if period_pos > start + chunk_size // 2:
                    end = period_pos + 2

        chunk = text[start:end].strip()
        if chunk and len(chunk) > 30:  # Skip chunk terlalu pendek
            chunks.append(chunk)

        start = end - chunk_overlap

    return chunks


# ──────────────────────────────────────────────
#  Load semua PDF dari folder knowledge_pdfs/
# ──────────────────────────────────────────────

def load_documents_from_pdfs():
    """
    Memuat seluruh PDF dari folder knowledge_pdfs/,
    mengekstrak teks, dan memecahnya menjadi chunks.

    Returns:
        tuple: (documents, metadatas, ids)
    """
    documents, metadatas, ids = [], [], []

    if not os.path.exists(PDF_FOLDER):
        print(f"  [WARN] Folder '{PDF_FOLDER}' tidak ditemukan!")
        return documents, metadatas, ids

    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.lower().endswith('.pdf')]

    if not pdf_files:
        print(f"  [WARN] Tidak ada file PDF di '{PDF_FOLDER}'")
        return documents, metadatas, ids

    doc_counter = 0
    for pdf_file in sorted(pdf_files):
        pdf_path = os.path.join(PDF_FOLDER, pdf_file)
        print(f"\n  [PDF] Memproses: {pdf_file}")

        try:
            # 1. Ekstrak teks
            raw_text = _extract_text_from_pdf(pdf_path)
            if not raw_text.strip():
                print(f"  [WARN] {pdf_file} tidak mengandung teks (mungkin scan/gambar)")
                continue

            # 2. Bersihkan teks
            clean = _clean_text(raw_text)
            print(f"  [PDF] Teks berhasil diekstrak: {len(clean)} karakter")

            # 3. Chunk teks
            chunks = _chunk_text(clean, chunk_size=500, chunk_overlap=100)
            print(f"  [PDF] Dipecah menjadi {len(chunks)} chunk")

            # 4. Tambahkan ke daftar dokumen
            for i, chunk in enumerate(chunks):
                documents.append(chunk)
                metadatas.append({
                    "source": "pdf",
                    "filename": pdf_file,
                    "chunk_index": i,
                })
                ids.append(f"pdf_{doc_counter}")
                doc_counter += 1

        except Exception as e:
            print(f"  [ERROR] Gagal memproses {pdf_file}: {e}")
            continue

    return documents, metadatas, ids


# ──────────────────────────────────────────────
#  Embed dokumen menggunakan Gemini API (SDK baru)
# ──────────────────────────────────────────────

def embed_documents(documents, batch_size=20):
    """
    Embed daftar dokumen menggunakan Gemini Embedding API.

    Args:
        documents: List of text strings
        batch_size: Jumlah dokumen per batch (rate limit safe)

    Returns:
        List of embedding vectors
    """
    client = _get_client()
    all_embeddings = []

    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]

        # SDK baru: client.models.embed_content()
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
        )

        # result.embeddings adalah list of ContentEmbedding
        for emb in result.embeddings:
            all_embeddings.append(emb.values)

        print(f"  [EMBED] Batch {i // batch_size + 1} — {len(batch)} dokumen")

        # Rate limit safety: jeda 1 detik antar batch
        if i + batch_size < len(documents):
            time.sleep(1)

    return all_embeddings


# ──────────────────────────────────────────────
#  Index ke ChromaDB
# ──────────────────────────────────────────────

def index_knowledge_base():
    """
    Pipeline indexing lengkap:
    1. Load & chunk dokumen dari PDF
    2. Embed dengan Gemini
    3. Simpan ke ChromaDB

    Returns:
        chromadb.Collection — koleksi yang telah diisi
    """
    import chromadb

    print("=" * 55)
    print("  [INDEXER] Memulai indexing knowledge base dari PDF...")
    print("=" * 55)

    # 1. Load dari PDF
    documents, metadatas, ids = load_documents_from_pdfs()
    print(f"\n  [LOAD] {len(documents)} chunk dimuat dari PDF")

    if not documents:
        print("\n  [ERROR] Tidak ada dokumen untuk di-index!")
        print("  Pastikan ada file PDF di folder: knowledge_pdfs/")
        return None

    # 2. Embed
    print("\n  [EMBED] Membuat embedding dengan Gemini...")
    embeddings = embed_documents(documents)

    # 3. Store ke ChromaDB
    print("\n  [STORE] Menyimpan ke ChromaDB...")
    client = chromadb.PersistentClient(path=VECTORSTORE_PATH)

    # Hapus koleksi lama jika ada
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = client.create_collection(name=COLLECTION_NAME)
    collection.add(
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids,
    )

    print(f"\n  [DONE] {len(documents)} chunk berhasil diindex!")
    print(f"  [DONE] Tersimpan di: {VECTORSTORE_PATH}/")
    print("=" * 55)
    return collection
