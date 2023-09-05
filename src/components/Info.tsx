import { FC, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import dyradLogo from "../assets/dryad_logo.png";

export type InfoProps = {
  open: boolean;
  setOpen: (makeOpen: boolean) => void;
};

const Info: FC<InfoProps> = ({ open, setOpen }) => {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <img
                      className="h-10 w-10"
                      src={dyradLogo}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-left sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Dryad: Semantic Code Search Demo
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 my-3">
                        Dryad is a demo app and template for building semantic
                        search projects using generative AI, embeddings, and
                        Convex.
                      </p>
                      <p className="text-sm text-gray-500 my-3">
                        Dryad polls a configured GitHub repository for new
                        commits. On each new commit, any changed files are
                        downloaded and indexed to maintain a "snapshot" of the
                        semantics of all the repository's code.
                      </p>
                      <p className="text-sm text-gray-500 my-3">
                        The indexing is comprised of three steps: First, ChatGPT
                        is given the source file and asked to generate a list of
                        the top responsibilities / goals for that particular
                        file. Next, each of these goals is passed into OpenAI's
                        embeddings API to generate a vector. Finally, these
                        vectors are indexed using Convex's vector indexing.
                        Later, the same embedding API is used at search time to
                        create a vector from the query string. Vector search
                        uses cosine similarity to find all pages that have a
                        semantically similar goal to the given query string.
                      </p>
                      <p className="text-sm text-gray-500 my-3">
                        Dryad is MIT-licensed, open source, and only ~1,000
                        lines of code. So check out the GitHub repo, run your
                        own instance to index any repository you like, and
                        develop improvements to the project.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-dryad px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => setOpen(false)}
                  >
                    Go back to app
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default Info;
