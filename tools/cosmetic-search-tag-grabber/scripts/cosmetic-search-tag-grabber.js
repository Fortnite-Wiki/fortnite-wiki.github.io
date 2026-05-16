import { loadGzJson } from '../../../tools/jsondata.js';

const DATA_BASE_PATH = '../../../data/';

let index = [];
let searchTags = [];

async function loadIndex() {
    index = await loadGzJson(DATA_BASE_PATH + 'index.json');
}

async function loadSearchTags() {
    const resp = await fetch(DATA_BASE_PATH + 'CosmeticSearchTags.json');
    searchTags = await resp.json();
}

function updateSuggestions() {
    const input = document.getElementById("cosmetic-display").value.trim().toLowerCase();
    const sugDiv = document.getElementById("suggestions");
    sugDiv.innerHTML = "";
    if (!input) return;
    if (!Array.isArray(index) || index.length === 0) return;

    const candidateIndex = index.filter(e => {
        if (!e.generatedSearchTagIndexes) return false;
        if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
        if (typeof e.banner_id === 'string' || typeof e.banner_icon === 'string') return false;
        return e.name && e.id;
    });

    const scoredMatches = candidateIndex
        .map(e => {
            const name = (e.name || '').toLowerCase();
            const id = (e.id || '').toLowerCase();
            let score = 0;
            if (name === input) score += 100;
            else if (name.startsWith(input)) score += 75;
            else if (name.includes(input)) score += 50;
            if (id === input) score += 40;
            else if (id.startsWith(input)) score += 25;
            else if (id.includes(input)) score += 10;
            return { entry: e, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    scoredMatches.forEach(({ entry }) => {
        const div = document.createElement("div");
        div.textContent = `${entry.name} (${entry.id})`;
        div.onclick = () => {
            document.getElementById("cosmetic-display").value = `${entry.name} (${entry.id})`;
            document.getElementById("cosmetic-input").value = entry.id;
            document.getElementById("cosmetic-input-name").value = entry.name;
            sugDiv.innerHTML = "";
        };
        sugDiv.appendChild(div);
    });
}

function updateTagSuggestions() {
    const input = document.getElementById("tag-input").value.trim().toLowerCase();
    const sugDiv = document.getElementById("tag-suggestions");
    sugDiv.innerHTML = "";
    if (!input) return;

    const matches = searchTags
        .map((tag, i) => ({ tag, i }))
        .filter(t => {
            const normalizedTag = t.tag.replace(/\n/g, '\\n').toLowerCase();
            return normalizedTag.includes(input);
        })
        .slice(0, 15);

    matches.forEach(({ tag }) => {
        const div = document.createElement("div");
        div.textContent = tag.replace(/\n/g, '\\n');
        
        div.onclick = () => {
            document.getElementById("tag-input").value = tag.replace(/\n/g, '\\n');
            sugDiv.innerHTML = "";
        };
        sugDiv.appendChild(div);
    });
}

function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
	if (status) {
		status.textContent = message;
		status.className = `status ${type}`;
		status.classList.remove('hidden');
	}
}

function hideStatus() {
    const status = document.getElementById('status');
	if (status) {
		status.classList.add('hidden');
	}
}

function setupEvents() {
    document.getElementById("cosmetic-display").addEventListener("input", updateSuggestions);
    document.getElementById("tag-input").addEventListener("input", updateTagSuggestions);

    document.getElementById("generate-btn").addEventListener("click", async () => {
        const id = document.getElementById("cosmetic-input").value.trim();
        if (!id) {
            showStatus("Please select a cosmetic first.", "error");
            return;
        }

        const entry = index.find(e => e.id === id);
        const tags = entry.generatedSearchTagIndexes.map(i => {
                const rawTag = searchTags[i];
                return rawTag ? rawTag.replace(/\n/g, '\\n') : "";
            }).filter(Boolean);

        const output = document.getElementById("output");
        output.value = tags.length ? tags.join("\n") : "(No search tags found)";

        document.getElementById("copy-btn").disabled = tags.length === 0;
        showStatus(`Found ${tags.length} search tags.`, "success");
    });

    document.getElementById("reverse-btn").addEventListener("click", async () => {
        const displayedTagName = document.getElementById("tag-input").value.trim();

        const actualTagName = displayedTagName.replace(/\\n/g, '\n');

        const tagIndex = searchTags.indexOf(actualTagName);
        
        if (tagIndex === -1) {
            showStatus("Please select a tag from the suggestions.", "error");
            return;
        }

        showStatus("Searching cosmetics...", "loading");
        const matches = index.filter(e => e.generatedSearchTagIndexes?.includes(tagIndex));

        const output = document.getElementById("output");

        if (matches.length === 0) {
            output.value = "(No cosmetics found for this tag)";
            showStatus("No cosmetics found.", "error");
            return;
        }

        output.value = matches.map(e => `${e.name} (${e.id})`).join("\n");
        document.getElementById("copy-btn").disabled = false;
        showStatus(`Found ${matches.length} cosmetics.`, "success");
    });

    document.getElementById("copy-btn").addEventListener("click", () => {
        const output = document.getElementById("output").value;
        navigator.clipboard.writeText(output);
        showStatus("Copied to clipboard!", "success");
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
        document.getElementById("output").value = "";
        document.getElementById("copy-btn").disabled = true;
        showStatus("Cleared.", "success");
    });
}

window.addEventListener("DOMContentLoaded", async () => {
    await loadIndex();
    await loadSearchTags();
    setupEvents();
});
