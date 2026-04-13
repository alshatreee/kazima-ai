import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

// Gemini Vision للصور
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ═══ الصيغ المدعومة ═══

const TEXT_EXTENSIONS = ['.pdf', '.txt', '.docx', '.doc', '.html', '.htm', '.md'];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.jfif'];

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

const ALL_EXTENSIONS = [...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS];

// ═══ إعدادات التقطيع ═══

const MAX_CHUNK_LENGTH = 1200;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const cleanParagraph = paragraph.trim();
    if (!cleanParagraph) continue;

    if ((currentChunk.length + cleanParagraph.length) > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = cleanParagraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + cleanParagraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ═══ تنظيف HTML ═══

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ═══ استخراج النص من الصور عبر Gemini Vision ═══

const VISION_PROMPT = `أنت محلل وثائق ومخطوطات عربية خبير. حلّل هذه الصورة واستخرج المعلومات التالية:

1. **الوصف:** صف محتوى الصورة بالتفصيل (ما الذي تظهره؟ وثيقة تاريخية؟ صورة لمكان؟ مخطوطة؟ شخصية؟).
2. **النص المكتوب:** إذا وُجد نص عربي أو أي نص آخر في الصورة، استخرجه كاملاً بالترتيب.
3. **السياق التاريخي:** إذا كانت الصورة تتعلق بالتراث الكويتي أو الخليجي، اذكر أي معلومات واضحة (تاريخ، مكان، أشخاص).
4. **الكلمات المفتاحية:** 5-10 كلمات مفتاحية بالعربية تصف المحتوى.

أجب بالعربية فقط. لا تختلق معلومات غير موجودة في الصورة.`;

async function extractFromImage(filePath: string, mimeType: string): Promise<string> {
  const imageData = fs.readFileSync(filePath);
  const base64 = imageData.toString('base64');

  const result = await visionModel.generateContent([
    VISION_PROMPT,
    {
      inlineData: {
        data: base64,
        mimeType,
      },
    },
  ]);

  return result.response.text();
}

// ═══ قراءة محتوى ملف بحسب نوعه ═══

async function readFileContent(filePath: string): Promise<{ text: string; isImage: boolean }> {
  const ext = path.extname(filePath).toLowerCase();

  // صور → Gemini Vision
  if (IMAGE_EXTENSIONS.includes(ext)) {
    const mimeType = IMAGE_MIME_TYPES[ext];
    if (!mimeType) return { text: '', isImage: true };

    if (!process.env.GOOGLE_API_KEY) {
      console.log(`    ⚠️ تخطي الصورة — مفتاح GOOGLE_API_KEY غير موجود`);
      return { text: '', isImage: true };
    }

    const text = await extractFromImage(filePath, mimeType);
    return { text, isImage: true };
  }

  // ملفات نصية
  switch (ext) {
    case '.pdf': {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return { text: data.text, isImage: false };
    }

    case '.docx':
    case '.doc': {
      const result = await mammoth.extractRawText({ path: filePath });
      return { text: result.value, isImage: false };
    }

    case '.html':
    case '.htm': {
      const html = fs.readFileSync(filePath, 'utf-8');
      return { text: stripHtml(html), isImage: false };
    }

    case '.md':
    case '.txt':
    default: {
      return { text: fs.readFileSync(filePath, 'utf-8'), isImage: false };
    }
  }
}

// ═══ تحديد نوع الوثيقة ═══

function detectDocumentType(fileName: string, contentLength: number, isImage: boolean): string {
  const nameLower = fileName.toLowerCase();

  if (isImage) {
    if (nameLower.includes('مخطوط') || nameLower.includes('manuscript')) return 'manuscript';
    if (nameLower.includes('خريطة') || nameLower.includes('map')) return 'article';
    return 'article'; // صورة عامة
  }

  if (nameLower.includes('كتاب') || nameLower.includes('مخطوط') || contentLength > 50000) {
    return 'book';
  }
  if (nameLower.includes('مخطوطة') || nameLower.includes('manuscript')) {
    return 'manuscript';
  }
  return 'article';
}

// ═══ الدالة الرئيسية ═══

async function main() {
  console.log('🚀 بدء عملية استيراد الأرشيف إلى كاظمة...');
  console.log(`   صيغ النصوص: ${TEXT_EXTENSIONS.join(' | ')}`);
  console.log(`   صيغ الصور:  ${IMAGE_EXTENSIONS.join(' | ')} (عبر Gemini Vision)`);
  console.log('');

  const dataDirectory = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(process.cwd(), 'data', 'archive');

  if (!fs.existsSync(dataDirectory)) {
    console.error(`❌ المجلد غير موجود: ${dataDirectory}`);
    console.log('يرجى إنشاء مجلد data/archive أو تمرير المسار كمعامل.');
    return;
  }

  // مسح متكرر للمجلدات الفرعية
  const allFiles: { name: string; fullPath: string }[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        const ext = path.extname(entry).toLowerCase();
        if (ALL_EXTENSIONS.includes(ext)) {
          allFiles.push({ name: entry, fullPath });
        }
      }
    }
  }

  scanDirectory(dataDirectory);

  if (allFiles.length === 0) {
    console.log('⚠️ لم يتم العثور على ملفات مدعومة في المجلد.');
    return;
  }

  // إحصائيات الصيغ
  const extCounts: Record<string, number> = {};
  let textFileCount = 0;
  let imageFileCount = 0;

  for (const f of allFiles) {
    const ext = path.extname(f.name).toLowerCase();
    extCounts[ext] = (extCounts[ext] || 0) + 1;
    if (IMAGE_EXTENSIONS.includes(ext)) imageFileCount++;
    else textFileCount++;
  }

  console.log(`📚 تم العثور على ${allFiles.length} ملف (${textFileCount} نصي + ${imageFileCount} صورة):`);
  for (const [ext, count] of Object.entries(extCounts).sort((a, b) => b[1] - a[1])) {
    const label = IMAGE_EXTENSIONS.includes(ext) ? '🖼️' : '📄';
    console.log(`   ${label} ${ext}: ${count} ملف`);
  }

  if (imageFileCount > 0 && !process.env.GOOGLE_API_KEY) {
    console.log('');
    console.log(`⚠️ تنبيه: ${imageFileCount} صورة تحتاج مفتاح GOOGLE_API_KEY لتحليلها عبر Gemini Vision.`);
  }

  console.log('');

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let totalChunks = 0;
  let imageCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const { name: fileName, fullPath: filePath } = allFiles[i];
    const ext = path.extname(fileName).toLowerCase();
    const title = fileName.replace(/\.[^.]+$/, '');
    const slug = `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isImageFile = IMAGE_EXTENSIONS.includes(ext);

    try {
      const label = isImageFile ? '🖼️' : '📄';
      console.log(`[${i + 1}/${allFiles.length}] ${label} ⏳ ${title} (${ext})`);

      // 1. استخراج المحتوى
      const { text: content, isImage } = await readFileContent(filePath);

      if (!content || content.trim().length < 10) {
        console.log(`  ⚠️ تخطي — محتوى فارغ أو قصير جداً`);
        skipCount++;
        continue;
      }

      // 2. تحديد النوع
      const docType = detectDocumentType(fileName, content.length, isImage);

      // 3. إنشاء الوثيقة
      const document = await prisma.sourceDocument.create({
        data: {
          title,
          slug,
          type: docType,
          searchableText: content,
          language: 'ar',
          verificationState: isImage ? 'unreviewed' : 'verified',
          sourceUrl: isImage ? filePath : undefined,
        },
      });

      // 4. تقطيع النص وإدخال المقاطع
      const textChunks = chunkText(content);

      const chunkPromises = textChunks.map((chunk, index) => {
        return prisma.sourceChunk.create({
          data: {
            documentId: document.id,
            ordinal: index + 1,
            text: chunk,
            cleanText: chunk.replace(/[^\w\s\u0600-\u06FF]/g, ' '),
          },
        });
      });

      await Promise.all(chunkPromises);
      totalChunks += textChunks.length;
      successCount++;
      if (isImage) imageCount++;

      const method = isImage ? 'Gemini Vision' : ext;
      console.log(`  ✅ نوع: ${docType} | ${textChunks.length} مقطع | ${content.length} حرف | ${method}`);
    } catch (error) {
      failCount++;
      console.error(`  ❌ خطأ:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`🎉 انتهت عملية الاستيراد!`);
  console.log(`   ✅ نجح: ${successCount} ملف (${imageCount} صورة عبر Vision)`);
  console.log(`   ⚠️ تخطي: ${skipCount} ملف`);
  console.log(`   ❌ فشل: ${failCount} ملف`);
  console.log(`   📄 إجمالي المقاطع: ${totalChunks}`);
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
