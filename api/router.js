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

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import cors from 'cors';

// --- 1. INISIALISASI SEMUA KLIEN ---

// A. Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// B. Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// C. OpenRouter (Via OpenAI SDK)
const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// D. Cerebras
const cerebrasClient = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

// E. [BARU] SambaNova (Via OpenAI SDK)
const sambaNovaClient = new OpenAI({
  baseURL: 'https://api.sambanova.ai/v1',
  apiKey: process.env.SAMBANOVA_API_KEY,
});

// --- 2. KONFIGURASI CORS ---
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

// --- 3. "SMART ROUTER" UTAMA ---
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
    let responsePayload;

    // --- 4. LOGIKA ROUTER ---
    switch (task) {
      // === TASK UTAMA (CASCADE) ===
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

      // === RUTE DEBUG (TESTING) ===
      case '_debug_sambanova': // [BARU]
        responsePayload = await callSambaNova(
          'Meta-Llama-3.1-8B-Instruct',
          prompt
        );
        break;

      case '_debug_openrouter':
        responsePayload = await callOpenRouter(
          'meta-llama/llama-3.1-8b-instruct:free',
          prompt
        );
        break;

      case '_debug_cerebras':
        responsePayload = await callCerebras('llama3.1-8b', prompt);
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

// --- 5. FUNGSI HELPER (PEMANGGIL AI) ---

// [BARU] Fungsi Helper SambaNova
async function callSambaNova(modelName, prompt) {
  console.log(`(Debug) Mencoba SambaNova: ${modelName}...`);
  try {
    const completion = await sambaNovaClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      top_p: 0.1,
    });

    const reply =
      completion.choices[0]?.message?.content || 'Tidak ada respons.';
    return { reply_text: reply, source: `sambanova/${modelName}` };
  } catch (error) {
    console.error(`(Debug) GAGAL di SambaNova:`, error);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}
// --- 5. FUNGSI HELPER (PEMANGGIL AI) ---

async function callGemini(modelName, prompt) {
  console.log(`(Cascade) Mencoba Gemini: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return { reply_text: result.response.text(), source: modelName };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
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
    const reply = chatCompletion.choices[0]?.message?.content || 'Maaf, error.';
    return { reply_text: reply, source: modelName };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callOpenRouter(modelName, prompt) {
  console.log(`(Cascade) Mencoba OpenRouter: ${modelName}...`);
  try {
    // Menggunakan OpenAI SDK standard
    const completion = await openRouterClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      // Extra headers untuk OpenRouter rankings (Opsional tapi bagus)
      extraHeaders: {
        'HTTP-Referer': 'https://genius-web-portfolio.com',
        'X-Title': 'Genius Web',
      },
    });
    const reply = completion.choices[0]?.message?.content || 'No response.';
    return { reply_text: reply, source: `openrouter/${modelName}` };
  } catch (error) {
    console.error('OpenRouter Error:', error);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

async function callCerebras(modelName, prompt) {
  console.log(`(Debug) Mencoba Cerebras: ${modelName}...`);
  try {
    const completion = await cerebrasClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
    });
    const reply =
      completion.choices[0]?.message?.content || 'Tidak ada respons.';
    return { reply_text: reply, source: `cerebras/${modelName}` };
  } catch (error) {
    console.error(`(Debug) GAGAL di Cerebras:`, error);
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

function isTryAgainError(error) {
  const s = error?.status;
  // Tambahkan 401/403 sementara untuk debug, tapi standarnya 429/5xx
  const isRetryable =
    s === 429 || s === 503 || s === 500 || s === 502 || s === 504;
  console.log(`(Cascade) Error status ${s}. Retry? ${isRetryable}`);
  return isRetryable;
}

// --- 6. LOGIKA CASCADE ---

async function handleChatCascade(prompt) {
  const sys = 'You are a helpful assistant.';

  try {
    return await callGemini('gemini-2.5-flash', prompt);
  } catch (e1) {
    if (!isTryAgainError(e1)) throw e1;
    console.warn('Gemini Flash sibuk. Pindah ke Groq Compound...');

    try {
      return await callGroq('groq/compound', sys, prompt);
    } catch (e2) {
      console.warn('Groq Compound sibuk. Pindah ke Groq Qwen...');
      if (!isTryAgainError(e2)) console.error('Groq Error:', e2.message);

      try {
        return await callGroq('qwen/qwen3-32b', sys, prompt);
      } catch (e3) {
        console.warn(
          'Groq Qwen sibuk. Pindah ke OpenRouter (Jaring Pengaman)...'
        );
        return await callOpenRouter('deepseek/deepseek-r1:free', prompt);
      }
    }
  }
}

async function handleCodingCascade(prompt) {
  const sys = 'You are an expert coding assistant.';

  try {
    return await callGemini('gemini-2.5-pro', prompt);
  } catch (e1) {
    if (!isTryAgainError(e1)) throw e1;
    console.warn('Gemini Pro sibuk. Pindah ke Groq GPT-OSS...');

    try {
      return await callGroq('openai/gpt-oss-20b', sys, prompt);
    } catch (e2) {
      console.warn('Groq GPT-OSS sibuk. Pindah ke Groq Qwen...');
      if (!isTryAgainError(e2)) console.error('Groq Error:', e2.message);

      try {
        return await callGroq('qwen/qwen3-32b', sys, prompt);
      } catch (e3) {
        console.warn('Groq Qwen sibuk. Pindah ke OpenRouter...');
        return await callOpenRouter('deepseek/deepseek-r1:free', prompt);
      }
    }
  }
}
