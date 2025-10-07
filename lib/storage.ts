import type { TrackedProject } from "@/types/project"

const KEY = "bya-projects-v1"

export function getProjects(): TrackedProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrackedProject[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveProjects(projects: TrackedProject[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(KEY, JSON.stringify(projects))
  } catch {
    // ignore
  }
}
