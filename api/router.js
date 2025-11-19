// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const Groq = require('groq-sdk');
// const cors = require('cors');

// // --- 1. INISIALISASI KLIEN ---
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // ====================================================================
// // --- BAGIAN 2: KONFIGURASI CORS (DIPERBARUI) ---
// // ====================================================================

// // Daftar domain yang kita izinkan
// const allowedOrigins = [
//   'https://MadzAmm.github.io', // Frontend produksi Anda
//   'https://madzamm.github.io',
//   'http://localhost:5173', // Server development lokal Anda (Vite)
// ];

// const corsHandler = cors({
//   origin: function (origin, callback) {
//     // 'origin' adalah domain yang mencoba memanggil API kita

//     // Izinkan jika:
//     // 1. Domain pemanggil ada di dalam 'allowedOrigins' KITA
//     // 2. Pemanggil tidak mengirim 'origin' (misalnya, Postman)
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true); // <-- Izinkan permintaan
//     } else {
//       console.error(
//         `CORS DITOLAK: Origin ${origin} tidak ada di daftar 'allowedOrigins'.`
//       );
//       callback(new Error('Domain ini tidak diizinkan oleh CORS')); // <-- Tolak permintaan
//     }
//   },
// });

// // Helper untuk middleware CORS
// const runMiddleware = (req, res, fn) => {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) return reject(result);
//       return resolve(result);
//     });
//   });
// };
// // ====================================================================

// // --- 3. "SMART ROUTER" UTAMA ---
// export default async function handler(req, res) {
//   // Terapkan CORS Handler (yang sudah diperbarui)
//   await runMiddleware(req, res, corsHandler);

//   // Keamanan
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
// // (Tidak ada perubahan di sini)

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

// // --- 6. FUNGSI CASCADE (SKEMA ANDA) ---
// // (Tidak ada perubahan di sini)

// /**
//  * CASCADE "CHAT" (Revisi Anda)
//  * Urutan: Gemini Flash -> Groq Compound -> Groq Qwen -> Groq GPT-OSS
//  */
// async function handleChatCascade(prompt) {
//   const systemPrompt = 'You are a helpful assistant.';

//   try {
//     return await callGemini('gemini-2.5-flash', prompt);
//   } catch (errorFlash) {
//     if (!isTryAgainError(errorFlash)) throw errorFlash;
//     console.warn('Gemini Flash sibuk. Pindah ke Groq Compound...');
//     try {
//       return await callGroq('groq/compound', systemPrompt, prompt);
//     } catch (errorCompound) {
//       console.warn('Groq Compound gagal atau sibuk. Pindah ke Groq Qwen...');
//       if (!isTryAgainError(errorCompound)) {
//         console.error(
//           'Error non-retryable di Compound:',
//           errorCompound.message
//         );
//       }
//       try {
//         return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//       } catch (errorQwen) {
//         console.warn('Groq Qwen gagal atau sibuk. Pindah ke Groq GPT-OSS...');
//         if (!isTryAgainError(errorQwen)) {
//           console.error('Error non-retryable di Qwen:', errorQwen.message);
//         }
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

//   try {
//     return await callGemini('gemini-2.5-pro', prompt);
//   } catch (errorPro) {
//     if (!isTryAgainError(errorPro)) throw errorPro;
//     console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');
//     try {
//       return await callGroq('openai/gpt-oss-20b', systemPrompt, prompt);
//     } catch (errorOSS) {
//       console.warn('Groq GPT-OSS gagal atau sibuk. Pindah ke Qwen...');
//       if (!isTryAgainError(errorOSS)) {
//         console.error('Error non-retryable di GPT-OSS:', errorOSS.message);
//       }
//       try {
//         return await callGroq('qwen/qwen3-32b', systemPrompt, prompt);
//       } catch (errorQwen) {
//         console.warn('Groq Qwen gagal atau sibuk. Pindah ke Compound...');
//         if (!isTryAgainError(errorQwen)) {
//           console.error('Error non-retryable di Qwen:', errorQwen.message);
//         }
//         return await callGroq('groq/compound', systemPrompt, prompt);
//       }
//     }
//   }
// }
//
//
//
//
//
//
//
// Alur logika (logic flow) di kode *backend* `api/router.js:`

