import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRef, FC } from "react";
import { useKeys } from "rooks";
import { SearchResult } from "../../convex/search";

export type SearchProps = {
  update: (results: SearchResult[]) => void;
};

const SearchBox: FC<SearchProps> = ({ update }) => {
  const inputRef = useRef(null);
  const containerRef = useRef(document);
  const search = useAction(api.search.search);
  const settings = useQuery(api.settings.get);

  useKeys(
    ["Meta", "k"],
    (e) => {
      console.log("called!");
      if (inputRef.current) {
        const input = inputRef.current as HTMLInputElement;
        input.focus();
      }
      e.preventDefault();
    },
    {
      target: containerRef,
      preventLostKeyup: true,
    }
  );
  useKeys(
    ["Enter"],
    (e) => {
      console.log("submit!");
      if (inputRef.current) {
        const input = inputRef.current as HTMLInputElement;
        const query = input.value;
        const executeAction = async () => {
          const results = await search({ query });
          update(results);
        };
        executeAction();
      }
      e.preventDefault();
    },
    {
      target: inputRef,
      preventLostKeyup: true,
    }
  );
  return (
    <div>
      <label htmlFor="search" className="block text-md font-medium leading-6">
        Find me code{" "}
        {settings && (
          <>
            in{" "}
            <a
              className="text-lg text-yellow-200"
              href={`https://github.com/${settings.org}/${settings.repo}`}
            >
              {settings.org}/{settings.repo}
            </a>{" "}
          </>
        )}
        that...
      </label>
      <div className="relative mt-2 flex items-center">
        <input
          placeholder="authenticates users"
          ref={inputRef}
          type="text"
          name="search"
          id="search"
          className="block w-full rounded-md border-0 py-1.5 pr-14 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
          <kbd className="inline-flex items-center rounded border border-gray-200 px-1 font-sans text-xs text-gray-400">
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  );
};

export default SearchBox;
