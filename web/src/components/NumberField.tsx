import { useEffect, useState } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

type NumberFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

/**
 * ورودی عددی که مقدارش را به‌صورت عدد بالا می‌دهد، نه رشته.
 *
 * <p>چرا کامپوننت جدا و نه `z.coerce.number()` در اسکیما: با تبدیل خودکار،
 * تایپ ورودی فرم و تایپ خروجی آن از هم جدا می‌شوند و هر جایی که مقدار را
 * می‌خواند به `unknown` می‌رسد. این‌طوری اسکیما ساده می‌ماند
 * (`z.number()`) و تبدیل همان‌جایی انجام می‌شود که اتفاق می‌افتد.</p>
 *
 * <p>متن خام جداگانه نگه داشته می‌شود چون کاربر وسط تایپ‌کردن از حالت معتبر
 * عبور می‌کند: پاک‌کردن فیلد برای نوشتن عدد تازه، لحظه‌ای رشتهٔ خالی می‌سازد.
 * تبدیل مستقیم آن به عدد یعنی فیلد ناگهان «۰» شود و مکان‌نما بپرد.</p>
 */
export function NumberField({ value, onChange, min, max, step, slotProps, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value))

  // وقتی مقدار از بیرون عوض می‌شود (بازگردانی فرم، اسلایدر متصل به همان فیلد)
  // متن باید همراهش برود — مگر اینکه همان عددی باشد که کاربر تایپ کرده.
  useEffect(() => {
    setDraft((current) => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <TextField
      {...rest}
      type="number"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)

        const parsed = Number(event.target.value)

        if (event.target.value !== '' && Number.isFinite(parsed)) {
          onChange(parsed)
        }
      }}
      onBlur={(event) => {
        // خالی‌ماندن فیلد پس از خروج، مقدار قبلی را برمی‌گرداند تا فرم هرگز
        // با `NaN` روبه‌رو نشود.
        if (event.target.value === '') setDraft(String(value))
        rest.onBlur?.(event)
      }}
      slotProps={{
        ...slotProps,
        htmlInput: { min, max, step, ...slotProps?.htmlInput },
      }}
    />
  )
}
