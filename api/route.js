// File: api/router.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HfInference } = require('@huggingface/inference');
const cors = require('cors');

// --- 1. INISIALISASI KLIEN ---
// Kita akan mengatur Kunci API ini di Vercel Dashboard (Langkah 3)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const hf = new HfInference(process.env.HF_API_KEY);

// --- 2. KONFIGURASI CORS (BAGIAN PALING PENTING) ---
// Ganti string di bawah ini dengan URL GitHub Pages Anda yang sebenarnya.
// PENTING: JANGAN tambahkan '/' di akhir.
const GITHUB_PAGES_DOMAIN = 'https://MadzAmm.github.io'; // <-- GANTI INI

// Siapkan middleware cors untuk HANYA mengizinkan domain GH Pages Anda
// dan menangani 'pre-flight' (OPTIONS) request.
const corsHandler = cors({
  origin: GITHUB_PAGES_DOMAIN,
});

// Helper untuk menjalankan middleware CORS di Vercel
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// --- 3. "SMART ROUTER" UTAMA (VERCEL SERVERLESS FUNCTION) ---
export default async function handler(req, res) {
  // Jalankan CORS handler terlebih dahulu
  await runMiddleware(req, res, corsHandler);

  // Keamanan: Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { task, prompt } = req.body;
    let responsePayload;

    // --- 4. LOGIKA ROUTER INTI ---
    switch (task) {
      case 'chat_general':
        responsePayload = await handleChatGeneral(prompt);
        break;

      case 'assistent_coding':
        responsePayload = await handleCodingAssistant(prompt);
        break;

      case 'info_portofolio':
        // Anda akan tambahkan 'system prompt' Anda di sini
        const portfolioPrompt = `
          KONTEKS TENTANG SAYA:
          [Tulis CV Anda di sini: Nama saya... Lulusan... Pengalaman...]

          Pertanyaan Pengguna: ${prompt}
        `;
        responsePayload = await handleChatGeneral(portfolioPrompt);
        break;

      // --- Placeholder untuk task yang lebih rumit (kita akan bangun ini nanti) ---
      case 'analisis_dokumen':
        // Logika selanjutnya: Ambil upload PDF/Word, ekstrak teks di backend
        responsePayload = {
          reply_text: "Task 'analisis_dokumen' belum diimplementasikan.",
        };
        break;

      case 'studio_visual':
        // Logika selanjutnya: deteksi (teks) atau (gambar+teks)
        responsePayload = {
          reply_text: "Task 'studio_visual' belum diimplementasikan.",
        };
        break;

      case 'analisis_ml':
        // Logika selanjutnya: panggil danfo.js / tensorflow.js
        responsePayload = {
          reply_text: "Task 'analisis_ml' belum diimplementasikan.",
        };
        break;

      default:
        res.status(400).json({ error: 'Task tidak dikenal' });
        return;
    }

    // Kirim balasan sukses kembali ke React
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error di Smart Router:', error);
    res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
}

// --- 5. FUNGSI LOGIKA (HELPER FUNCTIONS) ---

/**
 * Task 1: Menangani obrolan umum menggunakan Google Gemini
 */
async function handleChatGeneral(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { reply_text: response.text() };
  } catch (error) {
    console.error('Error di handleChatGeneral:', error);
    throw new Error('Gagal menghubungi Gemini API');
  }
}

/**
 * Task 2: Menangani asisten koding menggunakan DeepSeek (via Hugging Face)
 */
async function handleCodingAssistant(prompt) {
  try {
    const result = await hf.textGeneration({
      model: 'deepseek-ai/deepseek-coder-6.7b-instruct',
      inputs: `<｜begin of sentence｜>User: ${prompt}\n\nAssistant:`,
      parameters: { max_new_tokens: 500 },
    });
    return { reply_text: result.generated_text };
  } catch (error) {
    console.error('Error di handleCodingAssistant:', error);
    throw new Error('Gagal menghubungi Hugging Face API');
  }
}
