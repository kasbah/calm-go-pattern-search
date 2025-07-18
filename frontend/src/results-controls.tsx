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
    <div className="flex space-x-3 font-medium flex-wrap justify-center flex-col items-center lg:justify-end xl:flex-row">
      <div className="flex items-center gap-2 mb-2">
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
      <div className="flex">
        <div className="min-w-1 min-h-full invisible xl:visible">
          <Separator orientation="vertical" />
        </div>
        <div className="min-w-[120px] flex justify-right m-2 cursor-pointer">
          <Label
            htmlFor="results-toggle"
            className="cursor-pointer mr-2 whitespace-nowrap"
          >
            {showResults ? t("results.shown") : t("results.hidden")}
          </Label>
        </div>
        <Toggle
          id="results-toggle"
          onClick={onToggleShowResults}
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
      <div className="flex">
        <div className="min-w-1 min-h-full invisible xl:visible">
          <Separator orientation="vertical" />
        </div>
        <div className="min-w-[120px] p-3">
          {tc(totalNumberOfGames, "games.count")}
        </div>
      </div>
    </div>
  );
}
