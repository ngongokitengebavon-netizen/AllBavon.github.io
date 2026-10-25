// ============================================================
// CONFIGURATION
// ============================================================
const APP_CONFIG = (typeof window !== "undefined" && window.__ALLBAVON_CONFIG__) || {};
const USER_CODE = String((APP_CONFIG.access && APP_CONFIG.access.userCode) || "").trim();
const ADMIN_CODE = String((APP_CONFIG.access && APP_CONFIG.access.adminCode) || "").trim();
const DEFAULT_ADMIN_EMAIL = String((APP_CONFIG.access && APP_CONFIG.access.adminEmail) || "").trim();

function sanitizeText(value, maxLength = 2000) {
    if (value === null || value === undefined) return "";
    const clean = String(value)
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return clean.slice(0, maxLength);
}

// Vérifier si Firebase est configuré
const firebaseIsConfigured = () => {
    return typeof firebaseConfig !== "undefined" &&
        firebaseConfig &&
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.authDomain &&
        firebaseConfig.appId &&
        !String(firebaseConfig.apiKey).toUpperCase().includes("VOTRE_");
};

// Initialisation Firebase si configuré
let auth, db;
let firebaseInitialized = false;

if (firebaseIsConfigured()) {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        firebaseInitialized = true;
    } catch (e) {
        console.error("Erreur Firebase:", e);
    }
}

// Initialisation Supabase si configuré
let supabaseClient = null;
let supabaseConfigured = false;

if (typeof SUPABASE_URL !== "undefined" &&
    typeof SUPABASE_ANON_KEY !== "undefined" &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("VOTRE") &&
    !SUPABASE_ANON_KEY.includes("VOTRE")) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseConfigured = true;
    } catch (e) {
        console.error("Erreur Supabase:", e);
    }
}

// Vérifier Formspree
const formspreeIsConfigured = () => {
    return typeof FORMSPREE_ENDPOINT !== "undefined" &&
        FORMSPREE_ENDPOINT &&
        !FORMSPREE_ENDPOINT.includes("VOTRE_FORM_ID_ICI");
};

// ============================================================
// ÉLÉMENTS DOM
// ============================================================
const accessOverlay = document.getElementById("access-overlay");
const appUser = document.getElementById("app-user");
const appAdmin = document.getElementById("app-admin");
const codeInputs = document.querySelectorAll(".code-digit");
const verifyBtn = document.getElementById("verify-code");
const codeError = document.getElementById("code-error");
const requestAccessBtn = document.getElementById("request-access-btn");
const requestModal = document.getElementById("request-modal");
const closeRequestBtn = document.getElementById("close-request");
const accessForm = document.getElementById("access-form");
const requestSuccess = document.getElementById("request-success");
const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const userNameEl = document.getElementById("user-name");
const adminNameEl = document.getElementById("admin-name");
const logoutBtnUser = document.getElementById("logout-btn-user");
const logoutBtnAdmin = document.getElementById("logout-btn-admin");

// Variables globales
let currentUser = null;
let currentTopicId = null;

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initAdminData();
    checkAuthState();
    initCodeInputs();
    initRequestForm();
    initSignupForm();
    initForum();
    initCourses();
    initAdminDashboard();
    initAdminSettings();
    initNavigation();
    initScrollAnimations();
});

// ============================================================
// DONNÉES LOCALES (ADMIN)
// ============================================================
function initAdminData() {
    if (DEFAULT_ADMIN_EMAIL && !localStorage.getItem("allbavon_admin_email")) {
        localStorage.setItem("allbavon_admin_email", DEFAULT_ADMIN_EMAIL);
    }
    if (!DEFAULT_ADMIN_EMAIL) {
        localStorage.removeItem("allbavon_admin_email");
    }
    if (!localStorage.getItem("allbavon_courses_count")) {
        localStorage.setItem("allbavon_courses_count", "0");
    }
    if (!localStorage.getItem("allbavon_faculties_count")) {
        localStorage.setItem("allbavon_faculties_count", "0");
    }
}

