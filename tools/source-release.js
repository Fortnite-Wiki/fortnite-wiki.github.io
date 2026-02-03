import { SOURCE_SETTINGS_FIELDS } from './source-settings-templates.js';


export function validateSourceSettings(settings, elements) {

	if (settings.isBattlePass) {
		if (!elements.bpModeLinear?.checked && !elements.bpModeNonLinear?.checked) {
			return 'Please choose Battle Pass mode: Linear or Non-Linear';
		}

		if (!elements.bpSeason?.value || !settings.bpPage) {
			return 'Please fill in Battle Pass season and page';
		}

		if (!parseBattlePassSeason(elements.bpSeason?.value)) {
			return 'Invalid season format. Use format like C6S4';
		}

		if (elements.bpModeNonLinear?.checked) {
			const p = Number(settings.bpPage);
			if (isNaN(p) || p < 1 || p > 2) {
				return 'For Non-Linear mode the page must be 1 or 2';
			}
			const setName = settings.bpNonLinearSetName;
			if (!setName) {
				return 'Please enter the outfit set name for Non-Linear mode';
			}
		}
	}

	if (settings.isFortniteCrew) {
		if (!settings.crewMonth || !settings.crewYear) {
			return 'Please select crew month and year';
		}
	}
	
	if (settings.isOGPass) {
		if (!settings.ogSeason || !settings.ogPage) {
			return 'Please fill in OG Pass season and page';
		}
	}
	
	if (settings.isMusicPass) {
		if (!settings.musicSeason || !settings.musicPage) {
			return 'Please fill in Music Pass season and page';
		}
	}
	
	if (settings.isLEGOPass) {
		if (!settings.legoSeason || !settings.legoPage) {
			return 'Please fill in LEGO Pass season and page';
		}
	}

	if (settings.isQuestReward) {
		if (!settings.questName) {
			return 'Please enter the name of the quests that grant this cosmetic';
		}
	}

	if (settings.isRocketPass) {
		if (!settings.rocketPassSeason || !settings.rocketPassLevel) {
			return 'Please fill in Rocket Pass season and level';
		}
	}

	return null;
}

function parseBattlePassSeason(seasonInput) {
	const match = seasonInput.toUpperCase().match(/^C(\d+)(M)?S(\d+)$/);
	if (match) {
		return { chapter: match[1], season: match[3], mini: !!match[2] };
	}
	return null;
}

