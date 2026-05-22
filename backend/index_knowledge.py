"""
Script untuk indexing knowledge base dari PDF
===============================================
Jalankan script ini untuk membuat/memperbarui vector store
dari file PDF yang ada di folder knowledge_pdfs/.

Cara pakai:
    cd backend
    python index_knowledge.py

Jalankan ulang setiap kali file PDF di knowledge_pdfs/ diperbarui.
"""

from rag.indexer import index_knowledge_base


if __name__ == "__main__":
    print()
    print("  Nutrilicious Knowledge Base Indexer")
    print("  Sumber: PDF files dari knowledge_pdfs/")
    print("  Menggunakan: Gemini Embedding + ChromaDB")
    print()

    collection = index_knowledge_base()

    if collection:
        print()
        print(f"  Total chunk dalam vector store: {collection.count()}")
        print("  Chatbot siap digunakan!")
    else:
        print()
        print("  [GAGAL] Tidak ada dokumen yang di-index.")
        print("  Pastikan ada file PDF di folder knowledge_pdfs/")
    print()
