import { useState, useEffect, useRef } from "react";
import {
  playerSearchEngine,
  type PlayerSuggestion,
  type PlayerSearchResult,
} from "./playerSearch";

interface PlayerSearchProps {
  selectedPlayerIds: number[];
  onPlayerSelect: (playerIds: number[]) => void;
}

export default function PlayerSearch({
  selectedPlayerIds,
  onPlayerSelect,
}: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<PlayerSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerSuggestion[]>(
    [],
  );
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update selected players when selectedPlayerIds changes
  useEffect(() => {
    const players = selectedPlayerIds
      .map((id) => playerSearchEngine.getPlayerById(id))
      .filter((player): player is PlayerSuggestion => player !== undefined);
    setSelectedPlayers(players);
    setSearchTerm(""); // Clear search term when players are selected
  }, [selectedPlayerIds]);

  // Update suggestions when search term changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const results = playerSearchEngine.search(searchTerm, 10);
      // Filter out already selected players
      const filteredResults = results.filter(
        (result) => !selectedPlayerIds.includes(result.player.id),
      );
      setSuggestions(filteredResults);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, selectedPlayerIds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Don't clear the selected player when typing in the search (they can coexist)
    // Only clear when explicitly clicking the clear button
  };

  const handleSuggestionClick = (suggestion: PlayerSearchResult) => {
    const player = suggestion.player;
    const newSelectedIds = [...selectedPlayerIds, player.id];
    setSearchTerm(""); // Clear search term when player is selected (shown as chip)
    setShowSuggestions(false);
    onPlayerSelect(newSelectedIds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleClearAll = () => {
    setSearchTerm("");
    setShowSuggestions(false);
    onPlayerSelect([]);
    inputRef.current?.focus();
  };

  const handleRemovePlayer = (playerId: number) => {
    const newSelectedIds = selectedPlayerIds.filter((id) => id !== playerId);
    onPlayerSelect(newSelectedIds);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        {selectedPlayers.length > 0 ? (
          // Show selected players as tags
          <div className="flex flex-wrap items-center w-full p-2 border rounded-md bg-blue-50 border-blue-300 gap-2">
            {selectedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                title={`${player.name}${player.canonicalName !== player.name ? ` (${player.canonicalName})` : ""} - ID: ${player.id}`}
              >
                <span className="font-medium">{player.name}</span>
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  ✕
                </button>
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              placeholder="Add another player..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              className="flex-1 bg-transparent focus:outline-none min-w-0"
            />
            {selectedPlayers.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-blue-600 hover:text-blue-800 focus:outline-none text-sm"
                title="Clear all"
              >
                Clear All
              </button>
            )}
          </div>
        ) : (
          // Show regular search input
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by player name..."
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
            className="w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        {selectedPlayers.length === 0 && searchTerm && (
          <button
            onClick={handleClearAll}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => {
            const player = suggestion.player;
            // Show up to 6 most relevant aliases (excluding the main name and canonical name)
            // Prioritize English aliases first
            const relevantAliases = player.aliasesWithLanguages.filter(
              (alias) =>
                alias.name !== player.name &&
                alias.name !== player.canonicalName,
            );

            // Sort aliases: English first, then others
            const sortedAliases = relevantAliases.sort((a, b) => {
              if (a.isEnglish && !b.isEnglish) return -1;
              if (!a.isEnglish && b.isEnglish) return 1;
              return 0;
            });

            const displayAliases = sortedAliases
              .slice(0, 6)
              .map((alias) => alias.name);

            return (
              <div
                key={player.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === highlightedIndex ? "bg-blue-100" : ""
                }`}
              >
                <div className="font-medium">{player.name}</div>
                {player.canonicalName !== player.name && (
                  <div className="text-sm text-gray-500">
                    {player.canonicalName}
                  </div>
                )}
                {displayAliases.length > 0 && (
                  <div className="text-sm text-gray-400 mt-1">
                    Also known as: {displayAliases.join(", ")}
                    {relevantAliases.length > displayAliases.length && " ..."}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  ID: {player.id} • Score: {(1 - suggestion.score).toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
