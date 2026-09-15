// Menu Burger Toggle
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    nav.classList.toggle('active');
});

// Fermer le menu quand on clique sur un lien
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
    });
});

// Cursor glow effect
const cursorGlow = document.querySelector('.cursor-glow');

document.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
});

// Smooth scroll (uniquement pour les ancres internes à la page courante)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const href = anchor.getAttribute('href');
    if (!href || href.length < 2) return; // ignore les liens "#" vides (placeholders)

    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Protection par mot de passe des liens sensibles (CV)
// NB : ceci est une protection côté client (dissuasive), pas une vraie sécurité :
// le hash est visible dans ce fichier. Elle évite juste les clics/accès non voulus.
(function () {
    const cvLinks = document.querySelectorAll('a.cv-link');
    if (cvLinks.length === 0) return;

    // Hash SHA-256 du mot de passe. Pour changer le mot de passe :
    // ouvrez la console du navigateur et tapez :
    // crypto.subtle.digest('SHA-256', new TextEncoder().encode('votre_nouveau_mdp'))
    //   .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
    // puis collez le résultat ci-dessous.
    const CV_PASSWORD_HASH = '09df2a3ea55d906a9b0111bf58615047d58e01faa72d7bf6a3feed701a8c2772';
    const SESSION_KEY = 'cvUnlocked';

    // sessionStorage peut être bloqué (fichier ouvert en local, navigation privée...).
    // On retombe alors sur une simple variable en mémoire pour la durée de la page.
    let memoryUnlocked = false;
    function isUnlocked() {
        try {
            return sessionStorage.getItem(SESSION_KEY) === '1';
        } catch (e) {
            return memoryUnlocked;
        }
    }
    function setUnlocked() {
        memoryUnlocked = true;
        try {
            sessionStorage.setItem(SESSION_KEY, '1');
        } catch (e) {
            // Stockage indisponible : on garde uniquement le repli mémoire ci-dessus.
        }
    }

    let pendingUrl = null;

    // Construction de la modale (une seule fois, réutilisée pour tous les liens)
    const overlay = document.createElement('div');
    overlay.className = 'cv-lock-overlay';
    overlay.innerHTML = `
        <div class="cv-lock-modal" role="dialog" aria-modal="true" aria-label="Accès protégé">
            <div class="cv-lock-icon">🔒</div>
            <h3>Accès protégé</h3>
            <p>Ce document est protégé par un mot de passe.</p>
            <input type="password" class="cv-lock-input" id="cvLockInput" placeholder="Mot de passe" autocomplete="off">
            <p class="cv-lock-error" id="cvLockError">Mot de passe incorrect, réessayez.</p>
            <div class="cv-lock-actions">
                <button type="button" class="cv-lock-btn cv-lock-btn-ghost" id="cvLockCancel">Annuler</button>
                <button type="button" class="cv-lock-btn" id="cvLockSubmit">Valider</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cvLockInput');
    const errorMsg = overlay.querySelector('#cvLockError');
    const submitBtn = overlay.querySelector('#cvLockSubmit');
    const cancelBtn = overlay.querySelector('#cvLockCancel');

    function openModal(url) {
        pendingUrl = url;
        errorMsg.classList.remove('visible');
        input.value = '';
        overlay.classList.add('active');
        setTimeout(() => input.focus(), 50);
    }

    function closeModal() {
        overlay.classList.remove('active');
        pendingUrl = null;
    }

    async function sha256(text) {
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function checkPassword() {
        const hash = await sha256(input.value);
        if (hash === CV_PASSWORD_HASH) {
            setUnlocked();
            const url = pendingUrl;
            closeModal();
            if (url) window.open(url, '_blank', 'noopener');
        } else {
            errorMsg.classList.add('visible');
            input.value = '';
            input.focus();
        }
    }

    submitBtn.addEventListener('click', checkPassword);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkPassword();
        if (e.key === 'Escape') closeModal();
    });

    cvLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('href');
            if (isUnlocked()) {
                window.open(url, '_blank', 'noopener');
            } else {
                openModal(url);
            }
        });
    });
})();

// Veille technologique : actualité en direct (flux RSS par sujet)
(function () {
    const list = document.getElementById('veilleLiveList');
    if (!list) return; // Le module n'est présent que sur la page veille.html

    const cards = document.querySelectorAll('.veille-category-card');
    const subtitle = document.getElementById('veilleLiveSubtitle');
    const updatedLabel = document.getElementById('veilleLiveUpdated');
    const refreshBtn = document.getElementById('veilleLiveRefresh');

    // Un sujet = un flux RSS public associé. hnrss.org génère un flux RSS
    // à partir d'une recherche sur Hacker News, mis à jour en continu.
    const topics = {
        cybersecurite: {
            label: 'Cybersécurité',
            feed: 'https://hnrss.org/newest?q=cybersecurity'
        },
        cloud: {
            label: 'Cloud & Infrastructure',
            feed: 'https://hnrss.org/newest?q=cloud'
        },
        devops: {
            label: 'DevOps & Automatisation',
            feed: 'https://hnrss.org/newest?q=devops'
        }
    };

    const REFRESH_INTERVAL = 10 * 60 * 1000; // Actualisation automatique toutes les 10 minutes
    let currentTopic = null;
    let refreshTimer = null;

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderLoading() {
        list.innerHTML = '<p class="veille-live-loading">⏳ Chargement des dernières actualités...</p>';
    }

    function renderError() {
        list.innerHTML = '<p class="veille-live-error">Le flux n\'a pas pu être chargé pour le moment. Réessayez dans quelques instants.</p>';
    }

    function renderItems(items) {
        if (!items || items.length === 0) {
            list.innerHTML = '<p class="veille-live-empty">Aucun article trouvé pour ce sujet actuellement.</p>';
            return;
        }
        list.innerHTML = items.slice(0, 6).map(item => {
            const rawDesc = (item.description || '').replace(/<[^>]*>/g, '').trim();
            const shortDesc = rawDesc.length > 160 ? rawDesc.slice(0, 160) + '…' : rawDesc;
            return `
                <a class="veille-live-item" href="${item.link}" target="_blank" rel="noopener">
                    <span class="veille-live-item-date">📅 ${formatDate(item.pubDate)}</span>
                    <span class="veille-live-item-title">${escapeHTML(item.title)}</span>
                    ${shortDesc ? `<span class="veille-live-item-desc">${escapeHTML(shortDesc)}</span>` : ''}
                </a>
            `;
        }).join('');
    }

    function loadTopic(topicKey) {
        const topic = topics[topicKey];
        if (!topic) return;
        currentTopic = topicKey;

        cards.forEach(card => card.classList.toggle('active', card.dataset.topic === topicKey));
        if (subtitle) {
            subtitle.textContent = `Sujet suivi : ${topic.label} — actualisation automatique toutes les 10 minutes.`;
        }
        renderLoading();
        if (refreshBtn) refreshBtn.disabled = true;

        const apiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(topic.feed);

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'ok') throw new Error('Flux indisponible');
                renderItems(data.items);
                if (updatedLabel) {
                    updatedLabel.textContent = 'Dernière mise à jour : ' +
                        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                }
            })
            .catch(() => renderError())
            .finally(() => {
                if (refreshBtn) refreshBtn.disabled = false;
            });

        clearInterval(refreshTimer);
        refreshTimer = setInterval(() => loadTopic(topicKey), REFRESH_INTERVAL);
    }

    cards.forEach(card => {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => loadTopic(card.dataset.topic));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadTopic(card.dataset.topic);
            }
        });
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (currentTopic) loadTopic(currentTopic);
        });
    }

    // Sujet chargé par défaut à l'arrivée sur la page
    loadTopic('cybersecurite');
})();

document.querySelectorAll('.project-card, .skill-category, .formation-item, .veille-category-card, .veille-article, .experience-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Protection par mot de passe des liens sensibles (CV)
// NB : ceci est une protection côté client (dissuasive), pas une vraie sécurité :
// le hash est visible dans ce fichier. Elle évite juste les clics/accès non voulus.
(function () {
    const cvLinks = document.querySelectorAll('a.cv-link');
    if (cvLinks.length === 0) return;

    // Hash SHA-256 du mot de passe. Pour changer le mot de passe :
    // ouvrez la console du navigateur et tapez :
    // crypto.subtle.digest('SHA-256', new TextEncoder().encode('votre_nouveau_mdp'))
    //   .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
    // puis collez le résultat ci-dessous.
    const CV_PASSWORD_HASH = '09df2a3ea55d906a9b0111bf58615047d58e01faa72d7bf6a3feed701a8c2772';
    const SESSION_KEY = 'cvUnlocked';

    let pendingUrl = null;

    // Construction de la modale (une seule fois, réutilisée pour tous les liens)
    const overlay = document.createElement('div');
    overlay.className = 'cv-lock-overlay';
    overlay.innerHTML = `
        <div class="cv-lock-modal" role="dialog" aria-modal="true" aria-label="Accès protégé">
            <div class="cv-lock-icon">🔒</div>
            <h3>Accès protégé</h3>
            <p>Ce document est protégé par un mot de passe.</p>
            <input type="password" class="cv-lock-input" id="cvLockInput" placeholder="Mot de passe" autocomplete="off">
            <p class="cv-lock-error" id="cvLockError">Mot de passe incorrect, réessayez.</p>
            <div class="cv-lock-actions">
                <button type="button" class="cv-lock-btn cv-lock-btn-ghost" id="cvLockCancel">Annuler</button>
                <button type="button" class="cv-lock-btn" id="cvLockSubmit">Valider</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cvLockInput');
    const errorMsg = overlay.querySelector('#cvLockError');
    const submitBtn = overlay.querySelector('#cvLockSubmit');
    const cancelBtn = overlay.querySelector('#cvLockCancel');

    function openModal(url) {
        pendingUrl = url;
        errorMsg.classList.remove('visible');
        input.value = '';
        overlay.classList.add('active');
        setTimeout(() => input.focus(), 50);
    }

    function closeModal() {
        overlay.classList.remove('active');
        pendingUrl = null;
    }

    async function sha256(text) {
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function checkPassword() {
        const hash = await sha256(input.value);
        if (hash === CV_PASSWORD_HASH) {
            sessionStorage.setItem(SESSION_KEY, '1');
            const url = pendingUrl;
            closeModal();
            if (url) window.open(url, '_blank', 'noopener');
        } else {
            errorMsg.classList.add('visible');
            input.value = '';
            input.focus();
        }
    }

    submitBtn.addEventListener('click', checkPassword);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkPassword();
        if (e.key === 'Escape') closeModal();
    });

    cvLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('href');
            if (sessionStorage.getItem(SESSION_KEY) === '1') {
                window.open(url, '_blank', 'noopener');
            } else {
                openModal(url);
            }
        });
    });
})();

