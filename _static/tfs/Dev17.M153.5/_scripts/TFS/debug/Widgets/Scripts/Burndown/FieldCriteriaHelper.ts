import * as Utils_String from "VSS/Utils/String";
import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import { WorkItemFieldDescriptor } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';
import { WorkItemTypeFieldsQuery } from 'Widgets/Scripts/Burndown/Queries/WorkItemTypeFieldsQuery';

/**
 *  Helper class to support operations on the Field Criteria filter.
 */
export class FieldCriteriaHelper {

    /**
     * Retrieves a list of work item field descriptors, and discards unsupported field names and types.
     * @param projectIds: list of project ids
     */
    public static getAllowedFieldDescriptors(projectId: string, workItemTypes: string[]): IPromise<WorkItemFieldDescriptor[]> {

        return this.getWorkItemFieldDescriptorsFromQuery(projectId, workItemTypes).then((workItemFieldDescriptors) => {
            let allowedFieldDescriptors: WorkItemFieldDescriptor[] = [];

            workItemFieldDescriptors.forEach(fieldDescriptor => {
                if (this.isAllowedFieldDescriptor(fieldDescriptor)) {
                    allowedFieldDescriptors.push(fieldDescriptor);
                }
            });

            return allowedFieldDescriptors;
        });
    }

    /**
      * Queries the Analytics Service and returns a list of field names and types.
      * @param projectIds: list of project ids
    */
    public static getWorkItemFieldDescriptorsFromQuery(projectId: string, workItemTypes: string[]): IPromise<WorkItemFieldDescriptor[]> {
        let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        let query = new WorkItemTypeFieldsQuery([projectId], workItemTypes);

        return dataService.getCacheableQueryResult<WorkItemFieldDescriptor[]>(query);
    }

    /**
     * Returns true if the field type and field name is allowed.
     * @param fieldDescriptor
     */
    public static isAllowedFieldDescriptor(fieldDescriptor: WorkItemFieldDescriptor): boolean {
        return FieldCriteriaHelper.supportedFieldTypes.indexOf(fieldDescriptor.FieldType) >= 0;
    }

    /** List of field types that are supported currently **/
    public static supportedFieldTypes: string[] = [
        "String",
        "Integer",
        "Double",
        "PlainText",
        // "Boolean", // TODO #1070307
        "TreePath",
        // "DateTime", // TODO #1070308
        // "Tags" // This is supported specially elsewhere, so apparently we can filter it out here without consequence?
    ];
}
