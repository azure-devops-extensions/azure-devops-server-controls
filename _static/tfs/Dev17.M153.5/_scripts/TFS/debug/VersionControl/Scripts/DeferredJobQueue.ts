import * as Q from "q";
import * as VSS from "VSS/VSS";

export enum StartTriggers {
    LoadEvent,
}

export type Job = () => IPromise<void>;

/**
 * Creates a work queue that can be triggered off page load or manually. Work queue
 * accepts promise-returning functions. Initially used to queue up work after page-load.
 */
export class DeferredWorkQueue {
    private static DELAY_BETWEEN_JOBS = 50;

    private jobQueue: Job[] = [];
    private hasProcessingEventOccurred = false;
    private isProcessingJobs = false;

    /**
     * Construct the queue.
     * @param startTrigger
     */
    constructor(startTrigger?: StartTriggers) {
        switch (startTrigger) {
            case StartTriggers.LoadEvent:
                if (document.readyState === "complete") {
                    // Already loaded, start processing
                    this.startProcessing();
                }
                else {
                    // Not yet loaded, queue up on load
                    $(window).load(this.startProcessing.bind(this));
                }
                break;
            default:
                break;
        }
    }

    /**
     * Queue up a job using a promise or a promise-returning function.
     * @param job
     */
    queue(job: Job): this {
        if (!job) {
            throw new Error("job is undefined");
        }

        this.jobQueue.push(job);

        if (this.hasProcessingEventOccurred && !this.isProcessingJobs) {
            this.processJobsIfNecessary();
        }

        return this;
    }

    /**
     * Can be called manually, or if a start trigger was provided to the constructor, is
     * called automatically upon the appropriate event.
     */
    startProcessing() {
        if (this.hasProcessingEventOccurred) {
            throw new Error("Processing was already started");
        }

        this.hasProcessingEventOccurred = true;
        this.processJobsIfNecessary();
    }

    private processJobsIfNecessary = () => {
        const currentJob = this.jobQueue.shift();
        if (currentJob) {
            this.isProcessingJobs = true;

            Q.delay(DeferredWorkQueue.DELAY_BETWEEN_JOBS)
                .then(currentJob)
                .timeout(10000, "Deferred job took >10s") /* Does not abort work. Only causes new 
                                                             promise to reject so that queue can
                                                             continue processing. */
                .finally(this.processJobsIfNecessary)
                .done(() => { }, () => { }); // Don't leak the promise rejection and pollute CI.

        }
        else {
            this.isProcessingJobs = false;
        }
    }
}

const globalLoadEventQueue = new DeferredWorkQueue(StartTriggers.LoadEvent);

/**
 * Queue up a job in the global job queue that will be performed some time after the
 * window.load event
 * @param job
 */
export function queueGlobalLoadEventJob(job: Job) {
    globalLoadEventQueue.queue(job);
}

/**
 * Queue one or more modules to preload them after window.load
 * @param moduleName A module name or an array with multiple names
 */
export function queueModulePreload(moduleName: string | string[]) {
    const moduleNames = Array.isArray(moduleName)
        ? moduleName
        : [moduleName];

    queueGlobalLoadEventJob(() => preloadModules(moduleNames));
}

function preloadModules(moduleNames: string[]): IPromise<void> {
    return Q.Promise<void>(resolve => VSS.using(moduleNames, resolve));
}
