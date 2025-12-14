import os
import json
import gzip
import shutil
import io
import time
import re

t0 = time.time()

CONFIG_FILE = "mt_config.json"

config = {}
if os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)

def get_exports_dir():
    if "fmodel_exports_dir" in config:
        return config["fmodel_exports_dir"]
    path = input("Enter your FModel Exports directory path: ").strip()
    with open(CONFIG_FILE, "w") as f:
        json.dump({"fmodel_exports_dir": path}, f)
    return path

BASE_DIR = os.path.join(get_exports_dir(), "FortniteGame")

BR_COSMETICS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\BRCosmetics\Content\Athena\Items\Cosmetics"
)

OLD_BR_COSMETICS_DIR = os.path.join(
    BASE_DIR,
    r"Content\Athena\Items\Cosmetics"
)

KICKS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\CosmeticShoes\Content\Assets\Items\Cosmetics"
)

FESTIVAL_COSMETICS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\FM\SparksCosmetics\Content"
)

RACING_COSMETICS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\VehicleCosmetics\Content\Mutable"
)

COMPANIONS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\CosmeticCompanions\Content\Assets\Items"
)

COSMETICS_DIRS = [
    BR_COSMETICS_DIR,
    OLD_BR_COSMETICS_DIR,
    KICKS_DIR,
    FESTIVAL_COSMETICS_DIR,
    RACING_COSMETICS_DIR,
    COMPANIONS_DIR
]

LOC_DIRECTORY = os.path.join(
    BASE_DIR,
    r"Content\Localization"
)

SPARKS_LOC_DIRECTORY = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\FM\SparksCosmetics\Content\Localization\SparksCosmetics"
)
RACING_LOC_DIRECTORY = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\VehicleCosmetics\Content\Localization\VehicleCosmetics"
)

FIGURE_COSMETICS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\Juno\FigureCosmetics\Content\Items"
)
DT_BEAN_MAP_FILE = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\FNE\Beanstalk\BeanstalkCosmetics\Content\Cosmetics\DataTables\DT_BeanCosmeticsMap.json"
)
NEW_BEANSTALK_DEF_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\FNE\Beanstalk\BeanstalkCosmetics\Content\Cosmetics\Def"
)

SETS_JSON_FILE = os.path.join(
    BASE_DIR,
    r"Content\Athena\Items\Cosmetics\Metadata\CosmeticSets.json"
)
DISPLAY_ASSETS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\OfferCatalog\Content\NewDisplayAssets"
)
BUNDLE_DISPLAY_ASSETS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\OfferCatalog\Content\DisplayAssets"
)

WEAPON_DEFINITIONS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\BRCosmetics\Content\Athena\Items\Weapons"
)

BANNER_ICONS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\BRCosmetics\Content\Athena\Items\BannerIcons"
)

COMPANION_VARIANT_TOKENS_DIR = os.path.join(
    BASE_DIR,
    r"Plugins\GameFeatures\CosmeticCompanions\Content\Assets\Items\CosmeticVariantTokens"
)

COMPANION_FILTER_SET_DIR = os.path.join(
    BASE_DIR,
    r"Plugins/GameFeatures/CosmeticCompanions/Content/Data/VariantFilterSet"
)

VALID_TYPES = [
    "AthenaCharacterItemDefinition",
    "AthenaBackpackItemDefinition",
    "AthenaPickaxeItemDefinition",
    "AthenaDanceItemDefinition",
    "AthenaGliderItemDefinition",
    "AthenaItemWrapDefinition",
    "AthenaLoadingScreenItemDefinition",
    "AthenaMusicPackItemDefinition",
    "AthenaSkyDiveContrailItemDefinition",
    "AthenaSprayItemDefinition",
    "AthenaEmojiItemDefinition",
    "AthenaPetCarrierItemDefinition",
    "AthenaPetItemDefinition",
    "AthenaToyItemDefinition",
    "CosmeticShoesItemDefinition",
    "SparksBassItemDefinition",
    "SparksDrumItemDefinition",
    "SparksGuitarItemDefinition",
    "SparksKeyboardItemDefinition",
    "SparksMicItemDefinition",
    "SparksAuraItemDefinition",
    "FortVehicleCosmeticsItemDefinition_Body",
    "FortVehicleCosmeticsItemDefinition_Skin",
    "FortVehicleCosmeticsItemDefinition_Wheel",
    "FortVehicleCosmeticsItemDefinition_DriftTrail",
    "FortVehicleCosmeticsItemDefinition_Booster",
    "CosmeticCompanionItemDefinition",
    "CosmeticCompanionReactFXItemDefinition",
    "FortVariantTokenType", # for companion emotes
]

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def is_valid_json(data):
    return data and isinstance(data, list) and data[0]

