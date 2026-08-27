import { Link } from 'react-router-dom'
import {
  ClipboardList, BookOpen,
  Users, CheckSquare, Sparkles, FileText, CalendarCheck,
} from 'lucide-react'
import { useEditorTheme } from '@/lib/editor-theme-context'

const sections = [
  {
    group: 'Business',
    title: 'Track your business impact.',
    description: 'Track work items and their impact.',
    items: [
      {
        label: 'Work Impact',
        description: 'Track work items, accomplishments, and the value they deliver.',
        href: '/dashboard/business-commitments',
        icon: ClipboardList,
        iconBg: 'bg-blue-500/10 text-blue-400',
      },
    ],
  },
  {
    group: 'Development',
    title: 'Invest in your growth.',
    description: 'Learning commitments, skills, and resume materials.',
    items: [
      {
        label: 'Development Commitment',
        description: 'Manage learning items and training modules.',
        href: '/dashboard/development-commitments-one',
        icon: BookOpen,
        iconBg: 'bg-emerald-500/10 text-emerald-400',
      },
      {
        label: 'Skills',
        description: 'Log and organize your skills by proficiency level.',
        href: '/dashboard/skills',
        icon: Sparkles,
        iconBg: 'bg-teal-500/10 text-teal-400',
      },
      {
        label: 'Resume',
        description: 'Upload and view resume versions with the built-in PDF viewer.',
        href: '/dashboard/resume',
        icon: FileText,
        iconBg: 'bg-slate-500/10 text-slate-400',
      },
    ],
  },
  {
    group: 'Other',
    title: 'Stay organized.',
    description: 'Meetings, follow-ups, and action items.',
    items: [
      {
        label: '1-on-1 Documents',
        description: 'Create and export structured 1-on-1 meeting records.',
        href: '/dashboard/one-on-one',
        icon: Users,
        iconBg: 'bg-violet-500/10 text-violet-400',
      },
      {
        label: 'Action Items',
        description: 'Keep track of tasks and follow-ups with priority levels.',
        href: '/dashboard/action-items',
        icon: CheckSquare,
        iconBg: 'bg-rose-500/10 text-rose-400',
      },
      {
        label: 'Reviews',
        description: 'Midyear check-ins and end-of-year reviews with accomplishments and priorities.',
        href: '/dashboard/reviews',
        icon: CalendarCheck,
        iconBg: 'bg-amber-500/10 text-amber-400',
      },
    ],
  },
]

/**
 * Dashboard landing page with gradient section headings and
 * card-grid navigation matching the c4-diagram design language.
 * @returns The rendered dashboard.
 */
export default function DashboardPage(): React.JSX.Element {
  const { profile } = useEditorTheme()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="relative mx-auto max-w-4xl space-y-14">
      {/* Top-right radial glow — same treatment as c4-diagram / Flowdeck */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-10%] -z-10 h-[480px] w-[480px] rounded-full bg-primary/[0.08] blur-[120px]"
      />

      {/* Hero greeting */}
      <div className="space-y-2 pt-4">
        <h1 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          {greeting}{profile.displayName ? `, ${profile.displayName}` : ''}.
        </h1>
        <p className="text-base text-muted-foreground">
          Here&rsquo;s your workspace. Pick a section to get started.
        </p>
      </div>

      {sections.map(({ group, title, description, items }) => (
        <section key={group} className="space-y-5">
          <div>
            <h2 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ label, description: desc, href, icon: Icon, iconBg }) => (
              <Link
                key={href}
                to={href}
                className="group flex flex-col gap-3 rounded-xl border-2 border-border/60 bg-card p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
              >
                <div className={`w-fit rounded-lg p-2.5 ${iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold leading-snug">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
