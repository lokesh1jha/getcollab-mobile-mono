# Maestro Smoke Tests

These flows run end-to-end smoke tests against the GetCollab mobile app.

## One-time setup (manual)

```sh
curl -fsSL "https://get.maestro.mobile.dev" | bash
maestro --version
```

## Running locally

1. Start an iOS Simulator or Android emulator and install the app (`expo run:ios` or `expo run:android`).
2. Seed two test accounts in your backend dev DB:
   - `test+brand@getcollab.in` (brand) — password `TestPass123!`
   - `test+creator@getcollab.in` (influencer) — password `TestPass123!`
3. Run all flows:
   ```sh
   maestro test .maestro/
   ```
   or a single flow:
   ```sh
   maestro test .maestro/auth-signin.yaml
   ```

## Available flows

| Flow | What it checks |
|---|---|
| `auth-signin.yaml` | Brand can sign in and reach Dashboard |
| `auth-forgot-password.yaml` | Forgot password screen submits and shows confirmation |
| `campaign-create.yaml` | Brand can fill the campaign form and submit |
| `bid-submit.yaml` | Influencer can apply to a campaign with pitch + amount |
| `chat-send.yaml` | Sending a chat message renders it in the conversation |

## Running in CI

Maestro Cloud is the easiest path:

```sh
maestro cloud --api-key=$MAESTRO_CLOUD_API_KEY ./
```

Set `MAESTRO_CLOUD_API_KEY` as a GitHub Actions secret. See the workflow at
`.github/workflows/e2e.yml` (manual: create it if you want CI E2E runs).
