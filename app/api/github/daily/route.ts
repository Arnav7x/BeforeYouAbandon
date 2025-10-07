import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get("owner") || ""
  const repo = searchParams.get("repo") || ""
  const daysParam = Number(searchParams.get("days") || "7")
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 31) : 7

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 })
  }

  // Build UTC window [since 00:00 UTC, until 23:59:59.999 UTC] covering the last N days
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

  const ghUrl = `https://api.github.com/repos/${owner}/${repo}/commits?${params.toString()}`

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(ghUrl, {
    headers,
    next: { revalidate: 30 },
  })

  // Pre-seed buckets
  const buckets = new Map<string, number>()
  const cursor = new Date(since)
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10)
    buckets.set(key, 0)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  if (!res.ok) {
    console.log("[v0] daily GitHub error:", res.status, await safeText(res))
    return NextResponse.json(Array.from(buckets, ([date, count]) => ({ date, count })))
  }

  const commits = (await res.json()) as Array<any>
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

  return NextResponse.json(Array.from(buckets, ([date, count]) => ({ date, count })))
}

async function safeText(res: Response) {
  try {
    return await res.text()
  } catch {
    return "<no-body>"
  }
}
