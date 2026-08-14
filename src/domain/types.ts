// مدل دادهٔ لیدرتریپ — مرجع یکتای انواع
// این فایل هیچ منطقی ندارد؛ فقط تعریف شکل داده.

// ───────────────────────── مرجع جغرافیایی ─────────────────────────

/** سطح امکانات اقامتی و غذایی شهر */
export type Amenities = 1 | 2 | 3

export interface City {
  id: string
  name: string
  province: string
  lat: number
  lng: number
  /** ضریب گرانی نسبت به میانگین کشور؛ ۱٫۰ = میانگین */
  costIndex: number
  amenities: Amenities
  /** نوع اقلیم — روی چک‌لیست و هشدارها اثر دارد */
  climate: Climate
}

export type Climate = 'desert' | 'mountain' | 'caspian' | 'gulf' | 'plain' | 'steppe'

/** نوع زمین بین دو نقطه — روی ضریب پیچش جاده و سرعت اثر دارد */
export type Terrain = 'freeway' | 'plain' | 'mountain' | 'dirt'

// ───────────────────────── جاذبه‌ها ─────────────────────────

export type POICategory =
  | 'historical'
  | 'nature'
  | 'religious'
  | 'museum'
  | 'adventure'
  | 'food'
  | 'shopping'
  | 'entertainment'
  | 'village'
  | 'beach'
  | 'desert'
  | 'mountain'
  | 'lake'
  | 'waterfall'
  | 'cave'
  | 'garden'

/** ۰ = بدون پیاده‌روی · ۱ = پیاده‌روی سبک · ۲ = پیاده‌روی سنگین · ۳ = کوهنوردی */
export type Difficulty = 0 | 1 | 2 | 3

/** حداقل توان آفرود لازم — ۰ آسفالت · ۱ خاکی سبک · ۲ آفرود واقعی */
export type OffroadLevel = 0 | 1 | 2

export interface POI {
  id: string
  name: string
  cityId: string
  lat: number
  lng: number
  cat: POICategory
  tags: string[]
  /** کیفیت عمومی، ۱ تا ۵ */
  rating: number
  /** مدت بازدید معمول به دقیقه */
  visitMinutes: number
  /** بلیت ورودی بزرگسال به تومان؛ ۰ = رایگان */
  ticket: number
  /** ماه‌های میلادی مناسب بازدید (۱..۱۲) */
  bestMonths: number[]
  indoor: boolean
  difficulty: Difficulty
  /** کمینهٔ سن منطقی برای بازدید */
  minAge: number
  kidFriendly: boolean
  seniorFriendly: boolean
  requiresVehicle: OffroadLevel
  /** بازدید شبانه معنا دارد؟ */
  nightSuitable: boolean
  desc: string
}

// ───────────────────────── خودرو ─────────────────────────

export type VehicleClass =
  | 'sedan'
  | 'suv'
  | 'van'
  | 'minibus'
  | 'bus'
  | 'motorcycle'
  | 'ev'

export type FuelKind = 'gasoline' | 'diesel' | 'cng' | 'electric'

export interface Vehicle {
  id: string
  label: string
  cls: VehicleClass
  fuel: FuelKind
  /** لیتر بر ۱۰۰ کیلومتر — برای برقی: کیلووات‌ساعت بر ۱۰۰ کیلومتر */
  consumption: number
  seats: number
  offroad: OffroadLevel
  /** ضریب سرعت مؤثر نسبت به سواری */
  speedFactor: number
  /** تومان بر کیلومتر — روغن، لاستیک، لنت، سرویس */
  depreciationPerKm: number
  /** ضریب عوارض نسبت به سواری */
  tollFactor: number
}

// ───────────────────────── همسفران ─────────────────────────

export type MobilityLevel = 'full' | 'limited' | 'wheelchair'

export interface Traveler {
  id: string
  name: string
  age: number
  mobility: MobilityLevel
  isDriver: boolean
  /** برای کارت اطلاعات اضطراری — اختیاری */
  phone?: string
  /** نقش در گروه، جدا از رانندگی */
  role?: TravelerRole
  /** در کاروان چندخودرویی، سوار خودروی چندم است (از ۱) */
  vehicleIndex?: number
}

export type TravelerRole = 'treasurer' | 'navigator' | 'cook' | 'medic' | 'photographer'

/** خلاصهٔ گروه — از روی فهرست همسفران محاسبه می‌شود */
export interface GroupProfile {
  count: number
  minAge: number
  maxAge: number
  avgAge: number
  drivers: number
  hasToddler: boolean
  hasChild: boolean
  hasSenior: boolean
  hasLimitedMobility: boolean
  hasWheelchair: boolean
  /** توان پیاده‌روی جمع، ۰ تا ۱ — بر پایهٔ ضعیف‌ترین عضو */
  stamina: number
  /** بیشینهٔ سختی قابل تحمل برای این گروه */
  maxDifficulty: Difficulty
}

// ───────────────────────── ورودی سفر ─────────────────────────

export type TravelStyle = 'budget' | 'balanced' | 'comfort' | 'luxury'

