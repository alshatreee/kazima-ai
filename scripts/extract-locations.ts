import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

const EXTRACTION_PROMPT = `أنت باحث جغرافي متخصص في تاريخ الكويت والخليج العربي.

من النص التالي، استخرج جميع المعالم والمواقع الجغرافية المذكورة.
لكل موقع، حدد إحداثياته التقريبية (خط العرض وخط الطول) إذا كان معروفاً.

أخرج النتيجة بصيغة JSON فقط:
{
  "locations": [
    {
      "name": "اسم المعلم أو الموقع",
      "type": "مسجد | مدرسة | سوق | حي | ميناء | جزيرة | منطقة | أخرى",
      "lat": 29.3759,
      "lng": 47.9774,
      "context": "الجملة الأصلية التي ذُكر فيها الموقع"
    }
  ]
}

إذا لم تعرف الإحداثيات الدقيقة لموقع كويتي قديم، استخدم إحداثيات تقريبية لمنطقة الكويت (lat: 29.37, lng: 47.98).
إذا لم تجد مواقع، أخرج مصفوفة فارغة.
لا تختلق مواقع غير مذكورة في النص.

النص:
`;

interface LocationResult {
  locations: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
    context: string;
  }>;
}

async function extractLocationsForDocument(documentId: number) {
  const doc = await prisma.sourceDocument.findUnique({ where: { id: documentId } });
  if (!doc) return 0;

  const textForAnalysis = doc.searchableText.substring(0, 5000);
  if (textForAnalysis.trim().length < 50) return 0;

  const result = await model.generateContent(EXTRACTION_PROMPT + textForAnalysis);
  const data: LocationResult = JSON.parse(result.response.text());

  if (!data.locations?.length) return 0;

  let saved = 0;

  for (const loc of data.locations) {
    if (!loc.name?.trim()) continue;

    // تحقق من عدم التكرار
    const existing = await prisma.sourceMetadata.findFirst({
      where: {
        documentId,
        key: `location:${loc.name.trim()}`,
      },
    });

    if (!existing) {
      await prisma.sourceMetadata.create({
        data: {
          documentId,
          key: `location:${loc.name.trim()}`,
          value: JSON.stringify({
            name: loc.name,
            type: loc.type || 'أخرى',
            lat: loc.lat,
            lng: loc.lng,
            context: loc.context?.substring(0, 300) ?? '',
          }),
        },
      });
      saved++;
    }
  }

  return saved;
}

async function main() {
  console.log('🗺️  بدء استخراج المواقع الجغرافية...');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ مفتاح GOOGLE_API_KEY غير موجود في ملف .env');
    return;
  }

  const documents = await prisma.sourceDocument.findMany({
    select: { id: true, title: true },
    orderBy: { id: 'asc' },
  });

  if (documents.length === 0) {
    console.log('⚠️ لا توجد وثائق في القاعدة. شغّل import-data.ts أولاً.');
    return;
  }

  console.log(`📚 معالجة ${documents.length} وثيقة...\n`);

  let totalLocations = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    try {
      console.log(`[${i + 1}/${documents.length}] ⏳ ${doc.title}`);
      const count = await extractLocationsForDocument(doc.id);
      totalLocations += count;

      if (count > 0) {
        console.log(`  ✅ ${count} موقع`);
      } else {
        console.log(`  ⚪ لم يتم العثور على مواقع`);
      }
    } catch (error) {
      console.error(`  ❌ خطأ:`, error instanceof Error ? error.message : error);
    }
  }

  // إحصائيات نهائية
  const allLocations = await prisma.sourceMetadata.count({
    where: { key: { startsWith: 'location:' } },
  });

  console.log('\n═══════════════════════════════════════');
  console.log(`🎉 انتهى الاستخراج!`);
  console.log(`   📍 إجمالي المواقع في القاعدة: ${allLocations}`);
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
