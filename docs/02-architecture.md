# ۲. معماری و مدل داده

## ۲.۱ تصمیم‌های بنیادی

| تصمیم | انتخاب | چرا |
|---|---|---|
| نوع اپ | **وب اپ واکنش‌گرا + PWA** | یک کدبیس برای موبایل و دسکتاپ، بدون فروشگاه اپ، نصب‌شدنی روی گوشی |
| بک‌اند | **ندارد** — همه چیز سمت کلاینت | بدون هزینهٔ سرور، بدون لاگین، حریم خصوصی، قابل میزبانی روی GitHub Pages |
| استک | Vite + React 19 + TypeScript + Tailwind | سریع، تایپ‌سیف، بدون پیچیدگی اضافی |
| نقشه | Leaflet + کاشی OpenStreetMap | رایگان، بدون کلید API |
| هواشناسی | Open-Meteo | رایگان، بدون کلید، CORS باز، اختیاری |
| دادهٔ جاذبه‌ها | فایل TypeScript همراه اپ | آفلاین کار می‌کند، تایپ‌سیف، قابل بازبینی در گیت |
| ذخیره‌سازی | `localStorage` | بدون سرور |
| تاریخ شمسی | پیاده‌سازی داخلی | حذف وابستگی، کنترل کامل |

**قید مهم:** هیچ ویژگی‌ای نباید به کلید API یا سرویس پولی وابسته باشد.
اگر شبکه نبود، اپ باید همچنان برنامه و هزینه را بسازد — فقط آب‌وهوا خالی می‌ماند.

---

## ۲.۲ ساختار پوشه

```
src/
├── data/                 دادهٔ ثابت (قابل ویرایش انسانی، منبع حقیقت)
│   ├── cities.ts         شهرها: مختصات، ضریب گرانی، سطح امکانات
│   ├── pois.ts           جاذبه‌ها
│   ├── vehicles.ts       پروفایل خودروها
│   └── pricing.ts        قیمت‌های پایه (سوخت، اقامت، غذا، عوارض، اهلاک)
│
├── domain/               تعریف انواع — بدون منطق
│   └── types.ts
│
├── engine/               موتور — توابع خالص، بدون React، قابل تست
│   ├── geo.ts            هاورساین، مرکز ثقل، جعبهٔ محیطی
│   ├── scoring.ts        امتیازدهی جاذبه به گروه
│   ├── router.ts         ترتیب بهینهٔ بازدید
│   ├── planner.ts        ساخت برنامهٔ روزبه‌روز
│   ├── cost.ts           موتور هزینه
│   ├── advisor.ts        هشدارها و توصیه‌ها
│   ├── packing.ts        تولید چک‌لیست
│   └── sun.ts            طلوع/غروب
│
├── services/
│   └── weather.ts        Open-Meteo (با fallback)
│
├── lib/                  ابزارهای عمومی
│   ├── jalali.ts         تبدیل تاریخ شمسی
│   ├── format.ts         اعداد فارسی، تومان، مدت‌زمان
│   └── storage.ts
│
├── ui/                   کامپوننت‌ها
│   ├── wizard/           گام‌های ورودی
│   ├── plan/             نمایش برنامه
│   └── common/           دکمه، کارت، نمودار…
│
└── state/                مدیریت وضعیت (useReducer + Context)
```

**قانون طلایی:** پوشهٔ `engine/` هرگز چیزی از React یا DOM ایمپورت نمی‌کند.
ورودی می‌گیرد، خروجی می‌دهد، تست‌پذیر است.

---

## ۲.۳ جریان داده

```
        ورودی کاربر (ویزارد)
                 │
                 ▼
          ┌─────────────┐
          │  TripInput  │  ← ذخیره در localStorage
          └──────┬──────┘
                 │
     ┌───────────┼───────────────┐
     ▼           ▼               ▼
  کاندیدها    آب‌وهوا        پروفایل گروه
 (فیلتر POI)  (اختیاری)   (سن/تحرک/خودرو)
     │           │               │
     └───────────┴───────┬───────┘
                         ▼
                  ┌────────────┐
                  │  scoring   │  امتیاز هر جاذبه برای این گروه
                  └─────┬──────┘
                        ▼
                  ┌────────────┐
                  │  planner   │  خوشه‌بندی روزها + router
                  └─────┬──────┘
                        ▼
                  ┌────────────┐
                  │    cost    │  ◄── pricing.ts
                  └─────┬──────┘
                        │  از بودجه زد؟ ── بله ──► کاهش و اجرای دوباره
                        ▼ خیر
                  ┌────────────┐
                  │  advisor   │  هشدارها
                  └─────┬──────┘
                        ▼
                   TripPlan → UI
```

---

