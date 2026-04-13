import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

const OCR_PROMPT = `أنت محقق مخطوطات عربية خبير. المطلوب منك:
1. استخرج النص الكامل من هذه الصورة بالعربية.
2. حافظ على ترتيب السطور الأصلي.
3. استخدم تنسيق Markdown للعناوين والفقرات.
4. إذا واجهت كلمة ممسوحة أو غير مقروءة، ضع [غير مقروءة] مكانها.
5. إذا كان هناك حاشية أو تعليق جانبي، ضعه بين قوسين مربعين [حاشية: ...].
6. لا تضف أي نص من عندك — فقط ما هو مكتوب في الصورة.`;

function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

async function processPage(
  imagePath: string,
  mimeType: string,
  asset: { id: number },
  pageNum: number,
) {
  const result = await model.generateContent([
    OCR_PROMPT,
    fileToGenerativePart(imagePath, mimeType),
  ]);
  const extractedText = result.response.text();

  // تحقق إذا الصفحة موجودة مسبقاً
  const existing = await prisma.manuscriptPage.findUnique({
    where: { assetId_pageNumber: { assetId: asset.id, pageNumber: pageNum } },
  });

  if (existing) {
    await prisma.manuscriptPage.update({
      where: { id: existing.id },
      data: { ocrText: extractedText, confidence: 0.95 },
    });
  } else {
    await prisma.manuscriptPage.create({
      data: {
        assetId: asset.id,
        pageNumber: pageNum,
        imagePath,
        ocrText: extractedText,
        confidence: 0.95,
      },
    });
  }

  return extractedText;
}

async function main() {
  console.log('🔍 بدء القراءة البصرية للمخطوطات...');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ مفتاح GOOGLE_API_KEY غير موجود في ملف .env');
    return;
  }

  const manuscriptsDir = path.join(process.cwd(), 'data', 'manuscripts');

  if (!fs.existsSync(manuscriptsDir)) {
    console.error(`❌ المجلد غير موجود: ${manuscriptsDir}`);
    console.log('أنشئ مجلد data/manuscripts/ وضع فيه مجلدات فرعية لكل مخطوطة.');
    console.log('مثال: data/manuscripts/مخطوطة-الفقه/page-001.jpg');
    return;
  }

  // كل مجلد فرعي = مخطوطة واحدة
  const subDirs = fs.readdirSync(manuscriptsDir).filter((name) => {
    return fs.statSync(path.join(manuscriptsDir, name)).isDirectory();
  });

  if (subDirs.length === 0) {
    // إذا ما فيه مجلدات فرعية، ابحث عن صور مباشرة
    const directImages = fs.readdirSync(manuscriptsDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ext in SUPPORTED_IMAGE_TYPES;
    });

    if (directImages.length === 0) {
      console.log('⚠️ لم يتم العثور على صور مخطوطات.');
      console.log('ضع الصور في data/manuscripts/ أو في مجلدات فرعية.');
      return;
    }

    // معالجة الصور المباشرة كمخطوطة واحدة
    subDirs.push('.');
  }

  let totalPages = 0;

  for (const dirName of subDirs) {
    const dirPath = dirName === '.' ? manuscriptsDir : path.join(manuscriptsDir, dirName);
    const title = dirName === '.' ? 'مخطوطة بدون عنوان' : dirName;

    const images = fs.readdirSync(dirPath)
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ext in SUPPORTED_IMAGE_TYPES;
      })
      .sort(); // ترتيب أبجدي للحفاظ على تسلسل الصفحات

    if (images.length === 0) continue;

    console.log(`\n📖 مخطوطة: ${title} (${images.length} صفحة)`);

    // إنشاء وثيقة المخطوطة
    const slug = `manuscript-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const document = await prisma.sourceDocument.create({
      data: {
        title,
        slug,
        type: 'manuscript',
        searchableText: '',
        language: 'ar',
        verificationState: 'unreviewed',
      },
    });

    // إنشاء أصل المخطوطة
    const asset = await prisma.manuscriptAsset.create({
      data: {
        documentId: document.id,
        storagePath: dirPath,
        mimeType: 'image/jpeg',
        pageCount: images.length,
        ocrStatus: 'processing',
        ocrEngine: 'Gemini-2.5-Flash-Vision',
      },
    });

    let allText = '';

    for (let i = 0; i < images.length; i++) {
      const imageName = images[i];
      const imagePath = path.join(dirPath, imageName);
      const ext = path.extname(imageName).toLowerCase();
      const mimeType = SUPPORTED_IMAGE_TYPES[ext];
      const pageNum = i + 1;

      try {
        console.log(`  [${pageNum}/${images.length}] ⏳ ${imageName}`);
        const text = await processPage(imagePath, mimeType, asset, pageNum);
        allText += `\n\n--- صفحة ${pageNum} ---\n\n${text}`;
        totalPages++;
        console.log(`  ✅ تم (${text.length} حرف)`);
      } catch (error) {
        console.error(`  ❌ خطأ:`, error instanceof Error ? error.message : error);
      }
    }

    // تحديث النص الكامل للوثيقة وحالة OCR
    await prisma.sourceDocument.update({
      where: { id: document.id },
      data: { searchableText: allText.trim() },
    });

    await prisma.manuscriptAsset.update({
      where: { id: asset.id },
      data: { ocrStatus: 'completed' },
    });

    console.log(`  📄 تم حفظ ${images.length} صفحة للمخطوطة`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`🎉 انتهت المعالجة! إجمالي الصفحات: ${totalPages}`);
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
