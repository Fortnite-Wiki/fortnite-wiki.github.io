import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION } from '../../../tools/utils.js';

const DATA_BASE_PATH = '../../../data/';

let index = [];
let cosmeticSets = {};
let cosmeticsEntries = [];

async function loadData() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
}

function updateBundleSuggestions() {
	const input = document.getElementById('bundle-display').value.trim().toLowerCase();
	const sugDiv = document.getElementById('suggestions');
	sugDiv.innerHTML = '';
	if (!input) return;

	const scoredMatches = (Array.isArray(index) ? index : [])
		.filter(e => {
			// exclude NON bundle-like entries
			if (typeof e.id === 'string' || typeof e.name === 'string') return false;
			// require bundle_name and bundle_id for suggestion matching
			return e.bundle_name && e.bundle_id;
		})
		.map(e => {
			const bundle_name = (e.bundle_name || '').toLowerCase();
			const bundle_id = (e.bundle_id || '').toLowerCase();
			let score = 0;

			if (bundle_name === input) score += 100;
			else if (bundle_name.startsWith(input)) score += 75;
			else if (bundle_name.includes(input)) score += 50;

			if (bundle_id === input) score += 40;
			else if (bundle_id.startsWith(input)) score += 25;
			else if (bundle_id.includes(input)) score += 10;

			return { entry: e, score };
		})
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	scoredMatches.forEach(({ entry }) => {
		const div = document.createElement('div');
		div.textContent = `${entry.bundle_name} (${entry.bundle_id})`;
		div.onclick = () => {
			document.getElementById('bundle-display').value = `${entry.bundle_name} (${entry.bundle_id})`;
			document.getElementById('bundle-input').value = entry.bundle_id;
			document.getElementById('bundle-input-name').value = entry.bundle_name;
			sugDiv.innerHTML = '';
		};
		sugDiv.appendChild(div);
	});
}

