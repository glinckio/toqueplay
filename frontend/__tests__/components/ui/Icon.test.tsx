import React from "react";
import { render } from "@testing-library/react-native";
import { Icon, IconName } from "@/components/ui/Icon";

const ALL_ICONS: IconName[] = [
  "back", "chevron-right", "chevron-down", "search", "mail", "lock",
  "shield", "location", "calendar", "clock", "user", "users", "bell",
  "home", "plus", "check", "close", "download", "trash", "external",
  "eye", "eye-off", "play", "trophy", "volleyball", "edit", "settings", "filter",
];

describe("Icon", () => {
  ALL_ICONS.forEach((name) => {
    it(`renders "${name}" without crash`, () => {
      const { toJSON } = render(<Icon name={name} size={20} color="#FFF" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  it("respects size prop", () => {
    const { toJSON } = render(<Icon name="home" size={32} />);
    const tree = toJSON() as any;
    expect(tree.props.width).toBe(32);
    expect(tree.props.height).toBe(32);
  });

  it("returns null for unknown icon", () => {
    const { toJSON } = render(<Icon name={"nonexistent" as IconName} />);
    expect(toJSON()).toBeNull();
  });
});
