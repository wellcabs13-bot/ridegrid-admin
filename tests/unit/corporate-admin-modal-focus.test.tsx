import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Field, Modal } from "@/components/corporate-admin/ui";

// Regression: typing in a corporate-admin dialog used to accept one character and then lose focus.
// Parents hand Modal a fresh inline `onClose` on every render (state lives in the parent), and the
// focus effect depended on it, so each keystroke refocused the first field / the opener button.
function Host() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [open, setOpen] = useState(true);
  return (
    <>
      <button>opener</button>
      <Modal open={open} title="Edit" onClose={() => setOpen(false)}>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
      </Modal>
    </>
  );
}

describe("corporate admin Modal focus", () => {
  it("keeps focus in the field being typed in across parent re-renders", () => {
    render(<Host />);
    const city = screen.getByLabelText("City") as HTMLInputElement;
    city.focus();
    for (const text of ["P", "Pu", "Pun", "Pune"]) {
      fireEvent.change(city, { target: { value: text } });
      expect(document.activeElement).toBe(city);
    }
    expect(city.value).toBe("Pune");
  });

  it("still closes on Escape using the latest onClose", () => {
    render(<Host />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
