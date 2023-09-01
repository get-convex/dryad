import dryadLogo from "./assets/dryad_logo.png";
import githubLogo from "./assets/Github_white.svg";
import "./App.css";
import SearchBox from "./components/SearchBox";
import { useState } from "react";
import { SearchResult } from "../convex/search";
import SearchResults from "./components/SearchResults";
import CodeDisplay from "./components/CodeDisplay";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function App() {
  const settings = useQuery(api.settings.get);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadedResult, setLoadedResult] = useState<SearchResult | null>(null);
  return (
    <div className="p-8 text-slate-200">
      <div className="flex">
        <div className="flex-initial">
          <img src={dryadLogo} className="w-24" alt="Dryad logo" />
        </div>
        <div className="flex-auto flex-col pt-6">
          <div className="text-4xl title_font">Dryad</div>
          <div className="text-xl text-slate-400 title_font">
            talk to your tree
          </div>
        </div>
        <div className="text-right">
          {settings && (
            <div className="flex-col opacity-70">
              <div className="flex-row text-center w-full">
                <div>
                  <img src={githubLogo} />
                </div>
              </div>
              <div className="text-lg">
                <a href={`https://github.com/${settings.org}/${settings.repo}`}>
                  {settings.org}/{settings.repo}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 flex">
        <div className="flex-initial min-w-64 w-1/3 px-8">
          <SearchBox update={setResults} />
          <SearchResults
            results={results}
            loadResult={(result) => {
              setLoadedResult(result);
            }}
          />
        </div>
        <div className="flex-grow px-8 border-l-emerald-200 border-l-2">
          {loadedResult ? (
            <CodeDisplay result={loadedResult} />
          ) : (
            <div>Search for something!</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
