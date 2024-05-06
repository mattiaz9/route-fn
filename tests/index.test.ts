import { describe, expect, it, assertType } from "vitest"
import { createRouteFn } from "@/index"

describe("route-fn", () => {
  it("should create the route-fn function", () => {
    const route = createRouteFn(["/"])

    expect(typeof route).toBe("function")
  })

  it("should return the correct static route", () => {
    const route = createRouteFn(["/", "/auth/login"])

    expect(route("/")).toBe("/")
    expect(route("/auth/login")).toBe("/auth/login")
  })

  it("should return the correct dynamic route", () => {
    const route = createRouteFn(["/user/:id"])

    expect(route("/user/:id", { id: 1 })).toBe("/user/1")
  })

  it("should return the correct route with search params", () => {
    const route = createRouteFn(["/user/:id"])

    expect(route("/user/:id", { id: 1, searchParams: { page: 0 } })).toBe(
      "/user/1?page=0"
    )
    expect(route("/user/:id", { id: 1, searchParams: { page: 2 } })).toBe(
      "/user/1?page=2"
    )
  })

  it("should strip null or undefined search params", () => {
    const route = createRouteFn(["/user/:id"])

    expect(route("/user/:id", { id: 1, searchParams: { page: null } })).toBe(
      "/user/1"
    )
    expect(
      route("/user/:id", { id: 1, searchParams: { page: undefined } })
    ).toBe("/user/1")
  })

  it("should show type error when a param is missing", () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    // @ts-expect-error
    route("/user/:id/settings/:page", { page: 2 })
  })
})

describe("route-fn.params", () => {
  it("should return the url params correctly regardless of the origin", () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    expect(route.params("/user/1/settings/2")).toEqual({ id: "1", page: "2" })
    expect(route.params("http://example.com/user/1/settings/2")).toEqual({
      id: "1",
      page: "2",
    })
  })

  it("should avoid dynamic params conflicts", () => {
    const route = createRouteFn(["/:tenant", "/account", "/:tenant/:project"])

    expect(route.params("/account")).toEqual({})
    expect(route.params("/myorg")).toEqual({ tenant: "myorg" })
    expect(route.params("/myorg/route-fn")).toEqual({
      tenant: "myorg",
      project: "route-fn",
    })
  })
})

describe("route-fn.match", () => {
  it("should match the same url", () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    expect(
      route.test("/user/1/settings/2", "/user/:id/settings/:page")
    ).toEqual(true)
  })

  it("should match one of multiple test routes", () => {
    const route = createRouteFn([
      "/user/:id/settings/:page",
      "/user/:id/settings",
      "/user/:id",
      "/user",
    ])

    expect(route.test("/user/1", ["/user", "/user/:id"])).toEqual(true)
    expect(route.test("/user", ["/user", "/user/:id"])).toEqual(true)
  })

  it("should not match different route", () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    expect(route.test("/user", "/user/:id/settings/:page")).toEqual(false)
    expect(route.test("/user/1", "/user/:id/settings/:page")).toEqual(false)
    expect(route.test("/user/1/settings", "/user/:id/settings/:page")).toEqual(
      false
    )
    expect(
      route.test("/user/1/settings/2/posts", "/user/:id/settings/:page")
    ).toEqual(false)
  })
})
