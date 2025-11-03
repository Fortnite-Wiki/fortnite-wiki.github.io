import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION, articleFor, forceTitleCase, getFormattedReleaseDate, ensureVbucksTemplate } from '../../../tools/utils.js';
import {
	SEASON_RELEASE_DATES, SEASON_UPDATE_VERSIONS,
	OG_SEASON_RELEASE_DATES, OG_SEASON_UPDATE_VERSIONS,
	FESTIVAL_SEASON_RELEASE_DATES, FESTIVAL_SEASON_UPDATE_VERSIONS,
	LEGO_SEASON_RELEASE_DATES, LEGO_SEASON_UPDATE_VERSIONS
} from '../../../data/datesAndVersions.js';

const DATA_BASE_PATH = '../../../data/';

let index = [];
let cosmeticSets = {};
let elements = {};
let isCrewAutoDetected = false;

let bundlesEntries = [];
let featuredCharactersEntries = [];

async function loadIndex() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
}

async function loadCosmeticSets() {
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
}

async function autoDetectCosmeticSource(input) {
	if (!input.trim()) {
		// Reset auto-detection flag when input is cleared
		isCrewAutoDetected = false;
		return;
	}
	
	try {
		const result = await searchCosmetic(input);
		const { data } = result;
		
		if (data) {
			const props = data.Properties;
			let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
						 props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
			
			// Check for series conversion
			const seriesEntry = (props.DataList || []).find(entry => entry?.Series);
			if (seriesEntry) {
				let series = seriesEntry.Series.ObjectName?.split("'")?.slice(-2)[0];
				rarity = SERIES_CONVERSION[series] || rarity;
			}
			
			// Auto-tick Fortnite Crew if Crew Series
			if (rarity === "Crew Series") {
				elements.sourceFortniteCrew.checked = true;
				isCrewAutoDetected = true;
				elements.sourceFortniteCrew.dispatchEvent(new Event('change'));
			} else {
				// Reset auto-detection flag if not Crew Series
				isCrewAutoDetected = false;
			}
		}
	} catch (error) {
		console.warn('Auto-detection failed:', error);
		isCrewAutoDetected = false;
	}
}

function updateSuggestions() {
  const input = document.getElementById("cosmetic-display").value.trim().toLowerCase();
  const sugDiv = document.getElementById("suggestions");
  sugDiv.innerHTML = "";
  if (!input) return;

  if (!Array.isArray(index) || index.length === 0) return;

	// Exclude bundle entries and entries missing name/id
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
		const div = document.createElement("div");
		div.textContent = `${entry.name} (${entry.id})`;
		div.onclick = async () => {
			while (bundlesEntries.length != 0) {
				removeBundleEntry();
			}

			document.getElementById("cosmetic-display").value = `${entry.name} (${entry.id})`;
			document.getElementById("cosmetic-input").value = entry.id;
			document.getElementById("cosmetic-input-name").value = entry.name;
			document.getElementById("shop-appearances").value = entry.name;
			sugDiv.innerHTML = "";

			if (entry.companionEmote) {
				document.getElementById('rocket-league-field').style.display = 'none';
				const displayTitleEl = document.getElementById('display-title');
				displayTitleEl.checked = false;
				displayTitleEl.disabled = false;
				return;
			}
			
			autoDetectCosmeticSource(entry.id);

			const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${entry.path}`);
			if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) return;
			let itemDefinitionData = cosmeticData.find(dataEntry => dataEntry.Type in TYPE_MAP) || cosmeticData[0];

			const ID = itemDefinitionData.Name;
			let cosmeticType = itemDefinitionData.Properties.ItemShortDescription?.SourceString.trim() || TYPE_MAP[itemDefinitionData.Type] || "";

			const isFestivalCosmetic = entry.path.startsWith("Festival") && itemDefinitionData.Type != "AthenaDanceItemDefinition";
			let instrumentType;
			if (isFestivalCosmetic && cosmeticType != "Aura") {
				if (itemDefinitionData.Type in INSTRUMENTS_TYPE_MAP) {
					instrumentType = INSTRUMENTS_TYPE_MAP[itemDefinitionData.Type];
				} else {
					instrumentType = ID.split("_").at(-1);
					if (instrumentType == "Mic") {
						instrumentType = "Microphone";
					} else if (instrumentType == "DrumKit" || instrumentType == "DrumStick" || instrumentType == "Drum") {
						instrumentType = "Drums";
					}
				}
			}

			if (cosmeticType == "Loading Screen") {
				createFeaturedCharactersSection();
			}

			if (entry.path.startsWith("Racing")) {

				createBundleEntry();

				const bundleName = `${entry.name} ${cosmeticType}`;

				// Use the last created bundle-entry wrapper and query its fields (avoids off-by-one ID access and null getElementById)
				const bundleEntries = document.querySelectorAll('#bundles-list .bundle-entry');
				const lastWrapper = bundleEntries[bundleEntries.length - 1];
				const displayEl = lastWrapper ? lastWrapper.querySelector('.bundle-display') : null;
				const inputEl = lastWrapper ? lastWrapper.querySelector('.bundle-input') : null;
				const nameEl = lastWrapper ? lastWrapper.querySelector('.bundle-input-name') : null;

				// Check for existing index entry
				const matchingBundleEntry = index.find(e =>
					(e.bundle_name === bundleName || e.bundle_name === `${bundleName}s`)
				);
				if (matchingBundleEntry) {
					if (inputEl) inputEl.value = matchingBundleEntry.bundle_id;
					if (nameEl) nameEl.value = matchingBundleEntry.bundle_name;
					if (displayEl) displayEl.value = `${matchingBundleEntry.bundle_name} (${matchingBundleEntry.bundle_id})`;
				} else {
					removeBundleEntry();
				}

				document.getElementById('rocket-league-field').style.display = 'block';
				document.getElementById('rocket-league-cosmetic').checked = false;
				document.getElementById('rocket-league-exclusive-field').style.display = 'none';
			} else {
				document.getElementById('rocket-league-field').style.display = 'none';
			}
			// If Festival cosmetics, force display title on and lock it so user can't uncheck it.
			const displayTitleEl = document.getElementById('display-title');
			if (isFestivalCosmetic) {
				displayTitleEl.checked = true;
				if (instrumentType != null && instrumentType != "") {
					displayTitleEl.disabled = true;
				}
			} else {
				// Ensure checkbox is enabled for non-Festival entries
				displayTitleEl.checked = false;
				displayTitleEl.disabled = false;
			}
		};
		sugDiv.appendChild(div);
	});
}

async function searchCosmetic(input) {
	const entryMeta = index.find(e => e.id && e.id.toLowerCase() === input.toLowerCase() || e.name && e.name.toLowerCase() === input.toLowerCase());
	
	if (!entryMeta) return { data: null, allData: null, entryMeta: null };
	
	try {
		if (!entryMeta.path) {
			return { data: null, allData: null, entryMeta };
		}
		const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${entryMeta.path}`);
		if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) {
			return { data: null, allData: null, entryMeta };
		}
		let itemDefinitionData = cosmeticData.find(dataEntry => dataEntry.Type in TYPE_MAP) || cosmeticData[0];
		return { data: itemDefinitionData, allData: cosmeticData, entryMeta };
	} catch (error) {
		console.warn(`Failed to load cosmetic data for ${entryMeta.id}:`, error);
		return { data: null, allData: null, entryMeta };
	}
}


function extractSetName(tags, cosmeticSets) {
	const setTag = tags.find(tag => tag.startsWith("Cosmetics.Set."));
	return setTag ? cosmeticSets[setTag] || "" : "";
}

function extractAdditionals(tags) {
	const flagMap = [
		["Cosmetics.UserFacingFlags.Emote.Dance", "{{Dance Emote}}"],
		[["Cosmetics.UserFacingFlags.HasVariants", "Cosmetics.UserFacingFlags.HasUpgradeQuests"], "{{Selectable Styles}}"],
		[["Cosmetics.UserFacingFlags.Emoticon.Animated", "Cosmetics.UserFacingFlags.Wrap.Animated"], "{{Animated}}"],
		[["Cosmetics.UserFacingFlags.Reactive", "Cosmetics.UserFacingFlags.Reactive.WeaponFire"], "{{Reactive}}"],
		["Cosmetics.UserFacingFlags.TOD", "{{Reactive|Time}}"],
		["Cosmetics.UserFacingFlags.Music", "{{Reactive|Music}}"],
		["Cosmetics.UserFacingFlags.Elimination", "{{Reactive|Elim}}"],
		["Cosmetics.UserFacingFlags.Damage", "{{Reactive|Damage}}"],
		["Cosmetics.UserFacingFlags.Emote.Traversal", "{{Traversal}}"],
		["Cosmetics.UserFacingFlags.Emote.Group", "{{Group Emote}}"],
	];
	
	return flagMap.reduce((acc, [keys, label]) => {
		const match = Array.isArray(keys) ? keys.some(k => tags.includes(k)) : tags.includes(keys);
		if (match) acc.push(label);
		return acc;
	}, []).join(" ");
}

