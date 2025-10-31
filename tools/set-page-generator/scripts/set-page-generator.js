// MediaWiki API helpers for bundle info
async function fetchCategoryMembers(categoryName) {
	const API_ENDPOINT = "https://fortnite.fandom.com/api.php";
	let members = [];
	let cmcontinue = null;
	while (true) {
		const params = new URLSearchParams({
			action: "query",
			list: "categorymembers",
			cmtitle: categoryName,
			cmlimit: "max",
			format: "json",
			formatversion: "2",
		});
		if (cmcontinue) params.append("cmcontinue", cmcontinue);
		const url = `${API_ENDPOINT}?origin=*&${params.toString()}`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			const newMembers = (data.query?.categorymembers || []).map(m => m.title);
			members = members.concat(newMembers);
			cmcontinue = data.continue?.cmcontinue;
			if (!cmcontinue) break;
		} catch (e) {
			console.warn("Error fetching category members:", e);
			break;
		}
	}
	return members;
}

async function fetchWikiPageWikitext(pageTitle) {
	const API_ENDPOINT = "https://fortnite.fandom.com/api.php";
	const params = new URLSearchParams({
		action: "query",
		prop: "revisions",
		titles: pageTitle,
		rvslots: "main",
		rvprop: "content",
		format: "json",
		formatversion: "2",
	});
	const url = `${API_ENDPOINT}?origin=*&${params.toString()}`;
	try {
		const response = await fetch(url);
		const data = await response.json();
		const pages = data.query?.pages || [];
		if (!pages.length || pages[0].missing) return null;
		return pages[0].revisions[0].slots.main.content;
	} catch (e) {
		console.warn(`Error fetching wiki page '${pageTitle}':`, e);
		return null;
	}
}

function extractBundleCost(bundlePageText) {
	const infoboxMatch = /{{Infobox Bundles([\s\S]*?)\n}}/m.exec(bundlePageText);
	if (!infoboxMatch) return null;
	const infoboxText = infoboxMatch[1];
	const costMatch = /\|cost\s*=\s*({{V-Bucks\|\d{1,3}(?:,\d{3})*}})/.exec(infoboxText);
	if (costMatch) return costMatch[1];
	return null;
}

async function getFirstBundleFromCategory(categoryName) {
	const members = await fetchCategoryMembers(categoryName);
	for (const title of members) {
		if (title.endsWith("Bundle")) {
			const wikitext = await fetchWikiPageWikitext(title);
			if (wikitext) {
				const cost = extractBundleCost(wikitext);
				if (cost) {
					return { bundleName: title, bundleCost: cost };
				} else {
					console.log(`No cost found in bundle page '${title}'`);
					return { bundleName: title, bundleCost: null };
				}
			} else {
				console.log(`Failed to fetch wikitext for '${title}'`);
				return { bundleName: title, bundleCost: null };
			}
		}
	}
	return { bundleName: null, bundleCost: null };
}
import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION, ensureVbucksTemplate, stripVbucksTemplate } from '../../../tools/utils.js';

const DATA_BASE_PATH = '../../../data/';

const TYPE_FIELD_MAP = {
	'Outfit': 'outfits',
	'Back Bling': 'back_bling',
	'Pet': 'pets',
	'Pickaxe': 'harvesting_tools',
	'Glider': 'gliders',
	'Contrail': 'contrails',
	'Emote': 'emotes',
	'Emoticon': 'emoticons',
	'Spray': 'sprays',
	'Toy': 'toys',
	'Wrap': 'wraps',
	'Loading Screen': 'loading_screens',
	'Lobby Music': 'music',
	'Kicks': 'kicks',
	'Car Body': 'car_bodies',
	'Decal': 'car_decals',
	'Wheel': 'car_wheels',
	'Trail': 'car_trails',
	'Boost': 'car_boosts',
	'Aura': 'auras',
	'Guitar': 'guitars',
	'Bass': 'bass',
	'Drums': 'drums',
	'Microphone': 'microphones',
	'Keytar': 'keytars',
	'Banner': 'banners'
};

let index = [];
let cosmeticSets = {};
let cosmeticSetLocalizations = {};

async function loadData() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
	const resp2 = await fetch(DATA_BASE_PATH + 'CosmeticSetLocalizations.json');
	cosmeticSetLocalizations = await resp2.json();
}