// ============================================================
// AUTHENTIFICATION ET ACCÈS
// ============================================================
function checkAuthState() {
    if (firebaseInitialized && auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                const role = localStorage.getItem("allbavon_role");
                if (role === "admin") {
                    showAdmin();
                } else {
                    loadUserProfile(user.uid);
                    showUser({ name: user.displayName || "Étudiant" });
                }
            } else {
                const role = localStorage.getItem("allbavon_role");
                if (role === "admin") {
                    showAdmin();
                } else {
                    showAccessOverlay();
                }
            }
        });
    } else {
        const role = localStorage.getItem("allbavon_role");
        const user = JSON.parse(localStorage.getItem("allbavon_user") || "null");
        if (role === "admin") {
            showAdmin();
        } else if (role === "user" && user) {
            showUser(user);
        } else {
            showAccessOverlay();
        }
    }
}

function loadUserProfile(uid) {
    if (!db) return;
    db.collection("users").doc(uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.name) {
                userNameEl.textContent = data.name;
            }
        }
    }).catch((e) => console.error("Erreur chargement profil:", e));
}

function showAccessOverlay() {
    accessOverlay.classList.add("active");
    appUser.classList.remove("active");
    appAdmin.classList.remove("active");
    document.body.style.overflow = "hidden";
}

function showUser(user) {
    accessOverlay.classList.remove("active");
    appUser.classList.add("active");
    appAdmin.classList.remove("active");
    if (user && user.name) {
        userNameEl.textContent = user.name;
    }
    document.body.style.overflow = "auto";
    loadTopics();
    loadCourses();
}

function showAdmin() {
    accessOverlay.classList.remove("active");
    appUser.classList.remove("active");
    appAdmin.classList.add("active");
    adminNameEl.textContent = "Administrateur";
    document.body.style.overflow = "auto";
    refreshAdminDashboard();
}

// ============================================================
// SISTÈME DE CODE D'ACCÈS
// ============================================================
function initCodeInputs() {
    codeInputs.forEach((input, index) => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });

        input.addEventListener("input", (e) => {
            const value = e.target.value;
            if (!/^[a-zA-Z0-9]*$/.test(value)) {
                e.target.value = "";
                return;
            }
            e.target.value = value.toLowerCase();
            if (value.length === 1) {
                if (index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                } else {
                    verifyCode();
                }
            }
        });

        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, codeInputs.length);
            pastedData.split("").forEach((char, i) => {
                if (codeInputs[i]) codeInputs[i].value = char;
            });
            if (pastedData.length === codeInputs.length) {
                verifyCode();
            } else if (pastedData.length > 0) {
                codeInputs[pastedData.length - 1].focus();
            }
        });
    });

    verifyBtn.addEventListener("click", verifyCode);
}

function getEnteredCode() {
    let code = "";
    codeInputs.forEach(input => code += input.value);
    return code;
}

function verifyCode() {
    const enteredCode = getEnteredCode();
    if (!ADMIN_CODE && !USER_CODE) {
        codeError.textContent = "Les codes d'accès ne sont pas configurés. Configurez app-config.js pour activer l'accès.";
        codeError.classList.add("show");
        shakeInputs();
        return;
    }
    if (enteredCode.length !== 8) {
        shakeInputs();
        return;
    }

    if (ADMIN_CODE && enteredCode === ADMIN_CODE) {
        codeError.classList.remove("show");
        highlightSuccess();
        setTimeout(() => {
            localStorage.setItem("allbavon_role", "admin");
            showAdmin();
            resetCodeInputs();
        }, 600);
    } else if (USER_CODE && enteredCode === USER_CODE) {
        codeError.classList.remove("show");
        highlightSuccess();
        setTimeout(() => {
            openSignupModal();
        }, 600);
    } else {
        codeError.textContent = "Code incorrect. Réessayez.";
        codeError.classList.add("show");
        shakeInputs();
    }
}

