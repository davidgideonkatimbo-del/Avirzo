# Avirzo v2.9.9 — Projects survive sign-out and sign-in

- Signing out saves the open film to the cloud library first (when signed in and work exists), then clears the workspace so the next session starts clean.
- Signing back in reloads the project list; open a film from Projects to restore story, scenes, characters and timeline.
- Autosave: about 4 seconds after the last edit to a saved project, a snapshot is written to the cloud library.
- `resetWorkspace` / `newProject` cleanly separate “clear the open film” from “start a named new project”.
- Version strings unified at 2.9.9.
- Release test asserts the persistence contract in `client/src/main.jsx`.
