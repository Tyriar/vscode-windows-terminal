# Change Log

## 0.4.1

- Hide Cloud Shell entry when a folder is being targeted
- Support old profiles format https://github.com/Tyriar/vscode-windows-terminal/issues/7
- Increased size of extension icon https://github.com/Tyriar/vscode-windows-terminal/issues/2

## 0.4.0

- Change context menu item to "Open in Windows Terminal (Profile)" in preparation of improved built-in "Open in Terminal" labelling https://github.com/microsoft/vscode/issues/99542
- Add new "Open in Windows Terminal" context menu item to open using the default profile
- Add setting to allow hiding of each context menu item

## 0.3.0

- Support the preview channel of Windows Terminal https://github.com/Tyriar/vscode-windows-terminal/issues/6
- Added commands:
  - `windows-terminal.openActiveFilesFolder`
  - `windows-terminal.openActiveFilesFolderWithProfile`
  - `windows-terminal.open`
- Fallback to the first workspace's folder if a directory isn't opened
- Move the default profile to the top of the profile selector

## 0.2.1

- Use directory of a file for context menu command https://github.com/Tyriar/vscode-windows-terminal/issues/3

## 0.2.0

- Add icon

## 0.1.0

- Initial release
