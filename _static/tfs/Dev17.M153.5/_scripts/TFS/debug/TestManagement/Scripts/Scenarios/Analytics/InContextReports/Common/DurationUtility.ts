import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TestReportDataParser } from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import * as Utils_String from "VSS/Utils/String";

class DurationNormalizationConstants {
    public static HoursThresholdValue = 2;   
    public static MinutesThresholdValue = 10;
    public static ThresholdPercentageValue = 50;    
}

export class DurationFormatter {
    private static _getDurationInSecondsFormat(durationInSeconds: number) {
        return Utils_String.format("{0}s", TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(durationInSeconds, 2)); 
    }

    private static _getDurationInMinutesFormat(durationInSeconds: number) {
        return Utils_String.format("{0}m", TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(DurationConverter.convertSecondsToMinutes(durationInSeconds), 2));
    }

    private static _getDurationInHoursFormat(durationInSeconds: number): string {
        return Utils_String.format("{0}h", TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(DurationConverter.convertSecondsToHours(durationInSeconds), 2));
    }

    public static getDurationInAbbreviatedFormat(durationInSeconds: number): string {
        let durationNormalizationUtility = new DurationNormalizer();
        let normalizedDuration: CommonTypes.INormalizedDuration = durationNormalizationUtility.normalizeDuration(durationInSeconds);
        switch (normalizedDuration.durationUnitString) {
            case Resources.UnitInHours:
                return DurationFormatter._getDurationInHoursFormat(durationInSeconds); 
            case Resources.UnitInMinutes:
                return DurationFormatter._getDurationInMinutesFormat(durationInSeconds);
            default:
                return DurationFormatter._getDurationInSecondsFormat(durationInSeconds);
        }
    }

    private static _getDurationAriaLabelInSecondsFormat(durationInSeconds: number) {
        return Utils_String.format(Resources.AverageDurationInSeconds, TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(durationInSeconds, 2)); 
    }

    private static _getDurationAriaLabelInMinutesFormat(durationInSeconds: number) {
        return Utils_String.format(Resources.AverageDurationInMinutes, TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(DurationConverter.convertSecondsToMinutes(durationInSeconds), 2));
    }

    private static _getDurationAriaLabelInHoursFormat(durationInSeconds: number): string {
        return Utils_String.format(Resources.AverageDurationInHours, TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(DurationConverter.convertSecondsToHours(durationInSeconds), 2));
    }

    public static getDurationAriaLabel(durationInSeconds: number): string {
        let durationNormalizationUtility = new DurationNormalizer();
        let normalizedDuration: CommonTypes.INormalizedDuration = durationNormalizationUtility.normalizeDuration(durationInSeconds);
        switch (normalizedDuration.durationUnitString) {
            case Resources.UnitInHours:
                return DurationFormatter._getDurationAriaLabelInHoursFormat(durationInSeconds); 
            case Resources.UnitInMinutes:
                return DurationFormatter._getDurationAriaLabelInMinutesFormat(durationInSeconds);
            default:
                return DurationFormatter._getDurationAriaLabelInSecondsFormat(durationInSeconds);
        }
    }
}

export class DurationConverter {
    public static convertSecondsToMinutes(durationInSeconds: number) {
        return durationInSeconds / 60.0;
    }

    public static convertSecondsToHours(durationInSeconds: number) {
        return durationInSeconds / (60.0 * 60.0);
    }
}