async function extractPickaxeSubtype(weapon_definition) {
	const subTypeGabMap = {
		"Classic": [
			"GAB_Melee_ImpactCombo_Athena"
		],
		"Dual-Wield": [
			"GAB_Melee_DualWield_ImpactCombo_Athena",
			"GAB_Melee_DualWield_OrderGuardMale_ImpactCombo_Athena",
			"GAB_Melee_DualWield_CyberArmorFemale_ImpactCombo_Athena",
			"GAB_Melee_SteamPower_Fists_ImpactCombo_Athena"
		],
		"Spinner": [
			"GAB_Melee_Galileo_Ferry_ImpactCombo_Athena"
		],
		"Single-Hand": [
			"GAB_Melee_Ethereal_ImpactCombo_Athena",
			"GAB_Melee_CandyAppleSour_ImpactCombo_Athena",
			"GAB_Melee_Journey_ImpactCombo_Athena",
			"GAB_Melee_DualParadoxGold_ImpactCombo_Athena",
			"GAB_Melee_Troops_ImpactCombo_Athena"
		],
		"Fist": [
			"GAB_Melee_DualWield_Fists_ImpactCombo_Athena"
		],
		"Switching": [
			"GAB_Melee_Sythe_ImpactCombo_Athena"
		],
		"Claw": [
			"GAB_Melee_DualWield_Claw_ImpactCombo_Athena"
		],
		"Sword": [
			"GAB_Melee_BRsword_ImpactCombo_Athena",
			"GAB_Melee_CeremonialGuard_ImpactCombo_Athena",
			"GAB_Melee_YogaPatio_ImpactCombo_Athena"
		],
		"Dual Flail": [
			"GAB_Melee_DualWield_Embers_ImpactCombo",
			"GAB_Melee_DualWield_AncientGladiator_ImpactCombo"
		],
		"Bat": [
			"GAB_Melee_BaseBallBat_ImpactCombo_Athena",
			"GAB_Melee_BaseBallBat_Alt_ImpactCombo_Athena"
		],
		"Single-Wield": [
			"GAB_Melee_CyberArmorFemale_ImpactCombo_Athena",
			"GAB_Melee_MindPinch_ImpactCombo_Athena"
		],
		"Spear": [
			"GAB_Melee_Lance_ImpactCombo_Athena"
		],
		"Staff": [
			"GAB_Melee_StaffAlt_ImpactCombo_Athena",
			"GAB_Melee_CirrusVine_ImpactCombo_Athena",
			"GAB_Melee_DualParadox_ImpactCombo_Athena"
		],
		"Flail": [
			"GAB_Melee_FruitCake_ImpactCombo_Athena",
			"GAB_Melee_HighMotion_ImpactCombo_Athena",
			"GAB_Melee_JoyfulGrin_ImpactCombo_Athena"
		],
		"Dual Spinner": [
			"GAB_Melee_DualWield_NitroFlow_ImpactCombo_Athena",
			"GAB_Melee_DualWield_PowerfulDozen_ImpactCombo_Athena",
			"GAB_Melee_KnightCat_ImpactCombo_Athena"
		]
	}
	
	function get_subtype_from_GAB(gab) {
		for (const [subtype, gabList] of Object.entries(subTypeGabMap)) {
			if (gabList.includes(gab)) {
				return subtype;
			}
		}
		return "";
	}

	const data = await loadGzJson(`${DATA_BASE_PATH}${weapon_definition}`);
	if (!data || !Array.isArray(data)) return "";

	const primaryFireSubtypes = new Set();
	const inStateSubtypes = new Set();

	for (const entry of data) {
		const props = entry?.Properties;
		if (!props) continue;

		if (entry.Type == "FortWeaponAdditionalData_SingleWieldState" && !props?.AssociatedTagVariant) continue;

		const collectFrom = (obj, subtypeSet) => {
			if (!obj || !obj.AssetPathName) return;
			const assetPath = obj.AssetPathName;
			const gab = assetPath.split('/').pop().split('.')[0];
			const subtype = get_subtype_from_GAB(gab);
			if (subtype) subtypeSet.add(subtype);
		};

		collectFrom(props.PrimaryFireAbility, primaryFireSubtypes);
		collectFrom(props.PrimaryFireAbility_InState, inStateSubtypes);
	}

	const combinedSubtypes = [
		...primaryFireSubtypes,
		...inStateSubtypes
	];
	if (combinedSubtypes.length === 0) return "";

	return `${combinedSubtypes.map(item => `{{Cosmetic Subtypes|${item}}}`).join(' ')}`;
}

function extractSubtype(tags, cosmeticType) {
	const subtypeMap = {
		"Car Body": {
			"Vehicle.Archetype.SUV": "SUV",
			"Vehicle.Archetype.SportsCar": "Sports Car"
		},
	};
	
	const typeSubtypes = subtypeMap[cosmeticType];
	if (!typeSubtypes) return "";
	
	for (const [flag, label] of Object.entries(typeSubtypes)) {
		if (tags.includes(flag)) {
			return `{{Cosmetic Subtypes|${label}}}`;
		}
	}
	
	return "";
}

function parseBattlePassSeason(seasonInput) {
	const match = seasonInput.toUpperCase().match(/^C(\d+)(M)?S(\d+)$/);
	if (match) {
		return { chapter: match[1], season: match[3], mini: !!match[2] };
	}
	return null;
}

function are_there_shop_assets(entryMeta) {
	return entryMeta && entryMeta.dav2;
}

function hasLegoStyle(entryMeta) {
	return entryMeta && entryMeta.jido;
}

function hasBeanStyle(entryMeta) {
	return entryMeta && entryMeta.beanid;
}

async function hasLegoFeatured(entryMeta) {
	try {
		if (!entryMeta || !entryMeta.dav2) {
			return false;
		}
		const displayAssetData = await loadGzJson(`${DATA_BASE_PATH}${entryMeta.dav2}`);
		return displayAssetData.some(entry =>
			entry.Properties?.ContextualPresentations?.some(p =>
			p.ProductTag?.TagName === "Product.Juno"
		)
	  );
	} catch (error) {
		console.warn(`Failed to load DAv2 data for ${entryMeta.id}:`, error);
		return false;
	}
}

const VARIANT_TYPES = [
    "FortCosmeticAdditivePoseVariant",
    "FortCosmeticContextualAnimSceneEmoteVariant",
    "FortCosmeticItemDefRedirectVariant",
    "FortCosmeticMaterialVariant",
    "FortCosmeticMorphTargetVariant",
    "FortCosmeticTextVariant",
    "FortCosmeticRichColorVariant",
    "FortCosmeticCharacterPartVariant",
    "FortCosmeticMaterialParameterSetVariant",
    "FortCosmeticParticleVariant",
    "FortCosmeticLoadoutTagDrivenVariant",
    "FortCosmeticProfileLoadoutVariant",
    "FortCosmeticGameplayTagVariant",
    "FortCosmeticRankedVariant",
    "FortCosmeticProfileBannerVariant",
    "FortCosmeticFloatSliderVariant",
    "FortCosmeticPropertyVariant",
    "FortCosmeticNumericalVariant",
    "FortCosmeticMeshVariant"
];

function chunkList(lst, size) {
	return Array.from({ length: Math.ceil(lst.length / size) }, (_, i) => lst.slice(i * size, i * size + size));
}

let channelsWithDash = ["Shading"];

function generateStyleSection(data, name, cosmeticType, mainIcon) {
	const variantChannels = new Map();
	const previewImages = {};
	const featuredFiles = new Set();

	for (const variant of data) {
		if (typeof variant !== 'object' || !variant.Properties) {
			continue;
		}
		const props = variant.Properties;
		const channelName = (props.VariantChannelName?.SourceString || "").charAt(0).toUpperCase() + (props.VariantChannelName?.SourceString || "").slice(1);
		if (!channelName) {
			continue;
		}
		const options = props.PartOptions || props.MaterialOptions || props.ParticleOptions || [];
		for (const option of options) {
			if (typeof option !== 'object') {
				continue;
			}
			const variantName = option.VariantName?.SourceString || "";
			if (!variantName) {
				continue;
			}
			const formattedVariantName = variantName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			const previewImage = option.PreviewImage?.AssetPathName || "";
			previewImages[`${channelName},${formattedVariantName}`] = previewImage;
			if (!variantChannels.has(channelName)) {
				variantChannels.set(channelName, []);
			}
			variantChannels.get(channelName).push(formattedVariantName);
			if (previewImage !== mainIcon.large && previewImage !== mainIcon.icon) {
				const dash = channelsWithDash.includes(channelName) ? " -" : "";
				const imageFilename = (channelName === "Style" ? 
					`${name} (${formattedVariantName} - Featured) - ${cosmeticType} - Fortnite.png` : 
					`${name} (${channelName}${dash} ${formattedVariantName} - Featured) - ${cosmeticType} - Fortnite.png`);
				featuredFiles.add(imageFilename); // check DAv2 before adding to featuredFiles?
			}
		}
	}

	if (variantChannels.size === 0) {
		return ["", null, {}];
	}

	const styleTable = ["<center>", "{| class=\"reward-table\""];
	let notYet = true;
	for (const [channel, variants] of variantChannels) {
		const chunks = chunkList(variants, 3);
		const colspan = variants.length > 2 ? 3 : variants.length;
		if (!notYet) {
			styleTable.push("|-");
		}
		notYet = false;
		styleTable.push(`|colspan="${colspan}"|{{Style Header|${channel}}}`);
		for (const chunk of chunks) {
			styleTable.push("|-");
			styleTable.push(...chunk.map(v => `!{{Style Name|${v}}}`));
			styleTable.push("|-");
			for (const v of chunk) {
				const previewImage = previewImages[`${channel},${v}`] || "";
				const dash = channelsWithDash.includes(channel) ? " -" : "";
				const imageFile = ((previewImage == mainIcon.icon || previewImage == mainIcon.large) ? 
					`${name} - ${cosmeticType} - Fortnite.png` : 
					(channel === "Style" ? 
						`${name} (${v}) - ${cosmeticType} - Fortnite.png` : 
						`${name} (${channel}${dash} ${v}) - ${cosmeticType} - Fortnite.png`));
				styleTable.push(`|{{Style Background|${imageFile}}}`);
			}
		}
	}
	styleTable.push("|}");
	styleTable.push("</center>");

	const featured = (featuredFiles.size === 1 ? 
		Array.from(featuredFiles).pop() : 
		(featuredFiles.size > 0 ? 
			["<gallery>", ...Array.from(featuredFiles).sort().map((filename, idx) => `${filename}|${idx + 1}`), "</gallery>"].join("\n") : 
			null));

	return ["== Selectable Styles ==\n" + styleTable.join("\n"), featured, Object.fromEntries(variantChannels)];
}