export function initSourceReleaseControls({
	sources = [], // Array of source keys (e.g., ['itemShop', 'battlePass', 'musicPass'])
	autoReleaseSources = [],
	hideReleaseFieldsSources = [],
	hideItemShopHistorySources = [],
	onSourceChange = null
}, elements = {}) {
	// Automatically query for all elements based on the sources array
	const sourceElements = {};
	const sourceSettingsElements = {};
	
	sources.forEach(key => {
		const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
		sourceElements[key] = document.getElementById(`source-${kebabKey}`);
		sourceSettingsElements[key] = document.getElementById(`${kebabKey}-settings`);
	});
	
	const releasedSwitch = document.getElementById('released-switch');
	const releasedLabel = document.getElementById('released-label');
	const releasedFields = document.querySelectorAll('.released-fields');
	const releaseDate = document.getElementById('release-date');
	const itemShopHistory = document.getElementById('item-shop-history');
	const shopHistoryPart = document.getElementById('shop-history-part');
	const itemShopHistoryField = document.getElementById('item-shop-history-field');
	
	const sourceCheckboxes = Object.values(sourceElements).filter(Boolean);

	const anySourceSelected = (keys) => keys.some((key) => sourceElements[key] && sourceElements[key].checked);

	const clearReleaseValues = () => {
		if (releaseDate) releaseDate.value = '';
		if (itemShopHistory) itemShopHistory.checked = false;
		if (shopHistoryPart) shopHistoryPart.value = '';
	};

	const setReleasedFieldsVisible = (visible) => {
		releasedFields.forEach((field) => {
			field.style.display = visible ? 'flex' : 'none';
		});
	};

	const setItemShopHistoryFieldVisible = (visible) => {
		if (itemShopHistoryField) {
			itemShopHistoryField.style.display = visible ? 'flex' : 'none';
		}
	};

	const updateShopHistoryPartVisibility = () => {
		if (!shopHistoryPart) return;
		shopHistoryPart.style.display = itemShopHistory && itemShopHistory.checked ? 'inline-block' : 'none';
	};

	const updateExclusivity = () => {
		const activeSource = sourceCheckboxes.find((cb) => cb.checked);
		if (!activeSource) {
			sourceCheckboxes.forEach((cb) => (cb.disabled = false));
			return;
		}

		sourceCheckboxes.forEach((cb) => {
			cb.disabled = cb !== activeSource;
		});
	};

	const updateSourceSettings = () => {
		// Show/hide source-specific settings sections
		Object.entries(sourceSettingsElements).forEach(([key, element]) => {
			if (!element) return;
			const isChecked = sourceElements[key] && sourceElements[key].checked;
			element.classList.toggle('hidden', !isChecked);
		});
	};

	const updateReleaseUI = () => {
		const isReleased = releasedSwitch ? releasedSwitch.checked : false;
		const autoRelease = anySourceSelected(autoReleaseSources);
		const hideReleaseFields = anySourceSelected(hideReleaseFieldsSources);
		const hideItemShopHistory = anySourceSelected(hideItemShopHistorySources);

		if (releasedLabel) releasedLabel.textContent = isReleased ? 'Yes' : 'No';

		if (autoRelease && releasedSwitch) {
			releasedSwitch.checked = true;
			releasedSwitch.disabled = true;
			if (releasedLabel) releasedLabel.textContent = 'Yes';
			setReleasedFieldsVisible(false);
			setItemShopHistoryFieldVisible(false);
			clearReleaseValues();
			updateShopHistoryPartVisibility();
			return;
		}

		if (releasedSwitch) releasedSwitch.disabled = false;

		if (!isReleased) {
			setReleasedFieldsVisible(false);
			setItemShopHistoryFieldVisible(false);
			clearReleaseValues();
			updateShopHistoryPartVisibility();
			return;
		}

		if (hideReleaseFields) {
			setReleasedFieldsVisible(false);
			setItemShopHistoryFieldVisible(false);
			clearReleaseValues();
			updateShopHistoryPartVisibility();
			return;
		}

		setReleasedFieldsVisible(true);
		setItemShopHistoryFieldVisible(!hideItemShopHistory);

		if (hideItemShopHistory && itemShopHistory) {
			itemShopHistory.checked = false;
			if (shopHistoryPart) shopHistoryPart.value = '';
		}

		updateShopHistoryPartVisibility();
	};

	sourceCheckboxes.forEach((cb) => cb.addEventListener('change', () => {
		updateExclusivity();
		updateSourceSettings();
		updateReleaseUI();
		if (onSourceChange) onSourceChange();
	}));

	if (releasedSwitch) releasedSwitch.addEventListener('change', updateReleaseUI);
	if (itemShopHistory) itemShopHistory.addEventListener('change', updateShopHistoryPartVisibility);

	updateExclusivity();
	updateSourceSettings();
	updateReleaseUI();

	// Augment the elements object with all queried source/release/settings elements
	// Add source checkboxes
	sources.forEach(key => {
		const camelCaseKey = ('source' + key.charAt(0).toUpperCase() + key.slice(1)).replace('Nonlinear', 'NonLinear').replace('Og', 'OG').replace('Lego', 'LEGO').replace('Bp', 'BP');
		elements[camelCaseKey] = sourceElements[key];
	});

	// Add settings containers
	sources.forEach(key => {
		const camelCaseKey = (key.charAt(0).toLowerCase() + key.slice(1) + 'Settings').replace('Nonlinear', 'NonLinear').replace('Og', 'OG').replace('Lego', 'LEGO').replace('Bp', 'BP');
		elements[camelCaseKey] = sourceSettingsElements[key];
	});

	// Add release-related elements
	elements.releasedSwitch = releasedSwitch;
	elements.releasedLabel = releasedLabel;
	elements.releaseDate = releaseDate;
	elements.itemShopHistory = itemShopHistory;
	elements.shopHistoryPart = shopHistoryPart;

	// Query and add all settings fields from injected templates
	sources.forEach(sourceKey => {
		const fields = SOURCE_SETTINGS_FIELDS[sourceKey];
		if (fields) {
			fields.forEach(fieldId => {
				const element = document.getElementById(fieldId);
				if (element) {
					// Convert kebab-case to camelCase for the elements key
					const camelCaseKey = fieldId.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()).replace('Nonlinear', 'NonLinear').replace('Og', 'OG').replace('Lego', 'LEGO').replace('Bp', 'BP');
					elements[camelCaseKey] = element;
				}
			});
		}
	});

	return elements;
}

