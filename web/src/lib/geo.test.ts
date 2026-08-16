import { describe, expect, it } from 'vitest'

import { nearestCity } from './geo'

const cities = [
  { id: 'tehran', name: 'تهران', lat: 35.6892, lng: 51.389 },
  { id: 'karaj', name: 'کرج', lat: 35.8327, lng: 50.9916 },
  { id: 'isfahan', name: 'اصفهان', lat: 32.6539, lng: 51.666 },
]

describe('نزدیک‌ترین شهر', () => {
  it('از وسط تهران، تهران را می‌دهد نه کرج', () => {
    const found = nearestCity(cities, 35.7, 51.4)

    expect(found?.city.id).toBe('tehran')
    expect(found?.distanceKm).toBeLessThan(5)
  })

  it('از حومهٔ غربی، کرج نزدیک‌تر است', () => {
    expect(nearestCity(cities, 35.83, 51.0)?.city.id).toBe('karaj')
  })

  it('فهرست خالی، تهی می‌دهد', () => {
    expect(nearestCity([], 35, 51)).toBeNull()
  })
})