function resetCodeInputs() {
    codeInputs.forEach(input => {
        input.value = "";
        input.style.borderColor = "";
        input.style.boxShadow = "";
    });
    codeError.classList.remove("show");
}

function shakeInputs() {
    codeInputs.forEach(input => {
        input.style.transform = "translateX(-5px)";
        input.style.borderColor = "var(--error)";
        input.style.boxShadow = "0 0 0 3px rgba(255, 59, 48, 0.2)";
    });
    setTimeout(() => codeInputs.forEach(input => input.style.transform = "translateX(5px)"), 100);
    setTimeout(() => codeInputs.forEach(input => {
        input.style.transform = "translateX(0)";
        input.style.borderColor = "";
        input.style.boxShadow = "";
    }), 200);
}

function highlightSuccess() {
    codeInputs.forEach(input => {
        input.style.borderColor = "var(--success)";
        input.style.boxShadow = "0 0 0 3px rgba(52, 199, 89, 0.2)";
    });
}

// ============================================================
// MODAL DE DEMANDE D'ACCÈS (FORMSPREE)
// ============================================================
requestAccessBtn.addEventListener("click", openRequestModal);
closeRequestBtn.addEventListener("click", closeRequestModal);
requestModal.addEventListener("click", (e) => {
    if (e.target === requestModal) closeRequestModal();
});

function openRequestModal() {
    requestModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeRequestModal() {
    requestModal.classList.remove("active");
    document.body.style.overflow = "";
}

function initRequestForm() {
    if (!accessForm) return;

    accessForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(accessForm);
        const name = sanitizeText(formData.get("name"), 100);
        const email = sanitizeText(formData.get("email"), 120);
        const reason = sanitizeText(formData.get("reason"), 1000);
        const source = sanitizeText(formData.get("source"), 200);
        const faculty = sanitizeText(formData.get("faculty"), 200);

        const request = {
            id: Date.now(),
            name,
            email,
            reason,
            source,
            faculty,
            date: new Date().toLocaleString("fr-FR")
        };

        const requests = JSON.parse(localStorage.getItem("allbavon_requests") || "[]");
        requests.unshift(request);
        localStorage.setItem("allbavon_requests", JSON.stringify(requests));

        if (formspreeIsConfigured()) {
            fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                body: formData,
                headers: { Accept: "application/json" }
            })
            .then(response => {
                if (response.ok) {
                    showRequestSuccess();
                } else {
                    throw new Error("Erreur Formspree");
                }
            })
            .catch(error => {
                console.error("Erreur Formspree:", error);
                showRequestSuccess();
            });
        } else {
            console.log("Formspree non configuré. Données stockées localement.", request);
            const adminEmail = (localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL || "").trim();
            const subject = encodeURIComponent(`Demande d'accès AllBavon - ${name || "Nouvelle demande"}`);
            const body = encodeURIComponent(
                `Nouvelle demande d'accès AllBavon\n\n` +
                `Nom: ${name}\n` +
                `Email: ${email}\n` +
                `Faculté: ${faculty || "Non spécifiée"}\n\n` +
                `Raison: ${reason}\n\n` +
                `Source: ${source}\n\n` +
                `Code d'accès utilisateur à envoyer: ${USER_CODE || "À configurer"}`
            );

            if (adminEmail) {
                window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
            }

            showRequestSuccess();
        }
    });
}

function showRequestSuccess() {
    accessForm.style.display = "none";
    requestSuccess.classList.add("show");
    setTimeout(() => {
        accessForm.reset();
        accessForm.style.display = "block";
        requestSuccess.classList.remove("show");
        closeRequestModal();
    }, 5000);
}

