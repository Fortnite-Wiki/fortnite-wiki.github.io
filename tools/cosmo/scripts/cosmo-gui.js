import { loadFflate, loadGzJson } from '../../jsondata.js';

const DATA_BASE_PATH = '../../../data/';
const BASE_URL = 'https://cosmo.fdeb.live.use1a.on.epicgames.com/v1/item';
const COSMO_PROXY_URL = 'https://cosmo-proxy.fortnite-wiki-tools.workers.dev/?url=';
const CUSTOM_RELEASE_VALUE = '__custom__';
const MAX_AUTO_COMBINATIONS = 1000;
const MAX_PARALLEL_PREVIEW_LOADS = 6;
const ZIP_DOWNLOAD_TIMEOUT_MS = 10000;
const MIN_DAV2_SEASON = 19;

const RELEASES = [
	{
		version: '42.20',
		key: 'B6uZdxOe93qSiI/qMiSx28O3CfHRttPHHt5n1DCSyds=',
		label: '42.20 - Latest',
	},
	{
		version: '42.10',
		key: 's6BZWKurWDx0uXEMiH6NuHgrdhYAYxtDej6OzDZkaGs=',
		label: '42.10',
	},
	{
		version: '42.00',
		key: 'x7SL9QH7uQccGqpounh26Jz4x+ugIx0fsl+Wf+EpVKQ=',
		label: '42.00',
	},
	{
		version: '41.30',
		key: 'OE4VTg8RVeDrg28sI23J6cClN+ROG0fVeEJTy6+lAnI=',
		label: '41.30',
	},
	{
		version: '41.20',
		key: 'fYm7gPh1KVzF1iWkD1rqGQBhAb7FHmJO4CNBCfYlZBk=',
		label: '41.20',
	},
	{
		version: '41.10',
		key: 'vHckCP9oI+pW5prHTYaMbXiC1YVJ2w4yRBtGUQzmYMY=',
		label: '41.10',
	},
	{
		version: '41.00',
		key: 'BhmLB0jhpLStVemxcXODVXCbCdmAVHozdTbrG4+R+4E=',
		label: '41.00',
	},
	{
		version: '40.41',
		key: 'N9X0xYQZe74po4fNeCQxwTTGlKVpTzjr9QE1E8SMrEU=',
		label: '40.41',
	},
	{
		version: '40.40',
		key: 'otRg6EEDUM+ZE9v5GZzq+dX8AklDcUb6NY0YI9lyNJU=',
		label: '40.40',
	},
];

const TYPE_MAPPINGS = {
	companion_: 'CosmeticMimosa',
	character_: 'AthenaCharacter',
	solidwave_character: 'AthenaCharacter',
	cid_: 'AthenaCharacter',
	bean_: 'AthenaCharacter',
	eid_: 'AthenaDance',
	bid_: 'AthenaBackpack',
	backpack_: 'AthenaBackpack',
	gadget_: 'AthenaBackpack',
	pickaxe_: 'AthenaPickaxe',
	halloweenscythe: 'AthenaPickaxe',
	defaultpickaxe: 'AthenaPickaxe',
	glider_: 'AthenaGlider',
	solo_: 'AthenaGlider',
	duo_: 'AthenaGlider',
	squad_: 'AthenaGlider',
	umbrella_: 'AthenaGlider',
	founderumbrella: 'AthenaGlider',
	founderglider: 'AthenaGlider',
	preseasonglider: 'AthenaGlider',
	defaultglider: 'AthenaGlider',
	chillyfabric: 'AthenaItemWrap',
	wrap_: 'AthenaItemWrap',
	loadingscreen_: 'AthenaLoadingScreen',
	lsid_: 'AthenaLoadingScreen',
	spray_: 'AthenaDance',
	spid_: 'AthenaDance',
	emoticon_: 'AthenaDance',
	emoji_: 'AthenaDance',
	toy_: 'AthenaToy',
	petcarrier_: 'AthenaPetCarrier',
	petid_: 'AthenaPet',
	musicpack_: 'AthenaMusicPack',
	banner_: 'HomebaseBannerIcon',
	contrail_: 'AthenaSkyDiveContrail',
	defaultcontrail: 'AthenaSkyDiveContrail',
	trails_id_: 'AthenaSkyDiveContrail',
	trails_: 'AthenaSkyDiveContrail',
	shoes_: 'CosmeticShoes',
	vtid_: 'CosmeticVariantToken',
	sparksaura_: 'SparksAura',
	sparks_bass_: 'SparksBass',
	sparks_drum_: 'SparksDrums',
	sparks_guitar_: 'SparksGuitar',
	sparks_keytar_: 'SparksKeyboard',
	sparks_mic_: 'SparksMicrophone',
	carbody_: 'VehicleCosmetics_Body',
	body_: 'VehicleCosmetics_Body',
	carskin_: 'VehicleCosmetics_Skin',
	wheel_: 'VehicleCosmetics_Wheel',
	id_body_: 'VehicleCosmetics_Body',
	id_skin_: 'VehicleCosmetics_Skin',
	id_drifttrail_: 'VehicleCosmetics_DriftTrail',
	id_booster_: 'VehicleCosmetics_Booster',
};

const VARIANT_OPTION_FIELDS = [
	'ParticleOptions',
	'PartOptions',
	'MaterialOptions',
	'MeshOptions',
	'MorphOptions',
	'MorphTargetOptions',
	'ColorOptions',
	'TextureOptions',
	'NumericalOptions',
	'ProgressiveStageOptions',
	'GenericPropertyOptions',
	'ContextualAnimSceneEmoteOptions',
	'AdditivePoseOptions',
	'Variants',
];

const SPARKS_INSTRUMENT_TYPES = {
	bass: 'SparksBass',
	drum: 'SparksDrums',
	drumkit: 'SparksDrums',
	guitar: 'SparksGuitar',
	keytar: 'SparksKeyboard',
	mic: 'SparksMicrophone',
};

const ZIP_ASSET_TYPE_LABELS = [
	[/^bundle_/i, 'Bundle'],
	[/^(character_|cid_|solidwave_character)/i, 'Outfit'],
	[/^(bid_|backpack_|gadget_)/i, 'Back Bling'],
	[/^(pickaxe_|defaultpickaxe)|pickaxe$/i, 'Pickaxe'],
	[/^(glider_|solo_|duo_|squad_|umbrella_|founderumbrella|founderglider|preseasonglider|defaultglider)|glider$/i, 'Glider'],
	[/^wrap_/i, 'Wrap'],
	[/^(eid_|spray_|spid_|emoticon_|emoji_)/i, 'Emote'],
	[/^toy_/i, 'Toy'],
	[/^(petcarrier_|petid_)/i, 'Pet'],
	[/^musicpack_/i, 'Music'],
	[/^(loadingscreen_|lsid_)/i, 'Loading Screen'],
	[/^banner_/i, 'Banner'],
	[/^(contrail_|defaultcontrail|trails_id_|trails_)/i, 'Contrail'],
	[/^shoes_/i, 'Kicks'],
	[/^companion_/i, 'Sidekick'],
	[/^sparks_bass_/i, 'Bass'],
	[/^sparks_drum_/i, 'Drums'],
	[/^sparks_guitar_/i, 'Guitar'],
	[/^sparks_keytar_/i, 'Keytar'],
	[/^sparks_mic_/i, 'Microphone'],
	[/^sparksaura_/i, 'Aura'],
	[/^carbody_/i, 'Car Body'],
	[/^carskin_/i, 'Decal'],
	[/^wheel_/i, 'Wheels'],
];

