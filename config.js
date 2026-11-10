// Crew Call settings for the live app.
// Leave both empty and Crew Call runs as a demo with sample people (nothing is saved).
// Fill them in from Supabase (the Connect button, or Settings, then API Keys) and everything is saved in the cloud.
// Step by step: docs/SETUP.md, step 7.
// Both are safe to publish: the database rules decide who can see and change what.
window.CC_CLOUD = {
  url: "",   // e.g. "https://abcdefghijkl.supabase.co"
  key: ""    // the "publishable" (or "anon public") key, starting sb_publishable_ or eyJ
};
