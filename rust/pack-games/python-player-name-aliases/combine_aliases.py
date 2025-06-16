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
        key_name = player.get("key_name")
        player_id = player.get("id")
        if not key_name:
            continue
            
        # Collect all name variations for this player with language info
        all_player_names = {}  # name -> language info
        for name_entry in player.get("names", []):
            for simple_name in name_entry.get("simplenames", []):
                name = simple_name.get("name")
                if name:
                    languages = simple_name.get("languages", [])
                    all_player_names[name] = languages
        
        # Create lookup entries for each name variation
        for name in all_player_names:
            playerdb[name] = {
                "key": key_name,
                "id": player_id,
                "all_names": all_player_names
            }
    print(f"Pre-processed {len(playerdb)} name entries from playerdb")
    return playerdb


def check_playerdb(playerdb: dict, name: str) -> tuple[str | None, int | None, list]:
    playerdb_aliases_found = []
    playerdb_key = None
    player_id = None
    if name in playerdb:
        playerdb_info = playerdb[name]
        playerdb_key = playerdb_info["key"]
        player_id = playerdb_info["id"]
        # Add all playerdb aliases with their language info
        for alias_name, languages in playerdb_info["all_names"].items():
            playerdb_aliases_found.append({
                "name": alias_name,
                "languages": languages
            })
    else:
        for playerdb_name in playerdb:
            playerdb_info = playerdb[playerdb_name]
            for alias_name, languages in playerdb_info["all_names"].items():
                if name == alias_name:
                    playerdb_key = playerdb_info["key"]
                    player_id = playerdb_info["id"]
                    for alias_name, languages in playerdb_info["all_names"].items():
                        playerdb_aliases_found.append({
                            "name": alias_name,
                            "languages": languages
                        })
                    break
    return playerdb_key, player_id, playerdb_aliases_found



def main():
    print("Starting alias combination process...")
    
    playerdb = load_playerdb()
    custom_aliases = load_json_file(CUSTOM_ALIASES_FILE)
    all_names = load_text_file(ALL_NAMES_FILE)

    # Initialize result dictionary
    result = {}
    
    # Counter for auto-decrementing negative IDs
    next_negative_id = -1

    total_names = len(all_names)
    processed_count = 0
    
    for name in all_names:
        name = name.replace(",", "")
        processed_count += 1
        print(f"Processing {processed_count}/{total_names}: {name}")
        
        # 1. Check if it's already an alias or key in the result
        already_processed = False
        for key, data in result.items():
            if key == name or any(alias["name"] == name for alias in data["aliases"]):
                already_processed = True
                break
        
        if already_processed:
            continue
            
        # Collect all aliases for this name
        collected_aliases = []
        player_id = None
        
        # 2. Check if it's an alias or a key in custom_aliases
        custom_key = None
        custom_aliases_found = []
        for key, aliases in custom_aliases.items():
            if name == key or name in aliases:
                custom_key = key
                # Add all custom aliases with empty languages
                for alias_name in aliases:
                    custom_aliases_found.append({
                        "name": alias_name,
                        "languages": []
                    })
                break
        
        playerdb_key, player_id, playerdb_aliases_found = check_playerdb(playerdb, name)

        if not playerdb_aliases_found:
            for custom_alias in custom_aliases_found:
                playerdb_key, player_id, playerdb_aliases_found = check_playerdb(playerdb, custom_alias["name"])
                if playerdb_aliases_found:
                    break
        
        # Determine the primary key for this name group
        if playerdb_key:
            primary_key = playerdb_key
        elif custom_key:
            primary_key = custom_key
        else:
            primary_key = name
        
        # Assign negative ID if not found in playerdb
        if player_id is None:
            player_id = next_negative_id
            next_negative_id -= 1
        
        # Merge aliases from both sources
        # Use a dict to avoid duplicates while preserving language info
        alias_dict = {}
        
        # Add playerdb aliases first (they have language info)
        for alias in playerdb_aliases_found:
            alias_dict[alias["name"]] = alias
            
        # Add custom aliases (empty languages, but don't overwrite playerdb languages)
        for alias in custom_aliases_found:
            if alias["name"] not in alias_dict:
                alias_dict[alias["name"]] = alias
        
        # Add the current name if it's not already included and not the primary key
        if name != primary_key and name not in alias_dict:
            alias_dict[name] = {
                "name": name,
                "languages": []
            }
        
        # Convert to list
        collected_aliases = list(alias_dict.values())
        
        # Store in result with new structure
        result[primary_key] = {
            "id": player_id,
            "aliases": collected_aliases
        }
    
    # Save the result
    print(f"\nSaving result to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"Process completed! Generated {len(result)} alias groups.")
    print(f"Result saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
