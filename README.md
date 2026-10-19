# bill-split-th

A small web app for splitting a restaurant bill in Thailand.

The problem: after a mookata dinner with friends, someone pays the whole bill and then has to work out who owes what. Splitting evenly is unfair when one person only had a Thai tea and two others shared the beer. And most splitting apps don't handle the Thai way of charging: **10% service charge first, then 7% VAT on top of that** (so 1,000 baht on the menu becomes 1,177, not 1,170).

What it does:

- Add people and items, tick who shared each item (no tick = everyone shares it)
- Service charge + VAT calculated the way Thai restaurants actually do it, with an option for menus that already include VAT
- Each person's share is based on what they ate, so the service charge and VAT are split fairly too
- Click a name to get a **PromptPay QR** with that person's exact amount, so they can scan and pay straight away
- Saves to your browser, so refreshing the page doesn't lose the bill

No backend, no signup. Plain HTML/CSS/JS.

## A few details I cared about

- **Money is calculated in satang (integers)**, not floats. Otherwise you get things like `0.1 + 0.2 = 0.30000000000000004` and shares that are off by 1 satang.
- **The shares always add up to the exact bill total.** When 100 baht is split 3 ways someone has to pay 33.34. I use the largest remainder method so the extra satang goes to whoever had the biggest rounding loss instead of being lost.
- **The PromptPay QR is generated in the browser.** I build the EMVCo payload myself (`src/promptpay.js`) including the CRC16 checksum, and only use a library ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)) to draw the QR image.

## Run locally

ES modules need a server (opening the file directly won't work):

```bash
python -m http.server 5173
```

Then open http://localhost:5173

## Tests

```bash
npm test
```

Uses Node's built-in test runner, no dependencies. Covers the SC/VAT order, uneven splits, rounding, and the PromptPay payload/CRC.

## Project structure

```
index.html
style.css
src/
  split.js       bill math (no DOM, testable)
  promptpay.js   PromptPay payload + CRC16
  app.js         UI
tests/
  split.test.js
```

## Ideas for later

- Share the bill as a link so friends can see their own amount
- Read the receipt from a photo