// Create a new cosmetic entry DOM and hook up suggestion behavior
function createCosmeticEntry() {
	const list = document.getElementById('cosmetics-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'cosmetic-entry';

	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'enter cosmetic ID or Name';
	input.className = 'cosmetic-display';

	const hiddenId = document.createElement('input');
	hiddenId.type = 'hidden';
	hiddenId.className = 'cosmetic-input';

	const hiddenName = document.createElement('input');
	hiddenName.type = 'hidden';
	hiddenName.className = 'cosmetic-input-name';

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	input.addEventListener('input', () => updateCosmeticSuggestions(input, hiddenId, hiddenName, suggestions));

	wrapper.appendChild(input);
	wrapper.appendChild(hiddenId);
	wrapper.appendChild(hiddenName);
	wrapper.appendChild(suggestions);

	list.appendChild(wrapper);
	cosmeticsEntries.push({wrapper, input, hiddenId, hiddenName, suggestions});
	input.focus();
}

function removeCosmeticEntry() {
	if (cosmeticsEntries.length === 0) return;
	const entry = cosmeticsEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateCosmeticSuggestions(displayEl, hiddenIdEl, hiddenNameEl, sugDiv) {
	const input = displayEl.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!input) return;

	if (!Array.isArray(index) || index.length === 0) return;

	const candidateIndex = index.filter(e => {
		if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
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
		const div = document.createElement('div');
		div.textContent = `${entry.name} (${entry.id})`;
		div.onclick = () => {
			displayEl.value = `${entry.name} (${entry.id})`;
			hiddenIdEl.value = entry.id;
			hiddenNameEl.value = entry.name;
			sugDiv.innerHTML = '';
		};
		sugDiv.appendChild(div);
	});
}

async function getBundleData(bundleID, bundleName) {
	const entryMeta = index.find(e =>
		(e.bundle_id && e.bundle_id.toLowerCase() === bundleID.toLowerCase()) ||
		(e.bundle_name && e.bundle_name.toLowerCase() === bundleName.toLowerCase())
	);

	if (!entryMeta) return { da: null, dav2: null };

	let da = null;
	let dav2 = null;

	// Load DA if path exists
	if (entryMeta.da_path && typeof entryMeta.da_path === 'string' && entryMeta.da_path.trim()) {
		try {
			da = await loadGzJson(`${DATA_BASE_PATH}${entryMeta.da_path}`);
		} catch (err) {
			console.warn(`Failed to load DA for bundle ${bundleID || bundleName}:`, err);
			da = null;
		}
	}

	// Load DAv2 if path exists
	if (entryMeta.dav2_path && typeof entryMeta.dav2_path === 'string' && entryMeta.dav2_path.trim()) {
		try {
			dav2 = await loadGzJson(`${DATA_BASE_PATH}${entryMeta.dav2_path}`);
		} catch (err) {
			console.warn(`Failed to load DAv2 for bundle ${bundleID || bundleName}:`, err);
			dav2 = null;
		}
	}

	return { da, dav2 };
}

function generateBundlePage(bundleID, bundleName, cosmetics, da, dav2, settings) {
	const infobox = [];
	// if (isUnreleased) infobox.push('{{Unreleased|Cosmetic}}');
	infobox.push('{{Infobox Bundles');
	infobox.push(`|name = ${bundleName}`);
	infobox.push(`|image = `);
	
	infobox.push('}}');
	
	let summary = "";
	
	const cosmeticsTable = ['== Cosmetics ==', '<center>', '{| class="reward-table"'];
	cosmeticsTable.push('|}', '</center>');
	
	const categories = [];

	return [...infobox, summary, ...cosmeticsTable, ...categories].join('\n');
}

async function handleGenerate() {
	const bundleID = document.getElementById('bundle-input').value.trim();
	const bundleName = document.getElementById('bundle-input-name').value.trim();

	showStatus('Loading the data for the input cosmetics...', 'loading');
	const cosmetics = [];
	for (const e of cosmeticsEntries) {
		const hiddenId = (e.hiddenId && e.hiddenId.value || '').trim();
		const hiddenName = (e.hiddenName && e.hiddenName.value || '').trim();
		let entryMeta = index.find(it => (it.id && it.id.toLowerCase() === hiddenId.toLowerCase()) || (it.name && it.name.toLowerCase() === hiddenName.toLowerCase()));
		if (entryMeta) {
			try {
				const path = entryMeta.path;
				if (!path) continue;
				const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${path}`);
				if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) continue;
				let itemDefinitionData = cosmeticData.find(d => d.type in TYPE_MAP) || cosmeticData[0];
				if (!itemDefinitionData) continue;

				const props = itemDefinitionData.Properties || {};
				const ID = itemDefinitionData.Name;
				const type = itemDefinitionData.Type;
				const name = props.ItemName?.LocalizedString;
				let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
					props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
				
				let cosmeticType = props.ItemShortDescription?.SourceString;
				if (!cosmeticType) {
					cosmeticType = TYPE_MAP[data.Type] || "";
				}
				if (cosmeticType === "Shoes") {
					cosmeticType = "Kicks";
				}
				if (cosmeticType === "Vehicle Body") {
					cosmeticType = "Car Body";
				}

				const isFestivalCosmetic = entryMeta.path.startsWith("Festival");
				let instrumentType;
				if (isFestivalCosmetic && cosmeticType != "Aura") {
					if (type in INSTRUMENTS_TYPE_MAP) {
						instrumentType = INSTRUMENTS_TYPE_MAP[type]
					} else {
						instrumentType = ID.split("_").at(-1);
						if (instrumentType == "Mic") {
							instrumentType = "Microphone";
						} else if (instrumentType == "DrumKit" || instrumentType == "DrumStick" || instrumentType == "Drum") {
							instrumentType = "Drums";
						}
					}
				}

				const isRacingCosmetic = entryMeta.path.startsWith("Racing");

				let tags = [];
				for (const entry of props.DataList || []) {
					if (typeof entry === 'object' && entry !== null) {
						if (entry.Tags) {
							tags = entry.Tags;
						}
						if (entry.Series) {
							let series = entry.Series.ObjectName?.split("'")?.slice(-2)[0];
							rarity = SERIES_CONVERSION[series] || rarity;
						}
					}
				}

				const setTag = tags.find(tag => tag.startsWith("Cosmetics.Set."));
				const setName = cosmeticSets[setTag] || "";

				cosmetics.push({
					name,
					rarity,
					cosmeticType,
					setName,
					isFestivalCosmetic,
					instrumentType,
					isRacingCosmetic
				});

			} catch (error) {
				console.warn(`Failed to load cosmetic data for ${hiddenId} / ${hiddenName}:`, error);
			}
		}
	}

	showStatus('Loading the DA and DAv2 data...', 'loading');
	const { da, dav2 } = await getBundleData(bundleID, bundleName);

	const settings = {};

	showStatus('Generating bundle page...', 'loading');
	let page = generateBundlePage(bundleID, bundleName, cosmetics, da, dav2, settings);
	
	// Helper: wrap value in {{V-Bucks|...}} if not already
	function ensureVbucksTemplate(val) {
		if (!val) return '';
		if (/^\s*{{\s*V-Bucks\s*\|/.test(val)) return val;
		// Remove commas and spaces
		const num = val.replace(/[^\d]/g, '');
		return `{{V-Bucks|${num}}}`;
	}

	// Helper: remove {{V-Bucks|...}} and return just the number
	function stripVbucksTemplate(val) {
		if (!val) return '';
		const m = val.match(/\{\{\s*V-Bucks\s*\|(\d{1,6}(?:,\d{3})*)\s*}}/);
		if (m) return m[1];
		return val.replace(/[^\d]/g, '');
	}

	document.getElementById('output').value = page;
	document.getElementById('copy-btn').disabled = false;
	showStatus('Page generated successfully!', 'success');
	setTimeout(hideStatus, 2000);
}

async function copyToClipboard() {
	try {
		const content = document.getElementById('output').value;
		await navigator.clipboard.writeText(content);
		showStatus('Copied to clipboard!', 'success');
		setTimeout(hideStatus, 2000);
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		showStatus('Failed to copy to clipboard', 'error');
		setTimeout(hideStatus, 3000);
	}
}

function handleClear() {
	document.getElementById('output').value = '';
	document.getElementById('copy-btn').disabled = true;
}

function showStatus(message, type = 'loading') {
	const status = document.getElementById('status');
	status.textContent = message;
	status.className = 'status ' + type;
	status.classList.remove('hidden');
}

function hideStatus() {
	const status = document.getElementById('status');
	status.textContent = '';
	status.className = 'status hidden';
}

async function initializeApp() {
	await loadData();
	document.getElementById('bundle-display').addEventListener('input', updateBundleSuggestions);
	document.getElementById('generate-btn').addEventListener('click', handleGenerate);
	document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
	document.getElementById('clear-btn').addEventListener('click', handleClear);

	document.getElementById('add-cosmetic').addEventListener('click', (e) => { e.preventDefault(); createCosmeticEntry(); });
	document.getElementById('remove-cosmetic').addEventListener('click', (e) => { e.preventDefault(); removeCosmeticEntry(); });
	
	createCosmeticEntry();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}