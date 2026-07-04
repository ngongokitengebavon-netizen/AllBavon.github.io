// ============================================================
// CONFIGURATION
// ============================================================
const USER_CODE = "2661960";
const ADMIN_CODE = "ba167144";
const DEFAULT_ADMIN_EMAIL = "ngongokitengebavon@gmail.com";

// Vérifier si Firebase est configuré
const firebaseIsConfigured = () => {
    return typeof firebaseConfig !== "undefined" && 
           firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "VOTRE_API_KEY_ICI";
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
    SUPABASE_URL && SUPABASE_ANON_KEY &&
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
    if (!localStorage.getItem("allbavon_admin_email")) {
        localStorage.setItem("allbavon_admin_email", DEFAULT_ADMIN_EMAIL);
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
    // Si Firebase est configuré, écouter les changements d'authentification
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
        // Mode local sans Firebase
        const role = localStorage.getItem("allbavon_role");
        const user = JSON.parse(localStorage.getItem("allbavon_user"));
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
    
    // Charger les données dynamiques
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
            if (!/^\d*$/.test(value)) {
                e.target.value = "";
                return;
            }
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
            const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, codeInputs.length);
            pastedData.split("").forEach((digit, i) => {
                if (codeInputs[i]) codeInputs[i].value = digit;
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
    if (enteredCode.length !== 8) {
        shakeInputs();
        return;
    }
    
    if (enteredCode === ADMIN_CODE) {
        codeError.classList.remove("show");
        highlightSuccess();
        setTimeout(() => {
            localStorage.setItem("allbavon_role", "admin");
            showAdmin();
            resetCodeInputs();
        }, 600);
    } else if (enteredCode === USER_CODE) {
        codeError.classList.remove("show");
        highlightSuccess();
        setTimeout(() => {
            openSignupModal();
        }, 600);
    } else {
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
        const name = formData.get("name");
        const email = formData.get("email");
        const reason = formData.get("reason");
        const source = formData.get("source");
        const faculty = formData.get("faculty");
        
        // Stocker localement pour l'admin (même si Formspree n'est pas configuré)
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
        
        // Envoyer via Formspree si configuré
        if (formspreeIsConfigured()) {
            fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json"
                }
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
                // Même en cas d'erreur, on confirme car les données sont locales
                showRequestSuccess();
            });
        } else {
            // Mode démo : simuler l'envoi
            console.log("Formspree non configuré. Données stockées localement.", request);
            
            // Ouvrir le client mail avec un brouillon
            const adminEmail = localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL;
            const subject = encodeURIComponent(`Demande d'accès AllBavon - ${name}`);
            const body = encodeURIComponent(
                `Nouvelle demande d'accès AllBavon\n\n` +
                `Nom: ${name}\n` +
                `Email: ${email}\n` +
                `Faculté: ${faculty || "Non spécifiée"}\n\n` +
                `Raison: ${reason}\n\n` +
                `Source: ${source}\n\n` +
                `Code d'accès utilisateur à envoyer: ${USER_CODE}`
            );
            window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
            
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
        
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const faculty = document.getElementById("signup-faculty").value;
        
        if (firebaseInitialized && auth) {
            // Créer le compte avec Firebase Auth
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    
                    // Mettre à jour le nom d'affichage
                    return user.updateProfile({ displayName: name }).then(() => {
                        // Sauvegarder dans Firestore
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
            // Mode local sans Firebase
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
    const title = document.getElementById("topic-title").value.trim();
    const category = document.getElementById("topic-category").value;
    const content = document.getElementById("topic-content").value.trim();
    
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
        // Mode local
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

function loadTopics(category = "all") {
    const topicsList = document.getElementById("topics-list");
    if (!topicsList) return;
    
    if (firebaseInitialized && db) {
        let query = db.collection("topics").orderBy("createdAt", "desc");
        
        query.get().then((snapshot) => {
            let topics = [];
            snapshot.forEach((doc) => {
                topics.push({ id: doc.id, ...doc.data() });
            });
            
            if (category !== "all") {
                topics = topics.filter(t => t.category === category);
            }
            
            renderTopics(topics);
        }).catch((e) => {
            console.error("Erreur chargement topics:", e);
            topicsList.innerHTML = '<p class="empty-state">Erreur de connexion. Vérifiez la configuration Firebase.</p>';
        });
    } else {
        // Mode local
        let topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
        if (category !== "all") {
            topics = topics.filter(t => t.category === category);
        }
        renderTopics(topics);
    }
}

function renderTopics(topics) {
    const topicsList = document.getElementById("topics-list");
    if (!topicsList) return;
    
    if (topics.length === 0) {
        topicsList.innerHTML = '<p class="empty-state">Aucun sujet dans cette catégorie. Soyez le premier !</p>';
        return;
    }
    
    topicsList.innerHTML = topics.map(topic => `
        <div class="topic-item" onclick="openTopic('${topic.id}')">
            <div class="topic-item-header">
                <div>
                    <span class="topic-category-badge">${getCategoryLabel(topic.category)}</span>
                    <h4>${escapeHtml(topic.title)}</h4>
                </div>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 12px; line-height: 1.5;">
                ${escapeHtml(topic.content.substring(0, 120))}${topic.content.length > 120 ? '...' : ''}
            </p>
            <div class="topic-meta">
                <span>Par ${escapeHtml(topic.author || "Anonyme")}</span>
                <span>${topic.createdAt ? formatDate(topic.createdAt) : "À l'instant"}</span>
                <span>${topic.replyCount || 0} réponse(s)</span>
            </div>
        </div>
    `).join("");
}

function openTopic(topicId) {
    currentTopicId = topicId;
    
    if (firebaseInitialized && db) {
        db.collection("topics").doc(topicId).get().then((doc) => {
            if (doc.exists) {
                const topic = { id: doc.id, ...doc.data() };
                renderTopicDetail(topic);
                loadReplies(topicId);
            }
        }).catch((e) => console.error("Erreur chargement sujet:", e));
    } else {
        const topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
        const topic = topics.find(t => String(t.id) === String(topicId));
        if (topic) {
            renderTopicDetail(topic);
            loadRepliesLocal(topicId);
        }
    }
}

function renderTopicDetail(topic) {
    document.getElementById("topics-list").style.display = "none";
    document.getElementById("new-topic-form").style.display = "none";
    const detail = document.getElementById("topic-detail");
    detail.style.display = "block";
    
    document.getElementById("topic-detail-content").innerHTML = `
        <div class="topic-detail-header">
            <span class="topic-category-badge">${getCategoryLabel(topic.category)}</span>
            <h3>${escapeHtml(topic.title)}</h3>
            <div class="topic-meta" style="margin-top: 12px;">
                <span>Par ${escapeHtml(topic.author || "Anonyme")}</span>
                <span>${topic.createdAt ? formatDate(topic.createdAt) : "À l'instant"}</span>
            </div>
        </div>
        <div class="topic-body">
            ${escapeHtml(topic.content).replace(/\n/g, '<br>')}
        </div>
    `;
}

function loadReplies(topicId) {
    if (!db) return;
    
    db.collection("topics").doc(topicId).collection("replies")
        .orderBy("createdAt", "asc")
        .get()
        .then((snapshot) => {
            let replies = [];
            snapshot.forEach((doc) => {
                replies.push({ id: doc.id, ...doc.data() });
            });
            renderReplies(replies);
        }).catch((e) => console.error("Erreur chargement réponses:", e));
}

function loadRepliesLocal(topicId) {
    const allReplies = JSON.parse(localStorage.getItem("allbavon_replies") || "{}");
    const replies = allReplies[topicId] || [];
    renderReplies(replies);
}

function renderReplies(replies) {
    const list = document.getElementById("replies-list");
    if (!list) return;
    
    if (replies.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucune réponse pour le moment. Soyez le premier !</p>';
        return;
    }
    
    list.innerHTML = replies.map(reply => `
        <div class="reply-item">
            <div class="reply-header">
                <span class="reply-author">${escapeHtml(reply.author || "Anonyme")}</span>
                <span>${reply.createdAt ? formatDate(reply.createdAt) : "À l'instant"}</span>
            </div>
            <div class="reply-body">
                ${escapeHtml(reply.content).replace(/\n/g, '<br>')}
            </div>
        </div>
    `).join("");
}

function submitReply() {
    const content = document.getElementById("reply-content").value.trim();
    if (!content) {
        alert("Veuillez écrire une réponse.");
        return;
    }
    if (!currentTopicId) return;
    
    const author = getCurrentUserName();
    const authorEmail = getCurrentUserEmail();
    
    if (firebaseInitialized && db) {
        db.collection("topics").doc(currentTopicId).collection("replies").add({
            content,
            author,
            authorEmail,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            // Incrémenter le compteur de réponses
            return db.collection("topics").doc(currentTopicId).update({
                replyCount: firebase.firestore.FieldValue.increment(1)
            });
        }).then(() => {
            document.getElementById("reply-content").value = "";
            loadReplies(currentTopicId);
        }).catch((e) => {
            console.error("Erreur envoi réponse:", e);
            alert("Erreur lors de l'envoi de la réponse.");
        });
    } else {
        // Mode local
        const allReplies = JSON.parse(localStorage.getItem("allbavon_replies") || "{}");
        if (!allReplies[currentTopicId]) allReplies[currentTopicId] = [];
        allReplies[currentTopicId].push({
            content,
            author,
            authorEmail,
            createdAt: new Date().toLocaleString("fr-FR")
        });
        localStorage.setItem("allbavon_replies", JSON.stringify(allReplies));
        
        const topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
        const topic = topics.find(t => String(t.id) === String(currentTopicId));
        if (topic) {
            topic.replyCount = (topic.replyCount || 0) + 1;
            localStorage.setItem("allbavon_topics", JSON.stringify(topics));
        }
        
        document.getElementById("reply-content").value = "";
        loadRepliesLocal(currentTopicId);
    }
}

function getCategoryLabel(category) {
    const labels = {
        questions: "Questions",
        cours: "Cours",
        examens: "Examens",
        nouvelles: "Nouvelles",
        divers: "Divers"
    };
    return labels[category] || category;
}

// ============================================================
// ESPACE COURS (FIRESTORE + STORAGE)
// ============================================================
function initCourses() {
    const uploadBtn = document.getElementById("upload-course-btn");
    const cancelBtn = document.getElementById("cancel-course");
    const submitBtn = document.getElementById("submit-course");
    const searchInput = document.getElementById("courses-search");
    
    if (!uploadBtn) return;
    
    uploadBtn.addEventListener("click", () => {
        document.getElementById("upload-course-form").style.display = "block";
    });
    
    cancelBtn.addEventListener("click", () => {
        document.getElementById("upload-course-form").style.display = "none";
    });
    
    submitBtn.addEventListener("click", uploadCourse);
    
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            loadCourses(e.target.value);
        });
    }
}

function uploadCourse() {
    const title = document.getElementById("course-title").value.trim();
    const description = document.getElementById("course-description").value.trim();
    const subject = document.getElementById("course-subject").value.trim();
    const fileInput = document.getElementById("course-file");
    const file = fileInput.files[0];
    
    if (!title || !subject) {
        alert("Veuillez remplir le titre et la matière.");
        return;
    }
    
    const author = getCurrentUserName();
    
    if (supabaseConfigured && supabaseClient && db) {
        if (!file) {
            // Cours sans fichier
            saveCourseToFirestore({ title, description, subject, author, fileUrl: null, fileName: null });
            return;
        }
        
        // Upload du fichier avec Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const progressBar = document.getElementById("upload-progress");
        const progressFill = document.getElementById("progress-fill");
        const uploadStatus = document.getElementById("upload-status");
        
        progressBar.style.display = "block";
        progressFill.style.width = "0%";
        uploadStatus.textContent = "Envoi en cours... 0%";
        
        supabaseClient.storage
            .from(SUPABASE_BUCKET)
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false
            })
            .then((result) => {
                if (result.error) {
                    throw result.error;
                }
                
                // Récupérer l'URL publique du fichier
                const { data: urlData } = supabaseClient.storage
                    .from(SUPABASE_BUCKET)
                    .getPublicUrl(fileName);
                
                const downloadURL = urlData.publicUrl;
                
                saveCourseToFirestore({
                    title,
                    description,
                    subject,
                    author,
                    fileUrl: downloadURL,
                    fileName: file.name
                });
                
                progressBar.style.display = "none";
                progressFill.style.width = "0%";
            })
            .catch((error) => {
                console.error("Erreur upload Supabase:", error);
                alert("Erreur lors du téléchargement du fichier : " + (error.message || "Erreur inconnue"));
                progressBar.style.display = "none";
                progressFill.style.width = "0%";
                uploadStatus.textContent = "Erreur lors de l'envoi.";
            });
    } else if (db) {
        // Firebase Firestore disponible mais pas Supabase : cours sans upload de fichier
        saveCourseToFirestore({ title, description, subject, author, fileUrl: null, fileName: file ? file.name : null });
        alert("Supabase n'est pas configuré. Le cours est enregistré sans fichier.");
    } else {
        // Mode local
        const courses = JSON.parse(localStorage.getItem("allbavon_courses") || "[]");
        courses.unshift({
            id: Date.now(),
            title,
            description,
            subject,
            author,
            fileName: file ? file.name : null,
            fileUrl: null,
            createdAt: new Date().toLocaleString("fr-FR")
        });
        localStorage.setItem("allbavon_courses", JSON.stringify(courses));
        
        resetCourseForm();
        loadCourses();
    }
}

