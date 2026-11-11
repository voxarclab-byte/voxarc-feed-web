/* Voxarc Lab accounts backend (Supabase). Fill in after creating the project (see docs/SOCIAL_SETUP.md).
   While these are placeholders the app runs the social features in on-device demo mode: nothing is sent anywhere. */
// Auth/REST use legacy anon JWT (publishable sb_ key alone is insufficient for GoTrue password grant in this client).
window.VX_SUPABASE = {
  url: 'https://kfxtsscskrocuttjsrtw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeHRzc2Nza3JvY3V0dGpzcnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MzA5MjQsImV4cCI6MjEwOTMwNjkyNH0.Mqz1wqKnr4rZW1UYxjn80FshA19XtIeT1_ta5WUgxpc',
  googleEnabled: false, // turn on after the Google OAuth client is added in Supabase (docs/SOCIAL_SETUP.md)
  nativeRedirect: 'io.voxarc.app://auth-callback',
  webRedirect: 'https://voxarclab-byte.github.io/voxarc-feed-web/preview-150/', // preview only; Google sign-in is off, email sign-in does not redirect
  deleteUrl: 'https://voxarclab-byte.github.io/voxarc-feed-web/delete-account.html',
  guidelinesUrl: 'https://voxarclab-byte.github.io/voxarc-feed-web/community-guidelines.html'
};
