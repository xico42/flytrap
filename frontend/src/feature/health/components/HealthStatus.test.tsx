import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { HealthStatus } from "./HealthStatus";
import * as hook from "../hooks/useHealth";

describe("<HealthStatus />", () => {
  test("shows a loading indicator while fetching", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "loading" });
    render(<HealthStatus />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("shows 'healthy' when the API is healthy", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "healthy" });
    render(<HealthStatus />);
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  test("shows 'unhealthy' when the API is not healthy", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "unhealthy" });
    render(<HealthStatus />);
    expect(screen.getByText("unhealthy")).toBeInTheDocument();
  });
});
