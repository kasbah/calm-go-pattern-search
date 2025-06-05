#!/usr/bin/env python3

import json
import argparse
import sys
from typing import List, Dict, Any, Set


def load_foreign_names(file_path: str) -> Set[str]:
    """Load foreign names from a text file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # Strip whitespace and filter out empty lines
            return {line.strip() for line in f if line.strip()}
    except FileNotFoundError:
        print(f"Error: Foreign names file {file_path} not found.")
        sys.exit(1)


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


def search_names(
    data: List[Dict[str, Any]], search_terms: Set[str]
) -> List[Dict[str, Any]]:
    """Search for players matching any of the search terms in name variations."""
    results = []
    matched_terms = set()

    for player in data:
        for name_entry in player.get("names", []):
            for simple_name in name_entry.get("simplenames", []):
                name = simple_name.get("name", "").lower()
                for term in search_terms:
                    if term.lower() in name:
                        if player not in results:
                            results.append(player)
                        matched_terms.add(term)
                        break
            if player in results:
                break

    # Report unmatched terms
    unmatched = search_terms - matched_terms
    if unmatched:
        print("\nNo matches found for these names:")
        for term in sorted(unmatched):
            print(f"  - {term}")

    return results


def display_names(results: List[Dict[str, Any]]):
    """Display only names and aliases for matching players."""
    if not results:
        print("No matches found.")
        return

    print(f"\nFound {len(results)} matches:")
    print("=" * 50)

    for player in results:
        print(f"Player ID: {player['id']}")
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
        description="Search through player names and aliases"
    )
    parser.add_argument(
        "--file",
        default="playerdb-2025-05-10.json",
        help="Path to the player database JSON file (default: playerdb-2025-05-10.json)",
    )
    parser.add_argument(
        "--foreign-names",
        default="foreign_names.txt",
        help="Path to the file containing foreign names to search for (default: foreign_names.txt)",
    )

    args = parser.parse_args()

    # Load foreign names
    search_terms = load_foreign_names(args.foreign_names)

    # Load the database
    data = load_player_db(args.file)

    # Search for matches
    results = search_names(data, search_terms)

    # Display results
    display_names(results)


if __name__ == "__main__":
    main()
