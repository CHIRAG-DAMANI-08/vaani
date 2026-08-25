import { describe, expect, it } from "vitest";
import { isAdminUser } from "./admin-access";

describe("isAdminUser", () => {
  it("only admits Clerk IDs explicitly present in the allowlist", () => {
    expect(isAdminUser("user_admin", "user_admin, user_other")).toBe(true);
    expect(isAdminUser("user_member", "user_admin, user_other")).toBe(false);
    expect(isAdminUser(null, "user_admin")).toBe(false);
    expect(isAdminUser("user_admin", undefined)).toBe(false);
  });
});
