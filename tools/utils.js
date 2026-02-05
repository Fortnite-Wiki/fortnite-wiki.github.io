// utils.js - shared utility constants and functions for generators

import { SEASON_RELEASE_DATES, OG_SEASON_RELEASE_DATES, FESTIVAL_SEASON_RELEASE_DATES, LEGO_SEASON_RELEASE_DATES } from '/data/datesAndVersions.js';

export const TYPE_MAP = {
	"AthenaCharacterItemDefinition": "Outfit",
	"AthenaBackpackItemDefinition": "Back Bling",
	"AthenaPickaxeItemDefinition": "Pickaxe",
	"AthenaDanceItemDefinition": "Emote",
	"AthenaGliderItemDefinition": "Glider",
	"AthenaItemWrapDefinition": "Wrap",
	"AthenaLoadingScreenItemDefinition": "Loading Screen",
	"AthenaMusicPackItemDefinition": "Lobby Music",
	"AthenaSkyDiveContrailItemDefinition": "Contrail",
	"AthenaSprayItemDefinition": "Spray",
	"AthenaEmojiItemDefinition": "Emoticon",
	"AthenaPetCarrierItemDefinition": "Pet",
	"AthenaPetItemDefinition": "Pet",
	"AthenaToyItemDefinition": "Toy",
	"CosmeticShoesItemDefinition": "Kicks",
	"SparksBassItemDefinition": "Bass",
	"SparksDrumItemDefinition": "Drums",
	"SparksGuitarItemDefinition": "Guitar",
	"SparksKeyboardItemDefinition": "Keytar",
	"SparksMicItemDefinition": "Microphone",
	"SparksAuraItemDefinition": "Aura",
	"FortVehicleCosmeticsItemDefinition_Body": "Car Body",
	"FortVehicleCosmeticsItemDefinition_Skin": "Decal",
	"FortVehicleCosmeticsItemDefinition_Wheel": "Wheel",
	"FortVehicleCosmeticsItemDefinition_DriftTrail": "Trail",
	"FortVehicleCosmeticsItemDefinition_Booster": "Boost",
	"CosmeticCompanionItemDefinition": "Sidekick",
	"CosmeticCompanionReactFXItemDefinition": "Reaction"
};

export const INSTRUMENTS_TYPE_MAP = {
	"SparksBassItemDefinition": "Bass",
	"SparksDrumItemDefinition": "Drums",
	"SparksGuitarItemDefinition": "Guitar",
	"SparksKeyboardItemDefinition": "Keytar",
	"SparksMicItemDefinition": "Microphone"
};

export const SERIES_CONVERSION = {
	"ColumbusSeries": "Star Wars Series",
	"CreatorCollabSeries": "Icon Series",
	"CrewSeries": "Crew Series",
	"CUBESeries": "Dark Series",
	"DCUSeries": "DC Series",
	"FrozenSeries": "Frozen Series",
	"KittySeries": "PUMA Series",
	"LavaSeries": "Lava Series",
	"MarvelSeries": "Marvel Series",
	"PlatformSeries": "Gaming Legends Series",
	"ShadowSeries": "Shadow Series",
	"SlurpSeries": "Slurp Series",
	"Series_Adidas": "Adidas Series",
	"Series_Alan_Walker": "Alan Walker Series",
	"Series_BMW": "BMW Series",
	"Series_Bugatti": "Bugatti Series",
	"Series_Chevrolet": "Chevrolet Series",
	"Series_DC": "DC Series",
	"Series_Dodge": "Dodge Series",
	"Series_Ferrari": "Ferrari Series",
	"Series_Ford": "Ford Series",
	"Series_Jeep": "Jeep Series",
	"Series_Lamborghini": "Lamborghini Series",
	"Series_McLaren": "McLaren Series",
	"Series_Mercedes": "Mercedes-Benz Series",
	"Series_Nissan": "Nissan Series",
	"Series_Pontiac": "Pontiac Series",
	"Series_Porsche": "Porsche Series",
	"Series_RAM": "Ram Series",
	"Series_Tesla": "Tesla Series",
	"Series_AstonMartin": "Aston Martin Series"
};

export const characterBundlePattern = /^DA_(?:Character_(.+)|(.+)_Character)$/;

export function articleFor(word) {
	if (word === "") return "";
	return word[0].toLowerCase().match(/[aeiou]/) ? "an" : "a";
}

