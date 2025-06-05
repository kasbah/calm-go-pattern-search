import json
from typing import List


def load_json_file(filename: str) -> dict:
    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)


def load_names(filename: str) -> List[str]:
    with open(filename, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def get_languages_from_simplenames(simplenames: List[dict]) -> List[dict]:
    languages = []
    for simplename in simplenames:
        for lang_info in simplename.get("languages", []):
            languages.append({
                "language": lang_info["language"],
                "preferred": lang_info.get("preferred", False),
            })
    return sorted(languages, key=lambda x: (x["language"], not x["preferred"]))


PLAYERDB_FILE = "playerdb-2025-05-10.json"
ALIASES_FILE = "name_aliases.json"
FOREIGN_NAMES_FILE = "foreign_names.txt"
NAMES_FILE = "names.txt"
UNKNOWN_NAMES_FILE = "unknown_names.txt"
OUTPUT_FILE = "player_names.json"


def combine_aliases():
    # Load all input files
    playerdb = load_json_file(PLAYERDB_FILE)
    name_aliases = load_json_file(ALIASES_FILE)
    foreign_names = load_names(FOREIGN_NAMES_FILE)
    names_txt = load_names(NAMES_FILE)
    unknown_names = load_names(UNKNOWN_NAMES_FILE)

    result = {}
    generated_id_counter = -1

    for name, aliases in name_aliases.items():
        key_name = None
        player_id = None
        for player in playerdb:
            names = player.get("names", [])
            name_entry = names[0] if len(names) > 0 else None
            if name_entry is not None:
                simplenames = name_entry.get("simplenames", [])
                for simplename in simplenames:
                    simplename = simplename.get("name")
                    if simplename == name or simplename in aliases:
                        key_name = player["key_name"]
                        player_id = player.get("id")
                        break
                if key_name is not None:
                    result[key_name] = {
                        "id": player_id,
                        "aliases": []
                    }
                    for simplename in simplenames:
                        alias_name = simplename.get("name")
                        alias_languages = get_languages_from_simplenames([simplename])
                        result[key_name]["aliases"].append({
                            "name": alias_name,
                            "languages": alias_languages,
                        })
                    break

        if key_name is None:
            result[name] = {
                "id": generated_id_counter,
                "aliases": [{"name": alias_name, "languages": []} for alias_name in aliases]
            }
            generated_id_counter -= 1
        else:
            for alias_name in aliases:
                found = False
                for alias in result[key_name]["aliases"]:
                    if alias["name"] == alias_name:
                        found = True
                if not found:
                    result[key_name]["aliases"].append({"name": alias_name, "languages": []})

    for name in foreign_names + names_txt:
        for player in playerdb:
            names = player.get("names", [])
            name_entry = names[0] if len(names) > 0 else None
            if name_entry is not None:
                simplenames = name_entry.get("simplenames", [])
                found = False
                for simplename in simplenames:
                    if simplename and simplename.get("name") == name:
                        found = True
                        break
                key_name = player["key_name"]
                if found and key_name not in result:
                    result[key_name] = {
                        "id": player.get("id"),
                        "aliases": []
                    }
                    for simplename in name_entry.get("simplenames", []):
                        alias_name = simplename.get("name")
                        alias_languages = get_languages_from_simplenames([simplename])
                        result[key_name]["aliases"].append({
                            "name": alias_name,
                            "languages": alias_languages,
                        })

    # Add unknown names with negative IDs and empty aliases
    for name in unknown_names:
        if name not in result:
            result[name] = {
                "id": generated_id_counter,
                "aliases": []
            }
            generated_id_counter -= 1

    # Write the result to a new JSON file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    combine_aliases()
