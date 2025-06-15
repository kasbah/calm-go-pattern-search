#!/usr/bin/env python3

import json
import sys
from typing import Dict, List, Tuple, Set
from googletrans import Translator


def load_known_aliases() -> Dict:
    """Load the player names database."""
    try:
        with open("player_names.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: player_names.json not found")
        sys.exit(1)
    except json.JSONDecodeError:
        print("Error: player_names.json is not valid JSON")
        sys.exit(1)


def load_custom_aliases() -> Dict[str, List[str]]:
    """Load the custom aliases database."""
    try:
        with open("custom_aliases.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: custom_aliases.json not found")
        return {}
    except json.JSONDecodeError:
        print("Warning: custom_aliases.json is not valid JSON")
        return {}


def save_custom_aliases(custom_aliases: Dict[str, List[str]]):
    """Save the custom aliases database."""
    with open("custom_aliases.json", "w", encoding="utf-8") as f:
        json.dump(custom_aliases, f, ensure_ascii=False, indent=2)


def load_rejected_alias_pairs() -> Set[Tuple[int, int]]:
    """Load the rejected alias pairs database."""
    try:
        with open("rejected_alias_pairs.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            return {tuple(pair) for pair in data}
    except FileNotFoundError:
        return set()
    except json.JSONDecodeError:
        print("Warning: rejected_alias_pairs.json is not valid JSON")
        return set()


def save_rejected_alias_pairs(rejected_alias_pairs: Set[Tuple[int, int]]):
    """Save the rejected alias pairs database."""
    with open("rejected_alias_pairs.json", "w", encoding="utf-8") as f:
        json.dump([list(pair) for pair in rejected_alias_pairs], f, indent=2)


def load_possible_aliases() -> List[Tuple[int, int]]:
    """Load the possible aliases file."""
    try:
        with open("possible_aliases.txt", "r", encoding="utf-8") as f:
            return [tuple(map(int, line.strip().split())) for line in f if line.strip()]
    except FileNotFoundError:
        print("Error: possible_aliases.txt not found")
        sys.exit(1)


def find_known_aliases(
    known_alias_db: Dict, player_id: int
) -> Tuple[str | None, list[str]]:
    """Find a player by their ID in the database."""
    for name, data in known_alias_db.items():
        if data.get("id") == player_id:
            return name, [alias["name"] for alias in data.get("aliases", [])]
    return None, []


def get_all_custom_aliases(
    name: str, custom_alias_db: Dict[str, List[str]]
) -> list[str]:
    """Get all known aliases for a name, including those from custom_aliases.json."""
    aliases = set()

    # Add direct aliases
    if name in custom_alias_db:
        for alias in custom_alias_db[name]:
            if isinstance(alias, str):
                aliases.add(alias)

    # Add reverse lookups
    for main_name, alias_list in custom_alias_db.items():
        if name in alias_list:
            aliases.add(main_name)
            for alias in alias_list:
                if isinstance(alias, str):
                    aliases.add(alias)

    return list(aliases)


def find_main_name(name: str, custom_alias_db: Dict[str, List[str]]) -> str:
    """Find the main name for a given name in the aliases database."""
    # If this name is a main name, return it
    if name in custom_alias_db:
        return name

    # Check if this name is an alias of any main name
    for main_name, aliases in custom_alias_db.items():
        if name in aliases:
            return main_name

    # If not found, this is a new name
    return name


def consolidate_aliases(
    name1: str,
    name2: str,
    custom_alias_db: Dict[str, List[str]],
    custom_aliases1: List[str],
    custom_aliases2: List[str],
) -> str:
    """Consolidate aliases under a single main name."""
    main_name1 = find_main_name(name1, custom_alias_db)
    main_name2 = find_main_name(name2, custom_alias_db)

    print(custom_aliases1)
    print(custom_aliases2)

    # If both names are already in the database under different main names,
    # merge them under the first main name
    if (
        main_name1 != main_name2
        and main_name1 in custom_alias_db
        and main_name2 in custom_alias_db
    ):
        # Move all aliases from main_name2 to main_name1
        custom_alias_db[main_name1].extend(custom_alias_db[main_name2])
        custom_alias_db[main_name1].append(main_name2)
        # Remove main_name2
        del custom_alias_db[main_name2]
        main_name = main_name1
    elif main_name1 in custom_alias_db:
        main_name = main_name1
        other_name = main_name2
    elif main_name2 in custom_alias_db:
        main_name = main_name2
        other_name = main_name1
    else:
        main_name = name2
        other_name = name1
    # Initialize the main name's aliases if needed
    if main_name not in custom_alias_db:
        custom_alias_db[main_name] = []

    # Add all names as aliases
    for name in custom_aliases1 + custom_aliases2 + [other_name]:
        if name != main_name and name not in custom_alias_db[main_name]:
            custom_alias_db[main_name].append(name)

    return main_name


def translate_name(name: str, target_lang: str) -> tuple[str, str] | None:
    """Translate a name to the target language.
    Returns a tuple of (translated_text, detected_source_language)"""
    try:
        translator = Translator()
        result = translator.translate(name, dest=target_lang)
        return result.text, result.src
    except Exception as e:
        print(f"Translation error: {e}")
        return None


def main():
    # Load the data
    known_alias_db = load_known_aliases()
    custom_alias_db = load_custom_aliases()
    possible_aliases = load_possible_aliases()
    rejected_alias_pairs = load_rejected_alias_pairs()

    # Calculate total and remaining aliases
    total_aliases = len(possible_aliases)
    remaining_aliases = total_aliases - len(rejected_alias_pairs)
    print(f"\nTotal possible aliases: {total_aliases}")
    print(f"Remaining to check: {remaining_aliases}")

    # Process each possible alias
    for i, (id1, id2) in enumerate(possible_aliases, 1):
        # Skip if this pair was previously rejected
        if (id1, id2) in rejected_alias_pairs or (id2, id1) in rejected_alias_pairs:
            continue

        # Find both players
        name1, known_aliases1 = find_known_aliases(known_alias_db, id1)
        name2, known_aliases2 = find_known_aliases(known_alias_db, id2)

        if not name1 or not name2:
            print(f"\nSkipping pair {id1} - {id2}: One or both players not found")
            continue

        # Get all custom aliases from custom_aliases.json
        custom_aliases1 = get_all_custom_aliases(name1, custom_alias_db)
        custom_aliases2 = get_all_custom_aliases(name2, custom_alias_db)

        # Check if these names are already known aliases
        if name1 in custom_aliases2 or name2 in custom_aliases1:
            print(f"\nSkipping pair {id1} - {id2}: Already known aliases")
            continue

        # Auto-accept if one name starts with the other or with any known alias
        all_names1 = [name1] + custom_aliases1 + known_aliases1
        all_names2 = [name2] + custom_aliases2 + known_aliases2

        auto_accept = False
        matching_reason = ""

        # Check if any name from player 1 starts with any name from player 2
        for n1 in all_names1:
            for n2 in all_names2:
                if n1.lower().startswith(n2.lower()) or n2.lower().startswith(
                    n1.lower()
                ):
                    auto_accept = True
                    matching_reason = f'"{n1}" matches with "{n2}"'
                    break
            if auto_accept:
                break

        # Always try translation for name1 for additional context
        translation1 = translate_name(name1, "en")

        # If not auto-accepted yet, try translation matching
        if not auto_accept and translation1:
            trans_text1, src_lang1 = translation1

            # Check if translation of name1 matches name2 (case-insensitive)
            if trans_text1.lower() == name2.lower():
                auto_accept = True
                matching_reason = f'Translation matches: "{trans_text1}" (from "{name1}" [{src_lang1}]) matches "{name2}"'
            # Check if translation of name1 starts with name2 or vice versa
            elif trans_text1.lower().startswith(
                name2.lower()
            ) or name2.lower().startswith(trans_text1.lower()):
                auto_accept = True
                matching_reason = f'Translation matches: "{trans_text1}" (from "{name1}" [{src_lang1}]) matches with "{name2}"'

        if auto_accept:
            print(f"\nAuto-accepting alias pair ({i}/{remaining_aliases}):")
            print(f"Player 1 (ID: {id1}): {name1}")
            print(f"Player 2 (ID: {id2}): {name2}")
            print(f"Reason: {matching_reason}")

            # Consolidate aliases under a single main name
            main_name = consolidate_aliases(
                name1, name2, custom_alias_db, custom_aliases1, custom_aliases2
            )

            # Save the updated custom_aliases.json
            save_custom_aliases(custom_alias_db)
            print(f"Aliases added to custom_aliases.json under main name: {main_name}")
            continue

        print(f"\nPossible alias pair ({i}/{remaining_aliases}):")
        print(f"Player 1 (ID: {id1}): {name1}")
        print(f"Custom aliases: {', '.join(f'"{n}"' for n in custom_aliases1)}")
        print(f"Known aliases: {', '.join(f'"{n}"' for n in known_aliases1)}")
        if translation1:
            trans_text1, src_lang1 = translation1
            print(f"Translation: {trans_text1} (detected language: {src_lang1})")
        print(f"Player 2 (ID: {id2}): {name2}")
        print(f"Custom aliases: {', '.join(f'"{n}"' for n in custom_aliases2)}")
        print(f"Known aliases: {', '.join(f'"{n}"' for n in known_aliases2)}")

        while True:
            # Ask for confirmation
            response = input("\nAdd these as aliases? (y/n/q to quit): ").lower()

            if response == "q":
                sys.exit(0)
            elif response == "y":
                # Consolidate aliases under a single main name
                main_name = consolidate_aliases(
                    name1, name2, custom_alias_db, custom_aliases1, custom_aliases2
                )

                # Save the updated custom_aliases.json
                save_custom_aliases(custom_alias_db)
                print(
                    f"Aliases added to custom_aliases.json under main name: {main_name}"
                )
                break
            elif response == "n":
                # Add to rejected aliases
                rejected_alias_pairs.add((id1, id2))
                save_rejected_alias_pairs(rejected_alias_pairs)
                print("Alias pair rejected and saved.")
                break


if __name__ == "__main__":
    main()
