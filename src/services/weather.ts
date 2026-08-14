import type { DayWeather, WeatherMap } from '../domain/types'

/**
 * سرویس آب‌وهوا بر پایهٔ Open-Meteo — رایگان، بدون کلید API، با CORS باز.
 *
 * قاعدهٔ اصلی: **هرگز داده جعل نمی‌کنیم.** اگر سرویس در دسترس نبود یا تاریخ
 * خارج از پوشش بود، نتیجه خالی برمی‌گردد و اپ بدون آب‌وهوا کار می‌کند.
 *
 * دو منبع:
 *   • تا ۱۶ روز آینده  → پیش‌بینی واقعی (`source: 'forecast'`)
 *   • دورتر از آن       → همان بازه در سال گذشته از بایگانی (`source: 'historical'`)
 *     که پیش‌بینی نیست، «انتظار فصلی» است — و در رابط کاربری هم همین‌طور برچسب می‌خورد.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const CACHE_KEY = 'leadertrip.weather.v1'
const FORECAST_TTL_MS = 6 * 60 * 60 * 1000 // ۶ ساعت
const HISTORICAL_TTL_MS = 30 * 24 * 60 * 60 * 1000 // یک ماه
const FORECAST_HORIZON_DAYS = 16
const REQUEST_TIMEOUT_MS = 8000

export function weatherKey(cityId: string, date: string): string {
  return `${cityId}|${date}`
}

export interface WeatherRequest {
  cityId: string
  lat: number
  lng: number
  /** تاریخ‌های میلادی YYYY-MM-DD */
  dates: string[]
}

// ─────────────────────────── کش ───────────────────────────

interface CacheEntry {
  data: DayWeather
  fetchedAt: number
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // فضای ذخیره‌سازی پر است — کش نداشتن مشکلی ایجاد نمی‌کند
  }
}

function isFresh(entry: CacheEntry, now: number): boolean {
  const ttl = entry.data.source === 'forecast' ? FORECAST_TTL_MS : HISTORICAL_TTL_MS
  return now - entry.fetchedAt < ttl
}

// ─────────────────────────── دریافت ───────────────────────────

function daysFromToday(date: string): number {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** همان روز در سال گذشته — برای تاریخ‌هایی که پیش‌بینی پوششان نمی‌دهد */
function lastYear(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    // شبکه نیست، تایم‌اوت شد، یا پاسخ خراب بود — همه‌شان یعنی «آب‌وهوا نداریم»
    return null
  }
}

interface DailyBlock {
  time?: string[]
  temperature_2m_max?: (number | null)[]
  temperature_2m_min?: (number | null)[]
  precipitation_sum?: (number | null)[]
  precipitation_probability_max?: (number | null)[]
  wind_speed_10m_max?: (number | null)[]
  weather_code?: (number | null)[]
}

/** از بارش تجمعی، احتمال بارش تقریبی می‌سازد — بایگانی احتمال ندارد */
function probFromMm(mm: number): number {
  if (mm >= 5) return 85
  if (mm >= 1) return 60
  if (mm >= 0.2) return 30
  return 5
}

function parseDaily(
  daily: DailyBlock,
  source: 'forecast' | 'historical',
  remapDate?: (apiDate: string) => string,
): DayWeather[] {
  const out: DayWeather[] = []
  const times = daily.time ?? []

  for (let i = 0; i < times.length; i += 1) {
    const tMax = daily.temperature_2m_max?.[i]
    const tMin = daily.temperature_2m_min?.[i]
    if (tMax == null || tMin == null) continue

    const precipMm = daily.precipitation_sum?.[i] ?? 0
    const prob = daily.precipitation_probability_max?.[i]

    out.push({
      date: remapDate ? remapDate(times[i]) : times[i],
      tMax,
      tMin,
      precipMm,
      precipProb: prob ?? probFromMm(precipMm),
      windMaxKmh: daily.wind_speed_10m_max?.[i] ?? 0,
      code: daily.weather_code?.[i] ?? 0,
      source,
    })
  }
  return out
}

