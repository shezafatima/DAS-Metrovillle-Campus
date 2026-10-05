import { describe, expect, it } from "vitest";
import { describeUserChange } from "@/lib/users/change-text";

describe("describeUserChange", () => {
  it("created: role and sections", () => {
    expect(
      describeUserChange({
        type: "created",
        details: { role: "content_manager", permissions: ["news", "messages"], restored: false },
      }),
    ).toBe("Account created (Content manager: News, Messages)");
  });

  it("created with no sections, and a main admin, omit the colon list", () => {
    expect(describeUserChange({ type: "created", details: { role: "content_manager", permissions: [], restored: false } })).toBe(
      "Account created (Content manager)",
    );
    expect(describeUserChange({ type: "created", details: { role: "main_admin", permissions: [], restored: false } })).toBe(
      "Account created (Main admin)",
    );
  });

  it("created from a deleted account says restored", () => {
    expect(
      describeUserChange({ type: "created", details: { role: "content_manager", permissions: ["pages"], restored: true } }),
    ).toBe("Account restored (Content manager: Page content)");
  });

  it("role_changed shows the arrow", () => {
    expect(describeUserChange({ type: "role_changed", details: { from: "content_manager", to: "main_admin" } })).toBe(
      "Role: Content manager → Main admin",
    );
  });

  it("permissions_changed lists added and removed, and leaves out an empty side", () => {
    expect(describeUserChange({ type: "permissions_changed", details: { added: ["messages"], removed: ["news"] } })).toBe(
      "Sections: added Messages; removed News",
    );
    expect(describeUserChange({ type: "permissions_changed", details: { added: ["messages", "settings"], removed: [] } })).toBe(
      "Sections: added Messages, Settings",
    );
    expect(describeUserChange({ type: "permissions_changed", details: { added: [], removed: ["careers"] } })).toBe(
      "Sections: removed Careers (Applications)",
    );
  });

  it("the simple types have fixed sentences", () => {
    expect(describeUserChange({ type: "disabled" })).toBe("Disabled");
    expect(describeUserChange({ type: "enabled" })).toBe("Enabled");
    expect(describeUserChange({ type: "password_set" })).toBe("Password set");
    expect(describeUserChange({ type: "deleted" })).toBe("Deleted");
  });

  it("ignores unknown section keys in details instead of printing them", () => {
    expect(describeUserChange({ type: "permissions_changed", details: { added: ["news", "secret-thing"], removed: [] } })).toBe(
      "Sections: added News",
    );
  });
});
