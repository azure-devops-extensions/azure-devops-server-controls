/**
 * The file should contain strict utility class (one that have only static methods). Also, these should be worthy of being called common and should be usable across features
 */

import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TCMContracts from "TFS/TestManagement/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";

export class TestReportDataParser {

    public static parseDuration(duration: string): string {
        let durationString: string,
            durationVal: string[],
            durationObj: Common.IDuration;

        durationObj = TestReportDataParser._getDurationObject(duration);

        if (durationObj.days > 0) {
            durationString = Utils_String.localeFormat("{0} {1}",
                Utils_String.localeFormat(Resources.DayFormat, durationObj.days),
                (durationObj.hours > 0) ? Utils_String.localeFormat(Resources.HourFormat, durationObj.hours) : Utils_String.empty
                );
        } else if (durationObj.hours > 0) {
            durationString = Utils_String.localeFormat("{0} {1}",
                Utils_String.localeFormat(Resources.HourFormat, durationObj.hours),
                (durationObj.minutes > 0) ? Utils_String.localeFormat(Resources.MinuteFormat, durationObj.minutes) : Utils_String.empty
                );
        } else if (durationObj.minutes > 0) {
            durationString = Utils_String.localeFormat("{0} {1}",
                Utils_String.localeFormat(Resources.MinuteFormat, durationObj.minutes),
                (durationObj.seconds > 0) ? Utils_String.localeFormat(Resources.SecondFormat, (durationObj.seconds === Math.round(durationObj.seconds)) ? durationObj.seconds.toString() : durationObj.seconds.toFixed(2)) : Utils_String.empty
                );
        } else if (durationObj.seconds > 0) {
            durationString = Utils_String.localeFormat("{0} {1}",
                Utils_String.localeFormat(Resources.SecondFormat, durationObj.seconds),
                (durationObj.milliseconds > 0) ? Utils_String.localeFormat(Resources.MillisecondFormat, durationObj.milliseconds) : Utils_String.empty
                );
        } else {
            if (durationObj.milliseconds === 0) {
                // Test took less than a ms. Report this as 0s
                durationString = Utils_String.localeFormat(Resources.SecondFormat, 0);
            } else {
                durationString = Utils_String.localeFormat(Resources.MillisecondFormat, durationObj.milliseconds);
            }
        }

        return durationString;
    }

    public static isZeroDuration(duration: string): boolean {
        let durationObj = TestReportDataParser._getDurationObject(duration);
        return durationObj.days === 0 &&
            durationObj.hours === 0 &&
            durationObj.minutes === 0 &&
            durationObj.seconds === 0 &&
            durationObj.milliseconds === 0;
    }

    public static parseFailureData(testFailures: TCMContracts.TestFailuresAnalysis): Common.ITestFailureData {
        let failureData: Common.ITestFailureData = {
            newFailures: 0,
            existingFailures: 0,
            totalFailures: 0
        };

        failureData.newFailures = (testFailures && testFailures.newFailures) ? testFailures.newFailures.count : 0;
        failureData.existingFailures = (testFailures && testFailures.existingFailures) ? testFailures.existingFailures.count : 0;
        failureData.totalFailures = failureData.newFailures + failureData.existingFailures;

        return failureData;
    }

    public static getDurationInMilliseconds(timespanString: string): number {
        let durationObject = TestReportDataParser._getDurationObject(timespanString);
        return durationObject.days * 24 * 60 * 60 * 1000 +
            durationObject.hours * 60 * 60 * 1000 +
            durationObject.minutes * 60 * 1000 +
            durationObject.seconds * 1000 +
            durationObject.milliseconds;
    }

    public static getDurationInSeconds(timespanString: string): number {
        let durationObject = TestReportDataParser._getDurationObject(timespanString);
        return durationObject.days * 24 * 60 * 60 +
            durationObject.hours * 60 * 60 +
            durationObject.minutes * 60 +
            durationObject.seconds;
    }

    public static getDurationInMinutes(timespanString: string): number {
        let durationObject = TestReportDataParser._getDurationObject(timespanString);
        return durationObject.days * 24 * 60 +
            durationObject.hours * 60 +
            durationObject.minutes +
            parseFloat((durationObject.seconds / 60).toFixed(2));
    }

    public static getDurationInHours(timespanString: string): number {
        let durationObject = TestReportDataParser._getDurationObject(timespanString);
        return durationObject.days * 24  +
            durationObject.hours +
            parseFloat((durationObject.minutes / 60).toFixed(2));
    }

    public static getDecimalValueInCurrentLocale(value: number, precision: number): string {
        let valueStringInFixedDecimal: string = value.toFixed(precision);
        let valueInFixedDecimal: number = parseFloat(valueStringInFixedDecimal);
        let localeAwareValueString: string = Utils_Number.toDecimalLocaleString(valueInFixedDecimal);

        return localeAwareValueString;
    }

    // Time span is serialized in the following format: dd.hh:min:s.ms
    private static _getDurationObject(duration: string): Common.IDuration {
        // Check if we have days in the duration.
        let durationParts = duration.split(".");
        
        let days = 0;
        if (durationParts[0] && durationParts[1] && durationParts[1].indexOf(":") > 0) {
            // This means we have days in the duration. The duration is something like 2.03:04:50 or 1.04:50:47.6700 
            days = parseInt(durationParts[0]);
            duration = durationParts[1];
        }

        duration = duration.replace(".", ":");
        durationParts = duration.split(":");

        let milliSeconds = 0;
        if (durationParts[3]) {
            let seconds = parseFloat("." + durationParts[3]);
            milliSeconds = Math.round(seconds * 1000);
        }

        let durationObj = {
            days: days,
            hours: (durationParts[0]) ? parseInt(durationParts[0]) : 0,
            minutes: (durationParts[1]) ? parseInt(durationParts[1]) : 0,
            seconds: (durationParts[2]) ? parseInt(durationParts[2]) : 0,
            milliseconds: milliSeconds
        };

        return durationObj;
    }

    public static getCustomizedDecimalValueInCurrentLocale(value: number, precision: number): string {
        return Utils_Number.toDecimalLocaleString(TestReportDataParser.getCustomizedDecimalValue(value, precision));       
    }

    public static getCustomizedDecimalValue(value: number, precision = 2): number {
        let fixed = precision;                      
        fixed = Math.pow(10, fixed);
        return (Math.floor(value * fixed) / fixed);
        }
}

export class TCMContractsConverter {
    public static convertShallowTestResultToTestCaseResult(result: TCMContracts.ShallowTestCaseResult): TCMContracts.TestCaseResult {
        return {
            id: result.id,
            durationInMs: result.durationInMs,
            testRun: {
                id: result.runId.toString()
            } as TCMContracts.ShallowReference,
            testCaseReferenceId: result.refId
        } as TCMContracts.TestCaseResult;
    }
}