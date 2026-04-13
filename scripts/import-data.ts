import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// إعدادات التقطيع
const MAX_CHUNK_LENGTH = 1200; // أقصى عدد حروف للمقطع الواحد للحفاظ على سياق Gemini

// دالة لتقطيع النص الأكاديمي بشكل ذكي يحافظ على الفقرات
function chunkText(text: string): string[] {
  // تقسيم النص بناءً على المسافات المزدوجة (الفقرات)
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

// الدالة الرئيسية للقراءة والرفع
async function main() {
  console.log('🚀 بدء عملية استيراد الأرشيف إلى كاظمة...');

  // تحديد المجلد الذي يحتوي على الملفات النصية (يجب إنشاء هذا المجلد ووضع بعض الملفات فيه)
  const dataDirectory = path.join(process.cwd(), 'data', 'archive');

  if (!fs.existsSync(dataDirectory)) {
    console.error(`❌ المجلد غير موجود: ${dataDirectory}`);
    console.log('يرجى إنشاء مجلد data/archive داخل المشروع ووضع ملفاتك النصية (.txt) فيه.');
    return;
  }

  const files = fs.readdirSync(dataDirectory).filter(f => f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('⚠️ لم يتم العثور على ملفات نصية في المجلد.');
    return;
  }

  console.log(`📚 تم العثور على ${files.length} ملف، جاري المعالجة...`);

  for (const fileName of files) {
    const filePath = path.join(dataDirectory, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');

    // استخراج العنوان من اسم الملف (بدون امتداد .txt)
    const title = fileName.replace('.txt', '');
    const slug = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      console.log(`⏳ جاري رفع: ${title}`);

      // 1. إنشاء الوثيقة الأساسية في قاعدة البيانات
      const document = await prisma.sourceDocument.create({
        data: {
          title: title,
          slug: slug,
          type: 'article', // يمكن تغييرها إلى 'book' أو 'manuscript' حسب الحاجة
          searchableText: content,
          language: 'ar',
          verificationState: 'verified', // تعيين كـ "موثق"
        }
      });

      // 2. تقطيع النص
      const textChunks = chunkText(content);

      // 3. إدخال المقاطع وربطها بالوثيقة
      const chunkPromises = textChunks.map((chunk, index) => {
        return prisma.sourceChunk.create({
          data: {
            documentId: document.id,
            ordinal: index + 1,
            text: chunk,
            cleanText: chunk.replace(/[^\w\s\u0600-\u06FF]/g, ' '), // تنظيف أولي للرموز
          }
        });
      });

      await Promise.all(chunkPromises);
      console.log(`✅ تم الرفع بنجاح وتقطيع الملف إلى ${textChunks.length} مقطع.`);

    } catch (error) {
      console.error(`❌ خطأ أثناء رفع ملف ${fileName}:`, error);
    }
  }

  console.log('🎉 تمت عملية الاستيراد بالكامل!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
