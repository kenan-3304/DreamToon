# Lore

Turns dreams into comics using Supabase Edge Functions and OpenAI.

## Debug Logging

Set the `DEBUG` environment variable to `true` to see verbose logs from both the Supabase functions and the mobile app. For production deployments leave `DEBUG` unset or set it to `false`.

## Deployment

1. Create a Supabase project and copy the credentials into a `.env` file based on `.env.example`.
2. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase init` if you have not already.
3. Run `supabase db reset` to apply migrations which also create the `comics` storage bucket.
4. Deploy the edge functions with `supabase functions deploy --project-ref $SUPABASE_PROJECT_REF`.
5. Inside `mobile/`, run `npm install` and `npm run start` to launch the Expo app.

### Environment Variables

- `OPENAI_API_KEY` – API key used by the `process_dream` function to call OpenAI.
- `EXPO_PUBLIC_SUPABASE_URL` – URL of your Supabase project.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` – Anonymous public API key.
- `SUPABASE_PROJECT_REF` – Project ref (e.g. `abcd1234`). Required by edge functions.
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for server-side operations.
- `DEBUG` – Set to `true` for verbose logging.
- `CF_ACCOUNT` and `CF_IMAGES_TOKEN` – Optional Cloudflare Images credentials.
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`,
  and `FIREBASE_MEASUREMENT_ID` – Firebase configuration values used by the
  mobile app.


## License

This project is licensed under the [MIT License](LICENSE).
