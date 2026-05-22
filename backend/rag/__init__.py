"""
RAG (Retrieval-Augmented Generation) Module untuk NutriBot
Chatbot asisten gizi cerdas Nutrilicious Food

Komponen:
    - indexer.py    : Load PDF dari knowledge_pdfs/ → chunk → embed → simpan ke ChromaDB
    - retriever.py  : Cari dokumen relevan berdasarkan query user
    - generator.py  : Generate jawaban natural dengan Gemini LLM
    - pipeline.py   : Orkestrasi seluruh alur RAG
"""
