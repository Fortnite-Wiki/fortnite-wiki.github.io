import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION, articleFor, getFormattedReleaseDate } from '../../../tools/utils.js';

const DATA_BASE_PATH = '../../../data/';

let index = [];
let cosmeticSets = {};
let cosmeticsEntries = [];

let elements = {};

let currentBundleName = '';

async function loadData() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
}

function forceTitleCase(str) {
	if (typeof str !== 'string') return str;
	return str.toLowerCase().replace(/\b\w/g, function(ch, offset, full) {
		// If the character is immediately preceded by an apostrophe and is a solitary possessive 's',
		// keep it lowercase. Otherwise capitalize.
		if (offset > 0 && full[offset - 1] === "'") {
			const nextChar = full[offset + 1];
			if (ch === 's' && (!nextChar || /[^a-zA-Z]/.test(nextChar))) {
				return ch; // keep 's' lowercase in possessives
			}
		}
		return ch.toUpperCase();
	});
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
			currentBundleName = entry.bundle_name;
			if (elements.includeAppearances && elements.includeAppearances.checked) {
				elements.shopAppearances.value = entry.bundle_name;
			}
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

function generateBundlePage(bundleID, bundleName, cosmetics, da, dav2, imageProductTagCounts, usePlaceholderImage, settings) {
	const infobox = [];
	if (settings.displayTitle) infobox.push(`{{DISPLAYTITLE:${bundleName}}}`);
	if (settings.collaboration) infobox.push('{{Collaboration|Cosmetic}}');
	if (!settings.isReleased) infobox.push('{{Unreleased|Cosmetic}}');
	infobox.push('{{Infobox Bundles');
	infobox.push(`|name = ${bundleName}`);
	let imageParameter = '';
	if (!usePlaceholderImage && imageProductTagCounts && Object.keys(imageProductTagCounts).length > 0) {
		imageParameter = Object.entries(imageProductTagCounts).flatMap(([tag, count]) => {
			const entries = [];
			const tagLabelMap = {
				'Product.Juno': 'LEGO',
			};
			const label = tagLabelMap[tag] || tag;

			if (tag in tagLabelMap) {
				if (count >= 1) entries.push(`${bundleName} (${label}) - Item Shop Bundle - Fortnite.png`);
				for (let i = 2; i <= count; i++) {
					entries.push(`${bundleName} (${label} - ${String(i).padStart(2, '0')}) - Item Shop Bundle - Fortnite.png`);
				}
			} else {
				if (count >= 1) entries.push(`${bundleName} - Item Shop Bundle - Fortnite.png`);
				for (let i = 2; i <= count; i++) {
					entries.push(`${bundleName} (${String(i).padStart(2, '0')}) - Item Shop Bundle - Fortnite.png`);
				}
			}

			return entries;
		}).join('\n');
		if (imageParameter.includes('\n')) {
			imageParameter = `<gallery>\n${imageParameter}\n</gallery>`;
		}
	}
	infobox.push(`|image = ${usePlaceholderImage ? 'Placeholder (Featured - New) - Item Shop Bundle - Fortnite.png' : imageParameter}`);

	let rarity = cosmetics[0]?.rarity || "";
	infobox.push(`|rarities = ${rarity}`);
	
	const links = cosmetics.map(({ name, linkTarget, linkDisplay }) => {
		return (linkTarget !== name) ? `[[${linkTarget}|${linkDisplay}]]` : `[[${name}]]`;
	});
	infobox.push(`|cosmetics = ${links.join(' <br> ')}`);

	if (settings.vbucksCost != "") {
		infobox.push(`|cost = ${settings.vbucksCost}`);
	} else {
		infobox.push(`|cost = `);
	}

	if (settings.updateVersion != "") {
		infobox.push(`|added_in = [[Update v${settings.updateVersion}]]`);
	} else {
		infobox.push("|added_in = ");
	}

	let release = "";
	if (settings.releaseDate) {
		// using this instead of simply
		// const date = new Date(settings.releaseDate);
		// because of timezones affecting the entered date
		const [year, month, day] = settings.releaseDate.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month is 0-indexed

		if (settings.itemShopHistory) {
			const historyDate = getFormattedReleaseDate(date);
			const partLink = settings.shopHistoryPart ? ` - Part ${settings.shopHistoryPart}` : "";
			const partText = settings.shopHistoryPart ? `<br/><small><small>Part ${settings.shopHistoryPart}</small></small>` : "";
			release = `[[Item Shop History/${historyDate}${partLink}|${historyDate}${partText}]]`;
		} else {
			release = getFormattedReleaseDate(date);
		}
	}
	infobox.push(`|release_date = ${release}`);

	if (settings.includeAppearances) {
		infobox.push(`|appearances = ${settings.shopAppearances}`);
	}
	
	infobox.push(`|ID = ${bundleID}`);

	infobox.push('}}');
	
	let summary = `'''${bundleName}''' is ${articleFor(rarity)} {{${rarity}}} [[Item Shop Bundle]] in [[Fortnite]]`;
	if (!settings.isReleased) {
		summary = summary + ' that is currently unreleased.';
	} else if (settings.vbucksCost != "") {
		summary = summary + `that can be purchased in the [[Item Shop]] for ${vbucksCost}.`;
	} else {
		summary = summary + '.';
	}
	summary = summary + "\n";

	function chunk(arr, size) {
		const out = [];
		for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
		return out;
	}

	const cosmeticsTable = ['== Cosmetics ==', '<center>', '{| class="reward-table"'];
	for (const row of chunk(cosmetics, 3)) {
		cosmeticsTable.push('|' + row.map(({ name, rarity, cosmeticType, fileType, setName, isFestivalCosmetic, isPickaxeOverride, isRacingCosmetic, linkTarget, linkDisplay }) => {
			let ending = 'Fortnite.png';
			if (fileType == 'Pickaxe' || fileType == 'Back Bling') {
				ending = 'Fortnite.png';
			} else if (isFestivalCosmetic && !isPickaxeOverride) {
				ending = 'Fortnite Festival.png';
			} else if (isRacingCosmetic) {
				ending = 'Rocket Racing.png';
			}
			return `{{${rarity} Rarity|[[File:${name} - ${fileType} - ${ending}|130px|link=${linkTarget}]]}}`;
		}).join('\n|'));
		cosmeticsTable.push('|-');
		cosmeticsTable.push('!' + row.map(({ name, linkTarget, linkDisplay }) => {
			// Only use [[NAME (TYPE)|NAME]] if there are duplicates, else just [[NAME]]
			return (linkTarget !== name) ? `[[${linkTarget}|${linkDisplay}]]` : `[[${name}]]`;
		}).join('\n!'));
		cosmeticsTable.push('|-');
	}
	if (cosmeticsTable[cosmeticsTable.length - 1] === '|-') cosmeticsTable.pop();
	cosmeticsTable.push('|}', '</center>', '');

	const appearancesSection = [];
	if (settings.includeAppearances) {
		appearancesSection.push('== [[Item Shop]] Appearances ==', '{{ItemShopAppearances');
		appearancesSection.push(`|name = ${settings.shopAppearances}`);
		if (settings.shopAppearances != bundleName) {
			appearancesSection.push(`|name2 = ${bundleName}`);
		}
		appearancesSection.push('}}', '');
	}
	
	const categories = ["[[Category:Item Shop Bundles]]"];

	try {
		const setNames = Array.from(new Set(cosmetics.map(c => c.setName).filter(s => s && s.trim())));
		for (const s of setNames) {
			categories.push(`[[Category:${s} Set]]`);
		}
	} catch (e) {
		console.warn('Failed to add set categories:', e);
	}

	return [...infobox, summary, ...cosmeticsTable, ...appearancesSection, ...categories].join('\n');
}

async function handleGenerate() {
	let bundleID = document.getElementById('bundle-input').value.trim();
	const bundleName = document.getElementById('bundle-input-name').value.trim();

	showStatus('Loading the data for the input cosmetics...', 'loading');

	const nameCounts = {};
	for (const e of cosmeticsEntries) {
		const hiddenName = (e.hiddenName && e.hiddenName.value || '').trim();
		nameCounts[hiddenName] = (nameCounts[hiddenName] || 0) + 1;
	}

	const cosmetics = [];
	for (const e of cosmeticsEntries) {
		const hiddenId = (e.hiddenId && e.hiddenId.value || '').trim();
		const hiddenName = (e.hiddenName && e.hiddenName.value || '').trim();
		let entryMeta = index.find(it => it.id && it.id.toLowerCase() === hiddenId.toLowerCase());
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

				let fileType = cosmeticType;
				let isPickaxeOverride = false;
				if (isFestivalCosmetic && instrumentType) {
					if (instrumentType === 'Drums' && cosmeticType != instrumentType) {
						fileType = 'Pickaxe';
						isPickaxeOverride = true;
					} else {
						fileType = instrumentType;
					}
				}
				if (isRacingCosmetic && fileType === 'Wheel') fileType = 'Wheels';

				const hasDuplicate = nameCounts[name] > 1;
				const linkTarget = hasDuplicate ? `${name} (${cosmeticType})` : name;
				const linkDisplay = name;

				cosmetics.push({
					name,
					rarity,
					cosmeticType,
					fileType,
					setName,
					isFestivalCosmetic,
					isPickaxeOverride,
					isRacingCosmetic,
					linkTarget,
					linkDisplay
				});

			} catch (error) {
				console.warn(`Failed to load cosmetic data for ${hiddenId} / ${hiddenName}:`, error);
			}
		}
	}
	
	cosmetics.sort((a, b) => {
		const typeOrder = [
			'Outfit', 'Back Bling', 'Pet', 'Pickaxe', 'Glider', 'Contrail',
			'Emote', 'Emoticon', 'Spray', 'Toy', 'Wrap', 'Loading Screen',
			'Lobby Music', 'Kicks', 'Car Body', 'Decal', 'Wheel', 'Trail',
			'Boost', 'Aura', 'Guitar', 'Bass', 'Drums', 'Microphone',
			'Keytar', 'Jam Track', 'Banner Icon', 'Banner'
		];
		const aIndex = typeOrder.indexOf(a.cosmeticType);
		const bIndex = typeOrder.indexOf(b.cosmeticType);
		return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
	});

	showStatus('Loading the DA and DAv2 data...', 'loading');
	const { da, dav2 } = await getBundleData(bundleID, bundleName);

	let imageProductTagCounts = { 'Product.BR': 0, 'Product.Juno': 0, 'Product.DelMar': 0 };
	let usePlaceholderImage = false;

	if (dav2 && Array.isArray(dav2)) {
		for (const entry of dav2) {
			const presentations = entry?.Properties?.ContextualPresentations;
			if (!Array.isArray(presentations)) continue;

			for (const pres of presentations) {
				const tag = pres?.ProductTag?.TagName;
				if (imageProductTagCounts.hasOwnProperty(tag)) {
					imageProductTagCounts[tag]++;
				}
				const renderImage = pres?.RenderImage?.AssetPathName;
				if (renderImage == '/OfferCatalog/Art/A_Shop_Tiles_Textures/T_UI_PlaceholderCube.T_UI_PlaceholderCube') {
					usePlaceholderImage = true;
					break;
				}
			}
			if (usePlaceholderImage) {
				break;
			}
		}
	}

	if (da && Array.isArray(da)) {
		bundleID = da[0]?.Name.replace('DA_Featured_', '') || bundleID;
	}

	const settings = {
		vbucksCost: ensureVbucksTemplate(elements.vbucksCost.value.trim()),
		includeAppearances: elements.includeAppearances.checked,
		shopAppearances: elements.shopAppearances.value.trim(),
		collaboration: elements.collaboration.checked,
		displayTitle: elements.displayTitle.checked,
		isReleased: elements.releasedSwitch.checked,
		releaseDate: elements.releaseDate.value.trim(),
		itemShopHistory: elements.itemShopHistory.checked,
		shopHistoryPart: elements.shopHistoryPart.value.trim(),
		updateVersion: elements.updateVersion.value.trim(),
	};

	showStatus('Generating bundle page...', 'loading');
	// Apply force-title-case option if enabled
	let outBundleName = bundleName;
	if (elements.forceTitleCase && elements.forceTitleCase.checked) {
		outBundleName = forceTitleCase(bundleName);
		currentBundleName = outBundleName;
	}
	let page = generateBundlePage(bundleID, outBundleName, cosmetics, da, dav2, imageProductTagCounts, usePlaceholderImage, settings);
	
	// Helper: wrap value in {{V-Bucks|...}} if not already
	function ensureVbucksTemplate(val) {
		if (!val) return '';
		if (/^\s*{{\s*V-Bucks\s*\|/.test(val)) return val;
		// Remove commas and spaces
		const num = val.replace(/[^\d]/g, '');
		return `{{V-Bucks|${num}}}`;
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
	elements = {
		// Bundle settings
		vbucksCost: document.getElementById('vbucks-cost'),
		includeAppearances: document.getElementById('include-appearances'),
		shopAppearances: document.getElementById('shop-appearances'),
		collaboration: document.getElementById('collaboration'),

		// Release status settings
		releasedSwitch: document.getElementById('released-switch'),
		releasedLabel: document.getElementById('released-label'),
		releaseDate: document.getElementById('release-date'),
		itemShopHistory: document.getElementById('item-shop-history'),
		shopHistoryPart: document.getElementById('shop-history-part'),
		updateVersion: document.getElementById('update-version'),

		// Other settings
		displayTitle: document.getElementById('display-title'),
		forceTitleCase: document.getElementById('force-title-case'),
	};

	await loadData();
	document.getElementById('bundle-display').addEventListener('input', updateBundleSuggestions);
	document.getElementById('generate-btn').addEventListener('click', handleGenerate);
	document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
	document.getElementById('clear-btn').addEventListener('click', handleClear);

	document.getElementById('add-cosmetic').addEventListener('click', (e) => { e.preventDefault(); createCosmeticEntry(); });
	document.getElementById('remove-cosmetic').addEventListener('click', (e) => { e.preventDefault(); removeCosmeticEntry(); });
	
	createCosmeticEntry();

	function handleReleasedSwitch() {
		const isReleased = elements.releasedSwitch.checked;
		const releasedFields = document.querySelectorAll('.released-fields');
		
		elements.releasedLabel.textContent = isReleased ? 'Yes' : 'No';
		
		if (isReleased) {
			releasedFields.forEach(field => {
				field.style.display = 'flex';
			});
		} else {
			releasedFields.forEach(field => {
				field.style.display = 'none';
			});
			
			elements.releaseDate.value = '';
			elements.itemShopHistory.checked = false;
			elements.shopHistoryPart.value = '';
		}
		
		elements.shopHistoryPart.style.display = elements.itemShopHistory.checked ? 'inline-block' : 'none';
	}

	elements.releasedSwitch.addEventListener('change', handleReleasedSwitch);

	// Toggle shop history part visibility when the checkbox changes
	elements.itemShopHistory.addEventListener('change', () => {
		elements.shopHistoryPart.style.display = elements.itemShopHistory.checked ? 'inline-block' : 'none';
	});

	// Item Shop Appearances visibility
	const appearancesFields = document.querySelectorAll('.appearances-fields');
	elements.includeAppearances.addEventListener('change', () => {
		const appearancesChecked = elements.includeAppearances.checked;
		if (appearancesChecked) {
			appearancesFields.forEach(field => {
				field.style.display = 'block';
			});
			elements.shopAppearances.value = currentBundleName;
		} else {
			appearancesFields.forEach(field => {
				field.style.display = 'none';
			});
		}
	});

	elements.forceTitleCase.addEventListener('change', () => {
		if (elements.shopAppearances != "") {
			if (elements.forceTitleCase.checked) {
				const currentName = elements.shopAppearances.value;
				elements.shopAppearances.value = forceTitleCase(currentName);
				currentBundleName = elements.shopAppearances.value;
			} else {
				elements.shopAppearances.value = document.getElementById("bundle-input-name").value.trim();
				currentBundleName = elements.shopAppearances.value;
			}
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}