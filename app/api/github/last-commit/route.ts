import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get("owner") || ""
  const repo = searchParams.get("repo") || ""

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 })
  }

  const ghUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  // Optional GitHub token for higher rate limits
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(ghUrl, {
    headers,
    // Cache for 30s at the edge and allow stale for 5min (best-effort; SWR also handles revalidation)
    next: { revalidate: 30 },
  })

  if (!res.ok) {
    // Debug hint for logs
    console.log("[v0] last-commit GitHub error:", res.status, await safeText(res))
    return NextResponse.json({ iso: null }, { status: 200 })
  }

  const data = (await res.json()) as Array<any>
  const iso = data?.[0]?.commit?.author?.date ?? data?.[0]?.commit?.committer?.date ?? null
  return NextResponse.json({ iso })
}

async function safeText(res: Response) {
  try {
    return await res.text()
  } catch {
    return "<no-body>"
  }
}
