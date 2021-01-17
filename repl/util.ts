import { COLORS } from "../shared/colors";
import * as readline from "readline";
import { IService, IServiceID } from "../shared/types/service";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export function logHello(hello: string) {
    console.log(
        COLORS.Reverse + COLORS.Background.Magenta +
        `THE SUITE. ${hello}.` +
        COLORS.Reset
    );
}

function newLineFormatting(msg: string): string {
    return msg.replace(/\n/g, "\n     ");
}

export function logError(msg: string) {
    console.log(COLORS.Foreground.Red + `> ⛔ ` + newLineFormatting(msg) + COLORS.Reset);
}

export function logWarning(msg: string) {
    console.log(COLORS.Foreground.Yellow + `> ⚠ ` + newLineFormatting(msg) + COLORS.Reset);
}

export function logSuccess(msg: string) {
    console.log(COLORS.Foreground.Green + `> ✅ ` + newLineFormatting(msg) + COLORS.Reset);
}

export function logInfo(msg: string) {
    console.log(COLORS.Foreground.Blue + `>  ` + newLineFormatting(msg) + COLORS.Reset);
}

export async function ask(question: string): Promise<string> {
    console.log(COLORS.Foreground.Blue + `> ` + question + COLORS.Reset);
    return new Promise(res => rl.question("< ", res));
}

export async function yes(question: string): Promise<boolean> {
    console.log(COLORS.Foreground.Blue + `> ` + question + " (yes / no)"+ COLORS.Reset);
    let response: string;
    do { response = await new Promise(res => rl.question("< ", res)); } while(!["y", "yes", "n", "no"].includes(response));
    return response[0] === "y";
}


let url: string = null, services: { [id in IServiceID]: IService } = null;
let token: string;

export function getServices() { return services; }

export async function connect() {

    do {
        try {
            url = await ask("Under which URL can one of the SUITE services be found");
            if (!url.startsWith("http://") && !url.startsWith("https://"))
                url = `http://${url}`;

            services = await (await fetch(`${url}/api/global-config`)).json();
        } catch (error) {
            url = null;
            logError(`Unable to find service under that URL.`);
        }
    } while (!url);


    do {
        token = await ask("Admin Token:");
        const result = await fetch(`${url}/api/admin/verify-token`, {
            headers: {
                'Service': 'admin',
                'ServiceToken': token,
            }
        });

        if (!result.ok) {
            logError(`Invalid token`);
            token = null;
        }
    } while (!token);

    logSuccess(`Successfully connected to the suite`);
}
function fetchService(service: IServiceID, method: "GET" | "POST", path: string, body?: object) {
    return fetch(`${services[service].url}${path}`, {
        method,
        headers: {
            'Service': 'admin',
            'ServiceToken': token,
        },
        body: body && JSON.stringify(body),
    })
}