import { useTranslations } from "@/locale/use-translations";
import { Label } from "@/ui-primitives/label";
import { Separator } from "@/ui-primitives/separator";
import { Toggle } from "@/ui-primitives/toggle";
import { useCallback } from "react";
import { SortBy } from "@/../../rust/wasm-search/pkg/wasm_search";
import trophyCrossedOutSvg from "./assets/icons/trophy-crossed-out.svg";
import trophySvg from "./assets/icons/trophy.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui-primitives/select";

interface ResultsControlsProps {
  sortResultsBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  showResults: boolean;
  onToggleShowResults: (e: React.MouseEvent) => void;
  totalNumberOfGames: number;
}

export default function ResultsControls({
  sortResultsBy,
  onSortByChange,
  showResults,
  onToggleShowResults,
  totalNumberOfGames,
}: ResultsControlsProps) {
  const { t, tc } = useTranslations();

  const handleSortByChange = useCallback(
    (s: string) => onSortByChange(parseInt(s, 10)),
    [onSortByChange],
  );

  return (
    <div className="flex items-center justify-end space-x-3 font-medium flex-wrap">
      <div className="flex items-center gap-2">
        <div className="text-gray-500 font-normal">{t("sort.label")}</div>
        <Select value={`${sortResultsBy}`} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-[225px]">
            <SelectValue placeholder={t("sort.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={`${SortBy.BestMatch}`}>
              {t("sort.bestMatch")}
            </SelectItem>
            <SelectItem value={`${SortBy.LeastMoves}`}>
              {t("sort.leastMoves")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator orientation="vertical" />
      <div
        className="flex items-center cursor-pointer min-w-[170px]"
        onClick={onToggleShowResults}
      >
        <div className="min-w-[120px] flex justify-right">
          <Label
            htmlFor="results-toggle"
            className="cursor-pointer mr-2 whitespace-nowrap"
          >
            {showResults ? t("results.shown") : t("results.hidden")}
          </Label>
        </div>
        <Toggle
          id="results-toggle"
          size="lg"
          pressed={!showResults}
          className="cursor-pointer"
        >
          <img
            src={showResults ? trophySvg : trophyCrossedOutSvg}
            width={24}
            height={24}
            alt={t("alt.trophy")}
          />
        </Toggle>
      </div>
      <Separator orientation="vertical" />
      <Label className="min-w-[120px]">
        {tc(totalNumberOfGames, "games.count")}
      </Label>
    </div>
  );
}
