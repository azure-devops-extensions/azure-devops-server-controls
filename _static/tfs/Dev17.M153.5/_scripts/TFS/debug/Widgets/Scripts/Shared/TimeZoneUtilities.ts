import DateUtils = require("VSS/Utils/Date");
import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { WidgetDataProviderPropertyBagNames } from "Dashboards/Scripts/Generated/Constants";

/**
 * Returns collection/account time zone offset from UTC.
 * @returns Offset from UTC in milliseconds.
 */
export function getCollectionTimeZoneOffset(): number {
    var pageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
    var collectionTimeZone = pageDataService.getPageData<{ utcOffset: number }>(WidgetDataProviderPropertyBagNames.CollectionTimeZoneData);

    return collectionTimeZone.utcOffset;
}

/**
 * Gets the local time zone equivalent of today (date as of midnight) in the account time zone.
 * NOTE: So if today is 2016-01-01T00:00:00 in account time zone,
 *       the date returned is 2016-01-01T00:00:00 in the local time zone.
 *       Midnight today might not be 2016-01-01 in the local timezone however.
 * @returns A date object representing today in the account time zone.
 */
export function getTodayInAccountTimeZone(): Date {
    var localNow = new Date();

    // Get time zone offset difference between local and account timezone
    var accountOffsetFromUtcMs = getCollectionTimeZoneOffset();
    var utcOffsetFromLocalMs = localNow.getTimezoneOffset() * DateUtils.MILLISECONDS_IN_MINUTE;
    var localToAccountDifferenceHrs = (accountOffsetFromUtcMs + utcOffsetFromLocalMs) / DateUtils.MILLISECONDS_IN_HOUR;

    // Shift to account and strip time.
    // NOTE: Adjust for any daylight-savings-time changes in the local time since we know the exact difference
    //       we want to add and don't want to apply daylight-savings-time changes/rules of the local time zone.
    var date = DateUtils.addHours(localNow, localToAccountDifferenceHrs, true /* adjustDSTOffset */);
    date = DateUtils.stripTimeFromDate(date);

    return date;
}