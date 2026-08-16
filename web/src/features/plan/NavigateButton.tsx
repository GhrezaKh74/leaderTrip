import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

import { NavigateIcon } from '../../components/icons'
import { geoUri, googleMapsDirections, wazeNavigation, type NavPoint } from '../../lib/navigation'

/**
 * دکمهٔ «برو با مسیریاب» — کنار هر مقصدی که مختصات دارد.
 *
 * <p>برنامهٔ ما می‌گوید «کجا و کی»؛ پشت فرمان، ناوبریِ پیچ‌به‌پیچ کار
 * مسیریاب‌هاست و وانمود نمی‌کنیم کار ماست. این دکمه همان مرز صادقانه است.</p>
 */
export function NavigateButton({ destination }: { destination: NavPoint }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const open = (url: string) => {
    window.open(url, '_blank', 'noopener')
    setAnchor(null)
  }

  return (
    <>
      <Tooltip title={`مسیریابی به ${destination.name ?? 'این مقصد'}`}>
        <IconButton
          size="small"
          aria-label={`مسیریابی به ${destination.name ?? 'مقصد'}`}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <NavigateIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => open(googleMapsDirections(destination))}>گوگل‌مپس</MenuItem>
        <MenuItem onClick={() => open(wazeNavigation(destination))}>ویز</MenuItem>
        {/* روی اندروید فهرست نقشه‌های نصب‌شده را باز می‌کند — نشان و بلد هم. */}
        <MenuItem onClick={() => open(geoUri(destination))}>اپ نقشهٔ گوشی (نشان/بلد…)</MenuItem>
      </Menu>
    </>
  )
}
