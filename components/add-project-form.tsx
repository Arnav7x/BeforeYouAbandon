"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { parseRepoUrl } from "@/lib/github"
import type { TrackedProject } from "@/types/project"

type Props = {
  onAdd: (project: TrackedProject) => void
}

export function AddProjectForm({ onAdd }: Props) {
  const [name, setName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = parseRepoUrl(repoUrl.trim())
    if (!parsed) {
      setError('Please enter a valid GitHub repo URL or "owner/repo"')
      return
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const project: TrackedProject = {
      id,
      name: name.trim() || `${parsed.owner}/${parsed.repo}`,
      repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      owner: parsed.owner,
      repo: parsed.repo,
      username: username.trim() || undefined,
      addedAt: new Date().toISOString(),
    }

    setLoading(true)
    try {
      onAdd(project)
      setName("")
      setRepoUrl("")
      setUsername("")
    } catch (err) {
      setError("Failed to add project. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          placeholder="My Awesome Library"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby="project-name-help"
        />
        <p id="project-name-help" className="text-xs text-muted-foreground">
          Optional. Defaults to "owner/repo".
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="repo-url">GitHub Repository URL</Label>
        <Input
          id="repo-url"
          placeholder="https://github.com/owner/repo or owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gh-username">GitHub Username (optional)</Label>
        <Input
          id="gh-username"
          placeholder="your-github-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-2 text-sm text-destructive-foreground/90">{error}</CardContent>
        </Card>
      )}

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add Project"}
        </Button>
      </div>
    </form>
  )
}
