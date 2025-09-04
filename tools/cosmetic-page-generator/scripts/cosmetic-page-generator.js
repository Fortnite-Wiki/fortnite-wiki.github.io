import { loadGzJson } from '../../../scripts/pageinfo.js';

const DATA_BASE_PATH = '../../../data/';

const TYPE_MAP = {
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
};

const SERIES_CONVERSION = {
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
    "SlurpSeries": "Slurp Series"
};

let index = [];
let cosmeticSets = {};
let elements = {};
let isCrewAutoDetected = false; // Track if Crew was auto-detected

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
            let series = null;
            for (const entry of props.DataList || []) {
                if (typeof entry === 'object' && entry !== null && entry.Series) {
                    series = entry.Series.ObjectName?.split("'")?.slice(-2)[0];
                    rarity = SERIES_CONVERSION[series] || rarity;
                    break;
                }
            }
            
            // Auto-tick Fortnite Crew if Crew Series
            if (rarity === "Crew Series") {
                elements.sourceFortniteCrew.checked = true;
                isCrewAutoDetected = true; // Mark as auto-detected
                // Trigger the change event to update UI
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
  const input = document.getElementById("cosmetic-input").value.trim().toLowerCase();
  const sugDiv = document.getElementById("suggestions");
  sugDiv.innerHTML = "";
  if (!input) return;

  // Safety check to ensure index is loaded and is an array
  if (!Array.isArray(index) || index.length === 0) {
    return;
  }

  const matches = index.filter(e => e.name.toLowerCase().includes(input) || e.id.toLowerCase().includes(input));
  matches.slice(0, 10).forEach(e => {
    const div = document.createElement("div");
    div.textContent = `${e.name} (${e.id})`;
    div.onclick = () => { 
      document.getElementById("cosmetic-input").value = e.name; 
      sugDiv.innerHTML = ""; 
    };
    sugDiv.appendChild(div);
  });
}

async function searchCosmetic(input) {
    const entryMeta = index.find(e => e.id.toLowerCase() === input.toLowerCase() || e.name.toLowerCase() === input.toLowerCase());
    
    if (!entryMeta) {
        return { data: null, allData: null, entryMeta: null };
    }
    
    try {
        const cosmeticData = await loadGzJson(`${DATA_BASE_PATH}/cosmetics/${entryMeta.path}`);
        if (!cosmeticData || !Array.isArray(cosmeticData) || cosmeticData.length === 0) {
            return { data: null, allData: null, entryMeta };
        }
        
        return { data: cosmeticData[0], allData: cosmeticData, entryMeta };
    } catch (error) {
        console.warn(`Failed to load cosmetic data for ${entryMeta.id}:`, error);
        return { data: null, allData: null, entryMeta };
    }
}


function extractSetName(tags, cosmeticSets) {
    for (const tag of tags) {
        if (tag.startsWith("Cosmetics.Set.")) {
            return cosmeticSets[tag] || "";
        }
    }
    return "";
}

function extractAdditionals(tags) {
    const additional = [];
    if (tags.includes("Cosmetics.UserFacingFlags.HasVariants") || 
        tags.includes("Cosmetics.UserFacingFlags.HasUpgradeQuests")) {
        additional.push("{{Selectable Styles}}");
    }
    if (tags.includes("Cosmetics.UserFacingFlags.Reactive")) {
        additional.push("{{Reactive}}");
    }
    if (tags.includes("Cosmetics.UserFacingFlags.Emoticon.Animated")) {
        additional.push("{{Animated}}");
    }
    return additional.length > 0 ? additional.join(" ") : "";
}

