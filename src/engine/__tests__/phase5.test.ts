import { describe, expect, it } from 'vitest'
import type { TripInput, TripJournal } from '../../domain/types'
import { defaultInput, generatePlan, routingPoints, customStopToPoi } from '../planner'
import { computeLeg, haversineKm } from '../geo'
import { getVehicle } from '../../data/vehicles'
import { getCity } from '../../data/cities'
import { POIS } from '../../data/pois'
import { matrixKey, lookupLeg, type RouteMatrix } from '../../services/routing'
import { elevationKey, lookupElevation } from '../../services/elevation'
import { parsePlaces } from '../../services/overpass'
import { BIAS_STRENGTH, describeBias, learnPreferences } from '../preferences'

const trip = (): TripInput => ({
  ...defaultInput(),
  originCityId: 'tehran',
  destinationCityId: null,
  startDate: '2025-10-10',
  days: 3,
  radiusKm: 300,
  travelers: [
    { id: '1', name: 'رضا', age: 35, mobility: 'full', isDriver: true },
    { id: '2', name: 'مینا', age: 33, mobility: 'full', isDriver: true },
  ],
  vehicleId: 'sedan-206',
  budgetTotal: 25_000_000,
  interests: ['historical', 'nature'],
})

// ─────────────────────── مسیر واقعی جاده ───────────────────────

describe('real road routing', () => {
  const tehran = getCity('tehran')
  const isfahan = getCity('isfahan')
  const sedan = getVehicle('sedan-206')

  it('بدون ماتریس، همان تخمین ضریب پیچش استفاده می‌شود', () => {
    const leg = computeLeg(tehran, isfahan, 'plain', sedan)
    expect(leg.source).toBe('estimate')
    expect(leg.roadKm).toBeCloseTo(haversineKm(tehran, isfahan) * 1.25, 3)
  })

  it('با ماتریس، مسافت و زمان واقعی جاده استفاده می‌شود', () => {
    const matrix: RouteMatrix = {
      source: 'osrm',
      legs: { [matrixKey(tehran, isfahan)]: { km: 440, minutes: 300 } },
    }
    const leg = computeLeg(tehran, isfahan, 'plain', sedan, 1, matrix)
    expect(leg.source).toBe('osrm')
    expect(leg.roadKm).toBe(440)
    expect(leg.minutes).toBeCloseTo(300, 5)
  })

  it('زمان واقعی هم ضریب خودرو و گروه را می‌خورد — اتوبوس کندتر است', () => {
    const matrix: RouteMatrix = {
      source: 'osrm',
      legs: { [matrixKey(tehran, isfahan)]: { km: 440, minutes: 300 } },
    }
    const byBus = computeLeg(tehran, isfahan, 'plain', getVehicle('bus'), 1, matrix)
    expect(byBus.minutes).toBeGreaterThan(300)

    const withKids = computeLeg(tehran, isfahan, 'plain', sedan, 0.9, matrix)
    expect(withKids.minutes).toBeGreaterThan(300)
  })

  it('جفتی که در ماتریس نیست، بی‌صدا به تخمین برمی‌گردد', () => {
    const matrix: RouteMatrix = {
      source: 'osrm',
      legs: { [matrixKey(tehran, isfahan)]: { km: 440, minutes: 300 } },
    }
    const other = computeLeg(tehran, getCity('shiraz'), 'plain', sedan, 1, matrix)
    expect(other.source).toBe('estimate')
  })

  it('کلید ماتریس جهت‌دار است — رفت و برگشت لزوماً یکی نیست', () => {
    expect(matrixKey(tehran, isfahan)).not.toBe(matrixKey(isfahan, tehran))
  })

  it('lookupLeg بدون ماتریس یا بدون جفت، null می‌دهد', () => {
    expect(lookupLeg(undefined, tehran, isfahan)).toBeNull()
    expect(lookupLeg({ source: 'osrm', legs: {} }, tehran, isfahan)).toBeNull()
  })

  it('برنامه منبع مسافتش را صادقانه گزارش می‌کند', () => {
    expect(generatePlan(trip()).routing).toBe('estimate')
  })

  it('با مسافت واقعی، برنامه برچسب osrm یا mixed می‌گیرد', () => {
    const draft = generatePlan(trip())
    const points = routingPoints(draft)

    // ماتریس کامل ساختگی برای همهٔ جفت‌ها
    const legs: RouteMatrix['legs'] = {}
    for (const a of points) {
      for (const b of points) {
        if (a === b) continue
        const straight = haversineKm(a, b)
        legs[matrixKey(a, b)] = { km: straight * 1.3, minutes: (straight * 1.3) / 80 * 60 }
      }
    }

    const routed = generatePlan(trip(), undefined, { matrix: { legs, source: 'osrm' } })
    expect(routed.routing === 'osrm' || routed.routing === 'mixed').toBe(true)
  })
})

