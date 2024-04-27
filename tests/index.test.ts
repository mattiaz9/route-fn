import { describe, expect, it, assertType } from "vitest"
import { createRouteFn } from "@/index"

describe("route-fn", () => {
  it("should create the route-fn function", async () => {
    const route = createRouteFn(["/"])

    expect(typeof route).toBe("function")
  })

  it("should return the correct static route", async () => {
    const route = createRouteFn(["/", "/auth/login"])

    expect(route("/")).toBe("/")
    expect(route("/auth/login")).toBe("/auth/login")
  })

  it("should return the correct dynamic route", async () => {
    const route = createRouteFn(["/user/:id"])

    expect(route("/user/:id", { id: 1 })).toBe("/user/1")
  })

  it("should return the correct route with search params", async () => {
    const route = createRouteFn(["/account", "/user/:id"])

    expect(route("/user/:id", { id: 1, searchParams: { page: 2 } })).toBe(
      "/user/1?page=2"
    )
  })

  it("should show type error when a param is missing", async () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    // @ts-expect-error
    route("/user/:id/settings/:page", { page: 2 })
  })
})

describe("route-fn.params", () => {
  it("should return the url params correctly regardless of the origin", async () => {
    const route = createRouteFn(["/user/:id/settings/:page"])

    expect(route.params("/user/1/settings/2")).toEqual({ id: "1", page: "2" })
    expect(route.params("http://example.com/user/1/settings/2")).toEqual({
      id: "1",
      page: "2",
    })
  })

  it("should avoid dynamic params conflicts", async () => {
    const route = createRouteFn(["/:tenant", "/account", "/:tenant/:project"])

    expect(route.params("/account")).toEqual({})
    expect(route.params("/myorg")).toEqual({ tenant: "myorg" })
    expect(route.params("/myorg/route-fn")).toEqual({
      tenant: "myorg",
      project: "route-fn",
    })
  })
})
