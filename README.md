# dryad

![dryad](dryad_ss.png)

Dryad talks to you trees! Easy semantic code search on any GitHub repository.

Dryad is intended to be a useful demo project and starter template for building more sophisticated
semantic search web apps.

Features:

- Automatically keeps in sync
- Built with [Convex](https://convex.dev), [OpenAI](https://openai.com),
  [Vite](https://vitejs.dev/) + [React](https://react.dev/).
- Around 1000 lines of code.
- Easy to extend, fork, and modify
- Reconfigurable on the fly in the Convex dashboard

# Running your own Dryad (on your favorite codebase)

First, clone the repository and start it up:

    $ git clone https://github.com/get-convex/dryad.git
    $ npm run dev

This will create your Convex backend deployment and attempt
to start indexing the default repository, which is
https://github.com/get-convex/convex-demos.

Launch the Convex dashboard and watch the logs to keep an eye
on progress:

    $ npx convex dashboard

You'll see errors happening about missing environment variables
in the `Logs` panel. We have a little more set up to do!

## 1. Set deployment environment variables for OpenAI and GitHub

## 2. Customize your dryad settings in the `settings` table

# How Dryad works

# "Homework" – Candidate improvements to the project
