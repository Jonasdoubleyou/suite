import * as process from "process";
import { COLORS } from "../colors";


function colorize(color: keyof (typeof COLORS)["Foreground"], message: string) {
    return (
        COLORS.Foreground[color] +
        message +
        COLORS.Reset
    );
}

/* At the moment, these wrappers might seem unnecessary.
   But in the future, a proper log collection framework might be introduced,
   and in that case migration becomes an ease */

export function logDebug(message: string, value?: any) {
    console.log("   " + message, value);
}

export function logSuccess(message: string, value?: any) {
    console.log(colorize("Green", "✅ " + message), value);
}

export function logWarning(message: string, value?: any) {
    console.log(colorize("Yellow", "⚠ " + message), value);
}

export function logError(message: string, value?: any) {
    console.error(colorize("Red", "❌ " + message), value);
}

export function logAndFail(message: string, value?: any) {
    console.error(colorize("Red", "⛔ " + message), value);
    process.exit(1);
}

console.log(colorize("Green", 
`\n\n\n
.___________. __    __   _______         _______. __    __   __  .___________. _______ 
|           ||  |  |  | |   ____|       /       ||  |  |  | |  | |           ||   ____| 
'---|  |----'|  |__|  | |  |__         |   (----'|  |  |  | |  | '---|  |----'|  |__    
    |  |     |   __   | |   __|         \   \    |  |  |  | |  |     |  |     |   __|   
    |  |     |  |  |  | |  |____    .----)   |   |  '--'  | |  |     |  |     |  |____  
    |__|     |__|  |__| |_______|   |_______/     \______/  |__|     |__|     |_______| \n\n\n`
))