// ─────────────────────── نقاط درخواستی ───────────────────────

describe('routing points', () => {
  it('مبدأ، توقف‌ها، شهرهای اقامت و گزینه‌های جایگزین را شامل می‌شود', () => {
    const plan = generatePlan(trip())
    const points = routingPoints(plan)

    expect(points.length).toBeGreaterThan(plan.stats.poiCount)
    expect(points[0].lat).toBeCloseTo(getCity('tehran').lat, 4)
  })

  it('از سقف درخواست تجاوز نمی‌کند', () => {
    const plan = generatePlan({ ...trip(), days: 10, radiusKm: 800 })
    expect(routingPoints(plan, 60).length).toBeLessThanOrEqual(60)
  })
})

// ─────────────────────── ارتفاع ───────────────────────

describe('elevation', () => {
  it('کلید ارتفاع به سه رقم اعشار گرد می‌شود', () => {
    expect(elevationKey({ lat: 35.68921, lng: 51.38903 })).toBe('35.689,51.389')
  })

  it('بدون داده، جست‌وجو null می‌دهد', () => {
    expect(lookupElevation(undefined, { lat: 35, lng: 51 })).toBeNull()
    expect(lookupElevation({}, { lat: 35, lng: 51 })).toBeNull()
  })

  it('ارتفاع بالا در روز، هشدار گردنه تولید می‌کند', () => {
    const draft = generatePlan(trip())
    const elevation: Record<string, number> = {}
    for (const p of routingPoints(draft)) elevation[elevationKey(p)] = 2600

    const plan = generatePlan(trip(), undefined, { elevation })
    expect(plan.days.every((d) => d.maxElevationM === 2600)).toBe(true)
    expect(plan.warnings.some((w) => w.title.includes('ارتفاع'))).toBe(true)
  })

  it('ارتفاع کم هیچ هشداری نمی‌سازد', () => {
    const draft = generatePlan(trip())
    const elevation: Record<string, number> = {}
    for (const p of routingPoints(draft)) elevation[elevationKey(p)] = 900

    const plan = generatePlan(trip(), undefined, { elevation })
    expect(plan.warnings.some((w) => w.title.includes('ارتفاع'))).toBe(false)
  })
})

// ─────────────────────── یادگیری سلیقه ───────────────────────

describe('learned preferences', () => {
  const journal = (ratings: [string, number][]): TripJournal => ({
    tripId: 't1',
    expenses: [],
    updatedAt: '',
    checkIns: Object.fromEntries(
      ratings.map(([poiId, rating]) => [`visit:${poiId}`, { at: '', rating }]),
    ),
  })

  const byCat = (cat: string, n: number) =>
    POIS.filter((p) => p.cat === cat)
      .slice(0, n)
      .map((p) => p.id)

  it('با نمونهٔ کم هیچ نتیجه‌ای گرفته نمی‌شود', () => {
    const waterfalls = byCat('waterfall', 2)
    const bias = learnPreferences([journal(waterfalls.map((id) => [id, 5]))])
    expect(bias.waterfall).toBeUndefined()
  })

  it('امتیاز بالا در یک دسته، آن دسته را مثبت می‌کند', () => {
    const waterfalls = byCat('waterfall', 4)
    const bias = learnPreferences([journal(waterfalls.map((id) => [id, 5]))])
    expect(bias.waterfall).toBeCloseTo(1, 5)
    expect(describeBias(bias).liked).toContain('waterfall')
  })

  it('امتیاز پایین، دسته را منفی می‌کند', () => {
    const museums = byCat('museum', 4)
    const bias = learnPreferences([journal(museums.map((id) => [id, 1]))])
    expect(bias.museum).toBeCloseTo(-1, 5)
    expect(describeBias(bias).disliked).toContain('museum')
  })

  it('امتیاز متوسط خنثی می‌ماند', () => {
    const bias = learnPreferences([journal(byCat('historical', 4).map((id) => [id, 3]))])
    expect(bias.historical).toBeCloseTo(0, 5)
  })

  it('چک‌این بدون امتیاز و شناسهٔ ناشناخته نادیده گرفته می‌شود', () => {
    const bias = learnPreferences([
      { tripId: 'x', expenses: [], updatedAt: '', checkIns: { 'visit:nope': { at: '' } } },
    ])
    expect(Object.keys(bias)).toHaveLength(0)
  })

  it('سلیقه واقعاً روی برنامه اثر می‌گذارد', () => {
    const base = generatePlan(trip())
    const biased = generatePlan(trip(), undefined, {
      preferences: { historical: -1, waterfall: 1 },
    })
    const ids = (p: typeof base) => p.candidates.filter((c) => c.inPlan).map((c) => c.poiId)
    expect(ids(biased)).not.toEqual(ids(base))
  })

  it('اثر سلیقه سقف دارد و برنامه را نمی‌رباید', () => {
    expect(BIAS_STRENGTH).toBeGreaterThan(0.1)
    expect(BIAS_STRENGTH).toBeLessThanOrEqual(0.3)
  })
})

