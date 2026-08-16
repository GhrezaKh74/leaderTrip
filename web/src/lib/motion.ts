import { animate, stagger, svg, utils } from 'animejs'

/**
 * حرکت — یک درگاه، همهٔ انیمیشن‌های جاوااسکریپتی (anime.js v4).
 *
 * <p>سه قاعده که این ماژول به همه تحمیل می‌کند:</p>
 *
 * <p>۱. <b>احترام به prefers-reduced-motion</b> در یک نقطه، نه در هر
 * کامپوننت: اگر کاربر حرکت نخواهد، هر تابع این ماژول بی‌صدا حالت نهایی را
 * می‌گذارد و تمام. فراموش‌کردن این گارد در یک کامپوننت یعنی سردردِ واقعی
 * برای کاربری که به دلیلی حرکت را خاموش کرده.</p>
 *
 * <p>۲. <b>حرکت روایت است نه تزئین</b>: خطِ مسیر «کشیده می‌شود» چون سفر
 * پیموده می‌شود؛ اعداد «می‌شمارند» چون هزینه جمع می‌شود؛ کارت‌ها به‌ترتیب
 * روز می‌آیند چون برنامه روزبه‌روز است. انیمیشنی که قصه نگوید اینجا جایی
 * ندارد.</p>
 *
 * <p>۳. کوتاه و یک‌باره — فقط هنگام ورود/تغییر داده، هرگز در حلقهٔ بی‌پایان.</p>
 */

export function prefersReducedMotion(): boolean {
  // jsdom در تست matchMedia کامل ندارد؛ نبودِ API یعنی «بدون حرکت» — محتاطانه‌ترین حالت.
  if (typeof window.matchMedia !== 'function') return true

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** ترسیم تدریجی مسیر SVG — خط سفر که روی نقشهٔ قهرمان «رانده می‌شود». */
export function drawPath(path: SVGPathElement, options?: { delay?: number; duration?: number }): void {
  if (prefersReducedMotion()) return

  const [drawable] = svg.createDrawable(path)

  if (!drawable) return

  animate(drawable, {
    draw: '0 1',
    duration: options?.duration ?? 2000,
    delay: options?.delay ?? 300,
    ease: 'inOut(2.4)',
  })
}

/** ورود پلکانی: محو + بالاآمدن، به‌ترتیب — برای کارت‌ها و آمار. */
export function riseIn(
  targets: Element[],
  options?: { step?: number; from?: number; start?: number },
): void {
  if (targets.length === 0) return

  if (prefersReducedMotion()) {
    // حالت نهایی بدون حرکت — عنصرها با استایل اولیهٔ نامرئی نیامده‌اند،
    // پس فقط مطمئن می‌شویم چیزی از انیمیشن قبلی نمانده.
    utils.remove(targets)

    return
  }

  animate(targets, {
    opacity: [0, 1],
    translateY: [options?.from ?? 14, 0],
    duration: 420,
    delay: stagger(options?.step ?? 70, { start: options?.start ?? 0 }),
    ease: 'out(2.6)',
  })
}

/**
 * شمارندهٔ عدد — از صفر تا مقدار نهایی، با همان قالب‌بند نمایش.
 *
 * قالب‌بندی با فراخواننده است (تومان، کیلومتر، …): این تابع فقط عدد خام را
 * در هر فریم می‌دهد تا متن همیشه از همان مسیر همیشگیِ فرمت عبور کند.
 */
export function countUp(el: Element, to: number, format: (value: number) => string): void {
  if (prefersReducedMotion() || to === 0) {
    el.textContent = format(to)

    return
  }

  const counter = { value: 0 }

  animate(counter, {
    value: to,
    duration: 900,
    ease: 'out(3)',
    onUpdate: () => {
      el.textContent = format(counter.value)
    },
    onComplete: () => {
      el.textContent = format(to)
    },
  })
}
