
import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";

import Contracts = require("TFS/TestManagement/Contracts");

import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";

import DateUtils = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

export class TestChartData {

    public getChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number, stackBy?: AnalyticsTypes.Chart_StackBy): AnalyticsTypes.IQueryODataOptions {
        throw new Error("Not implemented. Derive class will override this.");
    }

    protected _getFilterDetailsString(publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): string {
        let filterStr: string = Utils_String.empty;

        //Appending build/release details
        switch (publishContextDetails.contextType) {
            case Contracts.TestResultsContextType.Build:
                filterStr += ` Build/BuildDefinitionId eq  ${publishContextDetails.build.definitionId} and ReleaseSK eq null `;      //Since we dont have source workflow in AX now, so having releasesk null check for CI flow.
                break;
            case Contracts.TestResultsContextType.Release:
                filterStr += ` ReleaseEnvironment/ReleaseEnvironmentDefinitionId eq  ${publishContextDetails.release.environmentDefinitionId} `; //Triage: if we require releasedef Id here as well as envId is unique in partition and project.
                break;
        }

        if (repositoryId) {
            //Appending branch filter details
            filterStr += ` and Branch/RepositoryId eq '${repositoryId}' `;
        }

        if (branchName) {
            //Appending branch filter details
            filterStr += ` and Branch/BranchName eq '${GitRefUtility.versionStringToRefName(branchName)}' `;
        }

        //Appending time lookback filter
        let nowInUTC: Date = DateUtils.shiftToUTC(new Date());      //Convert client time to UTC.
        let lookBackDate: Date;
        switch (periodGroup) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                lookBackDate = DateUtils.addDays(nowInUTC, -periodGroupValue);
                break;
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                lookBackDate = DateUtils.addDays(nowInUTC, -7 * periodGroupValue);
                break;
        }
        let lookBackDateSK = DateSKParser.dateStringToDateSK(DateUtils.format(lookBackDate, DateSKParser.dateStringFormat));
        filterStr += ` and CompletedDateSK ge ${lookBackDateSK} `;

        return filterStr;
    }

    protected _getGroupByPublishContextString(publishContext: Contracts.TestResultsContextType): string {
        let groupByPublishContextStr: string = Utils_String.empty;
        switch (publishContext) {
            case Contracts.TestResultsContextType.Build:
                groupByPublishContextStr += ` BuildSK `;
                break;
            case Contracts.TestResultsContextType.Release:
                groupByPublishContextStr += ` ReleaseEnvironmentSK `; //Triage: if we require release Id here as well as envId is unique in partition and project.
                break;
        }

        return groupByPublishContextStr;
    }

    protected _getGroupByPeriodColumnString(periodGroup: AnalyticsTypes.Chart_PeriodGroup): string {
        let groupByPeriodColumnStr: string = Utils_String.empty;
        switch (periodGroup) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                groupByPeriodColumnStr = "CompletedDateSK";
                break;
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                groupByPeriodColumnStr = "CompletedOn/WeekStartingDate";
                break;
        }

        return groupByPeriodColumnStr;
    }

    protected _appendOrderByDateClause(periodGroup: AnalyticsTypes.Chart_PeriodGroup): string {

        switch (periodGroup) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                return " CompletedDateSK asc ";
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                return " CompletedOn/WeekStartingDate asc ";
        }
    }

    protected _parseODataAPIReturnDateIntoDisplayForm(periodGroup: AnalyticsTypes.Chart_PeriodGroup, record: any): AnalyticsTypes.IAnalyticsChartData {
        let chartData: AnalyticsTypes.IAnalyticsChartData = {} as AnalyticsTypes.IAnalyticsChartData;
        switch (periodGroup) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                chartData.date = DateSKParser.parseDateSKAsDateString(record.CompletedDateSK);
                break;
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                //Date comes in string for like 'yyyy-mm-ddT00:00:00Z'
                chartData.date = DateUtils.format(DateUtils.parseDateString(record.CompletedOn.WeekStartingDate), DateSKParser.dateStringFormat);
                break;
        }

        return chartData;
    }

    protected _getDurationInTimespanFormat(durationInSec: number): string {
        // TODO: This is done because in chart series, to normalize duration it is expected in C# timespan form. See if it can be done in better way. 
        return `00:00:${Math.trunc(durationInSec)}.000`;
    }

    protected _getGroupByStackString(stackBy: AnalyticsTypes.Chart_StackBy): string {
        switch (stackBy) {
            case AnalyticsTypes.Chart_StackBy.Container:
                return "Test/ContainerName";
            case AnalyticsTypes.Chart_StackBy.Test:
                return "Test/TestName";
            case AnalyticsTypes.Chart_StackBy.Owner:
                return "Test/TestOwner";
            case AnalyticsTypes.Chart_StackBy.Outcome:
                return "Outcome";
            case AnalyticsTypes.Chart_StackBy.Priority:
                return "Test/Priority";
            case AnalyticsTypes.Chart_StackBy.TestRun:
                return "Title";
        }
    }

    protected _getGroupByStackValue(stackBy: AnalyticsTypes.Chart_StackBy, record: any): string {
        switch (stackBy) {
            case AnalyticsTypes.Chart_StackBy.Container:
                return record.Test.ContainerName;
            case AnalyticsTypes.Chart_StackBy.Test:
                return record.Test.TestName;
            case AnalyticsTypes.Chart_StackBy.Owner:
                return record.Test.TestOwner;
            case AnalyticsTypes.Chart_StackBy.Outcome:
                return record.Outcome;
            case AnalyticsTypes.Chart_StackBy.Priority:
                return record.Test.Priority;
            case AnalyticsTypes.Chart_StackBy.TestRun:
                return record.Title;
        }
    }

    protected _appendOutcomeFilter(filterStr: string, outcome: AnalyticsTypes.Chart_Outcome): string {
        switch (outcome) {
            case AnalyticsTypes.Chart_Outcome.All:
                break;
            case AnalyticsTypes.Chart_Outcome.Fail:
                filterStr += ` and Outcome eq '${Contracts.TestOutcome[Contracts.TestOutcome.Failed]}' `;
                break;
            case AnalyticsTypes.Chart_Outcome.Pass:
                filterStr += ` and Outcome eq '${Contracts.TestOutcome[Contracts.TestOutcome.Passed]}' `;
                break;
        }

        return filterStr;
    }

    protected _getOutcomeCountFieldForAggregation(outcome: AnalyticsTypes.Chart_Outcome): string {
        switch (outcome) {
            case AnalyticsTypes.Chart_Outcome.All:
                return "ResultCount";
            case AnalyticsTypes.Chart_Outcome.Pass:
                return "ResultPassCount";
            case AnalyticsTypes.Chart_Outcome.Fail:
                return "ResultFailCount";
        }
    }
}