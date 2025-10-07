const GH_API = "https://api.github.com"
const API_BASE = "/api/github"

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  // Accepts full URL or "owner/repo"
  try {
    if (input.includes("http")) {
      const u = new URL(input)
      if (u.hostname !== "github.com") return null
      const parts = u.pathname.replace(/^\/+/, "").split("/")
      if (parts.length < 2) return null
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") }
    } else {
      const parts = input.split("/")
      if (parts.length !== 2) return null
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") }
    }
  } catch {
    return null
  }
}

export async function fetchLastCommitDate(owner: string, repo: string): Promise<string | null> {
  const url = `${API_BASE}/last-commit?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  const res = await fetch(url)
  if (!res.ok) {
    return null
  }
  const data = (await res.json()) as { iso: string | null }
  return data?.iso ?? null
}

export async function fetchDailyCommitCounts(
  owner: string,
  repo: string,
  days = 7,
): Promise<{ date: string; count: number }[]> {
  const url = `${API_BASE}/daily?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&days=${days}`
  const res = await fetch(url)
  if (!res.ok) {
    return generateEmptyDaysUTC(days)
  }
  const data = (await res.json()) as { date: string; count: number }[]
  // Defensive: ensure the expected length/order, otherwise regenerate empty
  if (!Array.isArray(data) || data.length === 0) return generateEmptyDaysUTC(days)
  return data
}

function generateEmptyDaysUTC(days: number) {
  const out: { date: string; count: number }[] = []
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const key = new Date(start)
    key.setUTCDate(start.getUTCDate() + i)
    out.push({ date: key.toISOString().slice(0, 10), count: 0 })
  }
  return out
}
