import { vi } from "vitest";
import type { Ports } from "./ports.js";

export const TOKEN = "3f1c2b4e-5a6d-4e8f-9a0b-1c2d3e4f5a6b";
export const INVITER_ID = "7d2b8a10-1c3e-4f5a-8b6c-9d0e1f2a3b4c";
export const USER_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
export const ADMIN_ID = "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f";

/** Fully mocked ports with happy-path defaults. Override per test. */
export function fakePorts(): {
  [G in keyof Ports]: { [K in keyof Ports[G]]: ReturnType<typeof vi.fn> };
} {
  return {
    links: {
      claim: vi
        .fn()
        .mockResolvedValue({ createdBy: INVITER_ID, targetUserId: null }),
      release: vi.fn().mockResolvedValue(undefined),
      markUsed: vi.fn().mockResolvedValue(undefined),
      inviteInfo: vi.fn().mockResolvedValue({ inviterNick: "Gogi" }),
    },
    profiles: {
      getById: vi.fn().mockResolvedValue({
        id: ADMIN_ID,
        nick: "boss",
        is_admin: true,
        disabled: false,
      }),
      nickExists: vi.fn().mockResolvedValue(false),
      setDisabled: vi.fn().mockResolvedValue(undefined),
    },
    auth: {
      createUser: vi.fn().mockResolvedValue({ ok: true, userId: USER_ID }),
      updatePassword: vi.fn().mockResolvedValue(undefined),
      verifyJwt: vi.fn().mockResolvedValue(ADMIN_ID),
      deleteUser: vi.fn().mockResolvedValue(undefined),
      setBanned: vi.fn().mockResolvedValue(undefined),
      revokeSessions: vi.fn().mockResolvedValue(undefined),
    },
    resetRequests: { create: vi.fn().mockResolvedValue("ok") },
    health: { ping: vi.fn().mockResolvedValue(undefined) },
  };
}

export type FakePorts = ReturnType<typeof fakePorts>;

/** Fakes are structurally compatible with Ports. */
export function asPorts(fake: FakePorts): Ports {
  return fake as unknown as Ports;
}
