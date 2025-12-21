import { loadGzJson } from '../../jsondata.js';

const DATA_BASE_PATH = '../../../data/';

let jbpidIndex = [];
let elements = {};

async function loadJBPIDIndex() {
	const resp = await fetch(DATA_BASE_PATH + 'LEGO/jbpid_index.json');
	jbpidIndex = await resp.json();
}

function updateSuggestions() {
	const bundleDisplay = document.getElementById("bundle-display");
	const sugDiv = document.getElementById("suggestions");
	
	if (!bundleDisplay || !sugDiv) return;
	
	const input = (bundleDisplay.value || '').trim().toLowerCase();
	sugDiv.innerHTML = "";
	if (!input) return;

	if (!Array.isArray(jbpidIndex) || jbpidIndex.length === 0) return;

	const scoredMatches = jbpidIndex
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
		div.onclick = async () => {
			document.getElementById("bundle-display").value = `${entry.name} (${entry.id})`;
			document.getElementById("bundle-input").value = entry.id;
			document.getElementById("bundle-input-name").value = entry.name;

			sugDiv.innerHTML = "";
		};
		sugDiv.appendChild(div);
	});
}

async function initialiseApp() {
	elements.bundleDisplay = document.getElementById("bundle-display");
	elements.bundleInput = document.getElementById("bundle-input");
	elements.bundleInputName = document.getElementById("bundle-input-name");
	elements.output = document.getElementById("output");
	elements.copyBtn = document.getElementById("copy-btn");
	elements.clearBtn = document.getElementById("clear-btn");

	await loadJBPIDIndex();

	if (elements.bundleDisplay) {
		elements.bundleDisplay.addEventListener("input", updateSuggestions);
	}
	if (elements.copyBtn) {
		elements.copyBtn.addEventListener("click", copyToClipboard);
	}
	if (elements.clearBtn) {
		elements.clearBtn.addEventListener("click", () => {
			if (elements.output) {
				elements.output.value = "";
			}
			if (elements.copyBtn) {
				elements.copyBtn.disabled = true;
			}
		});
	}
}

function displayOutput(content) {
	if (elements.output) {
		elements.output.value = content;
		if (elements.copyBtn) {
			elements.copyBtn.disabled = false;
		}
	}
}

async function copyToClipboard() {
	try {
		if (elements.output) {
			await navigator.clipboard.writeText(elements.output.value);
			alert("Copied to clipboard!");
		}
	} catch (error) {
		console.error("Failed to copy:", error);
	}
}

// Initialise when DOM is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialiseApp);
} else {
	initialiseApp();
}