async function generateDecalsTable(name, tags) {
	// Find tags that start with VehicleCosmetics.Body
	const bodyTags = (tags || []).filter(t => typeof t === 'string' && t.startsWith('VehicleCosmetics.Body'));
	if (bodyTags.length === 0) return;
	const matchingTags = new Set(bodyTags);
	
	// Search index for entries that have a carBodyTag field equal to any of the matchingTags
	const matchedIndexEntries = index.filter(e => {
		if (!e?.carBodyTag) return false;
		return Array.isArray(e.carBodyTag)
			? e.carBodyTag.some(tag => matchingTags.has(tag))
			: matchingTags.has(e.carBodyTag);
	});
	
	const decalRows = [];
	let currentIcons = [];
	let currentNames = [];
	
	for (const mi of matchedIndexEntries) {
		try {
			const json = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${mi.path}`);
			const itemDef = Array.isArray(json)
				? json.find(d => d.Type in TYPE_MAP) || json[0]
				: json;
			
			const localized = itemDef?.Properties?.ItemName?.LocalizedString;
			const rarity = itemDef?.Properties?.Rarity?.value || "Uncommon";
			const name = localized || mi.name || mi.id;
			const fileName = `${name} - Decal - Rocket Racing.png`;
			
			currentIcons.push(`{{${rarity} Rarity|[[File:${fileName}|130px|link=${name}]]}}`);
			currentNames.push(`{{Style Name|[[${name}]]}}`);
			
			if (currentIcons.length === 5) {
				decalRows.push(`|${currentIcons.join("\n|")}\n|-\n!${currentNames.join("\n!")}`);
				currentIcons = [];
				currentNames = [];
			}
		} catch (err) {
			console.warn(`Failed to add decal, ${mi.id || mi.path}:`, err);
		}
	}
	
	// Push any remaining decals
	if (currentIcons.length > 0) {
		decalRows.push(`|${currentIcons.join("\n|")}\n|-\n!${currentNames.join("\n!")}`);
	}
	
	if (decalRows.length > 0) {
		const decalSection = [
			"== Decals [[File:Decal - Icon - Fortnite.png|30px|link=Decals]] ==",
			`The following decals are available for ${name}:`,
			"<center>",
			"{|",
			...decalRows,
			"|}",
			"</center>"
		].join("\n");
		
		return decalSection + "\n";
	}
	
	return "";
}

function generateCompanionEmotePage(ID, name, rarity, settings) {
	const out = [];

	if (settings.displayTitle) {
		out.push(`{{DISPLAYTITLE:${name}}}`);
	}
	if (settings.isCollaboration) {
		out.push("{{Collaboration|Cosmetic}}");
	}
	if (settings.unreleasedTemplate && !settings.isFortniteCrew) {
		out.push("{{Unreleased|Cosmetic}}");
	}

	out.push("{{Infobox Cosmetics");
	out.push(`|name = ${name}`);
	out.push(`|image = ${name} - Sidekick Emote - Fortnite.png`);
	out.push(`|rarity = ${rarity}`);
	out.push("|type = Sidekick Emote");
	out.push(`|ID = ${ID}`);
	out.push("}}");
	out.push(`'''${name}''' is a {{Sidekick Emote}} in [[Fortnite]].`);

	return out.join("\n");
}

async function generateCosmeticPage(data, allData, settings, entryMeta) {
	if (!entryMeta.path && entryMeta.companionEmote) {
		const ID = entryMeta.id;
		const name = entryMeta.name;
		const rarity = entryMeta.rarity;

		return generateCompanionEmotePage(ID, name, rarity, settings);
	}

	const props = data.Properties;
	const ID = data.Name;
	const type = data.Type;
	const name = props.ItemName?.LocalizedString || "Unknown";
	const description = props.ItemDescription?.SourceString.trim() || "";
	let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
				 props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";

	let cosmeticType = props.ItemShortDescription?.SourceString.trim();
	if (!cosmeticType) {
		cosmeticType = TYPE_MAP[type] || "";
	}
	if (cosmeticType === "Shoes") {
		cosmeticType = "Kicks";
	}
	if (cosmeticType === "Companion") {
		cosmeticType = "Sidekick";
	}
	if (cosmeticType === "Vehicle Body") {
		cosmeticType = "Car Body";
	}
	if (cosmeticType === "Drift Trail") {
		cosmeticType = "Trail";
	}
	
	const isFestivalCosmetic = entryMeta.path && entryMeta.path.startsWith("Festival") && type != "AthenaDanceItemDefinition";
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
	
	const isRacingCosmetic = entryMeta.path && entryMeta.path.startsWith("Racing");

	let mainIcon = { large: "", icon: "" };
	let tags = [];
	let series = null;
	
	for (const entry of props.DataList || []) {
		if (typeof entry === 'object' && entry !== null) {
			if (entry.LargeIcon?.AssetPathName) {
				mainIcon.large = entry.LargeIcon.AssetPathName;
			}
			if (entry.Icon?.AssetPathName) {
				mainIcon.icon = entry.Icon.AssetPathName;
			}
			if (entry.Tags) {
				tags = entry.Tags;
			}
			if (entry.Series) {
				series = entry.Series.ObjectName?.split("'")?.slice(-2)[0];
				rarity = SERIES_CONVERSION[series] || rarity;
			}
		}
	}

	const setName = extractSetName(tags, cosmeticSets);
	const itemshop = tags.some(tag => tag.includes("ItemShop"));
	const hasVariants = tags.includes("Cosmetics.UserFacingFlags.HasVariants");
	const hasUnlockableVariants = tags.includes("Cosmetics.UserFacingFlags.HasUpgradeQuests");
	const isCrewProgressive = tags.includes("Cosmetics.CrewBling.Progressive");

	let styleSection = "";
	let featured = null;
	let variantChannels = {};
	if (hasVariants || hasUnlockableVariants || isCrewProgressive) {
		const variantData = Array.isArray(allData)
			? allData.filter(entry =>
					entry && typeof entry === 'object' && 'Type' in entry && VARIANT_TYPES.includes(entry.Type)
				)
			: [];

		[styleSection, featured, variantChannels] = generateStyleSection(variantData, name, cosmeticType, mainIcon);
	}

	const out = [];

	if (isFestivalCosmetic && instrumentType && cosmeticType != "Aura") {
		out.push(`{{DISPLAYTITLE:${name}}}`);
		out.push(`{{Instrument Disambig|${name}|${instrumentType}}}`);
	} else if (settings.displayTitle) {
		out.push(`{{DISPLAYTITLE:${name}}}`);
	}
	
	if (settings.isCollaboration) {
		out.push("{{Collaboration|Cosmetic}}");
	}
	
	if (settings.unreleasedTemplate && !settings.isFortniteCrew) {
		out.push("{{Unreleased|Cosmetic}}");
	}
	
	if (settings.isRocketLeagueCosmetic) {
		if (settings.isRocketLeagueExclusive) {
			out.push("{{Rocket League Exclusive}}");
		} else {
			out.push("{{Rocket League Cosmetic}}");
		}
	}
	
	out.push("{{Infobox Cosmetics");
	out.push(`|name = ${name}`);
	
	if (are_there_shop_assets(entryMeta) || (itemshop && cosmeticType != "Aura" && cosmeticType != "Reaction") || (cosmeticType == "Loading Screen" && settings.isBattlePass)) {
		if (isFestivalCosmetic) {
			if (cosmeticType != instrumentType) {
				if (instrumentType == "Drums") {
					out.push(`|image = ${name} - Pickaxe - Fortnite.png`);
				} else {
					out.push(`|image = ${name} - ${instrumentType} - Fortnite Festival.png`);
				}
			} else {
				out.push("|image = <gallery>");
				out.push(`${name} - ${instrumentType} - Fortnite Festival.png|Icon`);
				out.push(`${name} (Featured) - ${instrumentType} - Fortnite Festival.png|Featured`);
				out.push("</gallery>");
			}
		} else if (isRacingCosmetic) {
			if (cosmeticType == "Wheel") {
				out.push("|image = <gallery>");
				out.push(`${name} - Wheels - Rocket Racing.png|Icon`);
				out.push(`${name} (Featured) - Wheels - Rocket Racing.png|Featured`);
				out.push("</gallery>");
			} else {
				out.push("|image = <gallery>");
				out.push(`${name} - ${cosmeticType} - Rocket Racing.png|Icon`);
				out.push(`${name} (Featured) - ${cosmeticType} - Rocket Racing.png|Featured`);
				out.push("</gallery>");
			}
		} else {
			out.push("|image = <gallery>");
			out.push(`${name} - ${cosmeticType} - Fortnite.png|Icon`);
			out.push(`${name} (Featured) - ${cosmeticType} - Fortnite.png|Featured`);
			out.push("</gallery>");
		}
	} else if (cosmeticType == "Outfit" && settings.isBattlePass) {
		out.push("|image = <gallery>");
		out.push(`${name} - Outfit - Fortnite.png|Icon`);
		out.push(`${name} (Battle Pass) - Outfit - Fortnite.png|Featured`);
		out.push("</gallery>");
	} else {
		if (cosmeticType === "Spray") {
			out.push("|image = <gallery>");
			out.push(`${name} - ${cosmeticType} - Fortnite.png|Icon`);
			out.push(`${name} (Decal) - ${cosmeticType} - Fortnite.png|Decal`);
			out.push("</gallery>");
		} else {
			if (isFestivalCosmetic) {
				if (cosmeticType == "Aura") {
					out.push(`|image = ${name} - Aura - Fortnite Festival.png`);
				} else if (cosmeticType != instrumentType && instrumentType == "Drums") {
					out.push(`|image = ${name} - Pickaxe - Fortnite.png`);
				} else {
					out.push(`|image = ${name} - ${instrumentType} - Fortnite Festival.png`);
				}
			} else if (isRacingCosmetic) {
				if (cosmeticType === "Wheel") {
					out.push(`|image = ${name} - Wheels - Rocket Racing.png`);
				} else {
					out.push(`|image = ${name} - ${cosmeticType} - Rocket Racing.png`);
				}
			} else {
				out.push(`|image = ${name} - ${cosmeticType} - Fortnite.png`);
			}
		}
	}
	
	out.push(`|type = ${cosmeticType}`);
	
	let subtype = ""
	if (cosmeticType == "Pickaxe" && entryMeta.weaponDefinition) {
		subtype = await extractPickaxeSubtype(entryMeta.weaponDefinition);
	} else {
		subtype = extractSubtype(tags, cosmeticType);
	}
	if (subtype != "") {
		out.push(`|subtype = ${subtype}`);
	}
	
	out.push(`|rarity = ${rarity}`);
	
	if (isFestivalCosmetic && cosmeticType != "Aura") {
		let bundledWithString = "|bundled_with = ";
		if (instrumentType != cosmeticType) {
			bundledWithString = bundledWithString + `[[${name} (${instrumentType})|${name}]] <br> `;
			if (cosmeticType == "Back Bling") {
				bundledWithString = bundledWithString + `[[${name} (Pickaxe)|${name}]]`;
			} else if (cosmeticType == "Pickaxe") {
				bundledWithString = bundledWithString + `[[${name} (Back Bling)|${name}]]`;
			}
		} else {
			bundledWithString = bundledWithString + `[[${name} (Back Bling)|${name}]] <br> [[${name} (Pickaxe)|${name}]]`;
		}
		out.push(bundledWithString);
	}

	if (cosmeticType === "Outfit") {
		out.push("|character model = ");
		out.push("|body model = ");
	}
	
	const additional = extractAdditionals(tags);
	if (additional) {
		out.push(`|additional = ${additional}`);
	}

	if (setName) {
		out.push(`|set = [[:Category:${setName} Set|${setName}]]`);
	}

	// Unlocked section
	let unlocked = "";
	if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
		unlocked = `[[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]]`;
	} else if (settings.isBattlePass && settings.bpPage && settings.bpChapter && settings.bpSeasonNum) {
		const freeFlag = settings.passFreeBP ? "|Free" : "";
		const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
		const miniSeasonFlag = settings.isMiniSeason ? "/MiniSeason" : "";
		unlocked = `${bonusFlag}Page ${settings.bpPage} <br> {{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}${freeFlag}}}`;
	} else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
		const freeFlag = settings.passFreeOG ? "|Free" : "";
		unlocked = `Page ${settings.ogPage} <br> {{OGPass|${settings.ogSeason}${freeFlag}}}`;
	} else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
		const freeFlag = settings.passFreeMusic ? "|Free" : "";
		unlocked = `Page ${settings.musicPage} <br> {{MusicPass|${settings.musicSeason}${freeFlag}}}`;
	} else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason && settings.legoSeasonAbbr) {
		const freeFlag = settings.passFreeLego ? "|Free" : "|";
		unlocked = `Page ${settings.legoPage} <br> {{LEGOPass|${settings.legoSeason}${freeFlag}|${settings.legoSeasonAbbr}}}`;
	} else if (settings.isItemShop && (settings.shopCost || bundlesEntries.length == 0)) {
		unlocked = "[[Item Shop]]";
	}
	if (settings.isItemShop && bundlesEntries.length > 0) {
		const bundleNames = bundlesEntries
			.map(be => {
				if (!be.bundleName || !be.bundleName.value) return null;
				const rawName = be.bundleName.value.trim();
				const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
				return `[[${name}]]`;
			})
			.filter(bn => bn !== null);
		if (bundleNames.length > 0) {
			unlocked = unlocked ? unlocked + " <br> " + bundleNames.join(" <br> ") : bundleNames.join(" <br> ");
		}
	}
	out.push(`|unlocked = ${unlocked}`);

	// Cost section
	let cost = "";
	if ((settings.isBattlePass && settings.passFreeBP) || (settings.isOGPass && settings.passFreeOG) || (settings.isMusicPass && settings.passFreeMusic) || (settings.isLEGOPass && settings.passFreeLego)) {
		cost = "Free";
	} else if (settings.isFortniteCrew || rarity === "Crew Series") {
		cost = "$11.99 <br /> ({{Fortnite Crew}})";
	} else if (settings.isBattlePass && settings.bpChapter && settings.bpSeasonNum) {
		const miniSeasonFlag = settings.isMiniSeason ? "/MiniSeason" : "";
		cost = `{{V-Bucks|1,000}} <br> ({{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}}})`;
	} else if (settings.isOGPass && settings.ogSeason) {
		cost = `{{V-Bucks|1,000}} <br> ({{OGPass|${settings.ogSeason}}})`;
	} else if (settings.isMusicPass && settings.musicSeason) {
		cost = `{{V-Bucks|1,400}} <br> ({{MusicPass|${settings.musicSeason}}})`;
	} else if (settings.isLEGOPass && settings.legoSeason && settings.legoSeasonAbbr) {
		cost = `{{V-Bucks|1,400}} <br> ({{LEGOPass|${settings.legoSeason}||${settings.legoSeasonAbbr}}})`;
	} else if (settings.isItemShop && settings.shopCost) {
		cost = ensureVbucksTemplate(settings.shopCost);
	}
	
	if (settings.isItemShop && bundlesEntries.length > 0) {
		const bundleCosts = bundlesEntries
			.map(be => {
				if (be.bundleName.value && be.bundleCost.value) {
					const rawName = be.bundleName.value.trim();
					const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
					return `${ensureVbucksTemplate(be.bundleCost.value.trim())} <small>([[${name}]])</small>`;
				}
				return null;
			})
			.filter(bc => bc !== null);
		if (bundleCosts.length > 0) {
			cost = cost ? cost + " <br > " + bundleCosts.join(" <br> ") : bundleCosts.join(" <br> ");
		}
	}

	out.push(`|cost = ${cost}`);
	
	if (settings.updateVersion != "") {
		out.push(`|added_in = [[Update v${settings.updateVersion}]]`);
	} else {
		out.push("|added_in = ");
	}

	// Release section
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
	} else if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
		release = `[[Item Shop History/${settings.crewMonth} 1st ${settings.crewYear}|${settings.crewMonth} 1st ${settings.crewYear}]]`;
	} else if (settings.isBattlePass && settings.bpChapter && settings.bpSeasonNum) {
		const seasonKey = `C${settings.bpChapter}${settings.isMiniSeason ? 'M' : ''}S${settings.bpSeasonNum}`;
		const seasonReleaseDate = SEASON_RELEASE_DATES[seasonKey];
		if (seasonReleaseDate) {
			release = getFormattedReleaseDate(seasonReleaseDate);
		} else {
			release = getFormattedReleaseDate();
		}
	} else if (settings.isOGPass && settings.ogSeason) {
		const ogReleaseDate = OG_SEASON_RELEASE_DATES[settings.ogSeason];
		if (ogReleaseDate) {
			release = getFormattedReleaseDate(ogReleaseDate);
		} else {
			release = getFormattedReleaseDate();
		}
	}
	else if (settings.isMusicPass && settings.musicSeason) {
		const musicReleaseDate = FESTIVAL_SEASON_RELEASE_DATES[settings.musicSeason];
		if (musicReleaseDate) {
			release = getFormattedReleaseDate(musicReleaseDate);
		}
		else {
			release = getFormattedReleaseDate();
		}
	}
	else if (settings.isLEGOPass && settings.legoSeason) {
		const legoReleaseDate = LEGO_SEASON_RELEASE_DATES[settings.legoSeason];
		if (legoReleaseDate) {
			release = getFormattedReleaseDate(legoReleaseDate);
		}
		else {
			release = getFormattedReleaseDate();
		}
	}
	out.push(`|release = ${release}`);
	
	if (settings.isItemShop && settings.includeAppearances) {
		out.push(`|appearances = ${settings.shopAppearances}`);
	}

	if (featured) {
		out.push(`|featured = ${featured}`);
	}

	out.push(`|ID = ${ID}`);

	// LEGO and Bean style support
	if (cosmeticType === "Outfit") {
		const hasLegoStyleFlag = hasLegoStyle(entryMeta);
		const hasBeanStyleFlag = hasBeanStyle(entryMeta);
		
		if (hasLegoStyleFlag) {
			out.push("|LEGOUse = y");
			// Only set LEGOID if it's not simply "JIDO_" + cosmetic ID
			if (entryMeta.jido && entryMeta.jido !== `JIDO_${ID}`) {
				out.push(`|LEGOID = ${entryMeta.jido}`);
			}
		}
		
		if (hasBeanStyleFlag) {
			out.push("|FGUse = y");
			out.push(`|BeanID = ${entryMeta.beanid}`);
		}
	} else if (cosmeticType === "Emote") {
		const hasLegoStyleFlag = hasLegoStyle(entryMeta);
		
		if (hasLegoStyleFlag) {
			out.push("|LEGOUse = y");
			// Only set LEGOID if it's not simply "JIDO_" + cosmetic ID
			if (entryMeta.jido && entryMeta.jido !== `JIDO_${ID}`) {
				out.push(`|LEGOID = ${entryMeta.jido}`);
			}
		}
	}

	if (cosmeticType === "Loading Screen") {
		out.push(`|full_screen = ${name} (Full) - ${cosmeticType} - Fortnite.png`);
	}

	out.push(`}}{{Quotation|${description}}}`);

	// Article section
	let article = `'''${name}''' is ${articleFor(rarity)} {{${rarity}}} [[${cosmeticType}]] in [[Fortnite]]`;
	
	const obtainedOnPageCompletion =
		(settings.isBattlePass && settings.bpPageCompletion) ||
		(settings.isOGPass && settings.ogPageCompletion) ||
		(settings.isMusicPass && settings.musicPageCompletion) ||
		(settings.isLEGOPass && settings.legoPageCompletion);
	
	const pageCompletionFlag = obtainedOnPageCompletion ? " by purchasing all cosmetics" : "";

	if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
		article += ` that can be obtained by becoming a member of the [[Fortnite Crew]] during ${settings.crewMonth} ${settings.crewYear}, as part of the [[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]].`;
	} else if (settings.isBattlePass && settings.bpPage && settings.bpChapter && settings.bpSeasonNum) {
		const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
		const miniSeasonFlag = settings.isMiniSeason ? "Mini " : "";
		article += ` that can be obtained${pageCompletionFlag} on ${bonusFlag}Page ${settings.bpPage} of the [[Chapter ${settings.bpChapter}: ${miniSeasonFlag}Season ${settings.bpSeasonNum}]] [[Battle Pass]].`;
	} else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
		article += ` that can be obtained${pageCompletionFlag} on Page ${settings.ogPage} of the [[OG Pass#Season ${settings.ogSeason}|Season ${settings.ogSeason} OG Pass]].`;
	} else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
		article += ` that can be obtained${pageCompletionFlag} on Page ${settings.musicPage} of the [[Music Pass#Season ${settings.musicSeason}|Season ${settings.musicSeason} Music Pass]].`;
	} else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason) {
		article += ` that can be obtained${pageCompletionFlag} on Page ${settings.legoPage} of the [[LEGO Fortnite:LEGO® Pass#${settings.legoSeason}|${settings.legoSeason} LEGO® Pass]].`;
	} else if (settings.isItemShop) {
		let bundles = "";
		if (bundlesEntries.length > 0) {
			const bundlesToAdd = bundlesEntries
				.map(be => {
					if (be.bundleName.value && be.bundleCost.value) {
						const rawName = be.bundleName.value.trim();
						const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
						const theFlag = rawName.toLowerCase().startsWith("the ") ? "" : "the ";
						const i = bundlesEntries.indexOf(be);
						const previousHas = i > 0 && bundlesEntries.slice(0, i).some(b => b.bundleName && b.bundleName.value && b.bundleCost && b.bundleCost.value);
						const orFlag = (settings.shopCost || previousHas) ? " or " : "";
						return `${orFlag}with ${theFlag}[[${name}]] for ${ensureVbucksTemplate(be.bundleCost.value.trim())}`;
					}
					return null;
				})
				.filter(bc => bc !== null);
			if (bundlesToAdd.length > 0) {
				bundles = bundlesToAdd.join("");
			}
		}

		const itemShopFlag = settings.shopCost ? `in the [[Item Shop]] for ${ensureVbucksTemplate(settings.shopCost)}` : "";
		if (itemShopFlag || bundles) {
			article += ` that can be purchased ${itemShopFlag}${bundles}.`;
		} else {
			if (settings.unreleasedTemplate) {
				article += " that is currently unreleased";;
			}
			article += ".";
			
		}
	} else if (settings.unreleasedTemplate) {
		article += " that is currently unreleased.";
	} else {
		article += ".";
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

				if (chapter && season) {
					if (mini) {
						seasonFirstReleasedFlag = ` was first released in [[Chapter ${chapter}: Mini Season ${season}]]`;
					} else {
						seasonFirstReleasedFlag = ` was first released in [[Chapter ${chapter}: Season ${season}]]`;
					}
				}
			}
		}
	}
	
	if (setName && seasonFirstReleasedFlag) {
		const theFlag = setName.toLowerCase().startsWith("the ") ? "" : "the ";
		article += ` ${name}${seasonFirstReleasedFlag} and is part of ${theFlag}[[:Category:${setName} Set|${setName} Set]].`;
	} else if (setName) {
		const theFlag = setName.toLowerCase().startsWith("the ") ? "" : "the ";
		article += ` ${name} is part of ${theFlag}[[:Category:${setName} Set|${setName} Set]].`;
	} else if (seasonFirstReleasedFlag) {
		article += ` ${name}${seasonFirstReleasedFlag}.`;
	}
	out.push(article + "\n");

	if (styleSection) {
		out.push(styleSection + "\n");
		if (isCrewProgressive) {
			let legacyStyles = [];
			for (const [channel, variants] of Object.entries(variantChannels)) {
				if (channel.toLowerCase() === "style") {
					for (const v of variants) {
						if (v !== name) {
							legacyStyles.push(v);
						}
					}
				}
			}

			if (legacyStyles.length === 5) {
				out.push("=== How To Unlock? ===");
				legacyStyles.forEach((style, i) => {
					const index = i + 1;
					if (index === legacyStyles.length) {
						out.push(`* ''${style}'' - Subscribe to the [[Fortnite Crew|Crew]] for ${index} additional month${index > 1 ? 's' : ''}\n`);
					} else {
						out.push(`* ''${style}'' - Subscribe to the [[Fortnite Crew|Crew]] for ${index} additional month${index > 1 ? 's' : ''}`);
					}
				});
			}
		} else if (settings.battlePassMode) {
			out.push("=== How To Unlock? ===\n");
		}
	}
	
	// Decals section for Car Bodies
	if (isRacingCosmetic && cosmeticType === "Car Body") {
		const decalsTable = await generateDecalsTable(name, tags);
		out.push(decalsTable);
	}

	// Featured Characters table (for Loading Screens only)
	if (cosmeticType === "Loading Screen" && featuredCharactersEntries.length > 0) {
		let featuredCharactersSection = ["== Featured Characters ==", "{|class=\"reward-table\""];

		let currentIcons = [];
		let currentNames = [];
		for (const fcEntry of featuredCharactersEntries) {
			const fcName = fcEntry.wrapper.querySelector('.character-name');
			const fcFile = fcEntry.wrapper.querySelector('.character-file');

			if (!fcFile || !fcFile.value || !fcName || !fcName.value) continue;

			const file = fcFile.value.trim();
			const pageTitle = fcFile.dataset.pageTitle || (fcName ? fcName.value : '').trim();
			const displayName = (fcName && fcName.value) ? fcName.value.trim() : (pageTitle || '').trim();

			currentIcons.push(`|{{Style Background|${file}|link=${pageTitle}}}`);
			
			if (pageTitle !== displayName) {
				currentNames.push(`![[${pageTitle}|${displayName}]]`);
			} else {
				currentNames.push(`![[${displayName}]]`);
			}

			if (currentIcons.length === 3) {
				featuredCharactersSection.push(currentIcons.join("\n"));
				featuredCharactersSection.push("|-");
				featuredCharactersSection.push(currentNames.join("\n"));
				featuredCharactersSection.push("|-");
				currentIcons = [];
				currentNames = [];
			}

		}

		// Push any remaining featured characters
		if (currentIcons.length > 0) {
			featuredCharactersSection.push(currentIcons.join("\n"));
			featuredCharactersSection.push("|-");
			featuredCharactersSection.push(currentNames.join("\n"));
		} else {
			featuredCharactersSection.pop(); // Remove last "|-"
		}

		featuredCharactersSection.push("|}");

		out.push(featuredCharactersSection.join("\n") + "\n");

	}

	// LEGO and Bean Style Templates (for Outfits only)
	if (cosmeticType === "Outfit") {
		const hasLegoStyleFlag = hasLegoStyle(entryMeta);
		const hasBeanStyleFlag = hasBeanStyle(entryMeta);
		
		if (hasLegoStyleFlag) {
			const hasLegoFeaturedRender = await hasLegoFeatured(entryMeta);
			if (isCrewProgressive || !hasLegoFeaturedRender) {
				out.push(`{{LEGO Style|${name}|featured=n}}`);
			} else {
				out.push(`{{LEGO Style|${name}}}`);
			}
		}
		
		if (hasBeanStyleFlag) {
			out.push(`{{Bean Style|${name}}}`);
		}

		if (hasLegoStyleFlag || hasBeanStyleFlag) {
			out.push("");
		}
	} else if (cosmeticType === "Emote") {
		const hasLegoStyleFlag = hasLegoStyle(entryMeta);
		if (hasLegoStyleFlag) {
			out.push(`{{LEGO Emote|${name}}}`);
			out.push("");
		}
	}
	
	if (settings.isItemShop && settings.includeAppearances) {
		const appearancesSection = [];
		appearancesSection.push("== [[Item Shop]] Appearances ==", "{{ItemShopAppearances", `|name = ${settings.shopAppearances}`);
		if (settings.shopAppearances != name) {
			appearancesSection.push(`|name2 = ${name}`);
		}
		if (bundlesEntries.length == 1 && settings.shopCost == "" ) {
			const be = bundlesEntries[0];
			if (be.bundleName && be.bundleName.value) {
				const rawName = be.bundleName.value.trim();
				const bundleName = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
				appearancesSection.push(`|bundled_with = ${bundleName}`);
			}
		}
		appearancesSection.push("}}");

		out.push(appearancesSection.join('\n') + "\n");
	}
	
	if (isFestivalCosmetic && cosmeticType == "Back Bling") {
		out.push(`== Trivia ==\n* ${name} will come off the player's back when equipped with the [[${name} (Pickaxe)|${name}]] [[Pickaxe]].\n`);
	}

	if (cosmeticType === "Emoticon" && tags.includes("Cosmetics.UserFacingFlags.Emoticon.Animated") && props.SpriteSheet) {
		out.push(`== Gallery ==\n<tabber>\n|-|Other=\n=== Other ===\n<gallery>\n${name} (Sheet) - ${cosmeticType} - Fortnite.png|Sprite Sheet\n</gallery>\n</tabber>\n`);
	}

	// Categories
	if (setName) {
		out.push(`[[Category:${setName} Set]]`);
	}

	if (hasUnlockableVariants) {
		out.push("[[Category:Unlockable Styles]]");
	}

	if ((settings.isBattlePass && settings.passFreeBP) || (settings.isOGPass && settings.passFreeOG) || (settings.isMusicPass && settings.passFreeMusic) || (settings.isLEGOPass && settings.passFreeLego)) {
		out.push("[[Category:Free Cosmetics]]");
	}
	
	if (isFestivalCosmetic && (cosmeticType != instrumentType)) {
		out.push("[[Category:Compatible Cosmetics]]");
	}
	
	return out.join("\n");
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
		elements.output.textContent = content;
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
	const cosmeticInput = elements.cosmeticInput.value.trim();
	const cosmeticDisplayInput = elements.cosmeticDisplayInput.value.trim();
	const isReleased = elements.releasedSwitch.checked;
	
	// Get source selection
	const isItemShop = elements.sourceItemShop.checked;
	const isBattlePass = elements.sourceBattlePass.checked;
	const isFortniteCrew = elements.sourceFortniteCrew.checked;
	const isOGPass = elements.sourceOGPass.checked;
	const isMusicPass = elements.sourceMusicPass.checked;
	const isLEGOPass = elements.sourceLEGOPass.checked;
	
	const isCollaboration = elements.collaboration.checked;
	
	const isRocketLeagueCosmetic = elements.isRocketLeagueCosmetic.checked;
	const isRocketLeagueExclusive = elements.isRocketLeagueExclusive.checked;

	if (!cosmeticInput) {
		showStatus('Please enter a cosmetic ID or name', 'error');
		return;
	}

	// Source-specific validation
	if (isBattlePass) {
		const seasonInput = elements.bpSeason.value.trim();
		const pageInput = elements.bpPage.value.trim();
		
		if (!seasonInput || !pageInput) {
			showStatus('Please fill in Battle Pass season and page', 'error');
			return;
		}
		
		if (!parseBattlePassSeason(seasonInput)) {
			showStatus('Invalid season format. Use format like C6S4', 'error');
			return;
		}
	}

	if (isFortniteCrew) {
		const month = elements.crewMonth.value;
		const year = elements.crewYear.value;
		
		if (!month || !year) {
			showStatus('Please select crew month and year', 'error');
			return;
		}
	}
	
	if (isOGPass) {
		const seasonInput = elements.ogSeason.value.trim();
		const pageInput = elements.ogPage.value.trim();
		
		if (!seasonInput || !pageInput) {
			showStatus('Please fill in OG Pass season and page', 'error');
			return;
		}
	}
	
	if (isMusicPass) {
		const seasonInput = elements.musicSeason.value.trim();
		const pageInput = elements.musicPage.value.trim();
		
		if (!seasonInput || !pageInput) {
			showStatus('Please fill in Music Pass season and page', 'error');
			return;
		}
	}
	
	if (isLEGOPass) {
		const seasonInput = elements.legoSeason.value.trim();
		const seasonAbbrInput = elements.legoSeasonAbbr.value.trim();
		const pageInput = elements.legoPage.value.trim();
		
		if (!seasonInput || !seasonAbbrInput || !pageInput) {
			showStatus('Please fill in LEGO Pass season, abbreviation and page', 'error');
			return;
		}
	}

	try {
		showStatus('Searching for cosmetic...', 'loading');
		
		const inputId = document.getElementById("cosmetic-input").value;
		const result = await searchCosmetic(cosmeticInput);
		const { data, allData, entryMeta } = result;

		if (!data) {
			if (!entryMeta.companionEmote) {
				showStatus('Cosmetic not found', 'error');
				return;
			}
		}

		showStatus('Generating page...', 'loading');

		// Build settings object for the new interface
		const settings = {
			displayTitle: elements.displayTitle.checked,

			updateVersion: elements.updateVersion.value.trim(),
			unreleasedTemplate: !isReleased, // Automatically set based on released state
			releaseDate: isReleased ? elements.releaseDate.value : "",
			itemShopHistory: isReleased ? elements.itemShopHistory.checked : false,
			shopHistoryPart: isReleased ? elements.shopHistoryPart.value : "",
			
			// Source settings
			isItemShop,
			isBattlePass,
			isFortniteCrew,
			isOGPass,
			isMusicPass,
			isLEGOPass,
			
			// Collaboration
			isCollaboration,
			
			// Racing
			isRocketLeagueCosmetic,
			isRocketLeagueExclusive,
			
			// Item Shop specific
			shopCost: elements.shopCost.value,
			includeAppearances: elements.includeAppearances.checked,
			shopAppearances: elements.shopAppearances.value,
			
			// Battle Pass specific
			bpPage: elements.bpPage.value,
			bpBonus: elements.bpBonus.checked,
			bpPageCompletion: elements.bpPageCompletion.checked,
			
			// Metaverse pass specific
			ogSeason: elements.ogSeason.value,
			ogPage: elements.ogPage.value,
			ogPageCompletion: elements.ogPageCompletion.checked,
			musicSeason: elements.musicSeason.value,
			musicPage: elements.musicPage.value,
			musicPageCompletion: elements.musicPageCompletion.checked,
			legoSeason: elements.legoSeason.value,
			legoSeasonAbbr: elements.legoSeasonAbbr.value,
			legoPage: elements.legoPage.value,
			legoPageCompletion: elements.legoPageCompletion.checked,
			
			// Free in any Pass (per pass)
			passFreeBP: elements.passFreeBP && elements.passFreeBP.checked,
			passFreeOG: elements.passFreeOG && elements.passFreeOG.checked,
			passFreeMusic: elements.passFreeMusic && elements.passFreeMusic.checked,
			passFreeLego: elements.passFreeLego && elements.passFreeLego.checked,
			
			// Fortnite Crew specific
			crewMonth: elements.crewMonth.value,
			crewYear: elements.crewYear.value
		};

		// Add parsed battle pass data if applicable
		if (isBattlePass && elements.bpSeason.value) {
			const seasonData = parseBattlePassSeason(elements.bpSeason.value.trim());
			if (seasonData) {
				settings.bpChapter = seasonData.chapter;
				settings.bpSeasonNum = seasonData.season;
				settings.isMiniSeason = seasonData.mini;
			}
		}

		const pageContent = await generateCosmeticPage(data, allData, settings, entryMeta);
		
		displayOutput(pageContent);
		showStatus('Page generated successfully!', 'success');
		setTimeout(hideStatus, 2000);

	} catch (error) {
		console.error('Error generating page:', error);
		showStatus('Error generating page: ' + error.message, 'error');
	}
}

