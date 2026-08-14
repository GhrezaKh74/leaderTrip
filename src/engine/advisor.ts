import type {
  CostBreakdown,
  DayPlan,
  GroupProfile,
  TripInput,
  Vehicle,
  Warning,
  WeatherProfile,
} from '../domain/types'
import { getCity } from '../data/cities'
import { POI_BY_ID } from '../data/pois'
import { isSnowCode, isStormCode, weatherLabel } from '../services/weather'
import { FROST_THRESHOLD, HEAT_THRESHOLD, RAIN_PROB_THRESHOLD, WIND_THRESHOLD_KMH } from './climate'
import { isNowruzPeriod, fromISODate } from '../lib/jalali'
import { faNum, percent, tomanShort } from '../lib/format'

/**
 * مشاور — تنها جایی که هشدارها ساخته می‌شوند.
 *
 * برنامه‌ریز فقط «واقعیت» تولید می‌کند؛ قضاوت دربارهٔ اینکه کدام واقعیت
 * نگران‌کننده است این‌جا انجام می‌شود. هر هشدار باید بگوید چه کاری می‌شود کرد،
 * وگرنه فقط سروصداست.
 */

export interface AdviceContext {
  input: TripInput
  group: GroupProfile
  vehicle: Vehicle
  days: DayPlan[]
  cost: CostBreakdown
  weather: WeatherProfile
  /** دلیل رد شدن جاذبه‌های داخل محدوده */
  rejected: Map<string, string>
  /** جاذبه‌هایی که امتیاز آوردند ولی جا نشدند */
  droppedCount: number
  /** جاذبه‌های پین‌شده‌ای که با قیدهای سفر تناقض دارند */
  pinnedConflicts: { name: string; reason: string }[]
  /** جاذبه‌های «حتماً برو» که در زمان‌بندی جا نشدند */
  unscheduledPinned: string[]
}

export function advise(ctx: AdviceContext): Warning[] {
  return [...tripWarnings(ctx), ...ctx.days.flatMap((d) => dayWarnings(d, ctx))]
}

// ─────────────────────────── هشدارهای روز ───────────────────────────

