import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP, INSTRUMENTS_TYPE_MAP, SERIES_CONVERSION, characterBundlePattern, articleFor, forceTitleCase, getSeasonReleased, getMostUpToDateImage, pageExists } from '../../../tools/utils.js';
import { generateUnlockedParameter, generateCostParameter, generateReleaseParameter, generateArticleIntro } from '../../article-utils.js';
import { initSourceReleaseControls, getSourceReleaseSettings, validateSourceSettings } from '../../../tools/source-release.js';
import { initBundleControls, getBundleEntries, createBundleEntry, removeBundleEntry, setupBundleControls } from '../../../tools/bundle-controls.js';
import { initFormBehaviors } from '../../../tools/form-behaviors.js';

const DATA_BASE_PATH = '../../../data/';

const CATEGORIES_FOR_SELECTION = [
	'Cel-Shaded Cosmetics',
	'Free Cosmetics',
	'Tournament Cosmetics',
	'Compatible Cosmetics',
	'Transformative Cosmetics',
	'Winter Cosmetics',
];

let index = [];
let companionVTIDs = [];
let cosmeticSets = {};
let jamTrackNames = [];

let elements = {};

let isCrewAutoDetected = false;

let featuredCharactersEntries = [];
let selectedCategories = [];
let addCompatibleCosmeticsCategory = false;

let pageTitle = '';

async function loadIndex() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
}

async function loadCompanionVTIDs() {
	const resp = await fetch(DATA_BASE_PATH + 'CompanionStyleVariantTokens.json');
	companionVTIDs = await resp.json();
}

async function loadCosmeticSets() {
	const resp = await fetch(DATA_BASE_PATH + 'CosmeticSets.json');
	cosmeticSets = await resp.json();
}

