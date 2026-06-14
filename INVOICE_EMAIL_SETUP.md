# 📧 Send Invoice by Email — Setup Guide

This feature lets you email the invoice PDF straight to the client from a
valuation report, using your Microsoft 365 account. You can also edit the
email's wording, logo, signature, and "From" address from a settings page.

Follow the steps below once to switch it on.

---

## ✅ What you get

- A **Send Invoice** button on the valuation report page (in the *Invoice* menu).
- A **Settings → Email Templates** page where you can:
  - Edit the email subject and body (rich text or raw HTML).
  - Add a logo and signature.
  - Choose the **From** address (auto-suggests people in your organisation).

---

## 1. Set up Microsoft (one time)

You need a **Microsoft Entra (Azure AD) app registration**. If you already use
the OneDrive photo upload, you can reuse that same app — just add the two
permissions below.

1. Go to the [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**.
2. Open your app (or create a new one).
3. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**, and add:

   | Permission       | Why it's needed                                  |
   | ---------------- | ------------------------------------------------ |
   | `Mail.Send`      | To send the invoice email                        |
   | `User.Read.All`  | To suggest people for the **From** dropdown       |

4. Click **Grant admin consent** (a global admin must do this). Both rows should show a green tick. ✔️
5. Note down these three values (from **Overview** + **Certificates & secrets**):
   - **Directory (tenant) ID**
   - **Application (client) ID**
   - A **client secret** value

> 💡 The client secret is shown only once — copy it immediately.

---

## 2. Add the settings to the backend

Open the backend environment file (`backend/.env`) and add these lines:

```bash
# Microsoft email settings
MS_GRAPH_TENANT_ID=your-directory-tenant-id
MS_GRAPH_CLIENT_ID=your-application-client-id
MS_GRAPH_CLIENT_SECRET=your-client-secret
MS_GRAPH_SENDER_EMAIL=accounts@yourdomain.com
```

What they mean:

| Setting                  | What to put                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `MS_GRAPH_TENANT_ID`     | Directory (tenant) ID from step 1                                |
| `MS_GRAPH_CLIENT_ID`     | Application (client) ID from step 1                              |
| `MS_GRAPH_CLIENT_SECRET` | The client secret from step 1                                   |
| `MS_GRAPH_SENDER_EMAIL`  | The **default** mailbox emails are sent from (must be a real mailbox in your tenant) |

> 📝 The company name and signature shown *inside* the email are part of the
> editable template — set them on the **Settings → Email Templates** page, not here.

> ♻️ Already using OneDrive upload? You can skip the first three lines —
> the app automatically falls back to your existing
> `TENANT_ID`, `CLIENT_ID`, and `CLIENT_SECRET`. You only need to add
> `MS_GRAPH_SENDER_EMAIL`.

---

## 3. Restart the backend

The new settings are only read when the server starts.

```bash
cd backend
# stop the running server, then start it again, e.g.:
python run.py
```

That's it — the feature is now live. 🎉

---

## 4. How to use it

### Edit the email template
1. Open the app and go to **Valuation Reports**.
2. Click your **user icon** (top right) → **Email Templates**.
3. Set the **From** address, **Subject**, and **Body**.
   - Use the toolbar to format text, insert a **logo** or **signature**.
   - Click a **variable** chip (e.g. *Client name*) to drop it into the body —
     it gets filled in automatically when the email is sent.
4. Click **Preview** to see how it looks, then **Save Template**.

### Send an invoice
1. Open a valuation report.
2. Make sure the client has an **email** (Property Address section) and a
   **Report Fee** (Financial & Referral section).
3. Click **Invoice** → **Send Invoice** → confirm. ✅

---

## 🛟 Troubleshooting

| Problem | Likely cause / fix |
| ------- | ------------------ |
| "Failed to send invoice email" | Check the three `MS_GRAPH_*` values and that **admin consent** was granted for `Mail.Send`. |
| The **From** dropdown shows a warning / no people | `User.Read.All` permission is missing or not consented. You can still type an address by hand. |
| "No client email address found" | Add the client's email in the report's **Property Address** section. |
| "Please enter a Report Fee…" | Add the fee in the **Financial & Referral Details** section. |
| Nothing changed after editing `.env` | Restart the backend (step 3). |

---

## 🔒 Good to know

- By default Microsoft lets the app send from **any** mailbox in your tenant.
  To limit which mailboxes can be used as the **From**, ask your IT admin to set
  up an [application access policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access) in Microsoft 365.
- The email template (subject, body, and From) is shared across the whole app —
  there is currently one invoice template.
