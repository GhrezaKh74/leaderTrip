import { z } from 'zod'

import {
  lodgingKindSchema,
  mobilitySchema,
  poiCategorySchema,
  travelStyleSchema,
} from '../../api/schemas'

/**
 * اعتبارسنجی ورودی ویزارد.
 *
 * <p>عمداً همان قواعد بک‌اند را تکرار می‌کند و این تکرار توجیه دارد: بک‌اند
 * قاضی نهایی است و باید باشد (کسی می‌تواند مستقیم درخواست بزند)، ولی کاربری که
 * ده فیلد پر کرده نباید برای فهمیدن اینکه یکی‌شان غلط است منتظر رفت‌وبرگشت شبکه
 * بماند. آنچه تکرار نمی‌شود، منطق کسب‌وکار است — این‌جا فقط شکل ورودی سنجیده
 * می‌شود، نه اینکه «آیا این سفر شدنی است».</p>
 */
export const travelerFormSchema = z.object({
  id: z.string(),
  name: z.string().max(40, 'نام طولانی است.'),
  age: z
    .number({ error: 'سن را وارد کنید.' })
    .int('سن باید عدد درست باشد.')
    .min(0, 'سن نمی‌تواند منفی باشد.')
    .max(120, 'سن را بررسی کنید.'),
  mobility: mobilitySchema,
  isDriver: z.boolean(),
})

export const tripFormSchema = z
  .object({
    originCityId: z.string().min(1, 'شهر مبدأ را انتخاب کنید.'),
    /** مقصد — خالی (null) یعنی سفر حلقه‌ای دور مبدأ. */
    destinationCityId: z.string().nullable(),
    /**
     * هدف از مقصد: «Stay» یعنی مقصد پایگاه سفر است (جاذبه‌ها دور مقصد و سرِ
     * راه، و برگشت معنا دارد)؛ «Corridor» یعنی خودِ مسیر هدف است (یک‌سویه،
     * روز آخر رسیدن به مقصد). بدون مقصد اثری ندارد.
     */
    destinationMode: z.enum(['Mixed', 'Stay', 'Corridor']),
    startDate: z.string().min(1, 'تاریخ حرکت را انتخاب کنید.'),
    days: z.number().int().min(1, 'حداقل یک روز.').max(30, 'حداکثر ۳۰ روز.'),
    radiusKm: z.number().min(20, 'شعاع خیلی کم است.').max(1500, 'شعاع خیلی زیاد است.'),
    vehicleId: z.string().min(1, 'خودرو را انتخاب کنید.'),
    vehicleCount: z.number().int().min(1).max(10),
    travelers: z
      .array(travelerFormSchema)
      .min(1, 'حداقل یک همسفر لازم است.')
      .max(30, 'تعداد همسفران زیاد است.'),
    budgetToman: z.number().min(0, 'بودجه نمی‌تواند منفی باشد.'),
    style: travelStyleSchema,
    lodging: lodgingKindSchema,
    interests: z.array(poiCategorySchema),
    maxDrivingHoursPerDay: z.number().min(1).max(12),
    dayStartHour: z.number().int().min(0).max(12),
    dayEndHour: z.number().int().min(12).max(24),
    roundTrip: z.boolean(),

    /**
     * ترجیحات روز — سلیقه‌های واقعی سفر؛ پیش‌فرض همه، رفتار همیشگی موتور است.
     */
    checkInFirst: z.boolean(),
    middayRest: z.boolean(),
    eveningProgram: z.boolean(),
    dayPace: z.enum(['Relaxed', 'Balanced', 'Packed']),
    lunchStyle: z.enum(['Restaurant', 'Picnic']),
    /** ساعت حرکت روز اول اگر با بقیه فرق دارد؛ null یعنی مثل بقیهٔ روزها. */
    firstDayStartHour: z.number().int().min(0).max(20).nullable(),

    subsidizedFuelShare: z.number().min(0).max(1),
    pinnedPoiIds: z.array(z.string()),
    excludedPoiIds: z.array(z.string()),

    /**
     * جاذبه‌هایی که کاربر دستی به روز مشخصی برده است.
     *
     * ویرایش دستی این‌جا ثبت می‌شود، نه در خروجی: برنامه با همین قید از نو
     * ساخته می‌شود تا مسافت و ساعت و هزینه با آنچه روی صفحه است بخواند.
     */
    dayAssignments: z.record(z.string(), z.number().int().min(1)),

    /**
     * سلیقهٔ آموخته‌شده از امتیازهای سفرهای گذشته، ‎−۱ تا ۱.
     *
     * کلید رشته است نه دستهٔ محدود: فقط دسته‌هایی که کاربر امتیاز داده در آن
     * هستند، و اجبارِ داشتنِ هر ۱۶ دسته یعنی پرکردن جدول با صفرهای بی‌معنا.
     */
    learnedTaste: z.record(z.string(), z.number().min(-1).max(1)),
  })
  .refine((v) => v.destinationCityId === null || v.destinationCityId !== v.originCityId, {
    message: 'مقصد نمی‌تواند همان مبدأ باشد؛ برای سفر حلقه‌ای، مقصد را خالی بگذارید.',
    path: ['destinationCityId'],
  })
  .refine((v) => v.dayEndHour > v.dayStartHour + 4, {
    message: 'روز باید دست‌کم پنج ساعت باشد.',
    path: ['dayEndHour'],
  })
  .refine((v) => v.travelers.some((t) => t.isDriver && t.age >= 18), {
    // بدون رانندهٔ واجد شرایط، برنامه‌ای که موتور می‌سازد روی کاغذ درست است و
    // در جاده غیرقابل اجرا.
    message: 'دست‌کم یک همسفر ۱۸ سال به بالا باید راننده باشد.',
    path: ['travelers'],
  })

