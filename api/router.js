// File: api/router.js
// VERSI FINAL: Menerapkan logika Cascade Penuh (Pro -> Flash -> Lite -> HF)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HfInference } = require('@huggingface/inference');
const cors = require('cors');

// --- 1. INISIALISASI KLIEN ---
// Kunci API ini akan dibaca dari Vercel Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const hf = new HfInference(process.env.HF_API_KEY);

// --- 2. KONFIGURASI CORS ---
// Mengizinkan frontend Anda di GitHub Pages untuk memanggil backend ini.
const GITHUB_PAGES_DOMAIN = 'https://MadzAmm.github.io';
const corsHandler = cors({ origin: GITHUB_PAGES_DOMAIN });

// Helper untuk menjalankan middleware CORS di Vercel
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
};

// --- 3. "SMART ROUTER" UTAMA (VERCEL SERVERLESS FUNCTION) ---
export default async function handler(req, res) {
  // 1. Terapkan CORS Handler di setiap permintaan
  await runMiddleware(req, res, corsHandler);

  // 2. Keamanan: Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // 3. Blok Try...Catch Utama untuk menangani error
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
        const portfolioPrompt = `
          KONTEKS TENTANG SAYA:
          [Tulis CV Anda di sini: Nama saya... Lulusan Aqidah & Filsafat Islam... 
          Tertarik pada web dev (React, Framer Motion) dan data analysis (Python, scikit-learn)...]

          Pertanyaan Pengguna: ${prompt}
        `;
        // Kita gunakan model 30 RPM untuk info portofolio agar cepat
        responsePayload = await callGemini(
          'gemini-2.0-flash-lite',
          portfolioPrompt
        );
        break;

      // --- Placeholder untuk task masa depan ---
      case 'analisis_dokumen':
        responsePayload = {
          reply_text: "Task 'analisis_dokumen' belum diimplementasikan.",
        };
        break;
      case 'studio_visual':
        responsePayload = {
          reply_text: "Task 'studio_visual' belum diimplementasikan.",
        };
        break;
      case 'analisis_ml':
        responsePayload = {
          reply_text: "Task 'analisis_ml' belum diimplementasikan.",
        };
        break;
      default:
        res.status(400).json({ error: 'Task tidak dikenal' });
        return;
    }

    // 5. Kirim balasan sukses kembali ke React
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error di Smart Router:', error.message);
    res.status(500).json({
      error: 'Terjadi kesalahan di server',
      details: error.message,
    });
  }
}

// --- 5. FUNGSI HELPER (LOGIKA INTI) ---

/**
 * Helper generik untuk memanggil model Gemini
 * Ini dirancang untuk "melemparkan" (throw) error agar bisa ditangkap oleh cascade.
 */
async function callGemini(modelName, prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // Menambahkan 'source' agar kita tahu model mana yang merespons
    return { reply_text: response.text(), source: modelName };
  } catch (error) {
    console.error(`Error saat memanggil ${modelName}:`, error.message);
    // Tambahkan 'status' ke error agar kita bisa mendeteksi Rate Limit (429)
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

/**
 * Helper untuk memanggil Hugging Face (DeepSeek)
 */
async function callHuggingFace(prompt) {
  try {
    const model = 'deepseek-ai/deepseek-coder-6.7b-instruct';
    const result = await hf.textGeneration({
      model: model,
      inputs: `<｜begin of sentence｜>User: ${prompt}\n\nAssistant:`,
      parameters: { max_new_tokens: 1024 }, // Ditambah tokennya
    });
    return { reply_text: result.generated_text, source: model };
  } catch (error) {
    console.error('Error saat memanggil Hugging Face:', error.message);
    throw new Error('Gagal menghubungi Hugging Face API');
  }
}

/**
 * Helper untuk memeriksa apakah ini error "Rate Limit"
 * (Error Google biasanya memiliki status 429)
 */
function isRateLimitError(error) {
  return error && error.status === 429;
}

// --- 6. FUNGSI TASK SPESIFIK (SKEMA ANDA) ---

/**
 * Task 1: Obrolan Umum
 * Menggunakan model RPM tertinggi untuk obrolan.
 * Model: gemini-2.0-flash-lite (30 RPM - dari screenshot Anda!)
 */
async function handleChatGeneral(prompt) {
  // Langsung panggil model 30 RPM. Cepat dan efisien.
  return await callGemini('gemini-2.0-flash-lite', prompt);
}

/**
 * Task 2: Asisten Koding (LOGIKA CASCADE ANDA)
 * (Pro -> Flash -> Lite -> HF)
 */
async function handleCodingAssistant(prompt) {
  // === UPAYA 1: Gemini 2.5 Pro (2 RPM) ===
  try {
    console.log('Mencoba Gemini 2.5 Pro (2 RPM)...');
    return await callGemini('gemini-2.5-pro', prompt);
  } catch (errorPro) {
    if (!isRateLimitError(errorPro)) {
      console.error('Error non-rate-limit di Pro:', errorPro.message);
      throw errorPro; // Gagal karena alasan lain (misal API key salah)
    }

    // Ini *adalah* error rate limit (429). Lanjut ke upaya 2.
    console.warn('Gemini 2.5 Pro sibuk (2 RPM). Pindah ke Flash...');

    // === UPAYA 2: Gemini 2.5 Flash (10 RPM) ===
    try {
      return await callGemini('gemini-2.5-flash', prompt);
    } catch (errorFlash) {
      if (!isRateLimitError(errorFlash)) {
        console.error('Error non-rate-limit di Flash:', errorFlash.message);
        throw errorFlash;
      }

      // Ini *juga* error rate limit. Lanjut ke upaya 3.
      console.warn('Gemini 2.5 Flash sibuk (10 RPM). Pindah ke Flash-Lite...');

      // === UPAYA 3: Gemini 2.5 Flash-Lite (15 RPM) ===
      try {
        return await callGemini('gemini-2.5-flash-lite', prompt);
      } catch (errorFlashLite) {
        if (!isRateLimitError(errorFlashLite)) {
          console.error(
            'Error non-rate-limit di Flash-Lite:',
            errorFlashLite.message
          );
          throw errorFlashLite;
        }

        // Semua model Gemini sibuk. Lanjut ke upaya 4.
        console.warn('Semua model Gemini sibuk. Pindah ke Hugging Face...');

        // === UPAYA 4: Fallback ke Hugging Face ===
        try {
          return await callHuggingFace(prompt);
        } catch (errorHF) {
          console.error('Hugging Face juga gagal:', errorHF.message);
          throw new Error(
            'Semua model AI sedang sibuk. Silakan coba lagi nanti.'
          );
        }
      }
    }
  }
}