const DAILY_FIELDS =
  'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max'

async function fetchForCity(req: WeatherRequest): Promise<DayWeather[]> {
  const sorted = [...req.dates].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const common = `latitude=${req.lat.toFixed(3)}&longitude=${req.lng.toFixed(3)}&timezone=Asia%2FTehran`

  const withinForecast = daysFromToday(last) <= FORECAST_HORIZON_DAYS && daysFromToday(first) >= -1

  if (withinForecast) {
    const url =
      `${FORECAST_URL}?${common}&daily=${DAILY_FIELDS},precipitation_probability_max` +
      `&start_date=${first}&end_date=${last}`
    const json = await getJson(url)
    if (!json?.daily) return []
    return parseDaily(json.daily as DailyBlock, 'forecast')
  }

  // خارج از افق پیش‌بینی: همان بازه در سال گذشته
  const url =
    `${ARCHIVE_URL}?${common}&daily=${DAILY_FIELDS}` +
    `&start_date=${lastYear(first)}&end_date=${lastYear(last)}`
  const json = await getJson(url)
  if (!json?.daily) return []

  return parseDaily(json.daily as DailyBlock, 'historical', (apiDate) => {
    const [y, m, d] = apiDate.split('-')
    return `${Number(y) + 1}-${m}-${d}`
  })
}

/**
 * آب‌وهوای شهرها و تاریخ‌های خواسته‌شده را می‌گیرد.
 * هرچه در کش تازه باشد از شبکه گرفته نمی‌شود؛ هر شهر یک درخواست دارد.
 * شکست یک شهر بقیه را از کار نمی‌اندازد.
 */
export async function fetchWeather(requests: WeatherRequest[]): Promise<WeatherMap> {
  const now = Date.now()
  const cache = readCache()
  const result: WeatherMap = {}
  const missing: WeatherRequest[] = []

  for (const req of requests) {
    const stale: string[] = []
    for (const date of req.dates) {
      const hit = cache[weatherKey(req.cityId, date)]
      if (hit && isFresh(hit, now)) result[weatherKey(req.cityId, date)] = hit.data
      else stale.push(date)
    }
    if (stale.length > 0) missing.push({ ...req, dates: stale })
  }

  if (missing.length === 0) return result

  const fetched = await Promise.all(
    missing.map(async (req) => ({ req, days: await fetchForCity(req) })),
  )

  for (const { req, days } of fetched) {
    for (const day of days) {
      if (!req.dates.includes(day.date)) continue
      const key = weatherKey(req.cityId, day.date)
      result[key] = day
      cache[key] = { data: day, fetchedAt: now }
    }
  }

  writeCache(cache)
  return result
}

// ─────────────────────────── نمایش ───────────────────────────

/** کدهای WMO به فارسی */
export function weatherLabel(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'آفتابی', icon: '☀️' }
  if (code <= 2) return { text: 'کمی ابری', icon: '🌤️' }
  if (code === 3) return { text: 'ابری', icon: '☁️' }
  if (code <= 48) return { text: 'مه', icon: '🌫️' }
  if (code <= 55) return { text: 'نم‌نم باران', icon: '🌦️' }
  if (code <= 57) return { text: 'باران یخ‌زده', icon: '🌧️' }
  if (code <= 65) return { text: 'باران', icon: '🌧️' }
  if (code <= 67) return { text: 'باران یخ‌زده', icon: '🌧️' }
  if (code <= 77) return { text: 'برف', icon: '❄️' }
  if (code <= 82) return { text: 'رگبار', icon: '🌦️' }
  if (code <= 86) return { text: 'بارش برف', icon: '🌨️' }
  return { text: 'رعدوبرق', icon: '⛈️' }
}

export function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86)
}

export function isStormCode(code: number): boolean {
  return code >= 95
}
