import { exec } from 'child_process';

export function runDockerCommand(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(`docker ${command}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(stdout.trim());
    });
  });
}
