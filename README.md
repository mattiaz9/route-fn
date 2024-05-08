# route-fn

A simple utility function for typesafe urls.

## Installation

```bash
pnpm install route-fn
```

## Usage

```ts
import { createRouteFn } from "route-fn"

const route = createRouteFn([
  "/",
  "/:user",
  "/:user/:repo",
  "/:user/:repo/:branch",
])

// now you can use the route function to generate typesafe urls

const homeUrl = route("/")
const branchUrl = route("/:user/:repo/:branch", {
  user: "mattiaz9",
  repo: "route-fn",
  branch: "main",
  searchParams: {
    q: "test",
  },
}) // => "/mattiaz9/route-fn/main?q=test"

// typescript will yell at you if a param is missing
const userUrl = route("/:user", {})
//                              ^^ missing user param
```

## Params extraction from url

```ts
const { user, repo, branch } = route.params(
  "https://mywebsite.com/mattiaz9/route-fn/main"
)
// => { user: "mattiaz9", repo: "route-fn", branch: "main" }
```

### Example usage in Next.js middleware

Since Next.js middleware doesn't parse the route params, you can use `route.params()` to extract them.

```ts
// lib/route.ts

import { createRouteFn } from "route-fn"

export const route = createRouteFn([
  "/",
  "/account",
  "/:team/analytics",
  "/:team/posts/:slug",
  // ...
])
```

```ts
// middleware.ts

import { route } from "@/lib/route"

export async function middleware(req: NextRequest) {
  const userTeams = await getUserTeams(req)
  const { team } = route.params(req.url)

  if (team && !userTeams.includes(team)) {
    return new Response("Unauthorized", { status: 401 })
  }

  return NextResponse.next()
}
```

## Route testing

```ts
const route = createRouteFn([
  "/",
  "/:user",
  "/:user/:repo",
  "/:user/:repo/:branch",
])

route.test("/mattiaz9/route-fn/main", "/:user/:repo/:branch") // true
route.test("/mattiaz9/route-fn/main", ["/:user/:repo", "/:user/:repo/:branch"]) // true
route.test("/mattiaz9/route-fn/main", "/:user/:repo") // false
```

## Troubleshooting

### FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory

For some reason setting `incremental` to `true` in `tsconfig.json` causes the `tsc` process to run out of memory. To fix this issue set `incremental` to `false`.

```json
// tsconfig.json

{
  "compilerOptions": {
    // ...
    "incremental": false
    // ...
  }
}
```
