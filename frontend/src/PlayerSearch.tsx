import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { Input } from "./components/ui/input";
import { cn } from "./lib/utils";
import { playerSearchEngine, type PlayerSuggestion } from "./playerSearch";
import cancelSvg from "@/assets/icons/cancel.svg";
import circleBlackSvg from "@/assets/icons/circle-black.svg";
import circleWhiteSvg from "@/assets/icons/circle-white.svg";
import circleBlackOrWhiteSvg from "@/assets/icons/circle-black-or-white.svg";
import chevronDownSvg from "@/assets/icons/chevron-down.svg";

type PlayerColor = "black" | "white" | "any";

type PlayerState = {
  player1: PlayerSuggestion | null;
  player2: PlayerSuggestion | null;
  color1: PlayerColor;
  color2: PlayerColor;
  prevColor1: PlayerColor;
  prevColor2: PlayerColor;
  tempDeletedPlayer1: PlayerSuggestion | null;
  tempDeletedPlayer2: PlayerSuggestion | null;
};

type PlayerAction =
  | { type: "SELECT_PLAYER_1"; player: PlayerSuggestion | null }
  | { type: "SELECT_PLAYER_2"; player: PlayerSuggestion | null }
  | { type: "SET_COLOR_1"; color: PlayerColor }
  | { type: "SET_COLOR_2"; color: PlayerColor }
  | { type: "RESET_COLORS" }
  | { type: "TEMP_DELETE_PLAYER_1" }
  | { type: "TEMP_DELETE_PLAYER_2" }
  | { type: "RESTORE_PLAYER_1" }
  | { type: "RESTORE_PLAYER_2" };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "SELECT_PLAYER_1":
      return {
        ...state,
        player1: action.player,
        tempDeletedPlayer1: null,
        // Reset colors if player is cleared or both players are cleared
        ...(action.player === null
          ? {
              color1: "any",
              prevColor1: "any",
              ...(state.player2 === null
                ? {
                    color2: "any",
                    prevColor2: "any",
                  }
                : state.color2 !== "any"
                  ? {
                      color1: state.color2 === "black" ? "white" : "black",
                    }
                  : {}),
            }
          : {}),
      };
    case "SELECT_PLAYER_2":
      return {
        ...state,
        player2: action.player,
        tempDeletedPlayer2: null,
        // Reset colors if player is cleared or both players are cleared
        ...(action.player === null
          ? {
              color2: "any",
              prevColor2: "any",
              ...(state.player1 === null
                ? {
                    color1: "any",
                    prevColor1: "any",
                  }
                : state.color1 !== "any"
                  ? {
                      color2: state.color1 === "black" ? "white" : "black",
                    }
                  : {}),
            }
          : {}),
      };
    case "TEMP_DELETE_PLAYER_1":
      return {
        ...state,
        tempDeletedPlayer1: state.player1,
        player1: null,
      };
    case "TEMP_DELETE_PLAYER_2":
      return {
        ...state,
        tempDeletedPlayer2: state.player2,
        player2: null,
      };
    case "RESTORE_PLAYER_1":
      return {
        ...state,
        player1: state.tempDeletedPlayer1,
        tempDeletedPlayer1: null,
      };
    case "RESTORE_PLAYER_2":
      return {
        ...state,
        player2: state.tempDeletedPlayer2,
        tempDeletedPlayer2: null,
      };
    case "SET_COLOR_1":
      return {
        ...state,
        color1: action.color,
        prevColor1: state.color1,
        // Update color2 based on color1
        color2:
          action.color === "black"
            ? "white"
            : action.color === "white"
              ? "black"
              : "any",
      };
    case "SET_COLOR_2":
      return {
        ...state,
        color2: action.color,
        prevColor2: state.color2,
        // Update color1 based on color2
        color1:
          action.color === "black"
            ? "white"
            : action.color === "white"
              ? "black"
              : "any",
      };
    case "RESET_COLORS":
      return {
        ...state,
        color1: "any",
        color2: "any",
        prevColor1: "any",
        prevColor2: "any",
      };
    default:
      return state;
  }
}

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
  onTempDelete: () => void;
  onRestore: () => void;
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
  onTempDelete,
  onRestore,
}: PlayerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const handlePlayerSelect = useCallback(
    (player: PlayerSuggestion | null) => {
      onPlayerSelect(player);
      setShowSuggestions(false);
      setSuggestions([]);
      setQuery("");
    },
    [onPlayerSelect],
  );

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    onRestore();
  }, [onRestore]);

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
  }, [closeSuggestions]);

  useEffect(() => {
    if (showSuggestions && !isLoading) {
      setSuggestions(playerSearchEngine.search(query, 100, playerCounts));
    }
  }, [query, playerCounts, showSuggestions, isLoading]);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      onQueryChange?.(event.target.value);
    },
    [onQueryChange],
  );

  const handleInputFocus = useCallback(() => {
    if (selectedPlayer) {
      onTempDelete();
      setTimeout(() => setShowSuggestions(true), 500);
    } else {
      setShowSuggestions(true);
    }
  }, [selectedPlayer, onTempDelete]);

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
          "absolute z-50 w-screen max-w-[50vw] bg-background border",
          "rounded-md shadow-md mt-1 max-h-96 right-0",
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
              <div className="font-medium text-base">{player.name}</div>
              <div className="text-sm text-muted-foreground/60 ml-2 flex-shrink-0">
                {(playerCounts?.[player.id] ?? player.gamesCount) > 0 &&
                  `${playerCounts?.[player.id] ?? player.gamesCount} games`}
              </div>
            </div>
            {player.aliases.length > 1 && (
              <div className="text-sm text-muted-foreground/70 truncate">
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
          <img src={circleBlackSvg} alt="Black" className="h-5 w-5" />
          <span className="text-base">Black</span>
        </button>
        <button
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent",
            "transition-colors",
          )}
          onClick={() => handleColorSelect("white")}
        >
          <img src={circleWhiteSvg} alt="White" className="h-5 w-5" />
          <span className="text-base">White</span>
        </button>
        <button
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent",
            "transition-colors",
          )}
          onClick={() => handleColorSelect("any")}
        >
          <img src={circleBlackOrWhiteSvg} alt="Any" className="h-5 w-5" />
          <span className="text-base">Any</span>
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
            "h-7 w-9 rounded-sm opacity-70 hover:opacity-100",
            "flex items-center justify-center gap-0.5",
            "text-muted-foreground hover:text-foreground",
            "transition-opacity",
            "cursor-pointer",
            "z-10",
          )}
          type="button"
        >
          <img
            src={chevronDownSvg}
            alt="Dropdown"
            className="h-3 w-3 opacity-70"
          />
          <img
            src={
              color === "black"
                ? circleBlackSvg
                : color === "white"
                  ? circleWhiteSvg
                  : circleBlackOrWhiteSvg
            }
            alt="Color"
            className="h-6 w-6"
          />
        </button>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={selectedPlayer?.name ?? query}
          onChange={handleQueryChange}
          onFocus={handleInputFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) {
              handlePlayerSelect(suggestions[0]);
              inputRef.current?.blur();
            }
          }}
          className={cn(
            "pl-12 pr-8 h-12",
            selectedPlayer && "bg-accent/20 border-primary",
          )}
        />
        {selectedPlayer && (
          <button
            onClick={deletePlayer}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "h-6 w-6 rounded-sm opacity-70 hover:opacity-100",
              "flex items-center justify-center",
              "text-muted-foreground hover:text-foreground",
              "transition-opacity",
              "cursor-pointer",
            )}
            type="button"
            tabIndex={-1}
          >
            <img src={cancelSvg} alt="Clear" className="h-5 w-5" />
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
  const [state, dispatch] = useReducer(playerReducer, {
    player1: null,
    player2: null,
    color1: "any",
    color2: "any",
    prevColor1: "any",
    prevColor2: "any",
    tempDeletedPlayer1: null,
    tempDeletedPlayer2: null,
  });

  useEffect(() => {
    const newPlayerIds: number[] = [];
    if (state.player1 != null) newPlayerIds.push(state.player1.id);
    if (state.player2 != null) newPlayerIds.push(state.player2.id);
    onPlayerSelect(newPlayerIds);
  }, [state.player1, state.player2, onPlayerSelect]);

  useEffect(() => {
    onColorChange?.([state.color1, state.color2]);
  }, [state.color1, state.color2, onColorChange]);

  return (
    <div className="flex flex-col items-center mb-3 mt-10">
      <div className="w-full max-w-xs space-y-3">
        <PlayerInput
          placeholder="Player 1"
          selectedPlayer={state.player1}
          onPlayerSelect={(player) =>
            dispatch({ type: "SELECT_PLAYER_1", player })
          }
          playerCounts={playerCounts}
          isLoading={isLoading}
          color={state.color1}
          onColorChange={(color) => dispatch({ type: "SET_COLOR_1", color })}
          onTempDelete={() => dispatch({ type: "TEMP_DELETE_PLAYER_1" })}
          onRestore={() => dispatch({ type: "RESTORE_PLAYER_1" })}
        />

        <div className="text-sm font-medium text-foreground mb-3 text-center">
          vs
        </div>
        <PlayerInput
          placeholder="Player 2"
          selectedPlayer={state.player2}
          onPlayerSelect={(player) =>
            dispatch({ type: "SELECT_PLAYER_2", player })
          }
          playerCounts={playerCounts}
          isLoading={isLoading}
          color={state.color2}
          onColorChange={(color) => dispatch({ type: "SET_COLOR_2", color })}
          onTempDelete={() => dispatch({ type: "TEMP_DELETE_PLAYER_2" })}
          onRestore={() => dispatch({ type: "RESTORE_PLAYER_2" })}
        />
      </div>
    </div>
  );
}
