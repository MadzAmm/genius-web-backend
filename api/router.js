// // Alur logika (logic flow) di kode *backend* `api/router.js:`

// // 1.  Pengecekan Keamanan & Validasi (Satpam Depan)
// //       Apakah metode-nya `POST`? (Jika tidak, tolak).
// //       Apakah data JSON valid?
// //       Cek Wajib: Apakah ada `task` DAN `prompt`?
// //           JIKA TIDAK: Langsung Error ("Input tidak valid"). Berhenti di sini.
// //           JIKA IYA: Lanjut

// // 2.  Pengecekan Jalan Pintas / Shortcut (Jalur VIP)
// //       Sistem melihat isi `prompt`. Apakah dimulai dengan `@` (misal `@groq`)?
// //         JIKA IYA: Abaikan apapun isi `task`. Langsung panggil fungsi shortcut yang diminta (misal `callGroq`). Kirim jawaban, dan SELESAI. (Tidak lanjut ke bawah).
// //             JIKA TIDAK: Lanjut ke langkah berikutnya.

// // 3.  Pengecekan Task & Eksekusi Cascade (Jalur Reguler)
// //       Karena tidak ada shortcut, sistem melihat isi `task`.
// //         Switch Case:
// //           Jika `chat_general`: Jalankan fungsi `handleChatCascade` (Gemini -> Groq -> dll).
// //           Jika `assistent_coding`: Jalankan fungsi `handleCodingCascade` (Gemini Pro -> Groq -> dll).
// //           Jika tidak dikenal: *Error*.

// // Validasi -> Cek Shortcut -> Cek Task (Cascade)
// //
// //
// //
// // File: api/router.js
// // VERSI 22 (ALL-IN-ONE): Gemini + Groq + OpenRouter + Cerebras
// // Semua provider aktif dan siap digunakan.
// // File: api/router.js
// // VERSI 23 (FINAL STABIL):
// // - Mengganti @openrouter/sdk dengan 'openai' library (Standar Industri)
// // - Memperbaiki error 'undefined reading create'
// // - Tetap menyertakan Gemini, Groq, dan Cerebras

// // File: api/router.js
// // VERSI 24 (ALL-STAR): Gemini + Groq + OpenRouter + Cerebras + SambaNova
// // Menggunakan 'openai' SDK untuk OpenRouter DAN SambaNova (Kompatibel)
// // File: api/router.js
// // VERSI 27 (THE ULTIMATE ALL-IN-ONE):
// // Integrasi Lengkap: Gemini, Groq, OpenRouter, Cerebras, SambaNova, Cloudflare
// // Fitur: Shortcut (@), Debug Routes, dan Cascade Berlapis.

// // List provider dan model yang digunakan:
// // 1. groq 'https://console.groq.com/docs/rate-limits'
// //     a. groq/compound
// //     b. qwen/qwen3-32b
// //     c. openai/gpt-oss-120b
// // 2. Gemini 'https://ai.google.dev/gemini-api/docs/rate-limits?hl=id'
// //     a. gemini-2.5-pro
// //     b. gemini-2.5-Flash
// // 3. cerebras 'https://cloud.cerebras.ai/platform/org_p2d5xxc3ymmxmnyctfmycfwn/models'
// //     a. gpt-oss-120b
// //     b. llama-3.3-70b
// //     c. qwen-3-235b-a22b-instruct-2507
// // 4. openrouter 'https://openrouter.ai/docs/api-reference/limits'
// //     a. openrouter/sherlock-dash-alpha
// //     b. mistralai/mistral-7b-instruct:free
// //     c. deepseek/deepseek-r1-distill-llama-70b:free
// //     d. meta-llama/llama-3.3-70b-instruct:free
// //     e. qwen/qwen3-coder:free
// // 5. Sambanova 'https://docs.sambanova.ai/docs/en/models/rate-limits#free-tier'
// //     a. DeepSeek-R1
// //     b. DeepSeek-R1-Distill-Llama-70B
// //     c. Meta-Llama-3.3-70B-Instruct
// // 6. cloudflare 'https://developers.cloudflare.com/workers-ai/platform/limits/'
// //     a. @cf/openai/gpt-oss-120b
// //     b. @cf/meta/llama-3.3-70b-instruct-fp8-fast
// //     c. @cf/mistralai/mistral-small-3.1-24b-instruct
// // File: api/router.js
// // VERSI MEGA-CASCADE: Integrasi 6 Provider dengan Daftar Model Lengkap
// // Menggunakan sistem Loop Cascade untuk efisiensi penanganan banyak model.

// import { GoogleGenerativeAI } from '@google/generative-ai';
// import Groq from 'groq-sdk';
// import OpenAI from 'openai';
// import Cerebras from '@cerebras/cerebras_cloud_sdk';
// import cors from 'cors';

// // ====================================================================
// // --- 1. INISIALISASI KLIEN ---
// // ====================================================================

// // A. Google Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // B. Groq
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // C. OpenRouter (Via OpenAI SDK)
// const openRouterClient = new OpenAI({
//   baseURL: 'https://openrouter.ai/api/v1',
//   apiKey: process.env.OPENROUTER_API_KEY,
// });

// // D. Cerebras (Native SDK) dengan maxRetries: 0 (by default retry 2x tapi dimatikan karena ingin Fail Fast (Gagal Cepat) dan langsung pindah.)
// const cerebrasClient = new Cerebras({
//   apiKey: process.env.CEREBRAS_API_KEY,
//   maxRetries: 0,
// });

// // E. SambaNova (Via OpenAI SDK)
// const sambaNovaClient = new OpenAI({
//   baseURL: 'https://api.sambanova.ai/v1',
//   apiKey: process.env.SAMBANOVA_API_KEY,
// });

// // F. Cloudflare Workers AI (Via OpenAI SDK)
// const cloudflareClient = new OpenAI({
//   baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
//   apiKey: process.env.CLOUDFLARE_API_TOKEN,
// });

// // ====================================================================
// // --- 2. KONFIGURASI CORS ---
// // ====================================================================
// const allowedOrigins = [
//   'https://MadzAmm.github.io',
//   'https://madzamm.github.io',
//   'http://localhost:5173',
// ];

// const corsHandler = cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       console.error(`CORS DITOLAK: Origin ${origin} tidak diizinkan.`);
//       callback(new Error('Domain ini tidak diizinkan oleh CORS'));
//     }
//   },
// });

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
// // ====================================================================
// export default async function handler(req, res) {
//   await runMiddleware(req, res, corsHandler);

//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Method Not Allowed' });
//     return;
//   }

//   // Body Parser Safety
//   let task, prompt;
//   try {
//     if (typeof req.body === 'string') {
//       req.body = JSON.parse(req.body);
//     }
//     task = req.body.task;
//     prompt = req.body.prompt;
//     if (!task || !prompt) throw new Error('Input tidak valid.');
//   } catch (error) {
//     res.status(400).json({ error: 'Invalid JSON', details: error.message });
//     return;
//   }

//   try {
//     // Cek Shortcut terlebih dahulu
//     const shortcutResult = await handleShortcut(prompt);
//     if (shortcutResult) {
//       return res.status(200).json(shortcutResult);
//     }

//     let responsePayload;

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

// // ====================================================================
// // --- 4. SISTEM CASCADE (ENGINE BARU) ---
// // ====================================================================

// // Helper untuk menjalankan daftar model secara berurutan (Looping)
// async function runCascadeStrategy(
//   strategyName,
//   steps,
//   prompt,
//   systemInstruction
// ) {
//   let lastError = null;

//   console.log(
//     `=== Memulai Cascade: ${strategyName} (${steps.length} langkah) ===`
//   );

//   for (const step of steps) {
//     try {
//       // Jalankan fungsi pemanggil model
//       return await step.fn(step.model, prompt, systemInstruction);
//     } catch (error) {
//       lastError = error;
//       // Cek apakah error "bisa dimaklumi" (Rate Limit / Server Error)
//       if (isTryAgainError(error)) {
//         console.warn(
//           `[${strategyName}] Gagal di ${step.provider}/${step.model}. Pindah ke berikutnya...`
//         );
//         continue; // Lanjut ke model berikutnya di list
//       } else {
//         // Jika error fatal (misal API Key salah), berhenti dan lempar error
//         console.error(
//           `[${strategyName}] Error Fatal di ${step.provider}/${step.model}:`,
//           error.message
//         );
//         throw error;
//       }
//     }
//   }

//   // Jika semua gagal
//   console.error(`[${strategyName}] Semua model gagal.`);
//   throw new Error(
//     `Semua model di cascade ${strategyName} gagal. Terakhir: ${lastError?.message}`
//   );
// }