export type LodgingKind = 'hotel' | 'ecolodge' | 'villa' | 'camp' | 'friends'

export type SplitMode = 'equal' | 'weighted' | 'itemized'

export interface TripInput {
  /** شناسهٔ پایدار سفر — دفترچهٔ حین سفر به همین کلید بسته می‌شود */
  id: string
  originCityId: string
  /** خالی = حالت کشف آزاد */
  destinationCityId: string | null
  /** تاریخ شروع، میلادی به شکل YYYY-MM-DD */
  startDate: string
  days: number
  radiusKm: number
  travelers: Traveler[]
  vehicleId: string
  vehicleCount: number
  /** بودجهٔ کل به تومان */
  budgetTotal: number
  style: TravelStyle
  lodging: LodgingKind
  interests: POICategory[]
  maxDrivingHoursPerDay: number
  dayStartHour: number
  dayEndHour: number
  roundTrip: boolean
  pinnedPoiIds: string[]
  blockedPoiIds: string[]
  /**
   * ویرایش دستی: هر جاذبه به روز مشخصی سنجاق می‌شود (شمارهٔ روز، از ۱).
   * دستکاری کاربر به‌جای دور زدن الگوریتم، به‌عنوان **قید ورودی** ثبت می‌شود،
   * تا برنامه همچنان یک تابع خالص از ورودی بماند و با هر تغییر دیگری از نو
   * و درست ساخته شود.
   */
  dayAssignment: Record<string, number>
  /** توقف‌های دلخواه کاربر که در پایگاه دادهٔ جاذبه‌ها نیستند */
  customStops: CustomStop[]
  /** عنوان سفر — برای فهرست سفرهای ذخیره‌شده */
  title?: string
  /** سهم سوخت سهمیه‌ای، ۰ تا ۱ */
  subsidizedFuelShare: number
  /** ضرایب قیمت دست‌کاری‌شده توسط کاربر */
  priceOverrides: Partial<PriceBook>
}

/** توقفی که کاربر خودش تعریف کرده — مختصاتش از شهر انتخابی می‌آید */
export interface CustomStop {
  id: string
  name: string
  cityId: string
  visitMinutes: number
  ticket: number
  cat: POICategory
  note?: string
}

// ───────────────────────── قیمت‌ها ─────────────────────────

export interface PriceBook {
  /** تومان بر لیتر — نرخ سهمیه‌ای */
  fuelSubsidized: Record<FuelKind, number>
  /** تومان بر لیتر — نرخ آزاد */
  fuelFree: Record<FuelKind, number>
  /** تومان بر کیلومتر برای سواری */
  tollPerKm: number
  /** سهم آزادراه از مسیر، ۰ تا ۱ */
  freewayShare: number
  /** تومان، هر نفر هر شب */
  lodgingPerNight: Record<TravelStyle, number>
  /** تومان، هر نفر هر وعده */
  meals: Record<TravelStyle, { breakfast: number; lunch: number; dinner: number }>
  /** ضریب تنقلات روی جمع خوراک */
  snackRate: number
  /** نرخ متفرقه روی زیرجمع */
  miscRate: Record<TravelStyle, number>
  /** نرخ بافر ریسک */
  bufferRate: Record<TravelStyle, number>
  /** تاریخ آخرین به‌روزرسانی قیمت‌ها */
  updatedAt: string
}

// ───────────────────────── خروجی برنامه ─────────────────────────

export type BlockKind = 'drive' | 'visit' | 'meal' | 'rest' | 'lodging' | 'fuel'

export interface PlanBlock {
  kind: BlockKind
  /** دقیقه از نیمه‌شب */
  startMin: number
  durationMin: number
  title: string
  poiId?: string
  fromCityId?: string
  toCityId?: string
  distanceKm?: number
  /** هزینهٔ این بلوک برای کل گروه، تومان */
  cost: number
  note?: string
}

export type WarningLevel = 'info' | 'warn' | 'danger'

export interface Warning {
  level: WarningLevel
  title: string
  detail: string
  /** شمارهٔ روز مرتبط، اگر مربوط به یک روز خاص باشد */
  day?: number
}

export interface DayPlan {
  index: number
  /** تاریخ میلادی YYYY-MM-DD */
  date: string
  baseCityId: string
  blocks: PlanBlock[]
  distanceKm: number
  drivingMinutes: number
  cost: number
  warnings: Warning[]
  weather?: DayWeather
}

// ───────────────────────── آب‌وهوا ─────────────────────────

export interface DayWeather {
  /** تاریخ میلادی YYYY-MM-DD */
  date: string
  tMax: number
  tMin: number
  /** میلی‌متر بارش */
  precipMm: number
  /** احتمال بارش، ۰ تا ۱۰۰ */
  precipProb: number
  windMaxKmh: number
  /** کد وضعیت جوی WMO */
  code: number
  /**
   * forecast = پیش‌بینی واقعی (تا ۱۶ روز آینده)
   * historical = میانگین همان بازه در سال گذشته، برای تاریخ‌های دورتر
   */
  source: 'forecast' | 'historical'
}

