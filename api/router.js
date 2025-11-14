// // File: api/router.js
// // VERSI FINAL: Strategi "Kolam Gemini" (Cascade Cerdas & Cepat)
// // (Berdasarkan data rate limit yang Anda temukan)

// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { HfInference } = require('@huggingface/inference');
// const cors = require('cors');

// // --- 1. INISIALISASI KLIEN ---
// // Kunci API ini akan dibaca dari Vercel Environment Variables
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const hf = new HfInference(process.env.HF_API_KEY);

// // --- 2. KONFIGURASI CORS ---
// // Mengizinkan frontend Anda di GitHub Pages untuk memanggil backend ini.
// const GITHUB_PAGES_DOMAIN = 'https://MadzAmm.github.io'; // Sesuai nama Anda
// const corsHandler = cors({ origin: GITHUB_PAGES_DOMAIN });

// // Helper untuk middleware CORS di Vercel
// const runMiddleware = (req, res, fn) => {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) return reject(result);
//       return resolve(result);
//     });
//   });
// };

// // --- 3. "SMART ROUTER" UTAMA (VERCEL SERVERLESS FUNCTION) ---
// export default async function handler(req, res) {
//   // Terapkan CORS Handler
//   await runMiddleware(req, res, corsHandler);

//   // Keamanan
//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Method Not Allowed' });
//     return;
//   }

//   // Blok Try...Catch Utama
//   try {
//     const { task, prompt } = req.body;
//     let responsePayload;

//     // --- 4. LOGIKA ROUTER INTI (Cerdas & Cepat) ---
//     switch (task) {
//       case 'chat_general':
//       case 'info_portofolio':
//         // Task non-koding menggunakan cascade "Cepat"
//         const finalPrompt =
//           task === 'info_portofolio'
//             ? `KONTEKS: [CV Anda di sini...]. Pertanyaan: ${prompt}`
//             : prompt;
//         responsePayload = await handleFastCascade(finalPrompt);
//         break;

//       case 'assistent_coding':
//         // Task koding menggunakan cascade "Cerdas"
//         responsePayload = await handleSmartCascade(prompt);
//         break;

//       // --- Placeholder untuk task masa depan ---
//       case 'analisis_dokumen':
//         responsePayload = {
//           reply_text: "Task 'analisis_dokumen' belum diimplementasikan.",
//         };
//         break;
//       case 'studio_visual':
//         responsePayload = {
//           reply_text: "Task 'studio_visual' belum diimplementasikan.",
//         };
//         break;
//       case 'analisis_ml':
//         responsePayload = {
//           reply_text: "Task 'analisis_ml' belum diimplementasikan.",
//         };
//         break;
//       default:
//         res.status(400).json({ error: 'Task tidak dikenal' });
//         return;
//     }

//     // 5. Kirim balasan sukses kembali ke React
//     res.status(200).json(responsePayload);
//   } catch (error) {
//     console.error('Error di Smart Router:', error.message);
//     res.status(500).json({
//       error: 'Semua model AI sedang sibuk atau gagal.',
//       details: error.message,
//     });
//   }
// }

// // --- 5. FUNGSI HELPER (LOGIKA INTI) ---

// /**
//  * Helper generik untuk memanggil model Gemini
//  */
// async function callGemini(modelName, prompt) {
//   console.log(`Mencoba ${modelName}...`);
//   try {
//     const model = genAI.getGenerativeModel({ model: modelName });
//     const result = await model.generateContent(prompt);
//     return { reply_text: result.response.text(), source: modelName };
//   } catch (error) {
//     // Tambahkan status ke error agar kita bisa mendeteksinya
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// /**
//  * Helper untuk memanggil Hugging Face
//  */
// async function callHuggingFace(modelName, prompt) {
//   console.log(`Mencoba ${modelName}...`);
//   try {
//     const result = await hf.textGeneration({
//       model: modelName,
//       inputs: prompt,
//     });
//     return { reply_text: result.generated_text, source: modelName };
//   } catch (error) {
//     throw new Error('Hugging Face API gagal');
//   }
// }

// /**
//  * Helper untuk memeriksa apakah ini error "Rate Limit" (429)
//  */
// function isRateLimitError(error) {
//   return error && error.status === 429;
// }

// // --- 6. FUNGSI CASCADE (SKEMA ANDA) ---

