import { logAndFail, logError } from "./log";

/* Assertions are only active in development environments,
    and ensure things that cannot be checked at compile time.
   However they check for cases that 'should not happen' and as such are overhead during runtime
   TODO: Build out in prod env
*/
export function assert(assertion: string, value: boolean) {
    if(!value) {
        logAndFail(`Assertion failed: ${assertion}`, { error: new Error(`AssertionError`) });
    }
}