import type { POI } from '../domain/types'

/**
 * پایگاه دادهٔ جاذبه‌های ایران.
 *
 * برای کوتاه ماندن فایل، `poi()` مقادیر پیش‌فرض منطقی می‌گذارد و هر جاذبه فقط
 * چیزی را می‌نویسد که با پیش‌فرض فرق دارد. پیش‌فرض‌ها:
 * فضای باز · بدون پیاده‌روی سخت · مناسب کودک و سالمند · بدون نیاز به شاسی‌بلند · همهٔ ماه‌ها
 *
 * افزودن جاذبهٔ جدید = یک ورودی به این آرایه. هیچ جای دیگری تغییر نمی‌کند.
 */

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
/** کویر: از مهر تا اردیبهشت — تابستانش کشنده است */
const DESERT = [10, 11, 12, 1, 2, 3, 4]
/** سواحل خزر و جنگل: اواسط بهار تا اواسط پاییز */
const CASPIAN = [4, 5, 6, 7, 8, 9, 10]
/** ارتفاعات: فقط تابستان و اوایل پاییز */
const ALPINE = [5, 6, 7, 8, 9, 10]
/** جنوب و خلیج فارس: زمستان */
const GULF = [11, 12, 1, 2, 3]
/** معتدل: بهار و پاییز بهترین است ولی بقیهٔ سال هم ممکن */
const TEMPERATE = [3, 4, 5, 6, 9, 10, 11]

type Seed = Pick<POI, 'id' | 'name' | 'cityId' | 'lat' | 'lng' | 'cat' | 'rating' | 'visitMinutes' | 'ticket' | 'desc'> &
  Partial<POI>

function poi(p: Seed): POI {
  return {
    tags: [],
    bestMonths: ALL,
    indoor: false,
    difficulty: 0,
    minAge: 0,
    kidFriendly: true,
    seniorFriendly: true,
    requiresVehicle: 0,
    nightSuitable: false,
    ...p,
  }
}