// /**
//  * CASCADE "CEPAT" (Untuk Chat Umum & Info)
//  * Prioritas: Kecepatan (RPM Tinggi)
//  * Urutan: 30 RPM -> 15 RPM -> HF Mistral
//  */
// async function handleFastCascade(prompt) {
//   // === UPAYA 1: Gemini 2.0 Flash-Lite (30 RPM) ===
//   try {
//     return await callGemini('gemini-2.0-flash-lite', prompt);
//   } catch (errorLite2) {
//     if (!isRateLimitError(errorLite2)) throw errorLite2; // Error serius
//     console.warn(
//       'Gemini 2.0 Flash-Lite sibuk (30 RPM). Pindah ke 2.5 Flash-Lite...'
//     );

//     // === UPAYA 2: Gemini 2.5 Flash-Lite (15 RPM) ===
//     try {
//       return await callGemini('gemini-2.5-flash-lite', prompt);
//     } catch (errorLite25) {
//       if (!isRateLimitError(errorLite25)) throw errorLite25; // Error serius
//       console.warn('Semua model chat Gemini sibuk. Pindah ke HF (Mistral)...');

//       // === UPAYA 3: HF Mistral (Jaring Pengaman) ===
//       return await callHuggingFace(
//         'mistralai/Mistral-7B-Instruct-v0.2',
//         prompt
//       );
//     }
//   }
// }

// /**
//  * CASCADE "CERDAS" (Untuk Asisten Koding)
//  * Prioritas: Kecerdasan (Model Terbaik)
//  * Urutan: 2 RPM -> 10 RPM -> 15 RPM -> HF DeepSeek
//  */
// async function handleSmartCascade(prompt) {
//   const hfPrompt = `<｜begin of sentence｜>User: ${prompt}\n\nAssistant:`;

//   // === UPAYA 1: Gemini 2.5 Pro (2 RPM) ===
//   try {
//     return await callGemini('gemini-2.5-pro', prompt);
//   } catch (errorPro) {
//     if (!isRateLimitError(errorPro)) throw errorPro; // Error serius
//     console.warn('Gemini 2.5 Pro sibuk (2 RPM). Pindah ke 2.5 Flash...');

//     // === UPAYA 2: Gemini 2.5 Flash (10 RPM) ===
//     try {
//       return await callGemini('gemini-2.5-flash', prompt);
//     } catch (errorFlash) {
//       if (!isRateLimitError(errorFlash)) throw errorFlash;
//       console.warn(
//         'Gemini 2.5 Flash sibuk (10 RPM). Pindah ke 2.5 Flash-Lite...'
//       );

//       // === UPAYA 3: Gemini 2.5 Flash-Lite (15 RPM) ===
//       try {
//         return await callGemini('gemini-2.5-flash-lite', prompt);
//       } catch (errorFlashLite) {
//         if (!isRateLimitError(errorFlashLite)) throw errorFlashLite;
//         console.warn('Semua model Gemini sibuk. Pindah ke HF (DeepSeek)...');

//         // === UPAYA 4: HF DeepSeek (Jaring Pengaman Koding) ===
//         return await callHuggingFace(
//           'deepseek-ai/deepseek-coder-6.7b-instruct',
//           hfPrompt
//         );
//       }
//     }
//   }
// }

// File: api/router.js
// VERSI 14: Menambahkan Rute Debug untuk Tes Individual
// (Gemini + Groq)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const cors = require('cors');

// --- 1. INISIALISASI KLIEN ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- 2. KONFIGURASI CORS ---
const GITHUB_PAGES_DOMAIN = 'https://MadzAmm.github.io';
const corsHandler = cors({ origin: GITHUB_PAGES_DOMAIN });

// Helper untuk middleware CORS
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
};

