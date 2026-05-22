"""
Response Generator
==================
Menggunakan Gemini LLM untuk menghasilkan jawaban natural
berdasarkan konteks yang ditemukan oleh retriever.
"""

import time
from google import genai
from google.genai import types
from config import Config

LLM_MODEL = "gemini-2.5-flash"

# Daftar model fallback jika model utama kena rate limit
FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
]

# ──────────────────────────────────────────────
#  System Prompt — Kepribadian NutriBot
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """Kamu adalah NutriBot, asisten gizi cerdas milik Nutrilicious Food — layanan catering sehat premium.

ATURAN UTAMA:
1. Jawab HANYA berdasarkan informasi yang diberikan dalam KONTEKS di bawah.
2. Jika informasi tidak tersedia dalam konteks, katakan dengan jujur: "Maaf, saya belum memiliki informasi tentang itu. Silakan hubungi tim Nutrilicious langsung ya!"
3. JANGAN membuat informasi atau harga yang tidak ada dalam konteks.
4. Jawab dalam Bahasa Indonesia yang ramah, informatif, dan menggunakan emoji secukupnya.
5. Jika user menyebutkan alergi atau preferensi diet, bantu filter dan rekomendasikan menu yang aman.
6. Untuk pertanyaan harga, selalu sebutkan harga promo dan harga normal jika tersedia di konteks.
7. Jawab secara ringkas tapi lengkap. Gunakan numbering (1. 2. 3.) atau dash (- ) untuk daftar.
8. Informasi yang kamu miliki bersumber dari dokumen resmi Nutrilicious, termasuk cara pemesanan, menu, dan jam operasional.
9. JANGAN gunakan format Markdown seperti **bold**, *italic*, atau bullet asterisk (*). Tulis teks biasa saja tanpa formatting khusus.
"""


def _get_client():
    """Buat Gemini API client"""
    return genai.Client(api_key=Config.GEMINI_API_KEY)


def _build_prompt(query, context_docs, history=None):
    """
    Membangun prompt lengkap untuk LLM.

    Args:
        query: Pertanyaan user
        context_docs: List teks dokumen relevan dari retriever
        history: List dict [{"role": "user/bot", "content": "..."}]

    Returns:
        str — prompt lengkap
    """
    # Gabungkan konteks
    context_text = "\n".join(f"- {doc}" for doc in context_docs)

    # Format chat history (ambil 6 pesan terakhir untuk efisiensi)
    history_text = ""
    if history:
        recent = history[-6:]
        lines = []
        for msg in recent:
            role = "User" if msg.get("role") == "user" else "NutriBot"
            lines.append(f"{role}: {msg.get('content', '')}")
        history_text = "\n".join(lines)

    prompt = f"""KONTEKS (informasi dari database Nutrilicious):
{context_text}

{"RIWAYAT PERCAKAPAN:" + chr(10) + history_text + chr(10) if history_text else ""}
PERTANYAAN USER:
{query}

JAWABAN:"""

    return prompt


def generate_response(query, context_docs, history=None):
    """
    Generate jawaban natural menggunakan Gemini LLM.
    Termasuk retry logic dan model fallback untuk mengatasi rate limit.

    Args:
        query: Pertanyaan user
        context_docs: List teks dokumen relevan
        history: Riwayat percakapan (optional)

    Returns:
        str — jawaban NutriBot
    """
    client = _get_client()
    prompt = _build_prompt(query, context_docs, history)

    # Coba setiap model (fallback jika kena rate limit)
    for model_name in FALLBACK_MODELS:
        for attempt in range(3):  # Max 3 retry per model
            try:
                print(f"  [LLM] Mencoba {model_name} (attempt {attempt + 1})")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.7,
                        top_p=0.9,
                        max_output_tokens=1024,
                    ),
                )

                if response and response.text:
                    print(f"  [LLM] Berhasil dengan {model_name}")
                    return response.text.strip()

            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    wait = 5 * (attempt + 1)  # 5s, 10s, 15s
                    print(f"  [LLM] Rate limit pada {model_name}, tunggu {wait}s...")
                    time.sleep(wait)
                    continue
                else:
                    print(f"  [LLM] Error pada {model_name}: {e}")
                    break  # Error bukan rate limit, coba model lain

    return (
        "Maaf, saya sedang kelebihan beban. "
        "Silakan coba lagi dalam 1 menit ya! 🙏"
    )