export type TripForm = z.infer<typeof tripFormSchema>

/** بدنهٔ درخواستی که بک‌اند انتظار دارد. */
export type TripRequest = TripForm

/**
 * خواندن ورودی سفر از هر منبع بیرونی — لینک اشتراکی، فایل، حافظهٔ دستگاه، حساب.
 *
 * <p>یک کار اضافه نسبت به <code>safeParse</code> خام دارد: فیلدهایی که بعد از
 * انتشار اضافه شده‌اند (مثل مقصد) را برای دادهٔ قدیمی پیش‌فرض می‌گذارد. بدون
 * این، هر ویژگی تازه یعنی همهٔ لینک‌های اشتراکی و سفرهای ذخیره‌شدهٔ قبلی
 * بی‌صدا «ناسازگار» شوند.</p>
 */
export function parseTripForm(value: unknown): TripForm | null {
  if (typeof value !== 'object' || value === null) return null

  const withDefaults = {
    destinationCityId: null,
    destinationMode: 'Mixed',
    checkInFirst: false,
    middayRest: false,
    eveningProgram: true,
    dayPace: 'Packed',
    lunchStyle: 'Restaurant',
    firstDayStartHour: null,
    ...value,
  }
  const parsed = tripFormSchema.safeParse(withDefaults)

  return parsed.success ? parsed.data : null
}

export const DEFAULT_TRIP: TripForm = {
  originCityId: 'tehran',
  destinationCityId: null,
  destinationMode: 'Mixed',
  startDate: isoToday(),
  days: 3,
  radiusKm: 400,
  vehicleId: 'sedan-206',
  vehicleCount: 1,
  travelers: [
    { id: 't1', name: '', age: 35, mobility: 'Full', isDriver: true },
    { id: 't2', name: '', age: 33, mobility: 'Full', isDriver: false },
  ],
  budgetToman: 50_000_000,
  style: 'Balanced',
  lodging: 'Hotel',
  interests: [],
  maxDrivingHoursPerDay: 5,
  dayStartHour: 8,
  dayEndHour: 21,
  roundTrip: true,
  checkInFirst: false,
  middayRest: false,
  eveningProgram: true,
  dayPace: 'Packed',
  lunchStyle: 'Restaurant',
  firstDayStartHour: null,
  subsidizedFuelShare: 0.6,
  pinnedPoiIds: [],
  excludedPoiIds: [],
  dayAssignments: {},
  learnedTaste: {},
}

function isoToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}