function saveCourseToFirestore(courseData) {
    db.collection("courses").add({
        ...courseData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        resetCourseForm();
        loadCourses();
    }).catch((e) => {
        console.error("Erreur sauvegarde cours:", e);
        alert("Erreur lors de la publication du cours.");
    });
}

function resetCourseForm() {
    document.getElementById("course-title").value = "";
    document.getElementById("course-description").value = "";
    document.getElementById("course-subject").value = "";
    document.getElementById("course-file").value = "";
    document.getElementById("upload-course-form").style.display = "none";
}

function loadCourses(search = "") {
    const coursesList = document.getElementById("courses-list");
    if (!coursesList) return;
    
    if (firebaseInitialized && db) {
        db.collection("courses").orderBy("createdAt", "desc").get()
            .then((snapshot) => {
                let courses = [];
                snapshot.forEach((doc) => {
                    courses.push({ id: doc.id, ...doc.data() });
                });
                if (search) {
                    courses = courses.filter(c => 
                        c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.subject.toLowerCase().includes(search.toLowerCase())
                    );
                }
                renderCourses(courses);
            }).catch((e) => {
                console.error("Erreur chargement cours:", e);
                coursesList.innerHTML = '<p class="empty-state">Erreur de connexion. Vérifiez la configuration Firebase.</p>';
            });
    } else {
        let courses = JSON.parse(localStorage.getItem("allbavon_courses") || "[]");
        if (search) {
            courses = courses.filter(c => 
                c.title.toLowerCase().includes(search.toLowerCase()) ||
                c.subject.toLowerCase().includes(search.toLowerCase())
            );
        }
        renderCourses(courses);
    }
}

