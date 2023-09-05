import {
  ArrowPathIcon,
  DocumentMinusIcon,
  DocumentPlusIcon,
  HandThumbUpIcon,
} from "@heroicons/react/20/solid";
import { FC } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function entryToVisual(entry: Doc<"log">) {
  const shortSha = `${entry.sha.substring(0, 8)}...`;
  if (entry.operator === "start") {
    const content = (
      <span>
        Starting sync of repoistory commit <strong>{shortSha}</strong>
      </span>
    );
    return { iconClass: "bg-orange-400", icon: ArrowPathIcon, content };
  } else if (entry.operator === "add") {
    const content = (
      <span>
        Indexing new/changed file <strong>{entry.path}</strong> with SHA{" "}
        <strong>{shortSha}</strong>
      </span>
    );
    return { iconClass: "bg-green-400", icon: DocumentPlusIcon, content };
  } else if (entry.operator === "cleanup") {
    const content = (
      <span>
        Removing missing file <strong>{entry.path}</strong> with SHA{" "}
        <strong>{shortSha}</strong>
      </span>
    );
    return { iconClass: "bg-red-400", icon: DocumentMinusIcon, content };
  } else if (entry.operator === "finish") {
    const content = (
      <span>
        Successfully indexed all content at repository commit{" "}
        <strong>{shortSha}</strong>
      </span>
    );
    return { iconClass: "bg-blue-400", icon: HandThumbUpIcon, content };
  }
  throw "no such value";
}

const EventLog: FC<unknown> = () => {
  const entries = useQuery(api.log.get) ?? [];
  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {entries.map((entry, idx) => {
          const ui = entryToVisual(entry);
          return (
            <li key={entry._id}>
              <div className="relative pb-8">
                {idx !== entries.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={classNames(
                        ui?.iconClass,
                        "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white",
                      )}
                    >
                      <ui.icon
                        className="h-5 w-5 text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        {ui.content}
                        {/* {event.content}{" "} */}
                        {/* <a
                          href={event.href}
                          className="font-medium text-gray-900"
                        >
                          {event.target}
                        </a> */}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      {/* <time dateTime={event.datetime}>{event.date}</time> */}
                      {new Date(entry._creationTime).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
export default EventLog;
