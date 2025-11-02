import noticesConfig from '../data/site-notices.js';

/* global window, document, localStorage */
(function(){
    const LATEST_UPDATE_PATH = '/data/latest-data-update.txt';

    function storageKey(id, kind) { return `fw:notice:${id}:${kind}`; }

    async function fetchLatestUpdate() {
        try {
            const res = await fetch(LATEST_UPDATE_PATH, { cache: 'no-cache' });
            if (!res.ok) return null;
            const txt = (await res.text()).trim();
            return txt || null;
        } catch (e) {
            return null;
        }
    }

    function shouldShowOnThisPage(paths, exclude) {
        const pathname = window.location.pathname || '/';
        // if excludePaths is provided and the current pathname starts with any excluded prefix, hide
        if (exclude && exclude.length) {
            const isExcluded = exclude.some(p => {
                if (p === '*') return true;
                return pathname.startsWith(p) || pathname.startsWith(p.replace(/index\.html$/, ''));
            });
            if (isExcluded) return false;
        }
        return paths.some(p => {
            // allow wildcard '*'
            if (p === '*') return true;
            // treat p as prefix
            return pathname.startsWith(p) || pathname.startsWith(p.replace(/index\.html$/, ''));
        });
    }

    function createNoticeElement(n) {
        const root = document.createElement('div');
        root.className = `notice notice-${n.type || 'info'}` + (n.collapsible ? ' collapsible' : '') + (n.dismissible ? ' dismissible' : '');
        root.id = n.id;

        if (n.dismissible) {
            const btn = document.createElement('button');
            btn.className = 'notice-close notice-dismiss';
            btn.setAttribute('aria-label', 'Dismiss notice');
            btn.title = 'Dismiss notice';
            btn.textContent = '×';
            root.appendChild(btn);
        }

        if (n.collapsible) {
            const header = document.createElement('div');
            header.className = 'notice-header';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            header.setAttribute('aria-expanded', 'true');

            const span = document.createElement('span');
            span.className = 'summary';
            span.innerHTML = n.summaryText;
            header.appendChild(span);

            const toggle = document.createElement('button');
            toggle.className = 'notice-toggle';
            toggle.setAttribute('aria-label','Toggle notice');
            toggle.title = 'Toggle notice';
            toggle.textContent = '▾';
            header.appendChild(toggle);

            root.appendChild(header);

            const body = document.createElement('div');
            body.className = 'notice-body';
            // add full toggle inside body for expanded placement
            const fullToggle = document.createElement('button');
            fullToggle.className = 'notice-toggle-full';
            fullToggle.setAttribute('aria-label','Toggle notice');
            fullToggle.title = 'Toggle notice';
            fullToggle.textContent = '▾';
            body.appendChild(fullToggle);

            const wrapper = document.createElement('div');
            wrapper.className = 'notice-body-inner';
            wrapper.innerHTML = n.bodyHtml || '';
            body.appendChild(wrapper);

            root.appendChild(body);
        } else {
            // non-collapsible: just the body
            const body = document.createElement('div');
            body.className = 'notice-body';
            body.innerHTML = n.bodyHtml || '';
            root.appendChild(body);
        }

        return root;
    }

    async function init() {
        const container = document.createElement('div');
        container.id = 'site-notices-container';
        container.className = 'site-notices';

        const headerEl = document.querySelector('header');
        if (headerEl) {
            // insert container after header if not already present
            if (!headerEl.nextElementSibling || headerEl.nextElementSibling.id !== container.id) {
                headerEl.insertAdjacentElement('afterend', container);
            }
        } else if (!document.body.contains(container)) {
            document.body.insertBefore(container, document.body.firstChild);
        }

        const latestTxt = await fetchLatestUpdate();

        // for each configured notice, decide whether to inject
        noticesConfig.forEach((n) => {
            const paths = n.paths || ['/'];
            const excludePaths = n.excludePaths || [];

            if (!shouldShowOnThisPage(paths, excludePaths)) return;

            // decide storage keys and states
            const id = n.id;
            let dismissed = false;
            try { dismissed = localStorage.getItem(storageKey(id, 'dismissed')) === '1'; } catch (e) {}
            if (dismissed) return; // don't inject dismissed notices

            // create notice element and set collapsed state from storage
            const el = createNoticeElement(n);
            const collapsed = (() => { try { return localStorage.getItem(storageKey(id, 'collapsed')) === '1'; } catch (e) { return false; } })();
            if (collapsed) el.classList.add('collapsed');

            // always append into the shared container
            container.appendChild(el);

            // populate latest update spans if fetched
            if (latestTxt) {
                const sum = el.querySelector('.latest-update-summary');
                const full = el.querySelector('.latest-update-full');
                if (sum) sum.textContent = latestTxt;
                if (full) full.textContent = latestTxt;
            }

            // wire up collapse behavior for this notice
            if (n.collapsible) {
                const header = el.querySelector('.notice-header');
                const toggle = el.querySelector('.notice-toggle');
                const fullToggle = el.querySelector('.notice-toggle-full');

                let isCollapsed = collapsed;
                const toggleFn = (ev) => {
                    isCollapsed = !isCollapsed;
                    try { localStorage.setItem(storageKey(id, 'collapsed'), isCollapsed ? '1' : '0'); } catch (e) {}
                    applyNoticeCollapseState(el, isCollapsed);
                };

                if (header) {
                    header.addEventListener('click', toggleFn);
                    header.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); toggleFn(); }
                    });
                }
                if (fullToggle) fullToggle.addEventListener('click', (ev) => { ev.stopPropagation(); toggleFn(); });
            }

            // wire up dismiss behavior
            if (n.dismissible) {
                const dismissBtn = el.querySelector('.notice-dismiss');
                if (dismissBtn) {
                    dismissBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        try { localStorage.setItem(storageKey(id, 'dismissed'), '1'); } catch (e) {}
                        applyDismissedState(el, true);
                    });
                }
            }
        });
    }

    // utilities reused from earlier
    function applyNoticeCollapseState(rootEl, collapsed) {
        if (!rootEl) return;
        const header = rootEl.querySelector('.notice-header');
        const toggle = rootEl.querySelector('.notice-toggle');
        const fullToggle = rootEl.querySelector('.notice-toggle-full');

        if (collapsed) {
            rootEl.classList.add('collapsed');
            if (header) header.setAttribute('aria-expanded', 'false');
            if (toggle) toggle.textContent = '▸';
            if (fullToggle) fullToggle.textContent = '▾';
        } else {
            rootEl.classList.remove('collapsed');
            if (header) header.setAttribute('aria-expanded', 'true');
            if (toggle) toggle.textContent = '▾';
            if (fullToggle) fullToggle.textContent = '▾';
        }
    }

    function applyDismissedState(rootEl, dismissed) {
        if (!rootEl) return;
        if (dismissed) {
            rootEl.classList.add('notice-hidden');
            rootEl.setAttribute('aria-hidden', 'true');
        } else {
            rootEl.classList.remove('notice-hidden');
            rootEl.removeAttribute('aria-hidden');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
