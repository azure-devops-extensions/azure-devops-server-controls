/// <reference types="jquery" />
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { DragDropScopes, IdentityControlConsumerIds } from "Agile/Scripts/Common/Agile";
import * as WorkDetailsPanelResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.WorkDetailsPanel";
import { GroupedProgressControl, IGroupedProgressControlOptions } from "Agile/Scripts/SprintsHub/WorkDetailsPanel/Components/GroupedProgressControl";
import {
    ActivityGroupDataProvider,
    AssignedToGroupDataProvider,
    TeamGroupDataProvider
} from "Agile/Scripts/SprintsHub/WorkDetailsPanel/WorkDetailsDataProviders";
import {
    DroppableWorkItemChangeEnhancement,
    DroppableWorkItemChangeOptions,
    UpdateControlOnHoverEnhancement
} from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { IdentityHelper, IIdentityReference } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IdentityViewControl } from "Presentation/Scripts/TFS/TFS.UI.Controls.Identities";
import { BaseControl, Enhancement } from "VSS/Controls";
import * as Diag from "VSS/Diag";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { EntityFactory, IdentityDisplayControl, IdentityPickerControlSize, IIdentityDisplayOptions } from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { format } from "VSS/Utils/String";
import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";

/**
 * Interface representing work details panel settings.
 */
export interface IWorkDetailsPanelOptions {
    /** Field aggregator for capacity calculations */
    fieldAggregator: FieldAggregator;

    /** Provides data for the "Work by: Assigned To" section. */
    assignedToGroupDataProvider: AssignedToGroupDataProvider;

    /** Provides data for the "Work by: Activity" section. */
    activityGroupDataProvider: ActivityGroupDataProvider;

    /** Provides data for the "Work" section. */
    teamGroupDataProvider: TeamGroupDataProvider;

    /** Remaining work suffix format. */
    remainingWorkSuffixFormat: string;

    /** Droppable workItemChangeOptions to be used for setting up drag/drop. Drag/drop is disabled if this is not passed. */
    droppableWorkItemChangeOptions?: DroppableWorkItemChangeOptions;
}

export namespace WorkDetailsPanelContainers {
    export const TeamCapacity: string = "team-capacity-control";
    export const ActivityGroupedProgress: string = "activity-grouped-progress-control";
    export const AssignedToGroupedProgress: string = "assigned-to-grouped-progress-control";
    export const CapacityPaneContainer: string = "capacity-pane-container";
}

namespace CssClasses {
    export const CapacityPane: string = "capacity-pane";
}

/**
 * NOTE: This is a copy of capacityPanel.ts with some modifications to reuse it in sprintsHub.
 * We plan to delete the old file when all the hubs are turned ON and backlogsHub is retired.
 */
export class WorkDetailsPanel {

    private _fieldAggregator: FieldAggregator;
    private _droppableOptions: DroppableWorkItemChangeOptions;
    private _assignedToDataProvider: AssignedToGroupDataProvider;
    private _teamDataProvider: TeamGroupDataProvider;
    private _activityDataProvider: ActivityGroupDataProvider;
    private _droppableWorkItemChangeEnhancements: DroppableWorkItemChangeEnhancement[];
    private _updateControlOnHoverEnhancements: UpdateControlOnHoverEnhancement[];
    private _remainingWorkSuffixFormat: string;

    constructor(options: IWorkDetailsPanelOptions) {
        this._fieldAggregator = options.fieldAggregator;
        this._droppableOptions = options.droppableWorkItemChangeOptions;
        this._remainingWorkSuffixFormat = options.remainingWorkSuffixFormat;
        this._droppableWorkItemChangeEnhancements = [];
        this._updateControlOnHoverEnhancements = [];

        this._assignedToDataProvider = options.assignedToGroupDataProvider;
        this._activityDataProvider = options.activityGroupDataProvider;
        this._teamDataProvider = options.teamGroupDataProvider;

        this._createCapacityPane(this._fieldAggregator);
    }

    public _createCapacityPane(fieldAggregator: FieldAggregator) {
        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        this._buildCapacityPaneControls(fieldAggregator);
        $(`.${CssClasses.CapacityPane}`).css("display", "block");
    }

