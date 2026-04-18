import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("<ThemeSwitcher />", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  test("defaults to the 'light' theme on first render", () => {
    render(<ThemeSwitcher />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("combobox")).toHaveValue("light");
  });

  test("applies a persisted theme from localStorage", () => {
    localStorage.setItem("flytrap-theme", "dracula");
    render(<ThemeSwitcher />);
    expect(document.documentElement.dataset.theme).toBe("dracula");
  });

  test("updates the data-theme attribute and localStorage on change", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.selectOptions(screen.getByRole("combobox"), "synthwave");

    expect(document.documentElement.dataset.theme).toBe("synthwave");
    expect(localStorage.getItem("flytrap-theme")).toBe("synthwave");
  });

  test("exposes every supported theme as an option", () => {
    render(<ThemeSwitcher />);
    for (const theme of ["light", "dark", "dracula", "synthwave", "cupcake"]) {
      expect(
        screen.getByRole("option", { name: theme }),
      ).toBeInTheDocument();
    }
  });
});