function updateSetSuggestions() {
	const input = document.getElementById('set-display').value.trim().toLowerCase();
	const sugDiv = document.getElementById('suggestions');
	sugDiv.innerHTML = '';
	if (!input) return;
	const matches = Object.entries(cosmeticSets)
		.filter(([id, name]) =>
			id.toLowerCase().includes(input) || name.toLowerCase().includes(input)
		)
		.slice(0, 10);
	matches.forEach(([id, name]) => {
		const div = document.createElement('div');
		div.textContent = `${name} (${id.replace('Cosmetics.Set.', '')})`;
		div.onclick = () => {
			document.getElementById('set-display').value = `${name} (${id.replace('Cosmetics.Set.', '')})`;
			document.getElementById('set-input').value = id.replace('Cosmetics.Set.', '');
			document.getElementById('set-input-name').value = name;
			sugDiv.innerHTML = '';

			// Check for banners in this set and prompt for names if found
			(async () => {
				const setIdShort = id.replace('Cosmetics.Set.', '');
				const banners = index.filter(e => e.setID === setIdShort && (e.banner_id || e.banner_icon));

				// remove any previous banner UI
				const existing = document.getElementById('banner-config');
				if (existing) existing.remove();

				if (!banners.length) return; // nothing to do

				// disable generation until saved
				const generateBtn = document.getElementById('generate-btn');
				if (generateBtn) generateBtn.disabled = true;

				// create banner configuration UI
				const container = document.createElement('div');
				container.id = 'banner-config';
				container.className = 'banner-config';
				container.style.margin = '0rem 0.25rem';
				const header = document.createElement('div');
				header.style.margin = '8px 0px 16px 0px';
				header.innerHTML = '<strong>Banners detected in this set</strong> — please enter display names and tweak filenames below before generating the page.';
				container.appendChild(header);

				banners.forEach((entry, idx) => {
					const idLabel = document.createElement('div');
					idLabel.textContent = entry.banner_id + ":";
					idLabel.style.fontWeight = 'bold';
					container.appendChild(idLabel);

					const row = document.createElement('div');
					row.className = 'banner-row';
					row.style.margin = '6px 0';
					row.style.display = 'flex';
					row.style.gap = '1rem';
					row.style.alignItems = 'center';
					row.style.justifyContent = 'center';

					const nameInput = document.createElement('input');
					nameInput.type = 'text';
					nameInput.placeholder = 'Display name';
					nameInput.id = `banner-name-${idx}`;
					nameInput.style.width = '30%';
					row.appendChild(nameInput);

					const fileInput = document.createElement('input');
					fileInput.type = 'text';
					fileInput.value = entry.banner_icon.replaceAll('_', ' ') + ".png";
					fileInput.id = `banner-filename-${idx}`;
					fileInput.style.width = '50%';
					row.appendChild(fileInput);

					container.appendChild(row);
				});

				const controls = document.createElement('div');
				controls.style.marginTop = '8px';
				controls.style.display = 'flex';
				controls.style.gap = '8px';
				const saveBtn = document.createElement('button');
				saveBtn.type = 'button';
				saveBtn.className = 'sec-subm';
				saveBtn.textContent = 'Save banner names';
				saveBtn.onclick = () => {
					// validate inputs first: do not accept empty display names or filenames
					let firstEmptyIndex = -1;
					for (let idx = 0; idx < banners.length; idx++) {
						const displayEl = document.getElementById(`banner-name-${idx}`);
						const fileEl = document.getElementById(`banner-filename-${idx}`);
						const displayVal = displayEl ? displayEl.value.trim() : '';
						const fileVal = fileEl ? fileEl.value.trim() : '';
						if (!displayVal || !fileVal) {
							firstEmptyIndex = idx;
							break;
						}
					}
					if (firstEmptyIndex !== -1) {
						// focus the first empty field and show an error
						const focusEl = document.getElementById(`banner-name-${firstEmptyIndex}`) || document.getElementById(`banner-filename-${firstEmptyIndex}`);
						if (focusEl) focusEl.focus();
						showBannerStatus('Please fill out all banner display names and filenames before saving.', 'error');
						setTimeout(hideBannerStatus, 4000);
						return;
					}

					// collect overrides into a global map for later use
					window.bannerOverrides = window.bannerOverrides || {};
					banners.forEach((entry, idx) => {
						const key = entry.banner_id;
						const display = document.getElementById(`banner-name-${idx}`).value.trim();
						const filename = document.getElementById(`banner-filename-${idx}`).value.trim();
						window.bannerOverrides[key] = { display, filename };
					});
					// re-enable generation
					if (generateBtn) generateBtn.disabled = false;
					showStatus('Banner names saved — you can now generate the page', 'success');
					hideBannerStatus();
					setTimeout(hideStatus, 2000);
					container.remove();
				};
				controls.appendChild(saveBtn);

				const cancelBtn = document.createElement('button');
				cancelBtn.type = 'button';
				cancelBtn.className = 'sec-subm secondary'
				cancelBtn.textContent = 'Cancel';
				cancelBtn.onclick = () => {
					if (generateBtn) generateBtn.disabled = false;
					container.remove();
					document.getElementById('set-display').value = '';
					showBannerStatus('Banner configuration cancelled, and hence the searched set was cleared.', 'loading');
					setTimeout(hideBannerStatus, 1200);
					hideStatus();
				};
				controls.appendChild(cancelBtn);

				container.appendChild(controls);

				const parent = document.getElementById('set-search-section');
				const bannerStatus = document.getElementById('banner-status');
				// Insert before banner-status when possible, otherwise fall back to appending
				if (parent && bannerStatus && parent.contains(bannerStatus)) {
					parent.insertBefore(container, bannerStatus);
				} else if (bannerStatus && bannerStatus.parentNode) {
					bannerStatus.parentNode.insertBefore(container, bannerStatus);
				} else if (parent) {
					parent.appendChild(container);
				} else {
					document.body.appendChild(container);
				}

				showStatus('This set contains banners. Please fill out banner display names and filenames before generating the page.', 'warning');
			})();
		};
		sugDiv.appendChild(div);
	});
}

