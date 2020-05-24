import { DateSampleMode, TimePeriodConfiguration, DateSampleInterval, DateSamplingConfiguration} from 'Widgets/Scripts/Burndown/BurndownSettings';
import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import { DayOfWeek } from "VSS/Common/Contracts/System";
import { PickerOptionValue } from 'Widgets/Scripts/Burndown/SimpleControlPicker';

export class TimePeriodPickerValues {

    /** Rendering hardcoded data for the time period picker dropdown values */
    static getIterationValues(): PickerOptionValue[] {
        let plotIterationValues: PickerOptionValue[] = [
            {
                labelText: "Iteration 1",
                identifier: 0
            },
            {
                labelText: "Iteration 2",
                identifier: 1
            },
            {
                labelText: "Iteration 3",
                identifier: 2
            },
            {
                labelText: "Iteration 4",
                identifier: 3
            },
            {
                labelText: "Iteration 5",
                identifier: 4
            },
            {
                labelText: "Iteration 6",
                identifier: 5
            },
            {
                labelText: "Iteration 7",
                identifier: 6
            },
            {
                labelText: "Iteration 8",
                identifier: 7
            }
        ]

        return plotIterationValues
    }
    static getPlotByValues(): PickerOptionValue[] {
        let plotByValues: PickerOptionValue[] = [
            {
                labelText:WidgetResources.TimePeriod_PlotByIterationValue,
                identifier:DateSampleMode.ByIterations
            },
            {
                identifier: DateSampleMode.ByDateInterval,
                labelText: WidgetResources.TimePeriod_PlotByDateValue
            }
        ]

        return plotByValues
    }

    static getPlotUnitsValues(): PickerOptionValue[] {
        let plotUnitsValues: PickerOptionValue[] = [
            {
                labelText:WidgetResources.TimePeriod_PlotUnitsDaysValue,
                identifier:DateSampleInterval.Days
            },
            {
                labelText:WidgetResources.TimePeriod_PlotUnitsWeeksValue,
                identifier:DateSampleInterval.Weeks
            },
            {
                labelText:WidgetResources.TimePeriod_PlotUnitsMonthsValue,
                identifier:DateSampleInterval.Months
            }
        ]   

        return plotUnitsValues;
    }
    
    static getLastDayOfWeekValues(): PickerOptionValue[] {
        let dayOfWeekValues: PickerOptionValue[]=[
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekMonday,
                identifier: DayOfWeek.Monday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekTuesday,
                identifier: DayOfWeek.Tuesday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekWednesday,
                identifier: DayOfWeek.Wednesday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekThursday,
                identifier: DayOfWeek.Thursday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekFriday,
                identifier: DayOfWeek.Friday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekSaturday,
                identifier: DayOfWeek.Saturday
            },
            {
                labelText:WidgetResources.TimePeriod_LastDayOfWeekSunday,
                identifier: DayOfWeek.Sunday
            }
        ]  

        return dayOfWeekValues;
    }
}