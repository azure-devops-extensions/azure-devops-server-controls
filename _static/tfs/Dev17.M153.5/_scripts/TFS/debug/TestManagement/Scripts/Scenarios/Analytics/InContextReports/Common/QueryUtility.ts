import { TestOutcome } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";

/** Contains utility methods used to construct OData queries for TCM-related reporting data. */
export class QueryUtility {
    /** Converts TestOutcome enum values to string fragments to be used for aggregation during generation of Analytics-backed queries. */
    public static getOutcomeCountStringForAggregation(outcome: TestOutcome): string {
        let outcomeCountString =  QueryUtility.getOutcomeCountString(outcome);
        return `${outcomeCountString} with sum as ${outcomeCountString}`;
    }

    /** Converts TestOutcome enum values to the corresponding analytics-backed count field */
    public static getOutcomeCountString(outcome: TestOutcome) {
        switch(outcome) {
            case TestOutcome.Failed:
                return "ResultFailCount";
            case TestOutcome.Passed:
                return "ResultPassCount";
            case TestOutcome.Aborted:
                return "ResultAbortedCount";
            case TestOutcome.Error:
                return "ResultErrorCount";
            case TestOutcome.Inconclusive:
                return "ResultInconclusiveCount";
            case TestOutcome.NotExecuted:
                return "ResultNotExecutedCount";
            case TestOutcome.NotImpacted:
                return "ResultNotImpactedCount";
            case TestOutcome.Total:
                return "ResultCount";
            default:
                throw new Error("Unknown TestOutcome.");
        }
    }
}