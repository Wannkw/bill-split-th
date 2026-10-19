import { test } from "node:test";
import assert from "node:assert/strict";
import { splitBill, divideEvenly, proportional } from "../src/split.js";
import { promptPayPayload, crc16 } from "../src/promptpay.js";

test("divideEvenly gives leftover satang to the first people", () => {
  assert.deepEqual(divideEvenly(100, 3), [34, 33, 33]);
  assert.deepEqual(divideEvenly(90, 3), [30, 30, 30]);
});

test("proportional always adds up to the total", () => {
  const out = proportional(1001, [1, 1, 1]);
  assert.equal(out.reduce((a, b) => a + b), 1001);
});

test("service charge then VAT on top (1000 -> 1177)", () => {
  const r = splitBill({
    people: ["A", "B"],
    items: [{ name: "mookata", price: 1000, sharedBy: [] }],
  });
  // 1000 + 100 SC = 1100, + 7% = 1177
  assert.equal(r.total, 1177);
  assert.equal(r.perPerson.A, 588.5);
  assert.equal(r.perPerson.B, 588.5);
});

test("VAT already included -> only service charge", () => {
  const r = splitBill({
    people: ["A"],
    items: [{ name: "x", price: 200, sharedBy: ["A"] }],
    vatIncluded: true,
  });
  assert.equal(r.total, 220);
});

test("people only pay for what they ate", () => {
  const r = splitBill({
    people: ["Mint", "Beam", "Ton"],
    items: [
      { name: "fried rice", price: 100, sharedBy: ["Mint"] },
      { name: "beer", price: 300, sharedBy: ["Beam", "Ton"] },
      { name: "ice", price: 30, sharedBy: [] }, // everyone
    ],
    servicePct: 0,
    vatPct: 0,
  });
  assert.deepEqual(r.perPerson, { Mint: 110, Beam: 160, Ton: 160 });
});

test("shares always add up to the bill, even with ugly numbers", () => {
  const r = splitBill({
    people: ["A", "B", "C"],
    items: [{ name: "x", price: 99.99, sharedBy: [] }],
    discount: 0.5,
  });
  const sum = Object.values(r.perPerson).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(sum * 100), Math.round(r.total * 100));
});

test("crc16 matches the known check value", () => {
  // standard check value for CRC-16/CCITT-FALSE
  assert.equal(crc16("123456789"), "29B1");
});

test("promptpay payload for a phone number", () => {
  const p = promptPayPayload("081-234-5678", 120);
  assert.match(p, /^000201010212/);
  assert.ok(p.includes("01130066812345678"));
  assert.ok(p.includes("5406120.00"));
  assert.match(p, /6304[0-9A-F]{4}$/);
});

test("promptpay rejects bad input", () => {
  assert.throws(() => promptPayPayload("12345"));
});
