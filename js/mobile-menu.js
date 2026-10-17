const menuButton = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');
const MOBILE_BREAKPOINT = 900;

if (menuButton && sidebar) {
    const closeMenu = () => {
        sidebar.classList.remove('mobile-nav-open');
        menuButton.setAttribute('aria-expanded', 'false');
    };

    menuButton.addEventListener('click', () => {
        const abierto = sidebar.classList.toggle('mobile-nav-open');
        menuButton.setAttribute('aria-expanded', String(abierto));
    });

    sidebar.querySelector('nav')?.addEventListener('click', event => {
        if (event.target instanceof Element && event.target.closest('a')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            closeMenu();
        }
    });

    if (window.innerWidth > MOBILE_BREAKPOINT) {
        closeMenu();
    }
}
