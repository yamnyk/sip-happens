// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectIfAuthed } from "./RedirectIfAuthed.js";

const useSession = vi.fn();
vi.mock("./session.js", () => ({ useSession: () => useSession() }));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<p>login page</p>} />
        </Route>
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RedirectIfAuthed", () => {
  beforeEach(() => useSession.mockReset());
  afterEach(cleanup);

  it("shows the guest page when signed out", () => {
    useSession.mockReturnValue({
      session: null,
      profile: null,
      loading: false,
    });
    renderAt("/login");
    expect(screen.getByText("login page")).toBeTruthy();
  });

  it("redirects a signed-in user home", () => {
    useSession.mockReturnValue({
      session: {},
      profile: { id: "1" },
      loading: false,
    });
    renderAt("/login");
    expect(screen.getByText("home page")).toBeTruthy();
  });

  it("waits while loading", () => {
    useSession.mockReturnValue({ session: null, profile: null, loading: true });
    renderAt("/login");
    expect(screen.queryByText("login page")).toBeNull();
  });
});