export class DurationNormalizer {
    /**
     * normalizeDurationArray
     * Normalizes duration for a nested array between seconds, minutes and hours
     * @param durationValues A nested array which is normalized after tallying individual averages of member arrays, ignoring zero values
     * @param considerFlattened To flatten durationValues, if needed
     * @returns INormalizedDuration Object which has durationUnit and normalized Time
     */
    public normalizeDurations(durationValues: number[][], considerFlattened: boolean = false): CommonTypes.INormalizedDuration {
        
        let processedDurationArray: number[]; 
        //If considerFlattened is true, then we consider values to be in a single array without
        //being stacked in categories, and thus don't take averages
        if (considerFlattened) {
            let flattendDurationArray: number[];
            //Flattening the durationValues array to make one array 
            flattendDurationArray = [].concat(...durationValues);
            processedDurationArray = flattendDurationArray;
        }
        else {
            let averagedDurationValues = durationValues.map(durationArray => {
                return this._calculateAverageIgnoringZeros(durationArray);
            });
            processedDurationArray = averagedDurationValues;
        }
        
        //Assign seconds bucket by default
        let normalizeConverterFunction: (number)  => number;
        let normalizedDurationUnitString: string = Resources.UnitInSeconds;
        
        if (this._shouldNormalizeDurationsToHours(processedDurationArray)) {
            //Hours bucket - If 50% values are above hours threshold, then assign hours bucket
            normalizeConverterFunction = DurationConverter.convertSecondsToHours;
            normalizedDurationUnitString = Resources.UnitInHours;
        }
        else if (this._shouldNormalizeDurationsToMinutes(processedDurationArray)) {
            //Minutes Bucket - If 50% values are above threshold, then assign minutes bucket
            normalizeConverterFunction = DurationConverter.convertSecondsToMinutes;
            normalizedDurationUnitString = Resources.UnitInMinutes;
        }
         
        return {
            durationUnitString: normalizedDurationUnitString,
            durationValues: normalizeConverterFunction ? durationValues.map(durationInSecondsList => {
                return durationInSecondsList.map(durationInSeconds => {
                    return normalizeConverterFunction(durationInSeconds);
                });
            }) : durationValues
        } as CommonTypes.INormalizedDuration;
    }

    /**
     * Returns the normalized duration for a singular value according to set thresholds
     * @param durationInSeconds Value of duration (in seconds)
     * @returns INormalizedDuration Object which has durationUnit and normalized Time
     */
    public normalizeDuration(durationInSeconds: number): CommonTypes.INormalizedDuration {
        let normalizedDuration: number;
        
        normalizedDuration = DurationConverter.convertSecondsToHours(durationInSeconds);
        if (normalizedDuration > DurationNormalizationConstants.HoursThresholdValue) {
            return {
                durationUnitString: Resources.UnitInHours, 
                durationValues: [[normalizedDuration]]} as CommonTypes.INormalizedDuration;
        }
        normalizedDuration = DurationConverter.convertSecondsToMinutes(durationInSeconds);
        if (normalizedDuration > DurationNormalizationConstants.MinutesThresholdValue) {
            return {
                durationUnitString: Resources.UnitInMinutes, 
                durationValues: [[normalizedDuration]]} as CommonTypes.INormalizedDuration;
        }
        
        return {
            durationUnitString: Resources.UnitInSeconds, 
            durationValues: [[durationInSeconds]]} as CommonTypes.INormalizedDuration;
    }

    private _shouldNormalizeDurationsToHours(durationInSecondsArray: number[]): boolean {
        return this._normalizeDurationOnFrequency(durationInSecondsArray, DurationNormalizationConstants.HoursThresholdValue, DurationNormalizationConstants.ThresholdPercentageValue,
            DurationConverter.convertSecondsToHours);
    }

    private _shouldNormalizeDurationsToMinutes(durationInSecondsArray: number[]): boolean {
        return this._normalizeDurationOnFrequency(durationInSecondsArray, DurationNormalizationConstants.MinutesThresholdValue, DurationNormalizationConstants.ThresholdPercentageValue,
            DurationConverter.convertSecondsToMinutes);
    }

    private _normalizeDurationOnFrequency(durationInSecondsArray: number[], thresholdValue: number, percentageThresholdRequired: number,  converterFunction: (number) => number): boolean {
        let nonZeroDurationsArray = durationInSecondsArray.filter(duration => duration > 0);
        const expectedEntriesExceedingThreshold = Math.floor(nonZeroDurationsArray.length * (percentageThresholdRequired / 100));
        let numValuesGreaterThanThreshold = 0;
        nonZeroDurationsArray.forEach((duration: number): number => {
            const convertedValue = converterFunction(duration);
            if (convertedValue > thresholdValue) {
                numValuesGreaterThanThreshold ++;
            }
            return convertedValue;
        });

        return numValuesGreaterThanThreshold > expectedEntriesExceedingThreshold; 
    }

    private _calculateAverageIgnoringZeros(durationArray: number[]): number {
        if (!durationArray || durationArray.length === 0) {
            return  0;
        }
        let sumForDurationArray = 0;
        let nonZeroCount = 0;
        durationArray.forEach(duration => {
            if (duration) {
                nonZeroCount ++;
            }
            sumForDurationArray += duration;
        });
        
        return nonZeroCount !== 0 ? sumForDurationArray / nonZeroCount : 0;
    }
}