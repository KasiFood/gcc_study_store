# GCC Study Hub: secure PayFast downloads

## What this package fixes

The old client-side payment modal was insecure: anyone could append `?paid=1&file=...` or use the visible `downloads/` path to unlock a paid file. This package removes that logic.

The completed flow is:

1. A buyer clicks **Buy** on `index.html` and is taken to `payment.html`.
2. `payment.html` asks the server to create a PayFast checkout for the selected product.
3. The server holds the price, creates the PayFast signature, and sends the buyer to PayFast.
4. PayFast posts an ITN notification to `/api/payfast-itn`.
5. The server validates the notification with PayFast and marks the order complete in Netlify Blobs.
6. PayFast returns the buyer to `download.html`. That page polls the server and displays a button only after the ITN is confirmed.
7. The button uses a signed link that expires after 30 minutes. Private files are never exposed as public static URLs.

## Put your files in the right folders

- Paid files: `private-downloads/`
- Free files: `free-downloads/`

The exact paid filenames are defined in `netlify/functions/products.mjs`. Keep the filenames aligned with that file. The public product pages do not contain paid file paths.

## Deploy to Netlify

Upload the contents of this folder to the root of a GitHub repository. The root must contain `index.html`, `payment.html`, `download.html`, `netlify.toml`, `private-downloads/`, and `netlify/`.

In Netlify, use these build settings:

| Setting | Value |
|---|---|
| Base directory | Empty |
| Build command | `npm install` |
| Publish directory | `.` |
| Functions directory | `netlify/functions` |

Set these Netlify environment variables. Do not put any of these values into an HTML file or commit them to GitHub.

| Variable | Value |
|---|---|
| `PAYFAST_MERCHANT_ID` | Your PayFast merchant ID |
| `PAYFAST_MERCHANT_KEY` | Your PayFast merchant key |
| `PAYFAST_PASSPHRASE` | The exact PayFast security passphrase |
| `PAYFAST_LIVE` | `false` for sandbox, `true` for live |
| `LINK_SECRET` | A long, random private string |
| `FROM_EMAIL` | Your merchant confirmation email address |

After adding variables, redeploy without cache.

## Before taking a live payment

1. Add every paid guide and bundle to `private-downloads/`.
2. Confirm the product titles, prices, and filenames in `netlify/functions/products.mjs`.
3. Use sandbox credentials with `PAYFAST_LIVE=false` first.
4. Complete a sandbox payment and verify that the button appears only after `/api/payfast-itn` records the payment.
5. Switch to live credentials and `PAYFAST_LIVE=true` only when the test works.
