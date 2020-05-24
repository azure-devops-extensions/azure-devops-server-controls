import * as Utils_Array from "VSS/Utils/Array";
import * as  Utils_String from "VSS/Utils/String";

import { ITeam, IInterval } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { TimelineIterationStatusCode, TimelineTeamStatusCode } from "TFS/Work/Contracts";

/**
 * Collection of interval helper functions
 */
export class IntervalHelperFunctions {

    /**
     * Merge two array of intervals and sort by start date
     * @param intervals1 first array of IInterval to merge
     * @param intervals2 second array of IInterval to merge
     * @returns union of two intervals and sorted by start date
     */
    public static mergeIntervals(existingIntervals: IInterval[], newIntervals: IInterval[]): IInterval[] {
        if (!existingIntervals) {
            throw Error("intervals1 must be defined");
        }

        if (!newIntervals) {
            throw Error("intervals2 must be defined");
        }

        // If the team status is in error we will have a single interval (the error to display). Remove all existing intervals and replace with this single new interval.
        if (newIntervals.length === 1 && newIntervals[0].teamStatus.type !== TimelineTeamStatusCode.OK) {
            return newIntervals;
        }

        let intervals = Utils_Array.union(existingIntervals, newIntervals, (a: IInterval, b: IInterval) => { return Utils_String.localeIgnoreCaseComparer(a.id, b.id); });
        IntervalHelperFunctions.coalesceOverlappingIntervals(intervals);
        return intervals;
    }

    /**
     * Coalesce overlapping intervals into a single overlap interval.
     * @param intervals the set of intervals to reduce
     */
    public static coalesceOverlappingIntervals(intervals: IInterval[]) {
        if (!intervals) {
            throw Error("intervals must be defined");
        }

        IntervalHelperFunctions.sort(intervals);

        let currentOverlapIteration: IInterval = null;
        for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i];
            if (interval.status.type === TimelineIterationStatusCode.IsOverlapping) {
                if (currentOverlapIteration !== null) {
                    if (interval.endDate.getTime() > currentOverlapIteration.endDate.getTime()) {
                        currentOverlapIteration.endDate = interval.endDate;
                    }
                    intervals.splice(i, 1);
                    i--;
                }
                else {
                    currentOverlapIteration = interval;
                }
            }
            else {
                currentOverlapIteration = null;
            }
        }
    }

    /**
     * Get the maximum number of items to display for the given iteration. Assumes the iteration is part of the given team.
     *   If the team/interval/interval.items is not defined this will return 0.
     *   If the current team max number of cards is greater than the interval item count then this will return the interval item count.
     * @param ITeam team Team that the iteration is part of.
     * @param IInterval interval Iterval for which to get the max number of item to display.
     * @returns max # of items to display (see comments above).
     */
    public static getMaxNumberOfCardsToDisplay(team: ITeam, interval: IInterval): number {
        if (!team || !interval || !interval.items) {
            return 0;
        }
        return Math.min(team.getMaxNumberOfCardsToDisplay(), interval.items.length);
    }

    private static sort(intervals: IInterval[]) {
        intervals.sort((a: IInterval, b: IInterval) => {
            return a.startDate.getTime() - b.startDate.getTime();
        });
    }
}
