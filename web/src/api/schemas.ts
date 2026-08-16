import { z } from 'zod'

/**
 * قرارداد بک‌اند، به‌صورت اسکیمای اجرایی.
 *
 * چرا Zod و نه فقط `interface`: تایپ TypeScript در زمان اجرا وجود ندارد. اگر
 * بک‌اند فیلدی را عوض کند، با تایپِ تنها، خطا جایی چند کامپوننت آن‌طرف‌تر ظاهر
 * می‌شود — معمولاً به‌شکل `undefined` که در یک محاسبه `NaN` می‌شود و روی صفحه
 * «NaN تومان» می‌نشیند. با اسکیما، خطا در همان مرز شبکه و با نام فیلد گرفته
 * می‌شود.
 */

export const climateSchema = z.enum(['Desert', 'Mountain', 'Caspian', 'Gulf', 'Plain', 'Steppe'])

export const poiCategorySchema = z.enum([
  'Historical', 'Nature', 'Religious', 'Museum', 'Adventure', 'Food', 'Shopping',
  'Entertainment', 'Village', 'Beach', 'Desert', 'Mountain', 'Lake', 'Waterfall', 'Cave', 'Garden',
])

export const difficultySchema = z.enum(['None', 'Light', 'Heavy', 'Climbing'])
export const offroadSchema = z.enum(['Paved', 'LightDirt', 'FullOffroad'])
export const vehicleClassSchema = z.enum(['Sedan', 'Suv', 'Van', 'Minibus', 'Bus', 'Motorcycle', 'Ev'])
export const fuelKindSchema = z.enum(['Gasoline', 'Diesel', 'Cng', 'Electric'])
export const travelStyleSchema = z.enum(['Budget', 'Balanced', 'Comfort', 'Luxury'])
export const lodgingKindSchema = z.enum(['Hotel', 'EcoLodge', 'Villa', 'Camp', 'Friends'])
export const mobilitySchema = z.enum(['Full', 'Limited', 'Wheelchair'])

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  province: z.string(),
  lat: z.number(),
  lng: z.number(),
  costIndex: z.number(),
  amenities: z.number().int(),
  climate: climateSchema,
  canStayOvernight: z.boolean(),
})

export const vehicleSchema = z.object({
  id: z.string(),
  label: z.string(),
  class: vehicleClassSchema,
  fuel: fuelKindSchema,
  consumptionPer100Km: z.number(),
  seats: z.number().int(),
  offroad: offroadSchema,
  depreciationPerKm: z.number(),
})

const mealPricesSchema = z.object({
  breakfast: z.number(),
  lunch: z.number(),
  dinner: z.number(),
})

export const priceBookSchema = z.object({
  subsidizedFuel: z.record(z.string(), z.number()),
  freeMarketFuel: z.record(z.string(), z.number()),
  tollPerKilometer: z.number(),
  freewayShare: z.number(),
  lodgingPerNight: z.record(z.string(), z.number()),
  meals: z.record(z.string(), mealPricesSchema),
  snackRate: z.number(),
  miscRate: z.record(z.string(), z.number()),
  bufferRate: z.record(z.string(), z.number()),
  updatedAt: z.string(),
})

export const referenceDataSchema = z.object({
  cities: z.array(citySchema),
  vehicles: z.array(vehicleSchema),
  prices: priceBookSchema,
})

export const poiSchema = z.object({
  id: z.string(),
  name: z.string(),
  cityId: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: poiCategorySchema,
  rating: z.number(),
  visitMinutes: z.number().int(),
  ticket: z.number(),
  bestMonths: z.array(z.number().int()),
  indoor: z.boolean(),
  difficulty: difficultySchema,
  minAge: z.number().int(),
  kidFriendly: z.boolean(),
  seniorFriendly: z.boolean(),
  requiredVehicle: offroadSchema,
  nightSuitable: z.boolean(),
  tags: z.array(z.string()),
  description: z.string(),
})

export const poiListSchema = z.object({
  total: z.number().int(),
  items: z.array(poiSchema),
})

export const planBlockSchema = z.object({
  // «Refuel» است نه «Fuel» — نام دقیق `BlockKind` در بک‌اند. حدس‌زدنش یعنی
  // اولین برنامه‌ای که توقف سوخت دارد، در مرز شبکه رد شود.
  kind: z.enum(['Drive', 'Visit', 'Meal', 'Rest', 'Lodging', 'Refuel']),
  startsAt: z.string(),
  durationMinutes: z.number(),
  title: z.string(),
  cost: z.number(),
  poiId: z.string().nullable().optional(),
  kilometers: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
})

export const dayWeatherSchema = z.object({
  maxTemperature: z.number(),
  minTemperature: z.number(),
  precipitationProbability: z.number(),
  hasSnow: z.boolean(),
  // «انتظار فصلی» پیش‌بینی نیست و نباید مثل پیش‌بینی نمایش داده شود.
  isForecast: z.boolean(),
})

