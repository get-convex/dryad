import { FC } from "react";
import { SearchResult } from "../../convex/search";

export type SearchResultsProps = {
  results: SearchResult[];
  loadResult: (result: SearchResult) => void;
};

const SearchResults: FC<SearchResultsProps> = ({ results, loadResult }) => {
  return (
    <ul role="list" className="space-y-3 my-5">
      {results.map((r, i) => {
        return (
          <li
            key={r.path}
            className="overflow-hidden hover:bg-amber-100 bg-amber-50 px-2 py-3 shadow sm:rounded-md sm:px-6 cursor-pointer"
            onClick={(e) => {
              loadResult(r);
              e.preventDefault();
            }}
          >
            <div className="flex-col text-slate-700">
              <div>
                <span className="text-lg">#{i + 1}</span> (
                <span className="text-slate-500">
                  {(r.score * 100.0).toPrecision(3)}% match)
                </span>
              </div>
              <div className="flex-row text-ellipsis overflow-hidden text-nowrap">
                <i
                  className={`devicon-${r.language.toLowerCase()}-plain text-lg mr-2`}
                ></i>
                <span className="text-md mb-1 inline-block font-bold">
                  {r.path}
                </span>
              </div>
              <div className="text-sm">{r.goal}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default SearchResults;