// Build settings object from elements for all source/release fields
export function getSourceReleaseSettings(elements) {
	const settings = {};
	
	// Release settings
	const isReleased = elements.releasedSwitch?.checked || false;
	settings.releaseDate = isReleased ? (elements.releaseDate?.value || '') : '';
	settings.itemShopHistory = isReleased ? (elements.itemShopHistory?.checked || false) : false;
	settings.shopHistoryPart = isReleased ? (elements.shopHistoryPart?.value || '') : '';
	settings.isUnreleased = !isReleased;
	
	// Source checkboxes
	settings.isItemShop = elements.sourceItemShop?.checked || false;
	settings.isBattlePass = elements.sourceBattlePass?.checked || false;
	settings.isFortniteCrew = elements.sourceFortniteCrew?.checked || false;
	settings.isOGPass = elements.sourceOGPass?.checked || false;
	settings.isMusicPass = elements.sourceMusicPass?.checked || false;
	settings.isLEGOPass = elements.sourceLEGOPass?.checked || false;
	settings.isQuestReward = elements.sourceQuestReward?.checked || false;
	settings.isRocketPass = elements.sourceRocketPass?.checked || false;
	
	// Item Shop settings
	settings.shopCost = elements.shopCost?.value || '';
	settings.includeAppearances = elements.includeAppearances?.checked || false;
	settings.shopAppearances = elements.shopAppearances?.value || '';
	
	// Battle Pass settings
	settings.bpPage = elements.bpPage?.value || '';
	settings.battlePassMode = (elements.bpModeNonLinear?.checked) ? 'non-linear' : 
	                          (elements.bpModeLinear?.checked ? 'linear' : '');
	settings.bpNonLinearSetName = elements.bpNonLinearSet?.value.trim() || '';
	settings.bpNonLinearLevel = elements.bpNonLinearLevel?.value.trim() || '';
	settings.bpBonus = elements.bpBonus?.checked || false;
	settings.bpPageCompletion = elements.bpPageCompletion?.checked || false;
	settings.passFreeBP = elements.passFreeBP?.checked || false;

	if (settings.isBattlePass && elements.bpSeason?.value) {
		const seasonData = parseBattlePassSeason(elements.bpSeason.value.trim());
		if (seasonData) {
			settings.bpChapter = seasonData.chapter;
			settings.bpSeasonNum = seasonData.season;
			settings.isMiniSeason = seasonData.mini;
		}
	}
	
	// Fortnite Crew settings
	settings.crewMonth = elements.crewMonth?.value || '';
	settings.crewYear = elements.crewYear?.value || '';
	
	// OG Pass settings
	settings.ogSeason = elements.ogSeason?.value || '';
	settings.ogPage = elements.ogPage?.value || '';
	settings.ogPageCompletion = elements.ogPageCompletion?.checked || false;
	settings.passFreeOG = elements.passFreeOG?.checked || false;
	
	// Music Pass settings
	settings.musicSeason = elements.musicSeason?.value || '';
	settings.musicPage = elements.musicPage?.value || '';
	settings.musicPageCompletion = elements.musicPageCompletion?.checked || false;
	settings.passFreeMusic = elements.passFreeMusic?.checked || false;
	
	// LEGO Pass settings
	settings.legoSeason = elements.legoSeason?.value || '';
	settings.legoPage = elements.legoPage?.value || '';
	settings.legoPageCompletion = elements.legoPageCompletion?.checked || false;
	settings.passFreeLEGO = elements.passFreeLEGO?.checked || false;
	
	// Quest Reward settings
	settings.questName = elements.questName?.value.trim() || '';
	settings.questCost = elements.questCost?.value.trim() || '';
	settings.questFirstReleasedText = elements.questFirstReleasedText?.checked || false;
	
	// Rocket Pass settings
	settings.rocketPassSeason = elements.rocketPassSeason?.value.trim() || '';
	settings.rocketPassLevel = elements.rocketPassLevel?.value.trim() || '';

	settings.isFree = (settings.isBattlePass && settings.passFreeBP) || (settings.isOGPass && settings.passFreeOG) || (settings.isMusicPass && settings.passFreeMusic) || (settings.isLEGOPass && settings.passFreeLEGO) || (settings.isQuestReward && (!settings.questCost || settings.questCost.toLowerCase() === 'free'));
	
	return settings;
}