// /**
//  * CASCADE CHAT GENERAL
//  * Urutan: Gemini Flash -> Groq Qwen -> Cerebras Llama -> SambaNova Llama -> Cloudflare Llama -> ... sisanya
//  */
// async function handleChatCascade(prompt) {
//   const sys = 'You are a helpful assistant.';

//   // DAFTAR URUTAN PRIORITAS (Sesuai List Anda)
//   const steps = [
//     // 1. Gemini (Cepat & Stabil)
//     { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },

//     // 2. Groq (Super Cepat)
//     { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq }, // ID dari user
//     { provider: 'Groq', model: 'groq/compound', fn: callGroq },

//     // 3. Cerebras (Super Cepat)
//     { provider: 'Cerebras', model: 'llama-3.3-70b', fn: callCerebras },

//     // 4. SambaNova (Cepat)
//     {
//       provider: 'SambaNova',
//       model: 'Meta-Llama-3.3-70B-Instruct',
//       fn: callSambaNova,
//     },

//     // 5. Cloudflare
//     {
//       provider: 'Cloudflare',
//       model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
//       fn: callCloudflare,
//     },

//     // 6. OpenRouter (Free Tier)
//     {
//       provider: 'OpenRouter',
//       model: 'meta-llama/llama-3.3-70b-instruct:free',
//       fn: callOpenRouter,
//     },

//     // --- JARING PENGAMAN LAPIS KEDUA ---

//     // 7. Gemini Pro (Kualitas Tinggi)
//     { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },

//     // 8. Groq (Backup)
//     { provider: 'Groq', model: 'openai/gpt-oss-120b', fn: callGroq },

//     // 9. Cerebras (Backup)
//     { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },

//     // 10. OpenRouter (Backup)
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-r1-distill-llama-70b:free',
//       fn: callOpenRouter,
//     },

//     // 11. Cloudflare (Backup)
//     {
//       provider: 'Cloudflare',
//       model: '@cf/mistralai/mistral-small-3.1-24b-instruct',
//       fn: callCloudflare,
//     },
//     {
//       provider: 'Cloudflare',
//       model: '@cf/openai/gpt-oss-120b',
//       fn: callCloudflare,
//     },

//     // 12. OpenRouter (Terakhir - Experimental)
//     {
//       provider: 'OpenRouter',
//       model: 'openrouter/sherlock-dash-alpha',
//       fn: callOpenRouter,
//     },

//     {
//       provider: 'OpenRouter',
//       model: 'mistralai/mistral-7b-instruct:free',
//       fn: callOpenRouter,
//     },
//   ];

//   return await runCascadeStrategy('Chat General', steps, prompt, sys);
// }

// /**
//  * CASCADE CODING
//  * Fokus: Kemampuan Koding & Reasoning
//  */
// async function handleCodingCascade(prompt) {
//   const sys = 'You are an expert coding assistant.';

//   const steps = [
//     // 1. Gemini Pro (Otak Terbaik)
//     { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },

//     // 2. SambaNova (DeepSeek R1 - Reasoning Kuat)
//     { provider: 'SambaNova', model: 'DeepSeek-R1', fn: callSambaNova },
//     {
//       provider: 'SambaNova',
//       model: 'DeepSeek-R1-Distill-Llama-70B',
//       fn: callSambaNova,
//     },

//     // 3. OpenRouter (Qwen Coder - Spesialis Koding)
//     {
//       provider: 'OpenRouter',
//       model: 'qwen/qwen3-coder:free',
//       fn: callOpenRouter,
//     },

//     // 4. Cerebras (Model Besar)
//     {
//       provider: 'Cerebras',
//       model: 'qwen-3-235b-a22b-instruct-2507',
//       fn: callCerebras,
//     },
//     { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },

//     // 5. Groq
//     { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },

//     // 6. Cloudflare
//     {
//       provider: 'Cloudflare',
//       model: '@cf/openai/gpt-oss-120b',
//       fn: callCloudflare,
//     },

//     // 7. OpenRouter DeepSeek (Backup)
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-r1-distill-llama-70b:free',
//       fn: callOpenRouter,
//     },

//     // 8. Gemini Flash (Jaring Pengaman Terakhir)
//     { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
//   ];

//   return await runCascadeStrategy('Coding Assistant', steps, prompt, sys);
// }

// // ====================================================================
// // --- 5. LOGIKA SHORTCUT (JALAN PINTAS) ---
// // ====================================================================
// async function handleShortcut(fullPrompt) {
//   // Format: @provider-model_singkat
//   const shortcuts = {
//     // Groq
//     '@groq-compound': (p) => callGroq('groq/compound', 'Helpful', p),
//     '@groq-qwen': (p) => callGroq('qwen/qwen3-32b', 'Helpful', p),
//     '@groq-gpt': (p) => callGroq('openai/gpt-oss-120b', 'Helpful', p),

//     // Gemini
//     '@gemini-pro': (p) => callGemini('gemini-2.5-pro', p),
//     '@gemini-flash': (p) => callGemini('gemini-2.5-flash', p),

//     // Cerebras
//     '@cerebras-gpt': (p) => callCerebras('gpt-oss-120b', p),
//     '@cerebras-llama': (p) => callCerebras('llama-3.3-70b', p),
//     '@cerebras-qwen': (p) => callCerebras('qwen-3-235b-a22b-instruct-2507', p),

//     // OpenRouter
//     '@router-sherlock': (p) =>
//       callOpenRouter('openrouter/sherlock-dash-alpha', p),
//     '@router-mistral': (p) =>
//       callOpenRouter('mistralai/mistral-7b-instruct:free', p), //inggris
//     '@router-deepseek': (p) =>
//       callOpenRouter('deepseek/deepseek-r1-distill-llama-70b:free', p),
//     '@router-llama': (p) =>
//       callOpenRouter('meta-llama/llama-3.3-70b-instruct:free', p),
//     '@router-coder': (p) => callOpenRouter('qwen/qwen3-coder:free', p),

//     // SambaNova
//     '@nova-r1': (p) => callSambaNova('DeepSeek-R1', p),
//     '@nova-deepseek': (p) => callSambaNova('DeepSeek-R1-Distill-Llama-70B', p),
//     '@nova-llama': (p) => callSambaNova('Meta-Llama-3.3-70B-Instruct', p),

//     // Cloudflare
//     '@cf-gpt': (p) => callCloudflare('@cf/openai/gpt-oss-120b', p),
//     '@cf-llama': (p) =>
//       callCloudflare('@cf/meta/llama-3.3-70b-instruct-fp8-fast', p),
//     '@cf-mistral': (p) =>
//       callCloudflare('@cf/mistralai/mistral-small-3.1-24b-instruct', p),
//   };

//   for (const [prefix, handler] of Object.entries(shortcuts)) {
//     if (fullPrompt.trim().toLowerCase().startsWith(prefix)) {
//       const cleanPrompt = fullPrompt.slice(prefix.length).trim();
//       console.log(`(Shortcut) Terdeteksi ${prefix}. Bypass cascade...`);
//       return await handler(cleanPrompt);
//     }
//   }
//   return null;
// }

// // ====================================================================
// // --- 6. FUNGSI HELPER (PEMANGGIL API) ---
// // ====================================================================

// function isTryAgainError(error) {
//   const s = error?.status;
//   const isRetryable =
//     !s || // Connection Error biasanya tidak punya status code
//     s === 401 || // Authentication Error (Kunci Salah)
//     s === 402 || // Payment Required (Saldo Habis - Cerebras/OpenRouter)
//     s === 403 || // Permission Denied
//     s === 404 || // Not Found (Model tidak ada/salah nama)
//     s === 408 || // Request Timeout
//     s === 410 || // Gone (Model Deprecated/Removed - KHUSUS SAMBANOVA)
//     s === 429 || // Rate Limit (Umum)
//     s === 498 || // Groq Flex Limit
//     s >= 500 || // Menangkap 500, 502, 503, 504, dll
//     s === 409; // Conflict (Cerebras menyarankan retry untuk ini);
//   // Log error untuk debugging di Vercel Logs
//   // 400 (Bad Request): Sengaja TIDAK memasukkan 400. Jika request salah format (misal JSON rusak), pindah ke provider lain pun kemungkinan besar akan tetap gagal. Jadi lebih baik error dan berhenti agar kita sadar ada bug di kode.
//   if (isRetryable)
//     console.warn(
//       `(Error Check) Status ${
//         s || 'Network/Connection'
//       } terdeteksi. Mencoba provider berikutnya...`
//     ); //bisa juga console.log(...)
//   return isRetryable;
// }

// async function callGemini(modelName, prompt) {
//   console.log(`(Call) Mencoba Gemini: ${modelName}...`);
//   try {
//     const model = genAI.getGenerativeModel({ model: modelName });
//     const result = await model.generateContent(prompt);
//     return {
//       reply_text: result.response.text(),
//       source: `Google (${modelName})`,
//     };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || error.cause?.status || 500;
//     throw enhancedError;
//   }
// }

