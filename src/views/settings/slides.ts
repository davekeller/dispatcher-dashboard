import type { SettingsSection } from './story'

/** The pages of the design file behind this build, one object per slide, each filed under the chapter
 *  it belongs to. The files are static 1280×720 exports of the deck in `public/slides/`, script-free;
 *  a new slide is one export and one object here. */
export interface Slide {
  id: string
  /** Its number in the deck, so the caption can say "3 / 13". */
  n: number
  title: string
  file: string
  section: SettingsSection
}

export const SLIDE_WIDTH = 1280
export const SLIDE_HEIGHT = 720

export const SLIDES: Slide[] = [
  { id: 'main', n: 1, title: 'Active Shift', file: '/slides/main.html', section: 'project' },
  { id: 'brief', n: 2, title: 'The brief', file: '/slides/brief.html', section: 'project' },
  { id: 'numbers', n: 13, title: 'The numbers', file: '/slides/numbers.html', section: 'project' },
  { id: 'lena', n: 4, title: 'Lena', file: '/slides/lena.html', section: 'lena' },
  { id: 'jobs', n: 5, title: 'Her three jobs', file: '/slides/jobs.html', section: 'lena' },
  { id: 'loop', n: 6, title: 'Also in the loop', file: '/slides/loop.html', section: 'lena' },
  { id: 'shift', n: 7, title: 'Her shift at 2:47', file: '/slides/shift.html', section: 'lena' },
  { id: 'problems', n: 3, title: 'Problems', file: '/slides/problems.html', section: 'problems' },
  { id: 'challenges', n: 8, title: 'UX challenges', file: '/slides/challenges.html', section: 'problems' },
  { id: 'flow-a', n: 9, title: 'Flow: intervention', file: '/slides/flow-a.html', section: 'problems' },
  { id: 'flow-b', n: 10, title: 'Flow: stale data', file: '/slides/flow-b.html', section: 'problems' },
  { id: 'agent', n: 11, title: 'Agent efficiency', file: '/slides/agent.html', section: 'solutions' },
  { id: 'focus', n: 12, title: 'Focus', file: '/slides/focus.html', section: 'why' },
]

export const SLIDE_COUNT = SLIDES.length

/** A chapter's slides, in deck order. */
export const slidesFor = (section: SettingsSection): Slide[] => SLIDES.filter((slide) => slide.section === section).sort((a, b) => a.n - b.n)
