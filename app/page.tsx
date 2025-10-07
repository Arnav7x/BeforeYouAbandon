"use client"

import { useEffect, useMemo, useState } from "react"
import { Github, Plus, DatabaseZap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddProjectForm } from "@/components/add-project-form"
import { ProjectCard } from "@/components/project-card"
import { getProjects, saveProjects } from "@/lib/storage"
import type { TrackedProject } from "@/types/project"

export default function HomePage() {
  const [projects, setProjects] = useState<TrackedProject[]>([])

  useEffect(() => {
    setProjects(getProjects())
  }, [])

  const handleAdd = (p: TrackedProject) => {
    const next = [p, ...projects]
    setProjects(next)
    saveProjects(next)
  }

  const handleRemove = (id: string) => {
    const next = projects.filter((p) => p.id !== id)
    setProjects(next)
    saveProjects(next)
  }

  const haveProjects = useMemo(() => projects.length > 0, [projects])

  return (
    <main className="min-h-dvh">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <header className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">BeforeYouAbandon</h1>
            <p className="mt-2 text-balance text-sm text-muted-foreground md:text-base">
              Track your project’s heartbeat before you abandon it.
            </p>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
            aria-label="Open GitHub"
          >
            <Github className="size-5" aria-hidden="true" />
            Open GitHub
          </a>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="size-5" aria-hidden="true" />
                Add Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddProjectForm onAdd={handleAdd} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DatabaseZap className="size-5" aria-hidden="true" />
                Your Tracked Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Projects are saved locally in your browser. No account needed.
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {haveProjects ? (
            projects.map((p) => <ProjectCard key={p.id} project={p} onRemove={() => handleRemove(p.id)} />)
          ) : (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">
                <p>No projects yet. Add one to start tracking activity.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </section>
    </main>
  )
}
