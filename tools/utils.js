// utils.js - shared utility constants and functions for generators

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
	"FortVehicleCosmeticsItemDefinition_Booster": "Boost"
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
	"Series_Mercedes": "Mercedes Series",
	"Series_Nissan": "Nissan Series",
	"Series_Pontiac": "Pontiac Series",
	"Series_Porsche": "Porsche Series",
	"Series_RAM": "Ram Series",
	"Series_Tesla": "Tesla Series"
};

export const SEASON_RELEASE_DATES = {
	'C1S1': new Date(2017, 9, 26), // October 26, 2017
	'C1S2': new Date(2017, 11, 14), // December 14, 2017
	'C1S3': new Date(2018, 1, 22), // February 22, 2018
	'C1S4': new Date(2018, 4, 1), // May 1, 2018
	'C1S5': new Date(2018, 6, 12), // July 12, 2018
	'C1S6': new Date(2018, 8, 27), // September 27, 2018
	'C1S7': new Date(2018, 11, 6), // December 6, 2018
	'C1S8': new Date(2019, 1, 28), // February 28, 2019
	'C1S9': new Date(2019, 4, 9), // May 9, 2019
	'C1S10': new Date(2019, 7, 1), // August 1, 2019
	'C2S1': new Date(2019, 9, 15), // October 15, 2019
	'C2S2': new Date(2020, 1, 20), // February 20, 2020
	'C2S3': new Date(2020, 5, 17), // June 17, 2020
	'C2S4': new Date(2020, 7, 27), // August 27, 2020
	'C2S5': new Date(2020, 11, 2), // December 2, 2020
	'C2S6': new Date(2021, 2, 16), // March 16, 2021
	'C2S7': new Date(2021, 5, 8), // June 8, 2021
	'C2S8': new Date(2021, 8, 13), // September 13, 2021
	'C3S1': new Date(2021, 11, 5), // December 5, 2021
	'C3S2': new Date(2022, 2, 20), // March 20, 2022
	'C3S3': new Date(2022, 5, 5), // June 5, 2022
	'C3S4': new Date(2022, 8, 18), // September 18, 2022
	'C4S1': new Date(2022, 11, 4), // December 4, 2022
	'C4S2': new Date(2023, 2, 10), // March 10, 2023
	'C4S3': new Date(2023, 5, 9), // June 9, 2023
	'C4S4': new Date(2023, 7, 25), // August 25, 2023
	'C4SOG': new Date(2023, 10, 3), // November 3, 2023
	'C5S1': new Date(2023, 11, 3), // December 3, 2023
	'C5S2': new Date(2024, 2, 9), // March 9, 2024
	'C5S3': new Date(2024, 4, 24), // May 24, 2024
	'C5S4': new Date(2024, 7, 16), // August 16, 2024
	'C2R': new Date(2024, 10, 2), // November 2, 2024
	'C6S1': new Date(2024, 11, 1), // December 1, 2024
	'C6S2': new Date(2025, 1, 21), // February 21, 2025
	'C6MS1': new Date(2025, 4, 2), // May 2, 2025
	'C6S3': new Date(2025, 5, 7), // June 7, 2025
	'C6S4': new Date(2025, 7, 7), // August 7, 2025
};

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

export function getFormattedReleaseDate(date = new Date()) {
	const day = date.getDate();
	const suffix = day >= 11 && day <= 13 ? 'th' : 
					day % 10 === 1 ? 'st' : 
					day % 10 === 2 ? 'nd' : 
					day % 10 === 3 ? 'rd' : 'th';
	
	const month = date.toLocaleString('en-US', { month: 'long' });
	return `${month} ${day}${suffix} ${date.getFullYear()}`;
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