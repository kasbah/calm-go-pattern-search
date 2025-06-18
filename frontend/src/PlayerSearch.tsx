import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./components/ui/input";
import { cn } from "./lib/utils";
import { playerSearchEngine, type PlayerSuggestion } from "./playerSearch";
import cancelSvg from "@/assets/icons/cancel.svg";
import circleBlackSvg from "@/assets/icons/circle-black.svg";
import circleWhiteSvg from "@/assets/icons/circle-white.svg";
import circleBlackOrWhiteSvg from "@/assets/icons/circle-black-or-white.svg";

type PlayerColor = "black" | "white" | "any";

type PlayerInputProps = {
  placeholder: string;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  selectedPlayer: PlayerSuggestion | null;
  onPlayerSelect: (player: PlayerSuggestion | null) => void;
  playerCounts?: Record<number, number>;
  isLoading: boolean;
  color?: PlayerColor;
  onColorChange?: (color: PlayerColor) => void;
};

function PlayerInput({
  placeholder,
  initialQuery = "",
  onQueryChange,
  selectedPlayer,
  onPlayerSelect,
  playerCounts,
  isLoading,
  color = "any",
  onColorChange,
}: PlayerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [deletedPlayer, setDeletedPlayer] = useState<PlayerSuggestion | null>(
    null,
  );

  const handlePlayerSelect = useCallback(
    (player: PlayerSuggestion | null) => {
      onPlayerSelect(player);
      setShowSuggestions(false);
      setSuggestions([]);
      setQuery("");
    },
    [onPlayerSelect, setShowSuggestions, setSuggestions, setQuery],
  );

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    if (deletedPlayer) {
      handlePlayerSelect(deletedPlayer);
    }
    setDeletedPlayer(null);
  }, [setShowSuggestions, deletedPlayer, handlePlayerSelect]);

  const handleColorSelect = useCallback(
    (newColor: PlayerColor) => {
      onColorChange?.(newColor);
      setShowColorDropdown(false);
    },
    [onColorChange],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        closeSuggestions();
      }
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowColorDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSuggestions();
        setShowColorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [deletedPlayer, closeSuggestions]);

  useEffect(() => {
    if (showSuggestions && !isLoading) {
      setSuggestions(playerSearchEngine.searchPlayers(query, playerCounts));
    }
  }, [query, playerCounts, showSuggestions, isLoading]);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      onQueryChange?.(event.target.value);
    },
    [setQuery, onQueryChange],
  );

  const handleInputFocus = useCallback(() => {
    if (selectedPlayer) {
      setDeletedPlayer(selectedPlayer);
      handlePlayerSelect(null);
      setTimeout(() => setShowSuggestions(true), 500);
    } else {
      setShowSuggestions(true);
    }
  }, [selectedPlayer, handlePlayerSelect, setShowSuggestions]);

  const deletePlayer = useCallback(() => {
    handlePlayerSelect(null);
  }, [handlePlayerSelect]);

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

  const renderColorDropdown = () => {
    if (!showColorDropdown) return null;

    return (
      <div
        ref={colorDropdownRef}
        className={cn(
          "absolute z-50 left-0 mt-1 w-32 bg-background border",
          "rounded-md shadow-md",
          "overflow-hidden",
        )}
      >
        <button
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent",
            "transition-colors",
          )}
          onClick={() => handleColorSelect("black")}
        >
          <img src={circleBlackSvg} alt="Black" className="h-4 w-4" />
          <span className="text-sm">Black</span>
        </button>
        <button
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent",
            "transition-colors",
          )}
          onClick={() => handleColorSelect("white")}
        >
          <img src={circleWhiteSvg} alt="White" className="h-4 w-4" />
          <span className="text-sm">White</span>
        </button>
        <button
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent",
            "transition-colors",
          )}
          onClick={() => handleColorSelect("any")}
        >
          <img src={circleBlackOrWhiteSvg} alt="Any" className="h-4 w-4" />
          <span className="text-sm">Any</span>
        </button>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <button
          onClick={() => setShowColorDropdown(!showColorDropdown)}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2",
            "h-6 w-6 rounded-sm opacity-70 hover:opacity-100",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-opacity",
            "cursor-pointer",
            "z-10",
          )}
          type="button"
        >
          <img
            src={
              color === "black"
                ? circleBlackSvg
                : color === "white"
                  ? circleWhiteSvg
                  : circleBlackOrWhiteSvg
            }
            alt="Color"
            className="h-5 w-5"
          />
        </button>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={selectedPlayer?.name ?? query}
          onChange={handleQueryChange}
          onFocus={handleInputFocus}
          className={cn(
            "pl-10 pr-8",
            selectedPlayer && "bg-accent/20 border-primary",
          )}
        />
        {selectedPlayer && (
          <button
            onClick={deletePlayer}
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
      </div>
      {renderColorDropdown()}
      {renderSuggestions()}
    </div>
  );
}

