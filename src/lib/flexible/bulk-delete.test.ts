import assert from "node:assert/strict";
import test from "node:test";
import { parseDeletionRequest } from "./bulk-delete";

const first = { id: "00000000-0000-4000-8000-000000000001", version: 1 };
const second = { id: "00000000-0000-4000-8000-000000000002", version: 3 };

test("bulk delete requires explicit confirmation and a nonempty, versioned selection", () => {
  assert.deepEqual(parseDeletionRequest(JSON.stringify([first, second]), "HAPUS"), [first, second]);
  for (const confirmation of [undefined, null, "", "hapus", "HAPUS ", "yes"]) {
    assert.throws(() => parseDeletionRequest(JSON.stringify([first]), confirmation));
  }
  for (const payload of ["not json", "null", "{}", "[]", JSON.stringify([first, first]), JSON.stringify([{ id: "invalid", version: 1 }]), JSON.stringify([{ ...first, version: 0 }]), JSON.stringify([{ ...first, version: 1.5 }]), JSON.stringify([{ ...first, version: "1" }]), JSON.stringify([{ ...first, extra: true }])]) {
    assert.throws(() => parseDeletionRequest(payload, "HAPUS"));
  }
});