const ZIP_DATA_PATH_TYPE_LABELS = [
	[/^Characters\//i, 'Outfit'],
	[/^Backpacks\//i, 'Back Bling'],
	[/^Pickaxes\//i, 'Pickaxe'],
	[/^Gliders\//i, 'Glider'],
	[/^Wraps\//i, 'Wrap'],
	[/^Dances\//i, 'Emote'],
	[/^Toys\//i, 'Toy'],
	[/^PetCarriers\//i, 'Pet'],
	[/^Pets\//i, 'Pet'],
	[/^MusicPacks\//i, 'Music'],
	[/^LoadingScreens\//i, 'Loading Screen'],
	[/^Contrails\//i, 'Contrail'],
	[/^Shoes\//i, 'Kicks'],
	[/^Companions\//i, 'Sidekick'],
	[/^Racing\/Bodies\//i, 'Car Body'],
	[/^Racing\/Skins\//i, 'Decal'],
	[/^Racing\/Wheels\//i, 'Wheels'],
	[/^Racing\/DriftTrails?\//i, 'Trail'],
	[/^Racing\/Boosters\//i, 'Boost'],
	[/^Festival\/Instrument\/Bass\//i, 'Bass'],
	[/^Festival\/Instrument\/Drum\//i, 'Drums'],
	[/^Festival\/Instrument\/Guitar\//i, 'Guitar'],
	[/^Festival\/Instrument\/Keytar\//i, 'Keytar'],
	[/^Festival\/Instrument\/Mic\//i, 'Microphone'],
];

const COSMO_DATA_PATH_TYPE_MAPPINGS = [
	[/^Characters\//i, 'AthenaCharacter'],
	[/^Backpacks\//i, 'AthenaBackpack'],
	[/^Pickaxes\//i, 'AthenaPickaxe'],
	[/^Gliders\//i, 'AthenaGlider'],
	[/^(Wraps|ItemWraps)\//i, 'AthenaItemWrap'],
	[/^Dances\//i, 'AthenaDance'],
	[/^Toys\//i, 'AthenaToy'],
	[/^PetCarriers\//i, 'AthenaPetCarrier'],
	[/^Pets\//i, 'AthenaPet'],
	[/^MusicPacks\//i, 'AthenaMusicPack'],
	[/^LoadingScreens\//i, 'AthenaLoadingScreen'],
	[/^Contrails\//i, 'AthenaSkyDiveContrail'],
	[/^Shoes\//i, 'CosmeticShoes'],
	[/^Companions\//i, 'CosmeticMimosa'],
	[/^Racing\/Bodies\//i, 'VehicleCosmetics_Body'],
	[/^Racing\/Skins\//i, 'VehicleCosmetics_Skin'],
	[/^Racing\/Wheels\//i, 'VehicleCosmetics_Wheel'],
	[/^Racing\/DriftTrails?\//i, 'VehicleCosmetics_DriftTrail'],
	[/^Racing\/Boosters\//i, 'VehicleCosmetics_Booster'],
	[/^Festival\/Instrument\/Bass\//i, 'SparksBass'],
	[/^Festival\/Instrument\/Drum\//i, 'SparksDrums'],
	[/^Festival\/Instrument\/Guitar\//i, 'SparksGuitar'],
	[/^Festival\/Instrument\/Keytar\//i, 'SparksKeyboard'],
	[/^Festival\/Instrument\/Mic\//i, 'SparksMicrophone'],
];

const ZIP_IMAGE_TYPE_LABELS = {
	locker_preview_image: 'Locker Preview',
	preview_image: 'Preview',
	preview_permutation_image: 'Permutation',
	store_image: 'Store',
};

let index = [];
let latestDav2Paths = new Map();
let generatedImages = [];
let selectedAsset = null;
let detectedStyleGroups = [];
let junoProductStyleGroups = [];
let previewLoadRun = 0;

const elements = {};

async function loadIndex() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	latestDav2Paths = buildLatestDav2PathMap(index);
}

function buildLatestDav2PathMap(entries) {
	const map = new Map();
	if (!Array.isArray(entries)) return map;

	for (const entry of entries) {
		for (const path of [entry?.dav2, entry?.dav2_path]) {
			const dav2Id = getDisplayAssetId(path);
			if (!dav2Id) continue;

			const key = dav2Id.toLowerCase();
			const season = getDav2Season(path);
			const existing = map.get(key);
			if (!existing || season > existing.season) {
				map.set(key, { path, season });
			}
		}
	}

	return map;
}

function getLatestDav2Path(path) {
	const dav2Id = getDisplayAssetId(path);
	if (!dav2Id) return path || '';
	return latestDav2Paths.get(dav2Id.toLowerCase())?.path || path || '';
}

function getDav2Season(path) {
	const match = String(path || '').match(/\/S(\d+)\//i);
	return match ? Number(match[1]) : -1;
}

function showStatus(message, type = 'loading') {
	if (!elements.status) return;
	elements.status.textContent = message;
	elements.status.className = `status ${type}`;
}

function hideStatus() {
	if (!elements.status) return;
	elements.status.className = 'status hidden';
	elements.status.textContent = '';
}

function scoreMatch(value, input, exactScore, startScore, includeScore) {
	if (!value) return 0;
	const normalized = value.toLowerCase();
	if (normalized === input) return exactScore;
	if (normalized.startsWith(input)) return startScore;
	if (normalized.includes(input)) return includeScore;
	return 0;
}

function getAssetCandidates() {
	if (!Array.isArray(index)) return [];

	return index.flatMap((entry) => {
		const candidates = [];

		if (typeof entry.id === 'string' && typeof entry.name === 'string' && !isHiddenSearchAssetId(entry.id)) {
			const dav2Path = getLatestDav2Path(entry.dav2);
			candidates.push({
				kind: 'Cosmetic',
				id: entry.id,
				name: entry.name,
				dataPath: entry.path || '',
				carBodyTag: entry.carBodyTag || '',
				jido: entry.jido || '',
				beanid: entry.beanid || '',
				dav2Path,
				dav2Id: getDisplayAssetId(dav2Path) || getPrimaryDisplayAssetId(entry.id),
			});
		}

		if (typeof entry.bundle_id === 'string' && typeof entry.bundle_name === 'string') {
			const dav2Path = getLatestDav2Path(entry.dav2_path);
			candidates.push({
				kind: 'Bundle',
				id: entry.bundle_id,
				name: entry.bundle_name,
				dataPath: '',
				dav2Path,
				dav2Id: getDisplayAssetId(dav2Path),
			});
		}

	return candidates;
	});
}

function isHiddenSearchAssetId(assetId) {
	return /^petid_/i.test(String(assetId || ''));
}

function getDisplayAssetId(path) {
	if (typeof path !== 'string' || !path.trim()) return '';
	const fileName = path.split('/').pop() || '';
	return fileName.replace(/\.json$/i, '');
}

function updateDav2Hint() {
	if (!elements.assetDav2Hint) return;

	if (elements.imageType.value !== 'store_image') {
		elements.assetDav2Hint.hidden = true;
		elements.assetDav2Hint.textContent = '';
		return;
	}

	const dav2Id = elements.assetDav2Id.value.trim();
	const dav2Path = elements.assetDav2Path.value.trim();
	const enteredId = getEnteredAssetId();
	const inferredDav2Id = getPrimaryDisplayAssetId(enteredId);
	const displayDav2Id = dav2Id || inferredDav2Id;

	if (!displayDav2Id) {
		elements.assetDav2Hint.hidden = true;
		elements.assetDav2Hint.textContent = '';
		return;
	}

	const inferredText = dav2Id ? '' : ' (inferred)';
	const pathText = dav2Path ? ` • ${dav2Path}` : '';
	elements.assetDav2Hint.textContent = `DAV2: ${displayDav2Id}${inferredText}${pathText}`;
	elements.assetDav2Hint.hidden = false;
}

function updateAssetSuggestions() {
	const input = elements.assetDisplay.value.trim().toLowerCase();
	elements.assetId.value = '';
	elements.assetName.value = '';
	elements.assetKind.value = '';
	elements.assetDataPath.value = '';
	elements.assetDav2Path.value = '';
	elements.assetDav2Id.value = '';
	selectedAsset = null;
	applyAssetMode();
	updateDav2Hint();
	clearDetectedStyles('Select an asset to load options, or generate a custom ID without detected styles.');
	elements.assetSuggestions.innerHTML = '';
	if (!input) return;

	const matches = getAssetCandidates()
		.map((asset) => ({
			asset,
			score:
				scoreMatch(asset.name, input, 100, 75, 50) +
				scoreMatch(asset.id, input, 60, 35, 15),
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 15);

	for (const { asset } of matches) {
		const div = document.createElement('div');
		const kind = document.createElement('span');
		const label = document.createElement('span');
		kind.className = 'suggestion-kind';
		kind.textContent = asset.kind;
		label.className = 'suggestion-label';
		label.textContent = `${asset.name} (${asset.id})`;
		div.append(kind, label);
		div.addEventListener('click', () => selectAsset(asset));
		elements.assetSuggestions.appendChild(div);
	}
}

async function selectAsset(asset) {
	selectedAsset = asset;
	elements.assetDisplay.value = `${asset.name} (${asset.id})`;
	elements.assetId.value = asset.id;
	elements.assetName.value = asset.name;
	elements.assetKind.value = asset.kind;
	elements.assetDataPath.value = asset.dataPath || '';
	elements.assetDav2Path.value = asset.dav2Path || '';
	elements.assetDav2Id.value = asset.dav2Id || '';
	elements.assetSuggestions.innerHTML = '';
	applyAssetMode(asset);
	updateDav2Hint();
	await loadDetectedStyles();
}

function applyAssetMode(asset = selectedAsset) {
	const isBundle = asset?.kind === 'Bundle';
	const isCompanion = asset?.kind === 'Cosmetic' && isCompanionAssetId(asset.id);

	const permutationOption = elements.imageType.querySelector('option[value="preview_permutation_image"]');
	if (permutationOption) permutationOption.hidden = !isCompanion;

	elements.imageType.disabled = isBundle;
	if (isBundle) elements.imageType.value = 'store_image';

	elements.checkLargeStyleSets.checked = isCompanion;
	elements.checkLargeStyleSets.disabled = isCompanion;
}

function clearDetectedStyles(message = '') {
	detectedStyleGroups = [];
	junoProductStyleGroups = [];
	if (elements.detectedStyleControls) elements.detectedStyleControls.innerHTML = '';
	if (elements.detectedStyleStatus) elements.detectedStyleStatus.textContent = message;
}

async function loadDetectedStyles() {
	if (!selectedAsset) {
		clearDetectedStyles('Select an asset to load options, or generate a custom ID without detected styles.');
		return;
	}

	try {
		clearDetectedStyles('Loading options...');
		const imageType = elements.imageType.value;
		junoProductStyleGroups = [];
		detectedStyleGroups = imageType === 'store_image'
			? await loadStoreStyleGroups(selectedAsset)
			: await loadCosmeticStyleGroups(selectedAsset);

		renderDetectedStyleControls();
	} catch (error) {
		clearDetectedStyles(error.message || String(error));
	}
}

async function loadCosmeticStyleGroups(asset) {
	if (asset.kind !== 'Cosmetic') {
		throw new Error('Detected style options are only available for cosmetic images or store images.');
	}

	if (!asset.dataPath) throw new Error('No cosmetic data path was found for this asset.');

	const data = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${asset.dataPath}`);
	const item = Array.isArray(data) ? data.find((entry) => entry?.Name === asset.id) || data[0] : null;
	const variantRefs = item?.Properties?.ItemVariants;
	if (!Array.isArray(variantRefs) || variantRefs.length === 0) {
		return [];
	}

	const styleGroups = await Promise.all(variantRefs
		.map(async (variantRef, channelIndex) => {
			const variant = findVariantObject(data, variantRef);
			const props = variant?.Properties || {};
			const optionInfo = await getVariantOptionInfo(props);
			const name = localizedText(props.VariantChannelName) || friendlyVariantType(variant?.Type) || `Channel ${channelIndex + 1}`;
			return {
				channelIndex,
				name,
				tagName: props.VariantChannelTag?.TagName || '',
				productTags: (props.ProductTags || []).map((tag) => tag?.TagName).filter(Boolean),
				optionSource: optionInfo.source,
				options: optionInfo.options,
			};
		}));

	junoProductStyleGroups = styleGroups.filter((group) => isJunoProductStyleGroup(group));
	return styleGroups.filter((group) => !isUnsupportedCosmoStyleGroup(group));
}

async function loadStoreStyleGroups(asset) {
	const displayAsset = await loadDisplayAssetData(asset);
	if (!displayAsset) return [];

	const presentations = Array.isArray(displayAsset.data)
		? displayAsset.data.flatMap((entry) => entry?.Properties?.ContextualPresentations || [])
		: [];

	if (!presentations.length) return [];

	return [{
		name: 'Store Image',
		options: presentations.map((presentation, index) => ({
			value: index,
			name: storePresentationName(presentation, index),
		})),
	}];
}

async function loadDisplayAssetData(asset) {
	if (asset.dav2Path) {
		return {
			path: asset.dav2Path,
			id: getDisplayAssetId(asset.dav2Path),
			data: await loadGzJson(`${DATA_BASE_PATH}${asset.dav2Path}`),
		};
	}

	const ids = uniqueStrings([
		asset.dav2Id,
		...getDisplayAssetIdCandidates(asset.id),
	]);

	for (const id of ids) {
		const indexedPath = getLatestDav2Path(`${id}.json`);
		const paths = uniqueStrings([
			indexedPath,
			...getDisplayAssetPathCandidates(id),
		]);

		for (const path of paths) {
			if (!path || !(await dataFileExists(`${DATA_BASE_PATH}${path}`))) continue;

			const data = await loadGzJson(`${DATA_BASE_PATH}${path}`);
			asset.dav2Path = path;
			asset.dav2Id = id;
			if (asset === selectedAsset) {
				elements.assetDav2Path.value = path;
				elements.assetDav2Id.value = id;
				updateDav2Hint();
			}
			return { path, id, data };
		}
	}

	return null;
}

async function resolveCustomStoreAsset(assetId) {
	if (selectedAsset || elements.assetDav2Id.value.trim()) return;

	const customAsset = {
		kind: isBundleDisplayAssetId(assetId) ? 'Bundle' : 'Cosmetic',
		id: assetId,
		name: '',
		dataPath: '',
		dav2Path: '',
		dav2Id: '',
	};

	const styleGroups = await loadStoreStyleGroups(customAsset);
	if (!customAsset.dav2Id) return;

	elements.assetKind.value = customAsset.kind;
	elements.assetDav2Path.value = customAsset.dav2Path || '';
	elements.assetDav2Id.value = customAsset.dav2Id || '';
	updateDav2Hint();

	if (styleGroups.length) {
		detectedStyleGroups = styleGroups;
		renderDetectedStyleControls();
	}
}

function getPrimaryDisplayAssetId(assetId) {
	return getDisplayAssetIdCandidates(assetId)[0] || '';
}

function isBundleDisplayAssetId(assetId) {
	return /^(dav2_)?bundle_/i.test(String(assetId || ''));
}

function getDisplayAssetIdCandidates(assetId) {
	if (typeof assetId !== 'string' || !assetId.trim()) return [];
	if (/^dav2_/i.test(assetId)) return [assetId];

	const ids = [`DAv2_${assetId}`];
	const festivalMatch = assetId.match(/^Sparks_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)_(.+)$/i);
	if (festivalMatch) {
		const instrument = festivalMatch[1];
		const baseId = festivalMatch[2];
		const instruments = /^Drum/i.test(instrument) ? ['Drum', 'DrumKit'] : [instrument];
		for (const itemInstrument of instruments) {
			ids.unshift(`DAv2_Sparks_${baseId}_${itemInstrument}`);
		}
	}

	const festivalSuffixMatch = assetId.match(/^Sparks_(.+)_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)$/i);
	if (festivalSuffixMatch) {
		const baseId = festivalSuffixMatch[1];
		const instrument = festivalSuffixMatch[2];
		const instruments = /^Drum/i.test(instrument) ? ['Drum', 'DrumKit'] : [instrument];
		for (const itemInstrument of instruments) {
			ids.unshift(`DAv2_Sparks_${baseId}_${itemInstrument}`);
			ids.push(`DAv2_Sparks_${itemInstrument}_${baseId}`);
		}
	}

	return uniqueStrings(ids);
}

function getDisplayAssetPathCandidates(dav2Id) {
	const fileName = `${dav2Id}.json`;
	const paths = [];
	for (let season = getLatestReleaseSeason(); season >= MIN_DAV2_SEASON; season--) {
		paths.push(`DAv2/S${season}/${fileName}`);
	}
	paths.push(`DAv2/${fileName}`);
	return paths;
}

function getLatestReleaseSeason() {
	const season = Number.parseInt(RELEASES[0].version.split('.')[0], 10);
	return Number.isFinite(season) ? season : 42;
}

async function dataFileExists(path) {
	try {
		const response = await fetch(path.endsWith('.gz') ? path : `${path}.gz`, { method: 'HEAD' });
		return response.ok;
	} catch {
		return false;
	}
}

function uniqueStrings(values) {
	const seen = new Set();
	return values.filter((value) => {
		if (!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}

function findVariantObject(data, variantRef) {
	if (!Array.isArray(data) || !variantRef?.ObjectName) return null;
	const match = String(variantRef.ObjectName).match(/:([^']+)'?$/);
	const variantName = match ? match[1] : '';
	return data.find((entry) => entry?.Name === variantName) || null;
}

function localizedText(value) {
	if (!value) return '';
	return value.LocalizedString || value.SourceString || value.CultureInvariantString || '';
}

async function getVariantOptionInfo(props) {
	const optionField = VARIANT_OPTION_FIELDS.find((field) => Array.isArray(props[field]) && props[field].length > 0);
	if (optionField) {
		return {
			source: optionField,
			options: props[optionField].map((option, optionIndex) => ({
				value: optionIndex,
				name: localizedText(option?.VariantName) || localizedText(option?.ColorName) || option?.Name || `Option ${optionIndex}`,
				previewImage: option?.PreviewImage?.AssetPathName || '',
				variantTag: option?.CustomizationVariantTag?.TagName || '',
				cosmeticProperties: option?.CosmeticProperties || [],
			})),
		};
	}

	if (Array.isArray(props.BakedSwatchColors) && props.BakedSwatchColors.length > 0) {
		const namedSwatches = await loadColorSwatchChoices(props);
		return {
			source: 'BakedSwatchColors',
			options: props.BakedSwatchColors.map((swatch, optionIndex) => ({
				value: optionIndex,
				name: colorSwatchChoiceName(swatch, namedSwatches, optionIndex),
			})),
		};
	}

	const materialParameterChoices = await loadMaterialParameterSetChoices(props);
	if (materialParameterChoices.length > 0) {
		return {
			source: 'MaterialParameterSetChoices',
			options: materialParameterChoices.map((choice, optionIndex) => ({
				value: optionIndex,
				name: localizedText(choice?.DisplayName) || choice?.CustomizationVariantTag?.TagName?.split('.').pop() || `Color ${optionIndex}`,
			})),
		};
	}

	if (Array.isArray(props.LoadoutAugmentations) && props.LoadoutAugmentations.length > 0) {
		return {
			source: 'LoadoutAugmentations',
			options: props.LoadoutAugmentations.map((option, optionIndex) => ({
				value: optionIndex,
				name: localizedText(option?.VariantName) || loadoutItemName(option?.LoadoutItem) || `Option ${optionIndex}`,
			})),
		};
	}

	return {
		source: 'Default',
		options: [{
			value: 0,
			name: 'Default',
		}],
	};
}

async function loadMaterialParameterSetChoices(props) {
	const ref = props.InlineVariant?.MaterialParameterSetChoices;
	if (!ref?.ObjectPath) return [];

	const localPaths = materialParameterSetDataPaths(ref.ObjectPath);
	if (!localPaths.length) return [];

	for (const localPath of localPaths) {
		try {
			const data = await loadGzJson(localPath);
			const objectName = ref.ObjectName ? String(ref.ObjectName).match(/'([^']+)'/)?.[1] : '';
			const entry = Array.isArray(data)
				? data.find((item) => item?.Name === objectName) || data[0]
				: null;
			if (Array.isArray(entry?.Properties?.Choices)) return entry.Properties.Choices;
		} catch {
			continue;
		}
	}

	return [];
}

async function loadColorSwatchChoices(props) {
	const ref = props.InlineVariant?.RichColorVar?.ColorSwatchForChoices;
	if (!ref?.AssetPathName) return [];

	for (const localPath of colorSwatchDataPaths(ref.AssetPathName)) {
		try {
			const data = await loadGzJson(localPath);
			const objectName = ref.AssetPathName.split('.').pop() || '';
			const entry = Array.isArray(data)
				? data.find((item) => item?.Name === objectName) || data[0]
				: null;
			const colorPairs = entry?.Properties?.ColorPairs;
			if (!Array.isArray(colorPairs)) continue;

			return colorPairs.map((pair) => ({
				name: localizedText(pair?.ColorDisplayName) || pair?.ColorName || (pair?.ColorValue?.Hex ? `#${pair.ColorValue.Hex}` : ''),
				hex: pair?.ColorValue?.Hex || '',
			}));
		} catch {
			continue;
		}
	}

	return [];
}

const COMPANION_MATERIAL_PARAMETER_FOLDER_NAMES = new Set([
	'MaterialParameterSets',
	'MaterialParamaterSets',
	'MaterialParameters',
	'MPS',
	'ColorSwatches',
	'MaterialParamSets',
	'MaterialParametrs',
	'MaterialParamSettings',
	'MaterialParametrSets',
]);

function materialParameterSetDataPaths(objectPath) {
	const parts = String(objectPath).split('/').filter(Boolean);
	const folderIndex = parts.findIndex((part) => COMPANION_MATERIAL_PARAMETER_FOLDER_NAMES.has(part));
	if (folderIndex < 1 || folderIndex >= parts.length - 1) return directCompanionMaterialParameterSetDataPaths(parts);

	const companionFolder = parts[folderIndex - 1];
	const fileName = parts[folderIndex + 1].replace(/\.\d+$/, '');
	if (!companionFolder || !fileName) return [];

	const exportedFolder = parts[folderIndex];
	return uniqueStrings([
		`${DATA_BASE_PATH}cosmetics/Companions/MaterialParameterSets/${companionFolder}/${fileName}.json`,
		`${DATA_BASE_PATH}cosmetics/Companions/${exportedFolder}/${companionFolder}/${fileName}.json`,
	]);
}

function directCompanionMaterialParameterSetDataPaths(parts) {
	const companionFolder = parts[parts.length - 2];
	const fileName = parts[parts.length - 1]?.replace(/\.\d+$/, '');
	if (!companionFolder || !/^MPS_/i.test(fileName || '')) return [];

	return uniqueStrings([
		`${DATA_BASE_PATH}cosmetics/Companions/MaterialParameterSets/${companionFolder}/${fileName}.json`,
	]);
}

function colorSwatchDataPaths(assetPathName) {
	const [objectPath] = String(assetPathName).split('.');
	const parts = objectPath.split('/').filter(Boolean);
	const folderIndex = parts.findIndex((part) => part === 'ColorSwatches');
	if (folderIndex < 0 || folderIndex >= parts.length - 1) return directCompanionColorSwatchDataPaths(parts);

	const fileName = parts[parts.length - 1];
	if (!fileName) return [];

	const paths = [];
	const companionFolder = parts[folderIndex - 1];
	if (companionFolder && companionFolder !== fileName) {
		paths.push(`${DATA_BASE_PATH}cosmetics/Companions/ColorSwatches/${companionFolder}/${fileName}.json`);
	}

	paths.push(`${DATA_BASE_PATH}cosmetics/Characters/ColorSwatches/${fileName}.json`);

	return paths;
}

function directCompanionColorSwatchDataPaths(parts) {
	const companionFolder = parts[parts.length - 2];
	const fileName = parts[parts.length - 1]?.replace(/\.\d+$/, '');
	if (!companionFolder || !/^CS_/i.test(fileName || '')) return [];

	return uniqueStrings([
		`${DATA_BASE_PATH}cosmetics/Companions/ColorSwatches/${companionFolder}/${fileName}.json`,
	]);
}

function colorSwatchChoiceName(swatch, namedSwatches, optionIndex) {
	const swatchHex = swatch?.Hex || '';
	const hexMatch = namedSwatches.find((choice) => choice.hex && choice.hex.toLowerCase() === swatchHex.toLowerCase());
	return namedSwatches[optionIndex]?.name || hexMatch?.name || (swatchHex ? `#${swatchHex}` : `Color ${optionIndex}`);
}

function isUnsupportedCosmoStyleGroup(group) {
	if (group.optionSource === 'GenericPropertyOptions' && !isVehiclePaintedStyleGroup(group) && !isVehicleTierStyleGroup(group)) return true;
	return /lego/i.test(group.name);
}

function isJunoProductStyleGroup(group) {
	return (
		group?.productTags?.some((tagName) => /^Product\.Juno$/i.test(tagName)) &&
		group?.options?.length > 0
	);
}

function isVehiclePaintedStyleGroup(group) {
	return /^Cosmetics\.Variant\.Channel\.Vehicle\.Painted\b/i.test(String(group?.tagName || ''));
}

function isVehicleTierStyleGroup(group) {
	return /^Cosmetics\.Variant\.Channel\.Vehicle\.Tier\b/i.test(String(group?.tagName || ''));
}

function isVehicleBodyColorStyleGroup(group) {
	return /^Cosmetics\.Variant\.Channel\.Vehicle\.Body\.Color\b/i.test(String(group?.tagName || ''));
}

function friendlyVariantType(type) {
	if (typeof type !== 'string' || !type) return '';

	return type
		.replace(/^FortCosmetic/, '')
		.replace(/Variant$/, '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim();
}

function loadoutItemName(loadoutItem) {
	const assetPath = loadoutItem?.AssetPathName;
	if (typeof assetPath !== 'string' || !assetPath) return '';
	return assetPath.split('.').pop() || '';
}

function storePresentationName(presentation, index) {
	const productTag = presentation?.ProductTag?.TagName || `Option ${index}`;
	return productTag;
}

function renderDetectedStyleControls() {
	elements.detectedStyleControls.innerHTML = '';

	if (!detectedStyleGroups.length) {
		elements.detectedStyleStatus.textContent = 'No detected style options for this asset/image type.';
		return;
	}

	const showAllOptions = elements.styleSource.value === 'detected-all';
	const imageType = elements.imageType.value;
	const visibleGroups = getVisibleDetectedStyleGroups(imageType);
	const generatedCount = getDetectedGeneratedCount(imageType);
	const detectedUnit = (!shouldUseImmutableOnlyStyles(imageType) && usesVariantOptionStyleFormat(imageType)) || imageType === 'store_image'
		? 'option'
		: 'combination';
	if (showAllOptions && shouldUseDefaultOnlyForLargeCombos(imageType)) {
		const comboCount = getFullCombinationCount();
		elements.detectedStyleStatus.textContent = `${comboCount.toLocaleString()} combinations detected. Only default candidates will be checked for this large set.`;
	} else if (showAllOptions && shouldProbePaintedCarLockerPreview(imageType)) {
		elements.detectedStyleStatus.textContent = 'Painted car detected. A few preview paths will be checked before expanding color/style combinations.';
	} else {
		elements.detectedStyleStatus.textContent = showAllOptions
			? `${generatedCount} detected ${detectedUnit}${generatedCount === 1 ? '' : 's'} will be generated.`
			: `${visibleGroups.length} option group${visibleGroups.length === 1 ? '' : 's'} detected.`;
	}

	visibleGroups.forEach(({ group, groupIndex }) => {
		const row = document.createElement('div');
		row.className = 'detected-style-row';

		const label = document.createElement('label');
		label.htmlFor = `detected-style-${groupIndex}`;
		label.textContent = group.name;

		if (showAllOptions) {
			const options = document.createElement('div');
			options.className = 'detected-style-options';

			group.options.forEach((option) => {
				const optionEl = document.createElement('span');
				optionEl.className = 'detected-style-option';
				optionEl.textContent = `${option.value} - ${option.name}`;
				options.appendChild(optionEl);
			});

			row.append(label, options);
		} else {
			const select = document.createElement('select');
			select.id = `detected-style-${groupIndex}`;
			select.dataset.groupIndex = String(groupIndex);
			select.className = 'detected-style-select';

			group.options.forEach((option) => {
				const opt = document.createElement('option');
				opt.value = String(option.value);
				opt.textContent = `${option.value} - ${option.name}`;
				select.appendChild(opt);
			});

			row.append(label, select);
		}
		elements.detectedStyleControls.appendChild(row);
	});

	renderProductPreviewRows(imageType);
}

function renderProductPreviewRows(imageType) {
	if (elements.styleSource.value === 'manual') return;

	const rows = getProductPreviewRows(imageType);
	for (const productRow of rows) {
		const row = document.createElement('div');
		row.className = 'detected-style-row';

		const label = document.createElement('label');
		label.textContent = productRow.name;

		const options = document.createElement('div');
		options.className = 'detected-style-options';

		productRow.options.forEach((option) => {
			const optionEl = document.createElement('span');
			optionEl.className = 'detected-style-option';
			optionEl.textContent = option;
			options.appendChild(optionEl);
		});

		row.append(label, options);
		elements.detectedStyleControls.appendChild(row);
	}
}

function getProductPreviewRows(imageType) {
	if (imageType === 'store_image' || imageType === 'preview_permutation_image') return [];

	const rows = [];
	if (shouldShowJunoProductPreviewRow()) {
		rows.push({
			name: 'LEGO Fortnite',
			options: getJunoProductPreviewOptionLabels(),
		});
	}

	if (shouldShowBeanstalkProductPreviewRow()) {
		rows.push({
			name: 'Fall Guys',
			options: getBeanstalkProductPreviewOptionLabels(),
		});
	}

	return rows;
}

function shouldShowJunoProductPreviewRow() {
	return Boolean(selectedAsset?.jido || getIndexEntryForAssetId(getCurrentAssetId())?.jido);
}

function shouldShowBeanstalkProductPreviewRow() {
	return Boolean(selectedAsset?.beanid || getIndexEntryForAssetId(getCurrentAssetId())?.beanid);
}

function getJunoProductPreviewOptionLabels() {
	if (!junoProductStyleGroups.length) return ['Default'];

	return junoProductStyleGroups.flatMap((group) => (
		group.options.map((option) => `${option.value} - ${option.name}`)
	));
}

function getBeanstalkProductPreviewOptionLabels() {
	const beanId = selectedAsset?.beanid || getIndexEntryForAssetId(getCurrentAssetId())?.beanid || 'Bean preview';
	return [beanId];
}

function getVisibleDetectedStyleGroups(imageType) {
	return detectedStyleGroups
		.map((group, groupIndex) => ({ group, groupIndex }))
		.filter(({ group }) => !shouldUseImmutableOnlyStyles(imageType) || isAllowedCompanionStyleGroup(group, imageType));
}

function selectedDetectedStyle() {
	if (!detectedStyleGroups.length) return [null];

	const selectedByGroupIndex = new Map(
		Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
			.map((select) => [Number(select.dataset.groupIndex), Number(select.value)])
	);

	return [detectedStyleGroups.map((group, groupIndex) => (
		selectedByGroupIndex.get(groupIndex) ?? getDefaultOptionValue(group)
	))];
}

function getJunoProductStyleArrays() {
	if (!junoProductStyleGroups.length) return [];

	return cartesianProduct(junoProductStyleGroups.map((group) => getStyleValuesForCombination(group)))
		.map((values) => [...values]);
}

function allDetectedStyles() {
	if (!detectedStyleGroups.length) return [null];
	return cartesianProduct(detectedStyleGroups.map((group) => getStyleValuesForCombination(group)));
}

function selectedPreviewPermutationStyle(imageType) {
	if (!detectedStyleGroups.length) return [null];

	const selectedByGroupIndex = new Map(
		Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
			.map((select) => [Number(select.dataset.groupIndex), Number(select.value)])
	);
	const shouldIncludeGroup = getCompanionCombinationGroupPredicate(imageType);

	return [detectedStyleGroups.map((group, groupIndex) => (
		shouldIncludeGroup(group)
			? selectedByGroupIndex.get(groupIndex) ?? getDefaultOptionValue(group)
			: getDefaultOptionValue(group)
	))];
}

function allPreviewPermutationStyles(imageType) {
	if (!detectedStyleGroups.length) return [null];

	const shouldIncludeGroup = getCompanionCombinationGroupPredicate(imageType);
	const generatedGroups = detectedStyleGroups
		.map((group, groupIndex) => ({ group, groupIndex }))
		.filter(({ group }) => shouldIncludeGroup(group));
	const baseValues = detectedStyleGroups.map((group) => getDefaultOptionValue(group));

	if (!generatedGroups.length) return [baseValues];

	return cartesianProduct(generatedGroups.map(({ group }) => getStyleValuesForCombination(group)))
		.map((values) => {
			const style = [...baseValues];
			values.forEach((value, valueIndex) => {
				style[generatedGroups[valueIndex].groupIndex] = value;
			});
			return style;
		});
}

function selectedDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
		.map((select) => {
			const group = detectedStyleGroups[Number(select.dataset.groupIndex)];
			return [group?.channelIndex ?? Number(select.dataset.groupIndex), Number(select.value)];
		});
}

function allDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return detectedStyleGroups.flatMap((group, groupIndex) => (
		group.options.map((option) => [group.channelIndex ?? groupIndex, option.value])
	));
}

function selectedCompanionPreviewOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
		.map((select) => {
			const groupIndex = Number(select.dataset.groupIndex);
			const group = detectedStyleGroups[groupIndex];
			const option = group?.options.find((item) => Number(item.value) === Number(select.value));
			if (!option?.previewImage) return null;
			return [group?.channelIndex ?? groupIndex, option.value];
		})
		.filter(Boolean);
}

function allCompanionPreviewOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return detectedStyleGroups.flatMap((group, groupIndex) => {
		if (!hasPreviewImageStyleOptions(group)) return [];
		return group.options
			.filter((option) => option.previewImage)
			.map((option) => [group.channelIndex ?? groupIndex, option.value]);
	});
}

function getDetectedGeneratedCount(imageType) {
	if (!detectedStyleGroups.length) return shouldIncludeDefaultImageCandidate(imageType) ? 1 : 0;
	if (shouldUseDefaultOnlyForPaintedCarLockerPreview(imageType)) return 1;
	if (shouldUseDefaultOnlyForLargeCombos(imageType)) return getDefaultStyleArrays().length;
	const defaultCandidateCount = shouldIncludeDefaultImageCandidate(imageType) ? 1 : 0;
	if (shouldUseImmutableOnlyStyles(imageType) && usesVariantOptionStyleFormat(imageType)) {
		return defaultCandidateCount + getCompanionPreviewOptionCount();
	}
	if (shouldUseImmutableOnlyStyles(imageType)) return defaultCandidateCount + getPreviewPermutationCombinationCount(imageType);
	if (usesVariantOptionStyleFormat(imageType) || imageType === 'store_image') {
		return defaultCandidateCount + detectedStyleGroups.reduce((total, group) => total + group.options.length, 0);
	}

	return defaultCandidateCount + getFullCombinationCount();
}

function getFullCombinationCount() {
	if (!detectedStyleGroups.length) return 0;
	return detectedStyleGroups.reduce((total, group) => total * getStyleValuesForCombination(group).length, 1);
}

function getPreviewPermutationCombinationCount(imageType) {
	if (!detectedStyleGroups.length) return 0;
	const generatedGroups = detectedStyleGroups.filter(getCompanionCombinationGroupPredicate(imageType));
	if (!generatedGroups.length) return 1;
	return generatedGroups.reduce((total, group) => total * getStyleValuesForCombination(group).length, 1);
}

function getCompanionPreviewOptionCount() {
	if (!detectedStyleGroups.length) return 0;
	return detectedStyleGroups.reduce((total, group) => (
		total + group.options.filter((option) => option.previewImage).length
	), 0);
}

function getStyleValuesForCombination(group) {
	return group.options.map((option) => option.value);
}

function isImmutableVariantGroup(group) {
	return /immutable/i.test(String(group?.tagName || ''));
}

function isGeneratedCompanionStyleGroup(group) {
	if (isImmutableVariantGroup(group)) return true;
	return /^Cosmetics\.Variant\.Channel\.(Outfit|Material|Parts|Hair|Mesh|Pattern)\b/i.test(String(group?.tagName || ''));
}

function isAllowedCompanionStyleGroup(group, imageType) {
	if (imageType === 'preview_permutation_image') return isImmutableVariantGroup(group);
	if (usesVariantOptionStyleFormat(imageType)) return hasPreviewImageStyleOptions(group);
	return isGeneratedCompanionStyleGroup(group);
}

function getCompanionCombinationGroupPredicate(imageType) {
	return imageType === 'preview_permutation_image'
		? isImmutableVariantGroup
		: isGeneratedCompanionStyleGroup;
}

function hasPreviewImageStyleOptions(group) {
	return group?.options?.some((option) => option.previewImage) || false;
}

function shouldUseImmutableOnlyStyles(imageType, assetId = getCurrentAssetId()) {
	return imageType !== 'store_image' && isCompanionAssetId(assetId);
}

function getDefaultOptionValue(group) {
	return group.options.find((option) => option.value === 0)?.value ?? group.options[0]?.value ?? 0;
}

function shouldUseDefaultOnlyForLargeCombos(imageType) {
	return (
		usesFullStyleCombinations(imageType) &&
		elements.styleSource?.value === 'detected-all' &&
		!elements.checkLargeStyleSets?.checked &&
		getFullCombinationCount() > MAX_AUTO_COMBINATIONS
	);
}

function shouldUseDefaultOnlyForPaintedCarLockerPreview(imageType, assetId = getCurrentAssetId()) {
	return hasPaintedCarLockerPreviewStyles(imageType, assetId) && !shouldProbePaintedCarLockerPreview(imageType, assetId);
}

function shouldProbePaintedCarLockerPreview(imageType, assetId = getCurrentAssetId()) {
	return elements.styleSource?.value === 'detected-all' && hasPaintedCarLockerPreviewStyles(imageType, assetId);
}

function hasPaintedCarLockerPreviewStyles(imageType, assetId = getCurrentAssetId()) {
	return (
		imageType === 'locker_preview_image' &&
		isRacingCarBodyAsset(assetId) &&
		detectedStyleGroups.some((group) => isVehiclePaintedStyleGroup(group))
	);
}

function usesFullStyleCombinations(imageType) {
	return imageType !== 'store_image' && !usesVariantOptionStyleFormat(imageType);
}

function shouldIncludeDefaultImageCandidate(imageType) {
	return imageType !== 'store_image' && imageType !== 'preview_permutation_image' && elements.styleSource?.value !== 'manual';
}

function isCompanionAssetId(assetId) {
	return typeof assetId === 'string' && assetId.toLowerCase().startsWith('companion_');
}

function isMicrophoneAssetId(assetId) {
	return getSparksInstrumentLabelFromValue(assetId) === 'Microphone';
}

function isVariantOptionImageType(imageType) {
	return imageType === 'preview_image';
}

function usesVariantOptionStyleFormat(imageType) {
	return isVariantOptionImageType(imageType);
}

function parseStyleInput(styleInput) {
	const trimmed = styleInput.trim();
	if (!trimmed) return [null];

	if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
		throw new Error('Style array must be enclosed in []');
	}

	const parts = trimmed.slice(1, -1).split(',');
	const values = parts.map((rawPart) => {
		const part = rawPart.trim();
		const match = part.match(/^(\d+)-(\d+)(!([\d,]+))?$/);

		if (!match) {
			const value = Number(part);
			if (!Number.isInteger(value)) throw new Error(`Invalid style value: ${part}`);
			return [value];
		}

		const start = Number(match[1]);
		const end = Number(match[2]);
		const excluded = new Set(
			match[4] ? match[4].split(',').map((value) => Number(value.trim())) : []
		);
		const range = [];

		for (let value = start; value <= end; value++) {
			if (!excluded.has(value)) range.push(value);
		}

		return range;
	});

	return cartesianProduct(values);
}

function cartesianProduct(arrays) {
	return arrays.reduce(
		(acc, values) => acc.flatMap((prefix) => values.map((value) => [...prefix, value])),
		[[]]
	);
}

function getAssetType(assetId, imageType, dav2Id = '') {
	if (imageType === 'store_image') {
		const storeId = dav2Id || getPrimaryDisplayAssetId(assetId) || (/^dav2_/i.test(assetId) ? assetId : `dav2_${assetId}`);
		return ['AthenaItemShopOfferDisplayData', storeId];
	}

	const baseId = assetId.split('[', 1)[0].toLowerCase();
	const sparksType = getSparksInstrumentType(baseId);
	if (sparksType) return [sparksType, assetId];

	for (const [prefix, assetType] of Object.entries(TYPE_MAPPINGS)) {
		if (baseId.startsWith(prefix)) return [assetType, assetId];
	}

	if (baseId.endsWith('pickaxe')) return ['AthenaPickaxe', assetId];
	if (baseId.endsWith('glider')) return ['AthenaGlider', assetId];

	const selectedBaseId = String(selectedAsset?.id || '').toLowerCase();
	const dataPath = selectedBaseId === baseId ? selectedAsset.dataPath : '';
	const dataPathMatch = COSMO_DATA_PATH_TYPE_MAPPINGS.find(([pattern]) => pattern.test(dataPath || ''));
	if (dataPathMatch) return [dataPathMatch[1], assetId];

	throw new Error(`Unknown cosmetic type for ID: ${assetId}`);
}

function getSparksInstrumentType(baseId) {
	const parts = baseId.split('_');
	if (parts[0] !== 'sparks') return '';

	return SPARKS_INSTRUMENT_TYPES[parts[1]] || SPARKS_INSTRUMENT_TYPES[parts[parts.length - 1]] || '';
}

function getEnteredAssetId() {
	const selectedId = elements.assetId.value.trim();
	if (selectedId) return selectedId;

	const entered = elements.assetDisplay.value.trim();
	const match = entered.match(/\(([^()]+)\)\s*$/);
	return (match ? match[1] : entered).trim();
}

function getCurrentAssetId() {
	return elements.assetId?.value.trim() || selectedAsset?.id || elements.assetDisplay?.value.trim() || '';
}

function buildPath(assetId, imageType, styleArray, version, dav2Id = '', assetTypeOverride = '') {
	let [assetType, normalizedId] = getAssetType(assetId, imageType, dav2Id);
	if (assetTypeOverride) assetType = assetTypeOverride;

	if (normalizedId.includes('[')) {
		const [base, suffix] = normalizedId.split('[', 2);
		normalizedId = `${base.toLowerCase()}[${suffix}`;
	} else {
		normalizedId = normalizedId.toLowerCase();
	}

	let path = `fn/${version}/${assetType}:${normalizedId}/${imageType}`;
	if (styleArray !== null) path += `[${styleArray.join(',')}]`;
	return path;
}

function buildCandidatePaths(assetId, imageType, styleArray, version, dav2Id = '') {
	const paths = [buildPath(assetId, imageType, styleArray, version, dav2Id)];
	const fallbackTypes = getCosmoAssetTypeFallbacks(assetId, imageType);

	for (const assetType of fallbackTypes) {
		const path = buildPath(assetId, imageType, styleArray, version, dav2Id, assetType);
		if (!paths.includes(path)) paths.push(path);
	}

	return paths;
}

function getCosmoGenerationAssetIds(assetId, imageType) {
	return uniqueStrings([assetId, ...getProductCosmoAssetIds(assetId, imageType)]);
}

function getProductCosmoAssetIds(assetId, imageType) {
	return [
		...getJunoProductCosmoAssetIds(assetId, imageType),
		...getBeanstalkProductCosmoAssetIds(assetId, imageType),
	];
}

function getJunoProductCosmoAssetIds(assetId, imageType) {
	if (!shouldAddJunoProductCandidate(assetId, imageType)) return [];
	return [`${getAssetBaseId(assetId)}[Product.Juno]`];
}

function getBeanstalkProductCosmoAssetIds(assetId, imageType) {
	if (!shouldAddBeanstalkProductCandidate(assetId, imageType)) return [];

	const entry = getIndexEntryForAssetId(assetId);
	const beanId = selectedAsset?.beanid || entry?.beanid || '';
	return beanId ? [`${beanId}[Product.Beanstalk]`] : [];
}

function isJunoProductAssetId(assetId) {
	return /\[Product\.Juno\]/i.test(String(assetId || ''));
}

function isBeanstalkProductAssetId(assetId) {
	return /\[Product\.Beanstalk\]/i.test(String(assetId || ''));
}

function shouldAddJunoProductCandidate(assetId, imageType) {
	if (imageType === 'store_image' || imageType === 'preview_permutation_image') return false;
	if (String(assetId || '').includes('[')) return false;
	if (!isCharacterAssetId(assetId)) return false;

	const baseId = getAssetBaseId(assetId).toLowerCase();
	const selectedBaseId = String(selectedAsset?.id || '').toLowerCase();
	if (selectedBaseId === baseId) return Boolean(selectedAsset?.jido);

	const entry = getIndexEntryForAssetId(assetId);
	return Boolean(entry?.jido);
}

function shouldAddBeanstalkProductCandidate(assetId, imageType) {
	if (imageType === 'store_image' || imageType === 'preview_permutation_image') return false;
	if (String(assetId || '').includes('[')) return false;
	if (!isCharacterAssetId(assetId)) return false;

	const baseId = getAssetBaseId(assetId).toLowerCase();
	const selectedBaseId = String(selectedAsset?.id || '').toLowerCase();
	if (selectedBaseId === baseId) return Boolean(selectedAsset?.beanid);

	const entry = getIndexEntryForAssetId(assetId);
	return Boolean(entry?.beanid);
}

function getIndexEntryForAssetId(assetId) {
	const baseId = getAssetBaseId(assetId).toLowerCase();
	return index.find((item) => String(item?.id || '').toLowerCase() === baseId);
}

function isCharacterAssetId(assetId) {
	const baseId = getAssetBaseId(assetId);
	return /^(character_|cid_|solidwave_character)/i.test(baseId);
}

function getCosmoAssetTypeFallbacks(assetId, imageType) {
	if (imageType === 'store_image') return [];

	const baseId = String(assetId || '').split('[', 1)[0].toLowerCase();
	if (baseId.startsWith('petcarrier_')) return ['AthenaBackpack'];
	if (baseId.startsWith('petid_')) return ['AthenaPetCarrier', 'AthenaBackpack'];
	return [];
}

function getFallbackGroupKey(assetId, imageType, styleArray) {
	const styleKey = styleArray === null ? 'default' : styleArray.join(',');
	return `${assetId}|${imageType}|${styleKey}`.toLowerCase();
}

function base64ToBytes(value) {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function bytesToBase64Url(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
}

function hexToBytes(value) {
	const normalized = String(value || '').trim().replace(/^0x/i, '');
	if (!normalized) return new Uint8Array();
	if (!/^[\da-f]+$/i.test(normalized) || normalized.length % 2 !== 0) {
		throw new Error('AES key is not valid.');
	}

	const bytes = new Uint8Array(normalized.length / 2);
	for (let index = 0; index < bytes.length; index++) {
		bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

async function makeToken(assetPath, releaseKey, aesKey = '') {
	const pathBytes = new TextEncoder().encode(assetPath);
	const rkeyBytes = base64ToBytes(releaseKey);
	const aesKeyBytes = hexToBytes(aesKey);
	const combined = new Uint8Array(pathBytes.length + rkeyBytes.length + aesKeyBytes.length);
	combined.set(pathBytes, 0);
	combined.set(rkeyBytes, pathBytes.length);
	combined.set(aesKeyBytes, pathBytes.length + rkeyBytes.length);

	const hash = await crypto.subtle.digest('SHA-256', combined);
	return bytesToBase64Url(new Uint8Array(hash));
}

async function makeUrl(assetPath, releaseKey, aesKey = elements.aesKey?.value || '') {
	return `${BASE_URL}/${await makeToken(assetPath, releaseKey, aesKey)}/png`;
}

function styleSuffix(styleArray) {
	return styleArray === null ? '' : `[${styleArray.join(',')}]`;
}

function getFileName(imageType, styleArray) {
	return `${imageType}${styleSuffix(styleArray)}.png`;
}

function getStyleSelections(styleArray, imageType, assetId = getCurrentAssetId()) {
	const styleGroups = getStyleSelectionGroups(assetId);
	if (!Array.isArray(styleArray) || !styleGroups.length) return [];

	if (usesVariantOptionStyleFormat(imageType)) {
		const [groupIndex, optionValue] = styleArray;
		const group = styleGroups.find((item) => item.channelIndex === groupIndex) || styleGroups[groupIndex];
		const option = group?.options.find((item) => Number(item.value) === Number(optionValue));

		return [{
			groupName: group?.name || `Channel ${groupIndex + 1}`,
			optionName: option?.name || `Option ${optionValue}`,
			value: optionValue,
		}];
	}

	return styleArray.map((value, index) => {
		const group = styleGroups.find((item) => item.channelIndex === index) || styleGroups[index];
		if (shouldUseImmutableOnlyStyles(imageType, assetId)) {
			const shouldIncludeGroup = imageType === 'preview_permutation_image'
				? isImmutableVariantGroup(group)
				: isGeneratedCompanionStyleGroup(group);
			if (!shouldIncludeGroup) return null;
		}
		const option = group?.options.find((item) => Number(item.value) === Number(value));

		return {
			groupName: group?.name || `Channel ${index + 1}`,
			optionName: option?.name || `Option ${value}`,
			value,
		};
	}).filter(Boolean);
}

function getStyleSelectionGroups(assetId) {
	return isJunoProductAssetId(assetId) ? junoProductStyleGroups : detectedStyleGroups;
}

function getStyleLabel(styleArray, imageType, assetId = getCurrentAssetId()) {
	const selections = getStyleSelections(styleArray, imageType, assetId);
	if (!selections.length) return styleArray === null ? 'Default' : getFileName('Style', styleArray).replace(/\.png$/, '');
	return selections.map((selection) => `${selection.groupName}: ${selection.optionName}`).join(' | ');
}

async function generateImages() {
	const assetId = getEnteredAssetId();
	const imageType = elements.imageType.value;
	const release = getSelectedRelease();

	if (!assetId) throw new Error('Please enter an asset ID or select an asset from the search results');
	if (imageType === 'store_image') await resolveCustomStoreAsset(assetId);

	const dav2Id = elements.assetDav2Id.value.trim();
	if (shouldUseDefaultOnlyForLargeCombos(imageType)) {
		showStatus(`Large style set detected. Checking default candidates only instead of ${getFullCombinationCount().toLocaleString()} combinations.`, 'loading');
	}

	const styles = await getStyleArraysForGeneration(imageType, assetId, release, dav2Id);
	const images = [];
	const candidateAssetIds = getCosmoGenerationAssetIds(assetId, imageType);
	const generationRequests = getOrderedGenerationRequests(imageType, styles, candidateAssetIds);

	for (const { assetId: candidateAssetId, styles: candidateStyles } of generationRequests) {
		for (const candidateStyle of candidateStyles) {
			const paths = buildCandidatePaths(candidateAssetId, imageType, candidateStyle, release.version, dav2Id);
			const fallbackGroupKey = paths.length > 1 ? getFallbackGroupKey(candidateAssetId, imageType, candidateStyle) : '';
			for (let fallbackRank = 0; fallbackRank < paths.length; fallbackRank++) {
				const path = paths[fallbackRank];
				images.push({
					assetId: candidateAssetId,
					baseAssetId: assetId,
					imageType,
					requestedImageType: imageType,
					style: candidateStyle,
					path,
					url: await makeUrl(path, release.key),
					fileName: getFileName(imageType, candidateStyle),
					styleLabel: getStyleLabel(candidateStyle, imageType, candidateAssetId),
					styleSelections: getStyleSelections(candidateStyle, imageType, candidateAssetId),
					fallbackGroupKey,
					fallbackRank,
				});
			}
		}
	}

	return images;
}

function getOrderedGenerationRequests(imageType, styles, candidateAssetIds) {
	const fallbackRequests = candidateAssetIds.map((assetId) => ({
		assetId,
		styles: getStyleArraysForCandidate(assetId, imageType, styles),
	}));
	const junoAssetIds = candidateAssetIds.filter((assetId) => isJunoProductAssetId(assetId));
	const beanstalkAssetIds = candidateAssetIds.filter((assetId) => isBeanstalkProductAssetId(assetId));
	if ((!junoAssetIds.length && !beanstalkAssetIds.length) || elements.styleSource.value === 'manual') return fallbackRequests;

	const defaultStyles = styles.filter((style) => style === null);
	if (!defaultStyles.length) return fallbackRequests;

	const regularAssetIds = candidateAssetIds.filter((assetId) => (
		!isJunoProductAssetId(assetId) &&
		!isBeanstalkProductAssetId(assetId)
	));
	const remainingStyles = styles.filter((style) => style !== null);
	const requests = [
		...regularAssetIds.map((assetId) => ({ assetId, styles: defaultStyles })),
		...junoAssetIds.map((assetId) => ({
			assetId,
			styles: getStyleArraysForCandidate(assetId, imageType, styles),
		})),
		...beanstalkAssetIds.map((assetId) => ({
			assetId,
			styles: getStyleArraysForCandidate(assetId, imageType, styles),
		})),
		...regularAssetIds.map((assetId) => ({ assetId, styles: remainingStyles })),
	];

	return requests.filter((request) => request.styles.length);
}

function getStyleArraysForCandidate(assetId, imageType, styles) {
	if (isBeanstalkProductAssetId(assetId)) return [null];
	if (!isJunoProductAssetId(assetId) || elements.styleSource.value === 'manual') return styles;

	const junoStyles = getJunoProductStyleArrays();
	if (!junoStyles.length) return styles;

	return uniqueStyleArrays(junoStyles);
}

function getSelectedRelease() {
	if (elements.releaseVersion.value === CUSTOM_RELEASE_VALUE) {
		const version = elements.customReleaseVersion.value.trim();
		const key = elements.customReleaseKey.value.replace(/\s+/g, '');

		if (!version) throw new Error('Please enter a custom release version.');
		if (!key) throw new Error('Please enter a custom release key.');
		validateReleaseKey(key);

		return {
			version,
			key,
			label: `${version} - Custom`,
		};
	}

	return RELEASES.find((release) => release.version === elements.releaseVersion.value) || RELEASES[0];
}

function validateReleaseKey(key) {
	try {
		base64ToBytes(key);
	} catch {
		throw new Error('Custom release key must be valid base64.');
	}
}

function getStyleArrays(imageType, assetId = getEnteredAssetId()) {
	if (elements.styleSource.value === 'manual') {
		return parseStyleInput(elements.styleArray.value);
	}

	if (imageType === 'store_image' && !detectedStyleGroups.length) {
		return [[0]];
	}

	if (shouldUseDefaultOnlyForPaintedCarLockerPreview(imageType, assetId)) {
		return [null];
	}

	if (shouldUseDefaultOnlyForLargeCombos(imageType)) {
		return addMicrophoneLockerPreviewFallback(getDefaultStyleArrays(), imageType, assetId);
	}

	let styles;

	if (shouldUseImmutableOnlyStyles(imageType, assetId) && usesVariantOptionStyleFormat(imageType)) {
		styles = elements.styleSource.value === 'detected-all'
			? allCompanionPreviewOptionStyles()
			: selectedCompanionPreviewOptionStyles();
	} else if (shouldUseImmutableOnlyStyles(imageType, assetId)) {
		styles = elements.styleSource.value === 'detected-all'
			? allPreviewPermutationStyles(imageType)
			: selectedPreviewPermutationStyle(imageType);
	} else if (usesVariantOptionStyleFormat(imageType)) {
		styles = elements.styleSource.value === 'detected-all'
			? allDetectedOptionStyles()
			: selectedDetectedOptionStyles();
	} else if (elements.styleSource.value === 'detected-all') {
		styles = allDetectedStyles();
	} else {
		styles = selectedDetectedStyle();
	}

	const styleArrays = shouldIncludeDefaultImageCandidate(imageType)
		? uniqueStyleArrays([null, ...styles])
		: styles;

	return addMicrophoneLockerPreviewFallback(styleArrays, imageType, assetId);
}

async function getStyleArraysForGeneration(imageType, assetId, release, dav2Id) {
	if (shouldProbePaintedCarLockerPreview(imageType, assetId)) {
		return getPaintedCarLockerPreviewStyleArrays(assetId, imageType, release, dav2Id);
	}

	return getStyleArrays(imageType, assetId);
}

async function getPaintedCarLockerPreviewStyleArrays(assetId, imageType, release, dav2Id) {
	const defaultStyles = [null];
	const paintGroups = getPaintedCarStyleGroups();
	if (!paintGroups.length) return defaultStyles;

	showStatus('Checking painted car preview probes...', 'loading');

	const probeStyles = getPaintedCarProbeStyleArrays(paintGroups);
	if (!probeStyles.length || !(await hasExistingCosmoStyle(assetId, imageType, probeStyles, release, dav2Id))) {
		return defaultStyles;
	}

	return uniqueStyleArrays([...defaultStyles, ...getPaintedCarExpandedStyleArrays(paintGroups)]);
}

function getPaintedCarStyleGroups() {
	const tierGroups = detectedStyleGroups
		.map((group, groupIndex) => ({ group, groupIndex }))
		.filter(({ group }) => isVehicleTierStyleGroup(group));
	const bodyColorGroups = detectedStyleGroups
		.map((group, groupIndex) => ({ group, groupIndex }))
		.filter(({ group }) => isVehicleBodyColorStyleGroup(group));
	const paintedGroups = detectedStyleGroups
		.map((group, groupIndex) => ({ group, groupIndex }))
		.filter(({ group }) => isVehiclePaintedStyleGroup(group));

	if (!paintedGroups.length || !bodyColorGroups.length) return [];
	if (!tierGroups.length) return [{
		tier: null,
		bodyColorGroups,
		paintedGroups,
	}];

	return tierGroups.flatMap((tier) => tier.group.options.map((option, optionIndex) => {
		const tierTag = getVehicleTierOptionSuffix(option, optionIndex);
		return {
			tier: { ...tier, value: option.value },
			bodyColorGroups: bodyColorGroups.filter(({ group }) => getVehicleTierSuffix(group) === tierTag),
			paintedGroups: paintedGroups.filter(({ group }) => getVehicleTierSuffix(group) === tierTag),
		};
	})).filter((group) => group.bodyColorGroups.length && group.paintedGroups.length);
}

function getVehicleTierOptionSuffix(option, optionIndex) {
	const tag = String(option?.variantTag || '');
	const tagMatch = tag.match(/\.Tier(\d+)$/i);
	if (tagMatch) return `tier${tagMatch[1]}`;

	const nameMatch = String(option?.name || '').match(/tier\s*(\d+)/i);
	if (nameMatch) return `tier${nameMatch[1]}`;

	return `tier${optionIndex + 1}`;
}

function getVehicleTierSuffix(group) {
	return String(group?.tagName || '').match(/\.Tier(\d+)$/i)?.[0]?.slice(1).toLowerCase() || '';
}

function getPaintedCarProbeStyleArrays(paintGroups) {
	return uniqueStyleArrays(paintGroups.flatMap((paintGroup) => {
		const bodyGroup = paintGroup.bodyColorGroups[0];
		const paintedGroup = paintGroup.paintedGroups[0];
		return [
			getPaintedCarStyleArray(paintGroup, [
				{ group: bodyGroup, value: getFirstNonDefaultOptionValue(bodyGroup.group) },
				{ group: paintedGroup, value: getDefaultOptionValue(paintedGroup.group) },
			]),
			getPaintedCarStyleArray(paintGroup, [
				{ group: bodyGroup, value: getDefaultOptionValue(bodyGroup.group) },
				{ group: paintedGroup, value: getFirstNonDefaultOptionValue(paintedGroup.group) },
			]),
			getPaintedCarStyleArray(paintGroup, [
				{ group: bodyGroup, value: getFirstNonDefaultOptionValue(bodyGroup.group) },
				{ group: paintedGroup, value: getFirstNonDefaultOptionValue(paintedGroup.group) },
			]),
		];
	}));
}

function getPaintedCarExpandedStyleArrays(paintGroups) {
	return paintGroups.flatMap((paintGroup) => {
		const variableGroups = [...paintGroup.bodyColorGroups, ...paintGroup.paintedGroups];
		return cartesianProduct(variableGroups.map(({ group }) => getStyleValuesForCombination(group)))
			.map((values) => getPaintedCarStyleArray(
				paintGroup,
				variableGroups.map((group, index) => ({ group, value: values[index] }))
			));
	});
}

function getPaintedCarStyleArray(paintGroup, selections) {
	const style = detectedStyleGroups.map((group) => getDefaultOptionValue(group));
	if (paintGroup.tier) style[paintGroup.tier.groupIndex] = paintGroup.tier.value;

	for (const selection of selections) {
		if (!selection?.group) continue;
		style[selection.group.groupIndex] = selection.value;
	}

	return style;
}

function getFirstNonDefaultOptionValue(group) {
	const defaultValue = getDefaultOptionValue(group);
	return group.options.find((option) => Number(option.value) !== Number(defaultValue))?.value ?? defaultValue;
}

async function hasExistingCosmoStyle(assetId, imageType, styleArrays, release, dav2Id) {
	for (const style of styleArrays) {
		const paths = buildCandidatePaths(assetId, imageType, style, release.version, dav2Id);
		for (const path of paths) {
			const url = await makeUrl(path, release.key);
			if (await cosmoImageExists(url)) return true;
		}
	}

	return false;
}

async function cosmoImageExists(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ZIP_DOWNLOAD_TIMEOUT_MS);

	try {
		const response = await fetch(getProxiedCosmoUrl(url), {
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			signal: controller.signal,
		});
		return response.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

function addMicrophoneLockerPreviewFallback(styleArrays, imageType, assetId) {
	if (imageType !== 'locker_preview_image' || !isMicrophoneAssetId(assetId)) return styleArrays;
	return uniqueStyleArrays([...styleArrays, [0, 0]]);
}

function getDefaultStyleArrays() {
	if (!detectedStyleGroups.length) return [null];
	return [null, detectedStyleGroups.map(() => 0)];
}

function uniqueStyleArrays(styleArrays) {
	const seen = new Set();
	return styleArrays.filter((styleArray) => {
		const key = styleArray === null ? 'null' : styleArray.join(',');
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function updateStyleSourceUI() {
	const useManual = elements.styleSource.value === 'manual';
	elements.styleArray.closest('.inline-group').style.display = useManual ? 'flex' : 'none';
	elements.detectedStyleBox.style.display = useManual ? 'none' : 'block';
	if (!useManual) renderDetectedStyleControls();
}

function getLoadedImages() {
	return generatedImages.filter((image) => image.exists === true);
}

function refreshGeneratedResults() {
	const loadedImages = getLoadedImages();
	const checkedCount = generatedImages.filter((image) => image.exists !== null).length;
	const missingCount = generatedImages.filter((image) => image.exists === false).length;

	updatePreviewEmptyMessage(loadedImages.length, checkedCount);
	updateSelectionControls();

	if (checkedCount !== generatedImages.length) {
		showStatus(`Checking ${checkedCount}/${generatedImages.length} candidate image${generatedImages.length === 1 ? '' : 's'}...`, 'loading');
		return;
	}

	if (!loadedImages.length) {
		showStatus('No images were found for those Cosmo paths.', 'error');
		return;
	}

	const skipped = missingCount ? ` ${missingCount} missing skipped.` : '';
	showStatus(`Found ${loadedImages.length} image${loadedImages.length === 1 ? '' : 's'}.${skipped}`, 'success');
}

function updatePreviewEmptyMessage(loadedCount, checkedCount) {
	elements.previewGrid.querySelector('.preview-empty')?.remove();
	if (!generatedImages.length || checkedCount !== generatedImages.length || loadedCount > 0) return;

	const empty = document.createElement('div');
	empty.className = 'preview-empty';
	empty.textContent = 'No preview images found.';
	elements.previewGrid.appendChild(empty);
}

function renderPreview(images) {
	elements.previewGrid.innerHTML = '';
	const loadRun = ++previewLoadRun;
	const previewItems = [];

	for (const image of images) {
		const card = document.createElement('div');
		card.className = 'preview-card';

		const header = document.createElement('div');
		header.className = 'preview-card-header';

		const selectLabel = document.createElement('label');
		selectLabel.className = 'preview-select';

		const selectInput = document.createElement('input');
		selectInput.type = 'checkbox';
		selectInput.checked = image.selected !== false;
		selectInput.addEventListener('change', () => {
			image.selected = selectInput.checked;
			updateSelectionControls();
		});

		selectLabel.append(selectInput, document.createTextNode('Select'));

		const img = document.createElement('img');
		img.alt = image.styleLabel || image.fileName;
		img.loading = 'eager';
		img.title = 'Right-click to save this image manually';

		const status = document.createElement('span');
		status.className = 'preview-state';
		status.textContent = 'Preview';
		header.append(selectLabel, status);

		const styleInfo = document.createElement('div');
		styleInfo.className = 'preview-style-list';

		if (image.styleSelections.length) {
			for (const selection of image.styleSelections) {
				const row = document.createElement('div');
				row.className = 'preview-style-row';

				const group = document.createElement('span');
				group.className = 'preview-style-group';
				group.textContent = `${selection.groupName}:`;

				const option = document.createElement('span');
				option.className = 'preview-style-option';
				option.textContent = selection.optionName;

				row.append(group, option);
				styleInfo.appendChild(row);
			}
		} else {
			const name = document.createElement('span');
			name.className = 'preview-name';
			name.textContent = image.styleLabel;
			styleInfo.appendChild(name);
		}

		const path = document.createElement('code');
		path.textContent = image.path;

		const actions = document.createElement('div');
		actions.className = 'preview-actions';

		const open = document.createElement('a');
		open.className = 'sec-subm secondary compact-action';
		open.href = image.url;
		open.target = '_blank';
		open.rel = 'noopener';
		open.textContent = 'Open';

		const download = document.createElement('button');
		download.type = 'button';
		download.className = 'sec-subm compact-action';
		download.textContent = 'Download';
		download.addEventListener('click', () => {
			downloadSingleImage(image, download);
		});

		actions.append(open, download);
		card.append(header, img, styleInfo, path, actions);
		elements.previewGrid.appendChild(card);
		image.previewCard = card;
		image.previewSelectInput = selectInput;
		previewItems.push({ card, image, img, status, selectInput });
	}

	updateSelectionControls();
	loadPreviewImages(previewItems, loadRun);
}

async function loadPreviewImages(previewItems, loadRun) {
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < previewItems.length) {
			if (loadRun !== previewLoadRun) return;

			const previewItem = previewItems[nextIndex++];
			previewItem.status.textContent = 'Checking';
			await loadPreviewImage(previewItem, loadRun);
		}
	}

	const workerCount = Math.min(MAX_PARALLEL_PREVIEW_LOADS, previewItems.length);
	await Promise.all(Array.from({ length: workerCount }, worker));
}

function loadPreviewImage({ card, image, img, status, selectInput }, loadRun) {
	return new Promise((resolve) => {
		let triedProxy = false;

		const settle = (exists) => {
			if (loadRun !== previewLoadRun) {
				resolve();
				return;
			}

			if (exists && hasHigherPriorityLoadedFallback(image)) {
				image.exists = 'duplicate';
				image.selected = false;
				card.remove();
				refreshGeneratedResults();
				resolve();
				return;
			}

			image.exists = exists;
			if (exists) {
				removeLowerPriorityLoadedFallbacks(image);
				status.textContent = 'Found';
			} else {
				selectInput.checked = false;
				image.selected = false;
				card.remove();
			}
			refreshGeneratedResults();
			resolve();
		};

		const loadUrl = (url) => {
			img.onload = () => settle(true);
			img.onerror = () => {
				if (!triedProxy) {
					triedProxy = true;
					status.textContent = 'Proxy';
					loadUrl(getProxiedCosmoUrl(image.url));
					return;
				}
				settle(false);
			};
			img.src = url;
		};

		loadUrl(image.url);
	});
}

function hasHigherPriorityLoadedFallback(image) {
	if (!image.fallbackGroupKey) return false;
	return generatedImages.some((candidate) => (
		candidate !== image &&
		candidate.fallbackGroupKey === image.fallbackGroupKey &&
		candidate.exists === true &&
		Number(candidate.fallbackRank) < Number(image.fallbackRank)
	));
}

function removeLowerPriorityLoadedFallbacks(image) {
	if (!image.fallbackGroupKey) return;

	for (const candidate of generatedImages) {
		if (
			candidate === image ||
			candidate.fallbackGroupKey !== image.fallbackGroupKey ||
			candidate.exists !== true ||
			Number(candidate.fallbackRank) <= Number(image.fallbackRank)
		) {
			continue;
		}

		candidate.exists = 'duplicate';
		candidate.selected = false;
		if (candidate.previewSelectInput) candidate.previewSelectInput.checked = false;
		candidate.previewCard?.remove();
	}
}

function getSelectedLoadedImages() {
	return getLoadedImages().filter((image) => image.selected !== false);
}

function updateSelectionControls() {
	updateGalleryOutput();
	if (!elements.selectionCount || !elements.selectAllImages || !elements.downloadSelectedZip) return;

	const loadedImages = getLoadedImages();
	const selectedImages = getSelectedLoadedImages();
	const loadedCount = loadedImages.length;
	const selectedCount = selectedImages.length;

	elements.selectionCount.textContent = `${selectedCount}/${loadedCount} selected`;
	elements.selectAllImages.disabled = loadedCount === 0;
	elements.selectAllImages.textContent = loadedCount > 0 && selectedCount === loadedCount
		? 'Unselect All'
		: 'Select All';
	elements.downloadSelectedZip.disabled = selectedCount === 0;
}

function selectAllImages() {
	const shouldSelect = getSelectedLoadedImages().length < getLoadedImages().length;
	for (const image of getLoadedImages()) {
		image.selected = shouldSelect;
	}

	elements.previewGrid.querySelectorAll('.preview-select input').forEach((input) => {
		input.checked = shouldSelect;
	});
	updateSelectionControls();
}

async function copyGalleryOutput() {
	const text = elements.galleryOutput.value;
	if (!text) return;

	try {
		await navigator.clipboard.writeText(text);
		showStatus('Copied gallery output.', 'success');
	} catch {
		elements.galleryOutput.focus();
		elements.galleryOutput.select();
		document.execCommand('copy');
		showStatus('Copied gallery output.', 'success');
	}
}

async function downloadSelectedZip() {
	const selectedImages = getSelectedLoadedImages();
	if (!selectedImages.length) {
		showStatus('No loaded images are selected.', 'error');
		return;
	}

	elements.downloadSelectedZip.disabled = true;
	showStatus(`Downloading ${selectedImages.length} selected image${selectedImages.length === 1 ? '' : 's'}...`, 'loading');

	try {
		const files = [];
		const failedImages = [];
		const usedFileNames = new Set();

		for (let index = 0; index < selectedImages.length; index++) {
			const image = selectedImages[index];
			showStatus(`Downloading ${index + 1}/${selectedImages.length}: ${image.fileName}`, 'loading');

			try {
				const data = await downloadCosmoImageBytes(image);

				files.push({
					name: getUniqueZipFileName(getImageDownloadFileName(image, selectedImages), usedFileNames),
					data,
				});
			} catch (error) {
				failedImages.push({ image, error });
			}
		}

		if (!files.length) throw new Error('Failed to download every selected image.');

		await loadFflate();
		const zipBlob = createZipBlob(files);
		downloadBlob(zipBlob, getZipDownloadName());
		if (failedImages.length) {
			showStatus(
				`Downloaded ${files.length} image${files.length === 1 ? '' : 's'} as a ZIP. ${failedImages.length} failed to download.`,
				'error',
			);
		} else {
			showStatus(`Downloaded ${files.length} image${files.length === 1 ? '' : 's'} as a ZIP.`, 'success');
		}
	} catch (error) {
		showStatus(`${error.message || error}\nThe proxy returned an error while downloading Cosmo image bytes.`, 'error');
	} finally {
		updateSelectionControls();
	}
}

async function downloadSingleImage(image, button) {
	const fileName = getImageDownloadFileName(image, getSelectedLoadedImages());
	const originalText = button.textContent;
	button.disabled = true;
	button.textContent = 'Downloading';
	showStatus(`Downloading ${fileName}...`, 'loading');

	try {
		const data = await downloadCosmoImageBytes(image);
		downloadBlob(new Blob([data], { type: 'image/png' }), fileName);
		showStatus(`Downloaded ${fileName}.`, 'success');
	} catch (error) {
		showStatus(`Failed to download ${fileName}: ${error.message || error}`, 'error');
	} finally {
		button.disabled = false;
		button.textContent = originalText;
	}
}

async function downloadCosmoImageBytes(image) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ZIP_DOWNLOAD_TIMEOUT_MS);

	try {
		const response = await fetch(getProxiedCosmoUrl(image.url), {
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			signal: controller.signal,
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return new Uint8Array(await response.arrayBuffer());
	} finally {
		clearTimeout(timeout);
	}
}

function getProxiedCosmoUrl(url) {
	return `${COSMO_PROXY_URL}${encodeURIComponent(url)}`;
}

function updateGalleryOutput() {
	if (!elements.galleryOutput || !elements.copyGalleryOutput) return;

	const images = getSelectedLoadedImages();
	const output = buildGalleryOutput(images);
	elements.galleryOutput.value = output;
	elements.copyGalleryOutput.disabled = !output;
}

function buildGalleryOutput(images) {
	if (!images.length) return '';
	if (!isGallerySupportedImageType(images[0].imageType)) return '';

	const title = getGalleryTitle(images[0]);
	const isNested = elements.nestedTabberOutput?.checked;
	const isFullGallery = elements.fullGalleryOutput?.checked;
	const tabPrefix = isNested ? '{{!}}-{{!}}' : '|-|';
	const bodyLines = buildGalleryBodyLines(title, images, tabPrefix);

	if (!isFullGallery) return bodyLines.join('\n');
	if (isNested) {
		return [
			'== Gallery ==',
			'{{#tag:tabber|' + buildGalleryBodyLines(title, images, '').join('\n'),
			'}}',
		].join('\n');
	}

	return [
		'== Gallery ==',
		'<tabber>',
		...bodyLines,
		'</tabber>',
	].join('\n');
}

function buildGalleryBodyLines(title, images, tabPrefix) {
	const galleryLines = buildGalleryLines(images);
	const lines = [
		`${tabPrefix}${title}=`,
		`=== ${title} ===`,
	];

	const infoTemplate = getGalleryInfoTemplate(images[0]);
	if (infoTemplate) lines.push(infoTemplate);

	lines.push(...galleryLines);
	return lines;
}

function buildGalleryLines(images) {
	const lines = ['<gallery>'];

	for (const image of images) {
		const fileName = formatGalleryFileName(getImageDownloadFileName(image, images));
		const caption = getGalleryCaption(image, images);
		lines.push(`${fileName}|${caption}`);
	}

	lines.push('</gallery>');
	return lines;
}

function isGallerySupportedImageType(imageType) {
	return imageType === 'locker_preview_image' || imageType === 'preview_permutation_image';
}

function getGalleryInfoTemplate(image) {
	if (image?.imageType === 'locker_preview_image') return '{{LockerPreviewInfo}}';
	if (image?.imageType === 'preview_permutation_image' && isCompanionAssetId(image?.assetId)) return '{{SidekickPermutationInfo}}';
	return '';
}

function getGalleryTitle(image) {
	if (image.imageType === 'locker_preview_image') return 'Locker Previews';
	if (image.imageType === 'store_image') return 'Store Images';
	if (image.imageType === 'preview_permutation_image') return 'Permutation Icons';
	return 'Preview Images';
}

function formatGalleryFileName(fileName) {
	return fileName;
}

function getGalleryCaption(image, contextImages = [image]) {
	const cosmeticName = getZipCosmeticName(image);
	if (isJunoProductAssetId(image?.assetId)) {
		return getJunoGalleryCaption(image, contextImages, cosmeticName);
	}
	if (isRacingCosmeticImage(image)) {
		const racingCaption = getRacingGalleryCaption(image);
		if (racingCaption) return racingCaption;
	}
	if (
		image.imageType === 'locker_preview_image' &&
		!hasDefaultImageCandidateInGallery(contextImages) &&
		image === contextImages[0]
	) {
		return cosmeticName;
	}
	if (!image.styleSelections?.length) return cosmeticName;

	const labels = image.styleSelections
		.map((selection) => formatGalleryCaptionSelection(selection, image.styleSelections))
		.filter((label) => shouldUseGalleryCaptionLabel(label, cosmeticName));

	return labels.length ? labels.join(', ') : cosmeticName;
}

function getJunoGalleryCaption(image, contextImages, cosmeticName) {
	const baseCaption = `${cosmeticName} - LEGO® Style`;
	if (!hasSignatureAndBaseJunoImagesInGallery(image, contextImages)) return baseCaption;

	const optionName = getJunoStyleOptionName(image);
	return optionName ? `${baseCaption} - ${optionName}` : baseCaption;
}

function hasSignatureAndBaseJunoImagesInGallery(image, contextImages) {
	const matchingImages = contextImages.filter((contextImage) => (
		isJunoProductAssetId(contextImage?.assetId) &&
		getAssetBaseId(contextImage?.baseAssetId || contextImage?.assetId) === getAssetBaseId(image?.baseAssetId || image?.assetId)
	));
	const optionNames = new Set(matchingImages.map(getJunoStyleOptionName).filter(Boolean).map((name) => name.toLowerCase()));
	return optionNames.has('signature') && optionNames.has('base');
}

function getJunoStyleOptionName(image) {
	const selection = (image?.styleSelections || []).find((item) => /lego/i.test(String(item?.groupName || '')));
	return selection?.optionName || '';
}

function getRacingGalleryCaption(image) {
	if (hasPaintedStyleSelection(image)) {
		const labels = (image.styleSelections || [])
			.map(formatPaintedRacingGallerySelection)
			.filter(Boolean);

		return labels.length ? labels.join(', ') : '';
	}

	const labels = (image.styleSelections || [])
		.map((selection) => extractColorHex(selection.optionName) || extractColorHex(selection.groupName))
		.filter(Boolean);

	return labels.length ? labels.join(', ') : '';
}

function hasPaintedStyleSelection(image) {
	return (image.styleSelections || []).some((selection) => isPaintedStyleSelection(selection));
}

function formatPaintedRacingGallerySelection(selection) {
	const groupName = String(selection.groupName || '');
	const optionName = String(selection.optionName || '');

	if (isBodyColorSelection(selection)) {
		const hex = extractColorHex(optionName) || extractColorHex(groupName);
		return hex ? `Body Color - ${hex}` : '';
	}

	if (isPaintedStyleSelection(selection)) {
		return `Painted Style - ${formatGalleryCaptionLabel(optionName)}`;
	}

	return '';
}

function isBodyColorSelection(selection) {
	return /body color/i.test(String(selection.groupName || ''));
}

function isPaintedStyleSelection(selection) {
	return /painted style/i.test(String(selection.groupName || ''));
}

function extractColorHex(value) {
	const match = String(value || '').match(/#[0-9a-f]{6}\b/i);
	return match?.[0] || '';
}

function isRacingCosmeticImage(image) {
	const assetType = getZipAssetTypeLabel(image);
	return ['Car Body', 'Wheels', 'Decal', 'Boost', 'Trail'].includes(assetType);
}

function isRacingCarBodyAsset(assetId) {
	const baseId = getAssetBaseId(assetId).toLowerCase();
	if (/^(carbody_|body_|id_body_)/i.test(baseId)) return true;
	const selectedBaseId = String(selectedAsset?.id || '').toLowerCase();
	if (selectedBaseId && selectedBaseId === baseId) {
		return /^Racing\/Bodies\//i.test(selectedAsset?.dataPath || '');
	}
	return false;
}

function hasDefaultImageCandidateInGallery(images) {
	return images.some((image) => image?.style === null);
}

function formatGalleryCaptionSelection(selection, selections) {
	const optionLabel = formatGalleryCaptionLabel(selection.optionName);
	const groupLabel = formatGalleryCaptionLabel(selection.groupName);
	if (!groupLabel || shouldOmitGalleryCaptionGroup(groupLabel, optionLabel)) return optionLabel;
	return `${groupLabel} - ${optionLabel}`;
}

function formatGalleryCaptionLabel(label) {
	const value = String(label || '').trim();
	if (isAllCapsLabel(value) || isAllLowerCaseLabel(value)) return titleCaseWords(value);
	return value;
}

function shouldOmitGalleryCaptionGroup(groupLabel, optionLabel) {
	const group = String(groupLabel || '').trim().toLowerCase();
	const option = String(optionLabel || '').trim().toLowerCase();
	return (
		!group ||
		group === option ||
		group === 'style' ||
		group === 'styles' ||
		group.startsWith('channel ')
	);
}

function isAllCapsLabel(value) {
	return /[A-Z]/.test(value) && value === value.toUpperCase();
}

function isAllLowerCaseLabel(value) {
	return /[a-z]/.test(value) && value === value.toLowerCase() && !/^#[0-9a-f]{6}$/i.test(value);
}

function shouldUseGalleryCaptionLabel(label, cosmeticName) {
	const normalized = String(label || '').trim();
	if (!normalized) return false;

	const lower = normalized.toLowerCase();
	return !(
		lower === cosmeticName.toLowerCase() ||
		lower === 'default' ||
		lower === 'base' ||
		lower === 'none'
	);
}

function getImageDownloadFileName(image, contextImages = [image]) {
	if (image.imageType === 'store_image') {
		return getStoreImageDownloadFileName(image);
	}

	const cosmeticName = getZipCosmeticName(image);
	const imageDescriptor = getZipImageDescriptor(image, contextImages);
	const assetType = getZipAssetTypeLabel(image);
	const game = getZipGameLabel(image);
	return sanitizeFileName(`${cosmeticName} (${imageDescriptor}) - ${assetType} - ${game}.png`);
}

function getStoreImageDownloadFileName(image) {
	const cosmeticName = getZipCosmeticName(image);
	const storeOption = getStoreImageOption(image);
	const assetType = getZipAssetTypeLabel(image);
	const descriptor = getZipStoreDescriptor(image, storeOption, assetType);
	const game = getZipGameLabel(image, storeOption);
	if (isZipBundleImage(image)) {
		return sanitizeFileName(getZipBundleStoreFileName(cosmeticName, descriptor));
	}

	return sanitizeFileName(`${cosmeticName} (${descriptor}) - ${assetType} - ${game}.png`);
}

function getZipBundleStoreFileName(bundleName, descriptor) {
	const suffix = descriptor === 'Featured' ? '' : ` (${descriptor.replace(/ - Featured$/i, '')})`;
	return `${bundleName}${suffix} - Item Shop Bundle - Fortnite.png`;
}

function isZipBundleImage(image) {
	return elements.assetKind.value === 'Bundle' || selectedAsset?.kind === 'Bundle' || /^bundle_/i.test(image?.assetId || '');
}

function getZipCosmeticName(image) {
	const storedName = elements.assetName.value.trim() || selectedAsset?.name || '';
	if (storedName) return storedName;

	const displayValue = elements.assetDisplay.value.trim();
	const displayMatch = displayValue.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
	if (displayMatch?.[1]) return displayMatch[1].trim();

	return image.assetId || 'Cosmo Image';
}

function getZipImageTypeLabel(image) {
	return ZIP_IMAGE_TYPE_LABELS[image.imageType] || friendlyVariantType(image.imageType || 'Image');
}

function getZipImageDescriptor(image, contextImages = [image]) {
	const contextLabel = getZipImageContextLabel(image);
	const imageTypeLabel = getZipImageTypeLabel(image);
	const imageType = contextLabel ? `${contextLabel} - ${imageTypeLabel}` : imageTypeLabel;
	const stylePart = getZipStylePart(image, contextImages);
	return stylePart ? `${imageType} - ${stylePart}` : imageType;
}

function getZipImageContextLabel(image) {
	if (image?.imageType !== 'locker_preview_image') return '';
	if (getZipAssetTypeLabel(image) !== 'Decal') return '';
	return getRacingDecalCarBodyName(image);
}

function getRacingDecalCarBodyName(image) {
	const carBodyTag = getRacingDecalCarBodyTag(image);
	if (!Array.isArray(index)) return '';

	const body = carBodyTag ? index.find((entry) => (
		isRacingCarBodyEntry(entry) &&
		String(entry.carBodyTag || '').toLowerCase() === carBodyTag.toLowerCase()
	)) : null;
	const fallbackBody = body || getRacingDecalCarBodyFromPath(image);

	return fallbackBody?.name || '';
}

function getRacingDecalCarBodyTag(image) {
	if (selectedAsset?.carBodyTag) return selectedAsset.carBodyTag;

	const assetId = getAssetBaseId(image?.assetId || image);
	const entry = Array.isArray(index) ? index.find((item) => (
		String(item?.id || '').toLowerCase() === assetId.toLowerCase()
	)) : null;

	return entry?.carBodyTag || '';
}

function isRacingCarBodyEntry(entry) {
	const id = String(entry?.id || '').toLowerCase();
	return (
		id.startsWith('carbody_') ||
		id.startsWith('body_') ||
		id.startsWith('id_body_')
	);
}

function getRacingDecalCarBodyFromPath(image) {
	const assetId = getAssetBaseId(image?.assetId || image);
	const decal = Array.isArray(index) ? index.find((entry) => (
		String(entry?.id || '').toLowerCase() === assetId.toLowerCase()
	)) : null;
	const match = String(decal?.path || selectedAsset?.dataPath || '').match(/^Racing\/Skins\/([^/]+)\//i);
	if (!match) return null;

	const bodyFolder = match[1].toLowerCase();
	return index.find((entry) => (
		isRacingCarBodyEntry(entry) &&
		String(entry.path || '').toLowerCase().startsWith(`racing/bodies/${bodyFolder}/`)
	)) || null;
}

function getZipStylePart(image, contextImages = [image]) {
	if (!Array.isArray(image.style)) return '';
	if (isJunoProductAssetId(image?.assetId)) return getJunoZipStylePart(image, contextImages);
	if (shouldUseImmutableOnlyStyles(image.imageType, image.assetId)) return getCompanionStylePart(image.style, image.imageType);
	if (isZeroStyleArray(image.style) && !hasDefaultImageCandidate(image, contextImages)) return '';
	return image.style.join(',');
}

function getJunoZipStylePart(image, contextImages) {
	if (!hasSignatureAndBaseJunoImagesInGallery(image, contextImages)) return '';
	if (isZeroStyleArray(image.style)) return '';
	return image.style.join(',');
}

function getCompanionStylePart(styleArray, imageType) {
	const shouldIncludeGroup = imageType === 'preview_permutation_image'
		? isImmutableVariantGroup
		: isGeneratedCompanionStyleGroup;
	const values = styleArray.filter((value, index) => shouldIncludeGroup(detectedStyleGroups[index]));
	if (imageType === 'preview_permutation_image') return values.join(',');
	return values.length ? values.join(',') : styleArray.join(',');
}

function isZeroStyleArray(styleArray) {
	return Array.isArray(styleArray) && styleArray.length > 0 && styleArray.every((value) => Number(value) === 0);
}

function hasDefaultImageCandidate(image, contextImages) {
	return contextImages.some((candidate) => (
		candidate !== image &&
		candidate?.assetId === image.assetId &&
		candidate?.imageType === image.imageType &&
		candidate?.style === null
	));
}

function getZipStoreDescriptor(image, storeOption, assetType) {
	const baseLabel = getZipStoreBaseLabel(storeOption?.name);
	if (isLegoStoreOption(image, storeOption)) {
		const legoDescriptor = getNumberedLegoStoreDescriptor(storeOption);
		if (legoDescriptor) return legoDescriptor;
		if (assetType === 'Outfit') return 'Featured';
		return 'LEGO';
	}
	if (!shouldNumberStoreImage(image, storeOption)) return baseLabel;

	const index = getStoreImageOptionIndex(image, storeOption);
	return `${String(index + 1).padStart(2, '0')} - ${baseLabel}`;
}

function getZipStoreBaseLabel(name) {
	const rawName = String(name || '').trim();
	const tagName = rawName.includes('.') ? rawName.split('.').pop() : rawName;
	const normalized = tagName.replace(/[_-]+/g, ' ').trim();

	if (!normalized || /^default$/i.test(normalized)) return 'Featured';
	if (/^(br|battle royale)$/i.test(normalized)) return 'Featured';
	if (/^(juno|lego)$/i.test(normalized)) return 'LEGO';
	if (/^featured$/i.test(normalized)) return 'Featured';

	return titleCaseWords(normalized);
}

function shouldNumberStoreImage(image, storeOption) {
	const index = getStoreImageOptionIndex(image, storeOption);
	if (index <= 0 || isLegoStoreOption(image, storeOption)) return false;

	return (
		elements.assetKind.value === 'Bundle' ||
		selectedAsset?.kind === 'Bundle' ||
		isCompanionAssetId(image.assetId) ||
		getStoreImageOptionCount() > 1
	);
}

function getStoreImageOption(image) {
	const value = getStoreImageOptionIndex(image);
	const option = detectedStyleGroups[0]?.options.find((item) => Number(item.value) === value);
	if (option) return option;

	const selection = image.styleSelections?.[0];
	if (!selection) return null;

	return {
		value: selection.value,
		name: selection.optionName,
	};
}

function getStoreImageOptionIndex(image, storeOption = null) {
	if (Number.isFinite(Number(storeOption?.value))) return Number(storeOption.value);
	if (Array.isArray(image.style) && Number.isFinite(Number(image.style[0]))) return Number(image.style[0]);
	return 0;
}

function getStoreImageOptionCount() {
	return detectedStyleGroups[0]?.options?.length || 0;
}

function getNumberedLegoStoreDescriptor(storeOption) {
	const legoOptions = getLegoStoreOptions();
	if (legoOptions.length <= 1) return '';

	const legoIndex = legoOptions.findIndex((option) => Number(option.value) === Number(storeOption?.value));
	if (legoIndex < 0) return '';
	if (legoIndex === 0) return 'LEGO';
	return `LEGO - ${String(legoIndex + 1).padStart(2, '0')}`;
}

function getLegoStoreOptions() {
	return (detectedStyleGroups[0]?.options || []).filter((option) => isLegoStoreOptionName(option?.name));
}

function isLegoStoreOptionName(name) {
	return /juno|lego/i.test(String(name || ''));
}

function isLegoStoreOption(image, storeOption) {
	return /juno|lego/i.test([
		storeOption?.name,
		image?.path,
		image?.assetId,
		elements.assetDav2Id.value,
		elements.assetDav2Path.value,
		selectedAsset?.dav2Id,
		selectedAsset?.dav2Path,
	].filter(Boolean).join(' '));
}

function getZipAssetTypeLabel(image) {
	const assetId = image?.assetId || image;
	if (elements.assetKind.value === 'Bundle' || selectedAsset?.kind === 'Bundle') return 'Bundle';

	const dataPathMatch = ZIP_DATA_PATH_TYPE_LABELS.find(([pattern]) => pattern.test(selectedAsset?.dataPath || ''));
	if (dataPathMatch) return dataPathMatch[1];

	const instrumentLabel = getSparksInstrumentLabel(image);
	if (instrumentLabel) return instrumentLabel;

	const baseId = getAssetBaseId(assetId);
	const match = ZIP_ASSET_TYPE_LABELS.find(([pattern]) => pattern.test(baseId));
	return match?.[1] || 'Cosmetic';
}

function getZipGameLabel(image, storeOption = null) {
	const assetId = image?.assetId || image;
	if (isLegoStoreOption(image, storeOption)) return 'LEGO Fortnite';
	if (isBeanstalkProductAssetId(assetId)) return 'Fall Guys';
	return isSparksInstrumentImage(image) || /^sparks/i.test(String(assetId || '')) ? 'Fortnite Festival' : 'Fortnite';
}

function getAssetBaseId(assetId) {
	return String(assetId || '')
		.split('[', 1)[0]
		.split('/')
		.pop()
		.replace(/\.json(?:\.gz)?$/i, '');
}

function getSparksInstrumentLabel(image) {
	const haystack = [
		image?.assetId,
		image?.path,
		elements.assetDav2Id.value,
		elements.assetDav2Path.value,
		selectedAsset?.id,
		selectedAsset?.dataPath,
		selectedAsset?.dav2Id,
		selectedAsset?.dav2Path,
	].filter(Boolean);

	for (const value of haystack) {
		const label = getSparksInstrumentLabelFromValue(value);
		if (label) return label;
	}

	return '';
}

function isSparksInstrumentImage(image) {
	return Boolean(getSparksInstrumentLabel(image));
}

function getSparksInstrumentLabelFromValue(value) {
	const baseId = getAssetBaseId(value).replace(/^dav2_/i, '');
	const normalizedPath = String(value || '').replace(/\\/g, '/');
	const pathMatch = normalizedPath.match(/Festival\/Instrument\/(Bass|Drum|Guitar|Keytar|Mic)\//i);
	const prefixMatch = baseId.match(/^Sparks_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)_/i);
	const suffixMatch = baseId.match(/^Sparks_.+_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)$/i);
	const instrument = pathMatch?.[1] || prefixMatch?.[1] || suffixMatch?.[1] || '';
	return getSparksInstrumentTypeLabel(instrument);
}

function getSparksInstrumentTypeLabel(instrument) {
	switch (String(instrument || '').toLowerCase()) {
		case 'bass':
			return 'Bass';
		case 'drum':
		case 'drumkit':
			return 'Drums';
		case 'guitar':
			return 'Guitar';
		case 'keytar':
			return 'Keytar';
		case 'mic':
			return 'Microphone';
		default:
			return '';
	}
}

function titleCaseWords(value) {
	return String(value || '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

function getUniqueZipFileName(fileName, usedFileNames) {
	const safeName = sanitizeFileName(fileName || 'cosmo-image.png') || 'cosmo-image.png';
	const dotIndex = safeName.lastIndexOf('.');
	const baseName = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
	const extension = dotIndex > 0 ? safeName.slice(dotIndex) : '';
	let candidate = safeName;
	let counter = 2;

	while (usedFileNames.has(candidate.toLowerCase())) {
		candidate = `${baseName}-${counter}${extension}`;
		counter++;
	}

	usedFileNames.add(candidate.toLowerCase());
	return candidate;
}

function getZipDownloadName() {
	const assetId = sanitizeFileName(getEnteredAssetId() || 'cosmo-images') || 'cosmo-images';
	const imageType = sanitizeFileName(elements.imageType.value || 'images') || 'images';
	return `${assetId}-${imageType}.zip`;
}

function sanitizeFileName(value) {
	return String(value || '')
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
		.replace(/\s+/g, ' ')
		.trim();
}

function createZipBlob(files) {
	const zipFiles = {};

	for (const file of files) {
		zipFiles[file.name] = file.data;
	}

	const zip = fflate.zipSync(zipFiles);

	return new Blob([zip], {
		type: 'application/zip'
	});
}

function downloadBlob(blob, fileName) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleGenerate() {
	try {
		showStatus('Generating candidate URLs...', 'loading');
		generatedImages = await generateImages();
		generatedImages.forEach((image) => {
			image.exists = null;
			image.selected = true;
		});
		renderPreview(generatedImages);
		if (!generatedImages.length) {
			showStatus('No candidate URLs were generated.', 'error');
		} else {
			showStatus(`Checking ${generatedImages.length} candidate image${generatedImages.length === 1 ? '' : 's'}...`, 'loading');
		}
	} catch (error) {
		generatedImages = [];
		showStatus(error.message || String(error), 'error');
	}
}

function clearAll() {
	previewLoadRun++;
	generatedImages = [];
	elements.previewGrid.innerHTML = '';
	updateSelectionControls();
	updateGalleryOutput();
	hideStatus();
}

function cacheElements() {
	Object.assign(elements, {
		assetDisplay: document.getElementById('asset-display'),
		assetId: document.getElementById('asset-id'),
		assetName: document.getElementById('asset-name'),
		assetKind: document.getElementById('asset-kind'),
		assetDataPath: document.getElementById('asset-data-path'),
		assetDav2Path: document.getElementById('asset-dav2-path'),
		assetDav2Id: document.getElementById('asset-dav2-id'),
		assetDav2Hint: document.getElementById('asset-dav2-hint'),
		assetSuggestions: document.getElementById('asset-suggestions'),
		imageType: document.getElementById('image-type'),
		releaseVersion: document.getElementById('release-version'),
		aesKey: document.getElementById('aes-key'),
		customReleaseFields: document.getElementById('custom-release-fields'),
		customReleaseVersion: document.getElementById('custom-release-version'),
		customReleaseKey: document.getElementById('custom-release-key'),
		styleArray: document.getElementById('style-array'),
		styleSource: document.getElementById('style-source'),
		checkLargeStyleSets: document.getElementById('check-large-style-sets'),
		galleryOutput: document.getElementById('gallery-output'),
		copyGalleryOutput: document.getElementById('copy-gallery-output'),
		nestedTabberOutput: document.getElementById('nested-tabber-output'),
		fullGalleryOutput: document.getElementById('full-gallery-output'),
		detectedStyleBox: document.getElementById('detected-style-box'),
		detectedStyleStatus: document.getElementById('detected-style-status'),
		detectedStyleControls: document.getElementById('detected-style-controls'),
		generateBtn: document.getElementById('generate-btn'),
		clearBtn: document.getElementById('clear-btn'),
		status: document.getElementById('status'),
		previewGrid: document.getElementById('preview-grid'),
		selectAllImages: document.getElementById('select-all-images'),
		downloadSelectedZip: document.getElementById('download-selected-zip'),
		selectionCount: document.getElementById('selection-count'),
	});
}

function populateReleaseOptions() {
	elements.releaseVersion.innerHTML = '';
	for (const release of RELEASES) {
		const option = document.createElement('option');
		option.value = release.version;
		option.textContent = release.label;
		elements.releaseVersion.appendChild(option);
	}

	const customOption = document.createElement('option');
	customOption.value = CUSTOM_RELEASE_VALUE;
	customOption.textContent = 'Custom...';
	elements.releaseVersion.appendChild(customOption);

	elements.releaseVersion.value = RELEASES[0].version;
	updateCustomReleaseFields();
}

function updateCustomReleaseFields() {
	const useCustom = elements.releaseVersion.value === CUSTOM_RELEASE_VALUE;
	elements.customReleaseFields.hidden = !useCustom;
}

function setupEvents() {
	elements.assetDisplay.addEventListener('input', updateAssetSuggestions);
	elements.imageType.addEventListener('change', () => {
		updateDav2Hint();
		loadDetectedStyles();
	});
	elements.releaseVersion.addEventListener('change', updateCustomReleaseFields);
	elements.styleSource.addEventListener('change', updateStyleSourceUI);
	elements.checkLargeStyleSets.addEventListener('change', renderDetectedStyleControls);
	elements.generateBtn.addEventListener('click', handleGenerate);
	elements.clearBtn.addEventListener('click', clearAll);
	elements.selectAllImages.addEventListener('click', selectAllImages);
	elements.downloadSelectedZip.addEventListener('click', downloadSelectedZip);
	elements.copyGalleryOutput.addEventListener('click', copyGalleryOutput);
	elements.nestedTabberOutput.addEventListener('change', updateGalleryOutput);
	elements.fullGalleryOutput.addEventListener('change', updateGalleryOutput);

	elements.assetDisplay.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') handleGenerate();
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('#asset-display, #asset-suggestions')) {
			elements.assetSuggestions.innerHTML = '';
		}
	});
}

window.addEventListener('DOMContentLoaded', async () => {
	cacheElements();
	populateReleaseOptions();
	setupEvents();
	updateStyleSourceUI();
	updateDav2Hint();

	try {
		showStatus('Loading data...', 'loading');
		await loadIndex();
		hideStatus();
	} catch (error) {
		showStatus(`Failed to load index data: ${error.message || error}`, 'error');
	}
});
