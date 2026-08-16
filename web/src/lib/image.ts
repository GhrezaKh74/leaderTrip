/**
 * کوچک‌سازی عکس پیش از بارگذاری.
 *
 * <p>عکس دوربین گوشی امروز ۳ تا ۱۲ مگابایت است؛ برای بندانگشتیِ چک‌این، ۱۶۰۰
 * پیکسل ضلع بلند و JPEG کیفیت ۸۲٪ بیش از کافی است و معمولاً زیر ۳۰۰ کیلوبایت
 * درمی‌آید. در جاده — جایی که این ویژگی استفاده می‌شود — اینترنت کُند و حجمی
 * است؛ فرستادن ۱۰ مگابایت وقتی ۳۰۰ کیلوبایت همان کار را می‌کند، بی‌احترامی به
 * کاربر است.</p>
 *
 * <p>هر خطایی در مسیر کوچک‌سازی، بی‌صدا به فایل اصلی برمی‌گردد: سقف حجم را سرور
 * هم می‌سنجد، پس بدترین حالت «رد شدن با پیام روشن» است نه «عکسِ ازدست‌رفته».</p>
 */
export async function downscalePhoto(file: File, maxEdge = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))

    // کوچک است و همین حالا JPEG فشرده؛ دوباره فشردنش فقط کیفیت می‌سوزاند.
    if (scale === 1 && file.type === 'image/jpeg' && file.size < 900_000) {
      bitmap.close()

      return file
    }

    const canvas = document.createElement('canvas')

    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext('2d')

    if (context === null) {
      bitmap.close()

      return file
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    )

    return blob ?? file
  } catch {
    return file
  }
}
