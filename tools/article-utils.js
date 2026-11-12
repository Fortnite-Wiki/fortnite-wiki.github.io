import { characterBundlePattern, forceTitleCase, abbreviate, getFormattedReleaseDate, getItemShopHistoryDate, ensureVbucksTemplate, normalizeVbucksInfoboxBreaks } from './utils.js';
import { SEASON_RELEASE_DATES, OG_SEASON_RELEASE_DATES, FESTIVAL_SEASON_RELEASE_DATES, LEGO_SEASON_RELEASE_DATES, LEGO_SEASON_NAMES } from '../../../data/datesAndVersions.js';

export function formatContainedCosmeticLink(entry, mainCosmeticName = '') {
    const rawName = getContainedCosmeticName(entry);
    if (!rawName) return '';

    const cosmeticType = getContainedCosmeticType(entry);
    if (mainCosmeticName && rawName.toLowerCase() === mainCosmeticName.toLowerCase() && cosmeticType) {
        return `[[${rawName} (${cosmeticType})|${rawName}]]`;
    }

    return `[[${rawName}]]`;
}

function getContainedCosmeticName(entry) {
    if (!entry) return '';
    const rawName = typeof entry.name === 'string' ? entry.name.trim() : entry.cosmeticName?.value?.trim() || '';
    const shouldForceTitleCase = entry.forceTitleCase === true || entry.forceTitleCase?.checked;
    return shouldForceTitleCase ? forceTitleCase(rawName) : rawName;
}

function getContainedCosmeticCost(entry) {
    if (!entry) return '';
    if (typeof entry.cost === 'string') return entry.cost.trim();
    return entry.cosmeticCost?.value?.trim() || '';
}

function getContainedCosmeticType(entry) {
    if (!entry) return '';
    if (typeof entry.cosmeticType === 'string') return entry.cosmeticType.trim();
    return entry.cosmeticType?.value?.trim() || '';
}

function hasContainedCosmeticEntries(containedCosmeticEntries) {
    return containedCosmeticEntries.some(entry => getContainedCosmeticName(entry));
}

function getBattlePassSeasonKey(settings) {
    return settings.bpSeasonKey || (settings.bpChapter && settings.bpSeasonNum
        ? `C${settings.bpChapter}${settings.isMiniSeason ? 'M' : ''}S${settings.bpSeasonNum}`
        : '');
}

function getBattlePassTemplate(settings, free = false) {
    const seasonKey = getBattlePassSeasonKey(settings);
    const freeFlag = free ? '|Free' : '';
    if (seasonKey === 'TH' || seasonKey === 'C2R') {
        return `{{BattlePass${seasonKey}${freeFlag}}}`;
    }
    const miniSeasonFlag = settings.isMiniSeason ? '/MiniSeason' : '';
    return `{{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}${freeFlag}}}`;
}

function getOGPassTemplate(settings, free = false) {
    return `{{OGPass|${settings.ogSeason}${free ? '|Free' : ''}}}`;
}

function getMusicPassTemplate(settings, free = false) {
    const template = settings.musicSeason.toUpperCase() === 'TD' ? 'MusicMiniPass' : 'MusicPass';
    return `{{${template}|${settings.musicSeason}${free ? '|Free' : ''}}}`;
}

function getLEGOPassTemplate(settings, free = false) {
    return `{{LEGOPass|${settings.legoSeason}|${free ? 'Free' : ''}|${abbreviate(settings.legoSeason)}}}`;
}

function getPassPurchaseTemplate(settings) {
    if (settings.isBattlePass && settings.bpPassPurchase && getBattlePassSeasonKey(settings)) return getBattlePassTemplate(settings);
    if (settings.isOGPass && settings.ogPassPurchase && settings.ogSeason) return getOGPassTemplate(settings);
    if (settings.isMusicPass && settings.musicPassPurchase && settings.musicSeason) return getMusicPassTemplate(settings);
    if (settings.isLEGOPass && settings.legoPassPurchase && settings.legoSeason) return getLEGOPassTemplate(settings);
    return '';
}

function getBattlePassSeasonLink(settings) {
    const seasonKey = getBattlePassSeasonKey(settings);
    if (seasonKey === 'TH') return '[[Treasure Hunters]]';
    if (seasonKey === 'C2R') return '[[Chapter 2 Remix]]';
    const miniSeasonFlag = settings.isMiniSeason ? 'Mini ' : '';
    return `[[Chapter ${settings.bpChapter}: ${miniSeasonFlag}Season ${settings.bpSeasonNum}]]`;
}