// async function callGroq(modelName, systemPrompt, userPrompt) {
//   console.log(`(Call) Mencoba Groq: ${modelName}...`);
//   try {
//     const chatCompletion = await groq.chat.completions.create({
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userPrompt },
//       ],
//       model: modelName,
//     });
//     const reply = chatCompletion.choices[0]?.message?.content || 'Maaf, error.';
//     return { reply_text: reply, source: `Groq (${modelName})` };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// async function callSambaNova(modelName, prompt) {
//   console.log(`(Call) Mencoba SambaNova: ${modelName}...`);
//   try {
//     const completion = await sambaNovaClient.chat.completions.create({
//       model: modelName,
//       messages: [
//         { role: 'system', content: 'You are a helpful assistant.' },
//         { role: 'user', content: prompt },
//       ],
//       temperature: 0.6,
//       top_p: 0.9,
//     });
//     const reply = completion.choices[0]?.message?.content || 'No response.';
//     return { reply_text: reply, source: `SambaNova (${modelName})` };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// async function callCerebras(modelName, prompt) {
//   console.log(`(Call) Mencoba Cerebras: ${modelName}...`);
//   try {
//     const completion = await cerebrasClient.chat.completions.create({
//       messages: [{ role: 'user', content: prompt }],
//       model: modelName,
//     });
//     const reply = completion.choices[0]?.message?.content || 'No response.';
//     return { reply_text: reply, source: `Cerebras (${modelName})` };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// async function callOpenRouter(modelName, prompt) {
//   console.log(`(Call) Mencoba OpenRouter: ${modelName}...`);
//   try {
//     const completion = await openRouterClient.chat.completions.create({
//       model: modelName,
//       messages: [{ role: 'user', content: prompt }],
//       extraHeaders: {
//         'HTTP-Referer': 'https://genius-web-portfolio.com',
//         'X-Title': 'Genius Web',
//       },
//     });
//     const reply = completion.choices[0]?.message?.content || 'No response.';
//     return { reply_text: reply, source: `OpenRouter (${modelName})` };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// async function callCloudflare(modelName, prompt) {
//   console.log(`(Call) Mencoba Cloudflare: ${modelName}...`);
//   try {
//     const completion = await cloudflareClient.chat.completions.create({
//       model: modelName,
//       messages: [{ role: 'user', content: prompt }],
//     });
//     const reply = completion.choices[0]?.message?.content || 'No response.';
//     return { reply_text: reply, source: `Cloudflare (${modelName})` };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

//
//
//
//
// //
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import Groq from 'groq-sdk';
// import OpenAI from 'openai';
// import Cerebras from '@cerebras/cerebras_cloud_sdk';
// import cors from 'cors';

