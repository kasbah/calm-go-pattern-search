import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
} from "react";
import { Input } from "@/ui-primitives/input";
import { cn } from "@/utils";
import {
  playerFuzzyMatcher,
  type PlayerSuggestion,
} from "./player-fuzzy-matcher";
import type { PlayerFilter } from "@/wasm-search-types";
import cancelSvg from "@/assets/icons/cancel.svg";
import circleBlackSvg from "@/assets/icons/circle-black.svg";
import circleWhiteSvg from "@/assets/icons/circle-white.svg";
import circleBlackOrWhiteSvg from "@/assets/icons/circle-black-or-white.svg";
import chevronDownSvg from "@/assets/icons/chevron-down.svg";

export type PlayerColor = "Black" | "White" | "Any";

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
              color1: "Any",
              prevColor1: "Any",
              ...(state.player2 === null
                ? {
                    color2: "Any",
                    prevColor2: "Any",
                  }
                : state.color2 !== "Any"
                  ? {
                      color1: state.color2 === "Black" ? "White" : "Black",
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
              color2: "Any",
              prevColor2: "Any",
              ...(state.player1 === null
                ? {
                    color1: "Any",
                    prevColor1: "Any",
                  }
                : state.color1 !== "Any"
                  ? {
                      color2: state.color1 === "Black" ? "White" : "Black",
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
          action.color === "Black"
            ? "White"
            : action.color === "White"
              ? "Black"
              : "Any",
      };
    case "SET_COLOR_2":
      return {
        ...state,
        color2: action.color,
        prevColor2: state.color2,
        // Update color1 based on color2
        color1:
          action.color === "Black"
            ? "White"
            : action.color === "White"
              ? "Black"
              : "Any",
      };
    case "RESET_COLORS":
      return {
        ...state,
        color1: "Any",
        color2: "Any",
        prevColor1: "Any",
        prevColor2: "Any",
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
  color = "Any",
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
      setSuggestions(playerFuzzyMatcher.match(query, 100, playerCounts));
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
          "absolute z-50 w-screen max-w-[60vw] bg-background border",
          "rounded-md shadow-md mt-1 max-h-96 right-0",
          "overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20",
          "scrollbar-track-transparent",
        )}
      >
        {suggestions.map((player) => (
          <div
            key={player.id}
            className={cn(
              "px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors",
              "hover:bg-accent/50 hover:text-accent-foreground",
              "focus:bg-accent/50 focus:text-accent-foreground focus:outline-none",
            )}
            onClick={() => handlePlayerSelect(player)}
            role="option"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-lg">{player.name}</div>
              <div className="text-base text-muted-foreground/60 ml-2 flex-shrink-0">
                {(playerCounts?.[player.id] ?? player.gamesCount) > 0 &&
                  `${playerCounts?.[player.id] ?? player.gamesCount} games`}
              </div>
            </div>
            {player.aliases.length > 1 && (
              <div className="text-base text-muted-foreground/70 truncate">
                {player.aliases.slice(0, 10).join(", ")}
                {player.aliases.length > 10 && "..."}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleSelectBlack = useCallback(
    () => handleColorSelect("Black"),
    [handleColorSelect],
  );
  const handleSelectWhite = useCallback(
    () => handleColorSelect("White"),
    [handleColorSelect],
  );
  const handleSelectAny = useCallback(
    () => handleColorSelect("Any"),
    [handleColorSelect],
  );

  const renderColorDropdown = () => {
    if (!showColorDropdown) return null;

    return (
      <div
        ref={colorDropdownRef}
        className={cn(
          "absolute z-50 left-0 mt-1 w-36 bg-background border",
          "rounded-md shadow-md",
          "overflow-hidden",
        )}
      >
        <button
          className={cn(
            "w-full px-4 py-3 flex items-center gap-2 hover:bg-accent/50",
            "transition-colors cursor-pointer",
          )}
          onClick={handleSelectBlack}
        >
          <img src={circleBlackSvg} alt="Black" className="h-6 w-6" />
          <span className="text-lg">Black</span>
        </button>
        <button
          className={cn(
            "w-full px-4 py-3 flex items-center gap-2 hover:bg-accent/50",
            "transition-colors cursor-pointer",
          )}
          onClick={handleSelectWhite}
        >
          <img src={circleWhiteSvg} alt="White" className="h-6 w-6" />
          <span className="text-lg">White</span>
        </button>
        <button
          className={cn(
            "w-full px-4 py-3 flex items-center gap-2 hover:bg-accent/50",
            "transition-colors cursor-pointer",
          )}
          onClick={handleSelectAny}
        >
          <img src={circleBlackOrWhiteSvg} alt="Any" className="h-6 w-6" />
          <span className="text-lg">Any</span>
        </button>
      </div>
    );
  };

  const toggleColorDropdown = useCallback(() => {
    setShowColorDropdown(!showColorDropdown);
  }, [showColorDropdown]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && suggestions.length > 0) {
        handlePlayerSelect(suggestions[0]);
        inputRef.current?.blur();
      }
    },
    [suggestions, handlePlayerSelect],
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <button
          onClick={toggleColorDropdown}
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2",
            "h-8 w-10 rounded-sm opacity-70 hover:opacity-100",
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
            className="h-4 w-4 opacity-70"
          />
          <img
            src={
              color === "Black"
                ? circleBlackSvg
                : color === "White"
                  ? circleWhiteSvg
                  : circleBlackOrWhiteSvg
            }
            alt="Color"
            className="h-7 w-7"
          />
        </button>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={selectedPlayer?.name ?? query}
          onChange={handleQueryChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-14 pr-10 h-14 text-lg",
            selectedPlayer && "bg-accent/20 border-primary",
          )}
        />
        {selectedPlayer && (
          <button
            onClick={deletePlayer}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "h-7 w-7 rounded-sm opacity-70 hover:opacity-100",
              "flex items-center justify-center",
              "text-muted-foreground hover:text-foreground",
              "transition-opacity",
              "cursor-pointer",
            )}
            type="button"
            tabIndex={-1}
          >
            <img src={cancelSvg} alt="Clear" className="h-6 w-6" />
          </button>
        )}
      </div>
      {renderColorDropdown()}
      {renderSuggestions()}
    </div>
  );
}

export type PlayerFilterInputsProps = {
  onPlayerSelect: (playerFilters: PlayerFilter[]) => void;
  playerCounts: Record<number, number>;
  isLoading: boolean;
  initialPlayerFilters: PlayerFilter[];
};

export type PlayerFilterInputsRef = {
  addPlayer: (playerId: number, color?: PlayerColor) => void;
};
const PlayerFilterInputs = React.forwardRef<
  PlayerFilterInputsRef,
  PlayerFilterInputsProps
>(({ onPlayerSelect, playerCounts, isLoading, initialPlayerFilters }, ref) => {
  const initialPlayer1 = playerFuzzyMatcher.getPlayerById(
    initialPlayerFilters[0]?.player_id,
  );
  const initialPlayer2 = playerFuzzyMatcher.getPlayerById(
    initialPlayerFilters[1]?.player_id,
  );

  const initialColor1 = initialPlayerFilters[0]?.color ?? "Any";
  const initialColor2 =
    initialColor1 === "Black"
      ? "White"
      : initialColor1 === "White"
        ? "Black"
        : (initialPlayerFilters[1]?.color ?? "Any");

  const [state, dispatch] = useReducer(playerReducer, {
    player1: initialPlayer1,
    player2: initialPlayer2,
    color1: initialColor1,
    color2: initialColor2,
    prevColor1: "Any",
    prevColor2: "Any",
    tempDeletedPlayer1: null,
    tempDeletedPlayer2: null,
  });

  const addPlayer = useCallback(
    (playerId: number, color: PlayerColor = "Any") => {
      // Convert the player to a PlayerSuggestion
      const existingPlayer = playerFuzzyMatcher.getPlayerById(playerId);
      if (existingPlayer) {
        // Check if player is already selected and update their color
        if (state.player1?.id === playerId) {
          dispatch({ type: "SET_COLOR_1", color });
          return;
        }
        if (state.player2?.id === playerId) {
          dispatch({ type: "SET_COLOR_2", color });
          return;
        }

        // Player is not selected, add them with the specified color
        // Find the first empty slot, or replace player1 if both are filled
        if (state.player1 === null) {
          dispatch({ type: "SELECT_PLAYER_1", player: existingPlayer });
          dispatch({ type: "SET_COLOR_1", color });
        } else if (state.player2 === null) {
          dispatch({ type: "SELECT_PLAYER_2", player: existingPlayer });
          dispatch({ type: "SET_COLOR_2", color });
        } else {
          // Both slots are filled, replace player1
          dispatch({ type: "SELECT_PLAYER_1", player: existingPlayer });
          dispatch({ type: "SET_COLOR_1", color });
        }
      }
    },
    [state.player1, state.player2],
  );

  const handlePlayer1Select = useCallback(
    (player: PlayerSuggestion | null) =>
      dispatch({ type: "SELECT_PLAYER_1", player }),
    [dispatch],
  );

  const handlePlayer1ColorChange = useCallback(
    (color: PlayerColor) => dispatch({ type: "SET_COLOR_1", color }),
    [dispatch],
  );

  const handlePlayer1TempDelete = useCallback(
    () => dispatch({ type: "TEMP_DELETE_PLAYER_1" }),
    [dispatch],
  );

  const handlePlayer1Restore = useCallback(
    () => dispatch({ type: "RESTORE_PLAYER_1" }),
    [dispatch],
  );

  const handlePlayer2Select = useCallback(
    (player: PlayerSuggestion | null) =>
      dispatch({ type: "SELECT_PLAYER_2", player }),
    [dispatch],
  );

  const handlePlayer2ColorChange = useCallback(
    (color: PlayerColor) => dispatch({ type: "SET_COLOR_2", color }),
    [dispatch],
  );

  const handlePlayer2TempDelete = useCallback(
    () => dispatch({ type: "TEMP_DELETE_PLAYER_2" }),
    [dispatch],
  );

  const handlePlayer2Restore = useCallback(
    () => dispatch({ type: "RESTORE_PLAYER_2" }),
    [dispatch],
  );

  React.useImperativeHandle(ref, () => ({
    addPlayer,
  }));

  useEffect(() => {
    const newPlayerFilters: PlayerFilter[] = [];
    if (state.player1 != null) {
      newPlayerFilters.push({
        player_id: state.player1.id,
        color:
          state.color1 === "Any"
            ? null
            : state.color1 === "Black"
              ? "Black"
              : "White",
      });
    }
    if (state.player2 != null) {
      newPlayerFilters.push({
        player_id: state.player2.id,
        color:
          state.color2 === "Any"
            ? null
            : state.color2 === "Black"
              ? "Black"
              : "White",
      });
    }
    onPlayerSelect(newPlayerFilters);
  }, [
    state.player1,
    state.player2,
    state.color1,
    state.color2,
    onPlayerSelect,
  ]);

  return (
    <div className="flex flex-col items-center justify-center mb-6 mr-50 mt-10">
      <div className="w-full max-w-md space-y-4">
        <PlayerInput
          placeholder="Player 1"
          selectedPlayer={state.player1}
          onPlayerSelect={handlePlayer1Select}
          playerCounts={playerCounts}
          isLoading={isLoading}
          color={state.color1}
          onColorChange={handlePlayer1ColorChange}
          onTempDelete={handlePlayer1TempDelete}
          onRestore={handlePlayer1Restore}
        />

        <div className="text-lg font-medium text-foreground mb-4 text-center">
          vs
        </div>
        <PlayerInput
          placeholder="Player 2"
          selectedPlayer={state.player2}
          onPlayerSelect={handlePlayer2Select}
          playerCounts={playerCounts}
          isLoading={isLoading}
          color={state.color2}
          onColorChange={handlePlayer2ColorChange}
          onTempDelete={handlePlayer2TempDelete}
          onRestore={handlePlayer2Restore}
        />
      </div>
    </div>
  );
});

PlayerFilterInputs.displayName = "PlayerFilterInputs";

export default PlayerFilterInputs;
