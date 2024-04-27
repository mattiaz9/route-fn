import { URLPattern } from "urlpattern-polyfill"
import type { Prettify, Split } from "./types"

type IsDynamicRoute<Segments extends unknown[]> = Segments extends [
  infer Head,
  ...infer Tail
]
  ? Head extends `:${string}`
    ? true
    : IsDynamicRoute<Tail>
  : false

type ExtractStaticRouteIds<
  T extends readonly unknown[],
  Aggr extends string[] = []
> = T extends readonly [infer Route, ...infer NextRoutes]
  ? IsDynamicRoute<Split<Route extends string ? Route : "", "/">> extends true
    ? ExtractStaticRouteIds<NextRoutes, Aggr>
    : Route extends string
    ? ExtractStaticRouteIds<NextRoutes, [...Aggr, Route]>
    : ExtractStaticRouteIds<NextRoutes, Aggr>
  : Aggr

type ExtractDynamicRouteIds<
  T extends readonly unknown[],
  Aggr extends string[] = []
> = T extends readonly [infer Route, ...infer NextRoutes]
  ? IsDynamicRoute<Split<Route extends string ? Route : "", "/">> extends true
    ? Route extends string
      ? ExtractDynamicRouteIds<NextRoutes, [...Aggr, Route]>
      : ExtractDynamicRouteIds<NextRoutes, Aggr>
    : ExtractDynamicRouteIds<NextRoutes, Aggr>
  : Aggr

type ExtractParamsFromSegments<
  T extends unknown[],
  Aggr extends string[] = []
> = T extends [infer Head, ...infer Tail]
  ? Head extends `:${infer P}`
    ? ExtractParamsFromSegments<Tail, [...Aggr, P]>
    : ExtractParamsFromSegments<Tail, Aggr>
  : Aggr

type Params<Id extends string> = ExtractParamsFromSegments<Split<Id, "/">>

type ParamsKeys<Id extends string> = Params<Id>[any]

type RouteIdParams<Id extends string> = Record<
  ParamsKeys<Id> extends infer Key ? (Key extends string ? Key : never) : never,
  string | number
>

type SearchParams = {
  searchParams?: Record<string, string | number>
}

export type RouteParams<Id extends string> = Prettify<
  RouteIdParams<Id> & SearchParams
>

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
          params.searchParams as Record<string, string>
        )
        url += `?${searchParams.toString()}`
      } else {
        const param = (params as Record<string, string>)[key]!
        url = url.replace(`:${key}`, param)
      }
    }

    return url
  }

  // TODO: infer return object with autofilled params
  fn.params = function (url: string): object {
    const urlWithOrigin = new URL(url, "http://localhost").href
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
        return patternResult.pathname.groups
      }
    }

    return {}
  }

  return fn
}