// Create a new bundle entry DOM and hook up suggestion behavior
function createBundleEntry() {
	const list = document.getElementById('bundles-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'bundle-entry';

	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'enter bundle ID or Name';
	input.className = 'bundle-display';
	input.id = `bundle-display-${bundlesEntries.length + 1}`;
	input.style = "display: block; margin-left: auto; margin-right: auto;";

	const optionsWrapper = document.createElement('div');
	optionsWrapper.style.display = 'flex';
	optionsWrapper.style.justifyContent = 'center';
	optionsWrapper.style.alignItems = 'center';
	optionsWrapper.style.gap = '1rem';
	optionsWrapper.style.display = 'none';

	const bundleCost = document.createElement('input');
	bundleCost.type = 'text';
	bundleCost.inputMode = 'numeric';
	bundleCost.pattern = '^[0-9,]+$';
	bundleCost.placeholder = 'V-Bucks cost';
	bundleCost.className = 'vbucks-cost';
	bundleCost.style.width = '150px';

	const titleCaseLabel = document.createElement('label');
	titleCaseLabel.textContent = 'Force title case? ';
	titleCaseLabel.htmlFor = 'force-title-case';

	const forceTitleCase = document.createElement('input');
	forceTitleCase.type = 'checkbox';
	forceTitleCase.className = 'force-title-case';
	forceTitleCase.title = 'Force Title Case';

	const bundleID = document.createElement('input');
	bundleID.type = 'hidden';
	bundleID.className = 'bundle-input';
	bundleID.id = `bundle-id-${bundlesEntries.length + 1}`;

	const bundleName = document.createElement('input');
	bundleName.type = 'hidden';
	bundleName.className = 'bundle-input-name';
	bundleName.id = `bundle-name-${bundlesEntries.length + 1}`;

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	input.addEventListener('input', () => updateBundleSuggestions(input, bundleID, bundleName, optionsWrapper, suggestions));

	wrapper.appendChild(input);
	optionsWrapper.appendChild(bundleCost);
	optionsWrapper.appendChild(titleCaseLabel);
	optionsWrapper.appendChild(forceTitleCase);
	wrapper.appendChild(optionsWrapper);
	wrapper.appendChild(bundleID);
	wrapper.appendChild(bundleName);
	wrapper.appendChild(suggestions);

	list.appendChild(wrapper);
	bundlesEntries.push({bundleID, bundleName, bundleCost, forceTitleCase, wrapper});
	input.focus();
}

function removeBundleEntry() {
	if (bundlesEntries.length === 0) return;
	const entry = bundlesEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateBundleSuggestions(displayEl, hiddenIdEl, hiddenNameEl, optionsWrapper, sugDiv) {
	const input = displayEl.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!input) return;

	if (!Array.isArray(index) || index.length === 0) return;

	const scoredMatches = index
		.filter(e => {
			if (typeof e.id === 'string' || typeof e.name === 'string') return false;
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
			displayEl.value = `${entry.bundle_name} (${entry.bundle_id})`;
			optionsWrapper.style.display = 'flex';
			hiddenIdEl.value = entry.bundle_id;
			hiddenNameEl.value = entry.bundle_name;
			sugDiv.innerHTML = '';
		};
		sugDiv.appendChild(div);
	});
}