    public dispose(): void {

        if (this._assignedToDataProvider) {
            this._assignedToDataProvider.dispose();
            this._assignedToDataProvider = null;
            $(`.${WorkDetailsPanelContainers.AssignedToGroupedProgress}`).empty();
        }

        if (this._teamDataProvider) {
            this._teamDataProvider.dispose();
            this._teamDataProvider = null;
            $(`.${WorkDetailsPanelContainers.TeamCapacity}`).empty();
        }

        if (this._activityDataProvider) {
            this._activityDataProvider.dispose();
            this._activityDataProvider = null;
            $(`.${WorkDetailsPanelContainers.ActivityGroupedProgress}`).empty();
        }

        if (this._droppableWorkItemChangeEnhancements && this._droppableWorkItemChangeEnhancements.length > 0) {
            this._droppableWorkItemChangeEnhancements.forEach((item) => this._destroyDroppable(item.getElement()));
            this._droppableWorkItemChangeEnhancements = null;
        }

        if (this._updateControlOnHoverEnhancements && this._updateControlOnHoverEnhancements.length > 0) {
            this._updateControlOnHoverEnhancements.forEach((item) => this._destroyDroppable(item.getElement()));
            this._updateControlOnHoverEnhancements = null;
        }

        $(`.${WorkDetailsPanelContainers.CapacityPaneContainer}`).removeClass(CssClasses.CapacityPane);
    }

    private _destroyDroppable($element: JQuery): void {
        const options = {
            create: null,
            activate: null,
            deactivate: null,
            over: null,
            out: null,
            drop: null,
            accept: null
        } as JQueryUI.DroppableOptions;
        $element.droppable(options);
        $element.droppable("destroy");
    }

    private _buildCapacityPaneControls(fieldAggregator: FieldAggregator) {

        const droppableBehavior = this._getDroppableBehavior();
        const expandOnHoverBehaviour = this._getExpandOnHoverBehavior();

        $(`.${WorkDetailsPanelContainers.CapacityPaneContainer}`).addClass(CssClasses.CapacityPane);

        // Create the assigned to progress control
        this._renderAssignedToSection(droppableBehavior, expandOnHoverBehaviour);

        // Create the team progress control
        this._renderTeamCapacitySection(expandOnHoverBehaviour);

        // Create activity control
        this._renderActivitySection(droppableBehavior, expandOnHoverBehaviour);
    }

    private _getDroppableBehavior = (): IEventHandler => {
        if (!this._droppableOptions) {
            return null;
        }

        return (sender, args) => {
            const control = args.control;
            const fieldName = args.fieldName;

            const droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions = $.extend(
                {},
                this._droppableOptions,
                {
                    text: args.value,
                    fieldName: fieldName,
                    hoverClass: "dragHover",
                    tolerance: "pointer"
                }
            );

            if (fieldName) {//FieldName is null for the teamProgressControlGroup which is not a valid drop zone
                const droppableWorkItemChangeEnhancement = <DroppableWorkItemChangeEnhancement>Enhancement.enhance(
                    DroppableWorkItemChangeEnhancement,
                    control.getElement(),
                    droppableWorkItemChangeOptions);
                this._droppableWorkItemChangeEnhancements.push(droppableWorkItemChangeEnhancement);
            }
        };
    }

    private _getExpandOnHoverBehavior = (): IEventHandler => {
        if (!this._droppableOptions) {
            return null;
        }
        return (sender, args) => {
            const updateControlOnHoverEnhancement = <UpdateControlOnHoverEnhancement>Enhancement.enhance(
                UpdateControlOnHoverEnhancement,
                args.control,
                {
                    scope: DragDropScopes.IterationBacklog, // Match the scope of the draggable items in the grid.
                    tolerance: "pointer",
                    onOverCallback: args.onOverCallback,
                    onOutCallBack: args.onOutCallBack
                }
            );
            this._updateControlOnHoverEnhancements.push(updateControlOnHoverEnhancement);
        };
    }