// 1.  Pengecekan Keamanan & Validasi (Satpam Depan)
//       Apakah metode-nya `POST`? (Jika tidak, tolak).
//       Apakah data JSON valid?
//       Cek Wajib: Apakah ada `task` DAN `prompt`?
//           JIKA TIDAK: Langsung Error ("Input tidak valid"). Berhenti di sini.
//           JIKA IYA: Lanjut

// 2.  Pengecekan Jalan Pintas / Shortcut (Jalur VIP)
//       Sistem melihat isi `prompt`. Apakah dimulai dengan `@` (misal `@groq`)?
//         JIKA IYA: Abaikan apapun isi `task`. Langsung panggil fungsi shortcut yang diminta (misal `callGroq`). Kirim jawaban, dan SELESAI. (Tidak lanjut ke bawah).
//             JIKA TIDAK: Lanjut ke langkah berikutnya.

// 3.  Pengecekan Task & Eksekusi Cascade (Jalur Reguler)
//       Karena tidak ada shortcut, sistem melihat isi `task`.
//         Switch Case:
//           Jika `chat_general`: Jalankan fungsi `handleChatCascade` (Gemini -> Groq -> dll).
//           Jika `assistent_coding`: Jalankan fungsi `handleCodingCascade` (Gemini Pro -> Groq -> dll).
//           Jika tidak dikenal: *Error*.

// Validasi -> Cek Shortcut -> Cek Task (Cascade)
//
//
//
// File: api/router.js
// VERSI 22 (ALL-IN-ONE): Gemini + Groq + OpenRouter + Cerebras
// Semua provider aktif dan siap digunakan.
// File: api/router.js
// VERSI 23 (FINAL STABIL):
// - Mengganti @openrouter/sdk dengan 'openai' library (Standar Industri)
// - Memperbaiki error 'undefined reading create'
// - Tetap menyertakan Gemini, Groq, dan Cerebras

// File: api/router.js
// VERSI 24 (ALL-STAR): Gemini + Groq + OpenRouter + Cerebras + SambaNova
// Menggunakan 'openai' SDK untuk OpenRouter DAN SambaNova (Kompatibel)
// File: api/router.js
// VERSI 27 (THE ULTIMATE ALL-IN-ONE):
// Integrasi Lengkap: Gemini, Groq, OpenRouter, Cerebras, SambaNova, Cloudflare
// Fitur: Shortcut (@), Debug Routes, dan Cascade Berlapis.

// List provider dan model yang digunakan:
// 1. groq 'https://console.groq.com/docs/rate-limits'
//     a. groq/compound
//     b. qwen/qwen3-32b
//     c. openai/gpt-oss-120b
// 2. Gemini 'https://ai.google.dev/gemini-api/docs/rate-limits?hl=id'
//     a. gemini-2.5-pro
//     b. gemini-2.5-Flash
// 3. cerebras 'https://cloud.cerebras.ai/platform/org_p2d5xxc3ymmxmnyctfmycfwn/models'
//     a. gpt-oss-120b
//     b. llama-3.3-70b
//     c. qwen-3-235b-a22b-instruct-2507
// 4. openrouter 'https://openrouter.ai/docs/api-reference/limits'
//     a. openrouter/sherlock-dash-alpha
//     b. mistralai/mistral-7b-instruct:free
//     c. deepseek/deepseek-r1-distill-llama-70b:free
//     d. meta-llama/llama-3.3-70b-instruct:free
//     e. qwen/qwen3-coder:free
// 5. Sambanova 'https://docs.sambanova.ai/docs/en/models/rate-limits#free-tier'
//     a. DeepSeek-R1
//     b. DeepSeek-R1-Distill-Llama-70B
//     c. Meta-Llama-3.3-70B-Instruct
// 6. cloudflare 'https://developers.cloudflare.com/workers-ai/platform/limits/'
//     a. @cf/openai/gpt-oss-120b
//     b. @cf/meta/llama-3.3-70b-instruct-fp8-fast
//     c. @cf/mistralai/mistral-small-3.1-24b-instruct
// File: api/router.js
// VERSI MEGA-CASCADE: Integrasi 6 Provider dengan Daftar Model Lengkap
// Menggunakan sistem Loop Cascade untuk efisiensi penanganan banyak model.

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import cors from 'cors';

// ====================================================================
// --- 1. INISIALISASI KLIEN ---
// ====================================================================

