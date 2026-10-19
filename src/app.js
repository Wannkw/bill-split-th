import { splitBill } from "./split.js";
import { promptPayPayload } from "./promptpay.js";

const $ = (sel) => document.querySelector(sel);
const KEY = "bill-split-th";

const empty = () => ({
  people: [],
  items: [],
  servicePct: 10,
  vatPct: 7,
  vatIncluded: false,
  discount: 0,
  ppId: "",
});

let state = load();

function load() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return empty();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // private mode etc. -- app still works, just doesn't remember
  }
}

const baht = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---- render ---------------------------------------------------------------

function render() {
  $("#people").innerHTML = state.people
    .map((p, i) => `<li>${esc(p)}<button data-del-person="${i}" aria-label="Remove">×</button></li>`)
    .join("");

  $("#items").innerHTML = state.items
    .map(
      (it, i) => `
      <div class="item">
        <div class="item-head">
          <span>${esc(it.name)} — ${baht(it.price)}</span>
          <button class="del" data-del-item="${i}">Remove</button>
        </div>
        <div class="eaters">
          ${state.people
            .map(
              (p) => `<label><input type="checkbox" data-item="${i}" data-person="${esc(p)}"
                ${it.sharedBy.includes(p) ? "checked" : ""}> ${esc(p)}</label>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");

  $("#service").value = state.servicePct;
  $("#vat").value = state.vatPct;
  $("#vat").disabled = state.vatIncluded;
  $("#vat-included").checked = state.vatIncluded;
  $("#discount").value = state.discount;
  $("#pp-id").value = state.ppId;

  const { total, perPerson } = splitBill(state);
  $("#total").textContent = total ? `${baht(total)} THB` : "";
  $("#summary").innerHTML = Object.entries(perPerson)
    .map(
      ([p, amt]) =>
        `<tr class="clickable" data-qr="${esc(p)}"><td>${esc(p)}</td><td>${baht(amt)}</td></tr>`
    )
    .join("");

  save();
}

function showQr(person) {
  const amount = splitBill(state).perPerson[person];
  const box = $("#qr");
  try {
    const qr = qrcode(0, "M"); // global from qrcode-generator
    qr.addData(promptPayPayload(state.ppId, amount));
    qr.make();
    box.innerHTML =
      qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) +
      `<p><b>${esc(person)}</b> pays ${baht(amount)} THB</p>`;
  } catch (e) {
    box.innerHTML = `<p class="hint">${esc(e.message)}</p>`;
  }
}

// ---- events ---------------------------------------------------------------

$("#person-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#person-name").value.trim();
  if (name && !state.people.includes(name)) state.people.push(name);
  $("#person-name").value = "";
  render();
  $("#person-name").focus();
});

$("#item-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#item-name").value.trim() || "Item";
  const price = parseFloat($("#item-price").value);
  if (!(price > 0)) return $("#item-price").focus();
  state.items.push({ name, price, sharedBy: [] });
  $("#item-name").value = "";
  $("#item-price").value = "";
  render();
  $("#item-name").focus();
});

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-del-person],[data-del-item],[data-qr]");
  if (!t) return;
  if (t.dataset.delPerson !== undefined) {
    const name = state.people[t.dataset.delPerson];
    state.people.splice(t.dataset.delPerson, 1);
    state.items.forEach((it) => (it.sharedBy = it.sharedBy.filter((p) => p !== name)));
  } else if (t.dataset.delItem !== undefined) {
    state.items.splice(t.dataset.delItem, 1);
  } else if (t.dataset.qr) {
    return showQr(t.dataset.qr);
  }
  render();
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.item !== undefined) {
    const it = state.items[t.dataset.item];
    it.sharedBy = t.checked
      ? [...it.sharedBy, t.dataset.person]
      : it.sharedBy.filter((p) => p !== t.dataset.person);
  }
  if (t.id === "service") state.servicePct = Number(t.value) || 0;
  if (t.id === "vat") state.vatPct = Number(t.value) || 0;
  if (t.id === "vat-included") state.vatIncluded = t.checked;
  if (t.id === "discount") state.discount = Number(t.value) || 0;
  if (t.id === "pp-id") state.ppId = t.value.trim();
  render();
});

$("#reset").addEventListener("click", () => {
  if (confirm("Clear the whole bill?")) {
    state = empty();
    $("#qr").innerHTML = "";
    render();
  }
});

render();
