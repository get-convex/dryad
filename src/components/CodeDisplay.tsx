import { FC, useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { SearchResult } from "../../convex/search";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import spinnerImage from "../assets/3-dots-bounce.svg";

export type CodeDisplayProps = {
  result: SearchResult;
};

// TODO -- pin to sha to make sure we get it!
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
      const url = `https://raw.githubusercontent.com/${settings.org}/${settings.repo}/${settings.branch}/${result.path}`;
      const body = await (await fetch(url)).text();
      setCode(body);
    };
    getCode();
  }, [settings, result]);

  if (code === null) {
    <div>
      <img src={spinnerImage} />
    </div>;
  } else {
    return (
      <SyntaxHighlighter
        class="overflow-scroll bg-slate-300"
        language={result.language}
        style={dracula}
      >
        {code}
      </SyntaxHighlighter>
    );
  }
};

export default CodeDisplay;
