const GH_API = "https://api.github.com"

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
  const url = `${GH_API}/repos/${owner}/${repo}/commits?per_page=1`
  const res = await fetch(url, {
    headers: {
      // Unauthenticated: subject to low rate limits, OK for MVP
      Accept: "application/vnd.github+json",
    },
  })
  if (!res.ok) {
    // 404 or other errors
    return null
  }
  const data = (await res.json()) as Array<any>
  if (!Array.isArray(data) || data.length === 0) return null
  const iso = data[0]?.commit?.author?.date ?? data[0]?.commit?.committer?.date
  return typeof iso === "string" ? iso : null
}

export async function fetchDailyCommitCounts(
  owner: string,
  repo: string,
  days = 7,
): Promise<{ date: string; count: number }[]> {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (days - 1))

  const until = new Date()
  until.setUTCHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: "100",
  })
  const url = `${GH_API}/repos/${owner}/${repo}/commits?${params.toString()}`

  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  })
  if (!res.ok) {
    return generateEmptyDaysUTC(days)
  }
  const commits = (await res.json()) as Array<any>

  // Bucket by UTC date keys YYYY-MM-DD
  const buckets = new Map<string, number>()
  const cursor = new Date(since)
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10)
    buckets.set(key, 0)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (const c of commits) {
    const iso = c?.commit?.author?.date ?? c?.commit?.committer?.date
    if (!iso || typeof iso !== "string") continue
    const d = new Date(iso)
    d.setUTCHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
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
