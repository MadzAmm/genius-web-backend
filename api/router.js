// // File: api/router.js
// // VERSI 18 (FINAL): Perbaikan Bug Kritis
// // 1. Memperbaiki logika 'catch' cascade koding agar *pasti* lanjut.
// // 2. Menambahkan jaring pengaman untuk 'Invalid JSON' (body-parser).

// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const Groq = require('groq-sdk');
// const cors = require('cors');

// // --- 1. INISIALISASI KLIEN ---
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // --- 2. KONFIGURASI CORS ---
// const GITHUB_PAGES_DOMAIN = 'https://MadzAmm.github.io';
// const corsHandler = cors({ origin: GITHUB_PAGES_DOMAIN });

// // Helper untuk middleware CORS
// const runMiddleware = (req, res, fn) => {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) return reject(result);
//       return resolve(result);
//     });
//   });
// };

// // --- 3. "SMART ROUTER" UTAMA ---
// export default async function handler(req, res) {
//   // Jalankan CORS Handler
//   await runMiddleware(req, res, corsHandler);

//   // Keamanan
//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Method Not Allowed' });
//     return;
//   }

//   // ====================================================================
//   // PERBAIKAN BUG #2: Menangani error 'Invalid JSON'
//   // ====================================================================
//   let task, prompt;
//   try {
//     // Vercel seharusnya sudah mem-parse body, tapi kita amankan
//     if (typeof req.body === 'string') {
//       req.body = JSON.parse(req.body);
//     }
//     task = req.body.task;
//     prompt = req.body.prompt;

//     if (!task || !prompt) {
//       throw new Error('Input tidak valid: "task" dan "prompt" diperlukan.');
//     }
//   } catch (parseError) {
//     console.error('Gagal mem-parse JSON body:', parseError.message);
//     res
//       .status(400)
//       .json({ error: 'Invalid JSON', details: parseError.message });
//     return;
//   }
//   // ====================================================================

//   // Blok Try...Catch Utama untuk API
//   try {
//     let responsePayload;

//     // --- 4. LOGIKA ROUTER INTI ---
//     switch (task) {
//       case 'chat_general':
//       case 'info_portofolio':
//         const finalPrompt =
//           task === 'info_portofolio'
//             ? `KONTEKS: [CV Anda di sini...]. Pertanyaan: ${prompt}`
//             : prompt;
//         responsePayload = await handleChatCascade(finalPrompt);
//         break;

//       case 'assistent_coding':
//         responsePayload = await handleCodingCascade(prompt);
//         break;

//       default:
//         res.status(400).json({ error: 'Task tidak dikenal' });
//         return;
//     }

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

// async function callGemini(modelName, prompt) {
//   console.log(`(Cascade) Mencoba Gemini: ${modelName}...`);
//   try {
//     const model = genAI.getGenerativeModel({ model: modelName });
//     const result = await model.generateContent(prompt);
//     return { reply_text: result.response.text(), source: modelName };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || error.cause?.status || 500;
//     console.error(`(Cascade) GAGAL di ${modelName}:`, enhancedError.message);
//     throw enhancedError;
//   }
// }

// async function callGroq(modelName, systemPrompt, userPrompt) {
//   console.log(`(Cascade) Mencoba Groq: ${modelName}...`);
//   try {
//     const chatCompletion = await groq.chat.completions.create({
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       model: modelName,
//     });
//     const reply =
//       chatCompletion.choices[0]?.message?.content || 'Maaf, terjadi kesalahan.';
//     return { reply_text: reply, source: modelName };
//   } catch (error) {
//     console.error(`(Cascade) GAGAL di ${modelName}:`, error.message);
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// function isTryAgainError(error) {
//   const isRetryable = error && (error.status === 429 || error.status === 503);
//   console.log(
//     `(Cascade) Mendeteksi error status ${error.status}. Bisa dicoba lagi? ${isRetryable}`
//   );
//   return isRetryable;
// }

// // --- 6. FUNGSI CASCADE (DENGAN PERBAIKAN BUG) ---