export function dayWarnings(day: DayPlan, ctx: AdviceContext): Warning[] {
  const out: Warning[] = []
  const { group, input } = ctx
  const d = day.index
  const hours = day.drivingMinutes / 60

  // ─ خستگی رانندگی ─
  if (hours > 7) {
    out.push({
      level: 'danger',
      title: `${faNum(hours, 1)} ساعت رانندگی در یک روز`,
      detail:
        'این مقدار رانندگی حتی با راننده دوم خسته‌کننده است. یک جاذبه را حذف کنید یا یک شب اضافه بگذارید.',
      day: d,
    })
  } else if (hours > 5 && group.drivers < 2) {
    out.push({
      level: 'danger',
      title: `${faNum(hours, 1)} ساعت رانندگی با یک راننده`,
      detail: 'برای این حجم رانندگی راننده دوم لازم است، یا این روز را کوتاه‌تر کنید.',
      day: d,
    })
  }

  // ─ فشار جسمی ─
  const visits = day.blocks
    .filter((b) => b.kind === 'visit' && b.poiId)
    .map((b) => POI_BY_ID.get(b.poiId!))
    .filter((p): p is NonNullable<typeof p> => !!p)

  const hard = visits.filter((p) => p.difficulty >= 2)
  if (hard.length >= 2 && (group.hasChild || group.hasSenior || group.hasToddler)) {
    out.push({
      level: 'warn',
      title: 'روز پرفشار برای اعضای گروه',
      detail: `${faNum(hard.length)} بازدید با پیاده‌روی سنگین در یک روز، با وجود کودک یا سالمند در جمع.`,
      day: d,
    })
  }

  // ─ روز جابه‌جایی ─
  if (visits.length === 0) {
    out.push({
      level: 'info',
      title: 'روز جابه‌جایی',
      detail: 'فاصله زیاد بود و جاذبه‌ای در این روز جا نشد؛ این روز صرف نزدیک‌شدن به مقصد می‌شود.',
      day: d,
    })
  }

  // ─ پایان دیرهنگام ─
  const lastActive = Math.max(
    ...day.blocks.filter((b) => b.kind !== 'lodging').map((b) => b.startMin + b.durationMin),
    0,
  )
  if (lastActive > 22 * 60) {
    out.push({
      level: 'info',
      title: 'روز طولانی',
      detail: `برنامهٔ این روز تا حدود ساعت ${faNum(Math.round(lastActive / 60))} ادامه دارد.`,
      day: d,
    })
  }

  // ─ آب‌وهوا ─
  const w = day.weather
  if (w) {
    const city = getCity(day.baseCityId)
    const label = weatherLabel(w.code)
    const outdoorCount = visits.filter((p) => !p.indoor).length

    if (isSnowCode(w.code)) {
      out.push({
        level: 'danger',
        title: `${label.icon} بارش برف در ${city.name}`,
        detail:
          'زنجیر چرخ همراه داشته باشید و وضعیت جاده را پیش از حرکت از ۱۴۱ بپرسید. ' +
          'زمان رانندگی این روز با فرض کندی برف حساب شده است.',
        day: d,
      })
    } else if (w.precipProb >= RAIN_PROB_THRESHOLD) {
      out.push({
        level: outdoorCount >= 2 ? 'warn' : 'info',
        title: `${label.icon} احتمال بارش ${faNum(w.precipProb)}٪`,
        detail:
          outdoorCount >= 2
            ? `${faNum(outdoorCount)} بازدید این روز در فضای باز است. بارانی و کفش ضدآب ببرید و برنامهٔ جایگزین سرپوشیده در نظر داشته باشید.`
            : 'باران محتمل است؛ بارانی همراه داشته باشید.',
        day: d,
      })
    }

    if (w.tMax >= HEAT_THRESHOLD) {
      out.push({
        level: 'warn',
        title: `🌡️ گرمای ${faNum(w.tMax)} درجه`,
        detail:
          'شروع روز جلو کشیده شده و استراحت نیم‌روزی اضافه شده است. آب فراوان، کلاه و ضدآفتاب ضروری است.',
        day: d,
      })
    } else if (w.tMin <= FROST_THRESHOLD) {
      out.push({
        level: 'warn',
        title: `🥶 یخبندان شبانه (${faNum(w.tMin)} درجه)`,
        detail:
          'شروع روز عقب انداخته شده تا جادهٔ یخ‌زده باز شود. ضدیخ و لباس گرم را چک کنید.',
        day: d,
      })
    }

    if (isStormCode(w.code) || w.windMaxKmh >= WIND_THRESHOLD_KMH) {
      out.push({
        level: 'warn',
        title: `💨 باد شدید (${faNum(w.windMaxKmh)} کیلومتر بر ساعت)`,
        detail:
          'در مسیرهای کویری و ساحلی و ارتفاعات با احتیاط رانندگی کنید؛ گردوغبار و تندباد محتمل است.',
        day: d,
      })
    }
  }

  // ─ گردنهٔ مرتفع ─
  // ارتفاع تنها چیزی است که ریسک بسته‌شدن جاده را از پیش قابل دیدن می‌کند
  if (day.maxElevationM && day.maxElevationM >= 2200) {
    const cold = month(ctx) <= 3 || month(ctx) >= 11
    out.push({
      level: cold ? 'warn' : 'info',
      title: `⛰️ ارتفاع ${faNum(day.maxElevationM)} متر در برنامهٔ این روز`,
      detail: cold
        ? 'در فصل سرد، گردنه‌های این ارتفاع ممکن است برفی یا بسته باشند. پیش از حرکت وضعیت جاده را از ۱۴۱ بپرسید و زنجیر چرخ همراه داشته باشید.'
        : 'هوای این ارتفاع حتی در تابستان خنک است؛ یک لایهٔ گرم همراه داشته باشید. تنگی نفس خفیف در روز اول طبیعی است.',
      day: d,
    })
  }

  // ─ نکات محلی ─
  if (input.days > 0) {
    const city = getCity(day.baseCityId)
    if (city.amenities === 1) {
      out.push({
        level: 'info',
        title: `امکانات محدود در ${city.name}`,
        detail: 'اقامتگاه و رستوران در این شهر کم است؛ از قبل هماهنگ کنید.',
        day: d,
      })
    }
  }

  return out
}

// ─────────────────────────── هشدارهای کل سفر ───────────────────────────