// Veille technologique : actualité en direct (flux RSS par sujet)
(function () {
    const list = document.getElementById('veilleLiveList');
    if (!list) return; // Le module n'est présent que sur la page veille.html

    const cards = document.querySelectorAll('.veille-category-card');
    const subtitle = document.getElementById('veilleLiveSubtitle');
    const updatedLabel = document.getElementById('veilleLiveUpdated');
    const refreshBtn = document.getElementById('veilleLiveRefresh');

    // Un sujet = un flux RSS public associé. hnrss.org génère un flux RSS
    // à partir d'une recherche sur Hacker News, mis à jour en continu.
    const topics = {
        cybersecurite: {
            label: 'Cybersécurité',
            feed: 'https://hnrss.org/newest?q=cybersecurity'
        },
        cloud: {
            label: 'Cloud & Infrastructure',
            feed: 'https://hnrss.org/newest?q=cloud'
        },
        devops: {
            label: 'DevOps & Automatisation',
            feed: 'https://hnrss.org/newest?q=devops'
        }
    };

    const REFRESH_INTERVAL = 10 * 60 * 1000; // Actualisation automatique toutes les 10 minutes
    let currentTopic = null;
    let refreshTimer = null;

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderLoading() {
        list.innerHTML = '<p class="veille-live-loading">⏳ Chargement des dernières actualités...</p>';
    }

    function renderError() {
        list.innerHTML = '<p class="veille-live-error">Le flux n\'a pas pu être chargé pour le moment. Réessayez dans quelques instants.</p>';
    }

    function renderItems(items) {
        if (!items || items.length === 0) {
            list.innerHTML = '<p class="veille-live-empty">Aucun article trouvé pour ce sujet actuellement.</p>';
            return;
        }
        list.innerHTML = items.slice(0, 6).map(item => {
            const rawDesc = (item.description || '').replace(/<[^>]*>/g, '').trim();
            const shortDesc = rawDesc.length > 160 ? rawDesc.slice(0, 160) + '…' : rawDesc;
            return `
                <a class="veille-live-item" href="${item.link}" target="_blank" rel="noopener">
                    <span class="veille-live-item-date">📅 ${formatDate(item.pubDate)}</span>
                    <span class="veille-live-item-title">${escapeHTML(item.title)}</span>
                    ${shortDesc ? `<span class="veille-live-item-desc">${escapeHTML(shortDesc)}</span>` : ''}
                </a>
            `;
        }).join('');
    }

    function loadTopic(topicKey) {
        const topic = topics[topicKey];
        if (!topic) return;
        currentTopic = topicKey;

        cards.forEach(card => card.classList.toggle('active', card.dataset.topic === topicKey));
        if (subtitle) {
            subtitle.textContent = `Sujet suivi : ${topic.label} — actualisation automatique toutes les 10 minutes.`;
        }
        renderLoading();
        if (refreshBtn) refreshBtn.disabled = true;

        const apiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(topic.feed);

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'ok') throw new Error('Flux indisponible');
                renderItems(data.items);
                if (updatedLabel) {
                    updatedLabel.textContent = 'Dernière mise à jour : ' +
                        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                }
            })
            .catch(() => renderError())
            .finally(() => {
                if (refreshBtn) refreshBtn.disabled = false;
            });

        clearInterval(refreshTimer);
        refreshTimer = setInterval(() => loadTopic(topicKey), REFRESH_INTERVAL);
    }

    cards.forEach(card => {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => loadTopic(card.dataset.topic));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadTopic(card.dataset.topic);
            }
        });
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (currentTopic) loadTopic(currentTopic);
        });
    }

    // Sujet chargé par défaut à l'arrivée sur la page
    loadTopic('cybersecurite');
})();

document.querySelectorAll('.project-card, .skill-category, .formation-item, .veille-category-card, .veille-article, .experience-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
