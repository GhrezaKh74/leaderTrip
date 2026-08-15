import type { LodgingKind, MobilityLevel, PoiCategory, TravelStyle } from '../../api/schemas'

/**
 * برچسب فارسی مقادیر شمارشی.
 *
 * جدا از اسکیما نگه داشته شده چون دو چیز متفاوت‌اند: اسکیما می‌گوید چه مقادیری
 * معتبرند، این می‌گوید هرکدام به فارسی چه نامیده می‌شوند. تایپ `Record` تضمین
 * می‌کند افزودن مقدار تازه به قرارداد، این‌جا خطای کامپایل بدهد — نه اینکه در
 * رابط کاربری به‌شکل `EcoLodge` ظاهر شود.
 */

export const STYLE_LABEL: Record<TravelStyle, string> = {
  Budget: 'اقتصادی',
  Balanced: 'متعادل',
  Comfort: 'راحت',
  Luxury: 'لوکس',
}

export const STYLE_HINT: Record<TravelStyle, string> = {
  Budget: 'مسافرخانه و غذای ساده',
  Balanced: 'هتل سه‌ستاره و رستوران معمولی',
  Comfort: 'هتل چهارستاره و رستوران خوب',
  Luxury: 'هتل پنج‌ستاره',
}

export const LODGING_LABEL: Record<LodgingKind, string> = {
  Hotel: 'هتل',
  EcoLodge: 'بوم‌گردی',
  Villa: 'ویلا / سوئیت',
  Camp: 'کمپینگ',
  Friends: 'خانهٔ آشنا',
}

export const MOBILITY_LABEL: Record<MobilityLevel, string> = {
  Full: 'بدون محدودیت',
  Limited: 'محدودیت حرکتی',
  Wheelchair: 'ویلچر',
}

export const CATEGORY_LABEL: Record<PoiCategory, string> = {
  Historical: 'تاریخی',
  Nature: 'طبیعت',
  Religious: 'مذهبی',
  Museum: 'موزه',
  Adventure: 'ماجراجویی',
  Food: 'خوراک',
  Shopping: 'خرید',
  Entertainment: 'تفریحی',
  Village: 'روستا',
  Beach: 'ساحل',
  Desert: 'کویر',
  Mountain: 'کوهستان',
  Lake: 'دریاچه',
  Waterfall: 'آبشار',
  Cave: 'غار',
  Garden: 'باغ',
}

export const CATEGORY_ORDER: PoiCategory[] = [
  'Historical', 'Nature', 'Mountain', 'Desert', 'Beach', 'Lake', 'Waterfall',
  'Village', 'Garden', 'Museum', 'Religious', 'Adventure', 'Cave', 'Food',
  'Shopping', 'Entertainment',
]
