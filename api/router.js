// // File: api/router.js
// // VERSI 18 (FINAL): Perbaikan Bug Kritis Cascade
// // - Memperbaiki logika 'catch' di dalam cascade agar TIDAK 'throw' (menghentikan)
// //   dan SELALU melanjutkan ke model berikutnya.

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
//   await runMiddleware(req, res, corsHandler);

//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Method Not Allowed' });
//     return;
//   }

//   // Jaring pengaman untuk body parser
//   let task, prompt;
//   try {
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

// /**
//  * Helper KUNCI: Memeriksa error 429 (Rate Limit) ATAU 503 (Overloaded)
//  */
// function isTryAgainError(error) {
//   const isRetryable = error && (error.status === 429 || error.status === 503);
//   console.log(
//     `(Cascade) Mendeteksi error status ${error.status}. Bisa dicoba lagi? ${isRetryable}`
//   );
//   return isRetryable;
// }

// // --- 6. FUNGSI CASCADE (DENGAN PERBAIKAN BUG) ---

// /**
//  * CASCADE "CHAT" (Revisi Anda)
//  * Urutan: Gemini Flash -> Groq Compound -> Groq Qwen -> Groq GPT-OSS
//  */
// async function handleChatCascade(prompt) {
//   const systemPrompt = 'You are a helpful assistant.';

//   // === UPAYA 1: Gemini 2.5 Flash (10 RPM) ===
//   try {
//     return await callGemini('gemini-2.5-flash', prompt);
//   } catch (errorFlash) {
//     if (!isTryAgainError(errorFlash)) throw errorFlash; // Gagal karena API Key salah, dll.
//     console.warn('Gemini Flash sibuk. Pindah ke Groq Compound...');

//     // === UPAYA 2: Groq Compound (200 RPM) ===
//     try {
//       return await callGroq('groq/compound', systemPrompt, prompt);
//     } catch (errorCompound) {
//       // ====================================================================
//       // PERBAIKAN BUG: JANGAN 'throw' di sini. Peringatkan & Lanjutkan.
//       // ====================================================================
//       console.warn('Groq Compound gagal atau sibuk. Pindah ke Groq Qwen...');
//       if (!isTryAgainError(errorCompound)) {
//         console.error(
//           'Error non-retryable di Compound:',
//           errorCompound.message
//         );
//       }

//       // === UPAYA 3: Groq Qwen3-32B (1000 RPM) ===
//       try {
//         return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//       } catch (errorQwen) {
//         // ====================================================================
//         // PERBAIKAN BUG: JANGAN 'throw' di sini. Peringatkan & Lanjutkan.
//         // ====================================================================
//         console.warn('Groq Qwen gagal atau sibuk. Pindah ke Groq GPT-OSS...');
//         if (!isTryAgainError(errorQwen)) {
//           console.error('Error non-retryable di Qwen:', errorQwen.message);
//         }

//         // === UPAYA 4: Groq GPT-OSS 20B (1000 RPM - Jaring Pengaman Terakhir) ===
//         // Ini adalah upaya terakhir. Jika ini gagal, biarkan ia 'throw'
//         return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
//       }
//     }
//   }
// }

// /**
//  * CASCADE "KODING" (Revisi Anda)
//  * Urutan: Gemini Pro -> Groq GPT-OSS -> Groq Qwen -> Groq Compound
//  */
// async function handleCodingCascade(prompt) {
//   const systemPrompt = 'You are an expert coding assistant.';

//   // === UPAYA 1: Gemini 2.5 Pro (2 RPM) ===
//   try {
//     return await callGemini('gemini-2.5-pro', prompt);
//   } catch (errorPro) {
//     if (!isTryAgainError(errorPro)) throw errorPro; // Gagal karena API Key salah, dll.
//     console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');

//     // === UPAYA 2: Groq GPT-OSS 20B (1000 RPM) ===
//     try {
//       return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
//     } catch (errorOSS) {
//       // ====================================================================
//       // PERBAIKAN BUG: JANGAN 'throw' di sini. Peringatkan & Lanjutkan.
//       // ====================================================================
//       console.warn('Groq GPT-OSS gagal atau sibuk. Pindah ke Qwen...');
//       if (!isTryAgainError(errorOSS)) {
//         console.error('Error non-retryable di GPT-OSS:', errorOSS.message);
//       }

//       // === UPAYA 3: Groq Qwen3-32B (1000 RPM) ===
//       try {
//         return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//       } catch (errorQwen) {
//         // ====================================================================
//         // PERBAIKAN BUG: JANGAN 'throw' di sini. Peringatkan & Lanjutkan.
//         // ====================================================================
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
// VERSI 19 (FINAL): Perbaikan CORS untuk mengizinkan localhost

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const cors = require('cors');

// --- 1. INISIALISASI KLIEN ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ====================================================================
// --- BAGIAN 2: KONFIGURASI CORS (DIPERBARUI) ---
// ====================================================================