async function loadJamTrackNames() {
	const jamTrackData = await fetch("https://fortnite-wiki-bot-repo.mtonline.workers.dev/data/spark-tracks/tracks.json").then(res => res.json());
	jamTrackNames = Object.values(jamTrackData);
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
			elements.displayTitle.disabled = false;

			const bundles = getBundleEntries();
			bundles.forEach(() => removeBundleEntry());
			var ftChrsSection = document.getElementById("featured-characters-config");
			ftChrsSection?.parentNode.removeChild(ftChrsSection);
			featuredCharactersEntries.forEach(() => removeFeaturedCharacterEntry());

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
				await updateWikiPageButton(entry.name, 'Emote');

				elements.sourceQuestReward.checked = true;
				elements.sourceQuestReward.dispatchEvent(new Event('change'));
				return;
			}

			const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${entry.path}`);
			if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) return;
			let itemDefinitionData = cosmeticData.find(dataEntry => dataEntry.Type in TYPE_MAP) || cosmeticData[0];

			const ID = itemDefinitionData.Name;
			let cosmeticType = itemDefinitionData.Properties.ItemShortDescription?.SourceString.trim() || TYPE_MAP[itemDefinitionData.Type] || "";

			await updateWikiPageButton(entry.name, cosmeticType);

			const props = itemDefinitionData.Properties || {};
			let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
						 props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
			
			const seriesEntry = (props.DataList || []).find(entry => entry?.Series);
			if (seriesEntry) {
				let series = seriesEntry.Series.ObjectName?.split("'")?.slice(-2)[0];
				rarity = SERIES_CONVERSION[series] || rarity;
			}
			
			// Auto-tick Fortnite Crew if Crew Series
			if (rarity === "Crew Series") {
				elements.sourceFortniteCrew.checked = true;
				elements.sourceFortniteCrew.disabled = true;
				isCrewAutoDetected = true;
				elements.sourceFortniteCrew.dispatchEvent(new Event('change'));
			} else {
				// Reset auto-detection flag if not Crew Series
				isCrewAutoDetected = false;
			}

			const isFestivalCosmetic = entry.path.startsWith("Festival") && itemDefinitionData.Type != "AthenaDanceItemDefinition";
			let instrumentType;
			if (isFestivalCosmetic && cosmeticType != "Aura") {
				instrumentType = INSTRUMENTS_TYPE_MAP[itemDefinitionData.Type] || ID.split("_").at(-1);
				// Normalize instrument type names
				const drumTypes = ["DrumKit", "DrumStick", "Drum"];
				if (instrumentType === "Mic") instrumentType = "Microphone";
				else if (drumTypes.includes(instrumentType)) instrumentType = "Drums";
			}

			addCompatibleCosmeticsCategory = isFestivalCosmetic && (cosmeticType != instrumentType);
			updateDropdownOptions();

			if (cosmeticType == "Loading Screen" || cosmeticType == "Spray" || cosmeticType == "Emoticon") {
				createFeaturedCharactersSection();
			}

			if (entry.path.startsWith("Racing")) {

				const bundleEntryWrapper = createBundleEntry();

				const bundleName = `${entry.name} ${cosmeticType}`;


				// Check for existing index entry
				const matchingBundleEntry = index.find(e =>
					(e.bundle_name === bundleName || e.bundle_name === `${bundleName}s`)
				);
				if (matchingBundleEntry) {
					const displayEl = bundleEntryWrapper.querySelector('.bundle-display');
					const inputEl = bundleEntryWrapper.querySelector('.bundle-input');
					const nameEl = bundleEntryWrapper.querySelector('.bundle-input-name');
					const optionsWrapper = bundleEntryWrapper.querySelector('.bundle-options');
					
					if (inputEl) inputEl.value = matchingBundleEntry.bundle_id;
					if (nameEl) nameEl.value = matchingBundleEntry.bundle_name;
					if (displayEl) displayEl.value = `${matchingBundleEntry.bundle_name} (${matchingBundleEntry.bundle_id})`;
					optionsWrapper.style.display = 'flex';
				} else {
					removeBundleEntry();
				}

				document.getElementById('rocket-pass-field').style.display = 'block';
				document.getElementById('rocket-league-field').style.display = 'block';
				document.getElementById('rocket-league-cosmetic').checked = false;
				document.getElementById('rocket-league-exclusive-field').style.display = 'none';
			} else {
				document.getElementById('rocket-pass-field').style.display = 'none';
				document.getElementById('source-rocket-pass').checked = false;
				handleSourceSelection(); // needed since manually changing checked doesn't trigger
				document.getElementById('rocket-league-field').style.display = 'none';
				document.getElementById('rocket-league-cosmetic').checked = false;
				document.getElementById('rocket-league-exclusive').checked = false;
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
		[["Cosmetics.UserFacingFlags.HasVariants", "Cosmetics.UserFacingFlags.HasUpgradeQuests", "Cosmetics.ItemRequiresLockIn"], "{{Selectable Styles}}"],
		[["Cosmetics.UserFacingFlags.Emoticon.Animated", "Cosmetics.UserFacingFlags.Wrap.Animated"], "{{Animated}}"],
		[["Cosmetics.UserFacingFlags.Reactive", "Cosmetics.UserFacingFlags.Reactive.WeaponFire"], "{{Reactive}}"],
		["Cosmetics.UserFacingFlags.TOD", "{{Reactive|Time}}"],
		["Cosmetics.UserFacingFlags.Music", "{{Reactive|Music}}"],
		["Cosmetics.UserFacingFlags.Elimination", "{{Reactive|Elim}}"],
		["Cosmetics.UserFacingFlags.Damage", "{{Reactive|Damage}}"],
		["Cosmetics.UserFacingFlags.Emote.Traversal", "{{Traversal}}"],
		["Cosmetics.UserFacingFlags.Emote.Group", "{{Group Emote}}"],
		["Cosmetics.ItemRequiresLockIn", "{{Forged}}"],
		["Cosmetics.UserFacingFlags.BuiltInEmote", "{{Built-In}}"],
		["Cosmetics.UserFacingFlags.Transform", "{{Transformation}}"]
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

function are_there_shop_assets(entryMeta) {
	return entryMeta && entryMeta.dav2;
}

async function getNumBRDav2Assets(entryMeta) {
	if (entryMeta && entryMeta.dav2) {
		const dav2Path = `${DATA_BASE_PATH}${entryMeta.dav2}`;
		return loadGzJson(dav2Path).then(dav2Data => {
			let count = 0;
			if (Array.isArray(dav2Data)) {
				for (const entry of dav2Data) {
					const presentations = entry?.Properties?.ContextualPresentations;
					if (!presentations) continue;
					for (const pres of presentations) {
						if (pres?.ProductTag?.TagName === 'Product.BR') count++;
					}
				}
			}
			return count;
		}).catch(error => {
			console.warn(`Failed to load DAv2 data for ${entryMeta.id}:`, error);
			return 0;
		});
	}
}

function hasLegoStyle(entryMeta) {
	return entryMeta?.jido;
}

function hasBeanStyle(entryMeta) {
	return entryMeta?.beanid;
}

async function hasLegoFeatured(entryMeta) {
	try {
		if (!entryMeta?.dav2) return false;
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

const IGNORE_VARIANT_TYPES = [
	"FortCosmeticTextVariant"
];

const VARIANT_OPTION_FIELDS = [
	"ParticleOptions",
	"PartOptions",
	"MaterialOptions",
	"MeshOptions",
	"GenericTagOptions",
	"GenericPropertyOptions",
	"AdditivePoseOptions",
	"MorphTargetOptions"
]

function chunkList(lst, size) {
	return Array.from({ length: Math.ceil(lst.length / size) }, (_, i) => lst.slice(i * size, i * size + size));
}

// This function assumes that variant channels containing "Immutable" pertain to Sidekick Appearance!
async function generateStyleSection(data, name, cosmeticType, isFestivalCosmetic, instrumentType, mainIcon, outputFeatured, numBRDav2Assets, channelIconMap) {
	const variantChannels = new Map();
	const immutableChannels = new Set();
	const styleImages = {};
	const colorHexMap = {};
	const colorDisplayNameMap = {};
	const featuredFiles = new Set();
	const filenameTagMap = {}; // image filename -> { channelTag, nameTag }
	const optionTagsMap = {}; // `${channel},${variant}` -> { channelTag, nameTag }
	const variantMatchesMain = {}; // `${channel},${variant}` -> true when variant's preview image equals main icon

	for (const variant of data) {
		if (typeof variant !== 'object' || !variant.Properties) {
			continue;
		}
		const props = variant.Properties;
		const rawChannelName = props.VariantChannelName?.LocalizedString.trim() || "";
		const channelName = (rawChannelName == rawChannelName.toUpperCase()) ? forceTitleCase(rawChannelName) :
			((/[a-z]/.test(rawChannelName.slice(1))) && (/[A-Z]/.test(rawChannelName.slice(1)))) ? rawChannelName : forceTitleCase(rawChannelName);
		if (!channelName) {
			console.log("Skipping variant with no channel name:", variant);
			continue;
		}
		const immutable = (props.VariantChannelTag?.TagName || "").startsWith("Cosmetics.Variant.Channel.Immutable.");
		if (immutable) immutableChannels.add(channelName);

		if (variant.Type == "FortCosmeticRichColorVariant") {
			const richColorVar = props.InlineVariant?.RichColorVar;
			if (!richColorVar) continue;

			const defaultColor = richColorVar.DefaultStartingColor.Hex || "";

			let colorSwatchPath = richColorVar.ColorSwatchForChoices.AssetPathName.split('.')[0] || "";
			colorSwatchPath = DATA_BASE_PATH + colorSwatchPath.replace('/VehicleCosmetics/Mutable/Bodies/', 'cosmetics/Racing/Bodies/').replace(/CosmeticCompanions\/Assets\/(?:Quadruped|Biped|Other)\/([^/]*)\/ColorSwatches\//, 'cosmetics/Companions/ColorSwatches/$1/') + '.json';
			colorSwatchPath = colorSwatchPath.replace(/CosmeticCompanions\/Assets\/(?:Quadruped|Biped|Other)\/([^\/]*)\/(?:MaterialParameterSets|MaterialParamaterSets|MaterialParameters|MPS)\//, 'cosmetics/Companions/MaterialParameterSets/$1/'); // fallback fix

			const colorSwatchData = await loadGzJson(colorSwatchPath).catch(err => {
				console.warn("Failed to load color swatch data:", err);
				return null;
			});
			if (!colorSwatchData) continue;

			const colorPairs = colorSwatchData[0].Properties.ColorPairs;
			if (!Array.isArray(colorPairs) || colorPairs.length === 0) {
				console.log("Skipping color swatch with no color pairs:", colorSwatchData);
				continue;
			}

			if (!variantChannels.has(channelName)) {
				variantChannels.set(channelName, { variants: [], icon: null, colspan: null });
			}

			const chTag = props.VariantChannelTag?.TagName || "";
			if (chTag && channelIconMap && channelIconMap[chTag]) {
				variantChannels.get(channelName).icon = channelIconMap[chTag];
			}

			for (let i = 0; i < colorPairs.length; i++) {
				const pair = colorPairs[i];
				if (!pair) continue;

				const colorHex = (pair.ColorValue && pair.ColorValue.Hex) ? pair.ColorValue.Hex.toLowerCase() : null;

				let displayName = null;
				if (pair.ColorDisplayName) {
					displayName = pair.ColorDisplayName.LocalizedString || null;
				}

				const variantKey = colorHex || `color_${i}`;

				variantChannels.get(channelName).variants.push(variantKey);

				styleImages[`${channelName},${variantKey}`] = ""; // no style image for color variants

				colorHexMap[`${channelName},${variantKey}`] = colorHex;
				colorDisplayNameMap[`${channelName},${variantKey}`] = displayName;
			}
			continue;
		}

		if (variant.Type == "FortCosmeticMaterialParameterSetVariant") {
			const inlineVariant = props.InlineVariant;
			if (!inlineVariant) continue;

			const defaultActiveVariantTag = inlineVariant.DefaultActiveVariantTag?.TagName || "";

			let materialParamsPath = inlineVariant.MaterialParameterSetChoices.ObjectPath.split('.')[0] || "";
			materialParamsPath = DATA_BASE_PATH + materialParamsPath.replace(/CosmeticCompanions\/Assets\/(?:Quadruped|Biped|Other)\/([^\/]*)\/(?:MaterialParameterSets|MaterialParamaterSets|MaterialParameters|MPS)\//, 'cosmetics/Companions/MaterialParameterSets/$1/') + '.json';
			materialParamsPath = materialParamsPath.replace(/CosmeticCompanions\/Assets\/(?:Quadruped|Biped|Other)\/([^/]*)\/ColorSwatches\//, 'cosmetics/Companions/ColorSwatches/$1/'); // fallback fix

			const materialParamsData = await loadGzJson(materialParamsPath).catch(err => {
				console.warn("Failed to load material parameters data:", err);
				return null;
			});
			if (!materialParamsData) continue;

			const materialChoices = materialParamsData[0].Properties.Choices;
			if (!Array.isArray(materialChoices) || materialChoices.length === 0) {
				console.log("Skipping material parameters with no choices:", materialParamsData);
				continue;
			}

			if (!variantChannels.has(channelName)) {
				variantChannels.set(channelName, { variants: [], icon: null, colspan: null });
			}

			const chTag = props.VariantChannelTag?.TagName || "";
			if (chTag && channelIconMap && channelIconMap[chTag]) {
				variantChannels.get(channelName).icon = channelIconMap[chTag];
			}

			for (const choice of materialChoices) {
				if (!choice) continue;

				const colorHex = choice.UITileDisplayData.Color.Hex || null;
				if (!colorHex) continue;

				const variantName = choice.DisplayName?.LocalizedString || "";
				variantChannels.get(channelName).variants.push(variantName);

				styleImages[`${channelName},${variantName}`] = ""; // no style image for material parameter variants

				colorHexMap[`${channelName},${variantName}`] = colorHex;
				colorDisplayNameMap[`${channelName},${variantName}`] = variantName;
			}
			continue;
		}

		if (variant.Type == "FortCosmeticItemDefRedirectVariant") {
			if (props.ItemDefClass.ObjectName != "Class'CosmeticCompanionReactFXItemDefinition'") continue;
			if (props.VariantChannelName.SourceString != "Reaction") continue;
			
			variantChannels.set("Reaction", { variants: [], icon: 'Reaction - Icon - Fortnite.png', colspan: 3 });
			continue;
		}

		if (variant.Type == "FortCosmeticContextualAnimSceneEmoteVariant") {
			const options = props.ContextualAnimSceneEmoteOptions || [];
			const channelName = "Sidekick Emote";
			if (!variantChannels.has(channelName)) {
				variantChannels.set(channelName, { variants: [], icon: 'Sidekick Emotes - Icon - Fortnite.png', colspan: 3 });
			}
			for (const opt of options) {
				const rawVariantName = opt.VariantName?.LocalizedString || opt.VariantName?.SourceString || "";
				let variantName = (rawVariantName == rawVariantName.toUpperCase()) ? forceTitleCase(rawVariantName) : rawVariantName;
				if (!variantName && opt.CustomizationVariantTag?.TagName.endsWith("CompanionEmoteEmpty")) variantName = "None";

				variantChannels.get(channelName).variants.push(variantName);

				let imageFilename = "";
				if ((opt.CustomizationVariantTag?.TagName || "").endsWith("CompanionEmoteEmpty")) {
					imageFilename = "Empty (v31.40) - Icon - Fortnite.png";
				} else {
					imageFilename = `${variantName} - Sidekick Emote - Fortnite.png`;
				}

				if (imageFilename) {
					styleImages[`${channelName},${variantName}`] = imageFilename;
				}
			}
			continue;
		}


		const optionField = VARIANT_OPTION_FIELDS.find(field => Array.isArray(props[field]) && props[field].length > 0);
		if (!optionField) {
			console.log("Skipping variant with no valid options field:", variant);
			continue;
		}
		const options = props[optionField] || [];
		for (const option of options) {
			if (typeof option !== 'object') {
				continue;
			}
			const rawVariantName = option.VariantName?.LocalizedString || "";
			const variantName = (rawVariantName == rawVariantName.toUpperCase()) ? forceTitleCase(rawVariantName) :
				((/[a-z]/.test(rawVariantName.slice(1))) && (/[A-Z]/.test(rawVariantName.slice(1)))) ? rawVariantName : forceTitleCase(rawVariantName);
			if (!variantName) {
				console.log("Skipping option with no variant name:", option);
				continue;
			}

			const previewImage = option.PreviewImage?.AssetPathName || "";
			optionTagsMap[`${channelName},${variantName}`] = {
				channelTag: props.VariantChannelTag?.TagName || "",
				nameTag: option.CustomizationVariantTag?.TagName || ""
			};
			if (!variantChannels.has(channelName)) {
				variantChannels.set(channelName, { variants: [], icon: null, colspan: null });
			}
			variantChannels.get(channelName).variants.push(variantName);

			const chTag = props.VariantChannelTag?.TagName || "";
			if (chTag && channelIconMap && channelIconMap[chTag]) {
				variantChannels.get(channelName).icon = channelIconMap[chTag];
			}

			let imageFilename = "";

			if (previewImage !== "" && (previewImage === mainIcon.large || previewImage === mainIcon.icon)) {
				variantMatchesMain[`${channelName},${variantName}`] = true;
			}

			if (previewImage !== "" && previewImage !== mainIcon.large && previewImage !== mainIcon.icon) {
				if (props.VariantChannelTag?.TagName.startsWith("Cosmetics.Variant.Channel.Vehicle.Painted")) {
					imageFilename = variantName == "None" ? "X - Outfit - Fortnite.png" : `${variantName} - Painted Style - Rocket Racing.png`;
				} else {
					const chIsStyle = channelName === "Style";
					let featuredFilename;
					if (isFestivalCosmetic) {
						if (cosmeticType != instrumentType) {
							if (instrumentType == "Drums") {
								imageFilename = chIsStyle ? `${name} (${variantName}) - Pickaxe - Fortnite.png` : `${name} (${channelName} - ${variantName}) - Pickaxe - Fortnite.png`;
							} else {
								imageFilename = chIsStyle ? `${name} (${variantName}) - ${instrumentType} - Fortnite Festival.png` : `${name} (${channelName} - ${variantName}) - ${instrumentType} - Fortnite Festival.png`;
							}
						} else {
							imageFilename = chIsStyle ? `${name} (${variantName}) - ${instrumentType} - Fortnite Festival.png` : `${name} (${channelName} - ${variantName}) - ${instrumentType} - Fortnite Festival.png`;
							featuredFilename = chIsStyle ? `${name} (${variantName} - Featured) - ${instrumentType} - Fortnite Festival.png` : `${name} (${channelName} - ${variantName} - Featured) - ${instrumentType} - Fortnite Festival.png`;
						}
					} else {
						imageFilename = chIsStyle ? `${name} (${variantName}) - ${cosmeticType} - Fortnite.png` : `${name} (${channelName} - ${variantName}) - ${cosmeticType} - Fortnite.png`;
						featuredFilename = chIsStyle ? `${name} (${variantName} - Featured) - ${cosmeticType} - Fortnite.png` : `${name} (${channelName} - ${variantName} - Featured) - ${cosmeticType} - Fortnite.png`;
					}
					if (outputFeatured && featuredFilename && !featuredFiles.has(featuredFilename)) {
						featuredFiles.add(featuredFilename);
					}
				}
			} else if (previewImage === "") {
				
				// TODO: Investigate ColorA and ColorB handling, MaterialsToAlter -> WingBath(round)
				// for now, just use ColorA in VariantMaterialParams
				
				let colorHex = null;
				
				const variantMaterialParams = option.VariantMaterialParams || [];
				for (const param of variantMaterialParams) {
					const colorParams = param.ColorParams || [];
					if (colorParams.length > 0) {
						const colorAParam = colorParams.find(cp => cp.ParamName === "ColorA");
						if (colorAParam?.Value?.Hex) {
							colorHex = colorAParam.Value.Hex.toLowerCase();
							break;
						}
					}
				}

				if (colorHex) {
					imageFilename = ""; // no style image for color variants
					colorHexMap[`${channelName},${variantName}`] = colorHex;
					colorDisplayNameMap[`${channelName},${variantName}`] = variantName;
				} else {
					imageFilename = "Empty (v31.40) - Icon - Fortnite.png";
				}
			}
			if (imageFilename !== "") {
				styleImages[`${channelName},${variantName}`] = imageFilename;
			}
		}
	}

	if (cosmeticType == "Sidekick") {
		for (const [channel, info] of variantChannels) {
			if (!info.icon) {
				info.icon = `${name} (${channel}) - Sidekick - Fortnite.png`;
			}
		}
	}

	if (variantChannels.size === 0) {
		return ["", null, {}, filenameTagMap, variantMatchesMain];
	}

	// Don't generate style section if all style images are the default empty image
	const nonEmptyStyleImages = Object.values(styleImages).filter(v => typeof v === 'string' && v.length > 0);
	if (nonEmptyStyleImages.length > 0 && nonEmptyStyleImages.every(v => v === "Empty (v31.40) - Icon - Fortnite.png")) {
		return ["", null, {}, filenameTagMap, variantMatchesMain];
	}

	// Helper to build a table for a given list of [channel, variants] entries
	function buildTable(entries, headerTemplate, addClassToUse, backgroundTemplate, replacePipes = false, noClasses = false, secondClassToUse = null) {
		const pipe = replacePipes ? "{{!}}" : "|";

		const table = [`{${pipe}${noClasses ? '' : ` class=\"${addClassToUse} reward-table${secondClassToUse ? ` ${secondClassToUse}` : ''}\"`}`];
		let first = true;
		for (const [channel, info] of entries) {
			const variants = Array.isArray(info) ? info : (info && Array.isArray(info.variants) ? info.variants : []);
			const chunks = chunkList(variants, 3);
			const colspan = (info && Number.isInteger(info.colspan)) ? info.colspan : (variants.length > 2 ? 3 : variants.length);
			const colspanFlag = colspan > 1 ? `colspan="${colspan}"${pipe}` : "";

			if (!first) table.push(`${pipe}-`);
			first = false;

			const iconFlag = (info && info.icon) ? `[[File:${info.icon}|30px${headerTemplate === 'New Style Header' ? '|left' : ''}]] ` : "";

			table.push(`${pipe}${colspanFlag}{{${headerTemplate}|${iconFlag}${channel}}}`);

			if (channel === "Reaction") {
				table.push(`${pipe}-`);
				table.push(`${pipe}colspan="3"${pipe}<small><small><center>You can choose any [[Reaction]] you own to use on this Sidekick!</center></small></small>`);
				continue;
			}
			
			// Determine if any variants have a display name
			const channelHasAnyNames = variants.some(v => {
				const k = `${channel},${v}`;
				// if this variant is a color (we recorded a hex), only count it if a display name exists
				if (k in colorHexMap) return !!colorDisplayNameMap[k];
				// non-color variants always have names
				return true;
			});

			for (const chunk of chunks) {
				table.push(`${pipe}-`);

				if (channelHasAnyNames) {
					table.push(...chunk.map(v => {
						const k = `${channel},${v}`;
						if (k in colorHexMap) {
							const dn = colorDisplayNameMap[k];
							return `!${dn ? dn : ''}`; // blank cell if no display name for this specific color
						}
						return `!${v}`;
					}));
					table.push(`${pipe}-`);
				}
				for (const v of chunk) {
					const key = `${channel},${v}`;

					if (key in colorHexMap) {
						const hexVal = (colorHexMap[key] || '').replace(/^#/, '').toLowerCase();
						if (!hexVal) {
							table.push(`${pipe}{{${backgroundTemplate}|X - Outfit - Fortnite.png}}`);
						} else {
							table.push(`${pipe}{{Color|${hexVal}}}`);
						}
						continue;
					}
					
					let imageFile = "";
					if (isFestivalCosmetic) {
						if (cosmeticType != instrumentType) {
							if (instrumentType == "Drums") {
								imageFile = `${name} - Pickaxe - Fortnite.png`;
							} else {
								imageFile = `${name} - ${instrumentType} - Fortnite Festival.png`;
							}
						} else {
							imageFile = `${name} - ${instrumentType} - Fortnite Festival.png`;
						}
					} else {
						imageFile = `${name} - ${cosmeticType} - Fortnite.png`;
					}
					// associate non-featured filenames with their variant tags
					if (imageFile !== mainIcon.icon && imageFile !== mainIcon.large) {
						imageFile = styleImages[key] ? styleImages[key] : imageFile;
						const tags = optionTagsMap[`${channel},${v}`] || { channelTag: "", nameTag: "" };
						filenameTagMap[imageFile] = { channelTag: tags.channelTag, nameTag: tags.nameTag };
					}
					if (channel === "Sidekick Emote" && v !== "None") {
						table.push(`${pipe}{{${backgroundTemplate}|${imageFile}|link=${v}}}`);
					} else {
						table.push(`${pipe}{{${backgroundTemplate}|${imageFile}}}`);
					}
				}
			}

		}
		table.push(`${pipe}}`);
		return table.join("\n");
	}

	// Split channels into immutable and normal groups
	const immutableEntries = [];
	const normalEntries = [];
	for (const [channel, info] of variantChannels) {
		if (immutableChannels.has(channel)) immutableEntries.push([channel, info]);
		else normalEntries.push([channel, info]);
	}

	// Ensure specific channels are ordered last in style tables
	const channelWeight = (name) => {
		if (name === "Sidekick Emote") return 1;
		if (name === "Reaction") return 2;
		return 0;
	};

	normalEntries.sort((a, b) => channelWeight(a[0]) - channelWeight(b[0]));

	let styleSectionBody = "";
	if (immutableEntries.length > 0 && normalEntries.length > 0) {
		styleSectionBody += "{{Scrollbox Clear|BoxHeight=700|Content=\n<tabber>\n";
		// Two separate tables: immutable first, then normal
		styleSectionBody += "|-|Appearance=\n" + buildTable(immutableEntries, 'New Style Header', 'new-style', 'Sidekick Style', false, false, 'radius-50') + "\n\n";
		styleSectionBody += "|-|Styles=\n" + buildTable(normalEntries, 'Style Header', 'style-text', 'Style Background');
		styleSectionBody += "\n</tabber>\n}}";
	} else if (immutableEntries.length > 0) {
		// Only immutable channels
		styleSectionBody = buildTable(immutableEntries, 'New Style Header', 'new-style', 'Sidekick Style', false, false, 'radius-50');
	} else {
		// Only normal channels
		if (cosmeticType == "Car Body" || cosmeticType == "Decal") {
			styleSectionBody = "{{Scrollbox Clear|BoxHeight=700|Content=\n";
			styleSectionBody += "<center>\n";
			styleSectionBody += buildTable(normalEntries, 'Style Header', '', 'Style Background', true, true);
			styleSectionBody += "\n</center>";
			styleSectionBody += "\n}}";
		} else {
			styleSectionBody = buildTable(normalEntries, 'Style Header', 'style-text', 'Style Background');
		}
	}

	let featured = null;
	if (featuredFiles.size === numBRDav2Assets - 1) {
		if (featuredFiles.size === 1) {
			featured = Array.from(featuredFiles)[0];
		} else if (featuredFiles.size > 0) {
			featured = ["<gallery>", ...Array.from(featuredFiles).map((filename, idx) => `${filename}|${idx + 1}`), "</gallery>"].join("\n");
		}
	}

	const sectionHeader = cosmeticType == "Sidekick" ? "Appearance Options" : "Selectable Styles";

	return [`== ${sectionHeader} ==\n` + styleSectionBody, featured, Object.fromEntries(variantChannels), filenameTagMap, variantMatchesMain];
}

async function generateDecalsTable(name, tags) {
	// Find tags that start with VehicleCosmetics.Body
	const bodyTags = (tags || []).filter(t => typeof t === 'string' && t.toLowerCase().startsWith('vehiclecosmetics.body'));
	if (bodyTags.length === 0) return;
	const matchingTags = new Set(bodyTags);
	
	// Search index for entries that have a carBodyTag field equal to any of the matchingTags
	const matchedIndexEntries = index.filter(e => {
		if (e.id && (e.id.toLowerCase().startsWith("carbody_") || e.id.toLowerCase().startsWith("body_"))) return false; // Exclude car bodies themselves
		if (!e?.carBodyTag) return false;
		return matchingTags.has(e.carBodyTag);
	});

	const carBodyName = index.find(e => e.id && (e.id.toLowerCase().startsWith("carbody_") || e.id.toLowerCase().startsWith("body_")) && matchingTags.has(e.carBodyTag))?.name;
	
	const decalRows = [];
	let currentIcons = [];
	let currentNames = [];
	
	for (const mi of matchedIndexEntries) {
		try {
			const json = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${mi.path}`);
			const itemDef = Array.isArray(json)
				? json.find(d => d.Type in TYPE_MAP) || json[0]
				: json;
			const props = itemDef?.Properties || {};
			
			const localized = props.ItemName?.LocalizedString;
			let rarity = props.Rarity?.value || "Uncommon";
			const name = localized || mi.name || mi.id;
			const fileName = `${name} - Decal - Rocket Racing.png`;

			let series = null;
			
			for (const entry of props.DataList || []) {
				if (typeof entry === 'object' && entry !== null) {
					if (entry.Series) {
						series = entry.Series.ObjectName?.split("'")?.slice(-2)[0];
						rarity = SERIES_CONVERSION[series] || rarity;
					}
				}
			}
			
			currentIcons.push(`{{${rarity} Rarity|[[File:${fileName}|130px|link=${name} (${carBodyName})]]}}`);
			currentNames.push(`{{Style Name|[[${name} (${carBodyName})|${name}]]}}`);
			
			if (currentIcons.length === 5) {
				decalRows.push(`|${currentIcons.join("\n|")}\n|-\n!${currentNames.join("\n!")}\n|-`);
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

async function generateSidekickRewardsSection(ProgressionRewards, filenameTagMap = {}) {
	if (!Array.isArray(ProgressionRewards) || ProgressionRewards.length === 0) return "";

	const rewardRows = [];

	for (const reward of ProgressionRewards) {
		const rewardID = reward?.PrimaryAssetName;

		if (!rewardID) continue;

		if (rewardID.startsWith("VTID_Companion_")) {
			const companionStyle = companionVTIDs.find(v => (v.ID || v.VariantTokenID) === rewardID);
			if (companionStyle) {
				// Try to find a matching image filename that was produced by generateStyleSection
				const matchFile = Object.keys(filenameTagMap || {}).find(fn => {
					const tags = filenameTagMap[fn] || {};
					return tags.channelTag === companionStyle.channelTag && tags.nameTag === companionStyle.nameTag;
				});
				if (matchFile) {
					rewardRows.push(`|{{C5 Locker Tile|${matchFile}|link=}}`);
					continue;
				}
			}
			console.warn(`Could not resolve companion VTID ${rewardID} to a style image`);
			continue;
		} else {
			const entryMeta = index.find(
				e => e.banner_id && e.banner_id.toLowerCase() === rewardID.toLowerCase() ||
				e.id && e.id.toLowerCase() === rewardID.toLowerCase()
			);
			if (!entryMeta) {
				console.log(`Skipping missing reward cosmetic: ${rewardID}`);
				continue;
			}

			let fileName = "";
			let rewardName = "";

			if (entryMeta.path) {
				const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${entryMeta.path}`);
				if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) {
					continue;
				}
				let itemDefinitionData = cosmeticData.find(dataEntry => dataEntry.Type in TYPE_MAP) || cosmeticData[0];

				const props = itemDefinitionData.Properties;
				const ID = itemDefinitionData.Name;
				const type = itemDefinitionData.Type;
				rewardName = props.ItemName?.LocalizedString || "Unknown";
				let cosmeticType = props.ItemShortDescription?.SourceString.trim();
				if (!cosmeticType) {
					cosmeticType = TYPE_MAP[type] || "";
				}

				fileName = `${rewardName} - ${cosmeticType} - Fortnite.png`;
			} else if (entryMeta.companionEmote) {
				rewardName = entryMeta.name;
				fileName = `${rewardName} - Sidekick Emote - Fortnite.png`;
			} else if (entryMeta.banner_icon) {
				fileName = entryMeta.banner_icon + '.png';
				rewardName = "Banner Icons";
			} else {
				continue;
			}

			rewardRows.push(`|{{C5 Locker Tile|${fileName}|link=${rewardName}}}`);
		}
	}

	if (rewardRows.length === 0) return "";

	const section = [
		"== Unlockable Rewards ==",
		"{{SidekickLocked}}",
		"{|",
		...rewardRows,
		"|}",
		"{{SidekickNotification}}"
	].join("\n");

	return section;
}

async function generateCompanionEmotePage(entryMeta, settings) {
	const out = [];

	const name = entryMeta.name;
	const id = entryMeta.id;

	const result = await searchCosmetic(entryMeta.companion_id);
	const { data, allData, companionEntryMeta } = result;
	const props = data.Properties;

	let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
				props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
	let series = null;

	for (const entry of props.DataList || []) {
		if (typeof entry === 'object' && entry !== null) {
			if (entry.Series) {
				series = entry.Series.ObjectName?.split("'")?.slice(-2)[0];
				rarity = SERIES_CONVERSION[series] || rarity;
			}
		}
	}

	const companionName = props.ItemName?.LocalizedString.trim();

	if (settings.displayTitle) {
		out.push(`{{DISPLAYTITLE:${name}}}`);
	}
	if (settings.isCollaboration) {
		out.push("{{Collaboration|Cosmetic}}");
	}
	if (settings.isUnreleased && !settings.isFortniteCrew) {
		out.push("{{Unreleased|Cosmetic}}");
	}

	out.push("{{Infobox Cosmetics");
	out.push(`|name = ${name}`);
	out.push(`|image = ${name} - Sidekick Emote - Fortnite.png`);
	out.push(`|rarity = ${rarity}`);
	out.push("|type = Emote");
	out.push("|additional = {{Built-In}}")
	out.push(`|unlocked = [[${companionName}'s Rewards}]]`);
	out.push(`|cost = ${settings.questCost} <br> <small>([[${companionName}]])</small>`);
	out.push(`|release = ${generateReleaseParameter(settings)}`);
	if (settings.updateVersion != "") {
		out.push(`|added_in = [[Update v${settings.updateVersion}]]`);
	} else {
		out.push("|added_in = ");
	}
	out.push(`|ID = ${id}`);
	out.push("|LEGOUse = y");
	out.push("|LEGOID = n");
	out.push("|BallisticUse = n");
	out.push("}}");
	out.push(`'''${name}''' is ${articleFor(rarity)} ${rarity} {{Emote}} in [[Fortnite]] that can be obtained as a reward from [[${companionName}'s Rewards]]. ${getSeasonReleased(settings.releaseDate, settings)}`);

	out.push(`\n${name} is [[${companionName}]]'s [[Built-In Cosmetics|Built-In Emote]] and can only be used while using it.`);

	out.push(`\n{{LEGO Emote|${name}}}`);

	out.push("");

	out.push("[[Category:Built-In Emotes]]");
	out.push("[[Category:Sidekick Emotes]]");

	return out.join("\n");
}

async function generateCosmeticPage(data, allData, settings, entryMeta) {
	if (!entryMeta.path && entryMeta.companionEmote) {
		return await generateCompanionEmotePage(entryMeta, settings);
	}

	const bundleEntries = getBundleEntries();

	let inOwnCharacterBundle = false;
	for (const bundleEntry of bundleEntries) {
		if (characterBundlePattern.test(bundleEntry.bundleID.value)) {
			inOwnCharacterBundle = true;
			break;
		}
	}

	const props = data.Properties;
	const ID = data.Name;
	const type = data.Type;
	const name = props.ItemName?.LocalizedString.trim() || "Unknown";
	const description = props.ItemDescription?.LocalizedString.trim() || "";
	let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
				 props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";

	let cosmeticType = props.ItemShortDescription?.SourceString.trim();
	if (!cosmeticType) {
		cosmeticType = TYPE_MAP[type] || "";
	}
	if (cosmeticType === "Character") {
		cosmeticType = "Outfit";
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
	if (cosmeticType === "Turbo") {
		cosmeticType = "Boost";
	}

	let usePlural = false;
	if (cosmeticType == 'Wheels' || cosmeticType == 'Kicks') {
		usePlural = true;
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
	let filterSetPath = "";
	let channelIconMap = null;
	
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
			if (entry.SharedFilterSet) {
				filterSetPath = entry.SharedFilterSet.AssetPathName.split('.')[0].replace('/CosmeticCompanions/Data/VariantFilterSet/', 'cosmetics/Companions/VariantFilterSets/');
			}
		}
	}

	// For pickaxes, if no mainIcon is defined, try to get it from the weapon definition
	if (cosmeticType == "Pickaxe" && (mainIcon.large === "" || mainIcon.icon === "")) {
		const weaponDefData = await loadGzJson(`${DATA_BASE_PATH}${entryMeta.weaponDefinition}`);
		if (!weaponDefData || !Array.isArray(weaponDefData)) return "";
		for (const entry of weaponDefData) {
			const props = entry?.Properties;
			if (!props) continue;

			for (const item of props.DataList || []) {
				if (typeof item === 'object' && item !== null) {
					if (item.LargeIcon?.AssetPathName) {
						mainIcon.large = item.LargeIcon.AssetPathName;
					}
					if (item.Icon?.AssetPathName) {
						mainIcon.icon = item.Icon.AssetPathName;
					}
				}
			}
		}
	}


	if (filterSetPath) {
		try {
			const filterJson = await loadGzJson(`${DATA_BASE_PATH}${filterSetPath}.json`);
			const map = {};
			const iconKeyToWikiFile = {
				'T_UI_Icon_Companions_Emote': 'Sidekick Emotes - Icon - Fortnite.png',
				'T_UI_Icon_Companions_Reaction': 'Reaction - Icon - Fortnite.png',
				'T_UI_Icon_Companions_Style': 'Style - Sidekick - Fortnite.png',
				'T_UI_Icon_Eye': 'Eyes Appearance - Sidekick - Fortnite.png',
				'T_UI_Icon_Pose': 'Quirk Appearance - Sidekick - Fortnite.png',
				'T_UI_Icon_Shape': 'Build Appearance - Sidekick - Fortnite.png'
			};

			const primaryTabs = filterJson?.[0]?.Properties?.FilterSet?.PrimaryTabs || [];

			const resolveWikiFile = (iconPath = '') => {
				const resName = iconPath.split('/').pop().split('.')[0] || '';
				const tKey = resName.replace(/^MI_/, 'T_');
				return iconKeyToWikiFile[tKey] || null;
			};

			const addMappings = (iconPath, channels = []) => {
				if (!Array.isArray(channels) || channels.length === 0) return;
				const wikiFile = resolveWikiFile(iconPath);
				for (const ch of channels) {
					if (wikiFile) {
						map[ch] = wikiFile;
					}
				}
			};

			for (const tab of primaryTabs) {
				addMappings(tab?.PrimaryTab?.Icon?.AssetPathName, tab?.PrimaryTab?.IncludedVariantChannels || []);
				for (const sub of tab?.SubTabs || []) {
					addMappings(sub?.Icon?.AssetPathName, sub?.IncludedVariantChannels || []);
				}
			}
			channelIconMap = map;
		} catch (err) {
			console.warn('Failed to load or parse filter set:', err);
		}
	}

	const setName = extractSetName(tags, cosmeticSets);
	const itemshop = tags.some(tag => tag.includes("ItemShop"));
	const hasUnlockableVariants = tags.includes("Cosmetics.UserFacingFlags.HasUpgradeQuests");
	//const isCrewProgressive = tags.includes("Cosmetics.CrewBling.Progressive");

	let styleSection = "";
	let featured = null;
	let variantChannels = {};
	let filenameTagMap = {};
	let variantMatchesMain = {};

	if (props.ItemVariants) {
		const variantData = [];
		for (const iv of props.ItemVariants) {
			const entryNumber = Number(iv.ObjectPath.split('.').pop());

			if (!allData[entryNumber]) continue;
			const candidate = allData[entryNumber];
			if (candidate && typeof candidate === 'object' && 'Type' in candidate && !IGNORE_VARIANT_TYPES.includes(candidate.Type)) {
				variantData.push(candidate);
			}
		}

		if (variantData.length > 0) {
			[styleSection, featured, variantChannels, filenameTagMap, variantMatchesMain] = await generateStyleSection(variantData, name, cosmeticType, isFestivalCosmetic, instrumentType, mainIcon, are_there_shop_assets(entryMeta) && !inOwnCharacterBundle, await getNumBRDav2Assets(entryMeta), channelIconMap);
		}
	}

	if (!featured && are_there_shop_assets(entryMeta)) {
		const leftToDo = await getNumBRDav2Assets(entryMeta) - 1;
		if (leftToDo > 0) {
			const featuredFiles = [];
			for (let i = 2; i <= leftToDo + 1; i++)
				featuredFiles.push(`${name} (${String(i).padStart(2, '0')}${inOwnCharacterBundle && cosmeticType == "Outfit" ? '' : ' - Featured'}) - ${inOwnCharacterBundle && cosmeticType == "Outfit" ? 'Item Shop Bundle' : cosmeticType} - Fortnite.png`);

			if (featuredFiles.length > 0) {
				if (featuredFiles.length === 1) {
					featured = featuredFiles[0];
				} else {
					featured = ["<gallery>", ...featuredFiles.map((filename, idx) => `${filename}|${idx + 1}`), "</gallery>"].join("\n");
				}
			}
		}
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
	
	if (settings.isUnreleased && !settings.isFortniteCrew) {
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
	
	if (are_there_shop_assets(entryMeta) || (itemshop && !settings.isBattlePass && cosmeticType != "Aura" && cosmeticType != "Reaction" && cosmeticType != "Loading Screen") || (cosmeticType == "Loading Screen" && settings.isBattlePass) || cosmeticType == "Car Body") {
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
			out.push(`${name}${inOwnCharacterBundle && cosmeticType == "Outfit" ? '' : ' (Featured)'} - ${inOwnCharacterBundle && cosmeticType == "Outfit" ? 'Item Shop Bundle' : cosmeticType} - Fortnite.png|Featured`);
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
		if (!additional.includes("Selectable Styles") && props.ItemVariants) {
			additional = "{{Selectable Styles}} " + additional;
		}
		out.push(`|additional = ${additional}`);
	} else if (props.ItemVariants) {
		out.push("|additional = {{Selectable Styles}}");
	}

	if (setName) {
		out.push(`|set = [[:Category:${setName} Set|${setName}]]`);
	}

	out.push(`|unlocked = ${generateUnlockedParameter(settings, bundleEntries)}`);
	out.push(`|cost = ${generateCostParameter(settings, bundleEntries, isFestivalCosmetic, name, rarity, cosmeticType, instrumentType)}`);
	
	if (settings.updateVersion != "") {
		out.push(`|added_in = [[Update v${settings.updateVersion}]]`);
	} else {
		out.push("|added_in = ");
	}

	out.push(`|release = ${generateReleaseParameter(settings)}`);
	
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
	let article = `'''${name}''' ${usePlural ? 'are' : 'is ' + articleFor(rarity)} {{${rarity}}} [[${cosmeticType}]] in [[Fortnite]]`;
	
	article += generateArticleIntro(settings, bundleEntries, name, cosmeticType, isFestivalCosmetic, instrumentType, usePlural);
	
	const seasonFirstReleasedFlag = getSeasonReleased(settings.releaseDate, settings, usePlural);
	
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
		if (settings.isFortniteCrew) {
			let legacyStyles = [];
			for (const [channel, info] of Object.entries(variantChannels)) {
				const variants = Array.isArray(info) ? info : (info && Array.isArray(info.variants) ? info.variants : []);
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

	// Unlockable Rewards section for Sidekicks
	if (cosmeticType === "Sidekick" && props.ProgressionRewards) {
		const rewardsSection = await generateSidekickRewardsSection(props.ProgressionRewards, filenameTagMap);
		if (rewardsSection)
			out.push(rewardsSection + "\n");
	}
	
	// Decals section for Car Bodies
	if (isRacingCosmetic && cosmeticType === "Car Body") {
		const decalsTable = await generateDecalsTable(name, tags);
		out.push(decalsTable);
	}

	// Featured Characters table (for Loading Screens only)
	if ((cosmeticType === "Loading Screen" || cosmeticType === "Spray" || cosmeticType === "Emoticon") && featuredCharactersEntries.length > 0) {
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

			if (pageTitle === "Unknown") {
				currentIcons.push(`|{{Style Background|${file}}}`);
			} else {
				currentIcons.push(`|{{Style Background|${file}|link=${pageTitle}}}`);
			}
			
			
			if (pageTitle === "Unknown") {
				currentNames.push("!Unknown");
			} else if (pageTitle !== displayName) {
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
			if (!hasLegoFeaturedRender) {
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

	// Renders section
	if (settings.hasRenders) {
		const channels = variantChannels || {};
		const channelKeys = Object.keys(channels);
		let columns = [];

		if (channelKeys.length === 1 && !isRacingCosmetic) {
			// Use the variants from the single channel. Exclude any variants whose preview image
			// is identical to the main icon (they are not unique renders).
			const ch = channelKeys[0];
			const chInfo = channels[ch];
			columns = Array.isArray(chInfo) ? chInfo.slice() : ((chInfo && Array.isArray(chInfo.variants)) ? chInfo.variants.slice() : []);

			if (variantMatchesMain) {
				columns = columns.filter(v => {
					const key = `${ch},${v}`;
					return !variantMatchesMain[key];
				});
			}
			if (!columns.includes(name)) {
				columns.unshift(name);
			}
			if (columns.length === 0) columns = [name];
		} else {
			columns = [name];
		}

		if (hasLegoStyle(entryMeta) && cosmeticType === "Outfit") {
			columns.push('LEGO');
		}

		const channelPrefix = channelKeys.length === 1 && channelKeys[0].toLowerCase() !== "style" ? `${channelKeys[0]} - ` : '';

		const chunks = chunkList(columns, 3);

		const rendersSection = [];
		rendersSection.push('== Render ==');
		rendersSection.push('<center>');
		rendersSection.push('{|');

		const colspanFlag = columns.length == 1 ? '' : `colspan="${columns.length > 3 ? 3 : columns.length}"|`;
		rendersSection.push(`!${colspanFlag}{{Style Header|Render}}`);
		rendersSection.push('|-');

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];

			rendersSection.push(chunk.map(c => {
				let styleName = c;
				if (c !== 'LEGO' && c !== name && variantMatchesMain && !variantMatchesMain[`${channelKeys[0]},${c}`]) {
					styleName = `${channelPrefix}${c}`;
				}
				return `!{{Style Name|${styleName}}}`;
			}).join('\n'));
			rendersSection.push('|-');

			rendersSection.push(chunk.map(c => {
				let filename = '';
				let fileEnding = isRacingCosmetic ? 'Rocket Racing' : (isFestivalCosmetic ? 'Fortnite Festival' : 'Fortnite');

				const carBodyName = cosmeticType == "Decal" && entryMeta.carBodyTag && index.find(e => e.id && (e.id.toLowerCase().startsWith("carbody_") || e.id.startsWith("body_")) && entryMeta.carBodyTag == e.carBodyTag)?.name;
				let carNameFlag = carBodyName ? `${carBodyName} - ` : '';

				if (c === 'LEGO') {
					filename = `${name} (Render) - ${cosmeticType == "Wheel" ? "Wheels" : cosmeticType} - LEGO Fortnite.webm`;
				} else if (c === name) {
					filename = `${name} (${carNameFlag}Render) - ${cosmeticType == "Wheel" ? "Wheels" : cosmeticType} - ${fileEnding}.webm`;
				} else {
					filename = `${name} (${channelPrefix}${c} - Render) - ${cosmeticType == "Wheel" ? "Wheels" : cosmeticType} - ${fileEnding}.webm`;
				}
				return `|[[File:${filename}]]`;
			}).join('\n'));
			if (i < chunks.length - 1) rendersSection.push('|-');
		}

		rendersSection.push('|}');
		rendersSection.push('{{RenderNotification}}');
		rendersSection.push('</center>');

		out.push(rendersSection.join('\n') + '\n');
	}
	
	if (settings.isItemShop && settings.includeAppearances) {
		const appearancesSection = [];
		appearancesSection.push("== [[Item Shop]] Appearances ==", "{{ItemShopAppearances", `|name = ${settings.shopAppearances}`);
		if (settings.shopAppearances != name) {
			appearancesSection.push(`|name2 = ${name}`);
		}
		if (isFestivalCosmetic && cosmeticType != "Aura" && instrumentType != cosmeticType
			&& (cosmeticType == "Back Bling" || cosmeticType == "Pickaxe")
		) {
			appearancesSection.push(`|bundled_with = [[${name} (${instrumentType})|${name}]]`);
		} else {
			if (bundleEntries.length == 1 && settings.shopCost == "") {
				const be = bundleEntries[0];
				if (be.bundleName && be.bundleName.value) {
					const rawName = be.bundleName.value.trim();
					const bundleName = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
					const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
					const theFlag = rawName.toLowerCase().startsWith("the ") || addItemShopBundleTag ? "" : "the ";
					appearancesSection.push(`|bundled_with = ${theFlag}${addItemShopBundleTag ? `[[${bundleName} (Item Shop Bundle)|${bundleName}]]` : `[[${bundleName}]]`}`);
				}
			} else if (inOwnCharacterBundle) {
				for (const be of bundleEntries) {
					if (characterBundlePattern.test(be.bundleID.value)) {
						if (be.bundleName && be.bundleName.value) {
							if (be.bundleName.value.trim().toLowerCase() === name.toLowerCase() || settings.shopCost == "") {
								const rawName = be.bundleName.value.trim();
								const bundleName = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
								const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
								const theFlag = rawName.toLowerCase().startsWith("the ") || addItemShopBundleTag ? "" : "the ";
								appearancesSection.push(`|bundled_with = ${theFlag}${addItemShopBundleTag ? `[[${bundleName} (Item Shop Bundle)|${bundleName}]]` : `[[${bundleName}]]`}`);
								break;
							}
						}
					}
				}
			}
		}
		appearancesSection.push("}}");

		out.push(appearancesSection.join('\n') + "\n");
	}

	// Remixes template
	if (settings.remixOf) {
		const typeFlag = cosmeticType != "Outfit" ? `|${cosmeticType}` : "";
		out.push(`{{Remixes|${settings.remixOf}${typeFlag}}}` + "\n");
	}
	
	if (isFestivalCosmetic && cosmeticType == "Back Bling") {
		out.push(`== Trivia ==\n* ${name} will come off the player's back when equipped with the [[${name} (Pickaxe)|${name}]] [[Pickaxe]].\n`);
	}

	if (cosmeticType === "Emoticon" && tags.includes("Cosmetics.UserFacingFlags.Emoticon.Animated") && props.SpriteSheet) {
		out.push(`== Gallery ==\n<tabber>\n|-|Other=\n=== Other ===\n<gallery>\n${name} (Sheet) - ${cosmeticType} - Fortnite.png|Sprite Sheet\n</gallery>\n</tabber>\n`);
	}

	// Categories
	const addedCategories = new Set(); // Track categories that have been added
	
	if (setName) {
		out.push(`[[Category:${setName} Set]]`);
		addedCategories.add(`${setName} Set`);
	}

	if (settings.remixOf) {
		out.push(`[[Category:Remixed Cosmetics]]`);
		addedCategories.add('Remixed Cosmetics');
	}

	if (hasUnlockableVariants) {
		out.push("[[Category:Unlockable Styles]]");
		addedCategories.add('Unlockable Styles');
	}

	if (settings.isFree) {
		out.push("[[Category:Free Cosmetics]]");
		addedCategories.add('Free Cosmetics');
	}
	
	if (isFestivalCosmetic && (cosmeticType != instrumentType)) {
		out.push("[[Category:Compatible Cosmetics]]");
		addedCategories.add('Compatible Cosmetics');
	}

	if (settings.isRocketPass && settings.rocketPassSeason) {
		out.push(`[[Category:Rocket Pass ${settings.rocketPassSeason}]]`);
		addedCategories.add(`Rocket Pass ${settings.rocketPassSeason}`);
	}
	
	// Add additional selected categories (avoid duplicates)
	selectedCategories.forEach(category => {
		if (!addedCategories.has(category)) {
			out.push(`[[Category:${category}]]`);
		}
	});
	
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
		elements.wikiPageBtn.disabled = true;
		elements.wikiPageBtn.textContent = 'Create page';
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

async function determinePageTitle(cosmeticName, cosmeticType) {
	const duplicates = index.filter(e => e.name && e.name.toLowerCase() === cosmeticName.toLowerCase());
	const jamTrackExists = jamTrackNames.filter(name => name.toLowerCase() === cosmeticName.toLowerCase()).length > 0;

	const typedPageTitle = `${cosmeticName} (${cosmeticType})`;
	
	// If duplicates exist, default to typed page title
	if (duplicates.length > 1 || jamTrackExists) {
		return typedPageTitle;
	}
	
	// Prefer base name if it exists
	const baseExists = await pageExists(cosmeticName);
	if (baseExists) {
		return cosmeticName;
	}
	// Check if typed page exists
	const typedExists = await pageExists(typedPageTitle);
	if (typedExists) {
		return typedPageTitle;
	}
	// Neither exists, default to creating with base name
	return cosmeticName;
}

async function openWikiPage() {
	const exists = await pageExists(pageTitle)

	const wikiUrl = `https://fortnite.fandom.com/wiki/${encodeURIComponent(pageTitle)}`;
	const finalUrl = exists ? `${wikiUrl}?action=edit` : wikiUrl;
	
	window.open(finalUrl, '_blank');
	showStatus(`${exists ? 'Edit' : 'Create'} page opened in new tab`, 'success');
	setTimeout(hideStatus, 2000);
}

async function updateWikiPageButton(cosmeticName, cosmeticType) {
	const cosmetic = index.find(e => e.name && e.name.toLowerCase() === cosmeticName.toLowerCase());
	pageTitle = await determinePageTitle(cosmeticName, cosmeticType);
	
	if (!cosmetic) {
		elements.wikiPageBtn.disabled = true;
		elements.wikiPageBtn.textContent = 'Create page';
		return;
	}
	
	elements.wikiPageBtn.disabled = false;
	elements.wikiPageBtn.textContent = await pageExists(pageTitle) ? 'Edit page' : 'Create page';
}

async function generatePage() {
	const cosmeticInput = elements.cosmeticInput.value.trim();
	const cosmeticDisplayInput = elements.cosmeticDisplayInput.value.trim();

	let settings = {
		...getSourceReleaseSettings(elements),
		displayTitle: elements.displayTitle.checked,
		updateVersion: elements.updateVersion.value.trim(),
		isCollaboration: elements.collaboration.checked,
		hasRenders: elements.hasRenders ? elements.hasRenders.checked : false,
		remixOf: elements.remixOf ? elements.remixOf.value.trim() : '',
		isRocketLeagueCosmetic: elements.isRocketLeagueCosmetic.checked,
		isRocketLeagueExclusive: elements.isRocketLeagueExclusive.checked
	}

	if (!cosmeticInput) {
		showStatus('Please enter a cosmetic ID or name', 'error');
		return;
	}

	const validationError = validateSourceSettings(settings, elements);
	if (validationError) {
		showStatus(validationError, 'error');
		return;
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

		const pageContent = await generateCosmeticPage(data, allData, settings, entryMeta);
		
		displayOutput(pageContent);
		showStatus('Page generated successfully!', 'success');
		setTimeout(hideStatus, 2000);

	} catch (error) {
		console.error('Error generating page:', error);
		showStatus('Error generating page: ' + error.message, 'error');
	}
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
	const entry = featuredCharactersEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
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

function renderSelectedCategories() {
	const container = document.getElementById('selected-categories');
	container.innerHTML = '';
	
	selectedCategories.forEach(category => {
		const badge = document.createElement('div');
		badge.className = 'category-badge';
		badge.innerHTML = `
			<span style="cursor: pointer;" data-category="${category}">${category}</span>
			<span class="remove-category" data-category="${category}">✕</span>
		`;
		badge.querySelector('span:first-child').addEventListener('click', () => {
			window.open(`https://fortnite.fandom.com/wiki/Category:${category}`, '_blank');
		});
		container.appendChild(badge);
	});
	
	container.querySelectorAll('.remove-category').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const category = e.target.getAttribute('data-category');
			removeCategory(category);
		});
	});
	
	updateDropdownOptions();
}

function updateDropdownOptions() {
	const dropdown = document.getElementById('categories-dropdown');
	if (!dropdown) return;
	
	const options = dropdown.querySelectorAll('option:not([value=""])');
	options.forEach(option => {
		const value = option.value;
		const isSelected = selectedCategories.includes(value);
		const willAutoGenerate = willCategoryAutoGenerate(value);
		if (willAutoGenerate && isSelected) {
			removeCategory(value);
		}
		option.style.display = (isSelected || willAutoGenerate) ? 'none' : 'block';
	});
}

function willCategoryAutoGenerate(categoryName) {
	if (categoryName === 'Free Cosmetics') {
		return (elements.sourceBattlePass?.checked && elements.passFreeBP?.checked) ||
					 (elements.sourceOGPass?.checked && elements.passFreeOG?.checked) ||
					 (elements.sourceMusicPass?.checked && elements.passFreeMusic?.checked) ||
					 (elements.sourceLEGOPass?.checked && elements.passFreeLEGO?.checked);
	}

	if (categoryName === 'Compatible Cosmetics') {
		return addCompatibleCosmeticsCategory;
	}
	
	return false;
}

function populateCategoriesDropdown() {
	const dropdown = document.getElementById('categories-dropdown');
	if (!dropdown) return;
	
	const allOptions = dropdown.querySelectorAll('option');
	allOptions.forEach(option => {
		if (option.value !== '') {
			option.remove();
		}
	});
	
	CATEGORIES_FOR_SELECTION.forEach(category => {
		const option = document.createElement('option');
		option.value = category;
		option.textContent = category;
		dropdown.appendChild(option);
	});
}

function addCategory(category) {
	if (category && !selectedCategories.includes(category)) {
		selectedCategories.push(category);
		renderSelectedCategories();
	}
}

function removeCategory(category) {
	const index = selectedCategories.indexOf(category);
	if (index > -1) {
		selectedCategories.splice(index, 1);
		renderSelectedCategories();
	}
}

// Setup source selection logic
function handleSourceSelection() {
	// Reset all pass-free checkboxes to false when the source changes
	if (elements.passFreeBP) elements.passFreeBP.checked = false;
	if (elements.passFreeOG) elements.passFreeOG.checked = false;
	if (elements.passFreeMusic) elements.passFreeMusic.checked = false;
	if (elements.passFreeLEGO) elements.passFreeLEGO.checked = false;

	const rocketPassChecked = elements.sourceRocketPass.checked;

	if (rocketPassChecked) {
		document.getElementById('rocket-league-cosmetic').checked = true;
		document.getElementById('rocket-league-exclusive').checked = true;
		document.getElementById('rocket-league-cosmetic').dispatchEvent(new Event('change'));
		document.getElementById('rocket-league-exclusive').dispatchEvent(new Event('change'));
		document.getElementById('rocket-league-cosmetic').disabled = true;
		document.getElementById('rocket-league-exclusive').disabled = true;
	}

	if (!rocketPassChecked) {
		document.getElementById('rocket-league-cosmetic').disabled = false;
		document.getElementById('rocket-league-exclusive').disabled = false;
		document.getElementById('rocket-league-cosmetic').checked = false;
		document.getElementById('rocket-league-exclusive').checked = false;
	}
}

async function initialiseApp() {
	elements = {
		cosmeticInput: document.getElementById('cosmetic-input'),
		cosmeticInputName: document.getElementById('cosmetic-input-name'),
		cosmeticDisplayInput: document.getElementById('cosmetic-display'),
		generateBtn: document.getElementById('generate-btn'),
		wikiPageBtn: document.getElementById('wiki-page-btn'),
		copyBtn: document.getElementById('copy-btn'),
		clearBtn: document.getElementById('clear-btn'),
		status: document.getElementById('status'),
		output: document.getElementById('output'),
		updateVersion: document.getElementById('update-version'),
		
		displayTitle: document.getElementById('display-title'),
		collaboration: document.getElementById('collaboration'),
		isRocketLeagueCosmetic: document.getElementById('rocket-league-cosmetic'),
		isRocketLeagueExclusive: document.getElementById('rocket-league-exclusive'),
		hasRenders: document.getElementById('has-renders'),
		remixOf: document.getElementById('remix-of'),
		categoriesDropdown: document.getElementById('categories-dropdown'),
	};

	initSourceReleaseControls({
		sources: ['itemShop', 'battlePass', 'fortniteCrew', 'ogPass', 'musicPass', 'legoPass', 'questReward', 'rocketPass'],
		autoReleaseSources: ['battlePass', 'fortniteCrew', 'ogPass', 'musicPass', 'legoPass'],
		hideItemShopHistorySources: ['rocketPass'],
		onSourceChange: handleSourceSelection
	}, elements);

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

	// Initialize shared form behaviors
	initFormBehaviors(elements);

	function setupRocketLeagueToggle() {
		if (!elements.isRocketLeagueCosmetic) return;
		
		elements.isRocketLeagueCosmetic.addEventListener('change', () => {
			const rocketLeagueChecked = elements.isRocketLeagueCosmetic.checked;
			const exclusiveField = document.getElementById('rocket-league-exclusive-field');
			if (exclusiveField) {
				exclusiveField.style.display = rocketLeagueChecked ? 'block' : 'none';
			}
		});
	}
	setupRocketLeagueToggle();

	// Additional event listener for Fortnite Crew auto-detection
	elements.sourceFortniteCrew.addEventListener('click', handleFortniteCrewClick);

	// Event listeners for categories dropdown option updates
	if (elements.passFreeBP) elements.passFreeBP.addEventListener('change', updateDropdownOptions);
	if (elements.passFreeOG) elements.passFreeOG.addEventListener('change', updateDropdownOptions);
	if (elements.passFreeMusic) elements.passFreeMusic.addEventListener('change', updateDropdownOptions);
	if (elements.passFreeLEGO) elements.passFreeLEGO.addEventListener('change', updateDropdownOptions);
	
	// Racing - Rocket League visibility
	elements.isRocketLeagueCosmetic.addEventListener('change', () => {
		const rocketLeagueChecked = elements.isRocketLeagueCosmetic.checked;
		if (rocketLeagueChecked) {
			document.getElementById('rocket-league-exclusive-field').style.display = 'block';
		} else {
			document.getElementById('rocket-league-exclusive-field').style.display = 'none';
		}
	});
	
	// Additional Categories dropdown
	elements.categoriesDropdown.addEventListener('change', (e) => {
		const selectedValue = e.target.value;
		if (selectedValue) {
			addCategory(selectedValue);
			e.target.value = ''; // Reset dropdown to default
		}
	});

	// Basic event listeners
	elements.generateBtn.addEventListener('click', generatePage);
	elements.wikiPageBtn.addEventListener('click', openWikiPage);
	elements.copyBtn.addEventListener('click', copyToClipboard);
	elements.clearBtn.addEventListener('click', clearOutput);

	elements.cosmeticInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') generatePage();
	});

	elements.cosmeticDisplayInput.addEventListener('input', updateSuggestions);

	populateCategoriesDropdown();

	try {
		showStatus('Loading cosmetic data...', 'loading');
		
		await loadIndex();
		await loadJamTrackNames();
		await loadCompanionVTIDs();
		await loadCosmeticSets();

		hideStatus();
		console.log('Cosmetic Page Generator initialised successfully');
	} catch (error) {
		console.error('Initialisation error:', error);
		showStatus('Failed to load cosmetic data. Please refresh the page.', 'error');
	}

	// Initialize shared bundle controls
	initBundleControls(index);
	setupBundleControls();
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