const SEASON_RELEASE_DATES = {
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

const SEASON_UPDATE_VERSIONS = {
    'C1S1': '1.8',
    'C1S2': '1.11',
    'C1S3': '3.0',
    'C1S4': '4.0',
    'C1S5': '5.0',
    'C1S6': '6.0',
    'C1S7': '7.0',
    'C1S8': '8.0',
    'C1S9': '9.0',
    'C1S10': '10.0',
    'C2S1': '11.0',
    'C2S2': '12.0',
    'C2S3': '13.0',
    'C2S4': '14.0',
    'C2S5': '15.0',
    'C2S6': '16.0',
    'C2S7': '17.0',
    'C2S8': '18.0',
    'C3S1': '19.0',
    'C3S2': '20.0',
    'C3S3': '21.0',
    'C3S4': '22.0',
    'C4S1': '23.0',
    'C4S2': '24.0',
    'C4S3': '25.0',
    'C4S4': '26.0',
    'C4SOG': '27.0',
    'C5S1': '28.0',
    'C5S2': '29.0',
    'C5S3': '30.0',
    'C5S4': '31.0',
    'C2R': '32.0',
    'C6S1': '33.0',
    'C6S2': '34.0',
    'C6MS1': '35.0',
    'C6S3': '36.0',
    'C6S4': '37.0',
};

function parseBattlePassSeason(seasonInput) {
    const match = seasonInput.toUpperCase().match(/^C(\d+)S(\d+)$/);
    if (match) {
        return { chapter: match[1], season: match[2] };
    }
    return null;
}

function getFormattedReleaseDate(date = new Date()) {
    const day = date.getDate();
    const suffix = day >= 11 && day <= 13 ? 'th' : 
                   day % 10 === 1 ? 'st' : 
                   day % 10 === 2 ? 'nd' : 
                   day % 10 === 3 ? 'rd' : 'th';
    
    const month = date.toLocaleString('en-US', { month: 'long' });
    return `${month} ${day}${suffix} ${date.getFullYear()}`;
}

function articleFor(word) {
    return word[0].toLowerCase().match(/[aeiou]/) ? "an" : "a";
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
            console.log(previewImage);
            if (previewImage !== mainIcon) {
                const dash = channelsWithDash.includes(channelName) ? " -" : "";
                const imageFilename = (channelName === "Style" ? 
                    `${name} (${formattedVariantName} - Featured) - ${cosmeticType} - Fortnite.png` : 
                    `${name} (${channelName}${dash} ${formattedVariantName} - Featured) - ${cosmeticType} - Fortnite.png`);
                featuredFiles.add(imageFilename);
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
                const imageFile = (previewImage === mainIcon ? 
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
            ["<gallery>", ...Array.from(featuredFiles).sort(), "</gallery>"].join("\n") : 
            null));

    return ["== Selectable Styles ==\n" + styleTable.join("\n"), featured, Object.fromEntries(variantChannels)];
}

async function generateCosmeticPage(data, allData, settings, entryMeta) {
    const props = data.Properties;
    const ID = data.Name;
    const name = props.ItemName?.LocalizedString || "Unknown";
    const description = props.ItemDescription?.SourceString || "";
    let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
                 props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
    
    let cosmeticType = props.ItemShortDescription?.SourceString;
    if (!cosmeticType) {
        cosmeticType = TYPE_MAP[data.Type] || "";
    }
    if (cosmeticType === "Shoes") {
        cosmeticType = "Kicks";
    }

    let mainIcon = "";
    let tags = [];
    let series = null;
    
    for (const entry of props.DataList || []) {
        if (typeof entry === 'object' && entry !== null) {
            if (entry.LargeIcon?.AssetPathName) {
                mainIcon = entry.LargeIcon.AssetPathName;
            } else if (!mainIcon && entry.Icon?.AssetPathName) {
                mainIcon = entry.Icon.AssetPathName;
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
    console.log(mainIcon);

    const setName = extractSetName(tags, cosmeticSets);
    const itemshop = tags.some(tag => tag.includes("ItemShop"));
    const hasVariants = tags.includes("Cosmetics.UserFacingFlags.HasVariants");
    const hasUnlockableVariants = tags.includes("Cosmetics.UserFacingFlags.HasUpgradeQuests");
    const isCrewProgressive = tags.includes("Cosmetics.CrewBling.Progressive");

    const out = [];
    
    if (settings.unreleasedTemplate && !settings.isFortniteCrew) {
        out.push("{{Unreleased|Cosmetic}}");
    }
    
    out.push("{{Infobox Cosmetics");
    out.push(`|name = ${name}`);
    
    if (are_there_shop_assets(entryMeta) || itemshop) {
        out.push("|image = <gallery>");
        out.push(`${name} - ${cosmeticType} - Fortnite.png|Icon`);
        out.push(`${name} (Featured) - ${cosmeticType} - Fortnite.png|Featured`);
        out.push("</gallery>");
    } else {
        if (cosmeticType === "Spray") {
            out.push("|image = <gallery>");
            out.push(`${name} - ${cosmeticType} - Fortnite.png|Icon`);
            out.push(`${name} (Decal) - ${cosmeticType} - Fortnite.png|Decal`);
            out.push("</gallery>");
        } else {
            out.push(`|image = ${name} - ${cosmeticType} - Fortnite.png`);
        }
    }
    
    out.push(`|type = ${cosmeticType}`);
    out.push(`|rarity = ${rarity}`);

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
        const freeFlag = settings.bpFree ? "|Free" : "";
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        unlocked = `${bonusFlag}Page ${settings.bpPage} <br> {{BattlePass|${settings.bpChapter}|${settings.bpSeasonNum}${freeFlag}}}`;
    } else if (settings.isItemShop && settings.shopUnlocked) {
        unlocked = settings.shopUnlocked;
    }
    out.push(`|unlocked = ${unlocked}`);

    // Cost section
    let cost = "";
    if (settings.isFortniteCrew || rarity === "Crew Series") {
        cost = "$11.99 <br /> ({{Fortnite Crew}})";
    } else if (settings.isBattlePass && settings.bpChapter && settings.bpSeasonNum) {
        if (settings.bpFree) {
            cost = "Free";
        } else {
            cost = `{{V-Bucks|1,000}} <br> ({{BattlePass|${settings.bpChapter}|${settings.bpSeasonNum}}})`;
        }
    } else if (settings.isItemShop && settings.shopCost) {
        cost = settings.shopCost;
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
        const date = new Date(settings.releaseDate);
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
        const seasonKey = `C${settings.bpChapter}S${settings.bpSeasonNum}`;
        const seasonReleaseDate = SEASON_RELEASE_DATES[seasonKey];
        if (seasonReleaseDate) {
            release = getFormattedReleaseDate(seasonReleaseDate);
        } else {
            release = getFormattedReleaseDate();
        }
    }
    out.push(`|release = ${release}`);
    
    if (settings.isItemShop && settings.includeAppearances) {
        out.push("|appearances = ");
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
    let article = `'''${name}''' is ${articleFor(rarity)} {{${rarity}}} [[${cosmeticType}]] in [[Fortnite]] `;
    if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
        article += `that can be obtained by becoming a member of the [[Fortnite Crew]] during ${settings.crewMonth} ${settings.crewYear}, as part of the [[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]].`;
    } else if (settings.isBattlePass && settings.bpPage && settings.bpChapter && settings.bpSeasonNum) {
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        article += `that can be obtained on ${bonusFlag}Page ${settings.bpPage} of the [[Chapter ${settings.bpChapter}: Season ${settings.bpSeasonNum}]] [[Battle Pass]].`;
    } else if (settings.isItemShop) {
        article += `that can be purchased from the [[Item Shop]].`;
    } else if (settings.unreleasedTemplate) {
        article += "that is currently unreleased.";
    } else {
        article += ".";
    }
    if (setName) {
        article += ` ${name} is part of the [[:Category:${setName} Set|${setName} Set]].`;
    }
    out.push(article + "\n");

    let styleSection = "";
    let featured = null;
    let variantChannels = {};
    if (hasVariants || hasUnlockableVariants) {
        [styleSection, featured, variantChannels] = generateStyleSection(
            allData.filter(entry => typeof entry === 'object' && entry !== null && "Type" in entry && !("DataList" in entry)),
            name,
            cosmeticType,
            mainIcon
        );
    }

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

    if (settings.bpFree) {
        out.push("[[Category:Free Cosmetics]]");
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
    const isReleased = elements.releasedSwitch.checked;
    
    // Get source selection
    const isItemShop = elements.sourceItemShop.checked;
    const isBattlePass = elements.sourceBattlePass.checked;
    const isFortniteCrew = elements.sourceFortniteCrew.checked;

    if (!cosmeticInput) {
        showStatus('Please enter a cosmetic ID or name', 'error');
        return;
    }

    // Source selection validation for released cosmetics only
    if (isReleased) {
        if (!isItemShop && !isBattlePass && !isFortniteCrew) {
            showStatus('Please select a cosmetic source (Item Shop, Battle Pass, or Fortnite Crew)', 'error');
            return;
        }
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

    try {
        showStatus('Searching for cosmetic...', 'loading');
        
        const result = await searchCosmetic(cosmeticInput);
        const { data, allData, entryMeta } = result;

        if (!data) {
            showStatus('Cosmetic not found', 'error');
            return;
        }

        showStatus('Generating page...', 'loading');

        // Build settings object for the new interface
        const settings = {
            updateVersion: elements.updateVersion.value.trim(),
            unreleasedTemplate: !isReleased, // Automatically set based on released state
            releaseDate: isReleased ? elements.releaseDate.value : "",
            itemShopHistory: isReleased ? elements.itemShopHistory.checked : false,
            shopHistoryPart: isReleased ? elements.shopHistoryPart.value : "",
            
            // Source settings
            isItemShop,
            isBattlePass,
            isFortniteCrew,
            
            // Item Shop specific
            shopUnlocked: elements.shopUnlocked.value,
            shopCost: elements.shopCost.value,
            includeAppearances: elements.includeAppearances.checked,
            
            // Battle Pass specific
            bpSeason: elements.bpSeason.value,
            bpPage: elements.bpPage.value,
            bpBonus: elements.bpBonus.checked,
            bpFree: elements.bpFree.checked,
            
            // Fortnite Crew specific
            crewMonth: elements.crewMonth.value,
            crewYear: elements.crewYear.value
        };

        // Add parsed battle pass data if applicable
        if (isBattlePass && settings.bpSeason) {
            const seasonData = parseBattlePassSeason(settings.bpSeason.trim());
            if (seasonData) {
                settings.bpChapter = seasonData.chapter;
                settings.bpSeasonNum = seasonData.season;
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

async function initializeApp() {
    elements = {
        // Basic elements
        cosmeticInput: document.getElementById('cosmetic-input'),
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
        
        // Item Shop settings
        itemShopSettings: document.getElementById('item-shop-settings'),
        shopUnlocked: document.getElementById('shop-unlocked'),
        shopCost: document.getElementById('shop-cost'),
        includeAppearances: document.getElementById('include-appearances'),
        
        // Battle Pass settings
        battlePassSettings: document.getElementById('battle-pass-settings'),
        bpSeason: document.getElementById('bp-season'),
        bpPage: document.getElementById('bp-page'),
        bpBonus: document.getElementById('bp-bonus'),
        bpFree: document.getElementById('bp-free'),
        
        // Fortnite Crew settings
        fortniteCrewSettings: document.getElementById('fortnite-crew-settings'),
        crewMonth: document.getElementById('crew-month'),
        crewYear: document.getElementById('crew-year')
    };

    // Setup source selection logic
    function handleSourceSelection() {
        const itemShopChecked = elements.sourceItemShop.checked;
        const battlePassChecked = elements.sourceBattlePass.checked;
        const fortniteCrewChecked = elements.sourceFortniteCrew.checked;
        
        // Show/hide settings based on selection
        elements.itemShopSettings.classList.toggle('hidden', !itemShopChecked);
        elements.battlePassSettings.classList.toggle('hidden', !battlePassChecked);
        elements.fortniteCrewSettings.classList.toggle('hidden', !fortniteCrewChecked);
        
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
        } else if (battlePassChecked) {
            elements.sourceItemShop.disabled = true;
            elements.sourceFortniteCrew.disabled = true;
        } else if (itemShopChecked) {
            elements.sourceBattlePass.disabled = true;
            elements.sourceFortniteCrew.disabled = true;
        } else {
            // Re-enable all if none selected
            elements.sourceItemShop.disabled = false;
            elements.sourceBattlePass.disabled = false;
            elements.sourceFortniteCrew.disabled = false;
        }
    }

    // Auto-fill update version for Battle Pass based on season
    function autoFillBattlePassVersion() {
        const seasonInput = elements.bpSeason.value.trim().toUpperCase();
        
        if (seasonInput && elements.sourceBattlePass.checked) {
            const updateVersion = SEASON_UPDATE_VERSIONS[seasonInput];
            if (updateVersion) {
                elements.updateVersion.value = updateVersion;
            }
        }
    }

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
        
        // Update label
        elements.releasedLabel.textContent = isReleased ? 'Yes' : 'No';
        
        if (isReleased) {
            // Show released fields only if not Battle Pass or Fortnite Crew
            if (!battlePassChecked && !fortniteCrewChecked) {
                releasedFields.forEach(field => {
                    field.style.display = 'flex';
                });
            }
        } else {
            // Hide released fields (only for Item Shop)
            if (!battlePassChecked && !fortniteCrewChecked) {
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

    // Battle Pass season auto-fill event listener
    elements.bpSeason.addEventListener('input', autoFillBattlePassVersion);

    // Item Shop History part visibility
    elements.itemShopHistory.addEventListener('change', () => {
        elements.shopHistoryPart.style.display = elements.itemShopHistory.checked ? 'inline-block' : 'none';
    });

    // Basic event listeners
    elements.generateBtn.addEventListener('click', generatePage);
    elements.copyBtn.addEventListener('click', copyToClipboard);
    elements.clearBtn.addEventListener('click', clearOutput);

    elements.cosmeticInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generatePage();
    });

    elements.cosmeticInput.addEventListener('input', updateSuggestions);

    // Auto-detect cosmetic source with debouncing
    let autoDetectTimeout;
    elements.cosmeticInput.addEventListener('input', (e) => {
        // Reset auto-detection flag when user manually types
        if (isCrewAutoDetected) {
            isCrewAutoDetected = false;
        }
        
        clearTimeout(autoDetectTimeout);
        autoDetectTimeout = setTimeout(() => {
            autoDetectCosmeticSource(e.target.value);
        }, 1000); // Wait 1 second after user stops typing
    });

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