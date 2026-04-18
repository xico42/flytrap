import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import App from "./App";
import * as hook from "./feature/health/hooks/useHealth";

describe("<App />", () => {
  test("renders the hello-world heading and health status", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "healthy" });
    render(<App />);
    expect(screen.getByRole("heading", { name: /hello/i })).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /theme/i })).toBeInTheDocument();
  });
});
