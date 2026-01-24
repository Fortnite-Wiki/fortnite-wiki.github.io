import { loadGzJson } from '../../jsondata.js';

const DATA_BASE_PATH = '../../../data/';

let jbpidIndex = [];
let elements = {};
let buildingPropIndex = [];

async function loadJBPIDIndex() {
	const resp = await fetch(DATA_BASE_PATH + 'LEGO/jbpid_index.json');
	jbpidIndex = await resp.json();
}

async function loadBuildingPropIndex() {
	try {
		const resp = await fetch(DATA_BASE_PATH + 'LEGO/buildingprop_index.json');
		buildingPropIndex = await resp.json();
	} catch (e) {
		console.error('Failed to load buildingprop_index.json', e);
		buildingPropIndex = [];
	}
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

function showStatus(message, type = 'info') {
	if (elements.status) {
		elements.status.textContent = message;
		elements.status.className = `status ${type}`;
		elements.status.classList.remove('hidden');
	}
}

function hideStatus() {
	if (elements.status) {
		elements.status.classList.add('hidden');
	}
}

function displayOutput(content) {
	if (elements.output) {
		elements.output.value = content;
		elements.copyBtn.disabled = false;
	}
}

function clearOutput() {
	if (elements.output) {
		elements.output.value = "";
		elements.copyBtn.disabled = true;
	}
}

async function copyToClipboard() {
	try {
		const content = elements.output.value;
		await navigator.clipboard.writeText(content);
		showStatus('Copied to clipboard!', 'success');
		setTimeout(hideStatus, 2000);
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		showStatus('Failed to copy to clipboard', 'error');
		setTimeout(hideStatus, 3000);
	}
}

async function generatePage() {
	const bundleInput = elements.bundleDisplay.value.trim();
	const bundleId = elements.bundleInput.value.trim();
	const bundleName = elements.bundleInputName.value.trim();

	if (!bundleId) {
		showStatus('Please enter a valid decor bundle name or ID.', 'error');
		return;
	}

	const entry = jbpidIndex.find(e => (e.id || '').toLowerCase() === bundleId.toLowerCase() || (e.name || '').toLowerCase() === bundleInput.toLowerCase());

	const tag = entry.tag;
	const matches = buildingPropIndex.filter(p => Array.isArray(p.attributeTags) && p.attributeTags.includes(tag));
	matches.sort((a, b) => a.name.localeCompare(b.name));
	
	function getCategoryLabel(attributeTags) {
		return attributeTags.find(t => t.startsWith('Juno.BuildingMenu.Category')).split('.').pop();
	}

	const infoboxItems = matches.map(m => {
		return `[[LEGO Fortnite:${getCategoryLabel(m.attributeTags)}|${m.name}]]`;
	}).join(' <br> ');

	let itemsGrid = '';
	if (matches.length > 0) {
		const cols = 3;
		for (let i = 0; i < matches.length; i++) {
			const m = matches[i];
			const cat = getCategoryLabel(m.attributeTags);
			const imageName = `${m.name} - ${cat.replace(/s$/, '')} - LEGO Fortnite.png`;
			const linkTarget = `LEGO Fortnite:${cat}`;
			const cell = `|{{LEGO Background|image=${imageName}|size=130px|link=${linkTarget}}} <br> {{Style Name|[[${linkTarget}|${m.name}]]}}`;
			itemsGrid += cell + '\n';
			if ((i + 1) % cols === 0 && i !== matches.length - 1) itemsGrid += '|-\n';
		}
	}

	const imageFile = `${entry.name} - Decor Bundle - LEGO Fortnite.png`;

	const itemsSection = [
		'== Items ==',
		`{| align="center" style="text-align:center;" cellpadding="2" cellspacing="10"`,
		itemsGrid + `|}`,
	].join('\n');

	let output = [];

	output.push(`{{DISPLAYTITLE:${entry.name}}}`);
	output.push(`{{Infobox LEGO Kits`);
	output.push(`|image = ${imageFile}`);
	output.push(`|type = Decor Bundle`);
	output.push(`|items = ${infoboxItems}`);

	output.push(`|ID = ${entry.id}`);
	output.push(`}}`);
	output.push(`'''${entry.name}''' is a [[LEGO Fortnite:Decor Bundles|Decor Bundle]] in [[LEGO Fortnite]].`);
	output.push('');
	output.push(itemsSection)

	output = output.join('\n')

	displayOutput(output);
	showStatus('Page generated — copy output to clipboard when ready.', 'success');
	setTimeout(hideStatus, 2500);
}

async function initialiseApp() {
	elements.bundleDisplay = document.getElementById("bundle-display");
	elements.bundleInput = document.getElementById("bundle-input");
	elements.bundleInputName = document.getElementById("bundle-input-name");
	elements.output = document.getElementById("output");
	elements.copyBtn = document.getElementById("copy-btn");
	elements.generateBtn = document.getElementById("generate-btn");
	elements.clearBtn = document.getElementById("clear-btn");
	elements.status = document.getElementById("status");

	await loadJBPIDIndex();
	await loadBuildingPropIndex();

	if (elements.bundleDisplay) {
		elements.bundleDisplay.addEventListener("input", updateSuggestions);
	}
	if (elements.copyBtn) {
		elements.copyBtn.addEventListener("click", copyToClipboard);
	}
	if (elements.clearBtn) {
		elements.clearBtn.addEventListener("click", clearOutput);
	}
	if (elements.generateBtn) {
		elements.generateBtn.addEventListener("click", generatePage);
	}
}

// Initialise when DOM is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialiseApp);
} else {
	initialiseApp();
}