import siteUpdates from '../data/changelog.js';

export function parseReport(text) {
    const entries = [];
    let current = null;
    for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
        const heading = /^(ADDED|CHANGED|REMOVED|REPLACED) (.+)$/.exec(line);
        if (heading) {
            current = { status: heading[1], title: heading[2], changes: [] };
            entries.push(current);
            continue;
        }
        if (!current || !line.trim()) continue;
        const detail = line.trim();
        const previous = /^Before: (.*)$/.exec(detail);
        const next = /^After:\s*(.*)$/.exec(detail);
        if (previous && current.changes.length) {
            current.changes.at(-1).before = previous[1];
        } else if (next && current.changes.length) {
            current.changes.at(-1).after = next[1];
        } else if (!detail.startsWith('Summary:')) {
            const kind = /^(Added|Removed|Changed|Reordered)\b/.exec(detail)?.[1]?.toLowerCase() || 'other';
            current.changes.push({ kind, text: detail.replace(/:$/, '') });
        }
    }
    return entries;
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function renderChange(change) {
    const row = element('div', `change change-${change.kind}`);
    const verb = /^(Added|Removed|Changed|Reordered)\b/.exec(change.text);
    if (verb) {
        row.appendChild(element('strong', '', verb[1]));
        row.appendChild(document.createTextNode(change.text.slice(verb[1].length).trimStart()));
    } else {
        row.textContent = change.text;
    }
    if (change.before !== undefined || change.after !== undefined) {
        const values = element('div', 'before-after');
        if (change.before !== undefined) {
            const before = element('div');
            before.appendChild(element('span', '', 'Before: '));
            before.appendChild(document.createTextNode(change.before));
            values.appendChild(before);
        }
        if (change.after !== undefined) {
            const after = element('div');
            after.appendChild(element('span', '', 'After: '));
            after.appendChild(document.createTextNode(change.after));
            values.appendChild(after);
        }
        row.appendChild(values);
    }
    return row;
}

function renderEntry(entry) {
    const card = element('article', 'entry');
    const heading = element('div', 'entry-heading');
    heading.appendChild(element('span', `status status-${entry.status.toLowerCase()}`, entry.status));
    heading.appendChild(element('h2', '', entry.title));
    card.appendChild(heading);
    if (entry.changes.length) {
        const changes = element('div', 'changes');
        for (const change of entry.changes) changes.appendChild(renderChange(change));
        card.appendChild(changes);
    }
    return card;
}

function renderSiteUpdates() {
    const container = document.getElementById('site-updates');
    for (const update of siteUpdates) {
        const article = element('article', 'site-update');
        const heading = element('div', 'site-update-heading');
        heading.appendChild(element('h4', '', update.title));
        const date = element('time', '', update.date);
        date.dateTime = update.date;
        heading.appendChild(date);
        article.appendChild(heading);
        const list = element('ul');
        for (const change of update.changes) list.appendChild(element('li', '', change));
        article.appendChild(list);
        container.appendChild(article);
    }
}

async function init() {
    document.getElementById('return-main').addEventListener('click', event => {
        event.preventDefault();
        window.close();
    });
    renderSiteUpdates();
    const name = document.getElementById('update-name');
    const summary = document.getElementById('summary');
    const message = document.getElementById('message');
    const container = document.getElementById('entries');
    const search = document.getElementById('change-search');

    fetch('/data/latest-data-update.txt', { cache: 'no-cache' })
        .then(response => response.ok ? response.text() : '')
        .then(text => { name.textContent = text.trim() || 'Latest data update'; })
        .catch(() => { name.textContent = 'Latest data update'; });

    try {
        const response = await fetch('/data/datasetup-changes.txt', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const entries = parseReport(await response.text());
        const counts = { ADDED: 0, CHANGED: 0, REMOVED: 0, REPLACED: 0 };
        for (const entry of entries) counts[entry.status]++;
        summary.appendChild(element('span', 'summary-chip', `${entries.length} files`));
        for (const [status, count] of Object.entries(counts)) {
            if (count) summary.appendChild(element('span', 'summary-chip', `${count} ${status.toLowerCase()}`));
        }

        function render() {
            const query = search.value.trim().toLowerCase();
            const matches = entries.filter(entry =>
                `${entry.title} ${entry.changes.map(change => `${change.text} ${change.before || ''} ${change.after || ''}`).join(' ')}`
                    .toLowerCase().includes(query));
            container.replaceChildren(...matches.map(renderEntry));
            message.textContent = entries.length
                ? (matches.length ? '' : 'No changes match your search.')
                : 'No compressed JSON files changed.';
        }

        search.addEventListener('input', render);
        render();
    } catch (error) {
        message.textContent = 'Could not load the changelog. Try the raw text link above.';
    }
}

if (typeof document !== 'undefined') init();
