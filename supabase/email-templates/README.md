# Klientic — custom auth email templates

Replace Supabase's default ("powered by Supabase") emails with these branded ones.

## How to install (2 minutes)

1. Open **Supabase → Authentication → Email Templates**.
2. For each template below, pick it from the dropdown, paste the matching HTML into the
   **Message body (HTML)** box, and click **Save**.

| Supabase template | File | Suggested subject |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | `Confirm your Klientic account` |
| Reset password | `reset-password.html` | `Reset your Klientic password` |
| Magic Link | `magic-link.html` | `Your Klientic sign-in link` |

The templates use Supabase's `{{ .ConfirmationURL }}` variable for the action link, so they work
as-is with confirmation, recovery and magic-link flows.

## Tips

- Want signups to work **without** email confirmation? Turn off **Confirm email** under
  Authentication → Providers → Email (users are signed in instantly).
- For best deliverability and to send from `@klientic.com`, add a **custom SMTP** provider
  (e.g. Resend) under Authentication → Emails → SMTP Settings.
- Set **Site URL** = `https://klientic.com` and add `https://klientic.com/**` to Redirect URLs
  so confirmation, magic-link and password-reset links land on the live site.
