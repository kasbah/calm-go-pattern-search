import os
import json
from typing import List, Dict, Set
import anthropic
from pathlib import Path


def read_names_in_chunks(file_path: str, chunk_size: int = 100) -> List[str]:
    """Read names from file in chunks."""
    with open(file_path, "r", encoding="utf-8") as f:
        names = [line.strip() for line in f if line.strip()]
    return [names[i : i + chunk_size] for i in range(0, len(names), chunk_size)]


def load_all_names(file_path: str) -> Set[str]:
    """Load all names from the file into a set for quick lookup."""
    with open(file_path, "r", encoding="utf-8") as f:
        return {line.strip() for line in f if line.strip()}


def load_existing_aliases(file_path: str) -> Dict[str, Set[str]]:
    """Load existing aliases from JSON file and convert lists to sets for easier comparison."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {k: set(v) for k, v in data.items()}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_aliases(aliases: Dict[str, Set[str]], file_path: str):
    """Save aliases to JSON file, converting sets back to sorted lists."""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(
            {k: sorted(list(v)) for k, v in aliases.items()},
            f,
            indent=2,
            ensure_ascii=False,
        )


def process_names_with_anthropic(
    names: List[str],
    existing_keys: Set[str],
    client: anthropic.Client,
    max_retries: int = 3,
) -> Dict[str, Set[str]]:
    """Process a chunk of names using Anthropic's API to identify duplicates/aliases."""
    prompt = f"""Given the following list of names, identify any names that refer to the same person (duplicates or aliases).
Pay special attention to Korean and Japanese name romanizations, as they often have multiple valid spellings.


IMPORTANT: When identifying duplicates, prefer using these existing primary keys if they match:
{", ".join(sorted(existing_keys))}

For example:
- Korean names might have different romanizations (e.g., "Kim" vs "Gim", "Park" vs "Bak")
- Japanese names might have different romanizations (e.g., "Sato" vs "Satoh", "Ota" vs "Ohta")
- Names might have different spacing or hyphenation (e.g., "Kim Min-jun" vs "Kim Minjun")
- Names might have different order (e.g., "Kim Min-jun" vs "Min-jun Kim")


IMPORTANT: Your response must be a valid JSON object with the following structure:
{{
    "romanized_name": ["alias1", "alias2", "alias3"]
}}

Rules for the JSON response:
1. The key must be a romanized name (use Latin characters)
2. The value must be an array of strings
3. Do not include any explanatory text before or after the JSON
4. Do not use any special characters in the keys
5. If no duplicates are found, return an empty object {{}}
6. When possible, use one of the existing primary keys listed above
7. DO NOT include any keys with empty arrays - if a name has no aliases, do not include it in the response
8. Only include names that have at least one alias

Names to process:
{", ".join(names)}"""

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=1000,
                temperature=0,
                system="You are a helpful assistant that specializes in identifying duplicate names and aliases, with expertise in Korean, Japanese, and Chinese name romanizations and translations. You must respond with valid JSON only. Do not include any keys with empty arrays in your response.",
                messages=[{"role": "user", "content": prompt}],
            )

            # Get the response text and clean it
            response_text = response.content[0].text.strip()
            print(f"Raw API response for chunk {names[:5]}...:\n{response_text}\n")

            # Try to find JSON in the response
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1

            if start_idx == -1 or end_idx == 0:
                print(f"No JSON object found in response for chunk: {names[:5]}...")
                print("Response text:", response_text)
                if attempt < max_retries - 1:
                    print(f"Retrying... (Attempt {attempt + 1}/{max_retries})")
                    continue
                return {}

            json_str = response_text[start_idx:end_idx]
            print(f"Extracted JSON string: {json_str}\n")

            result = json.loads(json_str)

            # Validate the result structure
            if not isinstance(result, dict):
                print(f"Invalid result type for chunk: {names[:5]}...")
                print(f"Result type: {type(result)}")
                if attempt < max_retries - 1:
                    print(f"Retrying... (Attempt {attempt + 1}/{max_retries})")
                    continue
                return {}

            # Validate each entry and convert to sets
            valid_result = {}
            for key, value in result.items():
                if isinstance(value, list) and all(isinstance(x, str) for x in value):
                    valid_result[key] = set(value)
                else:
                    print(
                        f"Invalid entry format for key '{key}' in chunk: {names[:5]}..."
                    )
                    print(f"Value type: {type(value)}")
                    if isinstance(value, list):
                        print(f"List contents: {value}")

            return valid_result

        except json.JSONDecodeError as e:
            print(f"Error parsing JSON for chunk: {names[:5]}...")
            print(f"Error details: {str(e)}")
            print(f"JSON string that failed to parse: {json_str}")
            if attempt < max_retries - 1:
                print(f"Retrying... (Attempt {attempt + 1}/{max_retries})")
                # Add error information to the prompt for the next attempt
                prompt += f"\n\nPrevious attempt failed with JSON decode error: {str(e)}. Please ensure your response is valid JSON."
                continue
            return {}
        except Exception as e:
            print(f"Unexpected error processing chunk: {names[:5]}...")
            print(f"Error details: {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying... (Attempt {attempt + 1}/{max_retries})")
                continue
            return {}

    return {}


def main():
    # Initialize Anthropic client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("Please set the ANTHROPIC_API_KEY environment variable")

    client = anthropic.Client(api_key=api_key)

    # Load all names for verification
    names_file = "names.txt"
    all_names = load_all_names(names_file)
    print(f"Loaded {len(all_names)} total names for verification")

    # Load existing aliases
    output_file = "name_aliases.json"
    existing_aliases = load_existing_aliases(output_file)
    existing_keys = set(existing_aliases.keys())
    print(f"Loaded {len(existing_aliases)} existing name entries")

    # Create a set of all existing aliases for quick lookup
    all_existing_aliases = set()
    for aliases in existing_aliases.values():
        all_existing_aliases.update(aliases)

    # Read names in chunks
    chunks = read_names_in_chunks(names_file)

    # Process each chunk and collect results
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i + 1}/{len(chunks)}...")
        chunk_results = process_names_with_anthropic(chunk, existing_keys, client)

        # Merge new results with existing aliases
        for key, new_aliases in chunk_results.items():
            # Skip if the key itself is already an alias
            if key in all_existing_aliases:
                print(
                    f"Skipping entry '{key}' as it is already an alias for another name"
                )
                continue

            # Verify each alias exists in names.txt and is not already an alias or key
            verified_aliases = {
                alias
                for alias in new_aliases
                if alias in all_names
                and alias not in existing_keys
                and alias not in all_existing_aliases
            }

            if not verified_aliases:
                print(
                    f"Skipping entry '{key}' as none of its aliases were valid or found in names.txt"
                )
                continue

            if key in existing_aliases:
                # Add only new unique aliases that exist in names.txt
                existing_aliases[key].update(verified_aliases)
                print(
                    f"Added {len(verified_aliases)} verified aliases to existing entry: {key}"
                )
            else:
                # Add new entry with verified aliases
                existing_aliases[key] = verified_aliases
                print(
                    f"Added new entry with {len(verified_aliases)} verified aliases: {key}"
                )
                # Update existing_keys with the new key
                existing_keys.add(key)
                # Update all_existing_aliases with the new aliases
                all_existing_aliases.update(verified_aliases)

        # Save intermediate results after each chunk
        save_aliases(existing_aliases, output_file)
        print(f"Intermediate results saved to {output_file}")

    # Save updated results
    save_aliases(existing_aliases, output_file)
    print(f"Results saved to {output_file}")


if __name__ == "__main__":
    main()
