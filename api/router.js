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
//
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import cors from 'cors';

// 1. INISIALISASI KLIEN=======
// =================================

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

// 2. KONFIGURASI CORS & PERSONA=====
// ====================================
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

// Persona Model AI agar model yang berbeda tetap konsisten dengan persona yang ditentukan
const DEFAULT_SYSTEM_INSTRUCTION = `
[IDENTITAS UTAMA KAMU (AI)]
Nama: Madzam
Peran: Asisten Virtual Cerdasnya kak Muhammad.
Tugas Utama: Menjawab pertanyaan pengunjung website.
Tugas lain: mengenalkan sedikit mengenai keahlian, pengalaman, dan proyek Muhammad dengan sederahana dan jangan berlebihan.

[DEFINISI ENTITAS (PENTING!)]
1. KAMU (AI) = Madzam. Kamu adalah asisten/wakil, BUKAN Muhammad.
2. USER (Lawan Bicara) = Pengunjung website, Recruiter, atau Klien potensial. USER INI BUKAN MUHAMMAD. Jangan pernah menganggap user adalah Muhammad. Jangan pernah memanggil user "user", kalau perlu tanyakan nama dan gendernya agar bisa menentukan panggilan mas atau mba (disusul dengan namanya jika ada) kalau tidak maka panggil saja kak, kamu, atau anda.
3. MUHAMMAD (Subjek/Owner) = Pemilik website ini. Rujuk dia sebagai orang ketiga ("Kak Muhammad", "dia", "beliau" dan sejenisnya).

[ATURAN GAYA BICARA KAMU (AI)]
1. Tone: Profesional namun Ramah, Membantu, Teknis (jika ditanya soal kode), dan Sedikit Humoris/Witty untuk mencairkan suasana. Respon dengan cara berbicara yang benar-benar alami seperti manusia. Variasikan struktur kalimat, hindari pola yang berulang, dan sampaikan ide seperti orang yang berpikir secara intuitif. buat nada hangat, mengalir, dan terasa manusiawi.
2. Bahasa: Gunakan Bahasa Indonesia yang luwes, tidak kaku seperti robot, tapi tetap sopan.
3. Posisi: Bicaralah seolah-olah kamu sedang mempromosikan Muhammad kepada user.
   - SALAH: "Saya lulusan UIN..." (Ini mengaku sebagai Muhammad).
   - BENAR: "Mas Muhammad itu lulusan UIN..." (Ini asisten yang menjelaskan).
4. Larangan: Jangan mengaku sebagai ChatGPT, Gemini, atau model AI generik. Kamu adalah Madzam.
5. Jika di SUMMARY / [CONTEXT SUMMARY] sudah ada sapaan dan user tidak menyapa maka tidak perlu menyapa lagi setiap menjawab pertanyaan dan permintaan  user, lanjutkan percakapan sesuai konteks. tapi jika user manyapa maka boleh sapa balik.
`;

// 3. HELPER FUNCTIONS (MEMORY & ERROR)=========
// ==============================================

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
    !s || // Connection Error biasanya tidak punya status code
    s === 401 || // Authentication Error (Kunci Salah)
    s === 402 || // Payment Required (Saldo Habis - Cerebras/OpenRouter)
    s === 403 || // Permission Denied
    s === 404 || // Not Found (Model tidak ada/salah nama)
    s === 408 || // Request Timeout
    s === 410 || // Gone (Model Deprecated/Removed - KHUSUS SAMBANOVA)
    s === 413 ||
    s === 429 || // Rate Limit (Umum)
    s === 498 || // Groq Flex Limit
    s >= 500 || // Menangkap 500, 502, 503, 504, dll
    s === 502 ||
    s === 503 ||
    s === 504 ||
    s === 409; // Conflict (Cerebras menyarankan retry untuk ini);

  if (isRetryable)
    console.warn(
      `(Error Check) Status ${
        s || 'Network/Connection'
      } terdeteksi. Mencoba provider berikutnya...`
    );
  return isRetryable;
}

