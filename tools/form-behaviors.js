import { SEASON_UPDATE_VERSIONS, OG_SEASON_UPDATE_VERSIONS, FESTIVAL_SEASON_UPDATE_VERSIONS, LEGO_SEASON_UPDATE_VERSIONS } from '/data/datesAndVersions.js';

let elements = {};

export function initFormBehaviors(elementsObj) {
	elements = elementsObj;
	setupBattlePassModeHandling();
    setupAutoFillVersion();
	setupItemShopHistoryToggle();
	setupItemShopAppearancesToggle();
}

// Handle Linear vs Non-Linear Battle Pass mode changes
function handleBPModeChange() {
	if (!elements.bpModeLinear || !elements.bpModeNonLinear) return;
	
	const bpBonusChecked = elements.bpBonus && elements.bpBonus.checked;
	if (bpBonusChecked) {
		if (elements.bpNonLinearLevel) {
			const lvl = elements.bpNonLinearLevel;
			lvl.disabled = true;
			lvl.value = '';
			lvl.style.display = 'none';
			const lbl = document.querySelector(`label[for="${lvl.id}"]`) || (lvl.previousElementSibling && lvl.previousElementSibling.tagName === 'LABEL' ? lvl.previousElementSibling : null);
			if (lbl) lbl.style.display = 'none';
		}
	} else {
		if (elements.bpNonLinearLevel) {
			const lvl = elements.bpNonLinearLevel;
			lvl.disabled = false;
			lvl.style.display = '';
			const lbl = document.querySelector(`label[for="${lvl.id}"]`) || (lvl.previousElementSibling && lvl.previousElementSibling.tagName === 'LABEL' ? lvl.previousElementSibling : null);
			if (lbl) lbl.style.display = '';
		}
	}

	const linear = elements.bpModeLinear && elements.bpModeLinear.checked;
	const nonlinear = elements.bpModeNonLinear && elements.bpModeNonLinear.checked;

	const nonLinearFields = document.getElementById('bp-nonlinear-fields');
	// Show non-linear specific fields only when Non-Linear is selected
	if (nonLinearFields) nonLinearFields.style.display = nonlinear ? 'flex' : 'none';

	// If Non-Linear, clamp bpPage max to 2, otherwise allow up to 20
	if (elements.bpPage) {
		if (nonlinear) {
			elements.bpPage.max = 2;
			if (Number(elements.bpPage.value) > 2) elements.bpPage.value = '';
		} else {
			elements.bpPage.max = 20;
		}
	}
}

function setupBattlePassModeHandling() {
	// Only setup if Battle Pass mode elements exist
	if (!elements.bpModeLinear && !elements.bpModeNonLinear) return;
	
	if (elements.bpModeLinear) elements.bpModeLinear.addEventListener('change', handleBPModeChange);
	if (elements.bpModeNonLinear) elements.bpModeNonLinear.addEventListener('change', handleBPModeChange);
	if (elements.bpBonus) elements.bpBonus.addEventListener('change', handleBPModeChange);
	
	// Ensure bpPage cannot be set above allowed max by keyboard input
	if (elements.bpPage) {
		elements.bpPage.addEventListener('input', () => {
			const max = Number(elements.bpPage.max || 20);
			const val = Number(elements.bpPage.value || 0);
			if (val > max) elements.bpPage.value = String(max);
		});
	}
	
	handleBPModeChange();
}

function autoFillPassVersion() {
	if (!elements.updateVersion) return;
	
	const bpChecked = elements.sourceBattlePass && elements.sourceBattlePass.checked;
	const ogChecked = elements.sourceOGPass && elements.sourceOGPass.checked;
	const musicChecked = elements.sourceMusicPass && elements.sourceMusicPass.checked;
	const legoChecked = elements.sourceLEGOPass && elements.sourceLEGOPass.checked;

	let updateVersion = "";

	if (bpChecked && elements.bpSeason) {
		const seasonInput = elements.bpSeason.value.trim().toUpperCase();
		if (seasonInput) updateVersion = SEASON_UPDATE_VERSIONS[seasonInput] || "";
	} else if (ogChecked && elements.ogSeason) {
		const seasonInput = elements.ogSeason.value.trim();
		if (seasonInput) updateVersion = OG_SEASON_UPDATE_VERSIONS[seasonInput] || "";
	} else if (musicChecked && elements.musicSeason) {
		const seasonInput = elements.musicSeason.value.trim();
		if (seasonInput) updateVersion = FESTIVAL_SEASON_UPDATE_VERSIONS[seasonInput] || "";
	} else if (legoChecked && elements.legoSeason) {
		const seasonInput = elements.legoSeason.value.trim();
		if (seasonInput) updateVersion = LEGO_SEASON_UPDATE_VERSIONS[seasonInput] || "";
	}

	if (updateVersion) {
		elements.updateVersion.value = updateVersion;
	} else {
		elements.updateVersion.value = "";
	}
}

function setupAutoFillVersion() {
	if (elements.bpSeason) elements.bpSeason.addEventListener('input', autoFillPassVersion);
	if (elements.ogSeason) elements.ogSeason.addEventListener('input', autoFillPassVersion);
	if (elements.musicSeason) elements.musicSeason.addEventListener('input', autoFillPassVersion);
	if (elements.legoSeason) elements.legoSeason.addEventListener('input', autoFillPassVersion);
}

function setupItemShopHistoryToggle() {
	if (!elements.itemShopHistory || !elements.shopHistoryPart) return;
	
	elements.itemShopHistory.addEventListener('change', () => {
		elements.shopHistoryPart.style.display = elements.itemShopHistory.checked ? 'inline-block' : 'none';
	});
}

function setupItemShopAppearancesToggle() {
	if (!elements.includeAppearances || !elements.shopAppearances) return;
	
	const appearancesFields = document.querySelectorAll('.appearances-fields');
	elements.includeAppearances.addEventListener('change', () => {
		const appearancesChecked = elements.includeAppearances.checked;
		if (appearancesChecked) {
			appearancesFields.forEach(field => {
				field.style.display = 'block';
			});
			// Auto-fill with cosmetic name if available
			const name = elements.cosmeticInputName || elements.jamTrackInput || elements.bundleInputName;
			if (name) {
				elements.shopAppearances.value = name.value.trim();
			}
		} else {
			appearancesFields.forEach(field => {
				field.style.display = 'none';
			});
		}
	});
}