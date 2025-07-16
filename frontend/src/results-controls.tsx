import { Label } from "@/ui-primitives/label";
import { Separator } from "@/ui-primitives/separator";
import { Toggle } from "@/ui-primitives/toggle";
import { useTranslations } from "@/locale/use-translations";
import { SortBy } from "../../rust/wasm-search/pkg/wasm_search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui-primitives/select";
import trophyCrossedOutSvg from "./assets/icons/trophy-crossed-out.svg";
import trophySvg from "./assets/icons/trophy.svg";

interface ResultsControlsProps {
  sortResultsBy: number;
  onSortByChange: (value: string) => void;
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

  return (
    <div className="flex items-center justify-end mt-2 space-x-3 font-medium">
      <div className="flex items-center gap-2">
        <div className="text-gray-500 font-normal">{t("sort.label")}</div>
        <Select value={`${sortResultsBy}`} onValueChange={onSortByChange}>
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
