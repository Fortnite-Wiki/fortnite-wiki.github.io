import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION, articleFor, forceTitleCase, getFormattedReleaseDate, ensureVbucksTemplate } from '../../../tools/utils.js';
import { SEASON_RELEASE_DATES } from '../../../data/datesAndVersions.js';

const DATA_BASE_PATH = '../../../data/';

let index = [];
let cosmeticSets = {};
let jamTracksData = null;

let cosmeticsEntries = [];
let jamTracksEntries = [];
let bannersEntries = [];

let elements = {};

let currentBundleName = '';

async function loadData() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
}

async function loadJamTracksData() {
    try {
        console.log('Loading jam tracks data from API...');
        
        // Use CORS proxy to bypass CORS Policy restrictions
        const apiUrl = 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game/spark-tracks';
        const corsProxyUrl = 'https://corsproxy.io/?';
        const proxiedUrl = corsProxyUrl + encodeURIComponent(apiUrl);
        
        const response = await fetch(proxiedUrl);
        
        if (!response.ok) {
            throw new Error(`CORS proxy request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('Jam tracks data loaded successfully from API via CORS proxy');
        const trackCount = Object.values(data).filter(t => t.track).length;
        console.log(`Loaded ${trackCount} tracks`);

        return data;
    } catch (error) {
        console.error('Error loading jam tracks data from API: ', error);
    }
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
function createCosmeticEntry(focus = true) {
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
	if (focus) input.focus();
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

function createJamTrackEntry() {
	const list = document.getElementById('jam-tracks-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'jam-track-entry';

	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'enter jam track name';
	input.className = 'jam-track-input';

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	input.addEventListener('input', () => updateJamTrackSuggestions(input, suggestions));

	wrapper.appendChild(input);
	wrapper.appendChild(suggestions);
	list.appendChild(wrapper);
	jamTracksEntries.push({wrapper, input, suggestions});
	input.focus();
}

function removeJamTrackEntry() {
	if (jamTracksEntries.length === 0) return;
	const entry = jamTracksEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateJamTrackSuggestions(displayField, suggestionsDiv) {
	const query = (displayField.value || '').trim().toLowerCase();
	suggestionsDiv.innerHTML = '';
	if (!query || !jamTracksData) return;

	const matches = [];
	for (const [key, trackData] of Object.entries(jamTracksData)) {
		if (key.startsWith('_') || !trackData || !trackData.track) continue;

		const track = trackData.track;
		const title = track.tt || key;

		if (title.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
			matches.push({ key, title });
		}
	}

	matches.slice(0, 5).forEach(match => {
		const div = document.createElement('div');
		div.textContent = match.title;
		div.addEventListener('click', () => {
			displayField.value = match.title;
			suggestionsDiv.innerHTML = '';
		});
		suggestionsDiv.appendChild(div);
	});
}

function createBannerEntry() {
	const list = document.getElementById('banners-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'banner-entry';

	const innerWrapper = document.createElement('div');
	innerWrapper.style.display = 'flex';
	innerWrapper.style.justifyContent = 'center';
	innerWrapper.style.alignItems = 'center';
	innerWrapper.style.gap = '1rem';

	const id_input = document.createElement('input');
	id_input.type = 'text';
	id_input.placeholder = 'banner ID';
	id_input.className = 'banner-id';
	id_input.style.width = '25%';

	const name_input = document.createElement('input');
	name_input.type = 'text';
	name_input.placeholder = 'display name';
	name_input.className = 'banner-display-name';
	name_input.style.width = '25%';
	name_input.disabled = true;

	const file_input = document.createElement('input');
	file_input.type = 'text';
	file_input.placeholder = 'file';
	file_input.className = 'banner-file';
	file_input.style.width = '40%';
	file_input.disabled = true;

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	id_input.addEventListener('input', () => updateBannerSuggestions(id_input, file_input, name_input, suggestions));

	innerWrapper.appendChild(id_input);
	innerWrapper.appendChild(name_input);
	innerWrapper.appendChild(file_input);
	wrapper.appendChild(innerWrapper);
	wrapper.appendChild(suggestions);
	list.appendChild(wrapper);
	bannersEntries.push({wrapper, id_input, name_input, file_input, suggestions});
	id_input.focus();
}

function removeBannerEntry() {
	if (bannersEntries.length === 0) return;
	const entry = bannersEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateBannerSuggestions(idField, fileField, nameField, sugDiv) {
	const idInput = idField.value.trim().toLowerCase();
	const fileInput = fileField.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!idInput) return;

	if (!Array.isArray(index) || index.length === 0) return;

	const candidateIndex = index.filter(e => {
		if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
		if (typeof e.id === 'string' || typeof e.name === 'string') return false;
		return e.banner_id && e.banner_icon;
	});

	const scoredMatches = candidateIndex
		.map(e => {
			const banner_id = (e.banner_id || '').toLowerCase();
			const banner_icon = (e.banner_icon || '').toLowerCase();
			let score = 0;
			if (banner_id === idInput) score += 100;
			else if (banner_id.startsWith(idInput)) score += 75;
			else if (banner_id.includes(idInput)) score += 50;
			if (banner_icon === idInput) score += 40;
			else if (banner_icon.startsWith(idInput)) score += 25;
			else if (banner_icon.includes(idInput)) score += 10;
			return { entry: e, score };
		})
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	scoredMatches.forEach(({ entry }) => {
		const div = document.createElement('div');
		div.textContent = entry.banner_id;
		div.onclick = () => {
			idField.value = entry.banner_id;
			fileField.value = entry.banner_icon.replaceAll('_', ' ') + ".png";
			sugDiv.innerHTML = '';

			idField.disabled = true;
			nameField.disabled = false;
			fileField.disabled = false;
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
		const tagLabelMap = {
			'Product.Juno': 'LEGO',
		};

		const tempEntries = Object.entries(imageProductTagCounts).flatMap(([tag, count]) => {
			const entries = [];
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
		});

		if (tempEntries.length > 1) {
			// Add increasing numeric caption (|1, |2, ...) after each image in the gallery
			const numbered = tempEntries.map((filename, idx) => `${filename}|${idx + 1}`);
			imageParameter = `<gallery>\n${numbered.join('\n')}\n</gallery>`;
		} else if (tempEntries.length === 1) {
			imageParameter = tempEntries[0];
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
	
	let theFlag = bundleName.toLowerCase().startsWith('the ') ? '' : 'The ';
	let summary = `${theFlag}'''${bundleName}''' is ${articleFor(rarity)} {{${rarity}}} [[Item Shop Bundle]] in [[Fortnite]]`;
	if (!settings.isReleased) {
		summary = summary + ' that is currently unreleased.';
	} else if (settings.vbucksCost != "") {
		summary = summary + ` that can be purchased in the [[Item Shop]] for ${settings.vbucksCost}.`;
	} else {
		summary = summary + '.';
	}

	let seasonFirstReleasedFlag = "";
	if (settings.releaseDate) {
		// using this instead of simply
		// const date = new Date(settings.releaseDate);
		// because of timezones affecting the entered date
		const [year, month, day] = settings.releaseDate.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month is 0-indexed
		
		const sortedSeasons = Object.entries(SEASON_RELEASE_DATES)
			.sort(([, dateA], [, dateB]) => dateA - dateB);
		
		// Find the matching season key
		let matchedSeasonKey = null;
		for (let i = 0; i < sortedSeasons.length; i++) {
			const [currentKey, currentDate] = sortedSeasons[i];
			const nextDate = sortedSeasons[i + 1]?.[1];

			if (date >= currentDate && (!nextDate || date < nextDate)) {
				matchedSeasonKey = currentKey;
				break;
			}
		}
		
		if (matchedSeasonKey) {
			if (matchedSeasonKey === 'C2R') {
				seasonFirstReleasedFlag = " was first released in [[Chapter 2 Remix]]";
			} else if (matchedSeasonKey === 'C6MS1') {
				seasonFirstReleasedFlag = " was first released in [[Galactic Battle]]";
			} else if (matchedSeasonKey === 'C6MS2') {
				seasonFirstReleasedFlag = " was first released in [[Chapter 6: Mini Season 2]]";
			} else {
				const keyMatch = matchedSeasonKey.match(/^C(\d+)(M)?S(\d+)$/);
				const chapter = keyMatch[1];
				const mini = keyMatch[2];
				const season = keyMatch[3];
				
				if (chapterMatch && seasonMatch) {
					if (mini) {
						seasonFirstReleasedFlag = ` was first released in [[Chapter ${chapter}: Mini Season ${season}]]`;
					} else {
						seasonFirstReleasedFlag = ` was first released in [[Chapter ${chapter}: Season ${season}]]`;
					}
				}
			}
		}
	}
	
	if (cosmetics[0]?.setName && seasonFirstReleasedFlag) {
		summary += ` ${theFlag}${bundleName}${seasonFirstReleasedFlag} and contains cosmetics from the [[:Category:${cosmetics[0]?.setName} Set|${cosmetics[0]?.setName} Set]].`;
	} else if (cosmetics[0]?.setName) {
		summary += ` ${theFlag}${bundleName} contains cosmetics from the [[:Category:${cosmetics[0]?.setName} Set|${cosmetics[0]?.setName} Set]].`;
	} else if (seasonFirstReleasedFlag) {
		summary += ` ${theFlag}${bundleName}${seasonFirstReleasedFlag}.`;
	}

	summary = summary + "\n";

	function chunk(arr, size) {
		const out = [];
		for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
		return out;
	}

	const cosmeticsTable = ['== Cosmetics ==', '<center>', '{| class="reward-table"'];

	const imageCells = [];
	const nameCells = [];

	for (const item of cosmetics) {
		const { name, rarity, cosmeticType, fileType, isFestivalCosmetic, isPickaxeOverride, isRacingCosmetic, hasLEGOStyle, linkTarget, linkDisplay, isJamTrack, jamTrackTitle, isBanner, bannerFile } = item;

		const pushCell = (imageMarkup) => {
			imageCells.push(imageMarkup);
			nameCells.push((linkTarget !== name) ? `[[${linkTarget}|${linkDisplay}]]` : `[[${name}]]`);
		};

		if (isJamTrack) {
			pushCell(`{{Jam Icon|${jamTrackTitle}|120px}}`);
		} else if (isBanner) {
			pushCell(`[[File:${bannerFile}|130px|link=Banner Icons]]`);
		} else {
			let ending = 'Fortnite.png';
			if (fileType == 'Pickaxe' || fileType == 'Back Bling') {
				ending = 'Fortnite.png';
			} else if (isFestivalCosmetic && !isPickaxeOverride) {
				ending = 'Fortnite Festival.png';
			} else if (isRacingCosmetic) {
				ending = 'Rocket Racing.png';
			}

			pushCell(`{{${rarity} Rarity|[[File:${name} - ${fileType} - ${ending}|130px|link=${linkTarget}]]}}`);

			if (cosmeticType == "Outfit" && hasLEGOStyle) {
				pushCell(`{{${rarity} Rarity|[[File:${name} - ${fileType} - LEGO Fortnite.png|130px|link=${linkTarget}]]}}`);
			}
		}
	}

	const imageRows = chunk(imageCells, 3);
	const nameRows = chunk(nameCells, 3);

	for (let i = 0; i < imageRows.length; i++) {
		const row = imageRows[i];
		cosmeticsTable.push('|' + row.join('\n|'));
		cosmeticsTable.push('|-');
		const namesRow = nameRows[i] || [];
		cosmeticsTable.push('!' + namesRow.join('\n!'));
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
	if (cosmetics[0]?.setName) {
		categories.push(`[[Category:${cosmetics[0].setName} Set]]`);
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
				let itemDefinitionData = cosmeticData.find(d => d.Type in TYPE_MAP) || cosmeticData[0];
				if (!itemDefinitionData) continue;

				const props = itemDefinitionData.Properties || {};
				const ID = itemDefinitionData.Name;
				const type = itemDefinitionData.Type;
				const name = props.ItemName?.LocalizedString;
				let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
					props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
				
				let cosmeticType = props.ItemShortDescription?.SourceString;
				if (!cosmeticType) {
					cosmeticType = TYPE_MAP[itemDefinitionData.Type] || "";
				}
				if (cosmeticType === "Shoes") {
					cosmeticType = "Kicks";
				}
				if (cosmeticType === "Companion") {
					cosmeticType = "Sidekick";
				}
				if (cosmeticType === "Vehicle Body" || cosmeticType === "Body") {
					cosmeticType = "Car Body";
				}
				if (cosmeticType === "Drift Trail") {
					cosmeticType = "Trail";
				}

				const carBodyName = (cosmeticType == "Decal" && entryMeta.carBodyTag) && index.find(e => e.id && (e.id.toLowerCase().startsWith("carbody_") || e.id.toLowerCase().startsWith("body_")) && e.carBodyTag == entryMeta.carBodyTag)?.name;

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

				let hasLEGOStyle = false;
				if (entryMeta.jido) {
					hasLEGOStyle = true;
				}

				const hasDuplicate = nameCounts[name] > 1;
				const linkTarget = hasDuplicate ? `${name} (${carBodyName || (cosmeticType == "Wheel" ? "Wheels" : cosmeticType)})` : (carBodyName ? `${name} (${carBodyName})` : name);
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
					hasLEGOStyle,
					linkTarget,
					linkDisplay
				});

			} catch (error) {
				console.warn(`Failed to load cosmetic data for ${hiddenId} / ${hiddenName}:`, error);
			}
		}
	}

	for (const jt of jamTracksEntries) {
		const title = (jt.input && jt.input.value || '').trim();
		if (!title) continue;
		cosmetics.push({
			name: title,
			rarity: '',
			cosmeticType: 'Jam Track',
			fileType: 'Jam Track',
			isJamTrack: true,
			jamTrackTitle: title,
			linkTarget: title,
			linkDisplay: title
		});
	}

	for (const b of bannersEntries) {
		const bannerName = (b.name_input && b.name_input.value || '').trim();
		const bannerFile = (b.file_input && b.file_input.value || '').trim();
		if (!bannerFile) continue;
		if (!bannerName) {
			showStatus(`${b.id_input.value} is missing a display name. Please fill it in.`, 'error');
			return;
		}
		cosmetics.push({
			name: bannerName || bannerFile,
			rarity: '',
			cosmeticType: 'Banner',
			fileType: 'Banner',
			isBanner: true,
			bannerFile: bannerFile,
			linkTarget: 'Banner Icons',
			linkDisplay: bannerName
		});
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
	jamTracksData = await loadJamTracksData();

	document.getElementById('bundle-display').addEventListener('input', updateBundleSuggestions);
	document.getElementById('generate-btn').addEventListener('click', handleGenerate);
	document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
	document.getElementById('clear-btn').addEventListener('click', handleClear);

	document.getElementById('add-cosmetic').addEventListener('click', (e) => { e.preventDefault(); createCosmeticEntry(); });
	document.getElementById('remove-cosmetic').addEventListener('click', (e) => { e.preventDefault(); removeCosmeticEntry(); });

	document.getElementById('add-jam-track').addEventListener('click', (e) => { e.preventDefault(); createJamTrackEntry(); });
	document.getElementById('remove-jam-track').addEventListener('click', (e) => { e.preventDefault(); removeJamTrackEntry(); });

	document.getElementById('add-banner').addEventListener('click', (e) => { e.preventDefault(); createBannerEntry(); });
	document.getElementById('remove-banner').addEventListener('click', (e) => { e.preventDefault(); removeBannerEntry(); });

	createCosmeticEntry(false);

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