function createFeaturedCharactersSection() {
	const section = document.createElement('section');
	section.id = 'featured-characters-config';
	section.innerHTML = '<h4>Featured Characters</h4>';

	const controlsWrapper = document.createElement('div');
	controlsWrapper.className = 'featured-characters-controls';

	const addCharacterBtn = document.createElement('button');
	addCharacterBtn.id = 'add-featured-character';
	addCharacterBtn.className = 'sec-subm';
	addCharacterBtn.textContent = 'add';

	addCharacterBtn.onclick = () => { addFeaturedCharacterEntry(false); };

	const addMysteryCharacterBtn = document.createElement('button');
	addMysteryCharacterBtn.id = 'add-mystery-featured-character';
	addMysteryCharacterBtn.className = 'sec-subm';
	addMysteryCharacterBtn.textContent = 'add mystery';

	addMysteryCharacterBtn.onclick = () => { addFeaturedCharacterEntry(true); };

	const removeCharacterBtn = document.createElement('button');
	removeCharacterBtn.id = 'remove-featured-character';
	removeCharacterBtn.className = 'sec-subm secondary';
	removeCharacterBtn.textContent = 'remove';

	removeCharacterBtn.onclick = () => { removeFeaturedCharacterEntry(); };

	controlsWrapper.appendChild(addCharacterBtn);
	controlsWrapper.appendChild(addMysteryCharacterBtn);
	controlsWrapper.appendChild(removeCharacterBtn);

	const listWrapper = document.createElement('div');
	listWrapper.id = 'featured-characters-list';
	listWrapper.className = 'scrollbox';

	section.appendChild(controlsWrapper);
	section.appendChild(listWrapper);

	const searchSection = document.getElementById('cosmetic-search-section');
	searchSection.parentNode.insertBefore(section, searchSection.nextSibling);
}