/** کلید: `${cityId}|${date}` */
export type WeatherMap = Record<string, DayWeather>

/** خلاصهٔ جوّی کل سفر — ورودی امتیازدهی جاذبه‌ها */
export interface WeatherProfile {
  avgTMax: number
  avgPrecipProb: number
  hasRain: boolean
  hasHeat: boolean
  hasFrost: boolean
  hasSnow: boolean
  hasStorm: boolean
  source: 'forecast' | 'historical' | 'none'
}

// ───────────────────────── هزینه ─────────────────────────

export interface CostLine {
  key: string
  label: string
  amount: number
  /** توضیح خوانا از نحوهٔ محاسبه */
  formula: string
}

export interface CostBreakdown {
  lines: CostLine[]
  subtotal: number
  misc: number
  buffer: number
  total: number
  perPerson: number
  /** بازهٔ خوش‌بینانه تا بدبینانه */
  optimistic: number
  pessimistic: number
  overBudget: number
}

// ───────────────────────── برنامهٔ نهایی ─────────────────────────

export interface TripStats {
  totalKm: number
  totalDrivingMin: number
  poiCount: number
  nights: number
}

export interface TripPlan {
  input: TripInput
  days: DayPlan[]
  cost: CostBreakdown
  warnings: Warning[]
  stats: TripStats
  /** جاذبه‌هایی که امتیاز آوردند ولی در برنامه جا نشدند */
  droppedPoiIds: string[]
  /** همهٔ کاندیدهای قبول‌شده با امتیازشان — برای فهرست «جاذبه‌های دیگر» */
  candidates: { poiId: string; score: number; inPlan: boolean }[]
  weather: WeatherProfile
  generatedAt: string
}

// ───────────────────────── چک‌لیست بار ─────────────────────────

export interface PackingItem {
  label: string
  /** چرا این قلم پیشنهاد شده — مثلاً «چون کودک زیر ۳ سال همراه است» */
  reason?: string
  essential: boolean
}

export interface PackingGroup {
  title: string
  icon: string
  items: PackingItem[]
}

// ───────────────────────── اهرم‌های کاهش هزینه ─────────────────────────

export interface BudgetLever {
  id: string
  title: string
  detail: string
  /** صرفه‌جویی واقعی، از اجرای دوبارهٔ برنامه‌ریز به‌دست آمده */
  saving: number
  patch: Partial<TripInput>
}


// ───────────────────────── حین سفر ─────────────────────────

/**
 * دفترچهٔ سفر — چیزی که **واقعاً اتفاق افتاد**.
 *
 * عمداً بیرون از `TripInput` زندگی می‌کند: ورودی، قیدهای برنامه‌ریزی است و
 * برنامه یک تابع خالص از آن؛ دفترچه اما مشاهده است، نه قید. اگر این دو قاطی
 * شوند، ثبت یک هزینهٔ واقعی باعث بازچینش برنامه می‌شود — که بی‌معناست.
 */
export interface TripJournal {
  tripId: string
  /** کلید: شناسهٔ جاذبه یا `lodging:<روز>` */
  checkIns: Record<string, CheckIn>
  expenses: Expense[]
  updatedAt: string
}

export interface CheckIn {
  /** زمان واقعی رسیدن، ISO */
  at: string
  /** امتیاز شخصی، ۱ تا ۵ */
  rating?: number
  note?: string
  /** شناسهٔ عکس در IndexedDB */
  photoId?: string
}

/** دسته‌های هزینه — با کلیدهای موتور هزینه یکی است تا مقایسه معنا بدهد */
export type ExpenseCategory =
  | 'fuel'
  | 'toll'
  | 'lodging'
  | 'meals'
  | 'snacks'
  | 'tickets'
  | 'other'

export interface Expense {
  id: string
  /** شمارهٔ روز سفر، از ۱ */
  day: number
  category: ExpenseCategory
  /** تومان */
  amount: number
  note?: string
  /** شناسهٔ همسفری که پول را داده */
  paidBy: string
  /** چه کسانی در این هزینه سهیم‌اند؛ خالی یعنی همه */
  sharedWith: string[]
  at: string
}

// ───────────────────────── تسویه‌حساب ─────────────────────────

export interface Balance {
  travelerId: string
  name: string
  /** جمع آنچه پرداخت کرده */
  paid: number
  /** جمع سهم واقعی‌اش */
  owed: number
  /** مثبت = طلبکار، منفی = بدهکار */
  net: number
}

export interface Transfer {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

// ───────────────────────── تخمین در برابر واقعیت ─────────────────────────

export interface ActualLine {
  key: string
  label: string
  estimated: number
  actual: number
  /** actual − estimated؛ مثبت یعنی بیشتر از تخمین خرج شده */
  delta: number
}

export interface ActualsReport {
  lines: ActualLine[]
  totalEstimated: number
  totalActual: number
  delta: number
  /** چند روز از سفر هزینهٔ ثبت‌شده دارد */
  daysRecorded: number
  hasData: boolean
}
