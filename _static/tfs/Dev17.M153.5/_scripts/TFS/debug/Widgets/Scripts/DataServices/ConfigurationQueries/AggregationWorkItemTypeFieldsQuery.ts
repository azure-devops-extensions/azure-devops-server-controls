import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { ConfigurationAxQueryBase } from 'Widgets/Scripts/DataServices/ConfigurationQueries/ConfigurationAxQueryBase';
import { WorkItemTypeField } from 'Widgets/Scripts/Velocity/VelocityDataContract';

export class AggregationWorkItemTypeFieldsQuery extends ConfigurationAxQueryBase<WorkItemTypeField[]>{

    constructor(projectId: string) {
        super(AggregationWorkItemTypeFieldsQuery.generateQueryOptions(projectId));        
    }
    
    public getQueryName(): string {
        return "AggregationWorkItemTypeFieldsQuery";
    }

    private static generateQueryOptions(projectId: string): ODataQueryOptions {
        // $filter
        let $filter = '(FieldType eq \'Integer\' or FieldType eq \'Double\') and (not startswith(FieldReferenceName,\'System.\'))';

        return {
            entityType: "WorkItemTypeFields",
            oDataVersion: ConfigurationAxQueryBase.axODataVersion1,
            project: projectId,
            $filter: $filter
        };
    }
}