function tripWarnings(ctx: AdviceContext): Warning[] {
  const { input, group, vehicle, cost, weather, rejected, droppedCount, pinnedConflicts } = ctx
  const out: Warning[] = []

  // ─ راننده ─
  if (group.drivers === 0) {
    out.push({
      level: 'danger',
      title: 'هیچ راننده‌ای مشخص نشده',
      detail: 'دست‌کم یک نفر از همسفران را به‌عنوان راننده علامت بزنید.',
    })
  }

  // ─ پین‌های متناقض ─
  for (const c of pinnedConflicts) {
    out.push({
      level: 'warn',
      title: `«${c.name}» با شرایط سفر جور نیست`,
      detail: `${c.reason} — چون خودتان آن را پین کرده‌اید در برنامه نگه داشته شد.`,
    })
  }

  // ─ پین‌هایی که جا نشدند ─
  // خواستهٔ صریح کاربر را نمی‌شود بی‌صدا انداخت دور
  if (ctx.unscheduledPinned.length > 0) {
    const names = ctx.unscheduledPinned
      .map((id) => POI_BY_ID.get(id)?.name)
      .filter(Boolean)
      .join('، ')
    out.push({
      level: 'warn',
      title: `«${names}» در زمان‌بندی جا نشد`,
      detail:
        'این جاذبه را «حتماً برو» کرده‌اید ولی با سقف رانندگی روزانه و تعداد روزهای فعلی نمی‌شود به آن رسید. ' +
        'یک روز به سفر اضافه کنید، سقف رانندگی را بالا ببرید، یا چند پین دیگر را بردارید.',
    })
  }

  // ─ بودجه ─
  if (cost.overBudget > 0) {
    out.push({
      level: 'warn',
      title: `${percent(cost.overBudget / Math.max(1, input.budgetTotal))} بالاتر از بودجه`,
      detail: `${tomanShort(cost.overBudget)} بیشتر از بودجهٔ شماست. در زبانهٔ هزینه، بخش «راه‌های کاهش هزینه» گزینه‌ها را با عدد نشان می‌دهد.`,
    })
  } else if (input.budgetTotal > 0 && cost.total < input.budgetTotal * 0.6) {
    out.push({
      level: 'info',
      title: 'بودجه جای بیشتری دارد',
      detail: `${tomanShort(input.budgetTotal - cost.total)} باقی می‌ماند — می‌توانید شعاع سفر را بیشتر کنید، یک روز اضافه کنید، یا سطح اقامت را یک پله بالا ببرید.`,
    })
  }

  // ─ تعطیلات ─
  if (isNowruzPeriod(fromISODate(input.startDate))) {
    out.push({
      level: 'warn',
      title: 'سفر در بازهٔ نوروز',
      detail: 'قیمت اقامت تا ۴۵٪ بالاتر حساب شده است. حتماً از قبل رزرو کنید و ترافیک جاده‌ها را در نظر بگیرید.',
    })
  }

  // ─ منبع آب‌وهوا ─
  if (weather.source === 'historical') {
    out.push({
      level: 'info',
      title: 'آب‌وهوا: انتظار فصلی، نه پیش‌بینی',
      detail:
        'تاریخ سفر دورتر از افق ۱۶ روزهٔ پیش‌بینی است، پس داده‌های همین بازه در سال گذشته نمایش داده می‌شود. نزدیک‌تر که شدید دوباره چک کنید.',
    })
  }

  // ─ محدودیت خودرو ─
  const byVehicle = [...rejected.values()].filter((r) => r.includes('خودرو')).length
  if (byVehicle >= 3 && vehicle.offroad === 0) {
    out.push({
      level: 'info',
      title: `${faNum(byVehicle)} جاذبه به‌خاطر نوع خودرو حذف شد`,
      detail: 'این مقصدها جادهٔ خاکی یا کوهستانی دارند و با خودروی سواری توصیه نمی‌شوند.',
    })
  }

  // ─ محدودیت تحرک ─
  const byMobility = [...rejected.values()].filter(
    (r) => r.includes('ویلچر') || r.includes('سختی'),
  ).length
  if (byMobility >= 3) {
    out.push({
      level: 'info',
      title: `${faNum(byMobility)} جاذبه به‌خاطر سختی مسیر کنار گذاشته شد`,
      detail: 'برنامه بر پایهٔ توان کم‌توان‌ترین عضو گروه چیده شده است.',
    })
  }

  // ─ جاذبه‌های جا نشده ─
  if (droppedCount > 0) {
    out.push({
      level: 'info',
      title: `${faNum(droppedCount)} جاذبه در برنامه جا نشد`,
      detail: 'با افزودن یک روز به سفر یا بالا بردن سقف رانندگی روزانه می‌توانید بیشترشان را بگنجانید.',
    })
  }

  // ─ نکات اقلیمی ─
  out.push(...climateTips(ctx))

  return out
}

function month(ctx: AdviceContext): number {
  return fromISODate(ctx.input.startDate).getMonth() + 1
}

function climateTips(ctx: AdviceContext): Warning[] {
  const out: Warning[] = []
  const climates = new Set(ctx.days.map((d) => getCity(d.baseCityId).climate))
  const m = month(ctx)

  if (climates.has('desert')) {
    out.push({
      level: 'info',
      title: 'سفر کویری',
      detail:
        'اختلاف دمای روز و شب در کویر زیاد است؛ حتی در تابستان لباس گرم شب ببرید. آب ذخیره داشته باشید و شب‌ها بدون راهنما وارد کویر نشوید.',
    })
  }
  if (climates.has('caspian') && m >= 5 && m <= 9) {
    out.push({
      level: 'info',
      title: 'شمال در فصل گرم',
      detail: 'رطوبت بالا و پشه فراوان است؛ ضدپشه ببرید و ترافیک آخر هفتهٔ جاده‌های شمال را در نظر بگیرید.',
    })
  }
  if (climates.has('gulf') && m >= 5 && m <= 9) {
    out.push({
      level: 'warn',
      title: 'جنوب در تابستان',
      detail: 'گرما و شرجی جنوب در این ماه‌ها طاقت‌فرساست. اگر امکان دارد سفر را به آبان تا اسفند موکول کنید.',
    })
  }
  if (climates.has('mountain') && (m <= 3 || m >= 11)) {
    out.push({
      level: 'warn',
      title: 'جاده‌های کوهستانی در فصل سرد',
      detail: 'زنجیر چرخ، لاستیک سالم و باک پر ضروری است. پیش از حرکت وضعیت جاده را از ۱۴۱ بپرسید.',
    })
  }

  return out
}