export type PlayerSearchProps = {
  onPlayerSelect: (playerIds: number[]) => void;
  playerCounts?: Record<number, number>;
  isLoading: boolean;
  onColorChange?: (colors: [PlayerColor, PlayerColor]) => void;
};

export default function PlayerSearch({
  onPlayerSelect,
  playerCounts,
  isLoading,
  onColorChange,
}: PlayerSearchProps) {
  const [selectedPlayer1, setSelectedPlayer1] =
    useState<PlayerSuggestion | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] =
    useState<PlayerSuggestion | null>(null);
  const [color1, setColor1] = useState<PlayerColor>("any");
  const [color2, setColor2] = useState<PlayerColor>("any");
  const [prevColor1, setPrevColor1] = useState<PlayerColor>("any");
  const [prevColor2, setPrevColor2] = useState<PlayerColor>("any");

  useEffect(() => {
    const newPlayerIds: number[] = [];
    if (selectedPlayer1 != null) newPlayerIds.push(selectedPlayer1.id);
    if (selectedPlayer2 != null) newPlayerIds.push(selectedPlayer2.id);
    onPlayerSelect(newPlayerIds);
    if (selectedPlayer1 == null && selectedPlayer2 == null) {
      setPrevColor1("any");
      setPrevColor2("any");
      setColor1("any");
      setColor2("any");
    } else if (selectedPlayer1 == null && selectedPlayer2 != null) {
      if (color2 === "black") {
        setPrevColor1("white");
        setColor1("white");
      } else if (color2 === "white") {
        setPrevColor1("black");
        setColor1("black");
      } else {
        setPrevColor1("any");
        setColor1("any");
      }
    }
  }, [
    selectedPlayer1,
    selectedPlayer2,
    onPlayerSelect,
    setPrevColor1,
    setPrevColor2,
    color1,
    color2,
  ]);

  useEffect(() => {
    if (color1 === "black" && prevColor1 !== "black") {
      setColor2("white");
    } else if (color1 === "white" && prevColor1 !== "white") {
      setColor2("black");
    } else if (color2 === "black" && prevColor2 !== "black") {
      setColor1("white");
    } else if (color2 === "white" && prevColor2 !== "white") {
      setColor1("black");
    } else if (color1 === "any" && prevColor1 !== "any") {
      setColor2("any");
    } else if (color2 === "any" && prevColor2 !== "any") {
      setColor1("any");
    }
    setPrevColor1(color1);
    setPrevColor2(color2);
    onColorChange?.([color1, color2]);
  }, [
    color1,
    color2,
    onColorChange,
    prevColor1,
    prevColor2,
    setPrevColor1,
    setPrevColor2,
  ]);

  return (
    <div className="space-y-3 mb-3">
      <PlayerInput
        placeholder="Player 1"
        selectedPlayer={selectedPlayer1}
        onPlayerSelect={setSelectedPlayer1}
        playerCounts={playerCounts}
        isLoading={isLoading}
        color={color1}
        onColorChange={setColor1}
      />

      <div className="text-sm font-medium text-foreground mb-2 text-center">
        vs
      </div>
      <PlayerInput
        placeholder="Player 2"
        selectedPlayer={selectedPlayer2}
        onPlayerSelect={setSelectedPlayer2}
        playerCounts={playerCounts}
        isLoading={isLoading}
        color={color2}
        onColorChange={setColor2}
      />
    </div>
  );
}
