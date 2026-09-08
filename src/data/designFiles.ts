/** The design files behind this build, linked from the dispatcher's settings page. One object per
 *  file; a file without an `href` is still in progress and renders as a placeholder. */
export interface DesignFile {
  id: string
  title: string
  blurb: string
  href?: string
}

export const DESIGN_FILES: DesignFile[] = [
  {
    id: 'problems',
    title: 'Problems and personas',
    blurb: 'Who Lena is, what her shift asks of her, and the problem this board is built around.',
    href: 'https://claude.ai/code/artifact/bb9e5959-fb97-4ee5-a0ad-767b4a30d75c',
  },
  {
    id: 'solution',
    title: 'The solution',
    blurb: 'How the board, Lookout, and the route file answer that problem, and where the design adapted along the way.',
  },
]
