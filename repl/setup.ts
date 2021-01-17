import { logWarning } from "../shared/backend/log";
import { IServiceID } from "../shared/types/service";
import { logHello, logInfo, yes } from "./util"

(async function setup() {
    logHello("SETUP");

    const setupServices: IServiceID[] = [];

    const serviceInfos = [
        { 
            name: "login",
            description: "A Login Service which all other Suite services authenticate against.\nAccounts and Permissions can be managed using this service.\nIn the future, external services can authenticate with Open ID Connect.",
            mandatory: true,
        },
        {
            name: "family",
            description: "A place to keep all the nice stories your grandparents told you, and the stories you'll tell your grandchildren.\nAdd photos, peoples, relationships, and wander through them."
        }
    ];

    for(const serviceInfo of serviceInfos) {
        logInfo(`------- SUITE SERVICE: ${serviceInfo.name} -------`);
        logInfo(serviceInfo.description);
        if(serviceInfo.mandatory) {
           logWarning("This service is required for the suite to function.\nOnly skip installation if you have this service running elsewhere");
        }
        const install = yes(`Do you want to install ${serviceInfo.name.toUpperCase()}`);
        if(install) setupServices.push(serviceInfo.name as IServiceID);
    }

})();