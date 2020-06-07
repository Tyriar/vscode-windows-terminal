import { readFile } from "fs";
import * as vscode from "vscode";
const SSHConfig = require("ssh-config");

interface IParam {
  param: string;
  value: string;
  config: Array<IParam>;
}

export function resolveSSHHostName(host: string) {
  return new Promise<any | undefined>(function (resolve, reject) {
    // get path from remote-ssh-extension config file
    const remoteSettingsPath: string | undefined = vscode.workspace
      .getConfiguration("remote.SSH")
      .get("configFile");
    if (remoteSettingsPath) {
      readFile(remoteSettingsPath, function (err, contents) {
        if (!err) {
          let resolvedHost = "";
          // parse file
          const config: Array<IParam> = SSHConfig.parse(contents.toString());
          const settings = config.find((x) => x.param.toLowerCase() === "host" && x.value === host);

          if (settings) {
            const hostname = settings.config.find((x) => x.param.toLowerCase() === "hostname");
            if (hostname && hostname.value) {
              resolvedHost += `${hostname.value}`;
            }
            const user = settings.config.find((x) => x.param.toLowerCase() === "user");
            if (user && user.value && hostname?.value) {
              resolvedHost = `${user.value}@` + resolvedHost;
            }
          }

          if (resolvedHost === "") {
            resolvedHost = host;
          }

          return resolve(resolvedHost);
        } else {
          return resolve(host);
        }
      });
    } else {
      return resolve(host);
    }
  });
}