export function generateUnlockedParameter(settings, bundleEntries = [], containedCosmeticEntries = []) {
    let unlocked = '';
    const passPurchaseTemplate = getPassPurchaseTemplate(settings);

    if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
        unlocked = `[[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]]`;

    } else if (passPurchaseTemplate) {
        unlocked = passPurchaseTemplate;
    
    } else if (settings.isBattlePass && settings.bpPage && getBattlePassSeasonKey(settings)) {
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        const battlePassTemplate = getBattlePassTemplate(settings, settings.passFreeBP);
        if (settings.battlePassMode === 'non-linear' && settings.bpNonLinearSetName) {
            const rawName = settings.bpNonLinearSetName.trim();
            const possessive = (rawName.slice(-1).toLowerCase() === 's') ? `[[${rawName}]]'` : `[[${rawName}]]'s`;
            unlocked = `Page ${settings.bpPage} <br> ${possessive} ${bonusFlag}Set <br> ${battlePassTemplate}`;
        } else {
            unlocked = `${bonusFlag}Page ${settings.bpPage} <br> ${battlePassTemplate}`;
        }
    
    } else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
        unlocked = `Page ${settings.ogPage} <br> ${getOGPassTemplate(settings, settings.passFreeOG)}`;
    
    } else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
        unlocked = `Page ${settings.musicPage} <br> ${getMusicPassTemplate(settings, settings.passFreeMusic)}`;
    
    } else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason) {
        unlocked = `Page ${settings.legoPage} <br> ${getLEGOPassTemplate(settings, settings.passFreeLEGO)}`;
    
    } else if (settings.isQuestReward) {
        unlocked = `[[${settings.questName}]]`;
    
    } else if (settings.isRocketPass) {
        const freeFlag = settings.passFreeRocket ? "|Free" : "";
        unlocked = `Level ${settings.rocketPassLevel} <br> {{RocketPass|${settings.rocketPassSeason}${freeFlag}}}`;

    } else if (settings.isItemShop && !settings.isUnreleased) {
        if (settings.shopCost || bundleEntries.length == 0 || hasContainedCosmeticEntries(containedCosmeticEntries)) {
            unlocked = "[[Item Shop]]";
        }
        if (bundleEntries.length > 0) {
            const bundleNames = bundleEntries
                .map(be => {
                    if (!be.bundleName || !be.bundleName.value) return null;
                    const rawName = be.bundleName.value.trim();
                    const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                    const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                    return addItemShopBundleTag ? `[[${name} (Item Shop Bundle)|${name}]]` : `[[${name}]]`;
                })
                .filter(bn => bn !== null);
            if (bundleNames.length > 0) {
                unlocked = unlocked ? unlocked + " <br> " + bundleNames.join(" <br> ") : bundleNames.join(" <br> ");
            }
        }
    }

    return unlocked;
}

export function generateCostParameter(settings, bundleEntries = [], isFestivalCosmetic = false, name = '', rarity = '', cosmeticType = '', instrumentType = '', containedCosmeticEntries = []) {
    let cost = ''

    if ((settings.isBattlePass && settings.passFreeBP) || (settings.isOGPass && settings.passFreeOG) || (settings.isMusicPass && settings.passFreeMusic) || (settings.isLEGOPass && settings.passFreeLEGO) || (settings.isRocketPass && settings.passFreeRocket)) {
        cost = "Free";
    
    } else if (settings.isFortniteCrew || rarity === "Crew Series") {
        cost = "$11.99 <br> ({{Fortnite Crew}})";
    
    } else if (settings.isBattlePass && getBattlePassSeasonKey(settings)) {
        cost = `{{V-Bucks|800}} <br> (${getBattlePassTemplate(settings)})`;
    
    } else if (settings.isOGPass && settings.ogSeason) {
        cost = `{{V-Bucks|800}} <br> (${getOGPassTemplate(settings)})`;
    
    } else if (settings.isMusicPass && settings.musicSeason) {
        cost = `{{V-Bucks|1,200}} <br> (${getMusicPassTemplate(settings)})`;
    
    } else if (settings.isLEGOPass && settings.legoSeason) {
        const vbucksAmount = LEGO_SEASON_NAMES["1400"].includes(settings.legoSeason) ? "1,400" : "1,200";
        cost = `{{V-Bucks|${vbucksAmount}}} <br> (${getLEGOPassTemplate(settings)})`;
    
    } else if (settings.isItemShop && settings.shopCost && !settings.isUnreleased) {
        if (isFestivalCosmetic && cosmeticType != "Aura" && instrumentType != cosmeticType
            && (cosmeticType == "Back Bling" || cosmeticType == "Pickaxe")
        ) {
            cost = ensureVbucksTemplate(settings.shopCost) + ` <small>([[${name} (${instrumentType})|${name}]])</small>`;
        } else {
            cost = ensureVbucksTemplate(settings.shopCost);
        }
    
    } else if (settings.isQuestReward && settings.questCost) {
        cost = settings.questCost;
    
    } else if (settings.isRocketPass) {
        cost = `{{RLCredits|1,000}} <br> ({{RocketPass|${settings.rocketPassSeason}}})`;
    }


    if (settings.isItemShop && !settings.isUnreleased && containedCosmeticEntries.length > 0) {
        const containedCosmeticCosts = containedCosmeticEntries
            .map(entry => {
                const cosmeticCost = getContainedCosmeticCost(entry);
                const cosmeticLink = formatContainedCosmeticLink(entry, name);
                if (cosmeticCost && cosmeticLink) {
                    return `${ensureVbucksTemplate(cosmeticCost)} <small>(${cosmeticLink})</small>`;
                }
                return null;
            })
            .filter(c => c !== null);
        if (containedCosmeticCosts.length > 0) {
            cost = cost ? cost + " <br> " + containedCosmeticCosts.join(" <br> ") : containedCosmeticCosts.join(" <br> ");
        }
    }

    if (settings.isItemShop && !settings.isUnreleased && bundleEntries.length > 0) {
        const bundleCosts = bundleEntries
            .map(be => {
                if (be.bundleName.value && be.bundleCost.value) {
                    const rawName = be.bundleName.value.trim();
                    const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                    const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                    return `${ensureVbucksTemplate(be.bundleCost.value.trim())} <small>([[${addItemShopBundleTag ? `${name} (Item Shop Bundle)|${name}` : name}]])</small>`;
                }
                return null;
            })
            .filter(bc => bc !== null);
        if (bundleCosts.length > 0) {
            cost = cost ? cost + " <br> " + bundleCosts.join(" <br> ") : bundleCosts.join(" <br> ");
        }
    }

    if (settings.isBattlePass || settings.isOGPass || settings.isMusicPass || settings.isLEGOPass) return cost;
    return normalizeVbucksInfoboxBreaks(cost);
}