// Daftar domain yang kita izinkan
const allowedOrigins = [
  'https://MadzAmm.github.io', // Frontend produksi Anda
  'https://madzamm.github.io',
  'http://localhost:5173', // Server development lokal Anda (Vite)
];

const corsHandler = cors({
  origin: function (origin, callback) {
    // 'origin' adalah domain yang mencoba memanggil API kita

    // Izinkan jika:
    // 1. Domain pemanggil ada di dalam 'allowedOrigins' KITA
    // 2. Pemanggil tidak mengirim 'origin' (misalnya, Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // <-- Izinkan permintaan
    } else {
      console.error(
        `CORS DITOLAK: Origin ${origin} tidak ada di daftar 'allowedOrigins'.`
      );
      callback(new Error('Domain ini tidak diizinkan oleh CORS')); // <-- Tolak permintaan
    }
  },
});

// Helper untuk middleware CORS
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
};
// ====================================================================

// --- 3. "SMART ROUTER" UTAMA ---
export default async function handler(req, res) {
  // Terapkan CORS Handler (yang sudah diperbarui)
  await runMiddleware(req, res, corsHandler);

  // Keamanan
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // Jaring pengaman untuk body parser
  let task, prompt;
  try {
    if (typeof req.body === 'string') {
      req.body = JSON.parse(req.body);
    }
    task = req.body.task;
    prompt = req.body.prompt;
    if (!task || !prompt) {
      throw new Error('Input tidak valid: "task" dan "prompt" diperlukan.');
    }
  } catch (parseError) {
    console.error('Gagal mem-parse JSON body:', parseError.message);
    res
      .status(400)
      .json({ error: 'Invalid JSON', details: parseError.message });
    return;
  }

  // Blok Try...Catch Utama untuk API
  try {
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
// (Tidak ada perubahan di sini)

async function callGemini(modelName, prompt) {
  console.log(`(Cascade) Mencoba Gemini: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return { reply_text: result.response.text(), source: modelName };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
    console.error(`(Cascade) GAGAL di ${modelName}:`, enhancedError.message);
    throw enhancedError;
  }
}

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
    console.error(`(Cascade) GAGAL di ${modelName}:`, error.message);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

function isTryAgainError(error) {
  const isRetryable = error && (error.status === 429 || error.status === 503);
  console.log(
    `(Cascade) Mendeteksi error status ${error.status}. Bisa dicoba lagi? ${isRetryable}`
  );
  return isRetryable;
}

// --- 6. FUNGSI CASCADE (SKEMA ANDA) ---
// (Tidak ada perubahan di sini)

/**
 * CASCADE "CHAT" (Revisi Anda)
 * Urutan: Gemini Flash -> Groq Compound -> Groq Qwen -> Groq GPT-OSS
 */
async function handleChatCascade(prompt) {
  const systemPrompt = 'You are a helpful assistant.';

  try {
    return await callGemini('gemini-2.5-flash', prompt);
  } catch (errorFlash) {
    if (!isTryAgainError(errorFlash)) throw errorFlash;
    console.warn('Gemini Flash sibuk. Pindah ke Groq Compound...');
    try {
      return await callGroq('groq/compound', systemPrompt, prompt);
    } catch (errorCompound) {
      console.warn('Groq Compound gagal atau sibuk. Pindah ke Groq Qwen...');
      if (!isTryAgainError(errorCompound)) {
        console.error(
          'Error non-retryable di Compound:',
          errorCompound.message
        );
      }
      try {
        return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
      } catch (errorQwen) {
        console.warn('Groq Qwen gagal atau sibuk. Pindah ke Groq GPT-OSS...');
        if (!isTryAgainError(errorQwen)) {
          console.error('Error non-retryable di Qwen:', errorQwen.message);
        }
        return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
      }
    }
  }
}

/**
 * CASCADE "KODING" (Revisi Anda)
 * Urutan: Gemini Pro -> Groq GPT-OSS -> Groq Qwen -> Groq Compound
 */
async function handleCodingCascade(prompt) {
  const systemPrompt = 'You are an expert coding assistant.';

  try {
    return await callGemini('gemini-2.5-pro', prompt);
  } catch (errorPro) {
    if (!isTryAgainError(errorPro)) throw errorPro;
    console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');
    try {
      return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
    } catch (errorOSS) {
      console.warn('Groq GPT-OSS gagal atau sibuk. Pindah ke Qwen...');
      if (!isTryAgainError(errorOSS)) {
        console.error('Error non-retryable di GPT-OSS:', errorOSS.message);
      }
      try {
        return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
      } catch (errorQwen) {
        console.warn('Groq Qwen gagal atau sibuk. Pindah ke Compound...');
        if (!isTryAgainError(errorQwen)) {
          console.error('Error non-retryable di Qwen:', errorQwen.message);
        }
        return await callGroq('groq/compound', systemPrompt, prompt);
      }
    }
  }
}
