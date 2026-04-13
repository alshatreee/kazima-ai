import axios from 'axios';

/**
 * موصل كتب جوجل المطور لمنصة كاظمة
 * - يستخدم المفتاح المخصص GOOGLE_BOOKS_API_KEY (منفصل عن Gemini والخريطة)
 * - فلترة النتائج باللغة العربية حصراً لضمان الموثوقية
 * - معالجة أخطاء آمنة لعدم تعطيل المحرك الرئيسي
 */

export interface GoogleBookResult {
  id: string;
  title: string;
  author: string;
  summary: string;
  date: string;
  thumbnail: string;
  link: string;
  source: string;
  type: string;
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn('[google-books] مفتاح API غير موجود. أضف GOOGLE_BOOKS_API_KEY في .env');
    return [];
  }

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=ar&maxResults=10&key=${apiKey}`;

  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
    });

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: Record<string, unknown>) => {
      const info = item.volumeInfo as Record<string, unknown>;
      const imageLinks = info.imageLinks as Record<string, string> | undefined;
      const authors = info.authors as string[] | undefined;

      return {
        id: item.id as string,
        title: info.title as string,
        author: authors ? authors.join('، ') : 'مؤلف غير معروف',
        summary: info.description
          ? (info.description as string).substring(0, 300) + '...'
          : 'لا يوجد وصف متاح لهذا المرجع.',
        date: (info.publishedDate as string) || 'تاريخ غير محدد',
        thumbnail: imageLinks?.thumbnail || '/images/book-placeholder.png',
        link: (info.previewLink as string) || (info.infoLink as string) || '',
        source: 'كتب جوجل (Google Books)',
        type: 'book',
      };
    });
  } catch (error) {
    console.error('❌ عطل في موصل كتب جوجل:', error instanceof Error ? error.message : error);
    return [];
  }
}
