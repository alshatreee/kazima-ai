# دليل المبرمج الشامل — موقع كاظمة kazima.org

> تاريخ التحديث: 24 أبريل 2026
> الفرع: `claude/fix-kadhma-imports-prisma-x9hdA`
> المستودع: `alshatreee/kazima-ai`

---

## جدول المحتويات

1. [نظرة عامة على المشاكل](#1-نظرة-عامة)
2. [معلومات السيرفر](#2-معلومات-السيرفر)
3. [المهمة 1: إصلاح اتصال قاعدة البيانات (عاجل)](#3-المهمة-1)
4. [المهمة 2: نشر تحديثات Next.js](#4-المهمة-2)
5. [المهمة 3: قالب عرض المقال الفردي (PHP)](#5-المهمة-3)
6. [المهمة 4: تصميم المكتبة الرقمية (PHP)](#6-المهمة-4)
7. [خريطة الملفات](#7-خريطة-الملفات)
8. [اختبارات التحقق](#8-اختبارات-التحقق)

---

## 1. نظرة عامة

الموقع يتكون من جزئين:

| الجزء | التقنية | المسار على السيرفر |
|-------|---------|-------------------|
| الموقع الرئيسي (المقالات، المكتبة) | WebsiteBaker 2.10 PHP | `/home/kazima.org/public_html/` |
| المساعد البحثي (AI + API) | Next.js 16 + Prisma | `/home/kazima.org/kazima-ai-new/` |

**المشاكل المتبقية:**
- [ ] Next.js API يعيد 500 بسبب رفض مصادقة MySQL (auth plugin)
- [ ] صفحات المقالات الفردية فارغة (PHP — ينقص قالب view.topic.php)
- [ ] تصميم المكتبة الرقمية (PHP — ينتظر تنفيذ SQL)

---

## 2. معلومات السيرفر

```
السيرفر:    srv1542417 (CentOS)
IP:         72.62.74.154
الوصول:     SSH root
MariaDB:    10.11.16
Node.js:    v20.20.2
PM2:        يدير kazima-ai على port 3000
LiteSpeed:  يوجّه kazima.org → port 3000
```

**بيانات قاعدة البيانات (من config.php):**
```
Host:     localhost
Port:     3306
Database: kazi_gasorg_system
User:     kazi_gasorg_admin
Password: 6b1uThcdMOxSkGnnV7q0
```

---

## 3. المهمة 1: إصلاح اتصال قاعدة البيانات (عاجل)

### المشكلة
Next.js (عبر Prisma) و Node.js (عبر mariadb driver) لا يستطيعان الاتصال بقاعدة البيانات رغم أن MySQL CLI يعمل بنفس البيانات. الخطأ:
```
Authentication failed against database server,
the provided database credentials for 'kazi_gasorg_admin' are not valid.
```

### السبب المرجّح
MariaDB 10.11 قد يستخدم auth plugin غير مدعوم من Node.js (مثل `ed25519` بدل `mysql_native_password`).

### خطوات الإصلاح

```bash
# 1) تحقق من الـ auth plugin
mysql -e "SELECT user,host,plugin FROM mysql.user WHERE user='kazi_gasorg_admin';"
```

**إذا كان الـ plugin هو `ed25519` أو أي شيء غير `mysql_native_password`:**

```bash
# 2) غيّره إلى mysql_native_password
mysql -e "ALTER USER 'kazi_gasorg_admin'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('6b1uThcdMOxSkGnnV7q0');"
mysql -e "FLUSH PRIVILEGES;"
```

**أو أنشئ مستخدم جديد مخصص لـ Next.js:**

```bash
mysql -e "
CREATE USER 'kazima_next'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('KazimaNext2026Secure');
CREATE USER 'kazima_next'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('KazimaNext2026Secure');
GRANT ALL PRIVILEGES ON kazi_gasorg_system.* TO 'kazima_next'@'localhost';
GRANT ALL PRIVILEGES ON kazi_gasorg_system.* TO 'kazima_next'@'127.0.0.1';
FLUSH PRIVILEGES;
"
```

ثم عدّل `.env`:
```bash
cd /home/kazima.org/kazima-ai-new
sed -i 's|^DATABASE_URL=.*|DATABASE_URL="mysql://kazima_next:KazimaNext2026Secure@127.0.0.1:3306/kazi_gasorg_system"|' .env
```

### التحقق

```bash
# اختبر من Node.js مباشرة
cd /home/kazima.org/kazima-ai-new
node -e "
const m=require('mariadb');
(async()=>{
  const c=await m.createConnection({host:'127.0.0.1',port:3306,user:'kazima_next',password:'KazimaNext2026Secure',database:'kazi_gasorg_system'});
  const r=await c.query('SELECT COUNT(*) as cnt FROM wb_mod_topics');
  console.log('SUCCESS:', JSON.stringify(r));
  c.end();
})()
"
```

إذا ظهر `SUCCESS` → أعد تشغيل التطبيق:
```bash
pm2 restart kazima-ai --update-env
sleep 3
curl -s "http://localhost:3000/api/topics?limit=2" | head -c 300
```

---

## 4. المهمة 2: نشر تحديثات Next.js

### ما تم تعديله (الفرع جاهز على GitHub)

**الفرع:** `claude/fix-kadhma-imports-prisma-x9hdA`

**Commits:**
```
6f235fd fix: add contentLong to TopicItem interface in author page
097a7fc feat: add detail pages for book, article, author, and video
10451c9 fix(prisma): revert to classic prisma-client-js generator
```

**الملفات المعدّلة (10 ملفات، 1216 إضافة):**

| الملف | نوع التعديل | الوظيفة |
|-------|------------|---------|
| `prisma/schema.prisma` | معدّل | generator → prisma-client-js + إضافة url |
| `src/lib/prisma.ts` | معدّل | إزالة adapter، استيراد من @prisma/client |
| `src/lib/topic-helpers.ts` | جديد | دوال مساعدة (stripHtml, formatDate, ...) |
| `src/app/globals.css` | معدّل | إضافة أنماط .kz-* لصفحات التفاصيل |
| `src/app/api/topics/route.ts` | جديد | GET /api/topics?author=X&optionId=Y |
| `src/app/api/topics/[id]/route.ts` | جديد | GET /api/topics/:id |
| `src/app/pages/book/[id]/page.tsx` | جديد | صفحة تفاصيل الكتاب |
| `src/app/pages/article/[id]/page.tsx` | جديد | صفحة تفاصيل المقالة |
| `src/app/pages/author/[id]/page.tsx` | جديد | صفحة تفاصيل المؤلف |
| `src/app/pages/video/[id]/page.tsx` | جديد | صفحة تفاصيل الفيديو |

### خطوات النشر

```bash
cd /home/kazima.org/kazima-ai-new

# سحب آخر تحديث
git fetch origin
git checkout claude/fix-kadhma-imports-prisma-x9hdA
git pull origin claude/fix-kadhma-imports-prisma-x9hdA

# تأكد من الـ commits
git log --oneline -4
# المتوقع:
# 6f235fd fix: add contentLong to TopicItem interface in author page
# 097a7fc feat: add detail pages for book, article, author, and video
# 10451c9 fix(prisma): revert to classic prisma-client-js generator
# b98d709 Update kazima-retrieval.ts...

# تنظيف + بناء
rm -rf .next node_modules/.prisma node_modules/@prisma/client src/generated
npx prisma generate
npm run build

# إعادة تشغيل
pm2 restart kazima-ai --update-env
```

### الصفحات الجديدة بعد النشر

```
/pages/book/[id]     — صفحة الكتاب (غلاف، مؤلف، وصف، حفظ بالمفضلة)
/pages/article/[id]  — صفحة المقالة (نص كامل، مقالات ذات صلة)
/pages/author/[id]   — صفحة المؤلف (نبذة، كتبه، مقالاته) — يقبل اسم أو ID
/pages/video/[id]    — صفحة الفيديو (YouTube/Vimeo embed، مقاطع ذات صلة)
/api/topics?limit=N  — API لقائمة المقالات
/api/topics/:id      — API لمقال واحد
```

---

## 5. المهمة 3: قالب عرض المقال الفردي (PHP)

### المشكلة
صفحات `/pages/topics/SLUG.php` تظهر فارغة — هيدر وفوتر بدون محتوى.

### الملف الجاهز
موجود في اللابتوب (جذر مستودع kazima-ai):
```
view.topic.php
```

### خطوات التطبيق

```bash
# انسخ الملف من مجلد المشروع لمجلد الموديل
cp /home/kazima.org/kazima-ai-new/view.topic.php \
   /home/kazima.org/public_html/modules/topics/view.topic.php

# اضبط الصلاحيات (استبدل www-data بالمستخدم الصحيح إن اختلف)
chown nobody:nobody /home/kazima.org/public_html/modules/topics/view.topic.php
chmod 644 /home/kazima.org/public_html/modules/topics/view.topic.php
```

### ما يعرضه القالب
- عنوان المقال (h1 ذهبي #D4AC0D)
- التصنيف (badge)
- تاريخ النشر + اسم المؤلف + عدد المشاهدات
- صورة المقال (إن وُجدت)
- المحتوى الكامل (content_long) — تنسيق قراءة: line-height 2.2
- الكلمات المفتاحية (tags)
- زر الرجوع

### التصميم
متوافق مع الثيم الأزرق الداكن:
- خلفية: `#0a1628`
- نصوص: `#ECF0F1`
- عناوين/روابط: `#D4AC0D` ذهبي
- متجاوب مع الجوال

### اختبار
```
https://kazima.org/pages/topics/أي-slug.php
```

---

## 6. المهمة 4: تصميم المكتبة الرقمية (PHP)

### المشكلة
بطاقات الكتب في صفحة المكتبة تظهر فارغة — الصورة تغطي العنوان.

### الملف الجاهز
```
/tmp/lib_v4.php    (على السيرفر)
```

### تم تنفيذه بالفعل ✓
```bash
# هذا الأمر تم تنفيذه بنجاح — 1 row updated
php -r "\$c=file_get_contents('/tmp/lib_v4.php');
\$db=new mysqli('localhost','kazi_gasorg_admin','6b1uThcdMOxSkGnnV7q0','kazi_gasorg_system');
\$db->query('UPDATE wb_mod_code SET content=\''.addslashes(\$c).'\' WHERE section_id=675');
echo \$db->affected_rows.' rows updated'.PHP_EOL;"
```

### للتحقق فقط
افتح صفحة المكتبة في المتصفح وتأكد أن بطاقات الكتب تعرض العنوان بشكل صحيح.

---

## 7. خريطة الملفات

### ملفات على اللابتوب (مستودع kazima-ai)

```
kazima-ai/
├── view.topic.php                          ← قالب المقال الفردي (PHP)
│
├── prisma/
│   └── schema.prisma                       ← معدّل: prisma-client-js + url
│
├── src/
│   ├── lib/
│   │   ├── prisma.ts                       ← معدّل: بدون adapter
│   │   └── topic-helpers.ts                ← جديد: دوال مساعدة
│   │
│   └── app/
│       ├── globals.css                     ← معدّل: أنماط .kz-*
│       │
│       ├── api/topics/
│       │   ├── route.ts                    ← جديد: GET /api/topics
│       │   └── [id]/route.ts              ← جديد: GET /api/topics/:id
│       │
│       └── pages/
│           ├── book/[id]/page.tsx          ← جديد: صفحة الكتاب
│           ├── article/[id]/page.tsx       ← جديد: صفحة المقالة
│           ├── author/[id]/page.tsx        ← جديد: صفحة المؤلف
│           └── video/[id]/page.tsx         ← جديد: صفحة الفيديو
```

### مسارات على السيرفر

```
/home/kazima.org/
├── public_html/                            ← الموقع الرئيسي (PHP/WebsiteBaker)
│   ├── config.php                          ← بيانات قاعدة البيانات
│   ├── modules/topics/
│   │   ├── view.php                        ← يستدعي view.topic.php
│   │   └── view.topic.php                  ← المطلوب نسخه هنا
│   └── media/Library/                      ← ملفات PDF/JPG للكتب
│
└── kazima-ai-new/                          ← تطبيق Next.js
    ├── .env                                ← DATABASE_URL (يحتاج إصلاح)
    ├── prisma/schema.prisma
    ├── src/
    ├── .next/                              ← ناتج البناء
    └── node_modules/
```

---

## 8. اختبارات التحقق

### بعد إصلاح قاعدة البيانات (المهمة 1)
```bash
# Node.js يتصل بنجاح
node -e "const m=require('mariadb');(async()=>{const c=await m.createConnection({host:'127.0.0.1',port:3306,user:'USER',password:'PASS',database:'kazi_gasorg_system'});console.log('OK');c.end();})()"

# API يعيد JSON
curl -s "http://localhost:3000/api/topics?limit=2" | head -c 300
# المتوقع: {"items":[...],"total":2}

curl -s "http://localhost:3000/api/kazima-ai/search?q=test&limit=2" | head -c 300
# المتوقع: {"total":0,"query":"test","entityType":"all","results":{}}
```

### بعد نشر Next.js (المهمة 2)
```bash
# الصفحة الرئيسية
curl -sI "https://kazima.org/" | head -1
# المتوقع: HTTP/2 200

# صفحة كتاب (استبدل 1 بأي topicId موجود)
curl -sI "https://kazima.org/pages/book/1" | head -1
# المتوقع: HTTP/2 200

# API
curl -s "https://kazima.org/api/topics/1" | head -c 200
# المتوقع: JSON ببيانات المقال
```

### بعد نسخ view.topic.php (المهمة 3)
```
افتح في المتصفح: https://kazima.org/pages/topics/أي-slug.php
المتوقع: المقال يظهر كاملاً (عنوان ذهبي + محتوى + تاريخ)
```

---

## ترتيب التنفيذ المقترح

1. **المهمة 1 أولاً** — إصلاح auth plugin (بدونها لا شيء يعمل في Next.js)
2. **المهمة 2** — نشر Next.js (الفرع جاهز، فقط pull + build)
3. **المهمة 3** — نسخ view.topic.php (أمر واحد)
4. **المهمة 4** — تم بالفعل، فقط تحقق
