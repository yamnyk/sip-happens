// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updates: Record<string, unknown>[] = [];

vi.mock("#shared/api/supabase.js", () => {
  const chain = {
    insert: () => chain,
    select: () => chain,
    single: () => Promise.resolve({ data: { token: "tok" }, error: null }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return chain;
    },
    eq: () => chain,
    is: () => Promise.resolve({ error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { access_token: "a" } } }),
      },
    },
  };
});
vi.mock("#shared/api/callApi.js", () => ({
  callApi: () => Promise.resolve({ ok: true }),
}));

const { useAdminUserAction, useResolveReset } = await import("./queries.js");

function setup() {
  const client = new QueryClient();
  const spy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, wrapper };
}

beforeEach(() => {
  updates.length = 0;
});

describe("useResolveReset", () => {
  it("sends resolved_by but never resolved_at", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useResolveReset("admin-1"), {
      wrapper,
    });
    await act(() => result.current.mutateAsync("user-1"));
    expect(updates).toEqual([{ resolved_by: "admin-1" }]);
  });
});

describe("useAdminUserAction", () => {
  it("invalidates the lists and the own-profile key", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useAdminUserAction(), { wrapper });
    act(() => result.current.mutate({ userId: "u", action: "ban" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(["profiles"]);
    expect(keys).toContainEqual(["profile"]);
  });
});
