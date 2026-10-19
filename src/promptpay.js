// Builds the PromptPay payload string (EMVCo QR format) that Thai banking apps read.
// Spec reference: Bank of Thailand / EMVCo merchant-presented QR.

const f = (id, value) => id + String(value.length).padStart(2, "0") + value;

/**
 * @param {string} target  phone number (08xxxxxxxx) or 13-digit national ID
 * @param {number} [amount] baht, leave empty to let the payer type it
 */
export function promptPayPayload(target, amount) {
  const digits = String(target).replace(/\D/g, "");

  let account;
  if (digits.length === 13) {
    account = f("02", digits); // national ID / tax ID
  } else if (digits.length === 10 && digits.startsWith("0")) {
    // 0812345678 -> 0066812345678
    account = f("01", ("0066" + digits.slice(1)).padStart(13, "0"));
  } else {
    throw new Error("PromptPay needs a 10-digit phone number or 13-digit ID");
  }

  const hasAmount = amount && amount > 0;
  const body =
    f("00", "01") +
    f("01", hasAmount ? "12" : "11") +
    f("29", f("00", "A000000677010111") + account) +
    f("58", "TH") +
    f("53", "764") + // THB
    (hasAmount ? f("54", amount.toFixed(2)) : "") +
    "6304";

  return body + crc16(body);
}

// CRC-16/CCITT-FALSE
export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
