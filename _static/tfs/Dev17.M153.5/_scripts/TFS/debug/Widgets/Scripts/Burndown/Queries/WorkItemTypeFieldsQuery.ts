import { ODataWorkItemFieldDescriptor } from 'Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { ODataQueryOptions } from "Analytics/Scripts/OData";
import * as Utils_Array from 'VSS/Utils/Array';
import { WorkItemFieldDescriptor } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { BurndownQueryBase } from "Widgets/Scripts/Burndown/Queries/BurndownQueryBase";
import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import { WitFieldUtilities } from "Analytics/Scripts/WitFieldUtilities";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";

/**
 * Query work item types with optional list of work item types IDs
 * Note that this requires project IDs for security reasons
 */
export class WorkItemTypeFieldsQuery extends BurndownQueryBase<WorkItemFieldDescriptor[]>{
    constructor(projectIDs: string[], workItemTypes?: string[]) {
        super(WorkItemTypeFieldsQuery.generateQueryOptions(projectIDs, workItemTypes));
    }

    protected interpretQueryResults(sourceFieldDescriptors: { value: ODataWorkItemFieldDescriptor[] }): WorkItemFieldDescriptor[] {
        // There are several data enrichment steps to perform here.
        let descriptors: WorkItemFieldDescriptor[] = [];

        // Figure out the corresponding property path in analytics for this field descriptor
        sourceFieldDescriptors.value.map(value => {
            descriptors.push(this.translateDescriptor(value));
        });

        return descriptors;
    }

    private translateDescriptor(sourceDescriptor: ODataWorkItemFieldDescriptor): WorkItemFieldDescriptor {
        let clientSideDescriptor: WorkItemFieldDescriptor;

        // Check if the type is one of types that needs to be wrapped in quotes and escaped when passed to odata
        let useQuotes = WorkItemTypeFieldsQuery.QuotableTypes.indexOf(sourceDescriptor.FieldType) >= 0

        let analyticsFilterName = WitFieldUtilities.getFieldODataPropertyName(sourceDescriptor.FieldReferenceName);

        // For certain well-known fields, analytics represents them as navigation properties,
        // so we need to construct the filter a little differently.
        if (WorkItemTypeFieldsQuery.AnalyticsQueryPathDict.hasOwnProperty(sourceDescriptor.FieldReferenceName)) {
            analyticsFilterName = WorkItemTypeFieldsQuery.AnalyticsQueryPathDict[sourceDescriptor.FieldReferenceName];
        }

        // Figure out the corresponding way to retrieve the query value
        let getAnalyticsQueryValueFunc: (FieldFilter) => string = WorkItemTypeFieldsQuery.defaultFieldExtractor;

        return {
            FieldName: sourceDescriptor.FieldName,
            FieldReferenceName: sourceDescriptor.FieldReferenceName,
            FieldType: sourceDescriptor.FieldType,
            UseQuotes: useQuotes,
            AnalyticsFilterName: analyticsFilterName,
            GetAnalyticsQueryValueFunc: getAnalyticsQueryValueFunc
        };
    }


    private static generateQueryOptions(projectIDs: string[], workItemTypes?: string[]): ODataQueryOptions {
        const projects = Utils_Array.unique(projectIDs);
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);
        let $apply = `filter((${projectsClause})`;

        // Adding optional filter for work item types
        // This is used by the widget when getting metadata for a known list of types
        // The configuration will not pass this parameter, getting all work item types for filter setup
        if (!!workItemTypes && workItemTypes.length > 0) {
            $apply += ` and (${QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */)})`;
        }
        $apply += ")/groupby((FieldName,FieldType,FieldReferenceName))";

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,
            {
                entityType: "WorkItemTypeFields",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $apply: $apply,
                $orderby: "FieldName"
            }
        );
    }

    public getQueryName(): string {
        return "WorkItemTypeFieldsQuery";
    }

    private static QuotableTypes = [
        "DateTime",
        "PlainText", // Strings over 255
        "String", // Strings under 256
        "Html",
        "TreePath"
    ]

    public static identityFieldExtractor = (fieldFilter: FieldFilter) => {
        if (!fieldFilter.queryValue) {
            return "";
        }

        let entity = WITIdentityHelpers.parseUniquefiedIdentityName(fieldFilter.queryValue);
        return entity.signInAddress;
    }

    public static defaultFieldExtractor = (fieldFilter: FieldFilter) => {
        return fieldFilter.queryValue;
    }

    public static AnalyticsQueryPathDict: IDictionaryStringTo<string> = {
        "System.AreaPath": "Area/AreaPath",
        "System.IterationPath": "Iteration/IterationPath",
    }
}
