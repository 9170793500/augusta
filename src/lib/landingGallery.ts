import loginImage from '../augusta_login_image.jpg'
import landingImg1 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.42 PM.jpeg'
import landingImg2 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.43 PM.jpeg'
import landingImg3 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.43 PM (1).jpeg'
import landingVideo1 from '../landing page image/WhatsApp Video 2026-08-01 at 6.00.44 PM.mp4'
import landingImg4 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.45 PM.jpeg'
import landingImg5 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.45 PM (1).jpeg'
import landingVideo2 from '../landing page image/WhatsApp Video 2026-08-01 at 6.00.45 PM.mp4'
import landingImg6 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.46 PM.jpeg'
import landingImg7 from '../landing page image/WhatsApp Image 2026-08-01 at 6.00.46 PM (1).jpeg'
import landingVideo3 from '../landing page image/WhatsApp Video 2026-08-01 at 6.00.46 PM.mp4'

export type GalleryItem = {
  id: string
  type: 'image' | 'video'
  src: string
  cap: string
}

export const LANDING_GALLERY: GalleryItem[] = [
  { id: 'towers-evening', type: 'image', src: loginImage, cap: 'The Towers — Evening' },
  { id: 'campus-1', type: 'image', src: landingImg1, cap: 'Augusta Golf Homes — Campus' },
  { id: 'campus-2', type: 'image', src: landingImg2, cap: 'Augusta Golf Homes — Towers' },
  { id: 'campus-3', type: 'image', src: landingImg3, cap: 'Augusta Golf Homes — Greens' },
  { id: 'walkthrough-1', type: 'video', src: landingVideo1, cap: 'Augusta Golf Homes — Walkthrough' },
  { id: 'campus-4', type: 'image', src: landingImg4, cap: 'Augusta Golf Homes — Estate' },
  { id: 'campus-5', type: 'image', src: landingImg5, cap: 'Augusta Golf Homes — Residence' },
  { id: 'walkthrough-2', type: 'video', src: landingVideo2, cap: 'Augusta Golf Homes — Tour' },
  { id: 'campus-6', type: 'image', src: landingImg6, cap: 'Augusta Golf Homes — Views' },
  { id: 'campus-7', type: 'image', src: landingImg7, cap: 'Augusta Golf Homes — Community' },
  { id: 'walkthrough-3', type: 'video', src: landingVideo3, cap: 'Augusta Golf Homes — Highlights' },
]