// // ====================================================================
// // --- 1. INISIALISASI KLIEN (TIDAK BERUBAH) ---
// // ====================================================================

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const openRouterClient = new OpenAI({
//   baseURL: 'https://openrouter.ai/api/v1',
//   apiKey: process.env.OPENROUTER_API_KEY,
// });
// const cerebrasClient = new Cerebras({
//   apiKey: process.env.CEREBRAS_API_KEY,
//   maxRetries: 0,
// });
// const sambaNovaClient = new OpenAI({
//   baseURL: 'https://api.sambanova.ai/v1',
//   apiKey: process.env.SAMBANOVA_API_KEY,
// });
// const cloudflareClient = new OpenAI({
//   baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
//   apiKey: process.env.CLOUDFLARE_API_TOKEN,
// });

// // ====================================================================
// // --- 2. KONFIGURASI CORS & PERSONA (MODIFIKASI SEDIKIT) ---
// // ====================================================================
// const allowedOrigins = [
//   'https://MadzAmm.github.io',
//   'https://madzamm.github.io',
//   'http://localhost:5173',
// ];

// const corsHandler = cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       console.error(`CORS DITOLAK: Origin ${origin} tidak diizinkan.`);
//       callback(new Error('Domain ini tidak diizinkan oleh CORS'));
//     }
//   },
// });

// const runMiddleware = (req, res, fn) => {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) return reject(result);
//       return resolve(result);
//     });
//   });
// };

// // Persona Default (Agar konsisten saat berganti model)
// const DEFAULT_SYSTEM_INSTRUCTION = `
// [IDENTITAS UTAMA KAMU (AI)]
// Nama: Madzam
// Peran: Asisten Virtual Cerdasnya kak Muhammad.
// Tugas Utama: Menjawab pertanyaan pengunjung website.
// Tugas lain: mengenalkan sedikit da jangan berlebihan mengenai keahlian, pengalaman, dan proyek Muhammad.

// [DEFINISI ENTITAS (PENTING!)]
// 1. KAMU (AI) = Madzam. Kamu adalah asisten/wakil, BUKAN Muhammad.
// 2. USER (Lawan Bicara) = Pengunjung website, Recruiter, atau Klien potensial. USER INI BUKAN MUHAMMAD. Jangan pernah menganggap user adalah Muhammad. Jangan pernah memanggil user "user", kalau perlu tanyakan nama dan gendernya agar bisa menentukan panggilan mas atau mba (disusul dengan namanya jika ada) kalau tidak maka panggil saja kak atau kamu.
// 3. MUHAMMAD (Subjek/Owner) = Pemilik portofolio ini. Rujuk dia sebagai orang ketiga ("Mas Muhammad", "Beliau", "dia", "Creator saya", atau "Bos saya", dan sejenisnya).

// [ATURAN GAYA BICARA KAMU (AI)]
// 1. Tone: Profesional namun Ramah, Membantu, Teknis (jika ditanya soal kode), dan Sedikit Humoris/Witty untuk mencairkan suasana.
// 2. Bahasa: Gunakan Bahasa Indonesia yang luwes, tidak kaku seperti robot, tapi tetap sopan.
// 3. Posisi: Bicaralah seolah-olah kamu sedang mempromosikan Muhammad kepada user.
//    - SALAH: "Saya lulusan UIN..." (Ini mengaku sebagai Muhammad).
//    - BENAR: "Mas Muhammad itu lulusan UIN..." (Ini asisten yang menjelaskan).
// 4. Larangan: Jangan mengaku sebagai ChatGPT, Gemini, atau model AI generik. Kamu adalah Madzam.
// 5. Jika di SUMMARY / [CONTEXT SUMMARY] sudah ada sapaan maka tidak perlu menyapa lagi, lanjutkan percakapan sesuai konteks.
// `;

// // ====================================================================
// // --- 3. HELPER FUNCTIONS BARU (UNTUK MEMORY & SUMMARY) ---
// // ====================================================================

// // A. Normalisasi Format untuk Gemini (History Support)
// function normalizeForGemini(messages) {
//   return messages
//     .map((msg) => {
//       let role = '';
//       if (msg.role === 'user') role = 'user';
//       else if (msg.role === 'assistant') role = 'model';
//       else return null;
//       return { role: role, parts: [{ text: msg.content }] };
//     })
//     .filter(Boolean);
// }

// // B. Cek Bobot Chat (Untuk Trigger Summary)
// function isHeavyContext(messages) {
//   // Trigger jika karakter > 3500 (Agar aman dari limit token gratisan)
//   const totalChars = messages.reduce(
//     (acc, m) => acc + (m.content?.length || 0),
//     0
//   );
//   return totalChars > 3500;
// }

// // C. Cek Error Retry
// function isTryAgainError(error) {
//   const s = error?.status;
//   const isRetryable =
//     !s || // Connection Error biasanya tidak punya status code
//     s === 401 || // Authentication Error (Kunci Salah)
//     s === 402 || // Payment Required (Saldo Habis - Cerebras/OpenRouter)
//     s === 403 || // Permission Denied
//     s === 404 || // Not Found (Model tidak ada/salah nama)
//     s === 408 || // Request Timeout
//     s === 410 || // Gone (Model Deprecated/Removed - KHUSUS SAMBANOVA)
//     s === 413 || //Request Entity Too Large (Muatan atau prompt Terlalu Besar)
//     s === 429 || // Rate Limit (Umum)
//     s === 498 || // Groq Flex Limit
//     s >= 500 || // Menangkap 500, 502, 503, 504, dll
//     s === 502 ||
//     s === 503 ||
//     s === 504 ||
//     s === 409; // Conflict (Cerebras menyarankan retry untuk ini)
//   //   // Log error untuk debugging di Vercel Logs
//   //   // 400 (Bad Request): Sengaja TIDAK memasukkan 400. Jika request salah format (misal JSON rusak), pindah ke provider lain pun kemungkinan besar akan tetap gagal. Jadi lebih baik error dan berhenti agar kita sadar ada bug di kode.
//   if (isRetryable)
//     console.warn(
//       `(Error Check) Status ${
//         s || 'Network/Connection'
//       } terdeteksi. Mencoba provider berikutnya...`
//     ); //bisa juga console.log(...)
//   return isRetryable;
// }

// // ====================================================================
// // --- 4. FUNGSI PEMANGGIL API (DIMODIFIKASI UNTUK TERIMA HISTORY) ---
// // ====================================================================
// // Catatan: Nama fungsi TETAP, tapi parameternya sekarang menerima (messages, systemPrompt)

// async function callGemini(modelName, messages, systemPrompt) {
//   console.log(`(Call) Mencoba Gemini: ${modelName}...`);
//   try {
//     const model = genAI.getGenerativeModel({
//       model: modelName,
//       systemInstruction: systemPrompt, // System prompt disuntikkan di sini
//     });

//     // Pisahkan pesan terakhir (prompt) dengan history sebelumnya
//     const geminiHistory = normalizeForGemini(messages.slice(0, -1));
//     const lastMessage = messages[messages.length - 1].content;

//     const chat = model.startChat({ history: geminiHistory });
//     const result = await chat.sendMessage(lastMessage);

//     return {
//       reply_text: result.response.text(),
//       source: `Google (${modelName})`,
//     };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || error.cause?.status || 500;
//     throw enhancedError;
//   }
// }

// // Untuk provider berbasis OpenAI (Groq, Cerebras, dll), kita buat format standar
// // karena logic-nya sama: gabung system prompt + messages array.
// async function callOpenAIStyle(
//   client,
//   providerName,
//   modelName,
//   messages,
//   systemPrompt
// ) {
//   console.log(`(Call) Mencoba ${providerName}: ${modelName}...`);
//   try {
//     const finalMessages = [
//       { role: 'system', content: systemPrompt },
//       ...messages,
//     ];
//     const completion = await client.chat.completions.create({
//       messages: finalMessages,
//       model: modelName,
//       // Tambahan header khusus OpenRouter jika providernya OpenRouter
//       ...(providerName === 'OpenRouter' && {
//         extraHeaders: {
//           'HTTP-Referer': 'https://genius-web-portfolio.com',
//           'X-Title': 'Genius Web',
//         },
//       }),
//     });
//     return {
//       reply_text: completion.choices[0]?.message?.content || 'No response.',
//       source: `${providerName} (${modelName})`,
//     };
//   } catch (error) {
//     const enhancedError = new Error(error.message);
//     enhancedError.status = error.status || 500;
//     throw enhancedError;
//   }
// }

// // Wrapper agar sesuai dengan 'fn' di list cascade Anda
// const callGroq = (m, msgs, sys) => callOpenAIStyle(groq, 'Groq', m, msgs, sys);
// const callSambaNova = (m, msgs, sys) =>
//   callOpenAIStyle(sambaNovaClient, 'SambaNova', m, msgs, sys);
// const callCerebras = (m, msgs, sys) =>
//   callOpenAIStyle(cerebrasClient, 'Cerebras', m, msgs, sys);
// const callOpenRouter = (m, msgs, sys) =>
//   callOpenAIStyle(openRouterClient, 'OpenRouter', m, msgs, sys);
// const callCloudflare = (m, msgs, sys) =>
//   callOpenAIStyle(cloudflareClient, 'Cloudflare', m, msgs, sys);

// // ====================================================================
// // --- 5. ENGINE: CASCADE & SUMMARIZER (FITUR BARU) ---
// // ====================================================================

// async function runCascadeStrategy(
//   strategyName,
//   steps,
//   messages,
//   systemInstruction
// ) {
//   let lastError = null;
//   console.log(
//     `=== Memulai Cascade: ${strategyName} (${steps.length} langkah) ===`
//   );

//   for (const step of steps) {
//     try {
//       // Parameter baru: messages & systemInstruction
//       return await step.fn(step.model, messages, systemInstruction);
//     } catch (error) {
//       lastError = error;
//       if (isTryAgainError(error)) {
//         console.warn(
//           `[${strategyName}] Gagal di ${step.provider}/${step.model}. Pindah ke berikutnya...`
//         );
//         continue;
//       } else {
//         console.error(`[${strategyName}] Error Fatal:`, error.message);
//         throw error;
//       }
//     }
//   }
//   console.error(`[${strategyName}] Semua model gagal.`);
//   throw new Error(
//     `Semua model di cascade ${strategyName} gagal. Terakhir: ${lastError?.message}`
//   );
// }

// // FUNGSI BARU: Get Summary dengan Cascade Sendiri
// async function getSummaryFromAI(oldMessages) {
//   // 1. DEBUG: Intip dulu apa isinya
//   console.log('--- [DEBUG SUMMARY] Start ---');
//   console.log(`Jumlah pesan yang akan diringkas: ${oldMessages.length}`);
//   ///=====
//   // const chatText = oldMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
//   //============================
//   const chatText = oldMessages
//     .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
//     .join('\n');
//   // 2. DEBUG: Cek apakah teks-nya kosong/pendek?
//   console.log(
//     'Sample Teks (50 char pertama):',
//     chatText.substring(0, 50) + '...'
//   );

//   if (chatText.length < 50) {
//     console.log('Teks terlalu pendek untuk diringkas. Skip.');
//     return 'Percakapan awal (sedikit data).';
//   }
//   // 3. PROMPT LEBIH GALAK (STRICT)
//   // Kita gunakan Bhs Inggris untuk instruksi logic karena AI biasanya lebih patuh.
//   const summarySystem =
//     'You are a technical summarizer agent. DO NOT chat. DO NOT answer the user. ONLY output a summary.';

//   const summaryUserMsg = `
//     TASK: Summarize the following conversation history into ONE concise paragraph.

//     RULES:
//     1. Focus on technical details (libraries, errors, code logic).
//     2. Ignore casual greetings ("Hi", "Hello").
//     3. Do NOT respond to the user. Just describe what happened.
//     4. Output must be in INDONESIAN (Bahasa Indonesia).

//     --- CONVERSATION START ---
//     ${chatText}
//     --- CONVERSATION END ---

//     SUMMARY (Bahasa Indonesia):
//   `;
//   //======================================================
//   // const prompt = `
//   //     Buatlah RINGKASAN PADAT (maksimal 1 paragraf) dari percakapan teknis ini.
//   //     PENTING: Pertahankan detail library, error, kode, dan tujuan user.

//   //     [Percakapan]:
//   //     ${chatText}

//   //     [Output Ringkasan]:
//   //   `;
//   // const msgs = [{ role: 'user', content: prompt }];
//   // const sys = 'Kamu adalah asisten perangkum.';
//   const msgs = [{ role: 'user', content: summaryUserMsg }];
//   // LIST CASCADE UNTUK SUMMARY (Menggunakan Model Cepat dari list Anda)
//   const summarizerSteps = [
//     // Menggunakan model yang Anda percaya cepat dan mampu
//     {
//       provider: 'Gemini',
//       model: 'gemini-2.0-flash',
//       fn: callGemini,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'google/gemini-2.0-flash-exp:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'tngtech/deepseek-r1t2-chimera:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'openrouter/sherlock-dash-alpha',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'Cloudflare',
//       model: '@cf/google/gemma-3-12b-it',
//       fn: callCloudflare,
//     },

//     {
//       provider: 'OpenRouter',
//       model: 'meta-llama/llama-3.3-70b-instruct:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'openrouter/sherlock-think-alpha',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-chat-v3-0324:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'nousresearch/hermes-3-llama-3.1-405b:free',
//       fn: callOpenRouter,
//     },
//   ];
//   //=============================
//   try {
//     console.log('--- Mengirim ke AI Summarizer... ---');
//     const result = await runCascadeStrategy(
//       'Summarizer Agent',
//       summarizerSteps,
//       msgs,
//       summarySystem
//     );

//     console.log('--- [DEBUG SUMMARY] Result: ---');
//     console.log(result.reply_text.substring(0, 100) + '...'); // Intip hasil
//     return result.reply_text;
//   } catch (e) {
//     console.error('GAGAL MERANGKUM:', e.message);
//     return 'Ringkasan gagal dibuat.';
//   }
//   //================================
//   // try {
//   //   console.log('--- Menjalankan Auto-Summary ---');
//   //   const res = await runCascadeStrategy(
//   //     'Summarizer',
//   //     summarizerSteps,
//   //     msgs,
//   //     sys
//   //   );
//   //   return res.reply_text;
//   // } catch (e) {
//   //   console.error('Gagal Summary:', e.message);
//   //   return 'Ringkasan tidak tersedia.';
//   // }
// }

// // ====================================================================
// // --- 6. CASCADE LISTS (SESUAI LIST ANDA - TIDAK DIUBAH) ---
// // ====================================================================

// async function handleChatCascade(messages, systemInstruction) {
//   // DAFTAR URUTAN PRIORITAS (Persis seperti kode asli Anda)
//   const steps = [
//     { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
//     { provider: 'Groq', model: 'groq/compound', fn: callGroq },
//     { provider: 'Cerebras', model: 'llama-3.3-70b', fn: callCerebras },
//     {
//       provider: 'OpenRouter',
//       model: 'meta-llama/llama-3.3-70b-instruct:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'SambaNova',
//       model: 'Meta-Llama-3.3-70B-Instruct',
//       fn: callSambaNova,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'openrouter/sherlock-dash-alpha',
//       fn: callOpenRouter,
//     },
//     { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },
//     {
//       provider: 'OpenRouter',
//       model: 'tngtech/deepseek-r1t-chimera:free',
//       fn: callOpenRouter,
//     },

//     {
//       provider: 'Cloudflare',
//       model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
//       fn: callCloudflare,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'microsoft/mai-ds-r1:free',
//       fn: callOpenRouter,
//     },

//     // Jaring Pengaman
//     // { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },
//     { provider: 'Groq', model: 'openai/gpt-oss-120b', fn: callGroq },
//     {
//       provider: 'OpenRouter',
//       model: 'tngtech/deepseek-r1t2-chimera:free',
//       fn: callOpenRouter,
//     },
//     { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-r1-distill-llama-70b:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'Cloudflare',
//       model: '@cf/mistralai/mistral-small-3.1-24b-instruct',
//       fn: callCloudflare,
//     },
//     {
//       provider: 'Cloudflare',
//       model: '@cf/openai/gpt-oss-120b',
//       fn: callCloudflare,
//     },

//     {
//       provider: 'OpenRouter',
//       model: 'mistralai/mistral-7b-instruct:free',
//       fn: callOpenRouter,
//     },
//   ];
//   return await runCascadeStrategy(
//     'Chat General',
//     steps,
//     messages,
//     systemInstruction
//   );
// }

// async function handleCodingCascade(messages, systemInstruction) {
//   // DAFTAR URUTAN CODING (Persis seperti kode asli Anda)
//   const steps = [
//     { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },
//     { provider: 'SambaNova', model: 'DeepSeek-R1', fn: callSambaNova },
//     {
//       provider: 'OpenRouter',
//       model: 'microsoft/mai-ds-r1:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'SambaNova',
//       model: 'DeepSeek-R1-Distill-Llama-70B',
//       fn: callSambaNova,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'qwen/qwen3-coder:free',
//       fn: callOpenRouter,
//     },
//     {
//       provider: 'Cerebras',
//       model: 'qwen-3-235b-a22b-instruct-2507',
//       fn: callCerebras,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-r1:free',
//       fn: callOpenRouter,
//     },

//     { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },
//     { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },
//     {
//       provider: 'Cloudflare',
//       model: '@cf/openai/gpt-oss-120b',
//       fn: callCloudflare,
//     },
//     {
//       provider: 'OpenRouter',
//       model: 'deepseek/deepseek-r1-distill-llama-70b:free',
//       fn: callOpenRouter,
//     },
//     { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
//   ];
//   return await runCascadeStrategy(
//     'Coding Assistant',
//     steps,
//     messages,
//     systemInstruction
//   );
// }

// // ====================================================================
// // --- 7. SMART ROUTER UTAMA (HANDLER) ---
// // ====================================================================
// export default async function handler(req, res) {
//   await runMiddleware(req, res, corsHandler);

//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Method Not Allowed' });
//     return;
//   }

//   // A. Parsing Body (Support Prompt String LAMA & Messages Array BARU)
//   let task, messages;
//   try {
//     if (typeof req.body === 'string') req.body = JSON.parse(req.body);
//     task = req.body.task;

//     if (req.body.messages && Array.isArray(req.body.messages)) {
//       messages = req.body.messages;
//     } else if (req.body.prompt) {
//       messages = [{ role: 'user', content: req.body.prompt }];
//     } else {
//       throw new Error('Input tidak valid. Butuh "messages" atau "prompt".');
//     }
//   } catch (error) {
//     res.status(400).json({ error: 'Invalid JSON', details: error.message });
//     return;
//   }

//   try {
//     // B. Ekstraksi System Prompt & History
//     // Jika frontend mengirim system prompt, kita pakai. Jika tidak, pakai default.
//     const systemMsgObj = messages.find((m) => m.role === 'system');
//     let systemInstruction = systemMsgObj
//       ? systemMsgObj.content
//       : DEFAULT_SYSTEM_INSTRUCTION;

//     // Filter history bersih (tanpa system message)
//     let chatHistory = messages.filter((m) => m.role !== 'system');

//     // C. Cek Shortcut (Bypass Cascade)
//     const lastUserMessage = chatHistory[chatHistory.length - 1]?.content || '';
//     const shortcutResult = await handleShortcut(
//       lastUserMessage,
//       chatHistory,
//       systemInstruction
//     );
//     if (shortcutResult) return res.status(200).json(shortcutResult);

//     // ============================================================
//     // D. LOGIKA HYBRID MEMORY & SUMMARY (Inject Disini)
//     // ============================================================
//     const KEEP_RAW_COUNT = 4; // 4 pesan terakhir dibiarkan mentah (kode terbaru)
//     let debugSummary = null; //DEBUG OTAK ===========================================1

//     if (isHeavyContext(chatHistory) && chatHistory.length > KEEP_RAW_COUNT) {
//       // 1. Pisahkan: Pesan Lama vs Pesan Baru
//       const messagesToSummarize = chatHistory.slice(0, -KEEP_RAW_COUNT);
//       const recentMessages = chatHistory.slice(-KEEP_RAW_COUNT);

//       // 2. Panggil Petugas Summary (Menggunakan fungsi getSummaryFromAI yg punya cascade)
//       const summary = await getSummaryFromAI(messagesToSummarize);
//       debugSummary = summary; //DEBUG OTAK ========================================2
//       // 3. Masukkan Summary ke System Prompt
//       systemInstruction += `\n\n[CONTEXT SUMMARY]:\n${summary}\n(Gunakan informasi ini sebagai ingatan dan konteks percakapan sebelumnya).`;

//       // 4. History yang dikirim ke AI utama tinggal yang pendek
//       chatHistory = recentMessages;
//     } else {
//       // Jika belum berat, Sliding Window biasa (Max 10 pesan)
//       if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
//     }

//     // E. Eksekusi ke Model Utama
//     let responsePayload;
//     if (task === 'info_portofolio') {
//       // Inject CV Context jika task portofolio
//       systemInstruction += `\n[KONTEKS TAMBAHAN]:
//       [IDENTITAS UTAMA KAMU (AI)]
//       Nama: Madzam
//       Peran: Asisten Virtual Cerdas Muhammad.
//       Tugas: Menjawab pertanyaan pengunjung website mengenai keahlian, pengalaman, proyek Muhammad.

//       [LATAR BELAKANG MUHAMMAD]
//       - Pendidikan: Lulusan Aqidah Filsafat Islam (UIN Syarif Hidayatullah).
//       - Keahlian Teknis: Web Development, Data Analyst, dan Data Science (bisa sebutkan tools dan software yang biasa dikuasai).
//       - Keunikan: Kombinasi unik antara pemikiran filosofis dan logika coding yang kuat.
//       - Soft-skill: Fast learner, Tech-Savy, Meticulous, Caffeine Addict (jelaskan bila perlu).`;
//       responsePayload = await handleChatCascade(chatHistory, systemInstruction);
//     } else if (task === 'assistent_coding') {
//       // Coding Assistant punya prompt spesial
//       if (!systemInstruction.includes('expert coding'))
//         systemInstruction =
//           'You are an expert coding assistant. ' + systemInstruction;
//       responsePayload = await handleCodingCascade(
//         chatHistory,
//         systemInstruction
//       );
//     } else {
//       // Chat General
//       responsePayload = await handleChatCascade(chatHistory, systemInstruction);
//     }
//     //DEBUG OTAK============3
//     res.status(200).json({
//       ...responsePayload, // Isinya: reply_text, source
//       // Sisipkan Laporan Debug:
//       used_summary: debugSummary, // Akan null jika tidak di-summary, berisi teks jika di-summary
//       is_context_heavy: !!debugSummary, // True jika summary aktif
//     });
//   } catch (error) {
//     console.error('Error di Smart Router:', error.message);
//     res.status(500).json({
//       error: 'Semua model AI sedang sibuk atau gagal.',
//       details: error.message,
//     });
//     //================
//     //   res.status(200).json(responsePayload);
//     // } catch (error) {
//     //   console.error('Error di Smart Router:', error.message);
//     //   res.status(500).json({
//     //     error: 'Semua model AI sedang sibuk atau gagal.',
//     //     details: error.message,
//     //   });
//   }
// }

// // ====================================================================
// // --- 8. LOGIKA SHORTCUT (SESUAI LIST ANDA) ---
// // ====================================================================
// async function handleShortcut(fullPrompt, history, systemInstruction) {
//   // Kita bungkus handler lama agar kompatibel dengan format call baru (messages array)
//   const wrap = async (fn, model, cleanHistory) => {
//     return await fn(model, cleanHistory, systemInstruction);
//   };

//   const shortcuts = {
//     '@router-gemini': (p) =>
//       wrap(callOpenRouter, 'google/gemini-2.0-flash-exp:free', p),
//     '@groq-llama': (p) => wrap(callGroq, 'llama-3.1-8b-instant', p),
//     '@router-llama3': (p) =>
//       wrap(callOpenRouter, 'meta-llama/llama-3.2-3b-instruct:free', p),
//     '@Cerebras-llama3': (p) => wrap(callCerebras, 'llama3.1-8b', p),
//     '@groq-compound': (p) => wrap(callGroq, 'groq/compound', p),
//     '@groq-qwen': (p) => wrap(callGroq, 'qwen/qwen3-32b', p),
//     '@groq-gpt': (p) => wrap(callGroq, 'openai/gpt-oss-120b', p),

//     '@gemini-pro': (p) => wrap(callGemini, 'gemini-2.5-pro', p),
//     '@gemini-flash': (p) => wrap(callGemini, 'gemini-2.5-flash', p),

//     '@cerebras-gpt': (p) => wrap(callCerebras, 'gpt-oss-120b', p),
//     '@cerebras-llama': (p) => wrap(callCerebras, 'llama-3.3-70b', p),
//     '@cerebras-qwen': (p) =>
//       wrap(callCerebras, 'qwen-3-235b-a22b-instruct-2507', p),

//     '@router-sherlock': (p) =>
//       wrap(callOpenRouter, 'openrouter/sherlock-dash-alpha', p),
//     '@router-mistral': (p) =>
//       wrap(callOpenRouter, 'mistralai/mistral-7b-instruct:free', p),
//     '@router-deepseek': (p) =>
//       wrap(callOpenRouter, 'deepseek/deepseek-r1-distill-llama-70b:free', p),
//     '@router-llama': (p) =>
//       wrap(callOpenRouter, 'meta-llama/llama-3.3-70b-instruct:free', p),
//     '@router-coder': (p) => wrap(callOpenRouter, 'qwen/qwen3-coder:free', p),

//     '@nova-r1': (p) => wrap(callSambaNova, 'DeepSeek-R1', p),
//     '@nova-deepseek': (p) =>
//       wrap(callSambaNova, 'DeepSeek-R1-Distill-Llama-70B', p),
//     '@nova-llama': (p) => wrap(callSambaNova, 'Meta-Llama-3.3-70B-Instruct', p),

//     '@cf-gpt': (p) => wrap(callCloudflare, '@cf/openai/gpt-oss-120b', p),
//     '@cf-llama': (p) =>
//       wrap(callCloudflare, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', p),
//     '@cf-mistral': (p) =>
//       wrap(callCloudflare, '@cf/mistralai/mistral-small-3.1-24b-instruct', p),
//   };

//   for (const [prefix, handlerFn] of Object.entries(shortcuts)) {
//     if (fullPrompt.trim().toLowerCase().startsWith(prefix)) {
//       const cleanPrompt = fullPrompt.slice(prefix.length).trim();

//       console.log(`(Shortcut) Terdeteksi ${prefix}. Bypass cascade...`);

//       // PENTING: Kita copy history agar tidak merusak array asli
//       // Lalu kita ganti pesan terakhir (yang ada @shortcurnya) dengan pesan bersih
//       const cleanHistory = [...history];
//       if (cleanHistory.length > 0) {
//         cleanHistory[cleanHistory.length - 1] = {
//           role: 'user',
//           content: cleanPrompt,
//         };
//       } else {
//         // Jaga-jaga jika history kosong
//         cleanHistory.push({ role: 'user', content: cleanPrompt });
//       }

//       return await handlerFn(cleanHistory);
//     }
//   }
//   return null;
// }
//
//
//
//
//
//
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import cors from 'cors';

// ====================================================================
// --- 1. INISIALISASI KLIEN (TIDAK BERUBAH) ---
// ====================================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
const cerebrasClient = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
  maxRetries: 0,
});
const sambaNovaClient = new OpenAI({
  baseURL: 'https://api.sambanova.ai/v1',
  apiKey: process.env.SAMBANOVA_API_KEY,
});
const cloudflareClient = new OpenAI({
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
  apiKey: process.env.CLOUDFLARE_API_TOKEN,
});