def normalize_path(path, base_remove):
    rel_path = os.path.relpath(path, base_remove).replace("\\", "/")
    return rel_path

def get_set_id(props):
    for item in props.get("DataList", []):
        for tag in item.get("Tags", []):
            if tag.startswith("Cosmetics.Set."):
                return tag.replace("Cosmetics.Set.", "")
    return None

def build_index(dirs):
    index = []

    def should_skip_subdir(subdir):
        return subdir.endswith(("Archive", "Tandem", "Localization", "CosmeticVariantTokens", "QuestAssets", "TestItems", "Abilities", "Templates", "Prototype"))

    def get_entry(data):
        return next((item for item in data if item.get("Type") in VALID_TYPES), None)

    def get_car_body_tag(props):
        restrictions = props.get("RestrictionDefinitions", [])
        if not restrictions:
            for item in props.get("DataList", []):
                for tag in item.get("Tags", []):
                    if tag.lower().startswith("vehiclecosmetics.body."):
                        return tag
        else:
            tag_dict = restrictions[0].get("RequiredTagQuery", {}).get("TagDictionary", [])
            if len(tag_dict) > 1:
                print(f"{entry.get('Name')} has two cars in its restriction tagDictionary???")
                return None
            return tag_dict[0].get("TagName") if tag_dict else None

    def get_weapon_definition(entry):
        if entry.get("Type") != "AthenaPickaxeItemDefinition":
            return ""
        weapon_definition = entry.get("Properties", {}) \
                                 .get("WeaponDefinition", {}) \
                                 .get("ObjectPath", "") \
                                 .split(".") \
                                 [0]
        return weapon_definition.replace(
            "/BRCosmetics/Athena/Items",
            "cosmetics"
        ) + ".json"

    def get_companion_emotes(data):
        found_emotes = []
        for entry in data:
            if entry.get("Type") == "FortCosmeticContextualAnimSceneEmoteVariant":
                emoteOptions = entry.get("Properties").get("ContextualAnimSceneEmoteOptions")
                for emote in emoteOptions:
                    if emote.get("ContextualAnimSceneEmote").get("AssetPathName") != "":
                        emoteName = emote.get("VariantName").get("LocalizedString")
                        variantTag = emote.get("CustomizationVariantTag").get("TagName")

                        found_emotes.append({
                            "emoteName": emoteName,
                            "variantTag": variantTag
                        })
            elif entry.get("Type") == "CosmeticCompanionItemDefinition":
                this_companion = entry.get("Name")

        if not this_companion:
            return []

        found_variant_emotes = []
        for file in os.listdir(COMPANION_VARIANT_TOKENS_DIR):
            if not file.endswith('.json'):
                continue
            
            path = os.path.join(COMPANION_VARIANT_TOKENS_DIR, file)
            data = load_json(path)
            if not is_valid_json(data):
                continue

            entry = {}
            for check_entry in data:
                if check_entry.get("Type") == "FortVariantTokenType":
                    entry = check_entry

            props = entry.get("Properties", {})
          
            related_companion = (
                props.get("cosmetic_item", {})
                .get("ObjectPath", "RAAAAAAAA")
                .split('/')[-1]
                .split('.')[0]
            )
            
            if related_companion == this_companion:
                variantTag = props.get("VariantNameTag").get("TagName")
                variantID = entry.get("Name")
                itemNameKey = props.get("ItemName").get("Key")
                
                found_variant_emotes.append({
                    "variantTag": variantTag,
                    "variantID": variantID,
                    "itemNameKey": itemNameKey
                })

        matched = []
        for emote in found_emotes:
            for variant in found_variant_emotes:
                if emote["variantTag"] == variant["variantTag"]:
                    matched.append({
                        "emoteName": emote["emoteName"],
                        "variantID": variant["variantID"],
                        "itemNameKey": variant["itemNameKey"]
                    })

        return matched

    def is_default_item(props):
        return any("Cosmetics.Source.DefaultItem" in item.get("Tags", []) for item in props.get("DataList", []))

    def adjust_path(path, directory):
        rel_path = normalize_path(path, directory)
        if directory == KICKS_DIR:
            return "Shoes/" + rel_path
        elif directory == FESTIVAL_COSMETICS_DIR:
            return "Festival/" + rel_path.replace("Cosmetics/", "")
        elif directory == RACING_COSMETICS_DIR:
            return "Racing/" + rel_path
        elif directory == COMPANIONS_DIR:
            return "Companions/" + rel_path
        return rel_path
    
    for directory in dirs:
        for subdir, _, files in os.walk(directory):
            if should_skip_subdir(subdir):
                continue
            for file in files:
                if not file.endswith('.json'):
                    continue
                
                path = os.path.join(subdir, file)
                data = load_json(path)
                if not is_valid_json(data):
                    continue

                entry = get_entry(data)
                if not entry:
                    continue
                
                cosmetic_id = entry.get("Name")
                props = entry.get("Properties", {})
                item_name = props.get("ItemName", {}).get("LocalizedString")

                if not cosmetic_id or not item_name or is_default_item(props):
                    continue

                weapon_definition_path = get_weapon_definition(entry)
                rel_path = adjust_path(path, directory)
                car_body_tag = get_car_body_tag(props)
                set_id = get_set_id(props)

                if rel_path.startswith("Festival") and weapon_definition_path != "":
                    weapon_definition_path = weapon_definition_path.replace("SparksCosmetics", "cosmetics/Festival")

                companion_emotes = []
                if entry.get("Type") == "CosmeticCompanionItemDefinition":
                    companion_emotes = get_companion_emotes(data)

                item_entry = {
                    "id": cosmetic_id,
                    "name": item_name,
                    "path": rel_path
                }

                if car_body_tag:
                    item_entry["carBodyTag"] = car_body_tag
                if set_id:
                    item_entry["setID"] = set_id
                if weapon_definition_path != "":
                    item_entry["weaponDefinition"] = weapon_definition_path

                if companion_emotes != []:
                    for companion_emote in companion_emotes:
                        companion_emote_index = {
                            "id": companion_emote["variantID"],
                            "name": companion_emote["emoteName"],
                            "itemNameKey": companion_emote["itemNameKey"],
                            "companion_id": cosmetic_id,
                            "companionEmote": True
                        }

                        index.append(companion_emote_index)
                
                index.append(item_entry)
                
    return index