## ۲.۴ مدل داده (خلاصهٔ تایپ‌ها)

```ts
// ─── ورودی ─────────────────────────────────────────────
type MobilityLevel = 'full' | 'limited' | 'wheelchair'

interface Traveler {
  id: string
  name?: string
  age: number
  mobility: MobilityLevel
  isDriver: boolean
}

type VehicleClass = 'sedan' | 'hatchback' | 'suv' | 'crossover'
                  | 'van' | 'minibus' | 'bus' | 'motorcycle' | 'ev'

interface Vehicle {
  id: string
  label: string             // «پژو ۲۰۶ / سواری اقتصادی»
  cls: VehicleClass
  fuel: 'gasoline' | 'diesel' | 'lpg' | 'electric'
  consumption: number       // لیتر بر ۱۰۰ کیلومتر (یا kWh برای برقی)
  seats: number
  offroad: 0 | 1 | 2        // ۰=آسفالت، ۱=خاکی سبک، ۲=آفرود
  comfort: 1 | 2 | 3        // اثر بر خستگی مسیر طولانی
  depreciationPerKm: number // ریال بر کیلومتر
}

type TravelStyle = 'budget' | 'balanced' | 'comfort' | 'luxury'

interface TripInput {
  originCityId: string
  destinationCityId?: string      // خالی = حالت کشف آزاد
  startDate: string               // ISO میلادی (نمایش شمسی)
  days: number
  radiusKm: number
  travelers: Traveler[]
  vehicleId: string
  vehicleCount: number
  budgetTotal: number             // تومان
  style: TravelStyle
  interests: POICategory[]
  maxDrivingHoursPerDay: number
  dayStartHour: number            // مثلاً ۸
  dayEndHour: number              // مثلاً ۲۱
  roundTrip: boolean
  pinnedPoiIds: string[]
  blockedPoiIds: string[]
  overrides: Partial<PriceBook>   // ضرایب قیمت دست‌کاری‌شده
}

// ─── دادهٔ مرجع ────────────────────────────────────────
type POICategory =
  | 'historical' | 'nature' | 'religious' | 'museum' | 'adventure'
  | 'food' | 'shopping' | 'entertainment' | 'village' | 'beach'
  | 'desert' | 'mountain' | 'lake' | 'waterfall' | 'cave' | 'garden'

interface POI {
  id: string
  name: string
  cityId: string
  province: string
  lat: number; lng: number
  cat: POICategory
  tags: string[]
  rating: number            // ۱ تا ۵ — کیفیت عمومی
  visitMinutes: number      // مدت بازدید معمول
  ticket: number            // تومان؛ ۰ = رایگان
  bestMonths: number[]      // ۱ تا ۱۲ (میلادی)
  indoor: boolean
  difficulty: 0 | 1 | 2 | 3 // ۰ بدون پیاده‌روی … ۳ کوهنوردی
  minAge: number            // کمینهٔ سن منطقی
  kidFriendly: boolean
  seniorFriendly: boolean
  requiresVehicle: 0 | 1 | 2 // حداقل توان آفرود لازم
  nightSuitable: boolean
  desc: string
}

interface City {
  id: string; name: string; province: string
  lat: number; lng: number
  costIndex: number         // ۱.۰ = میانگین کشور
  hasAirport: boolean
  amenities: 1 | 2 | 3      // سطح امکانات اقامتی/غذایی
}

// ─── خروجی ─────────────────────────────────────────────
type BlockKind = 'drive' | 'visit' | 'meal' | 'rest' | 'lodging' | 'fuel'

interface PlanBlock {
  kind: BlockKind
  startMin: number          // دقیقه از نیمه‌شب
  durationMin: number
  poiId?: string
  fromCityId?: string; toCityId?: string
  distanceKm?: number
  cost: number
  title: string
  note?: string
}

interface DayPlan {
  index: number             // از ۱
  date: string
  baseCityId: string        // شهر اقامت آن شب
  blocks: PlanBlock[]
  distanceKm: number
  drivingMinutes: number
  cost: number
  weather?: DayWeather
  warnings: Warning[]
}

interface TripPlan {
  input: TripInput
  days: DayPlan[]
  cost: CostBreakdown
  warnings: Warning[]
  packing: PackingList
  stats: { totalKm, totalDrivingMin, poiCount, perPerson }
  generatedAt: string
}
```

---

## ۲.۵ کیفیت و تست

- موتور (`engine/`) با **Vitest** تست واحد می‌شود: هزینه، مسیریابی، امتیازدهی، تقویم شمسی.
- معیار: هر تابع موتور حداقل یک تست «مورد عادی» و یک «مورد مرزی» دارد.
- CI روی GitHub Actions: `typecheck` + `lint` + `test` + `build`.