// ====================================================================
// --- 2. KONFIGURASI CORS & PERSONA ---
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

// Persona Default (Sesuai permintaan Anda)
const DEFAULT_SYSTEM_INSTRUCTION = `
[IDENTITAS UTAMA KAMU (AI)]
Nama: Madzam
Peran: Asisten Virtual Cerdasnya kak Muhammad.
Tugas Utama: Menjawab pertanyaan pengunjung website.
Tugas lain: mengenalkan sedikit dan jangan berlebihan mengenai keahlian, pengalaman, dan proyek Muhammad.

[DEFINISI ENTITAS (PENTING!)]
1. KAMU (AI) = Madzam. Kamu adalah asisten/wakil, BUKAN Muhammad.
2. USER (Lawan Bicara) = Pengunjung website, Recruiter, atau Klien potensial. USER INI BUKAN MUHAMMAD. Jangan pernah menganggap user adalah Muhammad. Jangan pernah memanggil user "user", kalau perlu tanyakan nama dan gendernya agar bisa menentukan panggilan mas atau mba (disusul dengan namanya jika ada) kalau tidak maka panggil saja kak atau kamu.
3. MUHAMMAD (Subjek/Owner) = Pemilik portofolio ini. Rujuk dia sebagai orang ketiga ("Mas Muhammad", "Beliau", "dia", "Creator saya", atau "Bos saya", dan sejenisnya).

[ATURAN GAYA BICARA KAMU (AI)]
1. Tone: Profesional namun Ramah, Membantu, Teknis (jika ditanya soal kode), dan Sedikit Humoris/Witty untuk mencairkan suasana.
2. Bahasa: Gunakan Bahasa Indonesia yang luwes, tidak kaku seperti robot, tapi tetap sopan.
3. Posisi: Bicaralah seolah-olah kamu sedang mempromosikan Muhammad kepada user.
   - SALAH: "Saya lulusan UIN..." (Ini mengaku sebagai Muhammad).
   - BENAR: "Mas Muhammad itu lulusan UIN..." (Ini asisten yang menjelaskan).
4. Larangan: Jangan mengaku sebagai ChatGPT, Gemini, atau model AI generik. Kamu adalah Madzam.
5. Jika di SUMMARY / [CONTEXT SUMMARY] sudah ada sapaan maka tidak perlu menyapa lagi, lanjutkan percakapan sesuai konteks.
`;