// /**
//  * CASCADE "CHAT" (Gemini Flash -> Groq Qwen -> Groq Compound -> Groq GPT-OSS)
//  * (Logika ini sudah berfungsi berdasarkan laporan Anda, jadi kita biarkan)
//  */
// async function handleChatCascade(prompt) {
//   const systemPrompt = 'You are a helpful assistant.';

//   try {
//     return await callGemini('gemini-2.5-flash', prompt);
//   } catch (errorFlash) {
//     if (!isTryAgainError(errorFlash)) throw errorFlash;
//     console.warn('Gemini Flash sibuk. Pindah ke Groq Qwen...');
//     try {
//       return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//     } catch (errorQwen) {
//       if (!isTryAgainError(errorQwen)) throw errorQwen;
//       console.warn('Groq Qwen sibuk. Pindah ke Groq Compound...');
//       try {
//         return await callGroq('groq/compound', systemPrompt, prompt);
//       } catch (errorCompound) {
//         if (!isTryAgainError(errorCompound)) throw errorCompound;
//         console.warn(
//           'Groq Compound gagal atau sibuk. Pindah ke Groq GPT-OSS...'
//         );
//         return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
//       }
//     }
//   }
// }

// /**
//  * CASCADE "KODING" (Gemini Pro -> Groq GPT-OSS -> Groq Qwen -> Groq Compound)
//  */
// async function handleCodingCascade(prompt) {
//   const systemPrompt = 'You are an expert coding assistant.';

//   // === UPAYA 1: Gemini 2.5 Pro (2 RPM) ===
//   try {
//     return await callGemini('gemini-2.5-pro', prompt);
//   } catch (errorPro) {
//     if (!isTryAgainError(errorPro)) {
//       // Ini adalah error serius (API key salah, dll), hentikan cascade
//       throw errorPro;
//     }
//     console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');

//     // ====================================================================
//     // PERBAIKAN BUG #1: 'catch' block untuk Groq sekarang akan MELANJUTKAN
//     // ====================================================================

//     // === UPAYA 2: Groq GPT-OSS 20B (1000 RPM) ===
//     try {
//       return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
//     } catch (errorOSS) {
//       // JANGAN THROW ERROR. Peringatkan & Lanjutkan ke jaring pengaman berikutnya.
//       console.warn('Groq GPT-OSS gagal atau sibuk. Pindah ke Qwen...');
//       if (!isTryAgainError(errorOSS)) {
//         // Log error non-retryable, tapi tetap lanjut
//         console.error('Error non-retryable di GPT-OSS:', errorOSS.message);
//       }

//       // === UPAYA 3: Groq Qwen3-32B (1000 RPM) ===
//       try {
//         return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//       } catch (errorQwen) {
//         // JANGAN THROW ERROR. Peringatkan & Lanjutkan.
//         console.warn('Groq Qwen gagal atau sibuk. Pindah ke Compound...');
//         if (!isTryAgainError(errorQwen)) {
//           console.error('Error non-retryable di Qwen:', errorQwen.message);
//         }

//         // === UPAYA 4: Groq Compound (200 RPM - Jaring Pengaman Terakhir) ===
//         // Ini adalah upaya terakhir. Jika ini gagal, biarkan ia 'throw'
//         return await callGroq('groq/compound', systemPrompt, prompt);
//       }
//     }
//   }
// }

// File: api/router.js
// VERSI 18 (FINAL): Menerapkan skema cascade revisi Anda
// Chat: Gemini Flash -> Compound -> Qwen -> GPT-OSS
// Kode: Gemini Pro -> GPT-OSS -> Qwen -> Compound

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

      // ... (Placeholder untuk task lain) ...
      default:
        res.status(400).json({ error: 'Task tidak dikenal' });
        return;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error di Smart Router:', error.message);
    res.status(500).json({
      error: 'Semua model AI sedang sibuk atau gagal.',
      details: error.message,
    });
  }
}