export function generateReleaseParameter(settings) {
	if (settings.releaseDate) {
		if (settings.itemShopHistory) {
			return getItemShopHistoryDate(settings.releaseDate, settings);
		} else {
			return getFormattedReleaseDate(settings.releaseDate);
		}
	} else if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
		return `[[Item Shop History/${settings.crewMonth} 1st ${settings.crewYear}|${settings.crewMonth} 1st ${settings.crewYear}]]`;
	} else if (settings.isBattlePass && getBattlePassSeasonKey(settings)) {
		const seasonKey = getBattlePassSeasonKey(settings);
		const seasonReleaseDate = SEASON_RELEASE_DATES[seasonKey];
		if (seasonReleaseDate) {
			return getFormattedReleaseDate(seasonReleaseDate);
		} else {
			return getFormattedReleaseDate();
		}
	} else if (settings.isOGPass && settings.ogSeason) {
		const ogReleaseDate = OG_SEASON_RELEASE_DATES[settings.ogSeason];
		if (ogReleaseDate) {
			return getFormattedReleaseDate(ogReleaseDate);
		} else {
			return getFormattedReleaseDate();
		}
	}
	else if (settings.isMusicPass && settings.musicSeason) {
		const musicReleaseDate = FESTIVAL_SEASON_RELEASE_DATES[settings.musicSeason];
		if (musicReleaseDate) {
			return getFormattedReleaseDate(musicReleaseDate);
		}
		else {
			return getFormattedReleaseDate();
		}
	}
	else if (settings.isLEGOPass && settings.legoSeason) {
		const legoReleaseDate = LEGO_SEASON_RELEASE_DATES[settings.legoSeason];
		if (legoReleaseDate) {
			return getFormattedReleaseDate(legoReleaseDate);
		}
		else {
			return getFormattedReleaseDate();
		}
	}

    return '';
}

