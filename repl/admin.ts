import fetch from "node-fetch";
import { IService, IServiceID } from "../shared/types/service";
import { ask, logHello, logError, logSuccess, connect, getServices } from "./util";


(async function main() {
  logHello(`ADMIN CLI`);

  await connect();


  let service: IServiceID;
  do {
      service = await ask("Which service do you want to configure (login, family, ...)") as IServiceID;
  } while(!(service in getServices()));

  
})();