def build_jido_map(fig_dir):
    mapping = {}
    for root, _, files in os.walk(fig_dir):
        for file in files:
            if not file.endswith(".json"):
                continue
            file_path = os.path.join(root, file)
            data = load_json(file_path)
            if not data or not isinstance(data, list):
                continue
            for entry in data:
                if entry.get("Type") == "JunoAthenaCharacterItemOverrideDefinition":
                    jido_id = entry.get("Name")
                    asset_path = entry.get("Properties", {}) \
                                      .get("BaseAthenaCharacterItemDefinition", {}) \
                                      .get("AssetPathName", "")
                    if asset_path:
                        cosmetic_id = asset_path.split("/")[-1].split(".")[0]
                        mapping[cosmetic_id] = jido_id
                elif entry.get("Type") == "JunoAthenaDanceItemOverrideDefinition":
                    jido_id = entry.get("Name")
                    asset_path = entry.get("Properties", {}) \
                                      .get("BaseAthenaDanceItemDefinition", {}) \
                                      .get("AssetPathName", "")
                    if asset_path:
                        cosmetic_id = asset_path.split("/")[-1].split(".")[0]
                        mapping[cosmetic_id] = jido_id
                    
    return mapping

def build_bean_map(bean_file, new_bean_directory):
    mapping = {}
    data = load_json(bean_file)
    if not data or not isinstance(data, list):
        return mapping
    table = data[0]
    rows = table.get("Rows", {})
    for cid, row in rows.items():
        asset_path = row.get("Definition", {}).get("AssetPathName", "")
        if asset_path:
            bean_id = asset_path.split("/")[-1].split(".")[0]
            mapping[cid] = bean_id

    for root, _, files in os.walk(new_bean_directory):
        for file in files:
            if not file.endswith(".json") or not file.startswith("BIDO"):
                continue
            file_path = os.path.join(root, file)
            data = load_json(file_path)
            if not data or not isinstance(data, list):
                continue
            for entry in data:
                if entry.get("Type") == "BeanAthenaCharacterItemDefinitionOverride":
                    props = entry.get("Properties", {})
                    cid_asset_path = props.get("BaseAthenaCharacterItemDefinition", {}).get("AssetPathName", "")
                    cid = cid_asset_path.split("/")[-1].split(".")[0]

                    bean_asset_path = props.get("BeanAthenaCharacterItemDefinitionOverride", {}).get("AssetPathName", "")
                    bean_id = bean_asset_path.split("/")[-1].split(".")[0]

                    if bean_id != "" and cid != "":
                        mapping[cid] = bean_id
    return mapping

