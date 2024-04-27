export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S]