// ====================================================================
// --- 3. HELPER FUNCTIONS (MEMORY & ERROR) ---
// ====================================================================

function normalizeForGemini(messages) {
  return messages
    .map((msg) => {
      let role = '';
      if (msg.role === 'user') role = 'user';
      else if (msg.role === 'assistant') role = 'model';
      else return null;
      return { role: role, parts: [{ text: msg.content }] };
    })
    .filter(Boolean);
}

function isHeavyContext(messages) {
  const totalChars = messages.reduce(
    (acc, m) => acc + (m.content?.length || 0),
    0
  );
  return totalChars > 3500;
}

function isTryAgainError(error) {
  const s = error?.status || error?.code; // Support .code juga
  const isRetryable =
    !s ||
    s === 401 ||
    s === 402 ||
    s === 403 ||
    s === 404 ||
    s === 408 ||
    s === 410 ||
    s === 413 ||
    s === 429 ||
    s === 498 ||
    s >= 500 ||
    s === 409;

  if (isRetryable)
    console.warn(
      `(Error Check) Status ${
        s || 'Network/Connection'
      } terdeteksi. Mencoba provider berikutnya...`
    );
  return isRetryable;
}

// ====================================================================
// --- 4. FUNGSI PEMANGGIL API (MODIFIKASI STREAMING) ---
// ====================================================================