def build_sets_map(sets_file):
    data = load_json(sets_file)
    if not data or not isinstance(data, list) or not data[0]:
        return {}
    rows = data[0].get("Rows", {})
    mapping = {}
    for set_id, row in rows.items():
        display_name = row.get("DisplayName", {}).get("LocalizedString")
        if display_name:
            mapping[set_id] = display_name
    return mapping

def build_localized_sets_map(sets_file):
    data = load_json(sets_file)
    if not data or not isinstance(data, list) or not data[0]:
        return {}
    rows = data[0].get("Rows", {})
    mapping = {}
    for set_id, row in rows.items():
        localization_key = row.get("DisplayName", {}).get("Key")
        if localization_key:
            mapping[set_id] = localization_key
    return mapping

def build_bundle_index(index):
    # Build a quick lookup of DAv2 display asset files
    dav2_files = {}
    for droot, _, dfiles in os.walk(DISPLAY_ASSETS_DIR):
        for dfile in dfiles:
            if not dfile.endswith('.json'):
                continue
            rel = os.path.relpath(os.path.join(droot, dfile), DISPLAY_ASSETS_DIR).replace("\\", "/")
            dav2_files[dfile.lower()] = rel

    seen_bundle_ids = set()
    bundle_re = re.compile(r"DA_(?:Character_([^/\n]+)|([^/\n]+)_Character|Feature(?:d)?_([^/\n]+?)_Bundle)", re.IGNORECASE)

    for root, _, files in os.walk(BUNDLE_DISPLAY_ASSETS_DIR):
        for file in files:
            if not file.endswith(".json"):
                continue
            file_path = os.path.join(root, file)
            data = load_json(file_path)
            if not data or not isinstance(data, list):
                continue
            for entry in data:
                if entry.get("Type") != "FortMtxOfferData":
                    continue

                props = entry.get("Properties", {}) or {}
                bundle_name = props.get("DisplayName", {}).get("LocalizedString") if props else None

                filename_no_ext = os.path.splitext(file)[0]
                m = bundle_re.search(filename_no_ext)
                if not m:
                    continue

                bundle_id = m.group(1) or m.group(2) or m.group(3)
                if not bundle_id or bundle_id in seen_bundle_ids:
                    continue
                seen_bundle_ids.add(bundle_id)

                rel_da_path = os.path.relpath(file_path, BUNDLE_DISPLAY_ASSETS_DIR).replace("\\", "/")
                da_path = f"DA/{rel_da_path}"

                # Try to find a matching DAv2 file in DISPLAY_ASSETS_DIR
                dav2_path = None
                candidates = [
                    f"DAv2_Bundle_Featured_{bundle_id}.json",
                    f"DAv2_Featured_Bundle_{bundle_id}.json",
                    f"DAv2_Bundle_{bundle_id}.json",
                    f"DAv2_Character_{bundle_id}.json",
                    f"DAv2_{bundle_id}_Character.json"
                ]
                for cand in candidates:
                    cand_lower = cand.lower()
                    if cand_lower in dav2_files.keys():
                        dav2_path = f"DAv2/{dav2_files[cand_lower]}"
                        break

                bundle_entry = {
                    "bundle_id": bundle_id,
                    "bundle_name": bundle_name,
                    "da_path": da_path,
                }
                if dav2_path:
                    bundle_entry["dav2_path"] = dav2_path

                index.append(bundle_entry)

    return index