// Find all cosmetics in a set using setID field in index.json
function findCosmeticsInSet(setId) {
	return index.filter(e => e.setID === setId && !(e.banner_id || e.banner_icon));
}

async function fetchTranslations(translationKey) {
	let output = [];
	let translations = [];

	const localizationFolder = "Fortnite_locchunk20";
	try {
		const metaPath = `${DATA_BASE_PATH}localization/${localizationFolder}/${localizationFolder}.json`;
		const meta = await loadGzJson(metaPath);
		const compiledLangs = Array.isArray(meta.CompiledCultures) ? meta.CompiledCultures : [];

		for (const lang of compiledLangs) {
			const alreadyHasTranslation = translations[lang] !== undefined;

			if (alreadyHasTranslation) continue;
			
			const locPath = `${DATA_BASE_PATH}localization/${localizationFolder}/${lang}/${localizationFolder}.json`;
			try {
				const loc = await loadGzJson(locPath);

				const translationText = loc["CosmeticSets"]?.[translationKey] || loc[""]?.[translationKey];
				if (translationText) translations[lang] = translationText;
			} catch {}
		}
	} catch {}


    for (const [lang, translation] of Object.entries(translations)) {
      if (lang === "en") continue; // Skip English as it's already added as |name
      const langKey = lang.toLowerCase().replace("pt-br", "pt-br");
      const translation = translations[lang] || "";
      output.push(`|${langKey} = ${translation}`);
    }

	return output;
}

