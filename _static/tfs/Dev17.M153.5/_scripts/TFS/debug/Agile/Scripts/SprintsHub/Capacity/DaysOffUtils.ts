import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Date from "VSS/Utils/Date";

/**
 * Preconditions:
 * 1. Assuming that dates do not contain time & are in UTC
 */
export function calculateNetDaysOff(
    daysOff: Contracts.IDaysOff,
    teamDaysOff: Contracts.IDaysOff[],
    weekends: number[],
    iterationStartDate?: Date,
    iterationEndDate?: Date
): number {
    let netDaysOff = 0;
    let date = daysOff.start;
    while (date <= daysOff.end) {
        if (!isWeekend(date, weekends) && _isWithinIteration(date, iterationStartDate, iterationEndDate)) {
            const teamDaysOffRatio = getRatioForGivenDate(date, teamDaysOff);
            if (daysOff.ratio > teamDaysOffRatio) {
                netDaysOff += (daysOff.ratio - teamDaysOffRatio);
            }
        }
        date = Utils_Date.addDays(date, 1, true  /* fix offset for DST*/);
    }

    return netDaysOff;
}

/**
 * Preconditions:
 * 1. Assuming that dates do not contain time & are in UTC
 */
export function calculateNetTeamDaysOff(
    daysOff: Contracts.IDaysOff,
    weekends: number[],
    iterationStartDate?: Date,
    iterationEndDate?: Date
): number {
    if (!daysOff || !daysOff.start || !daysOff.end) {
        return 0;
    }

    let netDaysOff = 0;
    let date = daysOff.start;
    while (date <= daysOff.end) {
        if (!isWeekend(date, weekends) && _isWithinIteration(date, iterationStartDate, iterationEndDate)) {
            netDaysOff += daysOff.ratio;
        }
        date = Utils_Date.addDays(date, 1, true /* fix offset for DST*/);
    }

    return netDaysOff;
}

function _isWithinIteration(date: Date, iterationStartDate: Date, iterationEndDate: Date): boolean {
    if (!iterationStartDate || !iterationEndDate) {
        return true;
    }

    return date >= iterationStartDate && date <= iterationEndDate;

}

export function getSanatizedDaysOff(
    daysOff: Contracts.IDaysOff,
    iterationStartDate: Date,
    iterationEndDate: Date): Contracts.IDaysOff {

    const ret: Contracts.IDaysOff = { ...daysOff };

    if (!ret.ratio) {
        ret.ratio = 1;
    }

    return ret;
}

export function getTotalDaysOff(daysOff: Contracts.IDaysOff[]): number {
    if (!daysOff) {
        return 0;
    }

    return daysOff.reduce(
        (prevValue, currentValue) => {
            return prevValue + (currentValue.netDaysOff || 0);
        },
        0);
}

//Returns the ratio for the date in given range, if not exists returns 0
function getRatioForGivenDate(
    date: Date,
    daysOffs: Contracts.IDaysOff[]): number {
    for (const daysOff of daysOffs) {
        if (date >= daysOff.start && date <= daysOff.end) {
            return daysOff.ratio;
        }
    }
    return 0;
}

function isWeekend(
    date: Date,
    weekends: number[]): boolean {

    const day = date.getDay();
    return (Utils_Array.findIndex(weekends, (d) => d === day) !== -1);
}