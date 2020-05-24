import { WorkItemEffort, CurrentWorkItemAggregateEffort } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { WorkItemStateCategoryNames } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCategories";

/**
 * Used for converting widget settings and data from the Analytics Service into various forms
 * for consumption by other classes.
 *
 * TODO: Right now this class just has some utility methods in it. More refactoring needs to be done
 * to move data calculations from other locations to here.
 */
export class BurndownDataFactory {
    public static getCompletedEffort(effort: WorkItemEffort[]): WorkItemEffort[] {
        return effort.filter(e => e.StateCategory === WorkItemStateCategoryNames.Completed);
    }

    public static getRemainingEffort(effort: WorkItemEffort[]): WorkItemEffort[] {
        return effort.filter(e => e.StateCategory !== WorkItemStateCategoryNames.Completed);
    }

    public static getEffortByDate(effort: WorkItemEffort[]): IDictionaryStringTo<number> {
        // For each date, sum the Aggregated Effort
        let datesToEffortDictionary: IDictionaryStringTo<number> = {};
        effort.forEach(e => {
            let date = e.Date;
            if (datesToEffortDictionary[date] == null) {
                datesToEffortDictionary[date] = e.AggregatedEffort;
            } else {
                datesToEffortDictionary[date] += e.AggregatedEffort;
            }
        });

        return datesToEffortDictionary;
    }

    /**
     * Calculates the average change for the given dates and effort
     * @param datesToEffortDictionary Dates in the format 'yyyy-MM-dd' are the keys, and the values are aggregated effort
     * @param dateKeys The dates, ordered from earliest to latest, to iterate over for calculating burndown from the given dictionary
     */
    public static getAverageChange(datesToEffortDictionary: IDictionaryStringTo<number>, dateKeys: string[]): number {
        // Return early to avoid dividing by 0 at the end of the method
        if (dateKeys.length <= 1) {
            return 0;
        }

        let start = datesToEffortDictionary[dateKeys[0]];
        let end = datesToEffortDictionary[dateKeys[dateKeys.length - 1]];

        // Slope of a line equation
        return (end - start) / (dateKeys.length - 1) ;
    }

    public static getSumOfAggregatedEffort(workItemEffort: CurrentWorkItemAggregateEffort[]): number {
        let total = 0;
        workItemEffort.forEach(effort => {
            total += effort.AggregatedEffort;
        });

        return total;
    }

    public static formatAverageBurn(averageBurn: number) : number {
        let formattedNumber = 0;
        if (averageBurn < 1 && averageBurn > -1) {
            formattedNumber = (Math.round(averageBurn * 10) / 10);
        } else {
            formattedNumber = Math.round(averageBurn);
        }

        return formattedNumber;
    }
}