def build_banner_index(index):
    for root, _, files in os.walk(BANNER_ICONS_DIR):
        for file in files:
            if not file.endswith(".json"):
                continue
            file_path = os.path.join(root, file)
            data = load_json(file_path)
            if not data or not isinstance(data, list):
                continue
            for entry in data:
                banner_id = entry.get("Name")
                if entry.get("Type") == "FortHomebaseBannerIconItemDefinition":
                    props = entry.get("Properties", {})

                    banner_icon = ""
                    for item in props.get("DataList", []):
                        if item.get("LargeIcon", {}) != {}:
                            banner_icon = item.get("LargeIcon").get("AssetPathName").split('/')[-1].split('.')[0]
                    if banner_icon == "":
                        for item in props.get("DataList", []):
                            if item.get("Icon", {}) != {}:
                                banner_icon = item.get("Icon").get("AssetPathName").split('/')[-1].split('.')[0]
                    set_id = get_set_id(props)

                    if set_id:
                        banner_entry = {
                            "banner_id": banner_id,
                            "banner_icon": banner_icon,
                            "setID": set_id
                        }

                        index.append(banner_entry)
    return index

def build_companion_style_index():
    output = []
    for file in os.listdir(COMPANION_VARIANT_TOKENS_DIR):
        if not file.endswith('.json'):
            continue
        
        path = os.path.join(COMPANION_VARIANT_TOKENS_DIR, file)
        data = load_json(path)
        if not is_valid_json(data):
            continue

        entry = {}
        for check_entry in data:
            if check_entry.get("Type") == "FortVariantTokenType":
                entry = check_entry

        props = entry.get("Properties", {})

        variantID = entry.get("Name")
        variantChannelTag = props.get("VariantChannelTag").get("TagName")
        variantNameTag = props.get("VariantNameTag").get("TagName")

        itemShortDescription = props.get("ItemShortDescription").get("LocalizedString")

        if itemShortDescription == "Style":
            output.append({
                "ID": variantID,
                "channelTag": variantChannelTag,
                "nameTag": variantNameTag
            })

    return output

index = build_index(COSMETICS_DIRS)
jido_map = build_jido_map(FIGURE_COSMETICS_DIR)
bean_map = build_bean_map(DT_BEAN_MAP_FILE, NEW_BEANSTALK_DEF_DIR)
sets_map = build_sets_map(SETS_JSON_FILE)
localized_sets_map = build_localized_sets_map(SETS_JSON_FILE)
companion_style_index = build_companion_style_index()

display_assets_files = {}
for root, _, files in os.walk(DISPLAY_ASSETS_DIR):
    for file in files:
        if file.endswith(".json"):
            rel_path = os.path.relpath(os.path.join(root, file), DISPLAY_ASSETS_DIR).replace("\\", "/")
            display_assets_files.setdefault(file, []).append(rel_path)

for entry in index:
    cid = entry["id"]
    if cid in jido_map:
        entry["jido"] = jido_map[cid]
    if cid in bean_map:
        entry["beanid"] = bean_map[cid]

    for key in (f"DAv2_{cid}.json", f"DAv2_{cid.replace('Shoes', 'Shoe')}.json", f"DAv2_{cid.replace('_Athena_Commando', '')}.json"):
        if key in display_assets_files:
            entry["dav2"] = f"DAv2/{display_assets_files[key][0]}"
            break

index = build_bundle_index(index)
index = build_banner_index(index)

index_json = json.dumps(index, indent=2, ensure_ascii=False, sort_keys=True)
compressed_index = gzip.compress(index_json.encode('utf-8'), mtime=0)
with open("index.json.gz", "wb") as f:
    f.write(compressed_index)

print(f"index.json.gz created with {len(index)} entries. "
          f"{len(jido_map)} have JIDO values, "
          f"{len(bean_map)} have BeanID values.")

with open("CosmeticSets.json", 'w', encoding='utf-8') as f:
    json.dump(sets_map, f, indent=2, ensure_ascii=False)

