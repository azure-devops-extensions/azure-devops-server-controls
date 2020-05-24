import { BuildReference } from "TFS/Build/Contracts";
import { logError } from "VSS/Diag";

/**
 * Orders build based on finish time, if finish time doesn't exist this considers queueTime
 * @param a
 * @param b
 * @param ascending
 */
export function orderBuildsByFinishTime(a: BuildReference, b: BuildReference, ascending: boolean = false): number {
    if (a.finishTime && b.finishTime) {
        if (ascending) {
            return a.finishTime.getTime() - b.finishTime.getTime();
        }
        else {
            return b.finishTime.getTime() - a.finishTime.getTime();
        }
    }
    else if (a.finishTime) {
        // b is not finished. a goes before b
        if (ascending) {
            return -1;
        }
        else {
            return 1;
        }
    }
    else if (b.finishTime) {
        // a is not finished. a goes after b
        if (ascending) {
            return 1;
        }
        else {
            return -1;
        }
    }
    else if (a.queueTime && b.queueTime) {
        // neither are finished. compare queue times
        if (ascending) {
            return a.queueTime.getTime() - b.queueTime.getTime();
        }
        else {
            return b.queueTime.getTime() - a.queueTime.getTime();
        }
    }
    else if (a.queueTime) {
        // technically builds should always have queue times, but in this case b doesn't
        // so a goes before b
        if (ascending) {
            return -1;
        }
        else {
            return 1;
        }
    }
    else if (b.queueTime) {
        // technically builds should always have queue times, but in this case a doesn't
        // so a goes after b
        if (ascending) {
            return 1;
        }
        else {
            return -1;
        }
    }
    else {
        // both builds are not even queued
        return 0;
    }
}

export interface ISortedBuilds {
    finishedBuilds: BuildReference[];
    queuedBuilds: BuildReference[];
    runningBuilds: BuildReference[];
}

/**
 * Returns sorted builds as ISortedBuilds, sorted by descending
 * @param builds
 */
export function getSortedBuilds(builds: BuildReference[]): ISortedBuilds {
    let finishedBuilds: BuildReference[] = [];
    let queuedBuilds: BuildReference[] = [];
    let runningBuilds: BuildReference[] = [];

    (builds || []).forEach((build) => {
        if (build.finishTime) {
            finishedBuilds.push(build);
        }
        else if (build.startTime) {
            runningBuilds.push(build);
        }
        else if (build.queueTime) {
            queuedBuilds.push(build);
        }
        else {
            logError("Build " + build.id + " has no queue, start or finish time");
        }
    });

    finishedBuilds = finishedBuilds.sort((a, b) => {
        return b.finishTime.getTime() - a.finishTime.getTime();
    });

    queuedBuilds = queuedBuilds.sort((a, b) => {
        return b.queueTime.getTime() - a.queueTime.getTime();
    });

    runningBuilds = runningBuilds.sort((a, b) => {
        return b.startTime.getTime() - a.startTime.getTime();
    });

    return {
        finishedBuilds: finishedBuilds,
        queuedBuilds: queuedBuilds,
        runningBuilds: runningBuilds
    };
}

export type getBuildDateFunctionType = (build: BuildReference) => Date;

/**
 * Returns sorted builds based on returned time and order asked
 * @param builds
 * @param getTime getTime for a build, if this is null, 0 is considered as time
 * @param ascending Optional, default is false
 */
export function getSortedBuildsByTime(builds: BuildReference[], getBuildDate: getBuildDateFunctionType, ascending: boolean = false): BuildReference[] {
    return (builds || []).sort((a, b) => {
        if (ascending) {
            return getTimeFromDate(getBuildDate(a)) - getTimeFromDate(getBuildDate(b));
        }
        else {
            return getTimeFromDate(getBuildDate(b)) - getTimeFromDate(getBuildDate(a));
        }
    });
}

function getTimeFromDate(date: Date): number {
    return !!date ? date.getTime() : 0;
}