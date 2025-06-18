import { useState, useEffect, useRef } from "react";
import { Input } from "./components/ui/input";
import { cn } from "./lib/utils";
import { playerSearchEngine, type PlayerSuggestion } from "./playerSearch";
import cancelSvg from "@/assets/icons/cancel.svg";

type PlayerInputProps = {
  placeholder: string;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  selectedPlayer: PlayerSuggestion | null;
  onPlayerSelect: (player: PlayerSuggestion | null) => void;
  playerCounts?: Record<number, number>;
  isLoading: boolean;
};

function PlayerInput({
  placeholder,
  initialQuery = "",
  onQueryChange,
  selectedPlayer,
  onPlayerSelect,
  playerCounts,
  isLoading,
}: PlayerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deletedPlayer, setDeletedPlayer] = useState<PlayerSuggestion | null>(
    null,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        if (deletedPlayer) {
          handlePlayerSelect(deletedPlayer);
        }
        setDeletedPlayer(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [deletedPlayer, setDeletedPlayer, setShowSuggestions]);

  useEffect(() => {
    if (showSuggestions && !isLoading) {
      setSuggestions(playerSearchEngine.searchPlayers(query, playerCounts));
    }
  }, [query, playerCounts, showSuggestions, isLoading]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  const handlePlayerSelect = (player: PlayerSuggestion | null) => {
    onPlayerSelect(player);
    setShowSuggestions(false);
    setSuggestions([]);
    setQuery("");
  };

  const renderSuggestions = () => {
    if (isLoading || !showSuggestions || suggestions.length === 0) {
      return null;
    }

    return (
      <div
        ref={suggestionsRef}
        className={cn(
          "absolute z-50 w-full bg-background border",
          "rounded-md shadow-md mt-1 max-h-64",
          "overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20",
          "scrollbar-track-transparent",
        )}
      >
        {suggestions.map((player) => (
          <div
            key={player.id}
            className={cn(
              "px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:bg-accent focus:text-accent-foreground focus:outline-none",
            )}
            onClick={() => handlePlayerSelect(player)}
            role="option"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{player.name}</div>
              <div className="text-xs text-muted-foreground/60 ml-2 flex-shrink-0">
                {(playerCounts?.[player.id] ?? player.gamesCount) > 0 &&
                  `${playerCounts?.[player.id] ?? player.gamesCount} games`}
              </div>
            </div>
            {player.aliases.length > 1 && (
              <div className="text-xs text-muted-foreground/70 truncate">
                {player.aliases.slice(0, 10).join(", ")}
                {player.aliases.length > 10 && "..."}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={selectedPlayer?.name ?? query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => {
          if (selectedPlayer) {
            setDeletedPlayer(selectedPlayer);
            handlePlayerSelect(null);
            setTimeout(() => setShowSuggestions(true), 500);
          } else {
            setShowSuggestions(true);
          }
        }}
        className={cn("pr-8", selectedPlayer && "bg-accent/20 border-primary")}
      />
      {selectedPlayer && (
        <button
          onClick={() => handlePlayerSelect(null)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "h-5 w-5 rounded-sm opacity-70 hover:opacity-100",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-opacity",
            "cursor-pointer",
          )}
          type="button"
          tabIndex={-1}
        >
          <img src={cancelSvg} alt="Clear" className="h-4 w-4" />
        </button>
      )}
      {renderSuggestions()}
    </div>
  );
}

export type PlayerSearchProps = {
  onPlayerSelect: (playerIds: number[]) => void;
  playerCounts?: Record<number, number>;
  isLoading: boolean;
};

export default function PlayerSearch({
  onPlayerSelect,
  playerCounts,
  isLoading,
}: PlayerSearchProps) {
  const [selectedPlayer1, setSelectedPlayer1] =
    useState<PlayerSuggestion | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] =
    useState<PlayerSuggestion | null>(null);

  // Update selected player IDs when players are selected/deselected
  useEffect(() => {
    const newPlayerIds: number[] = [];
    if (selectedPlayer1) newPlayerIds.push(selectedPlayer1.id);
    if (selectedPlayer2) newPlayerIds.push(selectedPlayer2.id);
    onPlayerSelect(newPlayerIds);
  }, [selectedPlayer1, selectedPlayer2, onPlayerSelect]);

  return (
    <div className="space-y-3 mb-3">
      <PlayerInput
        placeholder="Player 1"
        selectedPlayer={selectedPlayer1}
        onPlayerSelect={setSelectedPlayer1}
        playerCounts={playerCounts}
        isLoading={isLoading}
      />

      <div className="text-sm font-medium text-foreground mb-2">vs</div>
      <PlayerInput
        placeholder="Player 2"
        selectedPlayer={selectedPlayer2}
        onPlayerSelect={setSelectedPlayer2}
        playerCounts={playerCounts}
        isLoading={isLoading}
      />
    </div>
  );
}
