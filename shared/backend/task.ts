import { logDebug, logError, logSuccess, logWarning, logAndFail } from "./log";
/* The task framework allows for unified logging and error handling for all tasks 
    name - the name of the task
    interval - the time till the task will be run again
                if the task is doing processing longer than the interval, 
                the next iteration will only start when processing is done and a warning will be emitted
    critical - wether to abort the whole server process if the task failed
*/
export function task({ name, task, interval, critical }: { name: string, task: () => (Promise<any | never> | any | never), interval: number, critical?: true }) {
    logDebug(`Registered task ${name}`, { name, interval, critical });

    async function run() {
        const startTime = Date.now();
        logDebug(`[TASK: ${name}] Started processing`, { startTime });
        try {
            await task();
        } catch(error) {
            if(critical) {
                logAndFail(`[TASK: ${name}] Error in critical background task, aborting.`, error);
            } else {
                logError(`[TASK: ${name}] Error in background task, rerunning in ${interval}ms`, error);
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        logSuccess(`[TASK: ${name}] Finished processing in ${duration}ms`);

        if(duration > interval)
            logWarning(`[TASK: ${name}] Took ${duration - interval} longer than interval, getting out of sync!`);

        setTimeout(run, Math.max(0, interval - duration));
    
    }

    setTimeout(run, interval);
}