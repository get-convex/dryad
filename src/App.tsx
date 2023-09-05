import dryadLogo from "./assets/dryad_logo.png";
import githubLogo from "./assets/Github_white.svg";
import convexLogo from "./assets/convex_logo.svg";
import "./App.css";
import SearchBox from "./components/SearchBox";
import { useRef, useState } from "react";
import { SearchResult } from "../convex/search";
import SearchResults from "./components/SearchResults";
import CodeDisplay from "./components/CodeDisplay";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Info from "./components/Info";
import EventLog from "./components/EventLog";

function App() {
  const settings = useQuery(api.settings.get);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadedResult, setLoadedResult] = useState<SearchResult | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const codeDisplayRef = useRef(null);
  return (
    <div className="flex flex-col h-screen justify-between">
      <main className="p-8 text-slate-200">
        <div className="flex flex-wrap">
          <div className="flex-initial">
            <img src={dryadLogo} className="w-32" alt="Dryad logo" />
          </div>
          <div className="flex flex-auto flex-col pt-6">
            <div className="text-7xl title_font">dryad</div>
            <div className="text-3xl text-slate-400 title_font">
              talk to your tree
            </div>
          </div>
          <div className="flex flex-auto flex-col pt-6 w-32">
            <div className="mb-2">
              Indexing events{" "}
              <span className="animate-pulse text-yellow-100">live</span>
            </div>
            <div className="overflow-y-scroll h-32 rounded-lg p-8 bg-slate-800">
              <EventLog />
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap md:flex-nowrap">
          <div className="flex-initial md:min-w-1/3 md:w-1/3 px-8">
            <SearchBox
              update={setResults}
              newSearch={() => {
                setResults([]);
                setLoadedResult(null);
              }}
            />
            <SearchResults
              results={results}
              loadResult={(result) => {
                if (codeDisplayRef.current !== null) {
                  (codeDisplayRef.current as HTMLElement).scrollIntoView(true);
                }
                setLoadedResult(result);
              }}
            />
          </div>
          <div
            ref={codeDisplayRef}
            className="flex-grow px-8 md:border-l-emerald-200 md:border-l-2"
          >
            {loadedResult ? (
              <CodeDisplay result={loadedResult} />
            ) : results.length === 0 ? (
              <div>Search for something!</div>
            ) : (
              <div>Pick a file to dive into the code</div>
            )}
          </div>
        </div>
        <Info open={infoOpen} setOpen={setInfoOpen} />
      </main>
      <footer className="h-12 texture-footer">
        {settings && (
          <div className="flex-row text-slate-200 md:font-semibold text-center text-xs md:text-lg mt-2">
            <span className="mb-4 pr-4 border-r-2">
              <span className="hidden md:inline">A </span>
              <a target="_blank" href="https://convex.dev">
                <img src={convexLogo} className="h-4 md:h-10 pb-1 inline" />
              </a>{" "}
              <span className="hidden md:inline">jam</span>
            </span>
            <span
              className="hover:underline cursor-pointer px-4 border-r-2"
              onClick={() => setInfoOpen(true)}
            >
              What is this?
            </span>
            <span className="pl-4">
              <a
                href="https://github.com/get-convex/dryad"
                className="hover:underline"
                target="_blank"
              >
                Fork dryad
                <span className="hidden md:inline">
                  {" "}and index <em>your</em> code
                </span>
                <img src={githubLogo} className="pl-2 pb-1 h-6 inline" />
              </a>
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
