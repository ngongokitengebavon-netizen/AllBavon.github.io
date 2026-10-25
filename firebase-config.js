(function (global) {
    const config = global.__ALLBAVON_CONFIG__ || {};
    const firebaseConfig = {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    };

    const firebaseSettings = config.firebase || {};
    Object.assign(firebaseConfig, {
        apiKey: String(firebaseSettings.apiKey || "").trim(),
        authDomain: String(firebaseSettings.authDomain || "").trim(),
        projectId: String(firebaseSettings.projectId || "").trim(),
        storageBucket: String(firebaseSettings.storageBucket || "").trim(),
        messagingSenderId: String(firebaseSettings.messagingSenderId || "").trim(),
        appId: String(firebaseSettings.appId || "").trim()
    });

    const formspreeEndpoint = String((config.formspree && config.formspree.endpoint) || "").trim();
    const supabaseSettings = config.supabase || {};
    const SUPABASE_URL = String(supabaseSettings.url || "").trim();
    const SUPABASE_ANON_KEY = String(supabaseSettings.anonKey || "").trim();
    const SUPABASE_BUCKET = String(supabaseSettings.bucket || "courses").trim();
    const ACCESS_CONFIG = config.access || {};
    const ADMIN_CODE = String(ACCESS_CONFIG.adminCode || "").trim();
    const USER_CODE = String(ACCESS_CONFIG.userCode || "").trim();
    const DEFAULT_ADMIN_EMAIL = String(ACCESS_CONFIG.adminEmail || "").trim();

    global.firebaseConfig = firebaseConfig;
    global.FORMSPREE_ENDPOINT = formspreeEndpoint;
    global.SUPABASE_URL = SUPABASE_URL;
    global.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    global.SUPABASE_BUCKET = SUPABASE_BUCKET;
    global.ADMIN_CODE = ADMIN_CODE;
    global.USER_CODE = USER_CODE;
    global.DEFAULT_ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            firebaseConfig,
            FORMSPREE_ENDPOINT: formspreeEndpoint,
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            SUPABASE_BUCKET,
            ADMIN_CODE,
            USER_CODE,
            DEFAULT_ADMIN_EMAIL
        };
    }
})(typeof window !== "undefined" ? window : globalThis);
