"""
Document Retriever
==================
Mencari dokumen yang paling relevan dari ChromaDB
berdasarkan pertanyaan user menggunakan similarity search.
"""

from google import genai
import chromadb
from config import Config

VECTORSTORE_PATH = "./vectorstore"
COLLECTION_NAME = "nutrilicious_kb"
EMBEDDING_MODEL = "gemini-embedding-001"


def _get_client():
    """Buat Gemini API client"""
    return genai.Client(api_key=Config.GEMINI_API_KEY)


def embed_query(query):
    """
    Embed pertanyaan user menggunakan Gemini Embedding API.

    Args:
        query: Pertanyaan user (string)

    Returns:
        List[float] — vektor embedding
    """
    client = _get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
    )
    return result.embeddings[0].values


def get_collection():
    """
    Mendapatkan koleksi ChromaDB yang sudah ter-index.

    Returns:
        chromadb.Collection

    Raises:
        FileNotFoundError: Jika vector store belum dibuat
    """
    try:
        client = chromadb.PersistentClient(path=VECTORSTORE_PATH)
        collection = client.get_collection(name=COLLECTION_NAME)
        return collection
    except Exception as e:
        raise FileNotFoundError(
            "Vector store belum dibuat. "
            "Jalankan 'python index_knowledge.py' terlebih dahulu."
        ) from e


def retrieve(query, top_k=5):
    """
    Cari dokumen paling relevan berdasarkan pertanyaan user.

    Args:
        query: Pertanyaan user (string)
        top_k: Jumlah dokumen yang dikembalikan

    Returns:
        dict dengan keys:
            - documents: List teks dokumen relevan
            - metadatas: List metadata dokumen
            - distances: List skor jarak (makin kecil = makin relevan)
            - sources: Set unik sumber data yang digunakan
    """
    collection = get_collection()
    query_embedding = embed_query(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    documents = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []

    # Kumpulkan sumber data unik
    sources = list(set(m.get("source", "unknown") for m in metadatas))

    return {
        "documents": documents,
        "metadatas": metadatas,
        "distances": distances,
        "sources": sources,
    }