export function forceTitleCase(str) {
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

export function abbreviate(str) {
   let words = str.split(/\s+/);
   let abbreviation = '';
   for (let i = 0; i < words.length; i++) {
     abbreviation += words[i][0];
   }
   return abbreviation;
}

export function standardiseDateString(date) {
	if (date instanceof Date) return date;
	// using this instead of simply
	// const date = new Date(settings.releaseDate);
	// because of timezones affecting the entered date
	const [year, month, day] = date.split('-').map(Number);
	return new Date(year, month - 1, day); // month is 0-indexed
}

export function getFormattedReleaseDate(date) {
	date = standardiseDateString(date);

	const day = date.getDate();
	const suffix = day >= 11 && day <= 13 ? 'th' : 
					day % 10 === 1 ? 'st' : 
					day % 10 === 2 ? 'nd' : 
					day % 10 === 3 ? 'rd' : 'th';
	
	const month = date.toLocaleString('en-US', { month: 'long' });
	return `${month} ${day}${suffix} ${date.getFullYear()}`;
}

export function getItemShopHistoryDate(date, settings = {}) {
	if (!settings.releaseDate) return '';

	const formattedDate = getFormattedReleaseDate(date);
	if (settings.shopHistoryPart) {
		return `[[Item Shop History/${formattedDate} - Part ${settings.shopHistoryPart}|${formattedDate}<br><small><small>Part ${settings.shopHistoryPart}</small></small>]]`;
	} else {
		return `[[Item Shop History/${formattedDate}|${formattedDate}]]`;
	}
}

export function getSeasonReleased(releaseDate, settings, usePlural = false) {
	if (releaseDate == "") {
		if (settings.isOGPass && settings.ogSeason) {
			releaseDate = OG_SEASON_RELEASE_DATES[settings.ogSeason];
		} else if (settings.isMusicPass && settings.musicSeason) {
			releaseDate = FESTIVAL_SEASON_RELEASE_DATES[settings.musicSeason];
		} else if (settings.isLEGOPass && settings.legoSeason) {
			releaseDate = LEGO_SEASON_RELEASE_DATES[settings.legoSeason];
		} else if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
			releaseDate = new Date(settings.crewYear, settings.crewMonth - 1, 1);
		}
	}

	if (releaseDate) {
		if (releaseDate instanceof Date === false) releaseDate = standardiseDateString(releaseDate);
		
		const sortedSeasons = Object.entries(SEASON_RELEASE_DATES)
			.sort(([, dateA], [, dateB]) => dateA - dateB);
		
		// Find the matching season key
		let matchedSeasonKey = null;
		for (let i = 0; i < sortedSeasons.length; i++) {
			const [currentKey, currentDate] = sortedSeasons[i];
			const nextDate = sortedSeasons[i + 1]?.[1];

			if (releaseDate >= currentDate && (!nextDate || releaseDate < nextDate)) {
				matchedSeasonKey = currentKey;
				break;
			}
		}

		const firstTextFlag = !settings.isQuestReward || settings.questFirstReleasedText ? 'first ' : '';
		
		if (matchedSeasonKey) {
			if (matchedSeasonKey === 'C2R') {
				return ` ${usePlural ? 'were' : 'was'} ${firstTextFlag}released in [[Chapter 2 Remix]]`;
			} else if (matchedSeasonKey === 'C6MS1') {
				return ` ${usePlural ? 'were' : 'was'} ${firstTextFlag}released in [[Galactic Battle]]`;
			} else if (matchedSeasonKey === 'C6MS2') {
				return ` ${usePlural ? 'were' : 'was'} ${firstTextFlag}released in [[Chapter 6: Mini Season 2]]`;
			} else {
				const keyMatch = matchedSeasonKey.match(/^C(\d+)(M)?S(\d+)$/);
				const chapter = keyMatch[1];
				const mini = keyMatch[2];
				const season = keyMatch[3];

				if (chapter && season) {
					if (mini) {
						return ` ${usePlural ? 'were' : 'was'} ${firstTextFlag}released in [[Chapter ${chapter}: Mini Season ${season}]]`;
					} else {
						return ` ${usePlural ? 'were' : 'was'} ${firstTextFlag}released in [[Chapter ${chapter}: Season ${season}]]`;
					}
				}
			}
		}
	}
	return '';
}

// Helper: wrap value in {{V-Bucks|...}} if not already
export function ensureVbucksTemplate(val) {
	if (!val) return '';
	if (/^\s*{{\s*V-Bucks\s*\|/.test(val)) return val;
	// Remove commas and spaces
	const num = val.replace(/[^\d]/g, '');
	const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `{{V-Bucks|${formatted}}}`;
}

// Helper: remove {{V-Bucks|...}} and return just the number
export function stripVbucksTemplate(val) {
	if (!val) return '';
	const m = val.match(/\{\{\s*V-Bucks\s*\|(\d{1,6}(?:,\d{3})*)\s*}}/);
	if (m) return m[1];
	return val.replace(/[^\d]/g, '');
}

/**
 * Check if a page exists on the Fortnite wiki.
 * Returns true if the page exists, false otherwise.
 */
export async function pageExists(title) {
	try {
		const endpoint = 'https://fortnite.fandom.com/api.php';
		const params = new URLSearchParams({
			action: 'query',
			titles: title,
			format: 'json',
			origin: '*'
		});

		const url = `${endpoint}?${params.toString()}`;
		const resp = await fetch(url);

		if (!resp.ok) return false;

		const json = await resp.json();
		const pages = json.query && json.query.pages ? json.query.pages : {};

		for (const pid of Object.keys(pages)) {
			const p = pages[pid];
			// If the page has a "missing" property, it doesn't exist
			if (p && !(p.missing == "")) {
				return true;
			}
		}
		return false;
	} catch (err) {
		console.warn('pageExists error', err);
		return false;
	}
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
 * Given a cosmetic name, attempt to pick the most up-to-date image filename.
 * Strategy:
 *  - Try page titled "{name} (cosmeticType)" first, then "{name}".
 *  - Prefer filenames containing a version token like "(v30.00)" with the highest numeric version.
 *  - Fallback to "{name} - cosmeticType - Fortnite.png".
 */
export async function getMostUpToDateImage(name, cosmeticType, lego = false) {
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
			const fileFormat = `- ${cosmeticType} - ${lego ? 'LEGO Fortnite' : 'Fortnite'}.png`;
			if (m && f.startsWith(name) && f.includes(fileFormat)) {
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

	return { file: `${name} - ${cosmeticType} - ${lego ? 'LEGO Fortnite' : 'Fortnite'}.png`, pageTitle: name };
}