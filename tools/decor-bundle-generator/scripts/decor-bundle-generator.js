import { loadGzJson } from '../../jsondata.js';

import { initSourceReleaseControls, getSourceReleaseSettings, validateSourceSettings } from '../../source-release.js';
import { initBundleControls, getBundleEntries, setupBundleControls } from '../../bundle-controls.js';
import { initFormBehaviors } from '../../form-behaviors.js';

import { getSeasonReleased, pageExists } from '../../utils.js';
import { generateUnlockedParameter, generateCostParameter, generateReleaseParameter, generateArticleIntro } from '../../article-utils.js';

const DATA_BASE_PATH = '../../../data/';

let jbpidIndex = [];
let elements = {};
let buildingPropIndex = [];
let cosmeticIndex = [];
let bundleEntries = [];

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

async function loadCosmeticIndex() {
	try {
		cosmeticIndex = await loadGzJson(DATA_BASE_PATH + 'index.json');
	} catch (e) {
		console.error('Failed to load cosmetic index', e);
		cosmeticIndex = [];
	}
}

function updateSuggestions() {
	const bundleDisplay = document.getElementById("bundle-display");
	const sugDiv = document.getElementById("suggestions");
	
	if (!bundleDisplay || !sugDiv) return;
	
	const input = (bundleDisplay.value || '').trim().toLowerCase();
	sugDiv.innerHTML = "";
	if (!input) {
		elements.wikiPageBtn.disabled = true;
		elements.wikiPageBtn.textContent = 'Create page';
		return;
	}

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
			await updateWikiPageButtonDecor();
		};
		sugDiv.appendChild(div);
	});
}