async function generateSetPage(setId, setName, cosmetics, seasonName, isUnreleased, isCollaboration, options = {}) {
    const infobox = [];
    if (isUnreleased) infobox.push('{{Unreleased|Cosmetic}}');
	if (isCollaboration) infobox.push('{{Collaboration|Cosmetic}}');
    infobox.push('{{Infobox Set');
    infobox.push(`|title = ${setName}`);
    infobox.push(`|image = ${setName} - Set - Fortnite.png`);

	const outfitCosmetics = [];
	const flatIconList = [];

	// Count every usage of each cosmetic name
	const nameCounts = {};
	for (const obj of cosmetics) {
		const props = obj.data?.Properties || obj.Properties || {};
		const name = props.ItemName?.SourceString || obj.name;
		nameCounts[name] = (nameCounts[name] || 0) + 1;
	}

	for (const obj of cosmetics) {
		const props = obj.data?.Properties || obj.Properties || {};
		const objType = obj.data?.Type || obj.Type;
		const cosmeticType = TYPE_MAP[objType];
		const name = props.ItemName?.SourceString || obj.name;
		let rarity = (props.Rarity || '').split('::').pop() || 'Uncommon';

		if (props.DataList) {
			for (const entry of props.DataList) {
				if (entry && typeof entry === 'object' && entry.Series) {
					const objectName = entry.Series.ObjectName.split("'").slice(-2)[0];
					if (SERIES_CONVERSION[objectName]) {
						rarity = SERIES_CONVERSION[objectName];
					}
					break;
				}
			}
		}

		const isFestivalCosmetic = obj.entryMeta?.path && obj.entryMeta.path.startsWith('Festival') && objType != "AthenaDanceItemDefinition";
		const isRacingCosmetic = obj.entryMeta?.path && obj.entryMeta.path.startsWith('Racing');
		
		let instrumentType = null;
		if (isFestivalCosmetic && (cosmeticType !== 'Aura')) {
			// Use INSTRUMENTS_TYPE_MAP if possible
			if (objType in INSTRUMENTS_TYPE_MAP) {
				instrumentType = INSTRUMENTS_TYPE_MAP[objType];
			} else {
				// Fallback: parse from ID
				const id = obj.data?.Name || '';
				instrumentType = id.split('_').at(-1);
				if (instrumentType === 'Mic') {
					instrumentType = 'Microphone';
				} else if (instrumentType === 'DrumKit' || instrumentType === 'DrumStick' || instrumentType === 'Drum') {
					instrumentType = 'Drums';
				}
				if (instrumentType == "") {
					instrumentType = null;
				}
			}
		}

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

		// Use cosmetic type in page links if more than one cosmetic with same name
		const hasDuplicate = nameCounts[name] > 1;
		const linkTarget = hasDuplicate ? `${name} (${cosmeticType})` : name;
		const linkDisplay = name;

		flatIconList.push({ rarity, name, cosmeticType, fileType, isFestivalCosmetic, isRacingCosmetic, isPickaxeOverride, linkTarget, linkDisplay });
		if (cosmeticType === 'Outfit') outfitCosmetics.push(props);
	}

	const bannerEntries = index.filter(e => e.setID === setId && (e.banner_id || e.banner_icon));
	if (bannerEntries.length) {
		bannerEntries.forEach((bEntry, idx) => {
			const key = bEntry.banner_id;
			const override = window.bannerOverrides && window.bannerOverrides[key] ? window.bannerOverrides[key] : {};
			const displayName = override.display;
			const filename = override.filename;
			flatIconList.push({
				rarity: '',
				name: filename,
				cosmeticType: 'Banner',
				fileType: 'Banner',
				isFestivalCosmetic: false,
				isRacingCosmetic: false,
				isPickaxeOverride: false,
				linkTarget: 'Banner Icons',
				linkDisplay: displayName,
				bannerFile: filename
			});
		});
	}

	// Rarity for infobox
	let rarity = '';
	if (outfitCosmetics.length) {
		rarity = (outfitCosmetics[0].Rarity || outfitCosmetics[0].data?.Properties?.Rarity || '').split('::').pop();
		if (outfitCosmetics[0].DataList || outfitCosmetics[0].data?.Properties?.DataList) {
			const dataList = outfitCosmetics[0].DataList || outfitCosmetics[0].data?.Properties?.DataList;
			for (const entry of dataList) {
				if (entry && typeof entry === 'object' && entry.Series) {
					const objectName = entry.Series.ObjectName.split("'").slice(-2)[0];
					if (SERIES_CONVERSION[objectName]) {
						rarity = SERIES_CONVERSION[objectName];
					}
					break;
				}
			}
		}
	} else if (cosmetics.length) {
		// Use the rarity of the first cosmetic in the table if no outfits
		const first = cosmetics[0];
		rarity = (first.data?.Properties?.Rarity || '').split('::').pop() || first.data?.Properties?.Rarity || '';
		if (first.data?.Properties?.DataList) {
			for (const entry of first.data.Properties.DataList) {
				if (entry && typeof entry === 'object' && entry.Series) {
					const objectName = entry.Series.ObjectName.split("'").slice(-2)[0];
					if (SERIES_CONVERSION[objectName]) {
						rarity = SERIES_CONVERSION[objectName];
					}
					break;
				}
			}
		}
	}
	infobox.push(`|rarity = ${rarity}`);

	for (const [type, field] of Object.entries(TYPE_FIELD_MAP)) {
		// Find all flatIconList entries for this type
		const entries = flatIconList.filter(e => TYPE_MAP[type] ? e.cosmeticType === TYPE_FIELD_MAP[type].replace('_', ' ') : false || e.cosmeticType === type);
		if (entries.length) {
			const links = entries.map(({ name, linkTarget, linkDisplay }) => {
				return (linkTarget !== name) ? `[[${linkTarget}|${linkDisplay}]]` : `[[${name}]]`;
			});
			infobox.push(`|${field} = ${links.join(' <br> ')}`);
		}
	}

	infobox.push(`|total_v-buck_price = ${options.totalVbucks || ''}`);

	infobox.push(`|bundle_v-buck_price = ${options.bundleVbucks || ''}${options.bundleName ? ` <br> {{BundleNameSets|${options.bundleName}}}` : ''}`);

	if (options.bundleName) {
		infobox.push(`|bundles = [[${options.bundleName}]]`);
	}

	infobox.push(`|ID = ${setId}`);

	// Translations
	const translationKey = cosmeticSetLocalizations["Cosmetics.Set." + setId] || '';
	const translations = await fetchTranslations(translationKey);
	infobox.push(...translations);

	infobox.push('}}');

    let pronoun = 'their';
    if (outfitCosmetics.length) {
        const genderRaw = outfitCosmetics[0].Gender || '';
        if (genderRaw.includes('Female')) pronoun = 'her';
        else if (genderRaw.includes('Male')) pronoun = 'his';
    }

    const outfitNames = outfitCosmetics.map(props => props.ItemName?.SourceString).filter(Boolean);
    let subject = 'various cosmetics';
    if (outfitNames.length === 1) {
        subject = `[[${outfitNames[0]}]] and ${pronoun} matching cosmetics`;
    } else if (outfitNames.length > 1) {
        subject = outfitNames.map(o => `[[${o}]]`).join(', ') + ' and their matching cosmetics';
    }

	let summary = `'''${setName}''' is a [[:Category:Sets|Set]] in [[Fortnite]] that consists of ${subject}.`;
	if (seasonName && seasonName.trim()) {
		summary += ` ${setName} was added in [[${seasonName}]].`;
	}
	summary += '\n';
    
	// Group cosmetics by TYPE_FIELD_MAP order
	const typeOrderList = Object.keys(TYPE_FIELD_MAP).map(type => TYPE_MAP[type] || type);
	const grouped = [];
	for (const type of typeOrderList) {
		const group = flatIconList.filter(c => c.cosmeticType === type);
		if (group.length) grouped.push(...group);
	}

	function chunk(arr, size) {
		const out = [];
		for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
		return out;
	}

	const cosmeticsTable = ['== Cosmetics ==', '<center>', '{| class="reward-table"'];
	for (const row of chunk(grouped, 3)) {
		cosmeticsTable.push('|' + row.map(({ rarity, name, cosmeticType, fileType, isFestivalCosmetic, isRacingCosmetic, isPickaxeOverride, linkTarget, linkDisplay, bannerFile }) => {
			// Banners: show the provided file and link to Banner Icons
			if (cosmeticType === 'Banner') {
				return `[[File:${bannerFile}|130px|link=Banner Icons]]`;
			}
			let ending = 'Fortnite.png';
			if (fileType === 'Pickaxe' || fileType === 'Back Bling') {
				ending = 'Fortnite.png';
			} else if (isFestivalCosmetic && !isPickaxeOverride) {
				ending = 'Fortnite Festival.png';
			} else if (isRacingCosmetic) {
				ending = 'Rocket Racing.png';
			}
			return `{{${rarity} Rarity|[[File:${name} - ${fileType} - ${ending}|130px|link=${linkTarget}]]}}`;
		}).join('\n|'));
		cosmeticsTable.push('|-');
		cosmeticsTable.push('!' + row.map(({ name, linkTarget, linkDisplay, cosmeticType }) => {
			// Banners: always link to Banner Icons with the display name
			if (cosmeticType === 'Banner') {
				return `[[Banner Icons|${linkDisplay}]]`;
			}
			// Only use [[NAME (TYPE)|NAME]] if there are duplicates, else just [[NAME]]
			return (linkTarget !== name) ? `[[${linkTarget}|${linkDisplay}]]` : `[[${name}]]`;
		}).join('\n!'));
		cosmeticsTable.push('|-');
	}
	if (cosmeticsTable[cosmeticsTable.length - 1] === '|-') cosmeticsTable.pop();
	cosmeticsTable.push('|}', '</center>', '\n[[Category:Sets]]');

    return [...infobox, summary, ...cosmeticsTable].join('\n');
}

