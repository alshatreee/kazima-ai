# تسليم المبرمج - النظام الهجين لكاظمة

## الملخص

تم تحويل مشروع `kazima-ai` إلى نظام هجين يعمل بثلاثة أوضاع:

1. `من كاظمة فقط`
   - استرجاع مجاني من محتوى كاظمة فقط
   - بدون أي API أو ذكاء اصطناعي
2. `مختصر ذكي`
   - يبدأ بالاسترجاع من كاظمة
   - ثم يحاول تقديم جواب مختصر موثق إذا توفر `ANTHROPIC_API_KEY`
   - وإذا لم يتوفر المفتاح، يعود تلقائيًا إلى نتائج كاظمة فقط
3. `باحث ذكي`
   - نفس المنطق، لكن بتحليل أطول وبنية بحثية أكثر
   - مع fallback تلقائي إلى نتائج الاسترجاع فقط عند غياب المفتاح أو فشل الرد الذكي

الهدف من هذا البناء:

- إبقاء الجزء الأساسي مجانيًا وقابلًا للاستخدام دائمًا
- ضمان أن يبدأ أي تحليل من مصادر كاظمة أولًا
- منع تعطل الواجهة في حال غياب مفتاح Anthropic

---

## ما تم تنفيذه

### 1. تحديث عقد المساعد

تم تعديل الملف:

- `src/lib/kazima-assistant-contract.ts`

التغييرات:

- إضافة الوضع `retrieve`
- تحديث `assistantResponseModes` لتصبح:
  - `retrieve`
  - `brief`
  - `research`
- إضافة helper جديدة:
  - `isAssistantAiMode(mode)`

الغرض:

- تمكين التمييز بين الوضع المجاني ووضعي الذكاء الاصطناعي
- الإبقاء على عقد استجابة موحد في كل الحالات

---

### 2. إعادة بناء طبقة الاسترجاع

تم تعديل الملف:

- `src/lib/kazima-retrieval.ts`

التغييرات:

- تنظيف النصوص من HTML
- تحسين تقسيم الكلمات المفتاحية
- احتساب score بسيط مبني على:
  - العنوان
  - `contentShort`
  - `contentLong`
- إضافة `url` لكل مصدر مسترجع
- دعم فلترة `contentTypes`
- ترتيب النتائج ثم تقطيعها حسب `maxSources`

الناتج:

- استرجاع نتائج من قاعدة كاظمة صالح للاستخدام المجاني
- نفس النتائج تُستخدم لاحقًا في الوضعين الذكيين

---

### 3. بناء route هجينة موحدة

تم إعادة كتابة الملف:

- `src/app/api/kazima-assistant/query/route.ts`

منطق التشغيل الجديد:

#### إذا كان `mode = retrieve`

- يتم استدعاء `retrieveFromTopics`
- يتم إرجاع:
  - `summary`
  - `answer`
  - `sections`
  - `citations`
  - `readMore`
  - `followUpQuestions`
  - `retrieval`

بدون أي استخدام لـ Anthropic

#### إذا كان `mode = brief | research`

- يبدأ بالاسترجاع من كاظمة
- إذا كان `ANTHROPIC_API_KEY` موجودًا:
  - يتم إرسال المصادر المسترجعة إلى Anthropic
  - يتم توليد إجابة موثقة
- إذا لم يكن المفتاح موجودًا:
  - يتم fallback تلقائي إلى نتائج كاظمة فقط
- إذا فشل parsing لرد الذكاء الاصطناعي:
  - يتم fallback تلقائي كذلك

Helpers المضافة داخل route:

- `toDefaultCitations`
- `toReadMore`
- `buildRetrievalSummaryAnswer`
- `buildRetrievalOnlyResponse`
- `sanitizeAiResponse`

---

### 4. تحديث أنواع الواجهة

تم تعديل الملف:

- `src/components/kazima-ai/types.ts`

التغييرات:

- حذف الأنماط القديمة
- اعتماد الأنماط الجديدة:
  - `retrieve`
  - `brief`
  - `research`
- إضافة `cost` في `ModeCard`

---

### 5. تحديث بيانات الأوضاع والمحتوى الثابت

تم تعديل الملف:

- `src/components/kazima-ai/data.ts`

التغييرات:

- تعريف الأوضاع الثلاثة الجديدة
- إظهار تكلفة كل وضع:
  - `بدون API`
  - `اختياري`
- تحديث:
  - `METRICS`
  - `WORKFLOW_STEPS`
  - `RESEARCH_PILLARS`
  - `CONFIDENCE_LEVELS`

الغرض:

- مواءمة النصوص مع النظام الهجين بدل الأنماط البحثية القديمة

---

### 6. تحديث اختيار الأوضاع

تم تعديل الملف:

- `src/components/kazima-ai/ModeSelector.tsx`

التغييرات:

- إبقاء اختيار الوضع كبطاقات
- إضافة شارة تكلفة لكل وضع

---

### 7. إعادة بناء نموذج الإدخال

تم تعديل الملف:

- `src/components/kazima-ai/ComposerSection.tsx`

التغييرات:

