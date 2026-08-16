// تولید دادهٔ اولیهٔ بک‌اند از روی فایل‌های TypeScript نسخهٔ اول.
//
// چرا اسکریپت و نه کپی دستی: ۱۴۳ جاذبه و ۸۵ شهر را دست‌نویس منتقل‌کردن یعنی
// خطای انسانی حتمی، و بدتر از آن یعنی دو منبع حقیقت که بی‌صدا از هم دور می‌شوند.
// این‌طوری هر تغییری در `src/data/*.ts` با یک `npm run seed:export` به بک‌اند می‌رسد.
//
// اجرا:  node scripts/export-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CITIES } from '../src/data/cities.ts'
import { POIS } from '../src/data/pois.ts'
import { VEHICLES } from '../src/data/vehicles.ts'
import { DEFAULT_PRICES } from '../src/data/pricing.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'backend/src/LeaderTrip.Infrastructure/Seed/data')

/** PascalCase برای انطباق با نام‌های enum در C#. مقادیر همه تک‌کلمه‌اند. */
const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const cities = CITIES.map((c) => ({
  id: c.id,
  name: c.name,
  province: c.province,
  lat: c.lat,
  lng: c.lng,
  costIndex: c.costIndex,
  amenities: c.amenities,
  climate: pascal(c.climate),
}))

/**
 * ساعت بازدید — دادهٔ نسخهٔ اول این مفهوم را ندارد، پس استثناها این‌جا
 * نگه‌داری می‌شوند تا خروجی دوباره‌سازی‌شده همان بماند که بک‌اند می‌خواهد.
 * «۰۰:۰۰/۰۰:۰۰» یعنی شبانه‌روزی؛ نبودن یعنی پیش‌فرضِ دسته (در RowMapper بک‌اند).
 */
const OPENING_HOURS = {
  'tabiat-bridge': ['00:00', '00:00'],
  'qom-shrine': ['00:00', '00:00'],
  'naghsh-jahan': ['00:00', '00:00'],
  'sio-se-pol': ['00:00', '00:00'],
  'khaju-bridge': ['00:00', '00:00'],
  'amir-chakhmaq': ['00:00', '00:00'],
  'fahadan': ['00:00', '00:00'],
  'elgoli': ['00:00', '00:00'],
  'kish-greek-ship': ['00:00', '00:00'],
  'imam-reza': ['00:00', '00:00'],
  'tajrish-bazaar': ['09:00', '22:00'],
  'saad-saltaneh': ['09:00', '22:00'],
  'vakil-bazaar': ['09:00', '21:00'],
  'hafezieh': ['08:00', '22:30'],
  'saadieh': ['08:00', '22:00'],
}

const pois = POIS.map((p) => ({
  id: p.id,
  name: p.name,
  cityId: p.cityId,
  lat: p.lat,
  lng: p.lng,
  category: pascal(p.cat),
  rating: p.rating,
  visitMinutes: p.visitMinutes,
  ticket: p.ticket,
  bestMonths: [...p.bestMonths].sort((a, b) => a - b),
  indoor: p.indoor,
  difficulty: p.difficulty,
  minAge: p.minAge,
  kidFriendly: p.kidFriendly,
  seniorFriendly: p.seniorFriendly,
  requiredVehicle: p.requiresVehicle,
  nightSuitable: p.nightSuitable,
  tags: p.tags,
  description: p.desc,
  ...(OPENING_HOURS[p.id]
    ? { opensAt: OPENING_HOURS[p.id][0], closesAt: OPENING_HOURS[p.id][1] }
    : {}),
}))

const vehicles = VEHICLES.map((v) => ({
  id: v.id,
  label: v.label,
  class: pascal(v.cls === 'ev' ? 'ev' : v.cls),
  fuel: pascal(v.fuel),
  consumptionPer100Km: v.consumption,
  seats: v.seats,
  offroad: v.offroad,
  speedFactor: v.speedFactor,
  depreciationPerKm: v.depreciationPerKm,
  tollFactor: v.tollFactor,
}))

const byFuel = (src) => ({
  Gasoline: src.gasoline,
  Diesel: src.diesel,
  Cng: src.cng,
  Electric: src.electric,
})

const byStyle = (src) => ({
  Budget: src.budget,
  Balanced: src.balanced,
  Comfort: src.comfort,
  Luxury: src.luxury,
})

const priceBook = {
  subsidizedFuel: byFuel(DEFAULT_PRICES.fuelSubsidized),
  freeMarketFuel: byFuel(DEFAULT_PRICES.fuelFree),
  tollPerKilometer: DEFAULT_PRICES.tollPerKm,
  freewayShare: DEFAULT_PRICES.freewayShare,
  lodgingPerNight: byStyle(DEFAULT_PRICES.lodgingPerNight),
  meals: byStyle(DEFAULT_PRICES.meals),
  snackRate: DEFAULT_PRICES.snackRate,
  miscRate: byStyle(DEFAULT_PRICES.miscRate),
  bufferRate: byStyle(DEFAULT_PRICES.bufferRate),
  updatedAt: DEFAULT_PRICES.updatedAt,
}

// ─── بررسی یکپارچگی: هر جاذبه باید شهر موجود داشته باشد ───
const cityIds = new Set(cities.map((c) => c.id))
const orphans = pois.filter((p) => !cityIds.has(p.cityId))
if (orphans.length > 0) {
  console.error(`جاذبه با شهر ناموجود: ${orphans.map((p) => `${p.id}→${p.cityId}`).join(', ')}`)
  process.exit(1)
}

const duplicate = (items) => {
  const seen = new Set()
  return items.filter((i) => (seen.has(i.id) ? true : (seen.add(i.id), false)))
}
for (const [label, items] of [['شهر', cities], ['جاذبه', pois], ['خودرو', vehicles]]) {
  const dupes = duplicate(items)
  if (dupes.length > 0) {
    console.error(`شناسهٔ تکراری در ${label}: ${dupes.map((d) => d.id).join(', ')}`)
    process.exit(1)
  }
}

mkdirSync(outDir, { recursive: true })

const write = (name, value) => {
  writeFileSync(join(outDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  console.log(`${name}: ${Array.isArray(value) ? `${value.length} رکورد` : 'نوشته شد'}`)
}

write('cities.json', cities)
write('pois.json', pois)
write('vehicles.json', vehicles)
write('price-book.json', priceBook)
