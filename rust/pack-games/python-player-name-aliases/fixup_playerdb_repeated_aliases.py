#!/usr/bin/env python3
"""
Script to fix playerdb by removing duplicate aliases.
Goes through players sequentially by ID and removes any aliases that already exist in previous players.
"""

import json
import sys
from typing import Dict, Set, List, Any
from pathlib import Path


def load_playerdb(file_path: str) -> List[Dict[str, Any]]:
    """Load the playerdb JSON file."""
    print(f"Loading playerdb from {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"Loaded {len(data)} players")
    return data


def save_playerdb(data: List[Dict[str, Any]], file_path: str) -> None:
    """Save the cleaned playerdb JSON file."""
    print(f"Saving cleaned playerdb to {file_path}...")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Saved {len(data)} players")


def extract_all_names(player: Dict[str, Any]) -> Set[str]:
    """Extract all name aliases from a player's data."""
    names = set()

    # Navigate through the names structure
    if "names" in player and player["names"]:
        for name_group in player["names"]:
            if "simplenames" in name_group and name_group["simplenames"]:
                for simple_name in name_group["simplenames"]:
                    if "name" in simple_name and simple_name["name"]:
                        names.add(simple_name["name"])

    return names


def remove_duplicate_names(player: Dict[str, Any], seen_names: Set[str]) -> int:
    """
    Remove any names from the player that already exist in seen_names.
    Returns the number of names removed.
    """
    removed_count = 0

    if "names" not in player or not player["names"]:
        return removed_count

    for name_group in player["names"]:
        if "simplenames" not in name_group or not name_group["simplenames"]:
            continue

        # Filter out simplenames that have names already seen
        original_count = len(name_group["simplenames"])
        name_group["simplenames"] = [
            simple_name
            for simple_name in name_group["simplenames"]
            if "name" not in simple_name or simple_name["name"] not in seen_names
        ]
        new_count = len(name_group["simplenames"])
        removed_count += original_count - new_count

    return removed_count


def fixup_playerdb(input_file: str, output_file: str = None) -> None:
    """
    Main function to fix the playerdb by removing duplicate aliases.

    Args:
        input_file: Path to the input playerdb JSON file
        output_file: Path to save the cleaned file (defaults to input_file with _cleaned suffix)
    """
    # Set default output file name if not provided
    if output_file is None:
        input_path = Path(input_file)
        output_file = str(
            input_path.parent / f"{input_path.stem}_cleaned{input_path.suffix}"
        )

    # Load the playerdb
    players = load_playerdb(input_file)

    # Sort players by ID to process sequentially
    players.sort(key=lambda p: p.get("id", 0))

    # Track names we've already seen
    seen_names: Set[str] = set()
    total_removed = 0

    print("Processing players sequentially by ID...")

    for i, player in enumerate(players):
        player_id = player.get("id", "unknown")

        # Remove any names that we've already seen
        removed_count = remove_duplicate_names(player, seen_names)

        if removed_count > 0:
            print(
                f"Player {player_id} ({player.get('key_name', 'unknown')}): removed {removed_count} duplicate names"
            )
            total_removed += removed_count

        # Add remaining names to seen_names for future players
        remaining_names = extract_all_names(player)
        seen_names.update(remaining_names)

        # Progress indicator
        if (i + 1) % 1000 == 0:
            print(
                f"Processed {i + 1}/{len(players)} players, removed {total_removed} duplicates so far"
            )

    print(f"\nCompleted processing all {len(players)} players")
    print(f"Total duplicate names removed: {total_removed}")
    print(f"Total unique names tracked: {len(seen_names)}")

    # Save the cleaned playerdb
    save_playerdb(players, output_file)

    print(f"\nCleaned playerdb saved to: {output_file}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(
            "Usage: python fixup_playerdb_repeated_aliases.py <input_file> [output_file]"
        )
        print(
            "Example: python fixup_playerdb_repeated_aliases.py playerdb-2025-05-10.json"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        fixup_playerdb(input_file, output_file)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