// ============================================================
// MODAL DE CRÉATION DE COMPTE (FIREBASE AUTH)
// ============================================================
function openSignupModal() {
    signupModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

signupModal.addEventListener("click", (e) => {
    if (e.target === signupModal) closeSignupModal();
});

function closeSignupModal() {
    signupModal.classList.remove("active");
    document.body.style.overflow = "";
}

function initSignupForm() {
    if (!signupForm) return;

    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = sanitizeText(document.getElementById("signup-name").value, 100);
        const email = sanitizeText(document.getElementById("signup-email").value, 120);
        const faculty = sanitizeText(document.getElementById("signup-faculty").value, 200);
        const password = String(document.getElementById("signup-password").value || "");

        if (!name || !email || !faculty || password.length < 6) {
            alert("Veuillez remplir tous les champs et utiliser un mot de passe d'au moins 6 caractères.");
            return;
        }

        if (firebaseInitialized && auth) {
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: name }).then(() => {
                        return db.collection("users").doc(user.uid).set({
                            name,
                            email,
                            faculty,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            role: "user"
                        });
                    });
                })
                .then(() => {
                    localStorage.setItem("allbavon_role", "user");
                    currentUser = auth.currentUser;
                    closeSignupModal();
                    resetCodeInputs();
                    showUser({ name });
                })
                .catch((error) => {
                    alert("Erreur lors de la création du compte : " + error.message);
                });
        } else {
            const user = {
                name,
                email,
                faculty,
                createdAt: new Date().toLocaleString("fr-FR")
            };
            localStorage.setItem("allbavon_user", JSON.stringify(user));
            localStorage.setItem("allbavon_role", "user");

            const users = JSON.parse(localStorage.getItem("allbavon_users") || "[]");
            users.unshift(user);
            localStorage.setItem("allbavon_users", JSON.stringify(users));

            closeSignupModal();
            resetCodeInputs();
            showUser(user);
        }
    });
}

// ============================================================
// FORUM DE DISCUSSION (FIRESTORE)
// ============================================================
function initForum() {
    const newTopicBtn = document.getElementById("new-topic-btn");
    const cancelTopicBtn = document.getElementById("cancel-topic");
    const submitTopicBtn = document.getElementById("submit-topic");
    const backToTopicsBtn = document.getElementById("back-to-topics");
    const submitReplyBtn = document.getElementById("submit-reply");
    const categoryBtns = document.querySelectorAll(".category-btn");

    if (!newTopicBtn) return;

    let currentCategory = "all";

    newTopicBtn.addEventListener("click", () => {
        document.getElementById("new-topic-form").style.display = "block";
        document.getElementById("topics-list").style.display = "none";
    });

    cancelTopicBtn.addEventListener("click", () => {
        document.getElementById("new-topic-form").style.display = "none";
        document.getElementById("topics-list").style.display = "flex";
    });

    submitTopicBtn.addEventListener("click", () => {
        createTopic();
    });

    backToTopicsBtn.addEventListener("click", () => {
        document.getElementById("topic-detail").style.display = "none";
        document.getElementById("topics-list").style.display = "flex";
        currentTopicId = null;
        loadTopics();
    });

    submitReplyBtn.addEventListener("click", () => {
        submitReply();
    });

    categoryBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.category;
            loadTopics(currentCategory);
        });
    });
}

function createTopic() {
    const title = sanitizeText(document.getElementById("topic-title").value, 200);
    const category = sanitizeText(document.getElementById("topic-category").value, 50);
    const content = sanitizeText(document.getElementById("topic-content").value, 5000);

    if (!title || !content) {
        alert("Veuillez remplir le titre et le contenu du sujet.");
        return;
    }

    const author = getCurrentUserName();
    const authorEmail = getCurrentUserEmail();

    if (firebaseInitialized && db) {
        db.collection("topics").add({
            title,
            category,
            content,
            author,
            authorEmail,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            replyCount: 0
        }).then(() => {
            document.getElementById("topic-title").value = "";
            document.getElementById("topic-content").value = "";
            document.getElementById("new-topic-form").style.display = "none";
            document.getElementById("topics-list").style.display = "flex";
            loadTopics();
        }).catch((e) => {
            console.error("Erreur création sujet:", e);
            alert("Erreur lors de la création du sujet. Vérifiez que Firebase est configuré.");
        });
    } else {
        const topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
        topics.unshift({
            id: Date.now(),
            title,
            category,
            content,
            author,
            authorEmail,
            createdAt: new Date().toLocaleString("fr-FR"),
            replyCount: 0
        });
        localStorage.setItem("allbavon_topics", JSON.stringify(topics));

        document.getElementById("topic-title").value = "";
        document.getElementById("topic-content").value = "";
        document.getElementById("new-topic-form").style.display = "none";
        document.getElementById("topics-list").style.display = "flex";
        loadTopics();
    }
}

