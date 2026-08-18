import type { SvgIconComponent } from '@mui/icons-material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined'
import AttractionsIcon from '@mui/icons-material/AttractionsOutlined'
import BeachAccessIcon from '@mui/icons-material/BeachAccessOutlined'
import CottageIcon from '@mui/icons-material/CottageOutlined'
import ForestIcon from '@mui/icons-material/ForestOutlined'
import HikingIcon from '@mui/icons-material/HikingOutlined'
import LandscapeIcon from '@mui/icons-material/LandscapeOutlined'
import LocalFloristIcon from '@mui/icons-material/LocalFloristOutlined'
import MosqueIcon from '@mui/icons-material/MosqueOutlined'
import MuseumIcon from '@mui/icons-material/MuseumOutlined'
import RestaurantIcon from '@mui/icons-material/RestaurantOutlined'
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined'
import TerrainIcon from '@mui/icons-material/TerrainOutlined'
import WaterDropIcon from '@mui/icons-material/WaterDropOutlined'
import WavesIcon from '@mui/icons-material/WavesOutlined'
import WbSunnyIcon from '@mui/icons-material/WbSunnyOutlined'

import type { PoiCategory } from '../../api/schemas'

/**
 * چهرهٔ بصری هر دستهٔ جاذبه — آیکون + رنگ معنایی از پالت تم.
 *
 * <p>فهرست جاذبه‌های متنی همه شبیه هم‌اند؛ آواتار دسته کاری می‌کند که چشم
 * پیش از خواندن بداند با چه‌جور جایی طرف است: تاریخی لاجورد است، طبیعت سبز،
 * خوراک و خرید زعفران — همان نگاشتی که بلوک‌های برنامه هم دارند.</p>
 */
export const CATEGORY_VISUAL: Record<
  PoiCategory,
  { icon: SvgIconComponent; color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' }
> = {
  Historical: { icon: AccountBalanceIcon, color: 'info' },
  Museum: { icon: MuseumIcon, color: 'info' },
  Religious: { icon: MosqueIcon, color: 'info' },
  Nature: { icon: ForestIcon, color: 'success' },
  Garden: { icon: LocalFloristIcon, color: 'success' },
  Village: { icon: CottageIcon, color: 'success' },
  Adventure: { icon: HikingIcon, color: 'warning' },
  Mountain: { icon: TerrainIcon, color: 'warning' },
  Cave: { icon: LandscapeIcon, color: 'warning' },
  Desert: { icon: WbSunnyIcon, color: 'warning' },
  Food: { icon: RestaurantIcon, color: 'secondary' },
  Shopping: { icon: StorefrontIcon, color: 'secondary' },
  Entertainment: { icon: AttractionsIcon, color: 'secondary' },
  Beach: { icon: BeachAccessIcon, color: 'primary' },
  Lake: { icon: WavesIcon, color: 'primary' },
  Waterfall: { icon: WaterDropIcon, color: 'primary' },
}
