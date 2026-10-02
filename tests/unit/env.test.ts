import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/validation/env";
import { parseServerEnv } from "@/lib/validation/server-env-schema";

describe("environment validation", () => {
  it("accepts the required public Supabase configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
    });
  });

  it("rejects a malformed Supabase URL", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
      }),
    ).toThrow();
  });

  it("defaults the canonical timezone", () => {
    expect(
      parseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
      }).APP_TIMEZONE,
    ).toBe("Asia/Ho_Chi_Minh");
  });
});
