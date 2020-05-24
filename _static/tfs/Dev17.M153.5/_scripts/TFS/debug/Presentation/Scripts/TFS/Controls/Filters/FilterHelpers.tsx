import { FilterSearchCriteria } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import * as Utils_Date from "VSS/Utils/Date";

export class FilterHelpers {
    public static hasNonEmptyProperties(object: Object): boolean {
        if (object == null) {
            return false;
        }
        if (typeof object != "object") {
            return false;
        }
        for (let key in object) {
            if (object.hasOwnProperty(key) && object[key] != null) {
                return true;
            }
        }
        return false;
    }

    public static equalSearchCriteria(srcSearchCriteria: FilterSearchCriteria, targetSearchCriteria: FilterSearchCriteria): boolean {
        for (let key in srcSearchCriteria) {
            if (!(key in targetSearchCriteria)) {
                return false;
            }
            // assuming searchCriteria contains only primitive types.
            if (srcSearchCriteria[key] !== targetSearchCriteria[key]) {
                return false;
            }
        }
        return true;
    }

    public static clearSearchCriteria(searchCriteria: FilterSearchCriteria): FilterSearchCriteria {
        for (let key in searchCriteria) {
            searchCriteria[key] = null;
        }
        return searchCriteria;
    }

    public static getEndOfDay(toDate: string): string {
        let endOfDayString = null;
        if (toDate) {
            let endOfDayDate = new Date(toDate);
            endOfDayDate = Utils_Date.convertClientTimeToUserTimeZone(endOfDayDate);
            endOfDayDate.setHours(23, 59, 59, 999);
            endOfDayDate = Utils_Date.convertUserTimeToClientTimeZone(endOfDayDate);
            endOfDayString = endOfDayDate.toISOString();
        }
        return endOfDayString;
    }

    public static getStartOfDay(toDate: string): string {
        let startOfDayString = null;
        if (toDate) {
            let startOfDayDate = new Date(toDate);
            startOfDayDate = Utils_Date.convertClientTimeToUserTimeZone(startOfDayDate);
            startOfDayDate.setHours(0, 0, 0, 0);
            startOfDayDate = Utils_Date.convertUserTimeToClientTimeZone(startOfDayDate);
            startOfDayString = startOfDayDate.toISOString();
        }
        return startOfDayString;
    }

    public static swapFromAndToDatesIfRequired(dates: { fromDate: string, toDate: string }): void {
        let fromDate = dates.fromDate;
        let toDate = dates.toDate;
        if (!!fromDate && !!toDate && (new Date(fromDate) > new Date(toDate))) {
            dates.fromDate = toDate;
            dates.toDate = fromDate;
        }
    }

}