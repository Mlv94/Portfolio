// Menu Burger Toggle
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

function setMenuOpen(open) {
    menuToggle.classList.toggle('active', open);
    nav.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
}

menuToggle.addEventListener('click', () => {
    setMenuOpen(!nav.classList.contains('active'));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('active')) {
        setMenuOpen(false);
        menuToggle.focus();
    }
});

// Fermer le menu quand on clique sur un lien
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => setMenuOpen(false));
});

// Cursor glow effect
const cursorGlow = document.querySelector('.cursor-glow');

// Uniquement sur les appareils avec une souris (inutile sur mobile / tactile)
if (cursorGlow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });
} else if (cursorGlow) {
    cursorGlow.remove();
}

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
    // "fallback" : lien affiché si le flux ne peut pas être chargé.
    const topics = {
        edr: {
            label: 'EDR / XDR',
            feed: 'https://hnrss.org/newest?q=EDR+OR+XDR+OR+CrowdStrike',
            fallback: 'https://www.bleepingcomputer.com/tag/edr/'
        },
        ransomware: {
            label: 'Rançongiciels',
            feed: 'https://hnrss.org/newest?q=ransomware',
            fallback: 'https://www.bleepingcomputer.com/tag/ransomware/'
        },
        certfr: {
            label: 'Alertes CERT-FR',
            feed: 'https://www.cert.ssi.gouv.fr/feed/',
            fallback: 'https://www.cert.ssi.gouv.fr/'
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
        const topic = topics[currentTopic];
        const link = topic && topic.fallback
            ? ` <a href="${topic.fallback}" target="_blank" rel="noopener">Consulter directement la source →</a>`
            : '';
        list.innerHTML = `<p class="veille-live-error">Le flux n'a pas pu être chargé pour le moment.${link}</p>`;
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
                <a class="veille-live-item" href="${escapeHTML(item.link)}" target="_blank" rel="noopener">
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
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
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
    loadTopic('edr');
})();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.project-card, .project-feature-card, .skill-card, .contact-card, .formation-item, .veille-category-card, .veille-article, .experience-item, .home-card, .veille-def, .veille-stake, .veille-timeline li').forEach(el => {
    if (prefersReducedMotion) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});

// En-tête compact au défilement
(function () {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    update();
    window.addEventListener('scroll', update, { passive: true });
})();

// Compétences : filtre par contexte (formation / stage / projet)
(function () {
    const grid = document.querySelector('.skills-grid');
    const buttons = document.querySelectorAll('.skill-filter');
    if (!grid || !buttons.length) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            buttons.forEach(b => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            grid.classList.toggle('is-filtered', filter !== 'all');
            grid.querySelectorAll('.skill-row').forEach(row => {
                const sources = (row.dataset.src || '').split(' ');
                row.classList.toggle('is-match', filter === 'all' || sources.includes(filter));
            });
        });
    });
})();

// Contact : copier l'adresse email
(function () {
    document.querySelectorAll('.contact-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
                btn.textContent = 'Copié ✓';
            } catch (e) {
                btn.textContent = 'Sélectionnez l\'adresse';
            }
            btn.classList.add('is-copied');
            setTimeout(() => {
                btn.textContent = 'Copier';
                btn.classList.remove('is-copied');
            }, 2000);
        });
    });
})();
