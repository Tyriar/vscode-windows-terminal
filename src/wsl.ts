import { exec } from 'child_process';

export function convertWslPathToWindows(p: string, distro: string): Promise<string> {
  return runWslCommand(`wslpath -w '${p}'`, distro);
}

function runWslCommand(command: string, distro: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(`wsl.exe -d ${distro} ${command}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(stdout.trim());
    });
  });
}
