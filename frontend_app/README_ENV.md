Frontend environment and Stripe publishable key
=============================================

1) Local developer:
 - Copy `frontend_app/.env.example` to `frontend_app/.env` and set the real publishable key value for your machine.
 - Example:

  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...your_key_here...

 - `frontend_app/.env` is ignored by git and should never be committed. It is loaded by Vite at dev/build time.

2) CI / GitHub Actions:
 - Add a repository secret named `VITE_STRIPE_PUBLISHABLE_KEY` in the repo Settings → Secrets → Actions.
 - The workflows that build the frontend will automatically pick up this secret and inject it into the build environment.

3) Security notes:
 - Only the publishable key (starts with `pk_`) may be safely exposed to client code. Never add secret keys (starts with `sk_`) to the frontend.
 - Rotating keys: after updating the key in the repo secrets, redeploy any CI artifacts that embed the value.
