import { FC, useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { SearchResult } from "../../convex/search";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import spinnerImage from "../assets/3-dots-bounce.svg";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";

export type CodeDisplayProps = {
  result: SearchResult;
};

const CodeDisplay: FC<CodeDisplayProps> = ({ result }) => {
  const settings = useQuery(api.settings.get);
  const [code, setCode] = useState(null as null | string);

  useEffect(() => {
    setCode(null);
    if (!settings) {
      // Wait for settings to load.
      return;
    }
    const getCode = async () => {
      const url = `https://raw.githubusercontent.com/${settings.org}/${settings.repo}/${result.treeSha}/${result.path}`;
      const body = await (await fetch(url)).text();
      setCode(body);
    };
    getCode();
  }, [settings, result]);

  if (code === null) {
    return (
      <div className="justify-center">
        Loading... <img src={spinnerImage} className="h-10" />
      </div>
    );
  } else {
    return (
      <>
        <div className="text-2xl font-bold">
          <i
            className={`devicon-${result.language.toLowerCase()}-plain mr-2`}
          ></i>
          {result.path}
        </div>
        <div className="mb-4 text-md">
          {settings && (
            <a
              href={`https://github.com/${settings.org}/${settings.repo}/blob/${result.treeSha}/${result.path}`}
              target="_blank"
              className="hover:underline text-yellow-100"
            >
              View '{result.path}' at rev {result.treeSha} on GitHub
              <ArrowTopRightOnSquareIcon className="h-4 ml-1 inline" />
            </a>
          )}
        </div>
        <SyntaxHighlighter
          className="overflow-scroll bg-slate-300"
          language={result.language.toLowerCase()}
          style={dracula}
          wrapLongLines={true}
          showLineNumbers={true}
        >
          {code}
        </SyntaxHighlighter>
      </>
    );
  }
};

export default CodeDisplay;
