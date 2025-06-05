#!/usr/bin/env python3

import json
import argparse
import sys
from typing import List, Dict, Any


def load_player_db(file_path: str) -> List[Dict[str, Any]]:
    """Load the player database from JSON file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: {file_path} is not a valid JSON file.")
        sys.exit(1)


def search_player(data: List[Dict[str, Any]], search_term: str) -> List[Dict[str, Any]]:
    """Search for players matching the search term in name variations."""
    results = []
    search_term = search_term.lower()

    for player in data:
        for name_entry in player.get("names", []):
            for simple_name in name_entry.get("simplenames", []):
                name = simple_name.get("name", "").lower()
                if search_term in name:
                    if player not in results:
                        results.append(player)
                    break
            if player in results:
                break

    return results


def display_player(results: List[Dict[str, Any]]):
    """Display detailed information about matching players."""
    if not results:
        print("No matches found.")
        return

    print(f"\nFound {len(results)} matches:")
    print("=" * 50)

    for player in results:
        print(f"Player ID: {player['id']}")
        print(f"Key Name: {player['key_name']}")
        print("Names:")
        for name_entry in player.get("names", []):
            for simple_name in name_entry.get("simplenames", []):
                name = simple_name["name"]
                languages = [
                    lang["language"] for lang in simple_name.get("languages", [])
                ]
                lang_str = f" ({', '.join(languages)})" if languages else ""
                print(f"  - {name}{lang_str}")
        print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Search for a player by name in the database"
    )
    parser.add_argument("search_term", help="Name to search for")
    parser.add_argument(
        "--file",
        default="playerdb-2025-05-10.json",
        help="Path to the player database JSON file (default: playerdb-2025-05-10.json)",
    )

    args = parser.parse_args()

    # Load the database
    data = load_player_db(args.file)

    # Search for matches
    results = search_player(data, args.search_term)

    # Display results
    display_player(results)


if __name__ == "__main__":
    main()