export function generateArticleIntro(settings, bundleEntries = [], name = '', cosmeticType = '', isFestivalCosmetic = false, instrumentType = '', usePlural = false, containedCosmeticEntries = []) {
    let article = '';

    const obtainedOnPageCompletion =
        (settings.isBattlePass && settings.bpPageCompletion) ||
        (settings.isOGPass && settings.ogPageCompletion) ||
        (settings.isMusicPass && settings.musicPageCompletion) ||
        (settings.isLEGOPass && settings.legoPageCompletion);
    
    const pageCompletionFlag = obtainedOnPageCompletion ? " by purchasing all cosmetics" : "";

    const passPurchaseTemplate = getPassPurchaseTemplate(settings);

    if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
        article += ` that can be obtained by becoming a member of the [[Fortnite Crew]] during ${settings.crewMonth} ${settings.crewYear}, as part of the [[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]].`;
    
    } else if (passPurchaseTemplate) {
        article += ` that can be obtained by purchasing the ${passPurchaseTemplate}.`;

    } else if (settings.isBattlePass && settings.bpPage && getBattlePassSeasonKey(settings)) {
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        const seasonLink = getBattlePassSeasonLink(settings);

        if (settings.battlePassMode === 'non-linear' && settings.bpNonLinearSetName) {
            const rawName = settings.bpNonLinearSetName.trim();
            const possessive = (rawName.slice(-1).toLowerCase() === 's') ? `[[${rawName}]]'` : `[[${rawName}]]'s`;
            article += ` that can be obtained${pageCompletionFlag} on Page ${settings.bpPage} of ${possessive} ${bonusFlag}Set in the ${seasonLink} [[Battle Pass]]`;
            if (settings.bpNonLinearLevel) {
                article += `, which can only be unlocked after reaching Level ${settings.bpNonLinearLevel}`;
            }
            article += ".";
        } else {
            article += ` that can be obtained${pageCompletionFlag} on ${bonusFlag}Page ${settings.bpPage} of the ${seasonLink} [[Battle Pass]].`;
        }
    
    } else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.ogPage} of the [[OG Pass#Season ${settings.ogSeason}|Season ${settings.ogSeason} OG Pass]].`;
    
    } else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
        const pass = settings.musicSeason.toUpperCase() === 'TD'
            ? getMusicPassTemplate(settings, settings.passFreeMusic)
            : `[[Music Pass#Season ${settings.musicSeason}|Season ${settings.musicSeason} Music Pass]]`;
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.musicPage} of the ${pass}.`;
    
    } else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason) {
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.legoPage} of the [[LEGO Fortnite:LEGO® Pass#${settings.legoSeason}|${settings.legoSeason} LEGO® Pass]].`;
    
    } else if (settings.isRocketPass && settings.rocketPassLevel && settings.rocketPassSeason) {
        article += ` that can be unlocked by reaching Level ${settings.rocketPassLevel} of the [[fandom:rocketleague:Season ${settings.rocketPassSeason}#Rocket_Pass|Season ${settings.rocketPassSeason} Rocket Pass]].`;
    
    } else if (settings.isUnreleased) {
        article += ` that ${usePlural ? 'are' : 'is'} currently unreleased.`;

    } else if (settings.isItemShop) {
        const canBePurchasedDirectly = settings.shopCost && settings.shopCost.trim() !== "";
        const purchaseOptions = [];

        let bundledWithFlag = "";
        if (isFestivalCosmetic && cosmeticType != "Aura" && instrumentType != cosmeticType
            && (cosmeticType == "Back Bling" || cosmeticType == "Pickaxe")
        ) {
            bundledWithFlag = ` with [[${name} (${instrumentType})|${name}]]`;
        }

        if (canBePurchasedDirectly) {
            purchaseOptions.push(`in the [[Item Shop]]${bundledWithFlag} for ${ensureVbucksTemplate(settings.shopCost)}`);
        }

        containedCosmeticEntries
            .filter(entry => getContainedCosmeticName(entry) && getContainedCosmeticCost(entry))
            .forEach((entry) => {
                const itemShopFlag = purchaseOptions.length === 0 ? "in the [[Item Shop]] " : "";
                purchaseOptions.push(`${itemShopFlag}with ${formatContainedCosmeticLink(entry, name)} for ${ensureVbucksTemplate(getContainedCosmeticCost(entry))}`);
            });

        if (bundleEntries.length > 0) {
            bundleEntries
                .forEach(be => {
                    if (be.bundleName.value && be.bundleCost.value) {
                        const rawName = be.bundleName.value.trim();
                        const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                        const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                        const theFlag = be.bundleID.value.includes('Architect_') || rawName.toLowerCase().startsWith("the ") || addItemShopBundleTag ? "" : "the ";
                        const itemShopFlag = purchaseOptions.length === 0 ? "in the [[Item Shop]] " : "";
                        purchaseOptions.push(`${itemShopFlag}with ${theFlag}[[${addItemShopBundleTag ? `${name} (Item Shop Bundle)|${name}` : name}]] for ${ensureVbucksTemplate(be.bundleCost.value.trim())}`);
                    }
                });
        }

        const purchaseText = purchaseOptions.length <= 2
            ? purchaseOptions.join(" or ")
            : `${purchaseOptions.slice(0, -1).join(", ")}, or ${purchaseOptions[purchaseOptions.length - 1]}`;

        if (purchaseText) {
            article += ` that can be purchased ${purchaseText}.`;
        } else {
            article += ".";
        }
    
    } else if (settings.isQuestReward && settings.questName) {
        article += ` that can be obtained as a reward from [[${settings.questName}]].`;
    
    } else {
        article += ".";
    }

    return article;
}