// A. Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// B. Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// C. OpenRouter (Via OpenAI SDK)
const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// D. Cerebras (Native SDK) dengan maxRetries: 0 (by default retry 2x tapi dimatikan karena ingin Fail Fast (Gagal Cepat) dan langsung pindah.)
const cerebrasClient = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
  maxRetries: 0,
});

// E. SambaNova (Via OpenAI SDK)
const sambaNovaClient = new OpenAI({
  baseURL: 'https://api.sambanova.ai/v1',
  apiKey: process.env.SAMBANOVA_API_KEY,
});

// F. Cloudflare Workers AI (Via OpenAI SDK)
const cloudflareClient = new OpenAI({
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
  apiKey: process.env.CLOUDFLARE_API_TOKEN,
});

// ====================================================================
// --- 2. KONFIGURASI CORS ---
// ====================================================================
const allowedOrigins = [
  'https://MadzAmm.github.io',
  'https://madzamm.github.io',
  'http://localhost:5173',
];

const corsHandler = cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS DITOLAK: Origin ${origin} tidak diizinkan.`);
      callback(new Error('Domain ini tidak diizinkan oleh CORS'));
    }
  },
});

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
// ====================================================================
export default async function handler(req, res) {
  await runMiddleware(req, res, corsHandler);

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // Body Parser Safety
  let task, prompt;
  try {
    if (typeof req.body === 'string') {
      req.body = JSON.parse(req.body);
    }
    task = req.body.task;
    prompt = req.body.prompt;
    if (!task || !prompt) throw new Error('Input tidak valid.');
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON', details: error.message });
    return;
  }

  try {
    // Cek Shortcut terlebih dahulu
    const shortcutResult = await handleShortcut(prompt);
    if (shortcutResult) {
      return res.status(200).json(shortcutResult);
    }

    let responsePayload;

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

// ====================================================================
// --- 4. SISTEM CASCADE (ENGINE BARU) ---
// ====================================================================

// Helper untuk menjalankan daftar model secara berurutan (Looping)
async function runCascadeStrategy(
  strategyName,
  steps,
  prompt,
  systemInstruction
) {
  let lastError = null;

  console.log(
    `=== Memulai Cascade: ${strategyName} (${steps.length} langkah) ===`
  );

  for (const step of steps) {
    try {
      // Jalankan fungsi pemanggil model
      return await step.fn(step.model, prompt, systemInstruction);
    } catch (error) {
      lastError = error;
      // Cek apakah error "bisa dimaklumi" (Rate Limit / Server Error)
      if (isTryAgainError(error)) {
        console.warn(
          `[${strategyName}] Gagal di ${step.provider}/${step.model}. Pindah ke berikutnya...`
        );
        continue; // Lanjut ke model berikutnya di list
      } else {
        // Jika error fatal (misal API Key salah), berhenti dan lempar error
        console.error(
          `[${strategyName}] Error Fatal di ${step.provider}/${step.model}:`,
          error.message
        );
        throw error;
      }
    }
  }

  // Jika semua gagal
  console.error(`[${strategyName}] Semua model gagal.`);
  throw new Error(
    `Semua model di cascade ${strategyName} gagal. Terakhir: ${lastError?.message}`
  );
}

/**
 * CASCADE CHAT GENERAL
 * Urutan: Gemini Flash -> Groq Qwen -> Cerebras Llama -> SambaNova Llama -> Cloudflare Llama -> ... sisanya
 */
async function handleChatCascade(prompt) {
  const sys = 'You are a helpful assistant.';

  // DAFTAR URUTAN PRIORITAS (Sesuai List Anda)
  const steps = [
    // 1. Gemini (Cepat & Stabil)
    { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },

    // 2. Groq (Super Cepat)
    { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq }, // ID dari user
    { provider: 'Groq', model: 'groq/compound', fn: callGroq },

    // 3. Cerebras (Super Cepat)
    { provider: 'Cerebras', model: 'llama-3.3-70b', fn: callCerebras },

    // 4. SambaNova (Cepat)
    {
      provider: 'SambaNova',
      model: 'Meta-Llama-3.3-70B-Instruct',
      fn: callSambaNova,
    },

    // 5. Cloudflare
    {
      provider: 'Cloudflare',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      fn: callCloudflare,
    },

    // 6. OpenRouter (Free Tier)
    {
      provider: 'OpenRouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      fn: callOpenRouter,
    },

    // --- JARING PENGAMAN LAPIS KEDUA ---

    // 7. Gemini Pro (Kualitas Tinggi)
    { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },

    // 8. Groq (Backup)
    { provider: 'Groq', model: 'openai/gpt-oss-120b', fn: callGroq },

    // 9. Cerebras (Backup)
    { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },

    // 10. OpenRouter (Backup)
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-r1-distill-llama-70b:free',
      fn: callOpenRouter,
    },

    // 11. Cloudflare (Backup)
    {
      provider: 'Cloudflare',
      model: '@cf/mistralai/mistral-small-3.1-24b-instruct',
      fn: callCloudflare,
    },
    {
      provider: 'Cloudflare',
      model: '@cf/openai/gpt-oss-120b',
      fn: callCloudflare,
    },

    // 12. OpenRouter (Terakhir - Experimental)
    {
      provider: 'OpenRouter',
      model: 'openrouter/sherlock-dash-alpha',
      fn: callOpenRouter,
    },

    {
      provider: 'OpenRouter',
      model: 'mistralai/mistral-7b-instruct:free',
      fn: callOpenRouter,
    },
  ];

  return await runCascadeStrategy('Chat General', steps, prompt, sys);
}

/**
 * CASCADE CODING
 * Fokus: Kemampuan Koding & Reasoning
 */
async function handleCodingCascade(prompt) {
  const sys = 'You are an expert coding assistant.';

  const steps = [
    // 1. Gemini Pro (Otak Terbaik)
    { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },

    // 2. SambaNova (DeepSeek R1 - Reasoning Kuat)
    { provider: 'SambaNova', model: 'DeepSeek-R1', fn: callSambaNova },
    {
      provider: 'SambaNova',
      model: 'DeepSeek-R1-Distill-Llama-70B',
      fn: callSambaNova,
    },

    // 3. OpenRouter (Qwen Coder - Spesialis Koding)
    {
      provider: 'OpenRouter',
      model: 'qwen/qwen3-coder:free',
      fn: callOpenRouter,
    },

    // 4. Cerebras (Model Besar)
    {
      provider: 'Cerebras',
      model: 'qwen-3-235b-a22b-instruct-2507',
      fn: callCerebras,
    },
    { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },

    // 5. Groq
    { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },

    // 6. Cloudflare
    {
      provider: 'Cloudflare',
      model: '@cf/openai/gpt-oss-120b',
      fn: callCloudflare,
    },

    // 7. OpenRouter DeepSeek (Backup)
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-r1-distill-llama-70b:free',
      fn: callOpenRouter,
    },

    // 8. Gemini Flash (Jaring Pengaman Terakhir)
    { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
  ];

  return await runCascadeStrategy('Coding Assistant', steps, prompt, sys);
}

// ====================================================================
// --- 5. LOGIKA SHORTCUT (JALAN PINTAS) ---
// ====================================================================
async function handleShortcut(fullPrompt) {
  // Format: @provider-model_singkat
  const shortcuts = {
    // Groq
    '@groq-compound': (p) => callGroq('groq/compound', 'Helpful', p),
    '@groq-qwen': (p) => callGroq('qwen/qwen3-32b', 'Helpful', p),
    '@groq-gpt': (p) => callGroq('openai/gpt-oss-120b', 'Helpful', p),

    // Gemini
    '@gemini-pro': (p) => callGemini('gemini-2.5-pro', p),
    '@gemini-flash': (p) => callGemini('gemini-2.5-flash', p),

    // Cerebras
    '@cerebras-gpt': (p) => callCerebras('gpt-oss-120b', p),
    '@cerebras-llama': (p) => callCerebras('llama-3.3-70b', p),
    '@cerebras-qwen': (p) => callCerebras('qwen-3-235b-a22b-instruct-2507', p),

    // OpenRouter
    '@router-sherlock': (p) =>
      callOpenRouter('openrouter/sherlock-dash-alpha', p),
    '@router-mistral': (p) =>
      callOpenRouter('mistralai/mistral-7b-instruct:free', p), //inggris
    '@router-deepseek': (p) =>
      callOpenRouter('deepseek/deepseek-r1-distill-llama-70b:free', p),
    '@router-llama': (p) =>
      callOpenRouter('meta-llama/llama-3.3-70b-instruct:free', p),
    '@router-coder': (p) => callOpenRouter('qwen/qwen3-coder:free', p),

    // SambaNova
    '@nova-r1': (p) => callSambaNova('DeepSeek-R1', p),
    '@nova-deepseek': (p) => callSambaNova('DeepSeek-R1-Distill-Llama-70B', p),
    '@nova-llama': (p) => callSambaNova('Meta-Llama-3.3-70B-Instruct', p),

    // Cloudflare
    '@cf-gpt': (p) => callCloudflare('@cf/openai/gpt-oss-120b', p),
    '@cf-llama': (p) =>
      callCloudflare('@cf/meta/llama-3.3-70b-instruct-fp8-fast', p),
    '@cf-mistral': (p) =>
      callCloudflare('@cf/mistralai/mistral-small-3.1-24b-instruct', p),
  };

  for (const [prefix, handler] of Object.entries(shortcuts)) {
    if (fullPrompt.trim().toLowerCase().startsWith(prefix)) {
      const cleanPrompt = fullPrompt.slice(prefix.length).trim();
      console.log(`(Shortcut) Terdeteksi ${prefix}. Bypass cascade...`);
      return await handler(cleanPrompt);
    }
  }
  return null;
}

// ====================================================================
// --- 6. FUNGSI HELPER (PEMANGGIL API) ---
// ====================================================================

function isTryAgainError(error) {
  const s = error?.status;
  const isRetryable =
    !s || // Connection Error biasanya tidak punya status code
    s === 401 || // Authentication Error (Kunci Salah)
    s === 402 || // Payment Required (Saldo Habis - Cerebras/OpenRouter)
    s === 403 || // Permission Denied
    s === 404 || // Not Found (Model tidak ada/salah nama)
    s === 408 || // Request Timeout
    s === 410 || // Gone (Model Deprecated/Removed - KHUSUS SAMBANOVA)
    s === 429 || // Rate Limit (Umum)
    s === 498 || // Groq Flex Limit
    s >= 500 || // Menangkap 500, 502, 503, 504, dll
    s === 409; // Conflict (Cerebras menyarankan retry untuk ini);
  // Log error untuk debugging di Vercel Logs
  // 400 (Bad Request): Sengaja TIDAK memasukkan 400. Jika request salah format (misal JSON rusak), pindah ke provider lain pun kemungkinan besar akan tetap gagal. Jadi lebih baik error dan berhenti agar kita sadar ada bug di kode.
  if (isRetryable)
    console.warn(
      `(Error Check) Status ${
        s || 'Network/Connection'
      } terdeteksi. Mencoba provider berikutnya...`
    ); //bisa juga console.log(...)
  return isRetryable;
}

async function callGemini(modelName, prompt) {
  console.log(`(Call) Mencoba Gemini: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return {
      reply_text: result.response.text(),
      source: `Google (${modelName})`,
    };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
    throw enhancedError;
  }
}