export const dayPlanSchema = z.object({
  index: z.number().int(),
  date: z.string(),
  baseCityId: z.string(),
  blocks: z.array(planBlockSchema),
  kilometers: z.number(),
  drivingMinutes: z.number(),
  cost: z.number(),
  weather: dayWeatherSchema.nullable().optional(),
})

export const costLineSchema = z.object({
  key: z.string(),
  label: z.string(),
  amount: z.number(),
  formula: z.string(),
})

export const costBreakdownSchema = z.object({
  lines: z.array(costLineSchema),
  subtotal: z.number(),
  miscellaneous: z.number(),
  riskBuffer: z.number(),
  total: z.number(),
  perPerson: z.number(),
  optimistic: z.number(),
  pessimistic: z.number(),
  overBudget: z.number(),
})

export const adviceSchema = z.object({
  code: z.string(),
  level: z.enum(['Info', 'Warning', 'Critical']),
  title: z.string(),
  detail: z.string(),
})

export const packingItemSchema = z.object({
  group: z.string(),
  item: z.string(),
  reason: z.string(),
})

export const tripPlanSchema = z.object({
  days: z.array(dayPlanSchema),
  cost: costBreakdownSchema,
  totalKilometers: z.number(),
  totalDrivingMinutes: z.number(),
  visitCount: z.number().int(),
  unscheduledPoiIds: z.array(z.string()),
  // مبدأ مسافت بخشی از قرارداد است، نه جزئیات: عددی که حدس است نباید شبیه
  // اندازه‌گیری نمایش داده شود.
  distanceSource: z.enum(['Estimated', 'Routed']),
  advice: z.array(adviceSchema),
  packing: z.array(packingItemSchema),
})

export type City = z.infer<typeof citySchema>
export type Vehicle = z.infer<typeof vehicleSchema>
export type PriceBook = z.infer<typeof priceBookSchema>
export type ReferenceData = z.infer<typeof referenceDataSchema>
export type Poi = z.infer<typeof poiSchema>
export type PoiCategory = z.infer<typeof poiCategorySchema>
export type TravelStyle = z.infer<typeof travelStyleSchema>
export type LodgingKind = z.infer<typeof lodgingKindSchema>
export type MobilityLevel = z.infer<typeof mobilitySchema>
export type TripPlan = z.infer<typeof tripPlanSchema>
export type DayPlan = z.infer<typeof dayPlanSchema>
export type PlanBlock = z.infer<typeof planBlockSchema>
export type CostBreakdown = z.infer<typeof costBreakdownSchema>
export type Advice = z.infer<typeof adviceSchema>
export type PackingItem = z.infer<typeof packingItemSchema>
export type DayWeather = z.infer<typeof dayWeatherSchema>

export const budgetLeverSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  saving: z.number(),
  patch: z.object({
    style: travelStyleSchema.nullable().optional(),
    lodging: lodgingKindSchema.nullable().optional(),
    days: z.number().nullable().optional(),
    radiusKm: z.number().nullable().optional(),
    vehicleCount: z.number().nullable().optional(),
    subsidizedFuelShare: z.number().nullable().optional(),
    excludedPoiIds: z.array(z.string()).nullable().optional(),
  }),
})

export const budgetLeversSchema = z.object({
  baseline: z.number(),
  levers: z.array(budgetLeverSchema),
})

export const discoveredPlaceSchema = z.object({
  osmId: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: poiCategorySchema,
  rawTag: z.string(),
})

export const discoveredPlacesSchema = z.object({
  items: z.array(discoveredPlaceSchema),
  note: z.string(),
})

/** پاسخ بارگذاری عکس چک‌این. */
export const photoUploadSchema = z.object({
  id: z.string(),
  url: z.string(),
})

/** نمای کلی سامانه — پنل مدیریت. */
export const adminOverviewSchema = z.object({
  storageMode: z.enum(['Seed', 'Database']),
  cities: z.number(),
  pois: z.number(),
  vehicles: z.number(),
  pricesUpdatedAt: z.string(),
  photoCount: z.number(),
  photoBytes: z.number(),
  routingEnabled: z.boolean(),
  weatherEnabled: z.boolean(),
  discoveryEnabled: z.boolean(),
  requestsPerMinute: z.number(),
  planRequestsPerMinute: z.number(),
})

/** موجودی عکس‌ها — پنل مدیریت. */
export const photoInventorySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      bytes: z.number(),
      createdAt: z.string(),
    }),
  ),
  totalCount: z.number(),
  totalBytes: z.number(),
})

/** پاسخ انتشار نسخهٔ تازهٔ دفترچهٔ قیمت. */
export const priceVersionSchema = z.object({
  version: z.number(),
  effectiveFrom: z.string(),
  updatedAt: z.string(),
})

export type BudgetLever = z.infer<typeof budgetLeverSchema>
export type BudgetLevers = z.infer<typeof budgetLeversSchema>
export type DiscoveredPlace = z.infer<typeof discoveredPlaceSchema>
export type PhotoUpload = z.infer<typeof photoUploadSchema>
export type AdminOverview = z.infer<typeof adminOverviewSchema>
export type PhotoInventory = z.infer<typeof photoInventorySchema>
