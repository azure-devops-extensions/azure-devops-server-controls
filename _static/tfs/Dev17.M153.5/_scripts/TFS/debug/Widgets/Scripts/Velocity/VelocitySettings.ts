import { AggregationMode, TeamScope } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { ITrackName } from 'Widgets/Scripts/Shared/WidgetLiveTitle';

export interface VelocitySettings extends TeamScope, ITrackName {
    /**
     * Describes the set of work item types to select. Uses WorkItemTypeFilterMode enum strings for identifiers.
     */
    workItemTypeFilter: ModefulValueSetting<string, string>;

    /**
     * Number of iterations to display in the Widget
     */
    numberOfIterations: number;

    /**
     * Describes the mode of aggregation.
     *  If mode is a sum based aggregation, the field identifies the field to aggregate on.
     */
    aggregation: ModefulValueSetting<AggregationMode, string>;

    /**
     * (Optional)
     * Indicates the delay after the start date of an iteration when the planned work set is finalized.
     * If the value is omitted/undefined, planned work will not be charted.
     * 
     * Used by teams that finalize iteration planning after the start of an iteration.
     */
    plannedWorkDelay?: number; // Note: Value of undefined means the feature is disabled

    /**
     * (Optional)
     * Indicates the delay after the end date of an iteration that work can be completed and still considered on-time.
     * If the value is omitted/undefined, late completed work is charted as on-time.
     *
     * Used by teams to give an affordance for completing work after an iteration ends without considering it late/exceptional. For example,
     * this could be used to allow work that is completed over a weekend between iterations to be considered completed on time.
     */
    lateWorkDelay?: number; // Note: Value of undefined means the feature is disabled
}
