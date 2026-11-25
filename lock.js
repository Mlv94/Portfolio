/*
 * Déverrouillage du portfolio.
 *
 * Le contenu de chaque page est chiffré (AES-256-GCM). La clé est dérivée du
 * mot de passe avec PBKDF2-SHA256 (600 000 itérations). Sans le mot de passe,
 * le contenu est illisible, y compris en lisant le code source de la page ou
 * le dépôt GitHub.
 *
 * Pour modifier une page ou changer le mot de passe : outils/chiffrement.html
 */
(function () {
    'use strict';

    const dataEl = document.getElementById('encrypted-page');
    if (!dataEl) return;

    let payload;
    try {
        payload = JSON.parse(dataEl.textContent);
    } catch (e) {
        return;
    }

    const KEY_PREFIX = 'portfolio-key:';
    const STORAGE_KEY = KEY_PREFIX + payload.salt;

    // ---------- Utilitaires ----------
    function b64ToBytes(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    function bytesToB64(bytes) {
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }

    // L'accès au stockage peut lever une exception (navigation privée, cookies bloqués…)
    function getStore(name) {
        try {
            return window[name] || null;
        } catch (e) {
            return null;
        }
    }

    function readStoredKey() {
        for (const name of ['sessionStorage', 'localStorage']) {
            const store = getStore(name);
            try {
                const value = store && store.getItem(STORAGE_KEY);
                if (value) return value;
            } catch (e) { /* stockage indisponible */ }
        }
        return null;
    }

    function saveKey(rawB64, remember) {
        const store = getStore(remember ? 'localStorage' : 'sessionStorage');
        try {
            if (store) store.setItem(STORAGE_KEY, rawB64);
        } catch (e) { /* le mot de passe sera redemandé à chaque page */ }
    }

    function clearKeys() {
        for (const name of ['sessionStorage', 'localStorage']) {
            const store = getStore(name);
            try {
                if (!store) continue;
                Object.keys(store)
                    .filter(k => k.indexOf(KEY_PREFIX) === 0)
                    .forEach(k => store.removeItem(k));
            } catch (e) { /* rien à effacer */ }
        }
    }

    // ---------- Cryptographie ----------
    async function deriveKey(password) {
        const material = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password.normalize('NFC')),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: b64ToBytes(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            true,
            ['decrypt']
        );
    }

    function importRawKey(rawB64) {
        return crypto.subtle.importKey('raw', b64ToBytes(rawB64), { name: 'AES-GCM' }, true, ['decrypt']);
    }

    async function decryptPage(key) {
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
            key,
            b64ToBytes(payload.data)
        );
        return new TextDecoder().decode(plain);
    }

    // ---------- Affichage de la page déchiffrée ----------
    function render(html) {
        document.body.innerHTML = html;
        document.body.classList.remove('is-locked');

        // Les <script> insérés via innerHTML ne s'exécutent pas : on les recrée.
        document.body.querySelectorAll('script').forEach(old => {
            const script = document.createElement('script');
            for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
            script.async = false;
            script.textContent = old.textContent;
            old.replaceWith(script);
        });

        if (location.hash) {
            const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (target) target.scrollIntoView();
        }
    }

    // Bouton « Verrouiller » présent dans le pied de page
    document.addEventListener('click', e => {
        if (e.target.closest('[data-lock-site]')) {
            clearKeys();
            location.reload();
        }
    });

    // ---------- Écran de connexion ----------
    const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICON_EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

    function showLockScreen() {
        const screen = document.createElement('main');
        screen.className = 'lock-screen';
        screen.innerHTML = `
            <form class="lock-card" novalidate>
                <div class="lock-icon">${ICON_LOCK}</div>
                <p class="lock-kicker">Portfolio · LEGUAY Melvyn</p>
                <h1 class="lock-title">Accès <span class="accent-text">protégé</span></h1>
                <p class="lock-text">Ce portfolio est réservé aux personnes qui ont reçu le mot de passe.</p>
                <label class="lock-label" for="lockPassword">Mot de passe</label>
                <div class="lock-field">
                    <input id="lockPassword" class="lock-input" type="password" autocomplete="current-password" spellcheck="false" required>
                    <button type="button" class="lock-toggle" aria-label="Afficher le mot de passe" aria-pressed="false">${ICON_EYE}</button>
                </div>
                <label class="lock-remember">
                    <input type="checkbox" id="lockRemember">
                    <span>Se souvenir de moi sur cet appareil</span>
                </label>
                <p class="lock-error" id="lockError" role="alert"></p>
                <button type="submit" class="lock-submit">Déverrouiller</button>
            </form>
        `;
        document.body.appendChild(screen);

        const form = screen.querySelector('form');
        const input = screen.querySelector('#lockPassword');
        const remember = screen.querySelector('#lockRemember');
        const error = screen.querySelector('#lockError');
        const submit = screen.querySelector('.lock-submit');
        const toggle = screen.querySelector('.lock-toggle');

        toggle.addEventListener('click', () => {
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            toggle.innerHTML = visible ? ICON_EYE : ICON_EYE_OFF;
            toggle.setAttribute('aria-pressed', visible ? 'false' : 'true');
            toggle.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
            input.focus();
        });

        function setBusy(busy) {
            submit.disabled = busy;
            input.disabled = busy;
            submit.textContent = busy ? 'Vérification…' : 'Déverrouiller';
        }

        function showError(message) {
            error.textContent = message;
            form.classList.remove('is-shaking');
            void form.offsetWidth; // relance l'animation
            form.classList.add('is-shaking');
        }

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const password = input.value;
            if (!password) {
                showError('Saisissez le mot de passe.');
                input.focus();
                return;
            }
            error.textContent = '';
            setBusy(true);
            try {
                const key = await deriveKey(password);
                const html = await decryptPage(key);
                const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
                saveKey(bytesToB64(raw), remember.checked);
                render(html);
            } catch (err) {
                setBusy(false);
                input.value = '';
                showError('Mot de passe incorrect.');
                input.focus();
            }
        });

        setTimeout(() => input.focus(), 50);
    }

    // ---------- Démarrage ----------
    async function start() {
        if (!window.crypto || !crypto.subtle) {
            document.body.insertAdjacentHTML('beforeend',
                '<p class="lock-noscript">Votre navigateur ne permet pas de déverrouiller ce portfolio. Ouvrez-le avec un navigateur récent, en HTTPS.</p>');
            return;
        }
        const stored = readStoredKey();
        if (stored) {
            try {
                render(await decryptPage(await importRawKey(stored)));
                return;
            } catch (e) {
                clearKeys(); // clé obsolète (mot de passe changé)
            }
        }
        showLockScreen();
    }

    start();
})();