function initAdminDashboard() {
    if (!document.getElementById("admin-email-display")) return;

    const adminEmail = localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL || "À configurer";
    document.getElementById("admin-email-display").textContent = adminEmail;
    document.getElementById("admin-code-display").textContent = ADMIN_CODE || "À configurer";
    document.getElementById("user-code-display").textContent = USER_CODE || "À configurer";
}

function initAdminSettings() {
    const saveBtn = document.getElementById("save-admin-settings");
    if (!saveBtn) return;

    const adminEmail = localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL || "";
    const coursesCount = localStorage.getItem("allbavon_courses_count") || "0";
    const facultiesCount = localStorage.getItem("allbavon_faculties_count") || "0";

    document.getElementById("admin-email-input").value = adminEmail;
    document.getElementById("admin-courses-count").value = coursesCount;
    document.getElementById("admin-faculties-count").value = facultiesCount;

    saveBtn.addEventListener("click", () => {
        const newEmail = sanitizeText(document.getElementById("admin-email-input").value, 120);
        const newCourses = sanitizeText(document.getElementById("admin-courses-count").value, 20);
        const newFaculties = sanitizeText(document.getElementById("admin-faculties-count").value, 20);

        if (newEmail && newEmail.includes("@")) {
            localStorage.setItem("allbavon_admin_email", newEmail);
        }
        localStorage.setItem("allbavon_courses_count", newCourses || "0");
        localStorage.setItem("allbavon_faculties_count", newFaculties || "0");

        document.getElementById("admin-email-display").textContent = localStorage.getItem("allbavon_admin_email") || "À configurer";

        alert("Paramètres enregistrés !");
        refreshAdminDashboard();
    });
}

// ============================================================
// DÉCONNEXION
// ============================================================
logoutBtnUser.addEventListener("click", logout);
logoutBtnAdmin.addEventListener("click", logout);

function logout() {
    if (firebaseInitialized && auth) {
        auth.signOut().then(() => {
            clearLocalSession();
        }).catch((e) => console.error("Erreur déconnexion:", e));
    } else {
        clearLocalSession();
    }
}

function clearLocalSession() {
    localStorage.removeItem("allbavon_user");
    localStorage.removeItem("allbavon_role");
    currentUser = null;
    resetCodeInputs();
    showAccessOverlay();
}

// ============================================================
// NAVIGATION
// ============================================================
function initNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            const href = this.getAttribute("href");
            if (href === "#") return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

// ============================================================
// ANIMATIONS AU SCROLL
// ============================================================
function initScrollAnimations() {
    const revealElements = document.querySelectorAll(
        ".feature-card, .section-header, .stat-item, .community-content, .community-visual, .about-card, .admin-section, .admin-info-box, .settings-form, .forum-container, .courses-list, .course-card"
    );

    revealElements.forEach(el => el.classList.add("reveal"));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => observer.observe(el));
}

// ============================================================
// UTILITAIRES
// ============================================================
function formatDate(timestamp) {
    if (!timestamp) return "À l'instant";

    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString("fr-FR");
    }

    return timestamp;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener("scroll", () => {
    const header = document.querySelector(".main-header");
    if (header) {
        if (window.scrollY > 50) {
            header.style.background = "rgba(0, 0, 0, 0.85)";
        } else {
            header.style.background = "rgba(0, 0, 0, 0.7)";
        }
    }
});
