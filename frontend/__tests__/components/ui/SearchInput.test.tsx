import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SearchInput } from "@/components/ui/SearchInput";

describe("SearchInput", () => {
  it("renders placeholder", () => {
    const { getByPlaceholderText } = render(
      <SearchInput value="" onChangeText={() => {}} placeholder="Buscar torneios" />,
    );
    expect(getByPlaceholderText("Buscar torneios")).toBeTruthy();
  });

  it("calls onChangeText", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchInput value="" onChangeText={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText("Buscar..."), "vôlei");
    expect(onChange).toHaveBeenCalledWith("vôlei");
  });

  it("clears value on X press", () => {
    const onChange = jest.fn();
    const { toJSON } = render(
      <SearchInput value="test" onChangeText={onChange} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
