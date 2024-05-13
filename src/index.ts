import { URLPattern } from "urlpattern-polyfill"
import type {
  DynamicParamsDictionary,
  ExtractDynamicRouteIds,
  ExtractStaticRouteIds,
  RouteParams,
  SearchParams,
} from "./types"

const fakeOrigin = "http://localhost"

export function createRouteFn<const Routes extends string[]>(routes: Routes) {
  type DynamicRouteId = ExtractDynamicRouteIds<Routes>[number]
  type StaticRouteId = ExtractStaticRouteIds<Routes>[number]

  function fn<Id extends DynamicRouteId>(
    id: Id,
    params: RouteParams<Id>
  ): string
  function fn<Id extends StaticRouteId>(
    id: Id,
    params?: RouteParams<Id>
  ): string
  function fn<Id extends StaticRouteId | DynamicRouteId>(
    id: Id,
    params?: RouteParams<Id> | SearchParams
  ): string {
    let url: string = id

    for (const key in params) {
      if (key === "searchParams") {
        const searchParams = new URLSearchParams(
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

    return url
  }

  fn.params = function (url: string): DynamicParamsDictionary<Routes> {
    const urlWithOrigin = new URL(url, fakeOrigin).href
    const input = urlWithOrigin.split("?")[0]

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

    const patterns = sortedRoutes.map(
      (route) => new URLPattern({ pathname: route })
    )

    for (const pattern of patterns) {
      const patternResult = pattern.exec(input)
      if (patternResult !== null) {
        return patternResult.pathname.groups as DynamicParamsDictionary<Routes>
      }
    }

    return {}
  }

  fn.test = function (
    url: string,
    routeIds:
      | StaticRouteId
      | DynamicRouteId
      | (StaticRouteId | DynamicRouteId)[]
  ): boolean {
    const routes = typeof routeIds === "string" ? [routeIds] : routeIds
    for (const route of routes) {
      const urlWithOrigin = new URL(url, fakeOrigin).href
      const input = urlWithOrigin.split("?")[0]

      const pattern = new URLPattern({ pathname: route })

      if (pattern.test(input)) {
        return true
      }
    }
    return false
  }

  fn.list = function (): Routes {
    return routes
  }

  return fn
}
