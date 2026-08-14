import type { PackingGroup, PackingItem, TripPlan } from '../domain/types'
import { getCity } from '../data/cities'
import { getVehicle } from '../data/vehicles'
import { POI_BY_ID } from '../data/pois'
import { buildGroupProfile } from './scoring'
import { fromISODate } from '../lib/jalali'
import { km } from '../lib/format'

/**
 * چک‌لیست بار — تولیدشده از ترکیب فصل، اقلیم مقصدها، نوع اقامت،
 * اعضای گروه و فعالیت‌های واقعی برنامه.
 *
 * هر قلمِ غیربدیهی «دلیل» دارد، تا کاربر بداند چرا پیشنهاد شده و بتواند
 * با خیال راحت حذفش کند.
 */
export function buildPackingList(plan: TripPlan): PackingGroup[] {
  const g = buildGroupProfile(plan.input.travelers)
  const vehicle = getVehicle(plan.input.vehicleId)
  const month = fromISODate(plan.input.startDate).getMonth() + 1

  const cities = plan.days.map((d) => getCity(d.baseCityId))
  const climates = new Set(cities.map((c) => c.climate))

  const pois = plan.days
    .flatMap((d) => d.blocks)
    .filter((b) => b.kind === 'visit' && b.poiId)
    .map((b) => POI_BY_ID.get(b.poiId!))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const w = plan.weather
  const hasHike = pois.some((p) => p.difficulty >= 2)
  const hasSwim = pois.some((p) => p.cat === 'beach' || p.cat === 'lake')
  const hasReligious = pois.some((p) => p.cat === 'religious')
  const cold = w.source !== 'none' ? w.avgTMax <= 12 : month <= 3 || month >= 11
  const hot = w.source !== 'none' ? w.avgTMax >= 33 : month >= 6 && month <= 8

  const groups: PackingGroup[] = []

  // ─────────── ضروریات ───────────
  groups.push({
    title: 'مدارک و ضروریات',
    icon: '🎒',
    items: compact([
      item('کارت ملی و گواهی‌نامهٔ همهٔ رانندگان', true),
      item('کارت خودرو و بیمه‌نامهٔ معتبر', true),
      item('شارژر و پاوربانک', true),
      item('پول نقد', true, 'در روستاها و جاذبه‌های دورافتاده دستگاه کارت‌خوان همیشه کار نمی‌کند'),
      item('نسخهٔ چاپی همین برنامه', false, 'در جادهٔ بدون آنتن به کار می‌آید'),
    ]),
  })

  // ─────────── خودرو ───────────
  groups.push({
    title: 'خودرو',
    icon: '🚗',
    items: compact([
      item('چک لاستیک‌ها و زاپاس (باد و آج)', true),
      item('جک و آچار چرخ', true),
      item('سطح روغن، آب رادیاتور و مایع شیشه‌شور', true),
      item('کابل باطری و طناب یدک', false),
      item('چراغ‌قوه', true),
      plan.stats.totalKm > 800
        ? item('سرویس دوره‌ای پیش از سفر', true, `مسافت این سفر حدود ${km(plan.stats.totalKm)} است`)
        : null,
      cold && climates.has('mountain')
        ? item('زنجیر چرخ', true, 'مسیر کوهستانی در فصل سرد')
        : null,
      cold ? item('ضدیخ', true, 'دمای پایین در مسیر') : null,
      vehicle.offroad > 0 && pois.some((p) => p.requiresVehicle > 0)
        ? item('بیل کوچک و تخته زیر چرخ', false, 'برنامه شامل مسیر خاکی است')
        : null,
    ]),
  })

  // ─────────── پوشاک ───────────
  groups.push({
    title: 'پوشاک',
    icon: '🧥',
    items: compact([
      item('لباس راحت به تعداد روزهای سفر', true),
      hasHike ? item('کفش کوهنوردی یا کتانی مناسب', true, 'برنامه پیاده‌روی سنگین دارد') : null,
      cold ? item('کاپشن گرم، دستکش و کلاه', true, 'هوای سرد در مقصد') : null,
      hot ? item('کلاه لبه‌دار و عینک آفتابی', true, 'گرمای شدید در مقصد') : null,
      w.hasRain ? item('بارانی یا ژاکت ضدآب', true, 'احتمال بارش در روزهای سفر') : null,
      climates.has('caspian') ? item('لباس ضدرطوبت و کفش ضدآب', false, 'اقلیم مرطوب شمال') : null,
      climates.has('desert')
        ? item('یک لایهٔ گرم برای شب', true, 'اختلاف زیاد دمای روز و شب در کویر')
        : null,
      hasSwim ? item('لباس شنا و حوله', false, 'برنامه شامل ساحل یا دریاچه است') : null,
      hasReligious ? item('پوشش مناسب برای اماکن مذهبی', true, 'برنامه شامل زیارتگاه است') : null,
    ]),
  })

  // ─────────── سلامت ───────────
  groups.push({
    title: 'سلامت و بهداشت',
    icon: '💊',
    items: compact([
      item('جعبهٔ کمک‌های اولیه', true),
      item('داروهای شخصی همهٔ اعضا', true),
      item('مسکن، ضدتب و داروی مسافرت', true),
      item('ضدعفونی‌کننده و دستمال مرطوب', true),
      hot ? item('ضدآفتاب', true, 'گرمای شدید و آفتاب مستقیم') : null,
      climates.has('caspian') && month >= 5 && month <= 9
        ? item('ضدپشه', true, 'پشهٔ فراوان در شمال در فصل گرم')
        : null,
      g.hasSenior ? item('فشارسنج و داروهای فشار و قند', true, 'حضور سالمند در گروه') : null,
    ]),
  })

  // ─────────── کودکان ───────────
  if (g.hasToddler || g.hasChild) {
    groups.push({
      title: 'کودکان',
      icon: '🧸',
      items: compact([
        g.hasToddler ? item('پوشک، دستمال و لباس اضافه', true, 'کودک زیر ۴ سال در گروه') : null,
        g.hasToddler ? item('صندلی ایمنی کودک', true, 'الزام ایمنی برای کودک خردسال') : null,
        item('میان‌وعده و آب مخصوص بچه‌ها', true),
        item('سرگرمی مسیر: کتاب، بازی، تبلت', false, 'مسیرهای طولانی برای بچه‌ها کسل‌کننده است'),
        item('پتوی کوچک برای خواب در ماشین', false),
      ]),
    })
  }

  // ─────────── سالمندان ───────────
  if (g.hasSenior || g.hasLimitedMobility) {
    groups.push({
      title: 'سالمندان و همراهان کم‌تحرک',
      icon: '🧓',
      items: compact([
        item('بالشتک گردن و پشتی کمر', false, 'برای رانندگی طولانی'),
        item('عصا یا واکر در صورت نیاز', false),
        item('فهرست داروها با دوز مصرف', true),
        item('کپی مدارک بیمهٔ درمانی', true),
      ]),
    })
  }

  // ─────────── کمپینگ ───────────
  if (plan.input.lodging === 'camp') {
    groups.push({
      title: 'کمپینگ',
      icon: '⛺',
      items: compact([
        item('چادر و زیرانداز', true),
        item('کیسه‌خواب متناسب با دمای شب', true),
        item('چراغ کمپینگ و باطری یدک', true),
        item('گاز پیک‌نیکی و کپسول', true),
        item('ظرف و قاشق و چنگال', true),
        item('کیسهٔ زباله', true, 'هرچه بردید، برگردانید'),
        item('آب آشامیدنی ذخیره', true),
      ]),
    })
  }

  // ─────────── متفرقه ───────────
  groups.push({
    title: 'متفرقه',
    icon: '📦',
    items: compact([
      item('یخدان و آب سرد', false),
      item('میان‌وعده و آجیل بین‌راهی', false),
      item('کیسهٔ زباله برای داخل خودرو', false),
      item('دوربین یا لنز اضافه', false),
      pois.some((p) => p.nightSuitable) ? item('سه‌پایهٔ عکاسی', false, 'برنامه شامل بازدید شبانه است') : null,
      climates.has('desert') ? item('دوربین دوچشمی و اپلیکیشن ستاره‌شناسی', false, 'آسمان شب کویر') : null,
    ]),
  })

  return groups.filter((grp) => grp.items.length > 0)
}

function item(label: string, essential: boolean, reason?: string): PackingItem {
  return { label, essential, reason }
}

function compact(items: (PackingItem | null)[]): PackingItem[] {
  return items.filter((i): i is PackingItem => i !== null)
}