export const POIS: POI[] = [
  // ─────────────────────────── تهران و البرز ───────────────────────────
  poi({ id: 'golestan', name: 'کاخ گلستان', cityId: 'tehran', lat: 35.6797, lng: 51.42, cat: 'historical', rating: 4.7, visitMinutes: 120, ticket: 300_000, indoor: true, difficulty: 1, tags: ['یونسکو', 'قاجار'], desc: 'مجموعهٔ کاخ‌های سلطنتی قاجار در قلب تهران؛ ثبت جهانی یونسکو. بلیت هر بخش جداگانه است.' }),
  poi({ id: 'national-museum', name: 'موزهٔ ملی ایران', cityId: 'tehran', lat: 35.6861, lng: 51.4147, cat: 'museum', rating: 4.5, visitMinutes: 90, ticket: 200_000, indoor: true, tags: ['باستان‌شناسی'], desc: 'مهم‌ترین موزهٔ باستان‌شناسی کشور؛ از پیش از تاریخ تا دوران اسلامی.' }),
  poi({ id: 'jewelry-museum', name: 'موزهٔ جواهرات ملی', cityId: 'tehran', lat: 35.698, lng: 51.416, cat: 'museum', rating: 4.8, visitMinutes: 60, ticket: 600_000, indoor: true, tags: ['دریای نور', 'تخت طاووس'], desc: 'گنجینهٔ جواهرات سلطنتی زیر بانک مرکزی. ساعت بازدید محدود است؛ حتماً از قبل چک کنید.' }),
  poi({ id: 'sadabad', name: 'مجموعهٔ سعدآباد', cityId: 'tehran', lat: 35.8175, lng: 51.4247, cat: 'historical', rating: 4.5, visitMinutes: 150, ticket: 250_000, difficulty: 1, tags: ['کاخ', 'باغ'], desc: 'باغ بزرگ با چند کاخ‌موزه در دامنهٔ البرز؛ پیاده‌روی زیاد بین کاخ‌ها.' }),
  poi({ id: 'niavaran', name: 'کاخ نیاوران', cityId: 'tehran', lat: 35.8175, lng: 51.47, cat: 'historical', rating: 4.4, visitMinutes: 100, ticket: 200_000, difficulty: 1, desc: 'آخرین اقامتگاه پهلوی دوم، با باغ آرام و موزهٔ اختصاصی.' }),
  poi({ id: 'tabiat-bridge', name: 'پل طبیعت', cityId: 'tehran', lat: 35.755, lng: 51.415, cat: 'entertainment', rating: 4.5, visitMinutes: 60, ticket: 0, nightSuitable: true, tags: ['رایگان', 'عکاسی'], desc: 'پل عابر سه‌طبقه بین دو بوستان؛ غروب و شب بهترین زمان است.' }),
  poi({ id: 'milad-tower', name: 'برج میلاد', cityId: 'tehran', lat: 35.7448, lng: 51.375, cat: 'entertainment', rating: 4.3, visitMinutes: 90, ticket: 400_000, indoor: true, nightSuitable: true, desc: 'طبقهٔ دید تهران از ارتفاع ۳۰۰ متری؛ در روز صاف تا دماوند دیده می‌شود.' }),
  poi({ id: 'tajrish-bazaar', name: 'بازار تجریش و امامزاده صالح', cityId: 'tehran', lat: 35.805, lng: 51.425, cat: 'shopping', rating: 4.3, visitMinutes: 75, ticket: 0, difficulty: 1, nightSuitable: true, desc: 'بازار سنتی شمال تهران؛ آجیل، ترشیجات و فضای زنده تا شب.' }),
  poi({ id: 'tehran-bazaar', name: 'بازار بزرگ تهران', cityId: 'tehran', lat: 35.672, lng: 51.418, cat: 'shopping', rating: 4.2, visitMinutes: 120, ticket: 0, difficulty: 2, seniorFriendly: false, desc: 'بزرگ‌ترین بازار سنتی کشور؛ شلوغ و پرپیچ‌وخم — با کودک خردسال دشوار است.' }),
  poi({ id: 'darband', name: 'دربند و کوهپیمایی توچال', cityId: 'tehran', lat: 35.83, lng: 51.423, cat: 'mountain', rating: 4.2, visitMinutes: 180, ticket: 0, difficulty: 2, bestMonths: TEMPERATE, seniorFriendly: false, tags: ['کوهنوردی', 'رستوران'], desc: 'مسیر سنگ‌فرش کوهستانی با آبشار و رستوران‌های سنتی کنار رودخانه.' }),
  poi({ id: 'tochal-telecabin', name: 'تله‌کابین توچال', cityId: 'tehran', lat: 35.8367, lng: 51.4103, cat: 'adventure', rating: 4.4, visitMinutes: 180, ticket: 700_000, difficulty: 1, tags: ['تله‌کابین', 'برف'], desc: 'صعود با تله‌کابین تا ارتفاع ۳۷۵۰ متری. لباس گرم حتی در تابستان لازم است.' }),
  poi({ id: 'dizin', name: 'پیست اسکی دیزین', cityId: 'karaj', lat: 36.05, lng: 51.42, cat: 'adventure', rating: 4.5, visitMinutes: 300, ticket: 1_200_000, difficulty: 2, bestMonths: [12, 1, 2, 3], minAge: 6, seniorFriendly: false, requiresVehicle: 1, tags: ['اسکی', 'زمستان'], desc: 'بزرگ‌ترین پیست اسکی ایران؛ جادهٔ دسترسی در زمستان زنجیر چرخ می‌خواهد.' }),
  poi({ id: 'amirkabir-dam', name: 'دریاچهٔ سد امیرکبیر (کرج)', cityId: 'karaj', lat: 35.95, lng: 51.1, cat: 'lake', rating: 4.1, visitMinutes: 90, ticket: 0, bestMonths: TEMPERATE, tags: ['رایگان', 'جادهٔ چالوس'], desc: 'اولین توقف زیبای جادهٔ چالوس؛ مناسب یک استراحت کوتاه با منظرهٔ دریاچه.' }),
  poi({ id: 'damavand-peak', name: 'قلهٔ دماوند (جبههٔ جنوبی)', cityId: 'polur', lat: 35.955, lng: 52.11, cat: 'mountain', rating: 4.9, visitMinutes: 600, ticket: 500_000, difficulty: 3, bestMonths: [6, 7, 8, 9], minAge: 16, kidFriendly: false, seniorFriendly: false, requiresVehicle: 1, tags: ['کوهنوردی', 'بلندترین قلهٔ ایران'], desc: 'صعود چندروزه با تجهیزات و آمادگی جسمانی. برای بازدید عادی فقط تا کمپ گوسفندسرا بروید.' }),

  // ─────────────────────────── قزوین و الموت ───────────────────────────
  poi({ id: 'qazvin-chehelsotun', name: 'کاخ چهل‌ستون قزوین', cityId: 'qazvin', lat: 36.27, lng: 50.0, cat: 'historical', rating: 4.2, visitMinutes: 60, ticket: 150_000, indoor: true, desc: 'بازماندهٔ کاخ صفوی در مرکز شهر، امروز موزهٔ خوشنویسی.' }),
  poi({ id: 'saad-saltaneh', name: 'کاروانسرای سعدالسلطنه', cityId: 'qazvin', lat: 36.276, lng: 50.006, cat: 'shopping', rating: 4.5, visitMinutes: 90, ticket: 0, nightSuitable: true, tags: ['رایگان', 'کافه'], desc: 'بزرگ‌ترین کاروانسرای سرپوشیدهٔ شهری ایران؛ مرمت‌شده و پر از کافه و صنایع دستی.' }),
  poi({ id: 'alamut-castle', name: 'قلعهٔ الموت (حسن صباح)', cityId: 'alamut', lat: 36.447, lng: 50.586, cat: 'historical', rating: 4.6, visitMinutes: 120, ticket: 150_000, difficulty: 2, bestMonths: ALPINE, seniorFriendly: false, requiresVehicle: 1, tags: ['قلعه', 'کوهستان'], desc: 'دژ اسماعیلیان روی صخره‌ای مرتفع؛ حدود ۵۰۰ پلهٔ صعود دارد. منظره‌اش عالی است.' }),
  poi({ id: 'evan-lake', name: 'دریاچهٔ اوان', cityId: 'alamut', lat: 36.46, lng: 50.49, cat: 'lake', rating: 4.4, visitMinutes: 90, ticket: 50_000, bestMonths: ALPINE, tags: ['قایق‌سواری'], desc: 'دریاچهٔ طبیعی میان کوه‌های الموت؛ مناسب پیک‌نیک خانوادگی.' }),

  // ─────────────────────────── قم و کاشان ───────────────────────────
  poi({ id: 'qom-shrine', name: 'حرم حضرت معصومه (س)', cityId: 'qom', lat: 34.6416, lng: 50.879, cat: 'religious', rating: 4.7, visitMinutes: 90, ticket: 0, nightSuitable: true, tags: ['رایگان', 'زیارت'], desc: 'مهم‌ترین زیارتگاه قم با صحن‌های وسیع؛ پوشش مناسب الزامی است.' }),
  poi({ id: 'howz-soltan', name: 'دریاچهٔ نمک حوض سلطان', cityId: 'qom', lat: 34.95, lng: 51.1, cat: 'desert', rating: 4.2, visitMinutes: 60, ticket: 0, bestMonths: DESERT, tags: ['رایگان', 'عکاسی'], desc: 'پهنهٔ نمک درخشان کنار آزادراه تهران‌–‌قم؛ غروب برای عکاسی بی‌نظیر است.' }),
  poi({ id: 'fin-garden', name: 'باغ فین کاشان', cityId: 'kashan', lat: 33.943, lng: 51.383, cat: 'garden', rating: 4.6, visitMinutes: 90, ticket: 250_000, difficulty: 1, tags: ['یونسکو', 'باغ ایرانی'], desc: 'کهن‌ترین باغ ایرانی برجای‌مانده با چشمهٔ سلیمانیه و حمام تاریخی.' }),
  poi({ id: 'tabatabaei-house', name: 'خانهٔ طباطبایی‌ها', cityId: 'kashan', lat: 33.9857, lng: 51.446, cat: 'historical', rating: 4.6, visitMinutes: 60, ticket: 200_000, indoor: true, tags: ['معماری قاجار'], desc: 'شاهکار خانه‌های اعیانی کاشان با آینه‌کاری و گچ‌بری و بادگیر.' }),
  poi({ id: 'boroujerdi-house', name: 'خانهٔ بروجردی‌ها', cityId: 'kashan', lat: 33.984, lng: 51.445, cat: 'historical', rating: 4.5, visitMinutes: 50, ticket: 200_000, indoor: true, desc: 'خانهٔ تاریخی با گنبد بادگیرهای بلند و نقاشی‌های کمال‌الملک.' }),
  poi({ id: 'sialk', name: 'تپه‌های سیالک', cityId: 'kashan', lat: 33.97, lng: 51.42, cat: 'historical', rating: 4.0, visitMinutes: 60, ticket: 150_000, difficulty: 1, bestMonths: DESERT, desc: 'زیگورات و محوطهٔ باستانی ۷۰۰۰ ساله؛ برای علاقه‌مندان باستان‌شناسی.' }),
  poi({ id: 'abyaneh', name: 'روستای ابیانه', cityId: 'natanz', lat: 33.585, lng: 51.59, cat: 'village', rating: 4.6, visitMinutes: 150, ticket: 100_000, difficulty: 2, bestMonths: TEMPERATE, tags: ['خانه‌های سرخ', 'زرتشتی'], desc: 'روستای سرخ‌رنگ تاریخی در دامنهٔ کرکس؛ کوچه‌های شیب‌دار و سنگ‌فرش دارد.' }),
  poi({ id: 'niasar-waterfall', name: 'آبشار و غار نیاسر', cityId: 'kashan', lat: 33.98, lng: 51.15, cat: 'waterfall', rating: 4.1, visitMinutes: 90, ticket: 100_000, difficulty: 2, bestMonths: [3, 4, 5, 6], seniorFriendly: false, desc: 'آبشار فصلی و غار دست‌کند ساسانی؛ در فصل گلاب‌گیری اردیبهشت زیباترین است.' }),
  poi({ id: 'maranjab', name: 'کویر مرنجاب', cityId: 'kashan', lat: 34.3, lng: 51.78, cat: 'desert', rating: 4.7, visitMinutes: 240, ticket: 150_000, difficulty: 1, bestMonths: DESERT, requiresVehicle: 1, tags: ['شن‌های روان', 'آسمان شب', 'کاروانسرا'], desc: 'تپه‌های شنی و کاروانسرای صفوی؛ ورود به کویر با خودروی سواری خطرناک است.' }),

  // ─────────────────────────── اصفهان ───────────────────────────
  poi({ id: 'naghsh-jahan', name: 'میدان نقش جهان', cityId: 'isfahan', lat: 32.6575, lng: 51.6776, cat: 'historical', rating: 5.0, visitMinutes: 120, ticket: 0, difficulty: 1, nightSuitable: true, tags: ['یونسکو', 'رایگان', 'کالسکه'], desc: 'دومین میدان بزرگ جهان و قلب اصفهان؛ خودِ میدان رایگان است، بناهایش بلیت جدا دارند.' }),
  poi({ id: 'sheikh-lotfollah', name: 'مسجد شیخ لطف‌الله', cityId: 'isfahan', lat: 32.657, lng: 51.679, cat: 'religious', rating: 4.9, visitMinutes: 45, ticket: 250_000, indoor: true, tags: ['یونسکو', 'کاشی‌کاری'], desc: 'گنبد بی‌نظیر با نقش طاووس؛ نور صبح از شبکه‌ها شاهکار است.' }),
  poi({ id: 'imam-mosque-isf', name: 'مسجد امام (جامع عباسی)', cityId: 'isfahan', lat: 32.6546, lng: 51.6776, cat: 'religious', rating: 4.9, visitMinutes: 60, ticket: 250_000, difficulty: 1, tags: ['یونسکو', 'آکوستیک'], desc: 'اوج معماری صفوی؛ نقطهٔ پژواک زیر گنبد را از دست ندهید.' }),
  poi({ id: 'aliqapu', name: 'کاخ عالی‌قاپو', cityId: 'isfahan', lat: 32.6573, lng: 51.6753, cat: 'historical', rating: 4.6, visitMinutes: 50, ticket: 250_000, indoor: true, difficulty: 2, seniorFriendly: false, tags: ['اتاق موسیقی'], desc: 'کاخ شش‌طبقه با ایوان مشرف به میدان؛ پله‌های تند و باریک دارد.' }),
  poi({ id: 'chehelsotun-isf', name: 'کاخ چهل‌ستون اصفهان', cityId: 'isfahan', lat: 32.6572, lng: 51.666, cat: 'historical', rating: 4.7, visitMinutes: 70, ticket: 250_000, difficulty: 1, tags: ['یونسکو', 'نگارگری'], desc: 'کاخ صفوی با نقاشی‌های دیواری بزرگ و استخر بازتاب‌دهندهٔ ستون‌ها.' }),
  poi({ id: 'sio-se-pol', name: 'سی‌وسه‌پل', cityId: 'isfahan', lat: 32.644, lng: 51.6675, cat: 'historical', rating: 4.7, visitMinutes: 45, ticket: 0, nightSuitable: true, tags: ['رایگان', 'شبانه'], desc: 'نمادین‌ترین پل زاینده‌رود؛ شب با نورپردازی زیباتر است. جریان آب فصلی است.' }),
  poi({ id: 'khaju-bridge', name: 'پل خواجو', cityId: 'isfahan', lat: 32.6367, lng: 51.6836, cat: 'historical', rating: 4.8, visitMinutes: 45, ticket: 0, nightSuitable: true, tags: ['رایگان', 'آواز'], desc: 'زیباترین پل تاریخی ایران؛ غروب‌ها زیر طاق‌هایش آواز می‌خوانند.' }),
  poi({ id: 'vank', name: 'کلیسای وانک', cityId: 'isfahan', lat: 32.634, lng: 51.656, cat: 'religious', rating: 4.7, visitMinutes: 75, ticket: 250_000, indoor: true, tags: ['جلفا', 'ارمنی'], desc: 'کلیسای ارمنی با نقاشی‌های دیواری خیره‌کننده و موزهٔ نسل‌کشی.' }),
  poi({ id: 'jameh-isfahan', name: 'مسجد جامع عتیق اصفهان', cityId: 'isfahan', lat: 32.67, lng: 51.685, cat: 'religious', rating: 4.8, visitMinutes: 75, ticket: 250_000, difficulty: 1, tags: ['یونسکو', 'موزهٔ زندهٔ معماری'], desc: 'موزهٔ ۱۲ قرن معماری اسلامی در یک بنا؛ از سلجوقی تا صفوی.' }),
  poi({ id: 'menar-jonban', name: 'منارجنبان', cityId: 'isfahan', lat: 32.648, lng: 51.6, cat: 'historical', rating: 3.9, visitMinutes: 40, ticket: 150_000, tags: ['کودک‌پسند'], desc: 'مناره‌های لرزان؛ نمایش لرزاندن در ساعت‌های مشخص انجام می‌شود.' }),
  poi({ id: 'atashgah-isf', name: 'آتشگاه اصفهان', cityId: 'isfahan', lat: 32.647, lng: 51.558, cat: 'historical', rating: 4.2, visitMinutes: 90, ticket: 100_000, difficulty: 2, bestMonths: TEMPERATE, seniorFriendly: false, tags: ['غروب', 'تپه'], desc: 'بازماندهٔ آتشکدهٔ ساسانی روی تپه؛ صعود تند اما منظرهٔ شهر عالی است.' }),
  poi({ id: 'isfahan-birdgarden', name: 'باغ پرندگان اصفهان', cityId: 'isfahan', lat: 32.67, lng: 51.64, cat: 'entertainment', rating: 4.3, visitMinutes: 90, ticket: 250_000, tags: ['کودک‌پسند'], desc: 'یکی از بزرگ‌ترین باغ پرندگان خاورمیانه؛ انتخاب خوب وقتی کودک همراه دارید.' }),
  poi({ id: 'varzaneh', name: 'کویر و پل تاریخی ورزنه', cityId: 'isfahan', lat: 32.42, lng: 52.65, cat: 'desert', rating: 4.4, visitMinutes: 180, ticket: 100_000, bestMonths: DESERT, requiresVehicle: 1, tags: ['چادر سفید', 'تپه‌های شنی'], desc: 'کویر نزدیک‌ترین به اصفهان، به‌همراه روستایی که زنان چادر سفید می‌پوشند.' }),

  // ─────────────────────────── یزد و کویر مرکزی ───────────────────────────
  poi({ id: 'jameh-yazd', name: 'مسجد جامع یزد', cityId: 'yazd', lat: 31.8555, lng: 54.366, cat: 'religious', rating: 4.8, visitMinutes: 60, ticket: 200_000, difficulty: 1, tags: ['بلندترین مناره'], desc: 'مناره‌های ۵۲ متری و کاشی‌کاری فیروزه‌ای؛ نماد یزد.' }),
  poi({ id: 'amir-chakhmaq', name: 'میدان امیرچخماق', cityId: 'yazd', lat: 31.897, lng: 54.367, cat: 'historical', rating: 4.6, visitMinutes: 60, ticket: 0, nightSuitable: true, tags: ['رایگان', 'شبانه'], desc: 'تکیهٔ سه‌طبقه با طاق‌نماهای متقارن؛ حتماً شب با نورپردازی ببینید.' }),
  poi({ id: 'dowlatabad', name: 'باغ دولت‌آباد', cityId: 'yazd', lat: 31.9, lng: 54.34, cat: 'garden', rating: 4.5, visitMinutes: 60, ticket: 200_000, difficulty: 1, tags: ['یونسکو', 'بلندترین بادگیر'], desc: 'بلندترین بادگیر خشتی جهان با ارتفاع ۳۳ متر و شیشه‌های رنگی مشهور.' }),
  poi({ id: 'fahadan', name: 'محلهٔ تاریخی فهادان و زندان اسکندر', cityId: 'yazd', lat: 31.899, lng: 54.368, cat: 'historical', rating: 4.5, visitMinutes: 90, ticket: 100_000, difficulty: 1, nightSuitable: true, tags: ['کوچه‌های خشتی', 'بام'], desc: 'بافت خشتی یونسکو؛ روی بام کافه‌ها غروب یزد را ببینید.' }),
  poi({ id: 'atashkadeh-yazd', name: 'آتشکدهٔ یزد', cityId: 'yazd', lat: 31.893, lng: 54.369, cat: 'religious', rating: 4.3, visitMinutes: 40, ticket: 150_000, indoor: true, tags: ['زرتشتی', 'آتش ورهرام'], desc: 'آتشی که به روایت موبدان بیش از ۱۵۰۰ سال روشن مانده است.' }),
  poi({ id: 'dakhmeh', name: 'دخمهٔ زرتشتیان (برج خاموشان)', cityId: 'yazd', lat: 31.85, lng: 54.34, cat: 'historical', rating: 4.3, visitMinutes: 75, ticket: 100_000, difficulty: 2, bestMonths: DESERT, seniorFriendly: false, tags: ['غروب'], desc: 'دو برج روی تپه‌های بیرون شهر؛ صعود شیب‌دار دارد اما غروبش فراموش‌نشدنی است.' }),
  poi({ id: 'meybod-narin', name: 'نارین‌قلعهٔ میبد و کاروانسرا', cityId: 'meybod', lat: 32.25, lng: 54.01, cat: 'historical', rating: 4.4, visitMinutes: 90, ticket: 150_000, difficulty: 1, bestMonths: DESERT, tags: ['یخچال', 'کبوترخانه'], desc: 'قلعهٔ خشتی چندهزارساله به‌همراه کاروانسرا، یخچال و کبوترخانهٔ تاریخی.' }),
  poi({ id: 'chak-chak', name: 'زیارتگاه چک‌چک (پیر سبز)', cityId: 'ardakan', lat: 32.07, lng: 54.04, cat: 'religious', rating: 4.4, visitMinutes: 90, ticket: 100_000, difficulty: 2, bestMonths: DESERT, seniorFriendly: false, requiresVehicle: 1, tags: ['زرتشتی', 'کوهستان'], desc: 'مقدس‌ترین زیارتگاه زرتشتیان روی صخره؛ حدود ۲۳۰ پله دارد.' }),
  poi({ id: 'kharanaq', name: 'روستای متروکهٔ خرانق', cityId: 'ardakan', lat: 32.4, lng: 54.75, cat: 'village', rating: 4.3, visitMinutes: 75, ticket: 80_000, difficulty: 2, bestMonths: DESERT, seniorFriendly: false, tags: ['مناره لرزان', 'متروکه'], desc: 'قلعهٔ خشتی رهاشده و پرشکوه؛ سازه‌ها فرسوده‌اند، با احتیاط قدم بزنید.' }),
  poi({ id: 'zeinoddin', name: 'کاروانسرای زین‌الدین', cityId: 'yazd', lat: 31.5, lng: 54.9, cat: 'historical', rating: 4.5, visitMinutes: 60, ticket: 100_000, bestMonths: DESERT, tags: ['کاروانسرای دایره‌ای', 'اقامتگاه'], desc: 'یکی از دو کاروانسرای دایره‌ای ایران؛ خودش اقامتگاه هم هست.' }),
  poi({ id: 'sarv-abarkuh', name: 'سرو کهنسال ابرکوه', cityId: 'abarkuh', lat: 31.13, lng: 53.283, cat: 'nature', rating: 4.2, visitMinutes: 40, ticket: 50_000, bestMonths: DESERT, tags: ['۴۰۰۰ ساله'], desc: 'یکی از کهن‌سال‌ترین موجودات زندهٔ جهان؛ توقفی کوتاه اما به‌یادماندنی.' }),
  poi({ id: 'mesr-desert', name: 'کویر مصر', cityId: 'khur', lat: 33.55, lng: 55.03, cat: 'desert', rating: 4.7, visitMinutes: 300, ticket: 200_000, difficulty: 1, bestMonths: DESERT, requiresVehicle: 1, tags: ['شب‌مانی', 'آسمان پرستاره', 'شترسواری'], desc: 'مشهورترین کویر گردشگری ایران؛ یک شب ماندن و آسمان شبش ارزش سفر را دارد.' }),
  poi({ id: 'garmeh', name: 'روستای گرمه', cityId: 'khur', lat: 33.75, lng: 55.0, cat: 'village', rating: 4.5, visitMinutes: 120, ticket: 0, bestMonths: DESERT, tags: ['نخلستان', 'قلعه'], desc: 'واحه‌ای سرسبز با چشمهٔ آب و قلعهٔ خشتی در دل کویر.' }),
  poi({ id: 'tabas-golshan', name: 'باغ گلشن طبس', cityId: 'tabas', lat: 33.596, lng: 56.925, cat: 'garden', rating: 4.4, visitMinutes: 60, ticket: 100_000, bestMonths: DESERT, tags: ['نخل', 'آبشار مصنوعی'], desc: 'واحهٔ سبز وسط کویر با نخل و حوض‌های پلکانی؛ در گرما پناهگاه است.' }),
  poi({ id: 'kal-jenni', name: 'کال جنی طبس', cityId: 'tabas', lat: 33.45, lng: 56.8, cat: 'nature', rating: 4.6, visitMinutes: 180, ticket: 50_000, difficulty: 2, bestMonths: DESERT, seniorFriendly: false, requiresVehicle: 1, tags: ['دره', 'کنیون'], desc: 'درهٔ باریک و مرتفع با دیواره‌های تراشیده؛ در فصل بارش خطر سیلاب دارد.' }),

  // ─────────────────────────── کرمان ───────────────────────────
  poi({ id: 'shazdeh-mahan', name: 'باغ شاهزادهٔ ماهان', cityId: 'kerman', lat: 29.99, lng: 57.7, cat: 'garden', rating: 4.8, visitMinutes: 90, ticket: 250_000, difficulty: 1, tags: ['یونسکو', 'باغ ایرانی'], desc: 'باغ پلکانی قاجاری با آبشارهای پله‌ای در برابر کوه؛ از زیباترین باغ‌های ایران.' }),
  poi({ id: 'shah-nematollah', name: 'آرامگاه شاه نعمت‌الله ولی', cityId: 'kerman', lat: 30.05, lng: 57.29, cat: 'religious', rating: 4.5, visitMinutes: 60, ticket: 100_000, tags: ['گنبد فیروزه‌ای'], desc: 'مجموعهٔ عرفانی با گنبد فیروزه‌ای و حیاط‌های آرام و درختان کهن.' }),
  poi({ id: 'ganjali-khan', name: 'مجموعهٔ گنجعلی‌خان کرمان', cityId: 'kerman', lat: 30.287, lng: 57.079, cat: 'museum', rating: 4.5, visitMinutes: 90, ticket: 150_000, indoor: true, tags: ['حمام', 'بازار'], desc: 'حمام، بازار، ضراب‌خانه و کاروانسرای صفوی در یک مجموعهٔ به‌هم‌پیوسته.' }),
  poi({ id: 'rayen-castle', name: 'ارگ راین', cityId: 'kerman', lat: 29.6, lng: 57.44, cat: 'historical', rating: 4.6, visitMinutes: 90, ticket: 150_000, difficulty: 1, tags: ['خشتی', 'شبیه ارگ بم'], desc: 'ارگ خشتی سالم و کم‌بازدید؛ کوچک‌تر از بم اما سرپاتر و آرام‌تر.' }),
  poi({ id: 'kaluts', name: 'کلوت‌های شهداد', cityId: 'shahdad', lat: 30.5, lng: 57.9, cat: 'desert', rating: 4.9, visitMinutes: 180, ticket: 150_000, bestMonths: [11, 12, 1, 2, 3], requiresVehicle: 1, tags: ['یونسکو', 'گرم‌ترین نقطهٔ زمین', 'غروب'], desc: 'شهر خیالی از کلوت‌های شن‌بادرفتی. تابستان دمای زمین به ۷۰ درجه می‌رسد — نروید.' }),
  poi({ id: 'bam-citadel', name: 'ارگ بم', cityId: 'bam', lat: 29.114, lng: 58.369, cat: 'historical', rating: 4.6, visitMinutes: 120, ticket: 200_000, difficulty: 2, bestMonths: DESERT, seniorFriendly: false, tags: ['یونسکو', 'بزرگ‌ترین بنای خشتی'], desc: 'بزرگ‌ترین سازهٔ خشتی جهان، در حال بازسازی پس از زلزلهٔ ۱۳۸۲.' }),
  poi({ id: 'meymand', name: 'روستای صخره‌ای میمند', cityId: 'rafsanjan', lat: 30.12, lng: 55.3, cat: 'village', rating: 4.6, visitMinutes: 150, ticket: 150_000, difficulty: 2, bestMonths: TEMPERATE, seniorFriendly: false, requiresVehicle: 1, tags: ['یونسکو', 'خانه‌های دست‌کند'], desc: 'روستای دست‌کند با ۳۰۰۰ سال سکونت پیوسته در دل صخره.' }),

  // ─────────────────────────── فارس ───────────────────────────
  poi({ id: 'persepolis', name: 'تخت جمشید', cityId: 'marvdasht', lat: 29.9354, lng: 52.8916, cat: 'historical', rating: 5.0, visitMinutes: 180, ticket: 300_000, difficulty: 2, bestMonths: TEMPERATE, tags: ['یونسکو', 'هخامنشی'], desc: 'پایتخت تشریفاتی هخامنشیان. سایه ندارد — تابستان فقط صبح زود بروید.' }),
  poi({ id: 'naqsh-rostam', name: 'نقش رستم', cityId: 'marvdasht', lat: 29.988, lng: 52.874, cat: 'historical', rating: 4.7, visitMinutes: 60, ticket: 200_000, difficulty: 1, bestMonths: TEMPERATE, tags: ['آرامگاه داریوش'], desc: 'آرامگاه‌های صخره‌ای شاهان هخامنشی و نقش‌برجسته‌های ساسانی.' }),
  poi({ id: 'pasargadae', name: 'پاسارگاد', cityId: 'marvdasht', lat: 30.194, lng: 53.167, cat: 'historical', rating: 4.6, visitMinutes: 90, ticket: 200_000, difficulty: 1, bestMonths: TEMPERATE, tags: ['یونسکو', 'آرامگاه کوروش'], desc: 'نخستین پایتخت هخامنشی و آرامگاه کوروش؛ محوطه پراکنده است و ماشین لازم می‌شود.' }),
  poi({ id: 'hafezieh', name: 'حافظیه', cityId: 'shiraz', lat: 29.626, lng: 52.558, cat: 'historical', rating: 4.8, visitMinutes: 60, ticket: 150_000, nightSuitable: true, tags: ['شبانه', 'باغ'], desc: 'آرامگاه حافظ در باغی آرام؛ شب‌ها با نورپردازی و زمزمهٔ فال روح دیگری دارد.' }),
  poi({ id: 'saadieh', name: 'سعدیه', cityId: 'shiraz', lat: 29.622, lng: 52.581, cat: 'historical', rating: 4.4, visitMinutes: 50, ticket: 150_000, nightSuitable: true, desc: 'آرامگاه سعدی با حوض ماهی زیرزمینی و باغ کوچک.' }),
  poi({ id: 'nasir-molk', name: 'مسجد نصیرالملک (مسجد صورتی)', cityId: 'shiraz', lat: 29.608, lng: 52.549, cat: 'religious', rating: 4.8, visitMinutes: 60, ticket: 250_000, indoor: true, tags: ['شیشه‌های رنگی', 'صبح زود'], desc: 'برای دیدن رقص نور روی فرش، بین ۸ تا ۱۰ صبح بروید — بعدش خبری نیست.' }),
  poi({ id: 'eram-garden', name: 'باغ ارم', cityId: 'shiraz', lat: 29.636, lng: 52.525, cat: 'garden', rating: 4.6, visitMinutes: 90, ticket: 200_000, difficulty: 1, tags: ['یونسکو', 'سرو ناز'], desc: 'باغ ایرانی با عمارت قاجاری و سروهای بلند؛ بهارش با گل‌های نارنج بی‌نظیر است.' }),
  poi({ id: 'karim-khan', name: 'ارگ کریم‌خان', cityId: 'shiraz', lat: 29.617, lng: 52.543, cat: 'historical', rating: 4.4, visitMinutes: 60, ticket: 200_000, difficulty: 1, tags: ['برج کج'], desc: 'دژ زندیه در مرکز شیراز با یک برج فرونشسته و حمام تاریخی.' }),
  poi({ id: 'vakil-bazaar', name: 'بازار وکیل و سرای مشیر', cityId: 'shiraz', lat: 29.615, lng: 52.543, cat: 'shopping', rating: 4.6, visitMinutes: 120, ticket: 0, difficulty: 1, nightSuitable: true, tags: ['رایگان', 'صنایع دستی'], desc: 'بازار سرپوشیدهٔ زندیه؛ خاتم، گلیم و ادویه. سرای مشیر برای کافه عالی است.' }),
  poi({ id: 'bishapur', name: 'بیشاپور و تنگ چوگان', cityId: 'kazerun', lat: 29.78, lng: 51.57, cat: 'historical', rating: 4.4, visitMinutes: 120, ticket: 150_000, difficulty: 1, bestMonths: TEMPERATE, tags: ['ساسانی', 'نقش‌برجسته'], desc: 'شهر ساسانی شاپور اول با نقش‌برجسته‌های عظیم در دره‌ای کنار رودخانه.' }),
  poi({ id: 'shapur-cave', name: 'غار شاپور', cityId: 'kazerun', lat: 29.79, lng: 51.58, cat: 'cave', rating: 4.5, visitMinutes: 240, ticket: 100_000, difficulty: 3, bestMonths: TEMPERATE, minAge: 12, kidFriendly: false, seniorFriendly: false, tags: ['مجسمهٔ شاپور', 'صعود سخت'], desc: 'مجسمهٔ ۷ متری شاپور در دهانهٔ غار؛ حدود دو ساعت صعود واقعاً سخت دارد.' }),
  poi({ id: 'margoon', name: 'آبشار مارگون', cityId: 'sepidan', lat: 30.56, lng: 51.65, cat: 'waterfall', rating: 4.7, visitMinutes: 150, ticket: 80_000, difficulty: 2, bestMonths: [4, 5, 6, 7], seniorFriendly: false, tags: ['پرآب‌ترین در بهار'], desc: 'آبشاری که از دل دیوارهٔ سنگی می‌جوشد نه از بالا؛ پله‌های زیادی دارد.' }),
  poi({ id: 'qaleh-dokhtar', name: 'قلعهٔ دختر فیروزآباد', cityId: 'firuzabad', lat: 28.86, lng: 52.53, cat: 'historical', rating: 4.3, visitMinutes: 120, ticket: 100_000, difficulty: 3, bestMonths: TEMPERATE, minAge: 10, kidFriendly: false, seniorFriendly: false, tags: ['اردشیر بابکان'], desc: 'دژ ساسانی روی صخره با مسیر صعود تند و بدون حفاظ.' }),

  // ─────────────────────────── گیلان ───────────────────────────
  poi({ id: 'masuleh', name: 'روستای ماسوله', cityId: 'fuman', lat: 37.1533, lng: 48.9906, cat: 'village', rating: 4.7, visitMinutes: 180, ticket: 100_000, difficulty: 2, bestMonths: CASPIAN, seniorFriendly: false, tags: ['پله‌کانی', 'بام خانه = حیاط همسایه'], desc: 'روستای پلکانی مه‌گرفتهٔ گیلان؛ تمام مسیرش شیب و پله است.' }),
  poi({ id: 'rudkhan', name: 'قلعهٔ رودخان', cityId: 'fuman', lat: 37.07, lng: 49.2, cat: 'historical', rating: 4.6, visitMinutes: 240, ticket: 100_000, difficulty: 3, bestMonths: CASPIAN, minAge: 10, kidFriendly: false, seniorFriendly: false, tags: ['۱۰۰۰ پله', 'جنگل'], desc: 'قلعهٔ جنگلی با حدود ۱۰۰۰ پلهٔ صعود؛ زیبا اما واقعاً نفس‌گیر است.' }),
  poi({ id: 'anzali-lagoon', name: 'تالاب انزلی', cityId: 'anzali', lat: 37.43, lng: 49.45, cat: 'nature', rating: 4.3, visitMinutes: 120, ticket: 250_000, bestMonths: [4, 5, 6, 7, 8, 9], tags: ['قایق‌سواری', 'نیلوفر آبی'], desc: 'قایق‌سواری میان نیلوفرهای آبی؛ تیر و مرداد اوج گلدهی است.' }),
  poi({ id: 'olsbelangah', name: 'ییلاق اولسبلنگاه ماسال', cityId: 'rasht', lat: 37.33, lng: 48.9, cat: 'mountain', rating: 4.8, visitMinutes: 180, ticket: 0, difficulty: 1, bestMonths: [5, 6, 7, 8, 9], requiresVehicle: 1, tags: ['دریای ابر', 'رایگان'], desc: 'ییلاق سبز بالای ابرها؛ جادهٔ آخر شیب‌دار است و در باران لغزنده می‌شود.' }),
  poi({ id: 'latun', name: 'آبشار لاتون', cityId: 'astara', lat: 38.35, lng: 48.85, cat: 'waterfall', rating: 4.5, visitMinutes: 180, ticket: 80_000, difficulty: 2, bestMonths: CASPIAN, seniorFriendly: false, tags: ['بلندترین آبشار ایران'], desc: 'بلندترین آبشار طبیعی ایران با پیاده‌روی جنگلی حدود یک ساعته.' }),
  poi({ id: 'subatan', name: 'سوباتان تالش', cityId: 'astara', lat: 37.8, lng: 48.7, cat: 'mountain', rating: 4.8, visitMinutes: 300, ticket: 0, difficulty: 2, bestMonths: [6, 7, 8, 9], seniorFriendly: false, requiresVehicle: 2, tags: ['ییلاق', 'آفرود'], desc: 'ییلاق رؤیایی تالش؛ جاده‌اش واقعاً آفرود است و با سواری نروید.' }),
  poi({ id: 'lahijan-tea', name: 'باغ چای و تله‌کابین لاهیجان', cityId: 'lahijan', lat: 37.207, lng: 50.004, cat: 'nature', rating: 4.3, visitMinutes: 120, ticket: 300_000, bestMonths: CASPIAN, tags: ['موزه چای', 'استخر لاهیجان'], desc: 'تپه‌های چای، موزهٔ تاریخ چای و تله‌کابین مشرف به شهر.' }),

  // ─────────────────────────── مازندران ───────────────────────────
  poi({ id: 'javaherdeh', name: 'ییلاق جواهرده رامسر', cityId: 'ramsar', lat: 36.83, lng: 50.68, cat: 'mountain', rating: 4.5, visitMinutes: 180, ticket: 0, bestMonths: [4, 5, 6, 7, 8, 9, 10], requiresVehicle: 1, tags: ['ابر', 'رایگان'], desc: 'ییلاق ۲۰۰۰ متری بالای رامسر؛ جادهٔ کوهستانی پرپیچ‌وخم دارد.' }),
  poi({ id: 'ramsar-telecabin', name: 'تله‌کابین رامسر', cityId: 'ramsar', lat: 36.9, lng: 50.65, cat: 'entertainment', rating: 4.4, visitMinutes: 120, ticket: 500_000, bestMonths: CASPIAN, tags: ['منظرهٔ دریا'], desc: 'صعود از ساحل تا جنگل مه‌آلود؛ در روز صاف کل خط ساحلی دیده می‌شود.' }),
  poi({ id: 'valasht', name: 'دریاچهٔ ولشت', cityId: 'kelardasht', lat: 36.45, lng: 51.25, cat: 'lake', rating: 4.5, visitMinutes: 120, ticket: 50_000, difficulty: 1, bestMonths: [4, 5, 6, 7, 8, 9, 10], requiresVehicle: 1, tags: ['قایق پدالی'], desc: 'دریاچه‌ای آرام میان جنگل و کوه در کلاردشت.' }),
  poi({ id: 'namakabrud', name: 'تله‌کابین نمک‌آبرود', cityId: 'chalus', lat: 36.65, lng: 51.3, cat: 'entertainment', rating: 4.4, visitMinutes: 180, ticket: 800_000, bestMonths: CASPIAN, tags: ['کودک‌پسند', 'شهربازی'], desc: 'تله‌کابین بلند تا ارتفاعات جنگلی به‌همراه شهربازی و رستوران.' }),
  poi({ id: 'kandelous', name: 'روستای کندلوس', cityId: 'nowshahr', lat: 36.45, lng: 51.6, cat: 'village', rating: 4.3, visitMinutes: 120, ticket: 100_000, bestMonths: CASPIAN, requiresVehicle: 1, tags: ['موزهٔ روستایی'], desc: 'روستای جنگلی با موزه‌ای غنی از زندگی سنتی مازندران.' }),
  poi({ id: 'shahandasht', name: 'آبشار شاهاندشت', cityId: 'polur', lat: 36.05, lng: 52.1, cat: 'waterfall', rating: 4.4, visitMinutes: 120, ticket: 50_000, difficulty: 2, bestMonths: [4, 5, 6, 7, 8, 9], seniorFriendly: false, tags: ['جادهٔ هراز', 'قلعهٔ ملک بهمن'], desc: 'آبشار سه‌پله در جادهٔ هراز با قلعه‌ای تاریخی در نزدیکی.' }),
  poi({ id: 'babolsar-beach', name: 'ساحل و پل بابلسر', cityId: 'babolsar', lat: 36.7025, lng: 52.6575, cat: 'beach', rating: 4.0, visitMinutes: 120, ticket: 0, bestMonths: [5, 6, 7, 8, 9], nightSuitable: true, tags: ['رایگان', 'کودک‌پسند'], desc: 'یکی از دسترس‌پذیرترین سواحل خزر با پل قدیمی و پیاده‌روی ساحلی.' }),

  // ─────────────────────────── گلستان و شاهرود ───────────────────────────
  poi({ id: 'abr-forest', name: 'جنگل ابر', cityId: 'shahrud', lat: 36.65, lng: 55.0, cat: 'nature', rating: 4.8, visitMinutes: 240, ticket: 100_000, difficulty: 1, bestMonths: [5, 6, 7, 8, 9, 10], requiresVehicle: 1, tags: ['دریای ابر', 'کمپ'], desc: 'جایی که ابرها زیر پای شما جمع می‌شوند؛ صبح زود بهترین شانس دیدن ابر است.' }),
  poi({ id: 'alangdareh', name: 'جنگل النگدره گرگان', cityId: 'gorgan', lat: 36.85, lng: 54.5, cat: 'nature', rating: 4.4, visitMinutes: 120, ticket: 50_000, difficulty: 1, bestMonths: CASPIAN, tags: ['کودک‌پسند', 'پیک‌نیک'], desc: 'جنگل هیرکانی دست‌نخورده در حاشیهٔ شهر؛ مسیر پیاده‌روی ملایم دارد.' }),
  poi({ id: 'kabudval', name: 'آبشار کبودوال', cityId: 'gorgan', lat: 36.88, lng: 55.0, cat: 'waterfall', rating: 4.5, visitMinutes: 120, ticket: 50_000, difficulty: 2, bestMonths: CASPIAN, seniorFriendly: false, tags: ['خزه‌ای', 'تنها آبشار خزه‌ای ایران'], desc: 'تنها آبشار تمام‌خزه‌ای ایران؛ مسیرش لغزنده است، کفش مناسب بپوشید.' }),
  poi({ id: 'ziarat-village', name: 'روستای زیارت گرگان', cityId: 'gorgan', lat: 36.75, lng: 54.45, cat: 'village', rating: 4.3, visitMinutes: 120, ticket: 0, bestMonths: CASPIAN, tags: ['رایگان', 'رودخانه'], desc: 'روستای ییلاقی با رودخانه و رستوران‌های کنار آب.' }),
  poi({ id: 'khaled-nabi', name: 'قبرستان خالد نبی', cityId: 'gonbad', lat: 37.7, lng: 55.5, cat: 'historical', rating: 4.4, visitMinutes: 150, ticket: 0, difficulty: 1, bestMonths: [3, 4, 5, 9, 10], requiresVehicle: 1, tags: ['تپه‌های ترکمن‌صحرا', 'رایگان'], desc: 'سنگ‌قبرهای مرموز روی تپه‌های مخملی ترکمن‌صحرا؛ اردیبهشت اوج سبزی است.' }),
  poi({ id: 'gonbad-kavus', name: 'گنبد قابوس', cityId: 'gonbad', lat: 37.2589, lng: 55.1686, cat: 'historical', rating: 4.5, visitMinutes: 45, ticket: 100_000, tags: ['یونسکو', 'بلندترین برج آجری جهان'], desc: 'برج آجری هزارساله با ۷۲ متر ارتفاع؛ شاهکار مهندسی دوران زیاری.' }),

  // ─────────────────────────── آذربایجان ───────────────────────────
  poi({ id: 'kandovan', name: 'روستای کندوان', cityId: 'tabriz', lat: 37.79, lng: 46.25, cat: 'village', rating: 4.6, visitMinutes: 150, ticket: 100_000, difficulty: 2, bestMonths: TEMPERATE, seniorFriendly: false, tags: ['خانه‌های صخره‌ای', 'کندو'], desc: 'خانه‌های تراشیده در صخره‌های آتشفشانی؛ کوچه‌ها شیب تند دارند.' }),
  poi({ id: 'tabriz-bazaar', name: 'بازار تاریخی تبریز', cityId: 'tabriz', lat: 38.08, lng: 46.29, cat: 'shopping', rating: 4.7, visitMinutes: 150, ticket: 0, indoor: true, difficulty: 2, tags: ['یونسکو', 'رایگان', 'فرش'], desc: 'بزرگ‌ترین بازار سرپوشیدهٔ به‌هم‌پیوستهٔ جهان؛ حتماً راستهٔ فرش و مظفریه را ببینید.' }),
  poi({ id: 'blue-mosque', name: 'مسجد کبود تبریز', cityId: 'tabriz', lat: 38.079, lng: 46.3, cat: 'religious', rating: 4.4, visitMinutes: 45, ticket: 150_000, indoor: true, tags: ['فیروزهٔ اسلام'], desc: 'بازماندهٔ مسجد قره‌قویونلو با کاشی‌کاری لاجوردی بی‌نظیر.' }),
  poi({ id: 'elgoli', name: 'ائل‌گلی تبریز', cityId: 'tabriz', lat: 38.037, lng: 46.33, cat: 'garden', rating: 4.2, visitMinutes: 90, ticket: 0, nightSuitable: true, tags: ['رایگان', 'دریاچه'], desc: 'پارک تاریخی با استخر بزرگ و عمارتی وسط آب؛ محبوب خانواده‌ها.' }),
  poi({ id: 'babak-castle', name: 'قلعهٔ بابک', cityId: 'kaleybar', lat: 38.83, lng: 46.97, cat: 'historical', rating: 4.7, visitMinutes: 300, ticket: 100_000, difficulty: 3, bestMonths: [5, 6, 7, 8, 9], minAge: 12, kidFriendly: false, seniorFriendly: false, tags: ['صعود سنگین', 'جنگل ارسباران'], desc: 'دژ بابک خرمدین روی صخره‌ای در ارسباران؛ حدود ۳ ساعت صعود جدی دارد.' }),
  poi({ id: 'st-stepanos', name: 'کلیسای سنت استپانوس', cityId: 'jolfa', lat: 38.98, lng: 45.47, cat: 'religious', rating: 4.7, visitMinutes: 90, ticket: 150_000, bestMonths: TEMPERATE, tags: ['یونسکو', 'ارس'], desc: 'کلیسای ارمنی سنگی در دره‌ای کنار رود ارس؛ مسیر رسیدن خودش دیدنی است.' }),
  poi({ id: 'qara-kelisa', name: 'قره‌کلیسا (کلیسای تادئوس)', cityId: 'khoy', lat: 39.15, lng: 44.9, cat: 'religious', rating: 4.6, visitMinutes: 75, ticket: 150_000, bestMonths: TEMPERATE, tags: ['یونسکو'], desc: 'کهن‌ترین کلیسای جهان به روایتی؛ در دشتی خالی و باشکوه.' }),
  poi({ id: 'maragheh-observatory', name: 'رصدخانهٔ مراغه', cityId: 'maragheh', lat: 37.4, lng: 46.26, cat: 'historical', rating: 4.2, visitMinutes: 75, ticket: 100_000, indoor: true, tags: ['خواجه نصیر'], desc: 'رصدخانهٔ خواجه نصیرالدین طوسی، پیشرفته‌ترین رصدخانهٔ قرن سیزدهم میلادی.' }),
  poi({ id: 'takht-soleyman', name: 'تخت سلیمان', cityId: 'takab', lat: 36.603, lng: 47.235, cat: 'historical', rating: 4.8, visitMinutes: 120, ticket: 200_000, difficulty: 1, bestMonths: [4, 5, 6, 7, 8, 9, 10], tags: ['یونسکو', 'دریاچهٔ آتشفشانی'], desc: 'آتشکدهٔ ساسانی گرد دریاچه‌ای مرموز؛ یکی از شگفت‌انگیزترین محوطه‌های ایران.' }),

  // ─────────────────────────── اردبیل و زنجان ───────────────────────────
  poi({ id: 'sarein-springs', name: 'چشمه‌های آب گرم سرعین', cityId: 'sarein', lat: 38.1497, lng: 48.07, cat: 'entertainment', rating: 4.4, visitMinutes: 150, ticket: 400_000, indoor: true, tags: ['آب درمانی'], desc: 'آب‌گرم‌های معدنی دامنهٔ سبلان؛ در پاییز و زمستان لذتش بیشتر است.' }),
  poi({ id: 'sheikh-safi', name: 'بقعهٔ شیخ صفی‌الدین اردبیلی', cityId: 'ardabil', lat: 38.2497, lng: 48.29, cat: 'historical', rating: 4.6, visitMinutes: 90, ticket: 200_000, indoor: true, tags: ['یونسکو', 'چینی‌خانه'], desc: 'مجموعهٔ خانقاهی صفوی با چینی‌خانهٔ مشهور و تزئینات چوبی نفیس.' }),
  poi({ id: 'meshgin-bridge', name: 'پل معلق مشگین‌شهر', cityId: 'ardabil', lat: 38.4, lng: 47.68, cat: 'adventure', rating: 4.4, visitMinutes: 90, ticket: 350_000, difficulty: 1, bestMonths: TEMPERATE, minAge: 8, tags: ['بلندترین پل معلق خاورمیانه'], desc: 'پل معلق ۳۶۵ متری روی دره؛ برای کسانی که ترس از ارتفاع دارند سخت است.' }),
  poi({ id: 'soltaniyeh', name: 'گنبد سلطانیه', cityId: 'zanjan', lat: 36.435, lng: 48.795, cat: 'historical', rating: 4.7, visitMinutes: 90, ticket: 200_000, indoor: true, difficulty: 1, tags: ['یونسکو', 'بزرگ‌ترین گنبد آجری'], desc: 'بزرگ‌ترین گنبد آجری جهان از دوران ایلخانی؛ از داخل عظمتش را حس می‌کنید.' }),
  poi({ id: 'katalekhor', name: 'غار کتله‌خور', cityId: 'zanjan', lat: 36.08, lng: 48.4, cat: 'cave', rating: 4.5, visitMinutes: 120, ticket: 200_000, indoor: true, difficulty: 1, tags: ['استالاکتیت', 'کودک‌پسند'], desc: 'غار آهکی چندطبقه با مسیر ایمن و روشن؛ داخلش خنک است.' }),
  poi({ id: 'zanjan-rakhtshuykhaneh', name: 'رختشویخانهٔ زنجان', cityId: 'zanjan', lat: 36.67, lng: 48.48, cat: 'museum', rating: 4.1, visitMinutes: 45, ticket: 100_000, indoor: true, tags: ['موزهٔ مردم‌شناسی'], desc: 'بنای منحصربه‌فرد قاجاری برای شست‌وشوی جمعی، امروز موزهٔ مردم‌شناسی.' }),

  // ─────────────────────────── همدان و غرب ───────────────────────────
  poi({ id: 'alisadr', name: 'غار علی‌صدر', cityId: 'hamedan', lat: 35.305, lng: 48.29, cat: 'cave', rating: 4.7, visitMinutes: 180, ticket: 500_000, indoor: true, difficulty: 1, tags: ['قایق‌سواری', 'کودک‌پسند'], desc: 'بزرگ‌ترین غار آبی جهان؛ بازدید با قایق پارویی انجام می‌شود.' }),
  poi({ id: 'bouali', name: 'آرامگاه بوعلی سینا', cityId: 'hamedan', lat: 34.797, lng: 48.514, cat: 'historical', rating: 4.3, visitMinutes: 50, ticket: 100_000, indoor: true, desc: 'آرامگاه ابن‌سینا با برجی الهام‌گرفته از گنبد قابوس و موزهٔ کوچک.' }),
  poi({ id: 'ganjnameh', name: 'گنجنامه و آبشار', cityId: 'hamedan', lat: 34.77, lng: 48.46, cat: 'historical', rating: 4.4, visitMinutes: 90, ticket: 100_000, difficulty: 1, bestMonths: TEMPERATE, tags: ['کتیبهٔ داریوش', 'تله‌کابین'], desc: 'کتیبه‌های میخی داریوش و خشایارشا در دامنهٔ الوند، کنار آبشاری خنک.' }),
  poi({ id: 'hegmataneh', name: 'تپهٔ هگمتانه', cityId: 'hamedan', lat: 34.805, lng: 48.52, cat: 'historical', rating: 4.0, visitMinutes: 75, ticket: 100_000, difficulty: 1, bestMonths: TEMPERATE, tags: ['ماد'], desc: 'محوطهٔ باستانی پایتخت ماد با خیابان‌بندی شطرنجی قابل تشخیص.' }),
  poi({ id: 'taq-bostan', name: 'طاق بستان', cityId: 'kermanshah', lat: 34.39, lng: 47.13, cat: 'historical', rating: 4.6, visitMinutes: 75, ticket: 150_000, tags: ['ساسانی', 'نقش‌برجسته'], desc: 'نقش‌برجسته‌های ساسانی کنار چشمه؛ صحنهٔ شکار خسروپرویز شاهکار است.' }),
  poi({ id: 'bisotun', name: 'بیستون', cityId: 'kermanshah', lat: 34.39, lng: 47.44, cat: 'historical', rating: 4.5, visitMinutes: 90, ticket: 150_000, difficulty: 1, tags: ['یونسکو', 'کتیبهٔ داریوش'], desc: 'بزرگ‌ترین کتیبهٔ میخی جهان بر دیوارهٔ کوه؛ کلید رمزگشایی خط میخی.' }),
  poi({ id: 'anahita-temple', name: 'معبد آناهیتا کنگاور', cityId: 'kermanshah', lat: 34.503, lng: 47.966, cat: 'historical', rating: 4.1, visitMinutes: 60, ticket: 100_000, difficulty: 1, tags: ['ستون‌های سنگی'], desc: 'بازماندهٔ معبدی عظیم با ستون‌های سنگی، در مسیر کرمانشاه به همدان.' }),
  poi({ id: 'moavenolmolk', name: 'تکیهٔ معاون‌الملک', cityId: 'kermanshah', lat: 34.32, lng: 47.07, cat: 'historical', rating: 4.5, visitMinutes: 60, ticket: 100_000, indoor: true, tags: ['کاشی‌کاری روایی'], desc: 'کاشی‌کاری‌های رنگی که داستان کربلا و شاهنامه را روایت می‌کنند.' }),
  poi({ id: 'uraman', name: 'روستای اورامان تخت', cityId: 'paveh', lat: 35.25, lng: 46.35, cat: 'village', rating: 4.8, visitMinutes: 180, ticket: 0, difficulty: 2, bestMonths: [4, 5, 6, 7, 8, 9, 10], seniorFriendly: false, requiresVehicle: 1, tags: ['یونسکو', 'پلکانی', 'رایگان'], desc: 'روستای پلکانی سنگی هورامان؛ جادهٔ کوهستانی پرپیچ اما مناظرش کم‌نظیر است.' }),
  poi({ id: 'quri-qaleh', name: 'غار قوری‌قلعه', cityId: 'paveh', lat: 34.92, lng: 46.68, cat: 'cave', rating: 4.6, visitMinutes: 120, ticket: 250_000, indoor: true, difficulty: 2, seniorFriendly: false, tags: ['بزرگ‌ترین غار آبی خاورمیانه'], desc: 'غار آبی با تالارهای بلند و پله‌های زیاد؛ داخل خنک و لغزنده است.' }),
  poi({ id: 'zrebar', name: 'دریاچهٔ زریوار مریوان', cityId: 'marivan', lat: 35.53, lng: 46.12, cat: 'lake', rating: 4.5, visitMinutes: 150, ticket: 0, bestMonths: [4, 5, 6, 7, 8, 9, 10], tags: ['رایگان', 'قایق'], desc: 'دریاچهٔ آب‌شیرین کوهستانی با نیزارها؛ غروبش معرکه است.' }),

  // ─────────────────────────── لرستان و خوزستان ───────────────────────────
  poi({ id: 'falak-ol-aflak', name: 'قلعهٔ فلک‌الافلاک', cityId: 'khorramabad', lat: 33.487, lng: 48.351, cat: 'historical', rating: 4.6, visitMinutes: 90, ticket: 200_000, difficulty: 1, tags: ['ساسانی', 'موزه'], desc: 'دژ عظیم ساسانی روی تپه‌ای مشرف به شهر، امروز موزهٔ مردم‌شناسی لرستان.' }),
  poi({ id: 'bisheh-waterfall', name: 'آبشار بیشه', cityId: 'khorramabad', lat: 33.35, lng: 48.8, cat: 'waterfall', rating: 4.4, visitMinutes: 90, ticket: 50_000, difficulty: 1, bestMonths: [3, 4, 5, 6, 7], tags: ['قطار', 'راه‌آهن سراسری'], desc: 'آبشاری کنار ریل راه‌آهن سراسری؛ بهار پرآب‌ترین فصلش است.' }),
  poi({ id: 'gahar-lake', name: 'دریاچهٔ گهر', cityId: 'khorramabad', lat: 33.3, lng: 49.0, cat: 'lake', rating: 4.9, visitMinutes: 480, ticket: 100_000, difficulty: 3, bestMonths: [6, 7, 8, 9], minAge: 14, kidFriendly: false, seniorFriendly: false, requiresVehicle: 2, tags: ['اشترانکوه', 'ترکینگ'], desc: 'نگین اشترانکوه در ارتفاع ۲۳۶۰ متری؛ رسیدنش یک ترکینگ جدی چندساعته است.' }),
  poi({ id: 'shevi', name: 'آبشار شوی (تله‌زنگ)', cityId: 'dezful', lat: 32.7, lng: 48.6, cat: 'waterfall', rating: 4.7, visitMinutes: 240, ticket: 100_000, difficulty: 3, bestMonths: [3, 4, 5, 11, 12], minAge: 12, kidFriendly: false, seniorFriendly: false, requiresVehicle: 1, tags: ['پرآب‌ترین آبشار ایران'], desc: 'پرآب‌ترین آبشار ایران در دره‌ای صعب‌العبور؛ مسیرش راهنمای محلی می‌خواهد.' }),
  poi({ id: 'chogha-zanbil', name: 'چغازنبیل', cityId: 'shush', lat: 32.008, lng: 48.521, cat: 'historical', rating: 4.8, visitMinutes: 90, ticket: 200_000, difficulty: 1, bestMonths: [11, 12, 1, 2, 3], tags: ['یونسکو', 'زیگورات ایلامی'], desc: 'سالم‌ترین زیگورات جهان از ۳۲۰۰ سال پیش. تابستان خوزستان کشنده است.' }),
  poi({ id: 'shush-castle', name: 'کاخ آپادانا و قلعهٔ شوش', cityId: 'shush', lat: 32.19, lng: 48.25, cat: 'historical', rating: 4.3, visitMinutes: 90, ticket: 150_000, difficulty: 1, bestMonths: GULF, tags: ['آرامگاه دانیال'], desc: 'محوطهٔ باستانی شوش با قلعهٔ فرانسوی و آرامگاه دانیال نبی در نزدیکی.' }),
  poi({ id: 'shushtar-hydraulic', name: 'سازه‌های آبی شوشتر', cityId: 'shushtar', lat: 32.04, lng: 48.85, cat: 'historical', rating: 4.8, visitMinutes: 120, ticket: 200_000, difficulty: 1, bestMonths: GULF, tags: ['یونسکو', 'آبشارها'], desc: 'شاهکار مهندسی هیدرولیک ساسانی؛ آبشارها، آسیاب‌ها و تونل‌های آب.' }),

  // ─────────────────────────── جنوب و خلیج فارس ───────────────────────────
  poi({ id: 'hormuz-valley', name: 'درهٔ رنگین‌کمان جزیرهٔ هرمز', cityId: 'hormuz', lat: 27.05, lng: 56.46, cat: 'nature', rating: 4.8, visitMinutes: 240, ticket: 100_000, difficulty: 1, bestMonths: GULF, requiresVehicle: 1, tags: ['خاک سرخ', 'ساحل نقره‌ای'], desc: 'کوه‌های رنگی، خاک خوراکی سرخ و ساحل نقره‌ای؛ جزیره را با تور محلی بگردید.' }),
  poi({ id: 'hara-forest', name: 'جنگل‌های حرا قشم', cityId: 'qeshm', lat: 26.8, lng: 55.8, cat: 'nature', rating: 4.6, visitMinutes: 150, ticket: 400_000, bestMonths: GULF, tags: ['قایق', 'پرنده‌نگری'], desc: 'قایق‌سواری میان درختان حرا که ریشه در آب شور دارند؛ صبح زود بهترین است.' }),
  poi({ id: 'stars-valley', name: 'درهٔ ستارگان قشم', cityId: 'qeshm', lat: 26.78, lng: 55.95, cat: 'nature', rating: 4.6, visitMinutes: 120, ticket: 150_000, difficulty: 1, bestMonths: GULF, tags: ['ژئوپارک', 'غروب'], desc: 'ستون‌های فرسایشی عجیب که افسانه‌های محلی زیادی دربارهٔ آن ساخته‌اند.' }),
  poi({ id: 'chahkuh', name: 'تنگهٔ چاهکوه قشم', cityId: 'qeshm', lat: 26.85, lng: 55.75, cat: 'nature', rating: 4.7, visitMinutes: 90, ticket: 150_000, difficulty: 1, bestMonths: GULF, tags: ['ژئوپارک', 'عکاسی'], desc: 'شکاف باریک با دیواره‌های تراش‌خوردهٔ آب؛ یکی از بهترین سوژه‌های عکاسی ایران.' }),
  poi({ id: 'kish-greek-ship', name: 'کشتی یونانی کیش', cityId: 'kish', lat: 26.51, lng: 53.92, cat: 'beach', rating: 4.2, visitMinutes: 60, ticket: 0, bestMonths: GULF, nightSuitable: true, tags: ['رایگان', 'غروب'], desc: 'لاشهٔ کشتی به‌گل‌نشسته؛ غروب پشت آن معروف‌ترین منظرهٔ کیش است.' }),
  poi({ id: 'kariz-kish', name: 'شهر زیرزمینی کاریز کیش', cityId: 'kish', lat: 26.54, lng: 53.98, cat: 'historical', rating: 4.4, visitMinutes: 90, ticket: 500_000, indoor: true, difficulty: 1, tags: ['خنک', 'کودک‌پسند'], desc: 'قنات ۲۵۰۰ ساله که به مجموعه‌ای زیرزمینی تبدیل شده؛ در گرما پناهگاه است.' }),
  poi({ id: 'kish-coral-beach', name: 'ساحل مرجانی کیش', cityId: 'kish', lat: 26.53, lng: 53.98, cat: 'beach', rating: 4.4, visitMinutes: 180, ticket: 0, bestMonths: GULF, tags: ['رایگان', 'شنا', 'اسکوبا'], desc: 'آب شفاف با کف مرجانی؛ مناسب شنا و تفریحات آبی.' }),
  poi({ id: 'chabahar-martian', name: 'کوه‌های مریخی چابهار', cityId: 'chabahar', lat: 25.4, lng: 60.4, cat: 'nature', rating: 4.7, visitMinutes: 180, ticket: 0, bestMonths: GULF, requiresVehicle: 1, tags: ['مکران', 'رایگان'], desc: 'سازندهای فرسایشی سفید و عجیب در جادهٔ ساحلی مکران؛ انگار سیارهٔ دیگری است.' }),
  poi({ id: 'darak', name: 'ساحل دَرَک (جایی که صحرا به دریا می‌رسد)', cityId: 'chabahar', lat: 25.5, lng: 59.5, cat: 'beach', rating: 4.8, visitMinutes: 240, ticket: 0, bestMonths: GULF, requiresVehicle: 1, tags: ['رایگان', 'کمپ', 'شن و دریا'], desc: 'تپه‌های شنی که مستقیم به دریای عمان می‌ریزند؛ کمپ شبانه‌اش افسانه‌ای است.' }),
  poi({ id: 'bushehr-old', name: 'بافت تاریخی بندر بوشهر', cityId: 'bushehr', lat: 28.9834, lng: 50.8362, cat: 'historical', rating: 4.2, visitMinutes: 120, ticket: 50_000, difficulty: 1, bestMonths: GULF, tags: ['خانه‌های بادگیردار'], desc: 'کوچه‌های باریک و خانه‌های چوبی‌ایوانی بندری با معماری خاص خلیج فارس.' }),

  // ─────────────────────────── خراسان ───────────────────────────
  poi({ id: 'imam-reza', name: 'حرم مطهر امام رضا (ع)', cityId: 'mashhad', lat: 36.288, lng: 59.6157, cat: 'religious', rating: 5.0, visitMinutes: 150, ticket: 0, difficulty: 1, nightSuitable: true, tags: ['رایگان', 'زیارت'], desc: 'بزرگ‌ترین مجموعهٔ مذهبی جهان از نظر مساحت؛ شب‌ها هم باز است.' }),
  poi({ id: 'ferdowsi-tomb', name: 'آرامگاه فردوسی (توس)', cityId: 'mashhad', lat: 36.48, lng: 59.79, cat: 'historical', rating: 4.5, visitMinutes: 75, ticket: 150_000, tags: ['شاهنامه', 'باغ'], desc: 'آرامگاه سنگی حکیم توس در باغی آرام، با موزهٔ شاهنامه در کنارش.' }),
  poi({ id: 'khayyam-tomb', name: 'آرامگاه خیام نیشابور', cityId: 'neyshabur', lat: 36.18, lng: 58.82, cat: 'historical', rating: 4.5, visitMinutes: 60, ticket: 150_000, tags: ['معماری مدرن', 'باغ'], desc: 'سازهٔ مشبک مدرن روی آرامگاه خیام؛ در همان باغ امامزاده محروق است.' }),
  poi({ id: 'kang-village', name: 'روستای پلکانی کنگ', cityId: 'mashhad', lat: 36.33, lng: 59.05, cat: 'village', rating: 4.3, visitMinutes: 120, ticket: 0, difficulty: 2, bestMonths: TEMPERATE, seniorFriendly: false, tags: ['رایگان', 'ماسولهٔ خراسان'], desc: 'روستای پلکانی کوهستانی نزدیک مشهد؛ گزینهٔ خوب برای نیم‌روز فرار از شهر.' }),
  poi({ id: 'neyshabur-firuzeh', name: 'معدن و بازار فیروزهٔ نیشابور', cityId: 'neyshabur', lat: 36.21, lng: 58.79, cat: 'shopping', rating: 4.1, visitMinutes: 75, ticket: 0, tags: ['رایگان', 'سوغات'], desc: 'مرکز فیروزهٔ ایران؛ برای خرید سوغات با راهنمای مطمئن بروید.' }),
]

export const POI_BY_ID = new Map(POIS.map((p) => [p.id, p]))

export const CATEGORY_LABEL: Record<string, string> = {
  historical: 'تاریخی',
  nature: 'طبیعت',
  religious: 'مذهبی',
  museum: 'موزه',
  adventure: 'ماجراجویی',
  food: 'خوراک',
  shopping: 'خرید',
  entertainment: 'تفریحی',
  village: 'روستا',
  beach: 'ساحل',
  desert: 'کویر',
  mountain: 'کوهستان',
  lake: 'دریاچه',
  waterfall: 'آبشار',
  cave: 'غار',
  garden: 'باغ',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  historical: '🏛️',
  nature: '🌿',
  religious: '🕌',
  museum: '🖼️',
  adventure: '🧗',
  food: '🍽️',
  shopping: '🛍️',
  entertainment: '🎡',
  village: '🏘️',
  beach: '🏖️',
  desert: '🏜️',
  mountain: '⛰️',
  lake: '🏞️',
  waterfall: '💦',
  cave: '🕳️',
  garden: '🌳',
}

export const DIFFICULTY_LABEL = ['بدون پیاده‌روی', 'پیاده‌روی سبک', 'پیاده‌روی سنگین', 'کوهنوردی'] as const
