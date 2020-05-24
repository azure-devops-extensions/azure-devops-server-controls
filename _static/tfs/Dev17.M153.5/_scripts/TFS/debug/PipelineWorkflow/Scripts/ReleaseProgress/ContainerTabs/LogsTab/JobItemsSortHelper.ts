import { IPhaseJobItem } from "DistributedTaskUI/Logs/Logs.Types";
import * as Utils_String from "VSS/Utils/String";

export class JobItemsSortHelper {

    public static sortByStartTimeAsc(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        if (!jobItem1 || !jobItem2) {
            return JobItemsSortHelper._sortByNonNullValue(jobItem1, jobItem2);
        }
        else {
            if (jobItem1.startTime && jobItem2.startTime) {
                return jobItem1.startTime.getTime() - jobItem2.startTime.getTime();
            }
            else {
                return jobItem1.startTime ? -1 : (jobItem2.startTime ? 1 : JobItemsSortHelper._sortByName(jobItem1, jobItem2));
            }
        }
    }

    public static sortByDurationAsc(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        if (!jobItem1 || !jobItem2) {
            return JobItemsSortHelper._sortByNonNullValue(jobItem1, jobItem2);
        }
        else {
            if (JobItemsSortHelper._canComputeDuration(jobItem1) && JobItemsSortHelper._canComputeDuration(jobItem2)) {
                return (jobItem1.finishTime.getTime() - jobItem1.startTime.getTime()) - (jobItem2.finishTime.getTime() - jobItem2.startTime.getTime());
            }
            else {
                return JobItemsSortHelper._sortByNonNullDuration(jobItem1, jobItem2);
            }
        }
    }

    public static sortByDurationDesc(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        if (!jobItem1 || !jobItem2) {
            return JobItemsSortHelper._sortByNonNullValue(jobItem1, jobItem2);
        }
        else {
            if (JobItemsSortHelper._canComputeDuration(jobItem1) && JobItemsSortHelper._canComputeDuration(jobItem2)) {
                return (jobItem2.finishTime.getTime() - jobItem2.startTime.getTime()) - (jobItem1.finishTime.getTime() - jobItem1.startTime.getTime());
            }
            else {
                return JobItemsSortHelper._sortByNonNullDuration(jobItem1, jobItem2);
            }
        }
    }

    private static _sortByNonNullDuration(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        return JobItemsSortHelper._canComputeDuration(jobItem1) ? -1 : (JobItemsSortHelper._canComputeDuration(jobItem2) ? 1 : JobItemsSortHelper._sortByName(jobItem1, jobItem2));
    }

    private static _sortByNonNullValue(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        return !jobItem1 ? (!jobItem2 ? 0 : 1) : -1;
    }

    private static _canComputeDuration(jobItem: IPhaseJobItem): boolean {
        if (jobItem && jobItem.startTime && jobItem.finishTime) {
            return true;
        }
        return false;
    }

    private static _sortByName(jobItem1: IPhaseJobItem, jobItem2: IPhaseJobItem): number {
        return Utils_String.localeIgnoreCaseComparer(jobItem1.name, jobItem2.name);
    }
}