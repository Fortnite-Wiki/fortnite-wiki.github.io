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
	"FortVehicleCosmeticsItemDefinition_Booster": "Boost",
	"CosmeticCompanionItemDefinition": "Sidekick"
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