    private _renderAssignedToSection(
        droppableBehavior: IEventHandler,
        expandOnHoverBehavior: IEventHandler): void {

        const groupedProgressControlOptions: IGroupedProgressControlOptions = {
            fixedTopText: WorkDetailsPanelResources.Capacity_Unassigned, // To ensure Unassigned is always inserted at the top
            suffixFormat: this._remainingWorkSuffixFormat,
            dataProvider: this._assignedToDataProvider,
            headerText: format(WorkDetailsPanelResources.SectionTitle_Prefix, this._assignedToDataProvider.getGroupDisplayName()),
            dropHandler: droppableBehavior,
            expandOnHoverHandler: expandOnHoverBehavior,
            renderDisplayContents: (displayText: string) => {
                if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileUseNewIdentityControls)) {

                    // The identity to display. If unique-name string, the control will resolve the details from the server.
                    let item: string | IEntity;

                    // The text to be displayed if/while the identity's details are being resolved from the server
                    // not needed/used if item is already an IEntity.
                    let userFriendlyDisplayName: string;

                    if (displayText === WorkDetailsPanelResources.Capacity_Unassigned) {
                        // Use a fake 'string entity', which will not need to be resolved from the server.
                        item = EntityFactory.createStringEntity(displayText, WitIdentityImages.UnassignedImageUrl);
                        userFriendlyDisplayName = displayText;
                    } else {
                        // The control will need to resolve the real entity details from the server, given the unique name.
                        // displayText is the disambiguated display name (e.g. "John <FOO\john>" or "Jane <jane@foo.com>").
                        // We can parse the unique ("FOO\john" or "jane@foo.com") & display names ("John" or "Jane") from this, but fall-back to it.
                        const identityRef: IIdentityReference = IdentityHelper.parseUniquefiedIdentityName(displayText);
                        item = (identityRef && identityRef.uniqueName) || displayText;
                        userFriendlyDisplayName = (identityRef && identityRef.displayName) || displayText;
                    }

                    // Create the new 'identity display control'.
                    const $container = $("<div>");
                    const options: IIdentityDisplayOptions = {
                        identityType: { User: true },
                        operationScope: { IMS: true },
                        item: item,
                        friendlyDisplayName: userFriendlyDisplayName,
                        size: IdentityPickerControlSize.Medium,  // (Currently 24px)
                        consumerId: IdentityControlConsumerIds.SprintPlanningDisplayControl
                    };
                    BaseControl.createIn(IdentityDisplayControl, $container, options);

                    return $container;
                } else {
                    // Create the classic 'identity view control'.
                    return IdentityViewControl.getIdentityViewElement(displayText);
                }
            }
        };
        const container = $(`.${WorkDetailsPanelContainers.AssignedToGroupedProgress}`);

        <GroupedProgressControl>BaseControl.createIn(GroupedProgressControl, container, groupedProgressControlOptions);
    }

    private _renderTeamCapacitySection(expandOnHoverBehavior: IEventHandler): void {
        const groupedProgressControlOptions: IGroupedProgressControlOptions = {
            suffixFormat: this._remainingWorkSuffixFormat,
            dataProvider: this._teamDataProvider,
            headerText: WorkDetailsPanelResources.SectionTitle_TeamCapacity,
            expandOnHoverHandler: expandOnHoverBehavior,
            renderDisplayContents: false
        };
        const container = $(`.${WorkDetailsPanelContainers.TeamCapacity}`);

        <GroupedProgressControl>BaseControl.createIn(GroupedProgressControl, container, groupedProgressControlOptions);
    }

    private _renderActivitySection(
        droppableBehavior: IEventHandler,
        expandOnHoverBehavior: IEventHandler): void {

        // Create the Activity group if the activity field was provided.
        const dataProvider = this._activityDataProvider;
        const container = $(`.${WorkDetailsPanelContainers.ActivityGroupedProgress}`);

        if (dataProvider && dataProvider.getGroupDisplayName()) {
            const groupedProgressControlOptions: IGroupedProgressControlOptions = {
                fixedTopText: WorkDetailsPanelResources.Capacity_Unassigned, // To ensure Unassigned is always inserted at the top
                suffixFormat: this._remainingWorkSuffixFormat,
                dataProvider: dataProvider,
                headerText: format(WorkDetailsPanelResources.SectionTitle_Prefix, dataProvider.getGroupDisplayName()),
                dropHandler: droppableBehavior,
                expandOnHoverHandler: expandOnHoverBehavior,
                renderDisplayContents: false
            };

            <GroupedProgressControl>BaseControl.createIn(GroupedProgressControl, container, groupedProgressControlOptions);
        } else {
            // Hide the activity group since it will not have any content.
            container.css("display", "none");
        }
    }
}