print(f"CosmeticSets.json created with {len(sets_map)} sets.")

with open("CosmeticSetLocalizations.json", 'w', encoding='utf-8') as f:
    json.dump(localized_sets_map, f, indent=2, ensure_ascii=False)

print(f"CosmeticSetLocalizations.json created with {len(localized_sets_map)} sets.")

with open("CompanionStyleVariantTokens.json", 'w', encoding='utf-8') as f:
    json.dump(companion_style_index, f, indent=2, ensure_ascii=False)

print(f"CompanionStyleVariantTokens.json created with {len(companion_style_index)} VTIDs.")

def copy_and_gzip(src_root, dest_root, label):
    count = 0
    for subdir, _, files in os.walk(src_root):
        if "Archive" in subdir or "Tandem" in subdir or "Datatables" in subdir or "TestItems" in subdir or "Abilities" in subdir or "Templates" in subdir or ("Localization" not in src_root and "Localization" in subdir) or "CosmeticVariantTokens" in subdir or "QuestAssets" in subdir or "Prototype" in subdir:
            continue
        rel = os.path.relpath(subdir, src_root)

        # Remove "Cosmetics" from the relative path if present
        rel = os.path.relpath(subdir, src_root)
        rel_parts = rel.split(os.sep)
        filtered_parts = [part for part in rel_parts if part != "Cosmetics"]
        rel = os.path.join(*filtered_parts) if filtered_parts else ""

        dest_dir = os.path.join(dest_root, rel)
        os.makedirs(dest_dir, exist_ok=True)
        
        for file in files:
            if not file.endswith(".json"):
                continue
            src_path = os.path.join(subdir, file)
            dest_path = os.path.join(dest_dir, file + ".gz")
            if not (config.get("ignore_same_gz", False) and os.path.exists(dest_path)):
                with open(src_path, "rb") as f_in:
                    raw = f_in.read()
                    compressed = gzip.compress(raw, mtime=0)
                    with open(dest_path, "wb") as f_out:
                        f_out.write(compressed)
            count += 1
    print(f"{count} JSON files compressed and saved as .gz in {label}")

# Move and compress SPARKS_LOC_DIRECTORY
if os.path.exists(SPARKS_LOC_DIRECTORY):
    target_path = os.path.join(os.path.join(os.path.dirname(__file__), "localization"), "SparksCosmetics")
    if os.path.exists(target_path):
        shutil.rmtree(target_path)
    shutil.copytree(SPARKS_LOC_DIRECTORY, target_path)

    count = 0
    for root, _, files in os.walk(target_path):
        for file in files:
            src_path = os.path.join(root, file)
            if not file.endswith('.gz'):
                dest_path = src_path + '.gz'
                with open(src_path, "rb") as f_in:
                    raw = f_in.read()
                    compressed = gzip.compress(raw, mtime=0)
                    with open(dest_path, "wb") as f_out:
                        f_out.write(compressed)
                        count += 1
                os.remove(src_path)
    
    print(f"Moved and compressed {count} Sparks localization JSON files from SPARKS_LOC_DIRECTORY")

# Move and compress RACING_LOC_DIRECTORY
if os.path.exists(RACING_LOC_DIRECTORY):
    target_path = os.path.join(os.path.join(os.path.dirname(__file__), "localization"), "VehicleCosmetics")
    if os.path.exists(target_path):
        shutil.rmtree(target_path)
    shutil.copytree(RACING_LOC_DIRECTORY, target_path)

    count = 0
    for root, _, files in os.walk(target_path):
        for file in files:
            src_path = os.path.join(root, file)
            if not file.endswith('.gz'):
                dest_path = src_path + '.gz'
                with open(src_path, "rb") as f_in:
                    raw = f_in.read()
                    compressed = gzip.compress(raw, mtime=0)
                    with open(dest_path, "wb") as f_out:
                        f_out.write(compressed)
                        count += 1
                os.remove(src_path)
    
    print(f"Moved and compressed {count} Racing localization JSON files from RACING_LOC_DIRECTORY")


# Move and compress Companion ColorSwatches/MaterialParameterSets