// A. GEMINI STREAM
async function callGemini(modelName, messages, systemPrompt) {
  console.log(`(Call Stream) Mencoba Gemini: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    const geminiHistory = normalizeForGemini(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({ history: geminiHistory });

    // PERUBAHAN: Gunakan sendMessageStream
    const result = await chat.sendMessageStream(lastMessage);

    // Generator function untuk yield chunks
    async function* streamGenerator() {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) yield chunkText;
      }
    }

    return {
      stream: streamGenerator(),
      source: `Google (${modelName})`,
    };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || error.cause?.status || 500;
    throw enhancedError;
  }
}

// B. OPENAI-STYLE STREAM (Groq, Cerebras, dll)
async function callOpenAIStyle(
  client,
  providerName,
  modelName,
  messages,
  systemPrompt
) {
  console.log(`(Call Stream) Mencoba ${providerName}: ${modelName}...`);
  try {
    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // PERUBAHAN: Tambahkan stream: true
    const stream = await client.chat.completions.create({
      messages: finalMessages,
      model: modelName,
      stream: true, // Aktifkan mode streaming
      ...(providerName === 'OpenRouter' && {
        extraHeaders: {
          'HTTP-Referer': 'https://genius-web-portfolio.com',
          'X-Title': 'Genius Web',
        },
      }),
    });

    // Generator function untuk yield chunks
    async function* streamGenerator() {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    }

    return {
      stream: streamGenerator(),
      source: `${providerName} (${modelName})`,
    };
  } catch (error) {
    const enhancedError = new Error(error.message);
    enhancedError.status = error.status || 500;
    throw enhancedError;
  }
}

// Wrapper agar sesuai dengan 'fn' di list cascade Anda
const callGroq = (m, msgs, sys) => callOpenAIStyle(groq, 'Groq', m, msgs, sys);
const callSambaNova = (m, msgs, sys) =>
  callOpenAIStyle(sambaNovaClient, 'SambaNova', m, msgs, sys);
const callCerebras = (m, msgs, sys) =>
  callOpenAIStyle(cerebrasClient, 'Cerebras', m, msgs, sys);
const callOpenRouter = (m, msgs, sys) =>
  callOpenAIStyle(openRouterClient, 'OpenRouter', m, msgs, sys);
const callCloudflare = (m, msgs, sys) =>
  callOpenAIStyle(cloudflareClient, 'Cloudflare', m, msgs, sys);

// ====================================================================
// --- 5. ENGINE: CASCADE & SUMMARIZER ---
// ====================================================================

async function runCascadeStrategy(
  strategyName,
  steps,
  messages,
  systemInstruction
) {
  let lastError = null;
  console.log(
    `=== Memulai Cascade: ${strategyName} (${steps.length} langkah) ===`
  );

  for (const step of steps) {
    try {
      // Mengembalikan { stream, source }
      return await step.fn(step.model, messages, systemInstruction);
    } catch (error) {
      lastError = error;
      if (isTryAgainError(error)) {
        console.warn(
          `[${strategyName}] Gagal di ${step.provider}/${step.model}. Pindah ke berikutnya...`
        );
        continue;
      } else {
        console.error(`[${strategyName}] Error Fatal:`, error.message);
        throw error;
      }
    }
  }
  console.error(`[${strategyName}] Semua model gagal.`);
  throw new Error(
    `Semua model di cascade ${strategyName} gagal. Terakhir: ${lastError?.message}`
  );
}

// FUNGSI SUMMARY (Disesuaikan untuk menangani Stream -> Text)
async function getSummaryFromAI(oldMessages) {
  console.log('--- [DEBUG SUMMARY] Start ---');
  console.log(`Jumlah pesan yang akan diringkas: ${oldMessages.length}`);

  const chatText = oldMessages
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n');

  console.log(
    'Sample Teks (50 char pertama):',
    chatText.substring(0, 50) + '...'
  );

  if (chatText.length < 50) {
    return 'Percakapan awal (sedikit data).';
  }

  const summarySystem =
    'You are a technical summarizer agent. DO NOT chat. DO NOT answer the user. ONLY output a summary.';
  const summaryUserMsg = `
    TASK: Summarize the following conversation history into ONE concise paragraph.
    RULES:
    1. Focus on technical details (libraries, errors, code logic).
    2. Ignore casual greetings ("Hi", "Hello").
    3. Do NOT respond to the user. Just describe what happened.
    4. Output must be in INDONESIAN (Bahasa Indonesia).

    --- CONVERSATION START ---
    ${chatText}
    --- CONVERSATION END ---

    SUMMARY (Bahasa Indonesia):
  `;

  const msgs = [{ role: 'user', content: summaryUserMsg }];

  // List model summary Anda (tetap sama)
  const summarizerSteps = [
    { provider: 'Gemini', model: 'gemini-2.0-flash', fn: callGemini },
    {
      provider: 'OpenRouter',
      model: 'google/gemini-2.0-flash-exp:free',
      fn: callOpenRouter,
    },
    {
      provider: 'OpenRouter',
      model: 'tngtech/deepseek-r1t2-chimera:free',
      fn: callOpenRouter,
    },
    {
      provider: 'OpenRouter',
      model: 'openrouter/sherlock-dash-alpha',
      fn: callOpenRouter,
    },
    {
      provider: 'Cloudflare',
      model: '@cf/google/gemma-3-12b-it',
      fn: callCloudflare,
    },
    {
      provider: 'OpenRouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      fn: callOpenRouter,
    },
    {
      provider: 'OpenRouter',
      model: 'openrouter/sherlock-think-alpha',
      fn: callOpenRouter,
    },
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-chat-v3-0324:free',
      fn: callOpenRouter,
    },
    {
      provider: 'OpenRouter',
      model: 'nousresearch/hermes-3-llama-3.1-405b:free',
      fn: callOpenRouter,
    },
  ];

  try {
    console.log('--- Mengirim ke AI Summarizer... ---');
    // Karena runCascadeStrategy sekarang me-return STREAM, kita harus membacanya sampai habis
    const result = await runCascadeStrategy(
      'Summarizer Agent',
      summarizerSteps,
      msgs,
      summarySystem
    );

    let fullSummaryText = '';
    for await (const chunk of result.stream) {
      fullSummaryText += chunk;
    }

    console.log('--- [DEBUG SUMMARY] Result: ---');
    console.log(fullSummaryText.substring(0, 100) + '...');
    return fullSummaryText;
  } catch (e) {
    console.error('GAGAL MERANGKUM:', e.message);
    return 'Ringkasan gagal dibuat.';
  }
}

// ====================================================================
// --- 6. CASCADE LISTS (TIDAK DIUBAH) ---
// ====================================================================

async function handleChatCascade(messages, systemInstruction) {
  const steps = [
    { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
    { provider: 'Groq', model: 'groq/compound', fn: callGroq },
    { provider: 'Cerebras', model: 'llama-3.3-70b', fn: callCerebras },
    {
      provider: 'OpenRouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      fn: callOpenRouter,
    },
    {
      provider: 'SambaNova',
      model: 'Meta-Llama-3.3-70B-Instruct',
      fn: callSambaNova,
    },
    {
      provider: 'OpenRouter',
      model: 'openrouter/sherlock-dash-alpha',
      fn: callOpenRouter,
    },
    { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },
    {
      provider: 'OpenRouter',
      model: 'tngtech/deepseek-r1t-chimera:free',
      fn: callOpenRouter,
    },
    {
      provider: 'Cloudflare',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      fn: callCloudflare,
    },
    {
      provider: 'OpenRouter',
      model: 'microsoft/mai-ds-r1:free',
      fn: callOpenRouter,
    },
    // Jaring Pengaman
    { provider: 'Groq', model: 'openai/gpt-oss-120b', fn: callGroq },
    {
      provider: 'OpenRouter',
      model: 'tngtech/deepseek-r1t2-chimera:free',
      fn: callOpenRouter,
    },
    { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-r1-distill-llama-70b:free',
      fn: callOpenRouter,
    },
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
    {
      provider: 'OpenRouter',
      model: 'mistralai/mistral-7b-instruct:free',
      fn: callOpenRouter,
    },
  ];
  return await runCascadeStrategy(
    'Chat General',
    steps,
    messages,
    systemInstruction
  );
}

async function handleCodingCascade(messages, systemInstruction) {
  const steps = [
    { provider: 'Gemini', model: 'gemini-2.5-pro', fn: callGemini },
    { provider: 'SambaNova', model: 'DeepSeek-R1', fn: callSambaNova },
    {
      provider: 'OpenRouter',
      model: 'microsoft/mai-ds-r1:free',
      fn: callOpenRouter,
    },
    {
      provider: 'SambaNova',
      model: 'DeepSeek-R1-Distill-Llama-70B',
      fn: callSambaNova,
    },
    {
      provider: 'OpenRouter',
      model: 'qwen/qwen3-coder:free',
      fn: callOpenRouter,
    },
    {
      provider: 'Cerebras',
      model: 'qwen-3-235b-a22b-instruct-2507',
      fn: callCerebras,
    },
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-r1:free',
      fn: callOpenRouter,
    },
    { provider: 'Cerebras', model: 'gpt-oss-120b', fn: callCerebras },
    { provider: 'Groq', model: 'qwen/qwen3-32b', fn: callGroq },
    {
      provider: 'Cloudflare',
      model: '@cf/openai/gpt-oss-120b',
      fn: callCloudflare,
    },
    {
      provider: 'OpenRouter',
      model: 'deepseek/deepseek-r1-distill-llama-70b:free',
      fn: callOpenRouter,
    },
    { provider: 'Gemini', model: 'gemini-2.5-flash', fn: callGemini },
  ];
  return await runCascadeStrategy(
    'Coding Assistant',
    steps,
    messages,
    systemInstruction
  );
}

// ====================================================================
// --- 7. SMART ROUTER UTAMA (HANDLER - STREAMING ENABLED) ---
// ====================================================================
export default async function handler(req, res) {
  await runMiddleware(req, res, corsHandler);

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // === SETUP HEADER UNTUK STREAMING ===
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let task, messages;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    task = body.task || 'chat_general';

    if (body.messages && Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (body.prompt) {
      messages = [{ role: 'user', content: body.prompt }];
    } else {
      throw new Error('Input tidak valid. Butuh "messages" atau "prompt".');
    }

    // B. Ekstraksi System Prompt & History
    const systemMsgObj = messages.find((m) => m.role === 'system');
    let systemInstruction = systemMsgObj
      ? systemMsgObj.content
      : DEFAULT_SYSTEM_INSTRUCTION;

    let chatHistory = messages.filter((m) => m.role !== 'system');

    // C. Cek Shortcut (Bypass Cascade)
    const lastUserMessage = chatHistory[chatHistory.length - 1]?.content || '';

    // Cek shortcut dulu, kalau ada langsung return stream dari shortcut
    const shortcutResult = await handleShortcut(
      lastUserMessage,
      chatHistory,
      systemInstruction
    );
    if (shortcutResult) {
      // Kirim Meta Shortcut
      res.write(
        `data: ${JSON.stringify({
          type: 'meta',
          source: shortcutResult.source,
          summary: null,
        })}\n\n`
      );
      // Kirim Stream Shortcut
      for await (const chunk of shortcutResult.stream) {
        res.write(
          `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
        );
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // ============================================================
    // D. LOGIKA HYBRID MEMORY & SUMMARY (BLOCKING PROCESS)
    // ============================================================
    const KEEP_RAW_COUNT = 4;
    let debugSummary = null;

    if (isHeavyContext(chatHistory) && chatHistory.length > KEEP_RAW_COUNT) {
      const messagesToSummarize = chatHistory.slice(0, -KEEP_RAW_COUNT);
      const recentMessages = chatHistory.slice(-KEEP_RAW_COUNT);

      // Summary tetap BLOCKING (ditunggu selesai sebelum stream dimulai)
      const summary = await getSummaryFromAI(messagesToSummarize);
      debugSummary = summary;

      systemInstruction += `\n\n[CONTEXT SUMMARY]:\n${summary}\n(Gunakan informasi ini sebagai ingatan dan konteks percakapan sebelumnya).`;

      chatHistory = recentMessages;
    } else {
      if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
    }

    // E. Eksekusi ke Model Utama
    if (task === 'info_portofolio') {
      systemInstruction += `\n[KONTEKS TAMBAHAN]:
      [IDENTITAS UTAMA KAMU (AI)]
      Nama: Madzam
      Peran: Asisten Virtual Cerdas Muhammad.
      Tugas: Menjawab pertanyaan pengunjung website mengenai keahlian, pengalaman, proyek Muhammad.

      [LATAR BELAKANG MUHAMMAD]
      - Pendidikan: Lulusan Aqidah Filsafat Islam (UIN Syarif Hidayatullah).
      - Keahlian Teknis: Web Development, Data Analyst, dan Data Science (bisa sebutkan tools dan software yang biasa dikuasai).
      - Keunikan: Kombinasi unik antara pemikiran filosofis dan logika coding yang kuat.
      - Soft-skill: Fast learner, Tech-Savy, Meticulous, Caffeine Addict (jelaskan bila perlu).`;
    } else if (task === 'assistent_coding') {
      if (!systemInstruction.includes('expert coding'))
        systemInstruction =
          'You are an expert coding assistant. ' + systemInstruction;
    }

    // Tentukan Steps berdasarkan task
    let cascadeFunction;
    if (task === 'assistent_coding') cascadeFunction = handleCodingCascade;
    else cascadeFunction = handleChatCascade;

    // Jalankan Cascade (Sekarang mengembalikan { stream, source })
    const { stream, source } = await cascadeFunction(
      chatHistory,
      systemInstruction
    );

    // 1. Kirim Metadata (Source & Summary)
    res.write(
      `data: ${JSON.stringify({
        type: 'meta',
        source: source,
        summary: debugSummary,
      })}\n\n`
    );

    // 2. Kirim Chunk Stream
    for await (const chunk of stream) {
      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          content: chunk,
        })}\n\n`
      );
    }

    // 3. Selesai
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error di Smart Router:', error.message);
    // Kirim error event ke frontend lewat SSE
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: error.message,
      })}\n\n`
    );
    res.end();
  }
}

