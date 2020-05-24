
import { IComboBoxOption } from "OfficeFabric/ComboBox";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

export class TestReportDataParser {

    public static getCustomizedDecimalValueInCurrentLocale(value: number, precision: number): string {
        return Utils_Number.toDecimalLocaleString(this.getCustomizedDecimalValue(value, precision));
    }

    public static getCustomizedDecimalValue(value: number, precision = 2): number {
        let fixed = precision;
        fixed = Math.pow(10, fixed);
        return (Math.floor(value * fixed) / fixed);
    }

    public static getWeekStartingDate(date: Date): Date {
        return Utils_Date.addDays(date, -date.getDay(), true);
    }

    public static getPercentageInDisplayFormat(value: number, precision: number = 2): string {
        return Utils_String.format("{0}%", TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(value, precision));
    }

    public static getDurationInSecondsFormat(durationInSeconds: number): string {
        return Utils_String.format("{0}s", this.getCustomizedDecimalValueInCurrentLocale(durationInSeconds, 2));
    }
}

export interface IExtendedComboBoxOption extends IComboBoxOption {
    /**
     * Specifies url for attachments to be used for downloading
     */
    url: string;
}

export class UIUtils {
    public static getAccessDeniedTooltipText(isDisabled: boolean, operation: string): string {
        if (isDisabled) {
            return Utils_String.localeFormat(Resources.AccessDeniedTooltip, operation);
        }

        return Utils_String.empty;
    }
}