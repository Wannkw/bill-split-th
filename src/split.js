// Bill splitting logic. No DOM in here so it can be tested with node.
//
// How Thai restaurants usually charge:
//   subtotal -> + service charge (10%) -> + VAT 7% on (subtotal + service)
// Some menus say prices already include VAT, in that case vatIncluded = true and we
// don't add VAT again.
//
// Everything is calculated in satang (integers) to avoid 0.1 + 0.2 problems.

const toSatang = (baht) => Math.round(Number(baht) * 100);

/**
 * @param {object} bill
 * @param {string[]} bill.people
 * @param {{name: string, price: number, sharedBy: string[]}[]} bill.items
 * @param {number} [bill.servicePct=10]
 * @param {number} [bill.vatPct=7]
 * @param {boolean} [bill.vatIncluded=false]
 * @param {number} [bill.discount=0]  baht off the final total (e.g. a coupon)
 * @returns {{total: number, perPerson: Record<string, number>}} amounts in baht
 */
export function splitBill({
  people,
  items,
  servicePct = 10,
  vatPct = 7,
  vatIncluded = false,
  discount = 0,
}) {
  if (!people.length) return { total: 0, perPerson: {} };

  // 1) what each person ate, before SC / VAT
  const base = Object.fromEntries(people.map((p) => [p, 0]));
  for (const item of items) {
    const eaters = item.sharedBy.filter((p) => p in base);
    // nobody ticked = everyone shares it (water, rice, etc.)
    const who = eaters.length ? eaters : people;
    const parts = divideEvenly(toSatang(item.price), who.length);
    who.forEach((p, i) => (base[p] += parts[i]));
  }

  const subtotal = sum(Object.values(base));
  if (subtotal === 0) {
    return { total: 0, perPerson: Object.fromEntries(people.map((p) => [p, 0])) };
  }

  // 2) bill total the way the restaurant calculates it
  const service = Math.round((subtotal * servicePct) / 100);
  const vat = vatIncluded ? 0 : Math.round(((subtotal + service) * vatPct) / 100);
  const total = Math.max(0, subtotal + service + vat - toSatang(discount));

  // 3) share the final total in proportion to what each person ate,
  //    then fix rounding so the shares add up to exactly the total
  const shares = proportional(total, people.map((p) => base[p]));

  return {
    total: total / 100,
    perPerson: Object.fromEntries(people.map((p, i) => [p, shares[i] / 100])),
  };
}

// 100 satang / 3 people -> [34, 33, 33]
export function divideEvenly(amount, n) {
  const each = Math.floor(amount / n);
  const extra = amount - each * n;
  return Array.from({ length: n }, (_, i) => each + (i < extra ? 1 : 0));
}

// largest remainder method: split `total` by `weights` with integer results
export function proportional(total, weights) {
  const w = sum(weights);
  if (w === 0) return weights.map(() => 0);
  const exact = weights.map((x) => (total * x) / w);
  const out = exact.map(Math.floor);
  let left = total - sum(out);
  const order = exact
    .map((x, i) => [x - Math.floor(x), i])
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
