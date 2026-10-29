// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { strings } from "#shared/strings.js";
import { NotFoundPage } from "./NotFoundPage.js";

describe("NotFoundPage", () => {
  it("shows the message and a link home", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(strings.notFound.title)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: strings.notFound.home })
        .getAttribute("href"),
    ).toBe("/");
  });
});
