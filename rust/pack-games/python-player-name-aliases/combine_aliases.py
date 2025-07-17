import json
from typing import List


def load_json_file(filename: str) -> dict:
    print(f"Loading {filename}...")
    with open(filename, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"Loaded {filename} successfully")
    return data


def load_text_file(filename: str) -> List[str]:
    print(f"Loading {filename}...")
    with open(filename, "r", encoding="utf-8") as f:
        names = [line.strip() for line in f if line.strip()]
    print(f"Loaded {len(names)} names from {filename}")
    return names


PLAYERDB_FILE = "playerdb-2025-05-10.json"
CUSTOM_ALIASES_FILE = "custom_aliases.json"
ALL_NAMES_FILE = "all_names.txt"
OUTPUT_FILE = "player_names.json"


def load_playerdb() -> dict:
    playerdb_json = load_json_file(PLAYERDB_FILE)
    # Pre-process playerdb into a more convenient format
    playerdb = {}
    for player in playerdb_json:
        player_id = player.get("id")
        if not player_id:
            continue

        # Collect all name variations for this player with language info
        all_player_names = {}  # name -> language info
        for name_entry in player.get("names", []):
            for simple_name in name_entry.get("simplenames", []):
                name = simple_name.get("name")
                if name:
                    languages = simple_name.get("languages", [])
                    all_player_names[name] = languages

        playerdb[player_id] = {
            "aliases": [
                {"name": key, "languages": all_player_names[key]}
                for key in all_player_names
            ],
        }

    print(f"Pre-processed {len(playerdb)} name entries from playerdb")
    return playerdb


def check_playerdb(playerdb: dict, name: str) -> int | None:
    # Check if the name matches any player's key_name
    for player_id, player in playerdb.items():
        if player.get("name") == name:
            return player_id
        # Check if the name matches any alias
        for alias in player["aliases"]:
            if name == alias["name"]:
                return player_id
    return None


def extend_playerdb(playerdb: dict) -> tuple[int, dict]:
    next_negative_id = -1
    custom_aliases = load_json_file(CUSTOM_ALIASES_FILE)
    for custom_alias_key in custom_aliases:
        player_id = check_playerdb(playerdb, custom_alias_key)
        if player_id:
            for custom_alias in custom_aliases[custom_alias_key] + [custom_alias_key]:
                found = False
                for playerdb_alias in playerdb[player_id]["aliases"]:
                    if custom_alias == playerdb_alias["name"]:
                        found = True
                        break
                if not found:
                    playerdb[player_id]["aliases"].append({
                        "name": custom_alias,
                        "languages": [],
                    })
        else:
            found = False
            found_player_id = None
            for custom_alias in custom_aliases[custom_alias_key]:
                found_player_id = check_playerdb(playerdb, custom_alias)
                if found_player_id:
                    found = True
                    break
            if found:
                for custom_alias in custom_aliases[custom_alias_key] + [
                    custom_alias_key
                ]:
                    found = False
                    for playerdb_alias in playerdb[found_player_id]["aliases"]:
                        if custom_alias == playerdb_alias["name"]:
                            found = True
                            break
                    if not found:
                        playerdb[found_player_id]["aliases"].append({
                            "name": custom_alias,
                            "languages": [],
                        })
            else:
                playerdb[next_negative_id] = {
                    "id": next_negative_id,
                    "name": custom_alias_key,
                    "aliases": [
                        {
                            "name": custom_alias_key,
                            "languages": [{"language": "en", "preferred": False}],
                        }
                    ],
                }
                for custom_alias in custom_aliases[custom_alias_key]:
                    playerdb[next_negative_id]["aliases"].append({
                        "name": custom_alias,
                        "languages": [],
                    })
                next_negative_id -= 1
    return next_negative_id, playerdb


def main():
    print("Starting alias combination process...")

    playerdb = load_playerdb()
    next_negative_id, playerdb = extend_playerdb(playerdb)

    all_names = load_text_file(ALL_NAMES_FILE)
    result = {}
    total_names = len(all_names)
    processed_count = 0

    for name in all_names:
        processed_count += 1
        print(f"Processing {processed_count}/{total_names}: {name}")

        player_id = check_playerdb(playerdb, name)

        # Only add this player if we haven't added them already
        if player_id:
            result[str(player_id)] = playerdb[player_id].copy()
        else:
            result[str(next_negative_id)] = {
                "aliases": [{"name": name, "languages": []}]
            }
            next_negative_id -= 1

    print(f"\nSaving result to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Process completed! Generated {len(result)} alias groups.")
    print(f"Result saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
