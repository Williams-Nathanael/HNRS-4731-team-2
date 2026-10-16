# AGENTS.md

Instructions for AI coding agents (ChatGPT/Codex, Claude, Copilot, etc.) working in this repo.
Humans: read this too. It's the shared rulebook for everyone's agents.

## What this project is

This repo belongs to a group of college students in HNRS 4731. We're building an app
together by directing AI agents. People on the team have very different amounts of
programming experience, and several people (each with their own agent) will be changing
the same codebase at once. So the code has to stay **simple, readable, and easy to
change**, and every change has to be **small and easy to explain**.

The point of the project is learning how to work with agents. A clever solution that the
team can't understand is worse than a plain one they can.

## Project status

> **Keep this section current.** When the team decides something (the stack, how to run
> it, what the app does), the agent that made the change should update this section in
> the same commit.

- **App idea:** _TBD_
- **Stack:** _TBD_ (see "Choosing a stack" below)
- **How to install:** _TBD_
- **How to run locally:** _TBD_
- **How to run tests:** _TBD_
- **Deployed at:** _TBD_

## Ground rules for agents

### 1. Talk to your human like a teammate, not a vendor
- Find out how experienced your human is. If you can't tell, ask once, and then pitch
  your explanations to their level.
- Before a non-trivial change, say in plain language what you plan to do and why. Wait
  for an OK if the change is big, risky, or touches someone else's work.
- After a change, summarize what you did, which files you touched, and how to check it
  works. Leave out jargon, or explain it when you can't avoid it.
- If a request is unclear or seems like a bad idea, say so and suggest an alternative.
  Don't silently do something different from what was asked.

### 2. Keep changes small and focused
- One feature or fix per change. Don't "while I'm here" refactor unrelated code.
- Don't reformat, rename, or reorganize files you weren't asked to touch. That causes
  merge conflicts with other teammates' agents.
- If a task is big, break it into steps and do them one at a time.

### 3. Respect other people's work
- Assume any code you didn't write in this session belongs to a teammate.
- Don't delete, rewrite, or "clean up" it without telling your human first.
- If existing code looks broken or conflicts with your task, stop and explain the
  problem. Don't paper over it.

### 4. Use git so the team can collaborate
- **Never commit straight to `main`.** Make a branch for each task, named something like
  `yourname/short-description` (e.g. `alex/login-page`).
- Before starting, pull the latest `main` (`git checkout main && git pull`) and branch
  from it.
- Commit often with clear messages that say *what* changed and *why*.
- Get changes into `main` through a pull request on GitHub, so someone else can look at
  them. Help your human write a PR description a non-programmer could follow.
- Never force-push, rewrite shared history, or delete branches that aren't yours.
- If you hit a merge conflict, explain both sides to your human and decide together.
  Don't just pick one side.

### 5. Keep the app working
- `main` should always install and run. Don't merge something that breaks it.
- Actually run the app or the tests after a change, and tell your human what happened,
  including any failures. Never claim something works if you haven't checked it.
- Add or update tests for the logic you change, where it's reasonable to.

### 6. Prefer boring, beginner-friendly choices
- Use the language, framework, and patterns already in the repo. Don't bring in a second
  way of doing the same thing.
- Think hard before adding a dependency. Prefer well-known, well-documented libraries.
  When you add one, say why in the commit message.
- Write code a beginner could follow: clear names, short functions, a comment wherever
  the *why* isn't obvious.
- No premature abstraction, no code-generation magic, no unusual build tooling unless the
  team asks for it.

### 7. Security and privacy
- Never commit secrets: API keys, passwords, tokens, `.env` files. Use environment
  variables, keep a `.env.example` with placeholder values, and make sure `.env` is in
  `.gitignore`.
- If you see a secret already committed, tell your human right away. It has to be
  rotated, not just deleted.
- Don't put real personal data (other students' names, emails, grades) into code, test
  fixtures, or sample data.
- Don't run destructive commands (`rm -rf`, dropping databases, `git reset --hard`,
  force-push) without asking first.

### 8. Write things down
- If you make a decision the rest of the team should know about (a new library, a change
  to the folder structure, a new environment variable, a new command), record it in this
  file under "Project status" or "Conventions" in the same change.
- Keep `README.md` accurate for a human who just cloned the repo.

## Choosing a stack

There's no stack yet. When the team picks one, prefer something that:
- has lots of tutorials and docs, so agents and beginners both do well with it;
- runs locally with one or two commands;
- deploys easily for free (e.g. Vercel, Netlify, Render, GitHub Pages);
- doesn't need anyone to install heavy tools (Docker, databases) unless that's necessary.

Reasonable starting points, depending on the app:
- **Simple website/web app:** plain HTML/CSS/JS, or React + Vite.
- **Web app with a backend:** Next.js, or Python + Flask/FastAPI.
- **Data or AI-heavy app:** Python + Streamlit, or Flask/FastAPI.

Once it's chosen, write it in "Project status" and stick to it.

## Conventions

> Fill these in as the team settles on them.

- **Folder structure:** _TBD_
- **Code style / formatter:** _TBD_ (use the stack's standard formatter, e.g. Prettier or
  Black, and only run it on files you changed)
- **Naming:** _TBD_
