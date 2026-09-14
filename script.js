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

document.querySelectorAll('.project-card, .skill-category, .formation-item, .veille-category-card, .veille-article, .experience-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
