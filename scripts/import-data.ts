import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

// الصيغ المدعومة
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.doc', '.html', '.htm'];

// إعدادات التقطيع
const MAX_CHUNK_LENGTH = 1200;

// دالة لتقطيع النص الأكاديمي بشكل ذكي يحافظ على الفقرات
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

// تنظيف HTML من الوسوم
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

// قراءة محتوى ملف بحسب نوعه
async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf': {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }

    case '.docx':
    case '.doc': {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    case '.html':
    case '.htm': {
      const html = fs.readFileSync(filePath, 'utf-8');
      return stripHtml(html);
    }

    case '.txt':
    default: {
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
}

// تحديد نوع الوثيقة من اسم الملف أو حجم المحتوى
function detectDocumentType(fileName: string, contentLength: number): string {
  const nameLower = fileName.toLowerCase();
  if (nameLower.includes('كتاب') || nameLower.includes('مخطوط') || contentLength > 50000) {
    return 'book';
  }
  if (nameLower.includes('مخطوطة') || nameLower.includes('manuscript')) {
    return 'manuscript';
  }
  return 'article';
}

// الدالة الرئيسية
async function main() {
  console.log('🚀 بدء عملية استيراد الأرشيف إلى كاظمة...');
  console.log(`   الصيغ المدعومة: ${SUPPORTED_EXTENSIONS.join(' | ')}`);
  console.log('');

  const dataDirectory = path.join(process.cwd(), 'data', 'archive');

  if (!fs.existsSync(dataDirectory)) {
    console.error(`❌ المجلد غير موجود: ${dataDirectory}`);
    console.log('يرجى إنشاء مجلد data/archive داخل المشروع ووضع ملفاتك فيه.');
    return;
  }

  const files = fs.readdirSync(dataDirectory).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (files.length === 0) {
    console.log('⚠️ لم يتم العثور على ملفات مدعومة في المجلد.');
    return;
  }

  // إحصائيات الصيغ
  const extCounts: Record<string, number> = {};
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }
  console.log(`📚 تم العثور على ${files.length} ملف:`);
  for (const [ext, count] of Object.entries(extCounts)) {
    console.log(`   ${ext}: ${count} ملف`);
  }
  console.log('');

  let successCount = 0;
  let failCount = 0;
  let totalChunks = 0;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(dataDirectory, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const title = fileName.replace(/\.(pdf|txt|docx|doc|html|htm)$/i, '');
    const slug = `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      console.log(`[${i + 1}/${files.length}] ⏳ ${title} (${ext})`);

      // 1. استخراج النص
      const content = await readFileContent(filePath);

      if (!content || content.trim().length < 20) {
        console.log(`  ⚠️ تخطي — محتوى فارغ أو قصير جداً`);
        failCount++;
        continue;
      }

      // 2. تحديد النوع تلقائياً
      const docType = detectDocumentType(fileName, content.length);

      // 3. إنشاء الوثيقة
      const document = await prisma.sourceDocument.create({
        data: {
          title,
          slug,
          type: docType,
          searchableText: content,
          language: 'ar',
          verificationState: 'verified',
        }
      });

      // 4. تقطيع النص
      const textChunks = chunkText(content);

      // 5. إدخال المقاطع
      const chunkPromises = textChunks.map((chunk, index) => {
        return prisma.sourceChunk.create({
          data: {
            documentId: document.id,
            ordinal: index + 1,
            text: chunk,
            cleanText: chunk.replace(/[^\w\s\u0600-\u06FF]/g, ' '),
          }
        });
      });

      await Promise.all(chunkPromises);
      totalChunks += textChunks.length;
      successCount++;
      console.log(`  ✅ نوع: ${docType} | ${textChunks.length} مقطع | ${content.length} حرف`);

    } catch (error) {
      failCount++;
      console.error(`  ❌ خطأ:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`🎉 انتهت عملية الاستيراد!`);
  console.log(`   ✅ نجح: ${successCount} ملف`);
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
