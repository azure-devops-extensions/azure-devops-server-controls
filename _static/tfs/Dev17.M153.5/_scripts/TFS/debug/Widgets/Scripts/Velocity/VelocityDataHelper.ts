import { WitFieldUtilities} from 'Analytics/Scripts/WitFieldUtilities';
import { WorkItemStateCategory } from 'Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service';
import StringUtils = require('VSS/Utils/String');
import { Iteration } from 'Analytics/Scripts/CommonClientTypes';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import WidgetResources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { VelocityConstants } from 'Widgets/Scripts/Velocity/VelocityConstants';
import { Metastate, WorkItemTypeField } from 'Widgets/Scripts/Velocity/VelocityDataContract';

/**
 *  Helper methods for data handling in the Velocity Widget
 */
export class VelocityDataHelper {
    public static getScalarMeasure(aggregationWorkItemTypeFields: WorkItemTypeField[], aggregation: ModefulValueSetting<AggregationMode, string>): string {
        switch (aggregation.identifier) {
            case AggregationMode.Sum: return VelocityDataHelper.getWorkItemTypeFieldName(aggregationWorkItemTypeFields, aggregation.settings);
            case AggregationMode.Count: return WidgetResources.VelocityWidget_CountOfWorkItems;
        }
    }

    public static getQueryAggregation(aggregation: ModefulValueSetting<AggregationMode, string>): string {
        switch (aggregation.identifier) {
            case AggregationMode.Sum:
                const odataPropertyName = WitFieldUtilities.getFieldODataPropertyName(aggregation.settings);
                if (odataPropertyName == null || odataPropertyName.trim().length === 0) {
                    throw new Error(`No property name found for aggregation setting: '${aggregation.settings}'`);
                }

                return `aggregate(${odataPropertyName} with sum as ${VelocityConstants.queryResult})`;
            case AggregationMode.Count:
                return `aggregate($count as ${VelocityConstants.queryResult})`;
            default:
                throw new Error(`Unexpected aggregation mode: '${aggregation.identifier}'`);
        }
    }

    public static getAverageVelocity(metastates: Metastate[], iterations: Iteration[]): number {
        var velocitySum: number = 0;
        var completedIterationCount: number = 0;

        iterations.map((iteration: Iteration) => {
            if (iteration.IsEnded) {
                metastates.map((metastate: Metastate) => {
                    if ((metastate.StateCategory === WorkItemStateCategory[WorkItemStateCategory.Completed]) && (metastate.IterationSK === iteration.IterationSK)) {
                        velocitySum += metastate.AggregationResult;
                    }
                });

                completedIterationCount++;
            }
        });

        return (completedIterationCount > 0) ? Math.round(velocitySum / completedIterationCount) : 0;
    }

    public static getSubtitle(iterationCount: number) {
        if (iterationCount === 1) {
            return WidgetResources.VelocityWidget_SingleIterationSubtitle;
        } else if (iterationCount > 1) {
            return StringUtils.format(WidgetResources.VelocityWidget_IterationsSubtitle, iterationCount.toString());
        } else return WidgetResources.VelocityWidget_NoIterations;
    }

    /**
     * Looks up the work item type field name from a list of queried work item type fields.
     * Method is public for unit testing.
     * @param aggregationWorkItemTypeFields
     * @param aggregationSetting
     */
    public static getWorkItemTypeFieldName(aggregationWorkItemTypeFields: WorkItemTypeField[], aggregationSetting: string): string {
        let fieldName = StringUtils.empty;

        for (let workItemTypeField of aggregationWorkItemTypeFields) {
            if (!StringUtils.ignoreCaseComparer(workItemTypeField.FieldReferenceName, aggregationSetting)) {
                fieldName = workItemTypeField.FieldName;
                break;
            }
        }

        return fieldName;
    }
};