function renderCourses(courses) {
    const coursesList = document.getElementById("courses-list");
    if (!coursesList) return;
    
    if (courses.length === 0) {
        coursesList.innerHTML = '<p class="empty-state">Aucun cours disponible. Soyez le premier à partager !</p>';
        return;
    }
    
    coursesList.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-icon">📚</div>
            <h4>${escapeHtml(course.title)}</h4>
            <p>${escapeHtml(course.description || "Pas de description")}</p>
            <div class="course-meta">
                <span>${escapeHtml(course.subject)}</span>
                <span>${course.createdAt ? formatDate(course.createdAt) : "À l'instant"}</span>
            </div>
            <div class="course-meta" style="border-top: none; padding-top: 0;">
                <span>Par ${escapeHtml(course.author || "Anonyme")}</span>
            </div>
            <div class="course-actions">
                ${course.fileUrl ? `<a href="${course.fileUrl}" target="_blank" class="btn-primary btn-small">Télécharger</a>` : ''}
                ${course.fileName && !course.fileUrl ? `<span class="btn-small" style="cursor: default; opacity: 0.7;">${escapeHtml(course.fileName)}</span>` : ''}
                <button class="btn-small" onclick="deleteCourse('${course.id}')" style="display:none;" data-admin-only>Supprimer</button>
            </div>
        </div>
    `).join("");
}

function deleteCourse(courseId) {
    // Fonction principalement utilisée par l'admin
    if (!confirm("Supprimer ce cours ?")) return;
    
    if (firebaseInitialized && db) {
        db.collection("courses").doc(courseId).delete().then(() => {
            loadCourses();
            refreshAdminDashboard();
        }).catch((e) => console.error("Erreur suppression cours:", e));
    } else {
        let courses = JSON.parse(localStorage.getItem("allbavon_courses") || "[]");
        courses = courses.filter(c => String(c.id) !== String(courseId));
        localStorage.setItem("allbavon_courses", JSON.stringify(courses));
        loadCourses();
        refreshAdminDashboard();
    }
}

// ============================================================
// UTILISATEURS
// ============================================================
function getCurrentUserName() {
    if (currentUser && currentUser.displayName) return currentUser.displayName;
    const user = JSON.parse(localStorage.getItem("allbavon_user"));
    return user ? user.name : "Étudiant";
}

function getCurrentUserEmail() {
    if (currentUser && currentUser.email) return currentUser.email;
    const user = JSON.parse(localStorage.getItem("allbavon_user"));
    return user ? user.email : "";
}

// ============================================================
// TABLEAU DE BORD ADMIN
// ============================================================
function initAdminDashboard() {
    if (!document.getElementById("admin-email-display")) return;
    
    const adminEmail = localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL;
    document.getElementById("admin-email-display").textContent = adminEmail;
    document.getElementById("admin-code-display").textContent = ADMIN_CODE;
    document.getElementById("user-code-display").textContent = USER_CODE;
}

function refreshAdminDashboard() {
    if (firebaseInitialized && db) {
        refreshAdminStatsFirebase();
        refreshAdminUsersFirebase();
        refreshAdminTopicsFirebase();
        refreshAdminCoursesFirebase();
    } else {
        refreshAdminStatsLocal();
        refreshAdminUsersLocal();
        refreshAdminTopicsLocal();
        refreshAdminCoursesLocal();
    }
}

function refreshAdminStatsFirebase() {
    db.collection("users").get().then((snapshot) => {
        document.getElementById("admin-stat-users").textContent = snapshot.size;
    });
    db.collection("topics").get().then((snapshot) => {
        document.getElementById("admin-stat-topics").textContent = snapshot.size;
    });
    db.collection("courses").get().then((snapshot) => {
        document.getElementById("admin-stat-courses").textContent = snapshot.size;
    });
    const facultiesCount = parseInt(localStorage.getItem("allbavon_faculties_count") || "0");
    document.getElementById("admin-stat-faculties").textContent = facultiesCount;
}

function refreshAdminStatsLocal() {
    const users = JSON.parse(localStorage.getItem("allbavon_users") || "[]");
    const topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
    const courses = JSON.parse(localStorage.getItem("allbavon_courses") || "[]");
    const facultiesCount = parseInt(localStorage.getItem("allbavon_faculties_count") || "0");
    
    document.getElementById("admin-stat-users").textContent = users.length;
    document.getElementById("admin-stat-topics").textContent = topics.length;
    document.getElementById("admin-stat-courses").textContent = courses.length;
    document.getElementById("admin-stat-faculties").textContent = facultiesCount;
}

function refreshAdminUsersFirebase() {
    const list = document.getElementById("admin-users-list");
    if (!list) return;
    
    db.collection("users").get().then((snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<p class="empty-state">Aucun utilisateur inscrit.</p>';
            return;
        }
        
        let users = [];
        snapshot.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
        renderAdminUsers(users, list);
    }).catch((e) => {
        list.innerHTML = '<p class="empty-state">Erreur de connexion Firebase.</p>';
    });
}

function refreshAdminUsersLocal() {
    const list = document.getElementById("admin-users-list");
    if (!list) return;
    
    const users = JSON.parse(localStorage.getItem("allbavon_users") || "[]");
    if (users.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucun utilisateur inscrit pour l\'instant.</p>';
        return;
    }
    renderAdminUsers(users, list);
}

function renderAdminUsers(users, list) {
    list.innerHTML = users.map((user, index) => `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapeHtml(user.name)}</h4>
                <p>Email: ${escapeHtml(user.email)}</p>
                <p>Faculté: ${escapeHtml(user.faculty || "Non spécifiée")} — Inscrit le ${formatDate(user.createdAt)}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn-small-danger" onclick="deleteUser(${index}, '${user.id || ''}')">Supprimer</button>
            </div>
        </div>
    `).join("");
}

function refreshAdminTopicsFirebase() {
    const list = document.getElementById("admin-topics-list");
    if (!list) return;
    
    db.collection("topics").get().then((snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<p class="empty-state">Aucun sujet dans le forum.</p>';
            return;
        }
        
        let topics = [];
        snapshot.forEach((doc) => topics.push({ id: doc.id, ...doc.data() }));
        renderAdminTopics(topics, list);
    }).catch((e) => {
        list.innerHTML = '<p class="empty-state">Erreur de connexion Firebase.</p>';
    });
}

function refreshAdminTopicsLocal() {
    const list = document.getElementById("admin-topics-list");
    if (!list) return;
    
    const topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
    if (topics.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucun sujet dans le forum.</p>';
        return;
    }
    renderAdminTopics(topics, list);
}

function renderAdminTopics(topics, list) {
    list.innerHTML = topics.map((topic) => `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapeHtml(topic.title)}</h4>
                <p>Catégorie: ${getCategoryLabel(topic.category)} — Par ${escapeHtml(topic.author || "Anonyme")}</p>
                <p>${escapeHtml(topic.content.substring(0, 100))}${topic.content.length > 100 ? '...' : ''}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn-small-danger" onclick="deleteTopic('${topic.id}')">Supprimer</button>
            </div>
        </div>
    `).join("");
}

function refreshAdminCoursesFirebase() {
    const list = document.getElementById("admin-courses-list");
    if (!list) return;
    
    db.collection("courses").get().then((snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<p class="empty-state">Aucun cours partagé.</p>';
            return;
        }
        
        let courses = [];
        snapshot.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
        renderAdminCourses(courses, list);
    }).catch((e) => {
        list.innerHTML = '<p class="empty-state">Erreur de connexion Firebase.</p>';
    });
}

function refreshAdminCoursesLocal() {
    const list = document.getElementById("admin-courses-list");
    if (!list) return;
    
    const courses = JSON.parse(localStorage.getItem("allbavon_courses") || "[]");
    if (courses.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucun cours partagé.</p>';
        return;
    }
    renderAdminCourses(courses, list);
}

function renderAdminCourses(courses, list) {
    list.innerHTML = courses.map((course) => `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapeHtml(course.title)}</h4>
                <p>Matière: ${escapeHtml(course.subject)} — Par ${escapeHtml(course.author || "Anonyme")}</p>
                <p>${escapeHtml(course.description || "Pas de description")}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn-small-danger" onclick="deleteCourse('${course.id}')">Supprimer</button>
            </div>
        </div>
    `).join("");
}

function deleteUser(index, firebaseId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    if (firebaseInitialized && firebaseId) {
        db.collection("users").doc(firebaseId).delete().then(() => {
            refreshAdminDashboard();
        }).catch((e) => console.error("Erreur suppression utilisateur:", e));
    } else {
        const users = JSON.parse(localStorage.getItem("allbavon_users") || "[]");
        users.splice(index, 1);
        localStorage.setItem("allbavon_users", JSON.stringify(users));
        refreshAdminDashboard();
    }
}

function deleteTopic(topicId) {
    if (!confirm("Supprimer ce sujet et toutes ses réponses ?")) return;
    
    if (firebaseInitialized && db) {
        db.collection("topics").doc(topicId).delete().then(() => {
            refreshAdminDashboard();
        }).catch((e) => console.error("Erreur suppression sujet:", e));
    } else {
        let topics = JSON.parse(localStorage.getItem("allbavon_topics") || "[]");
        topics = topics.filter(t => String(t.id) !== String(topicId));
        localStorage.setItem("allbavon_topics", JSON.stringify(topics));
        
        const allReplies = JSON.parse(localStorage.getItem("allbavon_replies") || "{}");
        delete allReplies[topicId];
        localStorage.setItem("allbavon_replies", JSON.stringify(allReplies));
        
        refreshAdminDashboard();
    }
}

// ============================================================
// PARAMÈTRES ADMIN
// ============================================================
function initAdminSettings() {
    const saveBtn = document.getElementById("save-admin-settings");
    if (!saveBtn) return;
    
    const adminEmail = localStorage.getItem("allbavon_admin_email") || DEFAULT_ADMIN_EMAIL;
    const coursesCount = localStorage.getItem("allbavon_courses_count") || "0";
    const facultiesCount = localStorage.getItem("allbavon_faculties_count") || "0";
    
    document.getElementById("admin-email-input").value = adminEmail;
    document.getElementById("admin-courses-count").value = coursesCount;
    document.getElementById("admin-faculties-count").value = facultiesCount;
    
    saveBtn.addEventListener("click", () => {
        const newEmail = document.getElementById("admin-email-input").value;
        const newCourses = document.getElementById("admin-courses-count").value;
        const newFaculties = document.getElementById("admin-faculties-count").value;
        
        if (newEmail && newEmail.includes("@")) {
            localStorage.setItem("allbavon_admin_email", newEmail);
        }
        localStorage.setItem("allbavon_courses_count", newCourses || "0");
        localStorage.setItem("allbavon_faculties_count", newFaculties || "0");
        
        // Mettre à jour l'affichage
        document.getElementById("admin-email-display").textContent = 
            localStorage.getItem("allbavon_admin_email");
        
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
        // Firebase Timestamp
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

// Header au scroll
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
