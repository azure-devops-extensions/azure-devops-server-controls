import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { CapacityActions } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActions";
import { ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { Props } from "VSS/Flux/Component";

export interface IWorkDetailsPanelDataProvidersInput {
    /** Field aggregator for capacity calculations */
    fieldAggregator: FieldAggregator;

    /** Sprint capacity options. */
    capacityOptions: ISprintCapacityOptions;

    /** Team Capacity model. */
    teamCapacityModel: TeamCapacityModel;

    /** Optional Capacity Pivot actions. Used for reacting to capacity pivot actions that should update this panel's data. */
    capacityActions?: CapacityActions;
}

export interface IWorkDetailsPanelData extends IWorkDetailsPanelDataProvidersInput {
    /** Droppable workItemChangeOptions to be used for setting up drag/drop. Drag/drop is disabled if this is not passed */
    droppableWorkItemChangeOptions?: DroppableWorkItemChangeOptions;
}

export interface IWorkDetailsPanelWrapperProps extends IWorkDetailsPanelData, Props {

    onDismiss: () => void;
}