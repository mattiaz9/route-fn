type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S]

export type RouteInitOptions = {}

export type RouteInit = string | [string, RouteInitOptions]

export type IsDynamicRoute<Segments extends unknown[]> = Segments extends [
  infer Head,
  ...infer Tail
]
  ? Head extends `:${string}`
    ? true
    : IsDynamicRoute<Tail>
  : false

export type ExtractStaticRouteIds<
  T extends readonly unknown[],
  Aggr extends string[] = []
> = T extends readonly [infer Route, ...infer NextRoutes]
  ? IsDynamicRoute<Split<Route extends string ? Route : "", "/">> extends true
    ? ExtractStaticRouteIds<NextRoutes, Aggr>
    : Route extends string
    ? ExtractStaticRouteIds<NextRoutes, [...Aggr, Route]>
    : ExtractStaticRouteIds<NextRoutes, Aggr>
  : Aggr

export type ExtractDynamicRouteIds<
  T extends readonly unknown[],
  Aggr extends string[] = []
> = T extends readonly [infer Route, ...infer NextRoutes]
  ? IsDynamicRoute<Split<Route extends string ? Route : "", "/">> extends true
    ? Route extends string
      ? ExtractDynamicRouteIds<NextRoutes, [...Aggr, Route]>
      : ExtractDynamicRouteIds<NextRoutes, Aggr>
    : ExtractDynamicRouteIds<NextRoutes, Aggr>
  : Aggr

export type ExtractParamsFromSegments<T extends unknown[], Aggr extends string[] = []> = T extends [
  infer Head,
  ...infer Tail
]
  ? Head extends `:${infer P}`
    ? ExtractParamsFromSegments<Tail, [...Aggr, P]>
    : ExtractParamsFromSegments<Tail, Aggr>
  : Aggr

export type Params<Id extends string> = ExtractParamsFromSegments<Split<Id, "/">>

export type ParamsKeys<Id extends string> = Params<Id>[any]

export type RouteIdParams<Id extends string> = Record<
  ParamsKeys<Id> extends infer Key ? (Key extends string ? Key : never) : never,
  string | number
>

export type RouteOptions = {
  searchParams?: Record<string, string | number | null | undefined>
  origin?: string
  prefix?: string
}

export type RouteParams<Id extends string> = Prettify<RouteIdParams<Id> & RouteOptions>

export type AllDynamicParams<T extends readonly string[]> = T[number] extends `${infer Route}`
  ? Split<Route, "/">[number] extends infer U
    ? U extends `:${infer Param}`
      ? Param
      : never
    : never
  : never

export type DynamicParamsDictionary<T extends readonly string[]> = Prettify<{
  [K in AllDynamicParams<T>]?: string
}>