// ─────────────────────── دادهٔ OpenStreetMap ───────────────────────

describe('overpass parsing', () => {
  it('نام و مختصات را از node و way هر دو درمی‌آورد', () => {
    const places = parsePlaces([
      { id: 1, type: 'node', lat: 36.1, lon: 52.2, tags: { name: 'آبشار الف', natural: 'waterfall' } },
      {
        id: 2,
        type: 'way',
        center: { lat: 35.5, lon: 51.1 },
        tags: { name: 'موزهٔ ب', tourism: 'museum' },
      },
    ])
    expect(places).toHaveLength(2)
    expect(places[0].cat).toBe('waterfall')
    expect(places[1].cat).toBe('museum')
    expect(places[1].lat).toBe(35.5)
  })

  it('موارد بی‌نام یا بی‌مختصات کنار گذاشته می‌شوند', () => {
    const places = parsePlaces([
      { id: 1, type: 'node', lat: 36, lon: 52, tags: { natural: 'peak' } },
      { id: 2, type: 'node', tags: { name: 'بی‌مختصات' } },
    ])
    expect(places).toHaveLength(0)
  })

  it('نام تکراری فقط یک‌بار می‌آید', () => {
    const places = parsePlaces([
      { id: 1, type: 'node', lat: 36, lon: 52, tags: { name: 'یکی', historic: 'castle' } },
      { id: 2, type: 'node', lat: 36.1, lon: 52.1, tags: { name: 'یکی', historic: 'castle' } },
    ])
    expect(places).toHaveLength(1)
  })

  it('تگ خام نگه داشته می‌شود تا کاربر بداند با چه چیزی طرف است', () => {
    const [place] = parsePlaces([
      { id: 1, type: 'node', lat: 36, lon: 52, tags: { name: 'قلعه', historic: 'castle' } },
    ])
    expect(place.rawTag).toBe('historic=castle')
    expect(place.cat).toBe('historical')
  })
})

// ─────────────────────── توقف دلخواه با مختصات دقیق ───────────────────────

describe('custom stop coordinates', () => {
  it('اگر مختصات دقیق داده شود، به‌جای مرکز شهر استفاده می‌شود', () => {
    const poi = customStopToPoi({
      id: 'x',
      name: 'جای دقیق',
      cityId: 'tehran',
      visitMinutes: 60,
      ticket: 0,
      cat: 'nature',
      lat: 36.5,
      lng: 52.5,
    })
    expect(poi.lat).toBe(36.5)
    expect(poi.lng).toBe(52.5)
  })

  it('بدون مختصات، مرکز شهر استفاده می‌شود', () => {
    const poi = customStopToPoi({
      id: 'y',
      name: 'جای تقریبی',
      cityId: 'tehran',
      visitMinutes: 60,
      ticket: 0,
      cat: 'nature',
    })
    expect(poi.lat).toBeCloseTo(getCity('tehran').lat, 4)
  })
})
