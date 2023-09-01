import { FC } from "react";
import { SearchResult } from "../../convex/search";

export type SearchResultsProps = {
  results: SearchResult[];
  loadResult: (result: SearchResult) => void;
};
import { ChevronRightIcon } from "@heroicons/react/20/solid";

const SearchResults: FC<SearchResultsProps> = ({ results, loadResult }) => {
  return (
    <ul role="list" className="space-y-3 my-5">
      {results.map((r) => {
        return (
          <li
            key={r.path}
            className="overflow-hidden hover:bg-amber-100 bg-amber-50 px-2 py-3 shadow sm:rounded-md sm:px-6 cursor-pointer"
            onClick={(e) => {
              loadResult(r);
              e.preventDefault();
            }}
          >
            <ChevronRightIcon className="w-6 z-10 absolute" />
            <div className="flex-col text-slate-700">
              <div className="flex-row text-ellipsis overflow-hidden text-nowrap">
                <i className={`devicon-${r.language.toLowerCase()}-plain`}></i>
                <span className="text-sm ">{r.path}</span>
              </div>
              <div className="text-xs">{r.goal}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default SearchResults;