async function callGroq(modelName, systemPrompt, userPrompt) {
  console.log(`(Call) Mencoba Groq: ${modelName}...`);
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: modelName,
    });
    const reply = chatCompletion.choices[0]?.message?.content || 'Maaf, error.';
    return { reply_text: reply, source: `Groq (${modelName})` };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callSambaNova(modelName, prompt) {
  console.log(`(Call) Mencoba SambaNova: ${modelName}...`);
  try {
    const completion = await sambaNovaClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      top_p: 0.9,
    });
    const reply = completion.choices[0]?.message?.content || 'No response.';
    return { reply_text: reply, source: `SambaNova (${modelName})` };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callCerebras(modelName, prompt) {
  console.log(`(Call) Mencoba Cerebras: ${modelName}...`);
  try {
    const completion = await cerebrasClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
    });
    const reply = completion.choices[0]?.message?.content || 'No response.';
    return { reply_text: reply, source: `Cerebras (${modelName})` };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callOpenRouter(modelName, prompt) {
  console.log(`(Call) Mencoba OpenRouter: ${modelName}...`);
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      extraHeaders: {
        'HTTP-Referer': 'https://genius-web-portfolio.com',
        'X-Title': 'Genius Web',
      },
    });
    const reply = completion.choices[0]?.message?.content || 'No response.';
    return { reply_text: reply, source: `OpenRouter (${modelName})` };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callCloudflare(modelName, prompt) {
  console.log(`(Call) Mencoba Cloudflare: ${modelName}...`);
  try {
    const completion = await cloudflareClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
    });
    const reply = completion.choices[0]?.message?.content || 'No response.';
    return { reply_text: reply, source: `Cloudflare (${modelName})` };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}
