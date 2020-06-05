import { exec } from "child_process";

export async function toWindowsPath(p: string, distro: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(`wsl.exe -d ${distro} wslpath -w ${p}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            resolve(stdout.trim());
        });
    });
}