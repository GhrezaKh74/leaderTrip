import { haversineKm, type LatLng } from './geo'

/**
 * ترتیب بهینهٔ بازدید نقاط — مسئلهٔ فروشندهٔ دوره‌گرد در ابعاد کوچک (۲ تا ۸ نقطه).
 * حریصانهٔ نزدیک‌ترین همسایه + بهبود ۲-opt که در این ابعاد عملاً به بهینهٔ کامل می‌رسد.
 */

/** مسافت کل یک ترتیب مشخص، از مبدأ و در صورت نیاز بازگشت به پایان */
function tourLength<T extends LatLng>(start: LatLng, order: T[], end: LatLng | null): number {
  let total = 0
  let cur: LatLng = start
  for (const p of order) {
    total += haversineKm(cur, p)
    cur = p
  }
  if (end) total += haversineKm(cur, end)
  return total
}

/** مرحلهٔ اول: از مبدأ همیشه به نزدیک‌ترین نقطهٔ بازدیدنشده برو */
function nearestNeighbor<T extends LatLng>(start: LatLng, points: T[]): T[] {
  const remaining = [...points]
  const order: T[] = []
  let cur: LatLng = start

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestD = Infinity
    for (let i = 0; i < remaining.length; i += 1) {
      const d = haversineKm(cur, remaining[i])
      if (d < bestD) {
        bestD = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    order.push(next)
    cur = next
  }
  return order
}

/** مرحلهٔ دوم: وارونه‌کردن بازه‌ها تا وقتی مسیر کوتاه‌تر شود */
function twoOpt<T extends LatLng>(
  start: LatLng,
  order: T[],
  end: LatLng | null,
  maxIterations = 100,
): T[] {
  if (order.length < 3) return order

  let best = [...order]
  let bestLen = tourLength(start, best, end)
  let improved = true
  let iterations = 0

  while (improved && iterations < maxIterations) {
    improved = false
    iterations += 1

    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        const len = tourLength(start, candidate, end)
        if (len < bestLen - 1e-9) {
          best = candidate
          bestLen = len
          improved = true
        }
      }
    }
  }

  return best
}

/**
 * ترتیب بهینهٔ بازدید.
 * @param start نقطهٔ شروع روز (شهر پایه یا مبدأ)
 * @param end نقطهٔ پایان روز؛ null یعنی مسیر باز است
 */
export function optimizeOrder<T extends LatLng>(
  start: LatLng,
  points: T[],
  end: LatLng | null = null,
): T[] {
  if (points.length <= 1) return [...points]
  return twoOpt(start, nearestNeighbor(start, points), end)
}

/** طول مسیر هوایی یک ترتیب — برای مقایسه و گزارش */
export function orderLength<T extends LatLng>(
  start: LatLng,
  order: T[],
  end: LatLng | null = null,
): number {
  return tourLength(start, order, end)
}
