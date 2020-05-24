import { GroupBy, GroupingProperty, QueryEntity } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { AnalyticsTestTrendSettings, AnalyticsTestTrendCoreSettings } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings";

interface GroupingPropertyMetadata {
    displayName: string;
    propertyName: string;
    parentEntity: QueryEntity;
    notAvailableText: string;
}

export class GroupingPropertyUtility {
    private static groupingPropertyMetadata: {[key: number]: GroupingPropertyMetadata}  = {
        [GroupingProperty.None]: {
            displayName: Resources.DisplayTextNone,
            propertyName: null,
            parentEntity: QueryEntity.TestRuns,
            notAvailableText: null,
        },
        [GroupingProperty.Branch]: {
            displayName: Resources.BranchText,
            propertyName: "Branch/BranchName",
            parentEntity: QueryEntity.TestRuns,
            notAvailableText: Resources.FilterNoBranch,
        },
        [GroupingProperty.Container]: {
            displayName: Resources.TestFileText,
            propertyName: "Test/ContainerName",
            parentEntity: QueryEntity.TestResultsDaily,
            notAvailableText: Resources.FilterNoTestFile,
        },
        [GroupingProperty.Owner]: {
            displayName: Resources.FilterByOwner,
            propertyName: "Test/TestOwner",
            parentEntity: QueryEntity.TestResultsDaily,
            notAvailableText: Resources.FilterNoOwner,
        },
        [GroupingProperty.Priority]: {
            displayName: Resources.PriorityText,
            propertyName: "Test/Priority",
            parentEntity: QueryEntity.TestResultsDaily,
            notAvailableText: Resources.FilterNoPriority,
        },
        [GroupingProperty.TestRun]: {
            displayName: Resources.TestRunText,
            propertyName: "Title",
            parentEntity: QueryEntity.TestRuns,
            notAvailableText: Resources.FilterNoTestRun,
        },
        [GroupingProperty.Workflow]: {
            displayName: Resources.WorkflowFilterLabel,
            propertyName: "Workflow",
            parentEntity: QueryEntity.TestRuns,
            notAvailableText: null,
        },
        // TODO (User stories 1369946, 1369947) support workflow, stage
    };

    private static groupByOptions: GroupingProperty[] = [
        GroupingProperty.None,
        GroupingProperty.Branch,
        GroupingProperty.Container,
        GroupingProperty.Owner,
        GroupingProperty.Priority,
        GroupingProperty.TestRun,
    ];

    private static filterPropertyToGroupingProperty: { [key: string]: GroupingProperty } = {
        ["branches"]: GroupingProperty.Branch,
        ["testFiles"]: GroupingProperty.Container,
        ["owners"]: GroupingProperty.Owner,
        ["testRuns"]: GroupingProperty.TestRun,
        ["workflows"]: GroupingProperty.Workflow,
    }

    private static getGroupingPropertyOptionMetadata(groupingProperty: GroupingProperty): GroupingPropertyMetadata {
        const groupingPropertyMetadata = this.groupingPropertyMetadata[groupingProperty];
        if(!groupingPropertyMetadata) {
            throw new Error(`Unsupported grouping option: ${groupingProperty}`);
        }

        return groupingPropertyMetadata;
    }

    public static getGroupingPropertyFromFilterPropertyName(name: string): GroupingProperty {
        const groupingProperty: GroupingProperty = this.filterPropertyToGroupingProperty[name];
        if(!groupingProperty) {
            throw new Error(`Unknown property name: ${name}`);
        }

        return groupingProperty;
    }

    public static getDisplayName(groupingOption: GroupingProperty): string {
        return this.getGroupingPropertyOptionMetadata(groupingOption).displayName;
    }

    public static getPropertyName(groupingOption: GroupingProperty): string {
        return this.getGroupingPropertyOptionMetadata(groupingOption).propertyName;
    }

    public static getParentEntity(groupingOption: GroupingProperty): QueryEntity {
        return this.getGroupingPropertyOptionMetadata(groupingOption).parentEntity;
    }

    public static getNotAvailableText(groupingOption: GroupingProperty): string {
        return this.getGroupingPropertyOptionMetadata(groupingOption).notAvailableText;
    }

    public static getGroupByOptions(): GroupBy[] {
        return this.groupByOptions.map(name => Number(name));
    }

    public static getQueryEntity(settings: AnalyticsTestTrendCoreSettings, groupingProperty: GroupingProperty): QueryEntity {
        let groupingProperties: GroupingProperty[] = [ groupingProperty ];

        if(Object.keys(settings).indexOf("filters") > -1) {
            const settingsWithFilters: AnalyticsTestTrendSettings = settings as AnalyticsTestTrendSettings;
            groupingProperties = [
                ...groupingProperties,
                ...Object.keys(settingsWithFilters.filters)
                    .filter(key => settingsWithFilters.filters[key].length > 0)
                    .map(key => this.getGroupingPropertyFromFilterPropertyName(key))
            ];
        }

        const parentEntities: QueryEntity[] = groupingProperties
            .map(property => this.getParentEntity(property));

        const shouldUseTestRuns: boolean = parentEntities.every(parentEntity => parentEntity === QueryEntity.TestRuns);
        
        if(shouldUseTestRuns) return QueryEntity.TestRuns;

        const shouldUseTestResults: boolean = (groupingProperties.indexOf(GroupingProperty.TestRun) > -1
            && parentEntities.indexOf(QueryEntity.TestResultsDaily) > -1);
        
        if(shouldUseTestResults) return QueryEntity.TestResults;

        return QueryEntity.TestResultsDaily;
    }
}