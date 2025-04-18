import { URLPattern } from "urlpattern-polyfill"
import type {
  AllDynamicParams,
  DynamicParamsDictionary,
  ExtractDynamicRouteIds,
  ExtractStaticRouteIds,
  RouteIdParams,
  RouteParams,
  RouteOptions,
} from "./types"
import { safeUrl } from "./safe-url"

const fakeOrigin = "http://localhost"

export function createRouteFn<const Routes extends string[]>(routes: Routes) {
  type DynamicRouteId = ExtractDynamicRouteIds<Routes>[number]
  type StaticRouteId = ExtractStaticRouteIds<Routes>[number]

  type StaticRouteCatchAllId = `${StaticRouteId}/*`
  type DynamicRouteCatchAllId = `${DynamicRouteId}/*`

  // sort routes to avoid dynamic params conflicts
  const sortedRoutes = routes.sort((a, b) => {
    const aSegments = a.split("/").filter(Boolean)
    const bSegments = b.split("/").filter(Boolean)

    for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
      if (aSegments[i].includes(":") && !bSegments[i].includes(":")) {
        return 1
      }

      if (!aSegments[i].includes(":") && bSegments[i].includes(":")) {
        return -1
      }
    }

    return 0
  })

  function fn<Id extends DynamicRouteId>(id: Id, params: RouteParams<Id>): string
  function fn<Id extends StaticRouteId>(id: Id, params?: RouteParams<Id>): string
  function fn<Id extends DynamicRouteId | StaticRouteId>(
    id: Id,
    params?: RouteParams<Id> | RouteOptions
  ): string {
    let url: string = id

    for (const key in params) {
      if (key === "searchParams") {
        const searchParams =
          params.searchParams instanceof URLSearchParams
            ? params.searchParams
            : new URLSearchParams(
                Object.fromEntries(
                  Object.entries(params.searchParams ?? {})
                    .filter(([, value]) => value !== null && value !== undefined)
                    .map(([key, value]) => [key, value!.toString()])
                )
              )
        url += searchParams.size ? `?${searchParams.toString()}` : ""
      } else {
        const param = (params as Record<string, string>)[key]!
        url = url.replace(`:${key}`, param)
      }
    }

    if (params?.prefix) {
      url = `/${params.prefix.replace(/(^\/)|(\/$)/g, "")}${url}`
    }

    if (params?.origin) {
      url = new URL(url, params.origin).href
    }

    return url
  }

  fn.params = function (url: string): DynamicParamsDictionary<Routes> {
    const urlWithOrigin = new URL(url, fakeOrigin).href
    const input = safeUrl(urlWithOrigin.split("?")[0])

    const patterns = sortedRoutes.map((route) => new URLPattern({ pathname: safeUrl(route) }))

    for (const pattern of patterns) {
      const patternResult = pattern.exec(input)
      if (patternResult !== null) {
        return patternResult.pathname.groups as DynamicParamsDictionary<Routes>
      }
    }

    return {}
  }

  fn.matchUrl = function (
    url: string,
    routeIds:
      | StaticRouteId
      | DynamicRouteId
      | StaticRouteCatchAllId
      | DynamicRouteCatchAllId
      | (StaticRouteId | DynamicRouteId | StaticRouteCatchAllId | DynamicRouteCatchAllId)[]
  ): boolean {
    const matchingRoutes = typeof routeIds === "string" ? [routeIds] : routeIds
    const otherRoutes = sortedRoutes.filter((route) =>
      matchingRoutes.every(
        (matchRoute) =>
          matchRoute !== route && (matchRoute as string).replace(/\/\*$/, "") !== route
      )
    )
    const isMatch = (route: string) => {
      const urlWithOrigin = new URL(url, fakeOrigin).href
      const input = safeUrl(urlWithOrigin.split("?")[0]).replace(/\/$/, "")
      return new URLPattern({ pathname: safeUrl(route).replace(/\/\*$/, "*") }).test(input)
    }

    const bestMatch = matchingRoutes.find((route) => {
      if (isMatch(route)) {
        const strictMatchingRoute = (route as string).replace(/\/\*$/, "")
        // check if it doesn't match any other route
        return otherRoutes.every((r) => {
          if (isMatch(r) && sortedRoutes.indexOf(r) < sortedRoutes.indexOf(strictMatchingRoute)) {
            return false
          }
          return true
        })
      }

      return false
    })

    return bestMatch ? matchingRoutes.includes(bestMatch as StaticRouteId | DynamicRouteId) : false
  }

  fn.list = function (): Routes {
    return routes
  }

  return fn
}

export { DynamicParamsDictionary, AllDynamicParams, RouteParams, RouteIdParams }
