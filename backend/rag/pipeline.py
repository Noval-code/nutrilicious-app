"""
RAG Pipeline
============
Mengorkestrasi seluruh alur Retrieval-Augmented Generation:
  Query → Retrieve → Generate → Response

Module ini adalah entry point utama yang digunakan oleh API route.
"""

from threading import Lock

from rag.retriever import retrieve
from rag.generator import generate_response
from rag.indexer import index_knowledge_base

_reindex_lock = Lock()


def chat(message, history=None):
    """
    Proses satu pesan chat melalui pipeline RAG.

    Alur:
        1. Terima pertanyaan user
        2. Cari dokumen relevan dari vector store (retriever)
        3. Kirim konteks + pertanyaan ke LLM (generator)
        4. Kembalikan jawaban beserta metadata

    Args:
        message: Pertanyaan user (string)
        history: Riwayat chat [{"role": "user/bot", "content": "..."}]

    Returns:
        dict:
            - reply: Jawaban NutriBot (string)
            - sources: Sumber data yang digunakan (list)
    """
    if not message or not message.strip():
        return {
            "reply": "Silakan ketik pertanyaan Anda 😊",
            "sources": [],
        }

    try:
        retrieval = retrieve(query=message, top_k=5)
    except FileNotFoundError:
        try:
            with _reindex_lock:
                index_knowledge_base()
            retrieval = retrieve(query=message, top_k=5)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[RAG AUTO-REINDEX ERROR] {type(e).__name__}: {e}")
            return {
                "reply": (
                    "⚠️ Knowledge base sedang disiapkan, tetapi indexing belum berhasil. "
                    "Silakan coba lagi beberapa saat lagi."
                ),
                "sources": [],
            }

    try:
        context_docs = retrieval["documents"]
        sources = retrieval["sources"]

        reply = generate_response(
            query=message,
            context_docs=context_docs,
            history=history,
        )

        return {
            "reply": reply,
            "sources": sources,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[RAG ERROR] {type(e).__name__}: {e}")
        return {
            "reply": (
                "Maaf, terjadi gangguan pada sistem saya. "
                "Silakan coba lagi dalam beberapa saat ya! 🙏"
            ),
            "sources": [],
        }
