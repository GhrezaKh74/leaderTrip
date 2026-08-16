import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'

import { CameraIcon } from '../../components/icons'
import { NumberField } from '../../components/NumberField'
import { photoUrl } from '../../api/client'
import { useUploadPhoto } from '../../api/queries'
import type { Poi, TripPlan } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { downscalePhoto } from '../../lib/image'
import { faNum, toFa, toman, tomanShort } from '../../lib/format'
import { driftMinutes, type Expense, type Journal } from './journal'
import { balances, settle } from './settlement'

/**
 * حالت حین سفر.
 *
 * <p>سه کار که در جاده لازم می‌شود و در برنامهٔ روی کاغذ نیست: ثبت ساعت واقعی
 * رسیدن (تا بدانیم چقدر عقبیم)، ثبت هزینهٔ واقعی (تا تخمین با واقعیت سنجیده
 * شود)، و تسویه‌حساب گروهی.</p>
 *
 * <p>امتیازی که به هر توقف می‌دهید، سلیقهٔ سفر بعدی را می‌سازد — و روی همین
 * دستگاه می‌ماند.</p>
 */
export function LivePanel({
  plan,
  input,
  pois,
  journal,
  online = true,
  onChange,
}: {
  plan: TripPlan
  input: TripForm
  pois: Poi[] | undefined
  journal: Journal
  online?: boolean
  onChange: (next: Journal) => void
}) {
  const visits = useMemo(
    () =>
      plan.days.flatMap((day) =>
        day.blocks
          .filter((block) => block.kind === 'Visit' && block.poiId != null)
          .map((block) => ({ day: day.index, poiId: block.poiId as string, title: block.title, startsAt: block.startsAt })),
      ),
    [plan],
  )

  const categoryOf = useMemo(() => {
    const byId = new Map((pois ?? []).map((poi) => [poi.id, poi.category]))

    return (id: string) => byId.get(id)
  }, [pois])

  const actualTotal = journal.expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const upload = useUploadPhoto()
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  /**
   * پیوست عکس: کوچک‌سازی سمت کلاینت، بارگذاری، و ثبت فقط شناسه در دفترچه.
   * خود عکس هرگز وارد localStorage نمی‌شود — هم جا نمی‌شود، هم لازم نیست.
   */
  const attachPhoto = async (poiId: string, file: File) => {
    setPhotoError(null)
    setUploadingFor(poiId)

    try {
      const saved = await upload.mutateAsync(await downscalePhoto(file))

      onChange(upsertCheckIn(journal, poiId, { photoId: saved.id, category: categoryOf(poiId) }))
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'بارگذاری عکس انجام نشد.')
    } finally {
      setUploadingFor(null)
    }
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        داده‌های این بخش روی همین دستگاه می‌ماند — جز عکس‌هایی که خودتان پیوست
        می‌کنید: آن‌ها روی سرور ذخیره می‌شوند، بدون اینکه سرور بداند مال کدام
        سفرند.
      </Alert>

      <Section title="چک‌این توقف‌ها">
        <Stack spacing={2}>
          {visits.map((visit) => {
            const checkIn = journal.checkIns.find((c) => c.poiId === visit.poiId)
            const drift = checkIn ? driftMinutes(visit.startsAt, checkIn.arrivedAt) : null

            return (
              <Paper key={visit.poiId} sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      روز {faNum(visit.day)} · {visit.title}
                    </Typography>
                    <Chip size="small" variant="outlined" label={`برنامه ${toFa(visit.startsAt)}`} />
                  </Stack>

                  <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField
                        type="time"
                        label="ساعت واقعی"
                        value={checkIn?.arrivedAt ?? ''}
                        slotProps={{ inputLabel: { shrink: true } }}
                        onChange={(event) =>
                          onChange(upsertCheckIn(journal, visit.poiId, {
                            arrivedAt: event.target.value,
                            category: categoryOf(visit.poiId),
                          }))
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      {drift === null ? null : (
                        <Chip
                          size="small"
                          color={Math.abs(drift) <= 15 ? 'success' : drift > 0 ? 'warning' : 'info'}
                          label={
                            drift === 0
                              ? 'دقیقاً سر وقت'
                              : drift > 0
                                ? `${faNum(drift)} دقیقه دیرتر`
                                : `${faNum(-drift)} دقیقه زودتر`
                          }
                        />
                      )}
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          چطور بود؟
                        </Typography>
                        <Rating
                          value={checkIn?.rating ?? null}
                          onChange={(_, value) =>
                            onChange(upsertCheckIn(journal, visit.poiId, {
                              ...(value ? { rating: value } : {}),
                              category: categoryOf(visit.poiId),
                            }))
                          }
                        />
                      </Stack>
                    </Grid>

                    <Grid size={12}>
                      <TextField
                        label="یادداشت"
                        value={checkIn?.note ?? ''}
                        multiline
                        minRows={1}
                        onChange={(event) =>
                          onChange(upsertCheckIn(journal, visit.poiId, {
                            note: event.target.value,
                            category: categoryOf(visit.poiId),
                          }))
                        }
                      />
                    </Grid>

                    <Grid size={12}>
                      <CheckInPhoto
                        title={visit.title}
                        photoId={checkIn?.photoId}
                        uploading={uploadingFor === visit.poiId}
                        online={online}
                        onAttach={(file) => void attachPhoto(visit.poiId, file)}
                        onRemove={() =>
                          onChange({
                            ...journal,
                            checkIns: journal.checkIns.map((c) =>
                              c.poiId === visit.poiId ? stripPhoto(c) : c,
                            ),
                          })
                        }
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            )
          })}

          {photoError ? <Alert severity="warning">{photoError}</Alert> : null}
        </Stack>
      </Section>

      <Section title="هزینهٔ واقعی">
        <ExpenseEditor journal={journal} input={input} onChange={onChange} />

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`تخمین: ${tomanShort(plan.cost.total)}`} />
          <Chip color="secondary" label={`واقعی تا اینجا: ${tomanShort(actualTotal)}`} />
          {actualTotal > 0 ? (
            <Chip
              color={actualTotal > plan.cost.total ? 'error' : 'success'}
              label={
                actualTotal > plan.cost.total
                  ? `${tomanShort(actualTotal - plan.cost.total)} بیشتر از تخمین`
                  : `${tomanShort(plan.cost.total - actualTotal)} کمتر از تخمین`
              }
            />
          ) : null}
        </Stack>
      </Section>

      <Section title="تسویه‌حساب">
        <Settlement journal={journal} input={input} />
      </Section>
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography variant="h3" component="h3">
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

function ExpenseEditor({
  journal,
  input,
  onChange,
}: {
  journal: Journal
  input: TripForm
  onChange: (next: Journal) => void
}) {
  const [draft, setDraft] = useState<Expense>(() => ({
    id: '',
    label: '',
    amount: 0,
    paidBy: input.travelers[0]?.id ?? '',
    sharedBy: [],
  }))

  const nameOf = (id: string) =>
    input.travelers.find((t) => t.id === id)?.name ||
    `همسفر ${faNum(input.travelers.findIndex((t) => t.id === id) + 1)}`

  return (
    <Stack spacing={2}>
      {journal.expenses.map((expense) => (
        <Paper key={expense.id} sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              {expense.label} — {toman(expense.amount)}
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}
                (پرداخت: {nameOf(expense.paidBy)})
              </Typography>
            </Typography>

            <IconButton
              size="small"
              aria-label={`حذف ${expense.label}`}
              onClick={() =>
                onChange({ ...journal, expenses: journal.expenses.filter((e) => e.id !== expense.id) })
              }
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      ))}

      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="بابت"
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <NumberField
            label="مبلغ"
            value={draft.amount}
            min={0}
            step={10_000}
            onChange={(amount) => setDraft({ ...draft, amount })}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            select
            label="چه کسی پرداخت کرد"
            value={draft.paidBy}
            onChange={(event) => setDraft({ ...draft, paidBy: event.target.value })}
          >
            {input.travelers.map((traveler, index) => (
              <MenuItem key={traveler.id} value={traveler.id}>
                {traveler.name || `همسفر ${faNum(index + 1)}`}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={draft.label.trim() === '' || draft.amount <= 0}
            onClick={() => {
              onChange({
                ...journal,
                expenses: [...journal.expenses, { ...draft, id: `e${journal.expenses.length}-${draft.label}` }],
              })
              setDraft({ ...draft, label: '', amount: 0 })
            }}
          >
            افزودن
          </Button>
        </Grid>
      </Grid>
    </Stack>
  )
}

function Settlement({ journal, input }: { journal: Journal; input: TripForm }) {
  const ids = input.travelers.map((t) => t.id)
  const nameOf = (id: string) => {
    const index = input.travelers.findIndex((t) => t.id === id)

    return input.travelers[index]?.name || `همسفر ${faNum(index + 1)}`
  }

  const rows = balances(journal.expenses, ids)
  const transfers = settle(journal.expenses, ids)

  if (journal.expenses.length === 0) {
    return <Typography color="text.secondary">هنوز هزینه‌ای ثبت نشده است.</Typography>
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        {rows.map((row) => (
          <Typography key={row.travelerId} variant="body2">
            {nameOf(row.travelerId)}: پرداخت {toman(row.paid)} · سهم {toman(row.owes)} ·{' '}
            <Typography
              component="span"
              variant="body2"
              color={row.net >= 0 ? 'success.main' : 'error.main'}
            >
              {row.net >= 0 ? `${toman(row.net)} طلبکار` : `${toman(-row.net)} بدهکار`}
            </Typography>
          </Typography>
        ))}
      </Stack>

      <Divider />

      {transfers.length === 0 ? (
        <Alert severity="success">همه بی‌حساب‌اند.</Alert>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            کمترین تعداد جابه‌جایی پول برای اینکه همه بی‌حساب شوند:
          </Typography>
          {transfers.map((transfer) => (
            <Typography key={`${transfer.from}-${transfer.to}`} variant="body2">
              {nameOf(transfer.from)} ← {nameOf(transfer.to)}: <b>{toman(transfer.amount)}</b>
            </Typography>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

/**
 * برداشتن عکس یعنی برداشتن پیوند از دفترچه؛ خود فایل روی سرور می‌ماند چون سرور
 * نمی‌داند این شناسه کجا استفاده شده — همان کم‌دانیِ عمدی که حریم را نگه می‌دارد.
 */
function stripPhoto(checkIn: Journal['checkIns'][number]): Journal['checkIns'][number] {
  const { photoId: _photoId, ...rest } = checkIn

  return rest
}

/** ردیف عکس چک‌این: بندانگشتی اگر هست، دکمهٔ پیوست اگر نیست. */
function CheckInPhoto({
  title,
  photoId,
  uploading,
  online,
  onAttach,
  onRemove,
}: {
  title: string
  photoId: string | undefined
  uploading: boolean
  online: boolean
  onAttach: (file: File) => void
  onRemove: () => void
}) {
  if (photoId !== undefined) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box
          component="img"
          src={photoUrl(photoId)}
          alt={`عکس ${title}`}
          sx={{
            height: 88,
            maxWidth: 160,
            borderRadius: 2,
            objectFit: 'cover',
            border: 1,
            borderColor: 'divider',
          }}
        />

        <Tooltip title="برداشتن عکس از این چک‌این">
          <IconButton size="small" aria-label={`برداشتن عکس ${title}`} onClick={onRemove}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    )
  }

  return (
    <Tooltip title={online ? '' : 'پیوست عکس به اینترنت نیاز دارد'}>
      <span>
        <Button
          component="label"
          size="small"
          variant="outlined"
          disabled={uploading || !online}
          startIcon={uploading ? <CircularProgress size={14} /> : <CameraIcon sx={{ fontSize: 18 }} />}
        >
          {uploading ? 'در حال بارگذاری…' : 'پیوست عکس'}
          <input
            type="file"
            accept="image/*"
            // دوربین پشت گوشی، مستقیم — این دکمه وسط سفر زده می‌شود، نه پشت میز.
            capture="environment"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file !== undefined) onAttach(file)

              event.target.value = ''
            }}
          />
        </Button>
      </span>
    </Tooltip>
  )
}

function upsertCheckIn(
  journal: Journal,
  poiId: string,
  patch: Partial<Journal['checkIns'][number]>,
): Journal {
  const existing = journal.checkIns.find((c) => c.poiId === poiId)
  const merged = { poiId, arrivedAt: '', ...existing, ...patch }

  return {
    ...journal,
    checkIns: existing
      ? journal.checkIns.map((c) => (c.poiId === poiId ? merged : c))
      : [...journal.checkIns, merged],
  }
}