// --- 5. FUNGSI HELPER (LOGIKA INTI) ---

/**
 * Helper generik untuk memanggil model Gemini
 */
async function callGemini(modelName, prompt) {
  console.log(`(Cascade) Mencoba Gemini: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return { reply_text: result.response.text(), source: modelName };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
    console.error(`(Cascade) GAGAL di ${modelName}:`, enhancedError);
    throw enhancedError;
  }
}

/**
 * Helper generik untuk memanggil API Groq
 */
async function callGroq(modelName, systemPrompt, userPrompt) {
  console.log(`(Cascade) Mencoba Groq: ${modelName}...`);
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
    console.error(`(Cascade) GAGAL di ${modelName}:`, error);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

/**
 * Helper KUNCI: Memeriksa error 429 (Rate Limit) ATAU 503 (Overloaded)
 */
function isTryAgainError(error) {
  const isRetryable = error && (error.status === 429 || error.status === 503);
  console.log(
    `(Cascade) Mendeteksi error ${error.status}. Bisa dicoba lagi? ${isRetryable}`
  );
  return isRetryable;
}

// --- 6. FUNGSI CASCADE (SKEMA ANDA YANG BARU) ---

/**
 * CASCADE "CHAT" (Revisi Anda)
 * Urutan: Gemini Flash -> Groq Compound -> Groq Qwen -> Groq GPT-OSS
 */
async function handleChatCascade(prompt) {
  const systemPrompt = 'You are a helpful assistant.';

  // === UPAYA 1: Gemini 2.5 Flash (10 RPM) ===
  try {
    return await callGemini('gemini-2.5-flash', prompt);
  } catch (errorFlash) {
    if (!isTryAgainError(errorFlash)) throw errorFlash;
    console.warn('Gemini Flash sibuk. Pindah ke Groq Compound...'); // <-- REVISI

    // === UPAYA 2: Groq Compound (200 RPM) === // <-- REVISI
    try {
      return await callGroq('groq/compound', systemPrompt, prompt);
    } catch (errorCompound) {
      if (!isTryAgainError(errorCompound)) throw errorCompound;
      console.warn('Groq Compound sibuk. Pindah ke Groq Qwen...'); // <-- REVISI

      // === UPAYA 3: Groq Qwen3-32B (1000 RPM) === // <-- REVISI
      try {
        return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
      } catch (errorQwen) {
        if (!isTryAgainError(errorQwen)) throw errorQwen;
        console.warn('Groq Qwen gagal atau sibuk. Pindah ke Groq GPT-OSS...');

        // === UPAYA 4: Groq GPT-OSS 20B (1000 RPM - Jaring Pengaman Terakhir) ===
        return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
      }
    }
  }
}

/**
 * CASCADE "KODING" (Tetap Sama)
 * Urutan: Gemini Pro -> Groq GPT-OSS -> Groq Qwen -> Groq Compound
 */
async function handleCodingCascade(prompt) {
  const systemPrompt = 'You are an expert coding assistant.';

  // === UPAYA 1: Gemini 2.5 Pro (2 RPM) ===
  try {
    return await callGemini('gemini-2.5-pro', prompt);
  } catch (errorPro) {
    if (!isTryAgainError(errorPro)) throw errorPro;
    console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');

    // === UPAYA 2: Groq GPT-OSS 20B (1000 RPM) ===
    try {
      return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
    } catch (errorOSS) {
      if (!isTryAgainError(errorOSS)) throw errorOSS;
      console.warn('Groq GPT-OSS sibuk. Pindah ke Qwen...');

      // === UPAYA 3: Groq Qwen3-32B (1000 RPM) ===
      try {
        return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
      } catch (errorQwen) {
        if (!isTryAgainError(errorQwen)) throw errorQwen;
        console.warn('Groq Qwen sibuk. Pindah ke Compound...');

        // === UPAYA 4: Groq Compound (200 RPM - Jaring Pengaman Terakhir) ===
        return await callGroq('groq/compound', systemPrompt, prompt);
      }
    }
  }
}