// ====================================================================
// --- 8. LOGIKA SHORTCUT (STREAMING SUPPORT) ---
// ====================================================================
async function handleShortcut(fullPrompt, history, systemInstruction) {
  const wrap = async (fn, model, cleanHistory) => {
    return await fn(model, cleanHistory, systemInstruction);
  };

  const shortcuts = {
    '@router-gemini': (p) =>
      wrap(callOpenRouter, 'google/gemini-2.0-flash-exp:free', p),
    '@groq-llama': (p) => wrap(callGroq, 'llama-3.1-8b-instant', p),
    '@router-llama3': (p) =>
      wrap(callOpenRouter, 'meta-llama/llama-3.2-3b-instruct:free', p),
    '@Cerebras-llama3': (p) => wrap(callCerebras, 'llama3.1-8b', p),
    '@groq-compound': (p) => wrap(callGroq, 'groq/compound', p),
    '@groq-qwen': (p) => wrap(callGroq, 'qwen/qwen3-32b', p),
    '@groq-gpt': (p) => wrap(callGroq, 'openai/gpt-oss-120b', p),

    '@gemini-pro': (p) => wrap(callGemini, 'gemini-2.5-pro', p),
    '@gemini-flash': (p) => wrap(callGemini, 'gemini-2.5-flash', p),

    '@cerebras-gpt': (p) => wrap(callCerebras, 'gpt-oss-120b', p),
    '@cerebras-llama': (p) => wrap(callCerebras, 'llama-3.3-70b', p),
    '@cerebras-qwen': (p) =>
      wrap(callCerebras, 'qwen-3-235b-a22b-instruct-2507', p),

    '@router-sherlock': (p) =>
      wrap(callOpenRouter, 'openrouter/sherlock-dash-alpha', p),
    '@router-mistral': (p) =>
      wrap(callOpenRouter, 'mistralai/mistral-7b-instruct:free', p),
    '@router-deepseek': (p) =>
      wrap(callOpenRouter, 'deepseek/deepseek-r1-distill-llama-70b:free', p),
    '@router-llama': (p) =>
      wrap(callOpenRouter, 'meta-llama/llama-3.3-70b-instruct:free', p),
    '@router-coder': (p) => wrap(callOpenRouter, 'qwen/qwen3-coder:free', p),

    '@nova-r1': (p) => wrap(callSambaNova, 'DeepSeek-R1', p),
    '@nova-deepseek': (p) =>
      wrap(callSambaNova, 'DeepSeek-R1-Distill-Llama-70B', p),
    '@nova-llama': (p) => wrap(callSambaNova, 'Meta-Llama-3.3-70B-Instruct', p),

    '@cf-gpt': (p) => wrap(callCloudflare, '@cf/openai/gpt-oss-120b', p),
    '@cf-llama': (p) =>
      wrap(callCloudflare, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', p),
    '@cf-mistral': (p) =>
      wrap(callCloudflare, '@cf/mistralai/mistral-small-3.1-24b-instruct', p),
  };

  for (const [prefix, handlerFn] of Object.entries(shortcuts)) {
    if (fullPrompt.trim().toLowerCase().startsWith(prefix)) {
      const cleanPrompt = fullPrompt.slice(prefix.length).trim();
      console.log(`(Shortcut) Terdeteksi ${prefix}. Bypass cascade...`);
      const cleanHistory = [...history];
      if (cleanHistory.length > 0) {
        cleanHistory[cleanHistory.length - 1] = {
          role: 'user',
          content: cleanPrompt,
        };
      } else {
        cleanHistory.push({ role: 'user', content: cleanPrompt });
      }
      return await handlerFn(cleanHistory);
    }
  }
  return null;
}
