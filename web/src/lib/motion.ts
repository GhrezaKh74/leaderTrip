import { animate, onScroll, stagger, svg, utils } from 'animejs'

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

/* ──────────────────────── اسکرول به‌عنوان نوار زمان ────────────────────────
 *
 * تا این‌جا حرکت‌ها «یک‌باره هنگام ورود» بودند. چیزی که در ادامه می‌آید فرق
 * بنیادی دارد: خودِ اسکرول، انیمیشن را جلو و عقب می‌برد (`sync`). قاعدهٔ ۲ باز
 * هم حاکم است — جاده کشیده می‌شود چون شما دارید در برنامه پیش می‌روید، نه
 * برای اینکه چیزی تکان بخورد.
 *
 * قاعدهٔ ۳ (هرگز حلقهٔ بی‌پایان) این‌جا هم برقرار است: انیمیشن اسکرول‌بند در
 * حالت سکون هیچ فریمی نمی‌سازد؛ فقط وقتی انگشت/چرخ حرکت می‌کند کار می‌کند.
 */

/**
 * آستانه‌ها: کجای صفحه «شروع سفر» است و کجا «رسیدن».
 *
 * <p>پایان روی ۶۵٪ است نه وسط صفحه: روزِ کوتاه (دو سه توقف) در انتهای صفحه
 * ممکن است هرگز تا وسط بالا نیاید و آن‌وقت جاده‌اش برای همیشه نیمه‌کشیده
 * می‌ماند — که غلط است، چون آن روز هم دیده شده.</p>
 */
const ROAD_ENTER = { target: 'top', container: '95%' } as const
const ROAD_LEAVE = { target: 'bottom', container: '65%' } as const

/**
 * جادهٔ زنده — پیشرفت خط مسیر و پیمایشگری که رویش می‌راند، هر دو به اسکرول
 * بسته‌اند.
 *
 * <p>`sync` عددی (نه `true`) عمدی است: کمی میرایی می‌گذارد تا حرکت به‌جای
 * چسبیدنِ خشک به پیکسلِ اسکرول، مثل دوربین نرم دنبال کند. همان چیزی که
 * اسکرول را «سینمایی» می‌کند.</p>
 *
 * <p>خروجی، تابع پاک‌سازی است: هر بار که قد جاده عوض شود (تغییر اندازهٔ
 * پنجره، بازشدن پنل) این‌ها باید برچیده و از نو ساخته شوند، وگرنه ناظرهای
 * اسکرول روی هم تلنبار می‌شوند.</p>
 */
export function scrubRoad(params: {
  container: HTMLElement
  progress: SVGPathElement
  rider: SVGGElement
  /**
   * هالهٔ زیر خط، اگر باشد همراه خودِ خط کشیده می‌شود. لایهٔ جدا و بی‌فیلتر
   * است: drop-shadow روی مسیری که هر فریمِ اسکرول عوض می‌شود، یعنی blur
   * دوباره در هر فریم — همان چیزی که روی گوشی لگ می‌ساخت.
   */
  glow?: SVGPathElement
}): () => void {
  const { container, progress, rider, glow } = params

  if (prefersReducedMotion()) {
    // بدون حرکت: جادهٔ کامل و بی‌پیمایشگر. مسیر همچنان دیده می‌شود — این
    // اطلاعات است، نه تزئین؛ چیزی که حذف می‌شود فقط «کشیده‌شدن» است.
    progress.style.opacity = '1'
    rider.style.display = 'none'

    return () => {}
  }

  const [drawable] = svg.createDrawable(progress)

  if (drawable === undefined) return () => {}

  const [glowDrawable] = glow === undefined ? [] : svg.createDrawable(glow)
  const lineTargets = glowDrawable === undefined ? [drawable] : [drawable, glowDrawable]

  const path = svg.createMotionPath(progress)

  const line = animate(lineTargets, {
    draw: ['0 0', '0 1'],
    ease: 'linear',
    autoplay: onScroll({ target: container, enter: ROAD_ENTER, leave: ROAD_LEAVE, sync: 0.32 }),
  })

  const ride = animate(rider, {
    translateX: path.translateX,
    translateY: path.translateY,
    ease: 'linear',
    autoplay: onScroll({ target: container, enter: ROAD_ENTER, leave: ROAD_LEAVE, sync: 0.32 }),
  })

  return () => {
    line.revert()
    ride.revert()
  }
}

/**
 * ورود هنگام رسیدن به دید — یک‌بار، و بعد رها.
 *
 * <p>`repeat: false` عمدی است: توقفی که هر بار اسکرول دوباره ظاهر شود،
 * از بار دوم به بعد مزاحم است نه جذاب.</p>
 */
export function revealOnScroll(targets: Element[]): () => void {
  if (targets.length === 0) return () => {}

  if (prefersReducedMotion()) {
    utils.remove(targets)

    return () => {}
  }

  const entrance = animate(targets, {
    opacity: [0, 1],
    scale: [0.72, 1],
    duration: 520,
    ease: 'out(3)',
    autoplay: onScroll({
      enter: { target: 'top', container: '94%' },
      leave: { target: 'bottom', container: '0%' },
      sync: 'play',
      repeat: false,
    }),
  })

  return () => {
    entrance.revert()
  }
}
