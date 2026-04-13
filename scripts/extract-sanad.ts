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

const EXTRACTION_PROMPT = `أنت باحث متخصص في تراجم العلماء والأسانيد العلمية الكويتية والخليجية.

من النص التالي، استخرج:
1. أسماء العلماء والشيوخ والمؤلفين المذكورين.
2. العلاقات العلمية بينهم (شيخ وتلميذ، إجازة، تعلّم على يد...).

أخرج النتيجة بصيغة JSON فقط:
{
  "scholars": ["اسم العالم الأول", "اسم العالم الثاني"],
  "relationships": [
    {
      "teacher": "اسم الشيخ",
      "student": "اسم التلميذ",
      "type": "إجازة أو تلمذة أو رواية",
      "context": "النص الأصلي الذي يثبت العلاقة"
    }
  ]
}

إذا لم تجد علاقات واضحة، أخرج مصفوفات فارغة.
لا تختلق أسماء أو علاقات غير موجودة في النص.

النص:
`;

interface SanadExtractionResult {
  scholars: string[];
  relationships: Array<{
    teacher: string;
    student: string;
    type?: string;
    context?: string;
  }>;
}

async function buildSanadForDocument(documentId: number) {
  const doc = await prisma.sourceDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { scholars: 0, edges: 0 };

  // أخذ أول 5000 حرف (حد السياق)
  const textForAnalysis = doc.searchableText.substring(0, 5000);
  if (textForAnalysis.trim().length < 50) return { scholars: 0, edges: 0 };

  const result = await model.generateContent(EXTRACTION_PROMPT + textForAnalysis);
  const data: SanadExtractionResult = JSON.parse(result.response.text());

  if (!data.scholars?.length) return { scholars: 0, edges: 0 };

  // إنشاء أو استرجاع العقد (العلماء)
  const nodeMap = new Map<string, number>();

  for (const name of data.scholars) {
    const trimmedName = name.trim();
    if (!trimmedName) continue;

    let node = await prisma.sanadNode.findFirst({
      where: { canonicalName: trimmedName },
    });

    if (!node) {
      node = await prisma.sanadNode.create({
        data: { canonicalName: trimmedName, displayName: trimmedName },
      });
    }

    nodeMap.set(trimmedName, node.id);
  }

  // إنشاء الروابط (العلاقات)
  let edgesCreated = 0;

  for (const rel of data.relationships || []) {
    const teacherId = nodeMap.get(rel.teacher?.trim());
    const studentId = nodeMap.get(rel.student?.trim());

    if (!teacherId || !studentId || teacherId === studentId) continue;

    // تجنب التكرار
    const existing = await prisma.sanadEdge.findFirst({
      where: { fromNodeId: teacherId, toNodeId: studentId },
    });

    if (!existing) {
      await prisma.sanadEdge.create({
        data: {
          fromNodeId: teacherId,
          toNodeId: studentId,
          sourceText: rel.context?.substring(0, 500) ?? null,
        },
      });
      edgesCreated++;
    }
  }

  return { scholars: nodeMap.size, edges: edgesCreated };
}

async function main() {
  console.log('🔗 بدء استخراج الأسانيد وشبكة العلماء...');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ مفتاح GOOGLE_API_KEY غير موجود في ملف .env');
    return;
  }

  // استخراج من جميع الوثائق
  const documents = await prisma.sourceDocument.findMany({
    select: { id: true, title: true },
    orderBy: { id: 'asc' },
  });

  if (documents.length === 0) {
    console.log('⚠️ لا توجد وثائق في القاعدة. شغّل import-data.ts أولاً.');
    return;
  }

  console.log(`📚 معالجة ${documents.length} وثيقة...\n`);

  let totalScholars = 0;
  let totalEdges = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    try {
      console.log(`[${i + 1}/${documents.length}] ⏳ ${doc.title}`);
      const result = await buildSanadForDocument(doc.id);
      totalScholars += result.scholars;
      totalEdges += result.edges;

      if (result.scholars > 0) {
        console.log(`  ✅ ${result.scholars} عالم | ${result.edges} علاقة`);
      } else {
        console.log(`  ⚪ لم يتم العثور على أسانيد`);
      }
    } catch (error) {
      console.error(`  ❌ خطأ:`, error instanceof Error ? error.message : error);
    }
  }

  // إحصائيات نهائية
  const uniqueScholars = await prisma.sanadNode.count();
  const uniqueEdges = await prisma.sanadEdge.count();

  console.log('\n═══════════════════════════════════════');
  console.log(`🎉 انتهى استخراج الأسانيد!`);
  console.log(`   👤 إجمالي العلماء في القاعدة: ${uniqueScholars}`);
  console.log(`   🔗 إجمالي العلاقات: ${uniqueEdges}`);
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
