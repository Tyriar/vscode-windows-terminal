## Features

**Explorer context menu**

Open a particular Windows Terminal using the default profile or selecting a custom one on a folder via the explorer's right click context menu.

![Context menu](images/context-menu.png)

These context menus can each be hidden independently using settings.

**WSL Remote support**

The context menu also works in [WSL remotes](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl), regardless of whether the terminal profile is WSL or not.

**SSH Remote support**

Opening the terminal when in a [SSH remote](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) workspace will ssh into the remote in Windows Terminal.

**Dev container support**

Opening the terminal when in a [devcontainer remote](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) workspaces will `docker exec` into the remote in Windows Terminal.

**Several commands for launching WT**

See the Feature Contributions tab for a full list of commands that can be setup with [custom keybindings](https://code.visualstudio.com/docs/getstarted/keybindings).

## Requirements

- [Windows Terminal](https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701) or [Windows Terminal Preview](https://www.microsoft.com/en-us/p/windows-terminal-preview/9n8g5rfz9xk3)

## Tips

If you do not use the integrated terminal you can change the built-in "Open in Terminal" context menu in the Explorer to open Windows Terminal's default profile by using these settings:

```json
"terminal.explorerKind": "external",
"terminal.external.windowsExec": "wt"
```