## these directories does contain a lot more else - so be careful!
COMPANION_COLORS_AND_MATERIALS_DIRS = [
    os.path.join(BASE_DIR, r"Plugins\GameFeatures\CosmeticCompanions\Content\Assets\Biped"),
    os.path.join(BASE_DIR, r"Plugins\GameFeatures\CosmeticCompanions\Content\Assets\Quadruped"),
    os.path.join(BASE_DIR, r"Plugins\GameFeatures\CosmeticCompanions\Content\Assets\Other")
]
def move_and_compress_companion_colors_and_materials(src_dirs):
    count = 0
    base_target = os.path.join(
        os.path.dirname(__file__),
        "cosmetics",
        "Companions"
    )

    for sub in ("ColorSwatches", "MaterialParameterSets"):
        target_path = os.path.join(base_target, sub)
        if os.path.exists(target_path):
            shutil.rmtree(target_path)
        os.makedirs(target_path, exist_ok=True)

    for src_root in src_dirs:
        if not os.path.exists(src_root):
            continue
        
        for root, dirs, files in os.walk(src_root):
            folder_name = os.path.basename(root)
            # treat "MPS" as MaterialParameterSets
            if folder_name == "MPS" or folder_name == "MaterialParameters":
                folder_name = "MaterialParameterSets"

            if folder_name not in ("ColorSwatches", "MaterialParameterSets"):
                continue
            
            rel_path = os.path.relpath(root, src_root)
            # get path *above* the ColorSwatches/MaterialParameterSets folder
            parent_rel = os.path.dirname(rel_path)
            target_path = os.path.join(base_target, folder_name, parent_rel)
            os.makedirs(target_path, exist_ok=True)

            for subroot, _, subfiles in os.walk(root):
                inner_rel = os.path.relpath(subroot, root)
                dest_subdir = os.path.join(target_path, inner_rel)
                os.makedirs(dest_subdir, exist_ok=True)

                for file in subfiles:
                    shutil.copy2(os.path.join(subroot, file), os.path.join(dest_subdir, file))

    for root, _, files in os.walk(base_target):
        for file in files:
            if not file.endswith('.json') or not (file.startswith('CS_') or file.startswith('MPS_')):
                continue

            src_path = os.path.join(root, file)
            dest_path = src_path + '.gz'
            with open(src_path, "rb") as f_in, open(dest_path, "wb") as f_out:
                f_out.write(gzip.compress(f_in.read(), mtime=0))
            os.remove(src_path)
            count += 1

    print(f"Moved and compressed {count} ColorSwatches/MaterialParameterSets for Companions")

move_and_compress_companion_colors_and_materials(COMPANION_COLORS_AND_MATERIALS_DIRS)

copy_and_gzip(BR_COSMETICS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics"), "cosmetics")
copy_and_gzip(OLD_BR_COSMETICS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics"), "cosmetics (old FortniteGame/Content/Athena/Items/Cosmetics folder)")
copy_and_gzip(KICKS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics", "Shoes"), "cosmetics/Shoes")
copy_and_gzip(FESTIVAL_COSMETICS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics", "Festival"), "cosmetics/Festival")
copy_and_gzip(RACING_COSMETICS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics", "Racing"), "cosmetics/Racing")
copy_and_gzip(COMPANIONS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics", "Companions"), "cosmetics/Companions")
copy_and_gzip(LOC_DIRECTORY, os.path.join(os.path.dirname(__file__), "localization"), "localization")
copy_and_gzip(DISPLAY_ASSETS_DIR, os.path.join(os.path.dirname(__file__), "DAv2"), "DAv2")
copy_and_gzip(BUNDLE_DISPLAY_ASSETS_DIR, os.path.join(os.path.dirname(__file__), "DA"), "DA (Bundle)")
copy_and_gzip(WEAPON_DEFINITIONS_DIR, os.path.join(os.path.dirname(__file__), "cosmetics/Weapons"), "cosmetics/Weapons")
copy_and_gzip(BANNER_ICONS_DIR, os.path.join(os.path.dirname(__file__), "banners"), "banners")
copy_and_gzip(COMPANION_FILTER_SET_DIR, os.path.join(os.path.dirname(__file__), "cosmetics", "Companions", "FilterSets"), "cosmetics/Companions/FilterSets")
print(f"Completed in {time.time() - t0:.2f}s")

input("\nPress Enter to exit...")