// 4. FUNGSI PEMANGGIL API STREAMING MODE==================
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

    // Gunakan sendMessageStream
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

    //stream: true
    const stream = await client.chat.completions.create({
      messages: finalMessages,
      model: modelName,
      stream: true, // mode streaming aktif
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

// Wrapper agar sesuai dengan 'fn' di list cascade
const callGroq = (m, msgs, sys) => callOpenAIStyle(groq, 'Groq', m, msgs, sys);
const callSambaNova = (m, msgs, sys) =>
  callOpenAIStyle(sambaNovaClient, 'SambaNova', m, msgs, sys);
const callCerebras = (m, msgs, sys) =>
  callOpenAIStyle(cerebrasClient, 'Cerebras', m, msgs, sys);
const callOpenRouter = (m, msgs, sys) =>
  callOpenAIStyle(openRouterClient, 'OpenRouter', m, msgs, sys);
const callCloudflare = (m, msgs, sys) =>
  callOpenAIStyle(cloudflareClient, 'Cloudflare', m, msgs, sys);

// 5. ENGINE: CASCADE & SUMMARIZER===
// =====================================

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
    1. Focus on technical details (libraries, errors, code logic, analysis workflow, etc).
    2. Ignore casual greetings ("Hi", "Hello").
    3. Do NOT respond to the user. Just describe what happened.
    4. Output must be in INDONESIAN (Bahasa Indonesia).

    --- CONVERSATION START ---
    ${chatText}
    --- CONVERSATION END ---

    SUMMARY (Bahasa Indonesia):
  `;

  const msgs = [{ role: 'user', content: summaryUserMsg }];

  // List model summary
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
    // Karena runCascadeStrategy sekarang me-return STREAM, maka harus membacanya sampai habis
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

// 6. CASCADE LISTS============================
// ===========================================================
// Chat======
//===============================
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
// Coding==================
//================================
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

// 7. SMART ROUTER UTAMA (HANDLER - STREAMING ENABLED)================
// ====================================================================
export default async function handler(req, res) {
  await runMiddleware(req, res, corsHandler);

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // === A. SETUP HEADER UNTUK STREAMING ===
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

    // D. LOGIKA HYBRID MEMORY & SUMMARY (BLOCKING PROCESS)==========
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
      Tugas: Menjawab pertanyaan pengunjung website mengenai keahlian, pengalaman, proyek Muhammad dengan sederhana dan jangan berlebihan.

      [LATAR BELAKANG MUHAMMAD]
      - Pendidikan: Lulusan Aqidah Filsafat Islam (UIN Syarif Hidayatullah).
      - Keahlian Teknis: Web Development Dasar, Data Analysis Dasar, dan Data Science Dasar.
      - Keunikan: Kombinasi unik antara pemikiran filosofis dan logika pemrograman yang kuat.
      - Soft-skill: Fast learner, Tech-Savy, Meticulous, Caffeine Addict (jelaskan bila perlu, tapi jangan berlebihan).`;
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

// 8. LOGIKA SHORTCUT (STREAMING SUPPORT)=============
// ====================================================================
async function handleShortcut(fullPrompt, history, systemInstruction) {
  const wrap = async (fn, model, cleanHistory) => {
    return await fn(model, cleanHistory, systemInstruction);
  };

  const shortcuts = {
    // Gemini
    //====================
    '@gemini-pro': (p) => wrap(callGemini, 'gemini-2.5-pro', p),
    '@gemini-f': (p) => wrap(callGemini, 'gemini-2.5-flash', p),
    '@gemini-2.0-f': (p) => wrap(callGemini, 'gemini-2.0-flash', p),
    // Groq
    //======================
    '@groq-llama': (p) => wrap(callGroq, 'llama-3.1-8b-instant', p),
    '@groq-compound': (p) => wrap(callGroq, 'groq/compound', p),
    '@groq-qwen': (p) => wrap(callGroq, 'qwen/qwen3-32b', p),
    '@groq-gpt': (p) => wrap(callGroq, 'openai/gpt-oss-120b', p),
    // Cerebras
    //======================
    '@Cerebras-llama3': (p) => wrap(callCerebras, 'llama3.1-8b', p),
    '@cerebras-gpt': (p) => wrap(callCerebras, 'gpt-oss-120b', p),
    '@cerebras-llama': (p) => wrap(callCerebras, 'llama-3.3-70b', p),
    '@cerebras-qwen': (p) =>
      wrap(callCerebras, 'qwen-3-235b-a22b-instruct-2507', p),
    //OpenRouter
    //====================
    '@router-mic': (p) => wrap(callOpenRouter, 'microsoft/mai-ds-r1:free', p),
    '@router-gem': (p) =>
      wrap(callOpenRouter, 'google/gemini-2.0-flash-exp:free', p),
    '@router-r1t': (p) =>
      wrap(callOpenRouter, 'tngtech/deepseek-r1t2-chimera:free', p),
    '@router-chim': (p) =>
      wrap(callOpenRouter, 'tngtech/deepseek-r1t-chimera:free', p),
    '@router-sher': (p) =>
      wrap(callOpenRouter, 'openrouter/sherlock-think-alpha', p),
    '@router-deepchat': (p) =>
      wrap(callOpenRouter, 'deepseek/deepseek-chat-v3-0324:free', p),
    '@router-hermes': (p) =>
      wrap(callOpenRouter, 'nousresearch/hermes-3-llama-3.1-405b:free', p),
    //==
    '@router-3llama': (p) =>
      wrap(callOpenRouter, 'meta-llama/llama-3.2-3b-instruct:free', p),
    '@router-gemini': (p) =>
      wrap(callOpenRouter, 'google/gemini-2.0-flash-exp:free', p),
    '@router-sherlock': (p) =>
      wrap(callOpenRouter, 'openrouter/sherlock-dash-alpha', p),
    '@router-mistral': (p) =>
      wrap(callOpenRouter, 'mistralai/mistral-7b-instruct:free', p),
    '@router-deepseek': (p) =>
      wrap(callOpenRouter, 'deepseek/deepseek-r1-distill-llama-70b:free', p),
    '@router-llama': (p) =>
      wrap(callOpenRouter, 'meta-llama/llama-3.3-70b-instruct:free', p),
    '@router-coder': (p) => wrap(callOpenRouter, 'qwen/qwen3-coder:free', p),
    //Sambanova
    //========================
    '@nova-r1': (p) => wrap(callSambaNova, 'DeepSeek-R1', p),
    '@nova-deepseek': (p) =>
      wrap(callSambaNova, 'DeepSeek-R1-Distill-Llama-70B', p),
    '@nova-llama': (p) => wrap(callSambaNova, 'Meta-Llama-3.3-70B-Instruct', p),
    //Cloudflare
    //======================
    '@cf-gemma': (p) => wrap(callCloudflare, '@cf/google/gemma-3-12b-it', p),
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
