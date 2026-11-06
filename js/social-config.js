/* Voxarc Lab accounts backend (Supabase). Fill in after creating the project (see docs/SOCIAL_SETUP.md).
   While these are placeholders the app runs the social features in on-device demo mode: nothing is sent anywhere. */
window.VX_SUPABASE = {
  url: 'https://kfxtsscskrocuttjsrtw.supabase.co',
  anonKey: 'sb_publishable_Zy6Ryx62uV7DX6NoYjLEHA_tL9dlp2-',
  googleEnabled: false, // turn on after the Google OAuth client is added in Supabase (docs/SOCIAL_SETUP.md)
  nativeRedirect: 'io.voxarc.app://auth-callback',
  webRedirect: 'https://voxarclab-byte.github.io/voxarc-feed-web/', // web app host (OAuth return only)
  deleteUrl: 'https://voxarclab-byte.github.io/voxarc-feed-web/delete-account.html',
  guidelinesUrl: 'https://voxarclab-byte.github.io/voxarc-feed-web/community-guidelines.html'
};