async function updateWikiPageButtonDecor() {
	const bundleId = elements.bundleInput.value.trim();
	const bundleName = elements.bundleInputName.value.trim();
	
	if (!bundleId || !bundleName) {
		elements.wikiPageBtn.disabled = true;
		elements.wikiPageBtn.textContent = 'Create page';
		return;
	}
	
	const pageTitle = `LEGO Fortnite:${bundleName}`;
	const shouldEdit = await pageExists(pageTitle);
	
	elements.wikiPageBtn.disabled = false;
	elements.wikiPageBtn.textContent = shouldEdit ? 'Edit page' : 'Create page';
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

async function openWikiPage() {
	const bundleInput = elements.bundleDisplay.value.trim();
	const bundleId = elements.bundleInput.value.trim();
	const bundleName = elements.bundleInputName.value.trim();
	
	if (!bundleId || !bundleName) {
		showStatus('Please select a valid decor bundle', 'error');
		return;
	}
	
	const pageTitle = `LEGO Fortnite:${bundleName}`;
	const shouldEdit = await pageExists(pageTitle);
	
	const wikiUrl = `https://fortnite.fandom.com/wiki/${encodeURIComponent(pageTitle)}`;
	const finalUrl = shouldEdit ? `${wikiUrl}?action=edit` : wikiUrl;
	
	window.open(finalUrl, '_blank');
	showStatus(`${shouldEdit ? 'Edit' : 'Create'} page opened in new tab`, 'success');
	setTimeout(hideStatus, 2000);
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
	
	// Build settings object from shared module
	const settings = getSourceReleaseSettings(elements);

	const validationError = validateSourceSettings(settings, elements);
	if (validationError) {
		showStatus(validationError, 'error');
		return;
	}
	
	// Add generator-specific settings
	settings.isCollaboration = elements.collaboration.checked;
	settings.hasRender = elements.render.checked;
	settings.updateVersion = elements.updateVersion.value.trim();

	bundleEntries = getBundleEntries();
	
	const wikiText = generateDecorBundleWikiText(entry, matches, settings);
	displayOutput(wikiText);
	showStatus('Page generated — copy output to clipboard when ready.', 'success');
	setTimeout(hideStatus, 2500);
}

function generateDecorBundleWikiText(entry, matches, settings) {	
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

	// Add unreleased template if not released
	if (settings.isUnreleased) {
		output.push("{{Unreleased|Cosmetic}}");
	}

	output.push(`{{DISPLAYTITLE:${entry.name}}}`);

	if (settings.isCollaboration) {
		output.push("{{Collaboration|Cosmetic}}");
	}

	output.push(`{{Infobox LEGO Kits`);
	output.push(`|image = ${imageFile}`);
	output.push(`|type = Decor Bundle`);
	output.push(`|items = ${infoboxItems}`);

	output.push(`|unlocked = ${generateUnlockedParameter(settings, bundleEntries)}`);
	output.push(`|cost = ${generateCostParameter(settings, bundleEntries)}`);
	output.push(`|release_date = ${generateReleaseParameter(settings)}`);

	if (settings.updateVersion) {
		output.push(`|added_in = [[Update v${settings.updateVersion}]]`);
	}

	if (settings.isItemShop && settings.includeAppearances) {
		output.push(`|appearances = ${settings.shopAppearances}`);
	}

	output.push(`|ID = ${entry.id}`);
	output.push(`}}`);

	let intro = `'''${entry.name}''' is a [[LEGO Fortnite:Decor Bundles|Decor Bundle]] in [[LEGO Fortnite]]` + generateArticleIntro(settings, bundleEntries);

	const seasonFirstReleasedFlag = getSeasonReleased(settings.releaseDate, settings);
	if (seasonFirstReleasedFlag) {
		intro += ` ${entry.name}${seasonFirstReleasedFlag}.`;
	}
	output.push(intro);

	output.push('');
	output.push(itemsSection);

	if (settings.isItemShop && settings.includeAppearances) {
		output.push('');
		output.push('== Item Shop Appearances ==');
		output.push('{{ItemShopAppearances');
		output.push(`|name = ${settings.shopAppearances}`);

		if (entry.name != settings.shopAppearances) output.push(`|name2 = ${entry.name}`);

		if (bundleEntries.length == 1 && settings.shopCost == "") {
			const be = bundleEntries[0];
			if (be.bundleName && be.bundleName.value) {
				const rawName = be.bundleName.value.trim();
				const bundleName = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
				const theFlag = rawName.toLowerCase().startsWith("the ") ? "" : "the ";
				output.push(`|bundled_with = ${theFlag}[[LEGO Fortnite:${bundleName}|${bundleName}]]`);
			}
		}

		output.push('}}');
	}

	if (settings.hasRender) {
		output.push('');
		output.push('== Render ==');
		output.push('<center>');
		output.push('{|');
		output.push(`!{{Style Header|Render}}`);
		output.push('|-');
		output.push(`!{{Style Name|${entry.name}}}`);
		output.push('|-');
		output.push(`|[[File:${entry.name} (Render) - Decor Bundle - LEGO Fortnite.webm]]`);
		output.push('|}');
		output.push('{{RenderNotification}}');
		output.push('</center>');
	}

	output.push('');

	if (settings.isFree) {
		output.push(`[[Category:Free Cosmetics]]`);
    }

	return output.join('\n');
}

async function initialiseApp() {
	// Initialize generator-specific elements only
	elements = {
		bundleDisplay: document.getElementById("bundle-display"),
		bundleInput: document.getElementById("bundle-input"),
		bundleInputName: document.getElementById("bundle-input-name"),
		output: document.getElementById("output"),
		copyBtn: document.getElementById("copy-btn"),
		generateBtn: document.getElementById("generate-btn"),
		wikiPageBtn: document.getElementById("wiki-page-btn"),
		clearBtn: document.getElementById("clear-btn"),
		status: document.getElementById("status"),
		updateVersion: document.getElementById("update-version"),
		collaboration: document.getElementById("collaboration"),
		render: document.getElementById("render"),
	};

	await loadJBPIDIndex();
	await loadBuildingPropIndex();
	await loadCosmeticIndex();

	if (elements.bundleDisplay) {
		elements.bundleDisplay.addEventListener("input", updateSuggestions);
	}
	if (elements.copyBtn) {
		elements.copyBtn.addEventListener("click", copyToClipboard);
	}
	if (elements.wikiPageBtn) {
		elements.wikiPageBtn.addEventListener("click", openWikiPage);
	}
	if (elements.clearBtn) {
		elements.clearBtn.addEventListener("click", clearOutput);
	}
	if (elements.generateBtn) {
		elements.generateBtn.addEventListener("click", generatePage);
	}

	// Initialize source/release controls - this augments elements with all source/release/settings fields
	initSourceReleaseControls({
		sources: ['legoPass', 'itemShop', 'questReward'],
		autoReleaseSources: ['legoPass'],
		hideReleaseFieldsSources: ['legoPass']
	}, elements);

	// Initialize shared bundle controls
	initBundleControls(cosmeticIndex);
	setupBundleControls();

	// Initialize shared form behaviors
	initFormBehaviors(elements);
}

// Wait for source controls to be ready, then initialize
function waitForSourceControls() {
	return new Promise((resolve) => {
		const container = document.getElementById('source-release-container');
		if (container && container.children.length > 0) {
			resolve();
		} else {
			document.addEventListener('sourceControlsReady', resolve, { once: true });
		}
	});
}

// Initialise when DOM is loaded AND source controls are ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', async () => {
		await waitForSourceControls();
		initialiseApp();
	});
} else {
	(async () => {
		await waitForSourceControls();
		initialiseApp();
	})();
}