function addFeaturedCharacterEntry(mystery = false) {
	const list = document.getElementById('featured-characters-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'featured-character-entry';

	const input = document.createElement('input');
	if (!mystery) {
		input.type = 'text';
		input.placeholder = 'enter featured character name';
		input.className = 'featured-character-input';

		const suggestions = document.createElement('div');
		suggestions.className = 'suggestions';

		input.addEventListener('input', () => updateFeaturedCharacterSuggestions(input, suggestions));

		wrapper.appendChild(input);
		wrapper.appendChild(suggestions);
	}

	const detailsWrapper = document.createElement('div');
	detailsWrapper.className = 'featured-character-details';
	detailsWrapper.style.display = 'flex';
	detailsWrapper.style.justifyContent = 'center';
	detailsWrapper.style.alignItems = 'center';
	detailsWrapper.style.gap = '1rem';
	detailsWrapper.style.display = mystery ? 'flex' : 'none';

	const character_name = document.createElement('input');
	character_name.type = 'text';
	character_name.className = 'character-name';
	if (!mystery) character_name.placeholder = 'character name';
	if (mystery) character_name.value = "Unknown";
	character_name.style.width = mystery ? '15%' : '30%';
	character_name.style.textAlign = 'center';
	character_name.disabled = true;

	const character_file = document.createElement('input');
	character_file.type = 'text';
	character_file.className = 'character-file';
	if (!mystery) character_file.placeholder = 'file name';
	if (mystery) character_file.value = "??? - Mystery Reward - Fortnite.png";
	character_file.style.width = '60%';
	character_file.style.textAlign = 'center';
	character_file.disabled = true;

	detailsWrapper.appendChild(character_name);
	detailsWrapper.appendChild(character_file);

	wrapper.appendChild(detailsWrapper);
	list.appendChild(wrapper);

	if (mystery) {
		featuredCharactersEntries.push({
			wrapper,
			character_name: character_name, character_file: character_file
		});
	} else {
		featuredCharactersEntries.push({
			wrapper,
			input: input,
			character_name: character_name, character_file: character_file,
			suggestions: suggestions
		});
	}
}

function removeFeaturedCharacterEntry() {
	const list = document.getElementById('featured-characters-list');
	if (!list || list.children.length === 0) return;
	list.removeChild(list.lastChild);
}

function updateFeaturedCharacterSuggestions(inputEl, sugDiv) {
	const input = inputEl.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!input) return;
	
	if (!Array.isArray(index) || index.length === 0) return;

	// Only want Outfits, Back Blings, Gliders and Sidekicks
	const candidateIndex = index.filter(e => {
		if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
		if (typeof e.banner_id === 'string' || typeof e.banner_icon === 'string') return false;
		if (
			!e.id.startsWith('Character_') && !e.id.startsWith('CID_') &&
			!e.id.startsWith('Backpack_') && !e.id.startsWith('BID_') &&
			!e.id.startsWith('Glider_') &&
			!e.id.startsWith('Companion_')
		) return false;
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
		div.onclick = async () => {
			sugDiv.innerHTML = '';

			inputEl.style.display = 'none';
			const detailsWrapper = inputEl.parentNode.querySelector('.featured-character-details');
			detailsWrapper.style.display = 'flex';

			const character_name = detailsWrapper.querySelector('.character-name');
			const character_file = detailsWrapper.querySelector('.character-file');

			character_name.value = entry.name;
			character_file.value = 'Resolving image...';

			const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${entry.path}`);
			if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) return;
			let itemDefinitionData = cosmeticData.find(dataEntry => dataEntry.Type in TYPE_MAP) || cosmeticData[0];

			const ID = itemDefinitionData.Name;
			let cosmeticType = itemDefinitionData.Properties.ItemShortDescription?.SourceString.trim() || TYPE_MAP[itemDefinitionData.Type] || "";

			if (cosmeticType === "Companion") {
				cosmeticType = "Sidekick";
			}

			try {
				const res = await getMostUpToDateImage(entry.name, cosmeticType);
				character_file.value = res.file;
				character_file.dataset.pageTitle = res.pageTitle || entry.name;
			} catch (err) {
				console.warn('Failed to resolve best image for', entry.name, err);
				character_file.value = `${entry.name} - ${cosmeticType} - Fortnite.png`;
				character_file.dataset.pageTitle = entry.name;
			}
		};
		sugDiv.appendChild(div);
	});
}

/**
 * Query the Fandom MediaWiki API for images on a page title.
 * Returns an array of filenames (without the leading "File:").
 */
async function fetchWikiImageFiles(title) {
	try {
		const endpoint = 'https://fortnite.fandom.com/api.php';
		const params = new URLSearchParams({
			action: 'query',
			prop: 'images',
			titles: title,
			format: 'json',
			imlimit: 'max',
			origin: '*'
		});
		const url = `${endpoint}?${params.toString()}`;
		const resp = await fetch(url);
		if (!resp.ok) return [];
		const json = await resp.json();
		const pages = json.query && json.query.pages ? json.query.pages : {};
		const files = [];
		for (const pid of Object.keys(pages)) {
			const p = pages[pid];
			if (p && p.images) {
				for (const im of p.images) {
					if (im && im.title && im.title.startsWith('File:')) {
						files.push(im.title.replace(/^File:/, ''));
					}
				}
			}
		}
		return files;
	} catch (err) {
		console.warn('fetchWikiImageFiles error', err);
		return [];
	}
}

/**
 * Given a character name, attempt to pick the most up-to-date image filename.
 * Strategy:
 *  - Try page titled "{name} (Outfit)" first, then "{name}".
 *  - Prefer filenames containing a version token like "(v30.00)" with the highest numeric version.
 *  - Fallback to "{name} - Outfit - Fortnite.png".
 */
async function getMostUpToDateImage(name, cosmeticType) {
	const tryTitles = [`${name} (${cosmeticType})`, name];
	for (const t of tryTitles) {
		const files = await fetchWikiImageFiles(t);
		if (!files || files.length === 0) continue;

		// Find versioned files like "Peely (v30.00) - Outfit - Fortnite.png"
		const versionRegex = /\(v(\d+)(?:\.(\d+))?\)/i;
		let bestVersion = -1;
		let bestFile = null;
		for (const f of files) {
			const m = f.match(versionRegex);
			if (m && f.startsWith(name) && f.includes(`- ${cosmeticType} - Fortnite.png`)) {
				const major = parseInt(m[1] || '0', 10);
				const minor = parseInt(m[2] || '0', 10);
				const numeric = major * 1000 + minor; // simple ordering
				if (numeric > bestVersion) {
					bestVersion = numeric;
					bestFile = f;
				}
			}
		}
		if (bestFile) return { file: bestFile, pageTitle: t };
	}

	return { file: `${name} - ${cosmeticType} - Fortnite.png`, pageTitle: name };
}

async function initializeApp() {
	elements = {
		// Basic elements
		cosmeticInput: document.getElementById('cosmetic-input'),
		cosmeticDisplayInput: document.getElementById('cosmetic-display'),
		generateBtn: document.getElementById('generate-btn'),
		copyBtn: document.getElementById('copy-btn'),
		clearBtn: document.getElementById('clear-btn'),
		status: document.getElementById('status'),
		output: document.getElementById('output'),
		
		// Release status elements
		releasedSwitch: document.getElementById('released-switch'),
		releasedLabel: document.getElementById('released-label'),
		releaseDate: document.getElementById('release-date'),
		itemShopHistory: document.getElementById('item-shop-history'),
		shopHistoryPart: document.getElementById('shop-history-part'),
		updateVersion: document.getElementById('update-version'),
		
		// Source checkboxes
		sourceItemShop: document.getElementById('source-item-shop'),
		sourceBattlePass: document.getElementById('source-battle-pass'),
		sourceFortniteCrew: document.getElementById('source-fortnite-crew'),
		sourceOGPass: document.getElementById('source-og-pass'),
		sourceMusicPass: document.getElementById('source-music-pass'),
		sourceLEGOPass: document.getElementById('source-lego-pass'),
		
		// Item Shop settings
		itemShopSettings: document.getElementById('item-shop-settings'),
		shopCost: document.getElementById('shop-cost'),
		includeAppearances: document.getElementById('include-appearances'),
		shopAppearances: document.getElementById('shop-appearances'),
		
		// Battle Pass settings
		battlePassSettings: document.getElementById('battle-pass-settings'),
		bpSeason: document.getElementById('bp-season'),
		bpPage: document.getElementById('bp-page'),
		bpBonus: document.getElementById('bp-bonus'),
		bpPageCompletion: document.getElementById('bp-page-completion'),
		
		// Fortnite Crew settings
		fortniteCrewSettings: document.getElementById('fortnite-crew-settings'),
		crewMonth: document.getElementById('crew-month'),
		crewYear: document.getElementById('crew-year'),
		
		// Metaverse pass settings
		ogPassSettings: document.getElementById('og-pass-settings'),
		musicPassSettings: document.getElementById('music-pass-settings'),
		legoPassSettings: document.getElementById('lego-pass-settings'),
		
		ogSeason: document.getElementById('og-season'),
		ogPage: document.getElementById('og-page'),
		ogPageCompletion: document.getElementById('og-page-completion'),
		musicSeason: document.getElementById('music-season'),
		musicPage: document.getElementById('music-page'),
		musicPageCompletion: document.getElementById('music-page-completion'),
		legoSeason: document.getElementById('lego-season'),
		legoSeasonAbbr: document.getElementById('lego-season-abbr'),
		legoPage: document.getElementById('lego-page'),
		legoPageCompletion: document.getElementById('lego-page-completion'),
		
		// Free checkboxes for each pass
		passFreeBP: document.getElementById('pass-free-bp'),
		passFreeOG: document.getElementById('pass-free-og'),
		passFreeMusic: document.getElementById('pass-free-music'),
		passFreeLego: document.getElementById('pass-free-lego'),
		
		// Display title checkbox
		displayTitle: document.getElementById('display-title'),
		
		// Collaboration checkbox
		collaboration: document.getElementById('collaboration'),
		
		// Racing settings
		isRocketLeagueCosmetic: document.getElementById('rocket-league-cosmetic'),
		isRocketLeagueExclusive: document.getElementById('rocket-league-exclusive'),
	};

	document.getElementById('add-bundle').addEventListener('click', (e) => { e.preventDefault(); createBundleEntry(); });
	document.getElementById('remove-bundle').addEventListener('click', (e) => { e.preventDefault(); removeBundleEntry(); });

	// Setup source selection logic
	function handleSourceSelection() {
		// Reset all pass-free checkboxes to false when the source changes
		if (elements.passFreeBP) elements.passFreeBP.checked = false;
		if (elements.passFreeOG) elements.passFreeOG.checked = false;
		if (elements.passFreeMusic) elements.passFreeMusic.checked = false;
		if (elements.passFreeLego) elements.passFreeLego.checked = false;
		const itemShopChecked = elements.sourceItemShop.checked;
		const battlePassChecked = elements.sourceBattlePass.checked;
		const fortniteCrewChecked = elements.sourceFortniteCrew.checked;
		const ogPassChecked = elements.sourceOGPass.checked;
		const musicPassChecked = elements.sourceMusicPass.checked;
		const legoPassChecked = elements.sourceLEGOPass.checked;
		
		// Show/hide settings based on selection
		elements.itemShopSettings.classList.toggle('hidden', !itemShopChecked);
		elements.battlePassSettings.classList.toggle('hidden', !battlePassChecked);
		elements.fortniteCrewSettings.classList.toggle('hidden', !fortniteCrewChecked);
		elements.ogPassSettings.classList.toggle('hidden', !ogPassChecked);
		elements.musicPassSettings.classList.toggle('hidden', !musicPassChecked);
		elements.legoPassSettings.classList.toggle('hidden', !legoPassChecked);
		
		// Hide/show released fields based on source selection
		const releasedFields = document.querySelectorAll('.released-fields');
		if (battlePassChecked || fortniteCrewChecked) {
			// Hide all released fields for Battle Pass and Fortnite Crew
			releasedFields.forEach(field => {
				field.style.display = 'none';
			});
			
			// Clear release field values
			elements.releaseDate.value = '';
			elements.itemShopHistory.checked = false;
			elements.shopHistoryPart.value = '';
			
			// Force released switch to "Yes" and disable it
			elements.releasedSwitch.checked = true;
			elements.releasedSwitch.disabled = true;
			elements.releasedLabel.textContent = 'Yes';
		} else {
			// Re-enable released switch for Item Shop
			elements.releasedSwitch.disabled = false;
			
			// Show released fields if switch is on
			if (elements.releasedSwitch.checked) {
				releasedFields.forEach(field => {
					field.style.display = 'flex';
				});
			}
		}
		
		// Disable mutual exclusivity logic
		if (fortniteCrewChecked) {
			elements.sourceItemShop.disabled = true;
			elements.sourceBattlePass.disabled = true;
			elements.sourceOGPass.disabled = true;
			elements.sourceMusicPass.disabled = true;
			elements.sourceLEGOPass.disabled = true;
		} else if (battlePassChecked) {
			elements.sourceItemShop.disabled = true;
			elements.sourceFortniteCrew.disabled = true;
			elements.sourceOGPass.disabled = true;
			elements.sourceMusicPass.disabled = true;
			elements.sourceLEGOPass.disabled = true;
		} else if (itemShopChecked) {
			elements.sourceBattlePass.disabled = true;
			elements.sourceFortniteCrew.disabled = true;
			elements.sourceOGPass.disabled = true;
			elements.sourceMusicPass.disabled = true;
			elements.sourceLEGOPass.disabled = true;
		} else if (ogPassChecked) {
			elements.sourceItemShop.disabled = true;
			elements.sourceBattlePass.disabled = true;
			elements.sourceFortniteCrew.disabled = true;
			elements.sourceMusicPass.disabled = true;
			elements.sourceLEGOPass.disabled = true;
		} else if (musicPassChecked) {
			elements.sourceItemShop.disabled = true;
			elements.sourceBattlePass.disabled = true;
			elements.sourceFortniteCrew.disabled = true;
			elements.sourceOGPass.disabled = true;
			elements.sourceLEGOPass.disabled = true;
		} else if (legoPassChecked) {
			elements.sourceItemShop.disabled = true;
			elements.sourceBattlePass.disabled = true;
			elements.sourceFortniteCrew.disabled = true;
			elements.sourceOGPass.disabled = true;
			elements.sourceMusicPass.disabled = true;
		} else {
			// Re-enable all if none selected
			elements.sourceItemShop.disabled = false;
			elements.sourceBattlePass.disabled = false;
			elements.sourceFortniteCrew.disabled = false;
			elements.sourceOGPass.disabled = false;
			elements.sourceMusicPass.disabled = false;
			elements.sourceLEGOPass.disabled = false;
		}
	}

	// Reset display-title when the cosmetic inputs change so the user isn't locked out
	function resetDisplayTitleIfNeeded() {
		if (!elements.displayTitle) return;
		// Re-enable the checkbox so the user can change it after a new input
		elements.displayTitle.disabled = false;
	}

	// Attach listeners to cosmetic inputs to reset display title state when they change
	if (elements.cosmeticInput) {
		elements.cosmeticInput.addEventListener('input', resetDisplayTitleIfNeeded);
	}
	if (elements.cosmeticDisplayInput) {
		elements.cosmeticDisplayInput.addEventListener('input', resetDisplayTitleIfNeeded);
	}

	// Auto-fill update version for Battle Pass / OG / Festival / LEGO based on season
	function autoFillPassVersion() {
		const bpChecked = elements.sourceBattlePass.checked;
		const ogChecked = elements.sourceOGPass.checked;
		const musicChecked = elements.sourceMusicPass.checked;
		const legoChecked = elements.sourceLEGOPass.checked;

		let updateVersion = "";

		if (bpChecked) {
			const seasonInput = elements.bpSeason.value.trim().toUpperCase();
			if (seasonInput) updateVersion = SEASON_UPDATE_VERSIONS[seasonInput] || "";
		} else if (ogChecked) {
			const seasonInput = elements.ogSeason.value.trim();
			if (seasonInput) updateVersion = OG_SEASON_UPDATE_VERSIONS[seasonInput] || "";
		} else if (musicChecked) {
			const seasonInput = elements.musicSeason.value.trim();
			if (seasonInput) updateVersion = FESTIVAL_SEASON_UPDATE_VERSIONS[seasonInput] || "";
		} else if (legoChecked) {
			const seasonInput = elements.legoSeason.value.trim();
			if (seasonInput) updateVersion = LEGO_SEASON_UPDATE_VERSIONS[seasonInput] || "";
		}

		if (updateVersion) {
			elements.updateVersion.value = updateVersion;
		} else {
			elements.updateVersion.value = "";
		}
	}

	// Also listen for changes to the other season inputs
	if (elements.ogSeason) elements.ogSeason.addEventListener('input', autoFillPassVersion);
	if (elements.musicSeason) elements.musicSeason.addEventListener('input', autoFillPassVersion);
	if (elements.legoSeason) elements.legoSeason.addEventListener('input', autoFillPassVersion);

	// Handle Fortnite Crew checkbox with auto-detection protection
	function handleFortniteCrewClick(e) {
		// If trying to uncheck when auto-detected, prevent it
		if (isCrewAutoDetected && !e.target.checked) {
			e.preventDefault();
			e.target.checked = true;
			return;
		}
		
		// Reset auto-detection flag when manually changed
		if (!isCrewAutoDetected) {
			isCrewAutoDetected = false;
		}
		
		handleSourceSelection();
	}

	// Handle Released switch functionality
	function handleReleasedSwitch() {
		const isReleased = elements.releasedSwitch.checked;
		const releasedFields = document.querySelectorAll('.released-fields');
		const battlePassChecked = elements.sourceBattlePass.checked;
		const fortniteCrewChecked = elements.sourceFortniteCrew.checked;
		const ogPassChecked = elements.sourceOGPass.checked;
		const musicPassChecked = elements.sourceMusicPass.checked;
		const legoPassChecked = elements.sourceLEGOPass.checked;
		
		// Update label
		elements.releasedLabel.textContent = isReleased ? 'Yes' : 'No';
		
		if (isReleased) {
			// Show released fields only if not a Pass or Crew
			if (!battlePassChecked && !fortniteCrewChecked && !ogPassChecked && !musicPassChecked && !legoPassChecked) {
				releasedFields.forEach(field => {
					field.style.display = 'flex';
				});
			}
		} else {
			// Hide released fields (only for Item Shop)
			if (!battlePassChecked && !fortniteCrewChecked && !ogPassChecked && !musicPassChecked && !legoPassChecked) {
				releasedFields.forEach(field => {
					field.style.display = 'none';
				});
				
				// Clear released field values (but keep updateVersion)
				elements.releaseDate.value = '';
				elements.itemShopHistory.checked = false;
				elements.shopHistoryPart.value = '';
			}
		}
		
		// Trigger shop history part visibility update
		elements.shopHistoryPart.style.display = elements.itemShopHistory.checked ? 'inline-block' : 'none';
	}

	// Event listeners for released switch
	elements.releasedSwitch.addEventListener('change', handleReleasedSwitch);

	// Event listeners for source selection
	elements.sourceItemShop.addEventListener('change', handleSourceSelection);
	elements.sourceBattlePass.addEventListener('change', handleSourceSelection);
	elements.sourceFortniteCrew.addEventListener('change', handleSourceSelection);
	elements.sourceFortniteCrew.addEventListener('click', handleFortniteCrewClick);
	elements.sourceOGPass.addEventListener('change', handleSourceSelection);
	elements.sourceMusicPass.addEventListener('change', handleSourceSelection);
	elements.sourceLEGOPass.addEventListener('change', handleSourceSelection);

	// Battle Pass season auto-fill event listener
	elements.bpSeason.addEventListener('input', autoFillPassVersion);

	// Item Shop History part visibility
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
			elements.shopAppearances.value = document.getElementById("cosmetic-input-name").value.trim();
		} else {
			appearancesFields.forEach(field => {
				field.style.display = 'none';
			});
		}
	});
	
	// Racing - Rocket League visibility
	elements.isRocketLeagueCosmetic.addEventListener('change', () => {
		const rocketLeagueChecked = elements.isRocketLeagueCosmetic.checked;
		if (rocketLeagueChecked) {
			document.getElementById('rocket-league-exclusive-field').style.display = 'block';
		} else {
			document.getElementById('rocket-league-exclusive-field').style.display = 'none';
		}
	});

	// Basic event listeners
	elements.generateBtn.addEventListener('click', generatePage);
	elements.copyBtn.addEventListener('click', copyToClipboard);
	elements.clearBtn.addEventListener('click', clearOutput);

	elements.cosmeticInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') generatePage();
	});

	elements.cosmeticDisplayInput.addEventListener('input', updateSuggestions);

	try {
		showStatus('Loading cosmetic data...', 'loading');
		
		await loadIndex();
		await loadCosmeticSets();

		// Initialize released switch to default state (unreleased)
		handleReleasedSwitch();

		hideStatus();
		console.log('Cosmetic Page Generator initialized successfully');

	} catch (error) {
		console.error('Initialization error:', error);
		showStatus('Failed to load cosmetic data. Please refresh the page.', 'error');
	}
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}