"use client"

import useSWR from "swr"
import { ExternalLink, RefreshCw, Trash2, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchDailyCommitCounts, fetchLastCommitDate } from "@/lib/github"
import type { TrackedProject } from "@/types/project"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

type Props = {
  project: TrackedProject
  onRemove: () => void
}

function formatDaysAgo(date?: string | null) {
  if (!date) return "unknown"
  const last = new Date(date).getTime()
  const now = Date.now()
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

export function ProjectCard({ project, onRemove }: Props) {
  const { owner, repo } = project

  const {
    data: lastCommitISO,
    isLoading: lastLoading,
    error: lastError,
    mutate: mutateLast,
  } = useSWR<string | null>(["github:last-commit", owner, repo], () => fetchLastCommitDate(owner, repo), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60_000,
    dedupingInterval: 10_000,
  })

  const {
    data: daily,
    isLoading: dailyLoading,
    error: dailyError,
    mutate: mutateDaily,
  } = useSWR<{ date: string; count: number }[]>(
    ["github:daily-7", owner, repo],
    () => fetchDailyCommitCounts(owner, repo, 7),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60_000,
      dedupingInterval: 10_000,
    },
  )

  const refresh = async () => {
    await Promise.all([mutateLast(), mutateDaily()])
  }

  // Compute status and streak
  const now = Date.now()
  const lastCommitTime = lastCommitISO ? new Date(lastCommitISO).getTime() : null
  const inactivityDays =
    lastCommitTime != null ? Math.floor((now - lastCommitTime) / (1000 * 60 * 60 * 24)) : Number.POSITIVE_INFINITY
  const abandoned = inactivityDays >= 3
  const statusLabel = abandoned ? "Abandoned" : "Active"

  // Streak: consecutive days from today backward with >= 1 commit per day
  let streak = 0
  if (daily && daily.length > 0) {
    const byDate = new Map(daily.map((d) => [d.date, d.count]))
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = byDate.get(key) ?? 0
      if (count > 0) {
        streak += 1
      } else {
        break
      }
    }
  }

  const chartColor = "var(--color-primary)"
  const chartGrid = "var(--color-muted)"
  const statusColor = abandoned ? "var(--color-destructive)" : "var(--color-chart-2)"

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base">
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:underline"
          >
            {project.name}
            <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
          </a>
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={refresh} aria-label="Refresh project">
            <RefreshCw className={cn("size-4", (lastLoading || dailyLoading) && "animate-spin")} />
          </Button>
          <Button variant="destructive" size="icon" onClick={onRemove} aria-label="Remove project">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: statusColor,
              color: statusColor,
            }}
          >
            {abandoned ? "🔴 Abandoned" : "🟢 Active"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Last commit: {lastLoading ? "loading…" : lastError ? "error" : formatDaysAgo(lastCommitISO)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            Streak
          </span>
          <Badge variant="secondary" className="text-xs">
            {dailyLoading ? "…" : dailyError ? "—" : `${streak} day${streak === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {/* 7-day mini chart */}
        {daily && daily.length > 0 ? (
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} hide />
                <YAxis tickLine={false} axisLine={false} hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: `1px solid var(--color-border)`,
                    color: "var(--color-popover-foreground)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "var(--color-muted-foreground)" }}
                />
                <Bar dataKey="count" fill={chartColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {dailyLoading ? "Loading activity…" : dailyError ? "No activity data." : "No commits in the last week."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
