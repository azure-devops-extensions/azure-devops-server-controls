import { AnalyticsTestTrendQueryBase } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/AnalyticsTestTrendQueryBase";
import { AnalyticsODataVersions, ODataQueryOptions } from "Analytics/Scripts/OData";
import { GroupingProperty, Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { AnalyticsTestTrendCoreSettings } from "../AnalyticsTestTrendSettings";
import { getQueryEntityStrategy } from "./TestTrendQueryEntityStrategies";
import { getDefaultWebContext } from "VSS/Context";
import { GroupingPropertyUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility";

interface FilterEntityDataRaw {
    Branch?: {
        BranchName: string
    };
    Title?: string;
    Test?: {
        ContainerName?: string,
        TestOwner?: string,
    }
}

export interface FilterEntityData {
    name: string;
}

// This query gets the distinct possible values for a filter picker.
// For example, the Branch Filter picker should have all the distinct
// possible branches that one could filter by.
export class DistinctValuesFilterEntityQuery extends AnalyticsTestTrendQueryBase<FilterEntityData[]> {
    private filter: GroupingProperty;

    constructor(
        filter: GroupingProperty,
        settings: AnalyticsTestTrendCoreSettings,
        workflowFilters: Workflow[],
    ) {
        super(DistinctValuesFilterEntityQuery.generateQueryOptions(filter, settings, workflowFilters));
        this.filter = filter;
    }

    private static generateQueryOptions(
        filter: GroupingProperty,
        settings: AnalyticsTestTrendCoreSettings,
        workflowFilters: Workflow[],
    ): ODataQueryOptions {
        const queryEntityStrategy = getQueryEntityStrategy(settings, filter);
        return {
            entityType: queryEntityStrategy.getEntityTypeString(),
            oDataVersion: AnalyticsODataVersions.v2Preview,
            project: getDefaultWebContext().project.id,
            $apply: [ queryEntityStrategy.getFilterClause(workflowFilters), `groupby((${GroupingPropertyUtility.getPropertyName(filter)}))`].join("/")
        } as ODataQueryOptions;
    }

    private getName(raw: FilterEntityDataRaw) {
        switch (this.filter) {
            case GroupingProperty.TestRun: return raw.Title;
            case GroupingProperty.Container: return raw.Test.ContainerName;
            case GroupingProperty.Owner: return raw.Test.TestOwner;
            case GroupingProperty.Branch: return raw.Branch.BranchName;
            default: throw new Error(`Unsupported filter: ${this.filter}`);
        }
    }

    protected interpretQueryResults(data: {
        value: any;
    }): FilterEntityData[] {
        return (
            (data.value as FilterEntityDataRaw[])
            .map(raw => ({ name: this.getName(raw) }))
            .filter(item => item.name)
        );
    }

    public getQueryName(): string {
        return "FilterEntityQuery";
    }
}