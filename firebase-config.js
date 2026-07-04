// ============================================================
// CONFIGURATION FIREBASE — ALLBAVON
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyCLJsMsGC6OXGUJaQN7npLNSK6VpUQ2HLg",
    authDomain: "allbavon-web.firebaseapp.com",
    projectId: "allbavon-web",
    storageBucket: "allbavon-web.firebasestorage.app",
    messagingSenderId: "414287600356",
    appId: "1:414287600356:web:7172b372a20c4603adeaf1"
};

// ============================================================
// CONFIGURATION FORMSPREE — ALLBAVON
// ============================================================

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mqevwwbv";

// ============================================================
// CONFIGURATION SUPABASE — ALLBAVON (stockage de fichiers)
// ============================================================

const SUPABASE_URL = "https://matdayziakeclbajmsme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdGRheXppYWtlY2xiYWptc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTcxNzksImV4cCI6MjA5ODczMzE3OX0.-cHZwB2apecE8qUeQuSPtyNsCHIsselOCKpZLRTSoI4";
const SUPABASE_BUCKET = "courses";

// Export des configurations (pour les utiliser dans script.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, FORMSPREE_ENDPOINT, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET };
}
