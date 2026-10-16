# CLAUDE.md

The shared instructions for every agent on this project live in `AGENTS.md`, so that
ChatGPT/Codex, Claude, and the rest all follow the same rules. Read and follow them:

@AGENTS.md

## Claude-specific notes

- Treat `AGENTS.md` as the source of truth. When project info changes (stack, commands,
  conventions), update `AGENTS.md`, not this file, so non-Claude agents see it too.
  Only Claude-specific instructions go here.
- Personal preferences that aren't team rules (your own explanation style, editor
  quirks) go in `CLAUDE.local.md`, which is gitignored, or in your user-level
  `~/.claude/CLAUDE.md`, not in this shared file.
- For anything bigger than a small fix, use plan mode first: lay out the steps and have
  your human approve them before you edit files.
- Don't commit or push unless your human asks. When they do, follow the branch and PR
  rules in `AGENTS.md`.
