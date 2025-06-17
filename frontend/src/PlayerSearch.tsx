import { useState, useEffect, useRef } from "react";
import { Input } from "./components/ui/input";
import { cn } from "./lib/utils";
import { playerSearchEngine, type PlayerSuggestion } from "./playerSearch";
import cancelSvg from "@/assets/icons/cancel.svg";

type PlayerInputProps = {
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: PlayerSuggestion[];
  showSuggestions: boolean;
  onShowSuggestions: (show: boolean) => void;
  selectedPlayer: PlayerSuggestion | null;
  onPlayerSelect: (player: PlayerSuggestion) => void;
  onPlayerClear: () => void;
  playerCounts?: Record<number, number>;
};

function PlayerInput({
  placeholder,
  query,
  onQueryChange,
  suggestions,
  showSuggestions,
  onShowSuggestions,
  selectedPlayer,
  onPlayerSelect,
  onPlayerClear,
  playerCounts,
}: PlayerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        onShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onShowSuggestions]);

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

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
            onClick={() => onPlayerSelect(player)}
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
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => onShowSuggestions(true)}
        className={cn("pr-8", selectedPlayer && "bg-accent/20 border-primary")}
      />
      {selectedPlayer && (
        <button
          onClick={onPlayerClear}
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

type PlayerSearchProps = {
  onPlayerSelect: (playerIds: number[]) => void;
  playerCounts?: Record<number, number>;
};

export default function PlayerSearch({
  onPlayerSelect,
  playerCounts,
}: PlayerSearchProps) {
  const [player1Query, setPlayer1Query] = useState("");
  const [player2Query, setPlayer2Query] = useState("");
  const [player1Suggestions, setPlayer1Suggestions] = useState<
    PlayerSuggestion[]
  >([]);
  const [player2Suggestions, setPlayer2Suggestions] = useState<
    PlayerSuggestion[]
  >([]);
  const [showPlayer1Suggestions, setShowPlayer1Suggestions] = useState(false);
  const [showPlayer2Suggestions, setShowPlayer2Suggestions] = useState(false);
  const [selectedPlayer1, setSelectedPlayer1] =
    useState<PlayerSuggestion | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] =
    useState<PlayerSuggestion | null>(null);

  useEffect(() => {
    function searchPlayers(
      query: string,
      playerCounts?: Record<number, number>,
    ) {
      if (query.length >= 2) {
        const results = playerSearchEngine.search(query, 100);
        let filteredResults = results.map((r) => r.player);

        // Filter by players in playerCounts if available
        if (playerCounts && Object.keys(playerCounts).length > 0) {
          filteredResults = filteredResults.filter(
            (player) => playerCounts[player.id] !== undefined,
          );
        }

        // Sort by player counts (most counts first)
        filteredResults.sort((a, b) => {
          const aCount = playerCounts?.[a.id] ?? a.gamesCount;
          const bCount = playerCounts?.[b.id] ?? b.gamesCount;
          return bCount - aCount;
        });

        return filteredResults;
      } else if (query.length === 0) {
        // Show players from playerCounts when empty, or all players if no playerCounts
        if (playerCounts && Object.keys(playerCounts).length > 0) {
          const allPlayers = playerSearchEngine.getAllPlayers();
          const filteredPlayers = allPlayers.filter(
            (player) => playerCounts[player.id] !== undefined,
          );
          // Sort by player counts (most counts first)
          filteredPlayers.sort((a, b) => {
            const aCount = playerCounts?.[a.id] ?? a.gamesCount;
            const bCount = playerCounts?.[b.id] ?? b.gamesCount;
            return bCount - aCount;
          });
          return filteredPlayers;
        } else {
          return playerSearchEngine.getAllPlayers();
        }
      }
      return [];
    }

    setPlayer1Suggestions(searchPlayers(player1Query, playerCounts));
    setPlayer2Suggestions(searchPlayers(player2Query, playerCounts));
  }, [player1Query, player2Query, playerCounts]);

  // Update selected player IDs when players are selected/deselected
  useEffect(() => {
    const newPlayerIds: number[] = [];
    if (selectedPlayer1) newPlayerIds.push(selectedPlayer1.id);
    if (selectedPlayer2) newPlayerIds.push(selectedPlayer2.id);
    onPlayerSelect(newPlayerIds);
  }, [selectedPlayer1, selectedPlayer2, onPlayerSelect]);

  const handlePlayer1Select = (player: PlayerSuggestion) => {
    setSelectedPlayer1(player);
    setPlayer1Query(player.name);
    setShowPlayer1Suggestions(false);
  };

  const handlePlayer2Select = (player: PlayerSuggestion) => {
    setSelectedPlayer2(player);
    setPlayer2Query(player.name);
    setShowPlayer2Suggestions(false);
  };

  const handlePlayer1Clear = () => {
    setSelectedPlayer1(null);
    setPlayer1Query("");
    setShowPlayer1Suggestions(false);
  };

  const handlePlayer2Clear = () => {
    setSelectedPlayer2(null);
    setPlayer2Query("");
    setShowPlayer2Suggestions(false);
  };

  return (
    <div className="space-y-3 mb-3">
      <PlayerInput
        placeholder="Player 1"
        query={player1Query}
        onQueryChange={setPlayer1Query}
        suggestions={player1Suggestions}
        showSuggestions={showPlayer1Suggestions}
        onShowSuggestions={setShowPlayer1Suggestions}
        selectedPlayer={selectedPlayer1}
        onPlayerSelect={handlePlayer1Select}
        onPlayerClear={handlePlayer1Clear}
        playerCounts={playerCounts}
      />

      <div className="text-sm font-medium text-foreground mb-2">vs</div>
      <PlayerInput
        placeholder="Player 2"
        query={player2Query}
        onQueryChange={setPlayer2Query}
        suggestions={player2Suggestions}
        showSuggestions={showPlayer2Suggestions}
        onShowSuggestions={setShowPlayer2Suggestions}
        selectedPlayer={selectedPlayer2}
        onPlayerSelect={handlePlayer2Select}
        onPlayerClear={handlePlayer2Clear}
        playerCounts={playerCounts}
      />
    </div>
  );
}
