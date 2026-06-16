/**
 * Minimal i18n for key UI strings (EN/AR). Extend the dictionaries as more
 * surfaces are localized. Use `t(locale, key)` — unknown keys fall back to EN
 * then to the key itself, so partial coverage never breaks the UI.
 */
export type Locale = 'en' | 'ar';
export const LOCALES: Locale[] = ['en', 'ar'];
export const RTL_LOCALES: Locale[] = ['ar'];
export const isRtl = (l: Locale): boolean => RTL_LOCALES.includes(l);

export const messages = {
  en: {
    'nav.jobs': 'Jobs',
    'nav.companies': 'Companies',
    'nav.salaryGuide': 'Salary Guide',
    'nav.whatsappGroups': 'WhatsApp Groups',
    'nav.postJob': 'Post a Job',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'nav.dashboard': 'Dashboard',
    'nav.signout': 'Sign out',
    'hero.title': 'Find Your Next Job in the UAE',
    'hero.subtitle': "UAE's WhatsApp-powered job portal · 76 groups · 80,000+ professionals",
    'hero.searchPlaceholder': 'Job title, keyword or company',
    'hero.search': 'Search',
    'hero.popular': 'Popular',
    'common.viewAll': 'View all jobs',
    'common.apply': 'Apply Now',
    'common.quickApply': 'Quick Apply',
    'common.applyWhatsapp': 'Apply on WhatsApp',
    'common.save': 'Save Job',
    'common.latestJobs': 'Latest Jobs',
    'common.browseCategories': 'Browse Categories:',
  },
  ar: {
    'nav.jobs': 'الوظائف',
    'nav.companies': 'الشركات',
    'nav.salaryGuide': 'دليل الرواتب',
    'nav.whatsappGroups': 'مجموعات واتساب',
    'nav.postJob': 'أضف وظيفة',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'nav.dashboard': 'لوحة التحكم',
    'nav.signout': 'تسجيل الخروج',
    'hero.title': 'ابحث عن وظيفتك القادمة في الإمارات',
    'hero.subtitle': 'بوابة وظائف الإمارات عبر واتساب · 76 مجموعة · أكثر من 80,000 محترف',
    'hero.searchPlaceholder': 'المسمى الوظيفي أو الكلمة المفتاحية أو الشركة',
    'hero.search': 'بحث',
    'hero.popular': 'الأكثر بحثاً',
    'common.viewAll': 'عرض كل الوظائف',
    'common.apply': 'تقدّم الآن',
    'common.quickApply': 'تقديم سريع',
    'common.applyWhatsapp': 'تقدّم عبر واتساب',
    'common.save': 'حفظ الوظيفة',
    'common.latestJobs': 'أحدث الوظائف',
    'common.browseCategories': 'تصفح الفئات:',
  },
} as const;

export type MessageKey = keyof (typeof messages)['en'];

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}