- تحويل الإدخال من "تحليل نص" إلى "سؤال/استعلام"
- تحديث placeholder والنصوص
- جعل الحقل الإضافي يمثل:
  - هدف السؤال
  - أو سياق الاستخدام
- مواءمة زر التنفيذ مع الوضع المختار

---

### 8. تحديث Hero

تم تعديل الملف:

- `src/components/kazima-ai/HeroSection.tsx`

التغييرات:

- تغيير العنوان إلى `مساعد كاظمة الهجين`
- شرح أن النظام:
  - يبدأ من كاظمة
  - ويضيف الذكاء الاصطناعي عند الحاجة فقط
- تحديث الإحصاءات والنصوص

---

### 9. تحديث Sidebar

تم تعديل الملف:

- `src/components/kazima-ai/SidebarPanels.tsx`

التغييرات:

- شرح طريقة استخدام النظام الهجين
- شرح لماذا هذا البناء مناسب
- شرح معنى درجات الثقة

---

### 10. إعادة بناء عرض النتائج

تم تعديل الملف:

- `src/components/kazima-ai/ResultsSection.tsx`

التغييرات:

- لم يعد يعرض `result` كنص خام
- أصبح يعرض:
  - `scope`
  - `confidence`
  - `summary`
  - `answer`
  - `sections`
  - `citations`
  - `readMore`
  - `followUpQuestions`
  - `retrieval.returnedSources`

تمت إضافة labels مساعدة:

- `scopeLabel`
- `confidenceLabel`

---

### 11. إعادة بناء الصفحة الرئيسية

تم تعديل الملف:

- `src/app/page.tsx`

التغييرات:

- اعتماد الأوضاع الثلاثة الجديدة
- إرسال الطلبات إلى:
  - `/api/kazima-assistant/query`
- تخزين النتيجة كبنية:
  - `AssistantQueryResponse | null`
- إضافة `serializeResult` لنسخ النتيجة بشكل منظم
- تمرير النتيجة إلى `ResultsSection`

---

## الملفات المعدلة أو الجديدة

### ملفات منطقية / API

- `src/lib/kazima-assistant-contract.ts`
- `src/lib/kazima-retrieval.ts`
- `src/lib/kazima-scholar-prompts.ts`
- `src/app/api/kazima-assistant/query/route.ts`
- `src/app/api/kazima-assistant/retrieve/route.ts`

### مكونات واجهة

- `src/app/page.tsx`
- `src/components/kazima-ai/types.ts`
- `src/components/kazima-ai/data.ts`
- `src/components/kazima-ai/ModeSelector.tsx`
- `src/components/kazima-ai/ComposerSection.tsx`
- `src/components/kazima-ai/HeroSection.tsx`
- `src/components/kazima-ai/SidebarPanels.tsx`
- `src/components/kazima-ai/ResultsSection.tsx`

### ملفات توثيق

- `README.md`
- `docs/kazima-ai/README.md`
- `docs/kazima-ai/BUILD-SPEC.ar.md`
- `docs/kazima-ai/openapi.yaml`
- `docs/kazima-ai/proposed-prisma-schema.prisma`

---

## سلوك النظام الحالي

### عند غياب `ANTHROPIC_API_KEY`

- `retrieve` يعمل بالكامل
- `brief` يعمل لكن يعود إلى نتائج كاظمة فقط
- `research` يعمل لكن يعود إلى نتائج كاظمة فقط
- لا تتعطل الصفحة

### عند وجود `ANTHROPIC_API_KEY`

- `retrieve` يظل مجانيًا
- `brief` يستخدم الاسترجاع أولًا ثم Anthropic
- `research` يستخدم الاسترجاع أولًا ثم Anthropic

---

## التحقق

### نجح

- `tsc --noEmit`

### لم ينجح

- `npm run build`

السبب:

- البيئة المحلية الحالية فيها مشكلة في تثبيت الحزم أو روابط `.bin`
- ظهرت مشاكل مثل:
  - `prisma is not recognized`
  - وبعض حزم `node_modules` تبدو غير مكتملة

مهم:

- هذا لا يعني أن التعديلات TypeScript خاطئة
- فقط أن البيئة الحالية تحتاج إصلاحًا قبل اختبار build/run النهائي

---

## المطلوب من المبرمج الآن

1. إعادة تثبيت الحزم أو إصلاح `node_modules`
2. تشغيل المشروع محليًا
3. اختبار الأوضاع الثلاثة:
   - `retrieve`
   - `brief`
   - `research`
4. التحقق من صحة روابط `url` في المصادر المسترجعة بالنسبة لبنية كاظمة الحقيقية
5. لاحقًا يمكن إضافة:
   - دعم `Ollama` محلي بدل Anthropic
   - استرجاع أوسع من `topics` فقط
   - زر مستقل "حلل بالذكاء الاصطناعي"

---

## مكان الملفات في الجهاز

المشروع موجود في:

- `C:\Users\xman9\OneDrive\Desktop\Desktop\Desktop\كاظمة\أعمال كاظمة\kazima-ai`

وهذا الملف نفسه موجود في:

- `C:\Users\xman9\OneDrive\Desktop\Desktop\Desktop\كاظمة\أعمال كاظمة\kazima-ai\docs\kazima-ai\HYBRID-HANDOFF.ar.md`
