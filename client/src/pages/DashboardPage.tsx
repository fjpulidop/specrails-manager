import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { usePipeline } from '../hooks/usePipeline'
import { useProjectCache } from '../hooks/useProjectCache'
import { CommandGrid } from '../components/CommandGrid'
import { RecentJobs } from '../components/RecentJobs'
import { ImplementWizard } from '../components/ImplementWizard'
import { BatchImplementWizard } from '../components/BatchImplementWizard'
import { FeatureProposalModal } from '../components/FeatureProposalModal'
import type { CommandInfo, JobSummary } from '../types'
import { getApiBase } from '../lib/api'
import { useHub } from '../hooks/useHub'
import { cn } from '../lib/utils'

export default function DashboardPage() {
  const { activeProjectId } = useHub()
  const { recentJobs } = usePipeline(activeProjectId)
  const [wizardOpen, setWizardOpen] = useState<string | null>(null)
  const [proposalOpen, setProposalOpen] = useState(false)

  const { data: commands } = useProjectCache<CommandInfo[]>({
    namespace: 'commands',
    projectId: activeProjectId,
    initialValue: [],
    fetcher: async () => {
      const res = await fetch(`${getApiBase()}/config`)
      if (!res.ok) return []
      const data = await res.json() as { commands: CommandInfo[] }
      return data.commands
    },
  })

  const { data: jobs, isFirstLoad: isLoadingJobs, refresh: refreshJobs } = useProjectCache<JobSummary[]>({
    namespace: 'jobs',
    projectId: activeProjectId,
    initialValue: recentJobs,
    fetcher: async () => {
      const res = await fetch(`${getApiBase()}/jobs?limit=10`)
      if (!res.ok) return []
      const data = await res.json() as { jobs: JobSummary[] }
      return data.jobs
    },
    pollInterval: 10_000,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Commands
        </h2>
        <CommandGrid
          commands={commands}
          onOpenWizard={(slug) => setWizardOpen(slug)}
        />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Jobs
        </h2>
        <RecentJobs
          jobs={jobs}
          isLoading={isLoadingJobs}
          onJobsCleared={refreshJobs}
        />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Feature Discovery
        </h2>
        <button
          type="button"
          onClick={() => setProposalOpen(true)}
          className={cn(
            'w-full flex items-center gap-3 p-4 rounded-lg border border-border/30 text-left glass-card',
            'hover:border-dracula-purple/40 hover:bg-dracula-current/30 transition-all active:scale-[0.98]'
          )}
        >
          <div className="w-8 h-8 rounded-md bg-dracula-purple/20 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-dracula-purple" />
          </div>
          <div>
            <p className="text-sm font-medium">Propose a Feature</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Describe an idea — Claude will structure it into a GitHub Issue
            </p>
          </div>
        </button>
      </section>

      <ImplementWizard
        open={wizardOpen === 'implement'}
        onClose={() => setWizardOpen(null)}
      />
      <BatchImplementWizard
        open={wizardOpen === 'batch-implement'}
        onClose={() => setWizardOpen(null)}
      />
      <FeatureProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
      />
    </div>
  )
}
