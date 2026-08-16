import { describe, expect, it } from 'vitest'

import { geoUri, googleMapsDirections, wazeNavigation } from './navigation'

const avan = { lat: 36.4901, lng: 50.4525, name: 'دریاچهٔ اوان' }

describe('پیوند مسیریاب‌ها', () => {
  it('گوگل‌مپس با مقصد و حالت رانندگی', () => {
    const url = googleMapsDirections(avan)

    expect(url).toContain('https://www.google.com/maps/dir/?')
    expect(url).toContain('destination=36.490100%2C50.452500')
    expect(url).toContain('travelmode=driving')
  })

  it('با مبدأ، مبدأ هم در پیوند می‌آید', () => {
    expect(googleMapsDirections(avan, { lat: 35.6892, lng: 51.389 })).toContain(
      'origin=35.689200%2C51.389000',
    )
  })

  it('ویز مستقیم در حالت ناوبری', () => {
    expect(wazeNavigation(avan)).toBe('https://waze.com/ul?ll=36.490100,50.452500&navigate=yes')
  })

  it('geo: نام مقصد را برای فهرست اپ‌های نقشه می‌برد', () => {
    const uri = geoUri(avan)

    expect(uri.startsWith('geo:36.490100,50.452500?q=')).toBe(true)
    expect(decodeURIComponent(uri)).toContain('دریاچهٔ اوان')
  })
})