// --- 3. "SMART ROUTER" UTAMA ---
export default async function handler(req, res) {
  await runMiddleware(req, res, corsHandler);

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { task, prompt } = req.body;
    let responsePayload;

    // --- 4. LOGIKA ROUTER INTI ---
    switch (task) {
      // == RUTE PRODUKSI (DENGAN CASCADE) ==
      case 'chat_general':
      case 'info_portofolio':
        const finalPrompt =
          task === 'info_portofolio'
            ? `KONTEKS: [CV Anda di sini...]. Pertanyaan: ${prompt}`
            : prompt;
        responsePayload = await handleChatCascade(finalPrompt);
        break;

      case 'assistent_coding':
        responsePayload = await handleCodingCascade(prompt);
        break;

      // ===============================================
      // == RUTE DEBUG (MEM-BYPASS CASCADE) ==
      // ===============================================
      case '_debug_gemini_pro':
        responsePayload = await callGemini('gemini-2.5-pro', prompt);
        break;
      case '_debug_gemini_flash':
        responsePayload = await callGemini('gemini-2.5-flash', prompt);
        break;
      case '_debug_gemini_lite':
        responsePayload = await callGemini('gemini-2.5-flash-lite', prompt);
        break;
      case '_debug_groq_versatile': // Model Koding Groq
        responsePayload = await callGroq(
          'llama-3.3-70b-versatile',
          'You are an expert coding assistant.',
          prompt
        );
        break;
      case '_debug_groq_instant': // Model Chat Cepat Groq
        responsePayload = await callGroq(
          'llama-3.1-8b-instant',
          'You are a helpful assistant.',
          prompt
        );
        break;

      // ... (Placeholder untuk task lain) ...
      default:
        res.status(400).json({ error: 'Task tidak dikenal' });
        return;
    }

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
 */
async function callGemini(modelName, prompt) {
  console.log(`(Debug) Mencoba ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return { reply_text: result.response.text(), source: modelName };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
    console.error(`(Debug) GAGAL di ${modelName}:`, enhancedError);
    throw enhancedError;
  }
}

/**
 * Helper generik untuk memanggil API Groq
 */
async function callGroq(modelName, systemPrompt, userPrompt) {
  console.log(`(Debug) Mencoba Groq Model: ${modelName}...`);
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: modelName,
    });
    const reply =
      chatCompletion.choices[0]?.message?.content || 'Maaf, terjadi kesalahan.';
    return { reply_text: reply, source: modelName };
  } catch (error) {
    console.error(`(Debug) GAGAL di ${modelName}:`, error);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

/**
 * Helper untuk memeriksa error 429 (Rate Limit) atau 503 (Overloaded)
 */
function isTryAgainError(error) {
  const isRetryable = error && (error.status === 429 || error.status === 503);
  console.log(
    `(Debug) Mendeteksi error ${error.status}. Apakah bisa dicoba lagi? ${isRetryable}`
  );
  return isRetryable;
}

// --- 6. FUNGSI CASCADE (SKEMA ANDA) ---
// (Logika ini tetap sama persis seperti Versi 13)

/**
 * CASCADE "CHAT" (Flash -> Lite -> Groq Instant -> Pro)
 */
async function handleChatCascade(prompt) {
  try {
    return await callGemini('gemini-2.5-flash');
  } catch (errorFlash) {
    if (!isTryAgainError(errorFlash)) throw errorFlash;
    console.warn('Gemini 2.5 Flash sibuk. Pindah ke Flash-Lite...');
    try {
      return await callGemini('gemini-2.5-flash-lite');
    } catch (errorLite) {
      if (!isTryAgainError(errorLite)) throw errorLite;
      console.warn('Model chat Gemini sibuk. Pindah ke Groq (Instant)...');
      try {
        return await callGroq(
          'llama-3.1-8b-instant',
          'You are a helpful assistant.',
          prompt
        );
      } catch (errorGroq) {
        if (!isTryAgainError(errorGroq)) throw errorGroq;
        console.warn('Groq Instant sibuk. Pindah ke Pro (Upaya Terakhir)...');
        return await callGemini('gemini-2.5-pro');
      }
    }
  }
}

/**
 * CASCADE "KODING" (Pro -> Groq Versatile -> Flash -> Lite)
 */
async function handleCodingCascade(prompt) {
  try {
    return await callGemini('gemini-2.5-pro');
  } catch (errorPro) {
    if (!isTryAgainError(errorPro)) throw errorPro;
    console.warn('Gemini 2.5 Pro sibuk. Pindah ke Groq (Versatile)...');
    try {
      return await callGroq(
        'llama-3.3-70b-versatile',
        'You are an expert coding assistant.',
        prompt
      );
    } catch (errorGroq) {
      console.warn(
        'Groq Versatile gagal atau sibuk. Pindah ke Gemini 2.5 Flash...'
      );
      try {
        return await callGemini('gemini-2.5-flash');
      } catch (errorFlash) {
        if (!isTryAgainError(errorFlash)) throw errorFlash;
        console.warn('Gemini 2.5 Flash sibuk. Pindah ke Flash-Lite...');
        return await callGemini('gemini-2.5-flash-lite');
      }
    }
  }
}
