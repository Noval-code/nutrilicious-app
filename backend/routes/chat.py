"""
Chat API Routes
================
Endpoint untuk chatbot NutriBot.

Endpoints:
    POST /api/chat          — Kirim pesan dan dapatkan jawaban
    POST /api/chat/reindex  — Re-index knowledge base (admin)
"""

from flask import Blueprint, request, jsonify
from rag.pipeline import chat
from rag.indexer import index_knowledge_base

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("", methods=["POST"])
def send_message():
    """
    Kirim pesan ke NutriBot dan dapatkan jawaban.

    Request Body:
        {
            "message": "Pertanyaan user",
            "history": [
                {"role": "user", "content": "..."},
                {"role": "bot", "content": "..."}
            ]
        }

    Response:
        {
            "reply": "Jawaban NutriBot",
            "sources": ["menus", "packages"]
        }
    """
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Field 'message' wajib diisi"}), 400

    message = data["message"]
    history = data.get("history", [])

    result = chat(message=message, history=history)

    return jsonify(result)


@chat_bp.route("/reindex", methods=["POST"])
def reindex():
    """
    Re-index knowledge base dari MongoDB ke ChromaDB.
    Gunakan endpoint ini setelah data menu/paket/bahan baku diubah.
    """
    try:
        collection = index_knowledge_base()
        count = collection.count()
        return jsonify({
            "status": "success",
            "message": f"Berhasil re-index {count} dokumen",
            "count": count,
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
        }), 500