async function handleGenerate() {
	const setId = document.getElementById('set-input').value.trim();

	const translationsOnly = document.getElementById('translations-only').checked;
	if (translationsOnly) {
		showStatus('Fetching translations...', 'loading');
		const translationKey = cosmeticSetLocalizations["Cosmetics.Set." + setId] || '';
		const translations = await fetchTranslations(translationKey);
		document.getElementById('output').value = translations.join('\n');
		document.getElementById('copy-btn').disabled = false;
		showStatus('Translations fetched successfully!', 'success');
		setTimeout(hideStatus, 2000);
		return;
	}

	const setName = document.getElementById('set-input-name').value.trim();
	const seasonName = document.getElementById('season-input').value.trim();
	const isUnreleased = document.getElementById('unreleased').checked;
	const isCollaboration = document.getElementById('collaboration').checked;
	const totalVbucksInput = document.getElementById('total-vbucks-input');
	const bundleVbucksInput = document.getElementById('bundle-vbucks-input');
	const bundleNameInput = document.getElementById('bundle-name-input');

	showStatus('Finding cosmetics in set...', 'loading');
	const setEntries = findCosmeticsInSet(setId);
	if (!setEntries.length) {
		showStatus('No cosmetics found in this set.', 'error');
		return;
	}
	showStatus('Loading cosmetic data for set...', 'loading');
	// Fetch full JSONs for each cosmetic in the set
	const cosmetics = [];
	for (const entryMeta of setEntries) {
		try {
			const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}/cosmetics/${entryMeta.path}`);
			if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) {
				continue;
			}
			let itemDefinitionData;
			for (const dataEntry of cosmeticData) {
				if (dataEntry.Type in TYPE_MAP) {
					itemDefinitionData = dataEntry;
				}
			}
			if (!itemDefinitionData) {
				itemDefinitionData = cosmeticData[0];
			}
			cosmetics.push({ data: itemDefinitionData, allData: cosmeticData, entryMeta });
		} catch (error) {
			console.warn(`Failed to load cosmetic data for ${entryMeta.id}:`, error);
			continue;
		}
	}
	if (!cosmetics.length) {
		showStatus('No valid cosmetics found in this set.', 'error');
		return;
	}
	showStatus('Generating set page...', 'loading');


	// Fetch bundle info
	const { bundleName, bundleCost } = await getFirstBundleFromCategory(`Category:${setName} Set`);

	// Only auto-fill bundle fields if empty (let user override)
	if (bundleNameInput && !bundleNameInput.value) bundleNameInput.value = bundleName || '';
	if (bundleVbucksInput && !bundleVbucksInput.value) bundleVbucksInput.value = bundleCost ? stripVbucksTemplate(bundleCost) : '';

	// Get total v-bucks price from input and wrap in template if needed
	let totalVbucks = totalVbucksInput ? totalVbucksInput.value.trim() : '';
	let bundleVbucks = bundleVbucksInput ? bundleVbucksInput.value.trim() : '';
	const bundleNameField = bundleNameInput ? bundleNameInput.value.trim() : '';

	totalVbucks = totalVbucks ? ensureVbucksTemplate(totalVbucks) : '';
	bundleVbucks = bundleVbucks ? ensureVbucksTemplate(bundleVbucks) : '';

	let page = await generateSetPage(setId, setName, cosmetics, seasonName, isUnreleased, isCollaboration, {
		totalVbucks,
		bundleVbucks,
		bundleName: bundleNameField
	});

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

function showBannerStatus(message, type = 'loading') {
	const status = document.getElementById('banner-status');
	status.textContent = message;
	status.className = 'status ' + type;
	status.classList.remove('hidden');
}

function hideBannerStatus() {
	const status = document.getElementById('banner-status');
	status.textContent = '';
	status.className = 'status hidden';
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
	document.getElementById('set-display').addEventListener('input', updateSetSuggestions);
	document.getElementById('generate-btn').addEventListener('click', handleGenerate);
	document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
	document.getElementById('clear-btn').addEventListener('click', handleClear);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}