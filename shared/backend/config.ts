import { IServiceID, IService, IGlobalConfig } from "./../types/service";

import * as fs from "fs";

const CONFIG_PATH = "/etc/suite/global-config.json";
const LOCAL_CONFIG_PATH = __dirname + "/../../../global-config.json";

let configData: string;

try {
    if(fs.existsSync(CONFIG_PATH)) {
      configData = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
    } else {
        console.log(`No global configuration found, falling back to ${LOCAL_CONFIG_PATH}`);
        configData = fs.readFileSync(LOCAL_CONFIG_PATH, { encoding: "utf-8" });
    }
} catch(error) {
    console.error(error);
    throw new Error(`Failed to load Global Configuration! Have you placed it in ${CONFIG_PATH}?`);
}



let config: { services: { [service_id in IServiceID]: IService }, global: IGlobalConfig };
try {
    config = JSON.parse(configData);

    for(const [id, entry] of Object.entries(config.services))
      entry.id = id as IServiceID;
} catch(error) {
    console.error(error);
    throw new Error(`Failed to load config as it contains syntax errors. Is it proper JSON?`);
}

export function getGlobalConfig() {
  return config.global;
}

/* retrieves the configuration of a specific service.
   in the future, the config will be split up into multiple files */
export function getConfig(service_id: string): IService | undefined;
export function getConfig(service_id: IServiceID): IService;
export function getConfig(service_id: IServiceID | string): IService | undefined {
    return config.services[service_id];
}

export function globalConfigEndpoint(req: {}, res: { json(json: object); }) {
    const exposedConfig = {};
    for(const [service_id, { name, url, id }] of Object.entries(config.services))
        exposedConfig[service_id] = { url, name, id };

    return res.json(exposedConfig);
}