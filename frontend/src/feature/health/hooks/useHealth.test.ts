import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useHealth } from "./useHealth";

describe("useHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("starts in the 'loading' state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const { result } = renderHook(() => useHealth());
    expect(result.current.status).toBe("loading");
  });

  test("reports 'healthy' when the API returns status:healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("healthy"));
    expect(fetch).toHaveBeenCalledWith("/api/health");
  });

  test("reports 'unhealthy' when the API responds non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("unhealthy"));
  });

  test("reports 'unhealthy' on network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("unhealthy"));
  });
});
