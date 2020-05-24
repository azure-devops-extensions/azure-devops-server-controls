import { SettingsManagerBase } from '../ModernWidgetTypes/SettingsManagerBase';
import undefined from './VelocitySettingsManager';
import { WidgetConfigurationOptions } from 'Dashboards/Scripts/Contracts';
import { SelectorControl } from 'Dashboards/Scripts/Selector';
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import * as Q from 'q';
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';
import * as WidgetHelpers from 'TFS/Dashboards/WidgetHelpers';
import * as Controls from 'VSS/Controls';
import * as SDK from 'VSS/SDK/Shim';
import { DelayedFunction } from 'VSS/Utils/Core';
import * as StringUtils from 'VSS/Utils/String';
import { ProjectIdentity, TeamIdentity } from "Analytics/Scripts/CommonClientTypes";
import { Backlog } from 'Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { BehaviorTiming, NotificationMode } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';
import WidgetResources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import { TeamPicker } from 'Widgets/Scripts/Shared/AnalyticsPickers';
import { NumericInput } from 'Widgets/Scripts/Shared/NumericInput';
import * as WidgetLiveTitle from 'Widgets/Scripts/Shared/WidgetLiveTitle';
import { WITSelector, WorkItemTypeFilterMode } from 'Widgets/Scripts/Shared/WorkItemTypePicker';
import { ErrorParser } from 'Widgets/Scripts/TFS.Widget.Utilities';
import { AdvancedFeaturesPanel, AdvancedFeaturesPanelOptions } from 'Widgets/Scripts/Velocity/AdvancedFeaturesPanel';
import { AggregationConfigurationControl } from 'Widgets/Scripts/Velocity/AggregationConfigurationControl';
import { VelocitySettings } from 'Widgets/Scripts/Velocity/VelocitySettings';
import { SettingsHelper } from 'Widgets/Scripts/Utilities/SettingsHelper';
import VelocitySettingsManager from 'Widgets/Scripts/Velocity/VelocitySettingsManager';
import { BaseWidgetConfiguration } from 'Widgets/Scripts/VSS.Control.BaseWidgetConfiguration';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import { ModernConfigurationBase } from 'Widgets/Scripts/ModernWidgetTypes/ModernConfigurationBase';

export class VelocityConfiguration extends ModernConfigurationBase<VelocitySettings> {

    /** Project is pre-populated based on current context. It is not currently configurable. */
    private projectId: string;

    /** Team picker + supporting Settings Field */
    private teamPickerBlock: SettingsField<TeamPicker>;

    /** "Work Items" Filtering block contains:
     *   -Backlog and Work Item Type Pickers
     */
    private workItemFilterBlock: WITSelector;

    /** "Velocity" Aggregation settings field block:
     *  -Sum/Count picker
     *  -Work item field picker (empty on count)
     */
    private aggregationBlock: SettingsField<AggregationConfigurationControl>;

    /** "Number of Iterations" settings field block. */
    private iterationsBlock: SettingsField<NumericInput>;

    /** "Advanced Features" settings field block contains:
     *   -Boilerplate AX hyperlink for advanced features
     *   -Show Planned work + text + input box
     *   -Highlight late work + text + input box
     */
    private advancedFeaturesBlock: SettingsField<AdvancedFeaturesPanel>;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "velocity-configuration"
        }, options));
    }

        /** Performs validation of all fields. Stops on first failure..*/
    protected isValid(): boolean {
        //Future oriented Q: Can blocks of settings fields here packed into a standard interface which is uniformly handled as an array?
        if (this.teamPickerBlock.control.validate() != null) {
            return false;
        }
        else if (this.workItemFilterBlock.validate() != null) {
            return false;
        }
        else if (this.aggregationBlock.control.validate() != null) {
            return false;
        }
        else if (this.iterationsBlock.control.validate() != null) {
            return false;
        }
        else if (this.advancedFeaturesBlock.control.validate() != null) {
            return false;
        }

        return true;
    }


    protected getSettings(): VelocitySettings {
        let advancedSettings = this.advancedFeaturesBlock.control.getSettings();
        let witFilter = this.workItemFilterBlock.getSettings();

        let aggregation = this.aggregationBlock.control.getSettings();

        return {
            projectId: this.projectId,
            teamId: this.teamPickerBlock.control.getSettings(),
            workItemTypeFilter: witFilter,
            aggregation: aggregation,
            numberOfIterations: this.iterationsBlock.control.getSettings(),
            plannedWorkDelay: advancedSettings.isPlannedWorkEnabled ? advancedSettings.plannedWorkStartOffset : null,
            lateWorkDelay: advancedSettings.isLateWorkEnabled ? advancedSettings.lateWorkDeadlineOffset : null,
            lastArtifactName: null
        };
    }

    // Synchronously constructs pertinent controls. Initial selections and dynamic data population happens subsequent to this step.
    protected render(settings: VelocitySettings): void {

        const $container = this.getElement();

        this.teamPickerBlock = SettingsField.createSettingsField({
                control: TeamPicker.createInstance(null, {
                    change: () => this.onTeamChange(NotificationMode.On)
                }),
                labelText: WidgetResources.AnalyticsWidgetsCommonConfig_TeamLabel,
                hasErrorField: true,
            },
            $container);

        this.workItemFilterBlock = WITSelector.create(WITSelector, $container, {
            labelText: WidgetResources.AnalyticsWidgetsCommonConfig_WorkItemsLabel,
            onChange: (identifier, field) => {
                if (identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
                    this.onBacklogChange(NotificationMode.On);
                } else {
                    this.onWorkItemTypeChange(NotificationMode.On);
                }
            },
            onBacklogChange: () => this.onBacklogChange(NotificationMode.On),
            onWorkItemTypeChange: () => this.onWorkItemTypeChange(NotificationMode.On)
        });

        let workItemTypeFilterModeName = WorkItemTypeFilterMode[settings.workItemTypeFilter.identifier];
        this.workItemFilterBlock.selectField(workItemTypeFilterModeName, false);

        this.aggregationBlock = SettingsField.createSettingsField({
                labelText: WidgetResources.VelocityConfig_VelocityLabel,
                control: AggregationConfigurationControl.create(AggregationConfigurationControl, $container, {
                    onChanged: (mode: AggregationMode, field: string) => { this.onAggregationChange(NotificationMode.On) }
                }),
                hasErrorField: true,
            },
            $container);


        this.iterationsBlock = SettingsField.createSettingsField({
                labelText: WidgetResources.VelocityConfig_NumberIterationsLabel,
                control: NumericInput.create(NumericInput, $container, {
                    initialValue: settings.numberOfIterations,
                    onChange: () => { this.onIterationChange(NotificationMode.On) },
                    maxValue: 15,
                    minValue: 1
                }),
                hasErrorField: true
            },
            $container);

        let advancedFeaturesPanelOptions = <AdvancedFeaturesPanelOptions>{
            isPlannedWorkEnabled: settings.plannedWorkDelay != null,
            plannedWorkStartOffset: settings.plannedWorkDelay || 0,

            isLateWorkEnabled: settings.lateWorkDelay != null,
            lateWorkDeadlineOffset: settings.lateWorkDelay || 0,

            onChange: () => { this.onAdvancedBlockChange(NotificationMode.On) }
        };

        this.advancedFeaturesBlock = SettingsField.createSettingsField({
                labelText: WidgetResources.VelocityConfig_AdvancedFeaturesLabel,
                control: AdvancedFeaturesPanel.create(AdvancedFeaturesPanel, $container, advancedFeaturesPanelOptions),
                hasErrorField: true
            },
            $container);
    }

    /** Handles init of dynamically populated options, and application of initial selections. */
    protected loadDataAndSetSelections(settings: VelocitySettings): IPromise<void[]> {
        this.liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(
            settings,
            WidgetResources.Velocity_DefaultWidgetName);

        this.projectId = settings.projectId;

        this.iterationsBlock.control.setValue(settings.numberOfIterations);
        //Note: Advanced features block is initialized with settings at render()
        let promises = [];

        this.teamPickerBlock.toggleControlBusyOverlay(true);
        promises.push(this.teamPickerBlock.control.setContext(settings.projectId)
            .then(() => {
                this.teamPickerBlock.toggleControlBusyOverlay(false);
                return this.setSelectedTeam(settings);
            }, e => {
                this.teamPickerBlock.toggleControlBusyOverlay(false);
                throw e;
            }));

        this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(true);
        promises.push(this.workItemFilterBlock.workItemTypeSettingsField.control.setContext(settings.projectId)
            .then(() => {
                return this.setSelectedWorkItemType(settings).then(() => {
                    this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(false);

                    // Once work item types are available, set the aggregation work item types.
                    return this.setSelectedAggregationValues(settings);
                });
            }, e => {
                this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(false);
                throw e;
            }));

        return Q.all<void>(promises);
    }

    private setSelectedTeam(settings: VelocitySettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        if (settings && settings.teamId) {
            const teamWasSet = this.teamPickerBlock.control.setSelectedByPredicate(
                team => team.TeamId === settings.teamId,
                /*fireEvent*/ false);

            if (teamWasSet) {
                promise = this.onTeamChange(NotificationMode.Silent, settings);
            } else {
                this.teamPickerBlock.showError(WidgetResources.CumulativeFlowDiagram_PreviouslySelectedTeamNotFoundError);
            }
        }

        return promise;
    }

    /** Ensures Backlog picker is active mode, and applies setting value, or chooses relevant default.*/
    private setSelectedBacklog(settings?: VelocitySettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        let backlogPicker = this.workItemFilterBlock.backlogSettingsField.control;
        if (settings && settings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
            this.workItemFilterBlock.selectField(WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory], false);

            let backlogWasSet = backlogPicker.setSelectedByPredicate(
                backlog => backlog.Category === settings.workItemTypeFilter.settings,
                false);

            if (backlogWasSet) {
                promise = this.onBacklogChange(NotificationMode.Silent);
            } else {
                this.workItemFilterBlock.backlogSettingsField.showError(WidgetResources.LeadTime_PreviouslySelectedBacklogNotFoundError);

                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    backlogPicker.getName(),
                    "SavedSetting");
            }
        } else {
            // Try to keep current selection before attempting to select default
            if (backlogPicker.getValue() == null) {
                // Select the lowest level backlog.
                // Backlogs are sorted by BacklogLevel desc
                backlogPicker.setSelectedIndex(0, false);
            }

            promise = this.onBacklogChange(NotificationMode.Silent);
        }

        return promise;
    }

    private setSelectedWorkItemType(settings?: VelocitySettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        let workItemTypePicker = this.workItemFilterBlock.workItemTypeSettingsField.control;
        if (settings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
            this.workItemFilterBlock.selectField(WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType], false);

            let typeWasSet = workItemTypePicker.setSelectedByPredicate(
                workItem => workItem === settings.workItemTypeFilter.settings,
                false);

            if (typeWasSet) {
                promise = this.onWorkItemTypeChange(NotificationMode.Silent); // Don't notify when we're loading from settings
            } else {
                this.workItemFilterBlock.workItemTypeSettingsField.showError(WidgetResources.KanbanTime_PreviouslySelectedWitTypeNotFoundError);
            }
        } else {
            // Default selection to first item
            this.workItemFilterBlock.workItemTypeSettingsField.control.setSelectedIndex(0, false);
        }

        return promise;
    }

    /** sets the work item types and selected values based on the settings */
    private setSelectedAggregationValues(settings: VelocitySettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        let aggregationControl = this.aggregationBlock.control;

        aggregationControl.showBusyOverlay();
        if (settings.workItemTypeFilter.identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
            promise = SettingsHelper.getTeamWorkItemTypesOfBacklogCategory(settings.projectId, settings.teamId, settings.workItemTypeFilter.settings)
                .then((workItemTypes) => {
                    return aggregationControl.setContext(this.projectId, workItemTypes);
                });
        } else if (settings.workItemTypeFilter.identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
            promise = aggregationControl.setContext(this.projectId, settings.workItemTypeFilter.settings);
        }

        promise
            .then(() => {
                aggregationControl.setSelection(settings.aggregation.identifier, settings.aggregation.settings);
            })
            .then(
                () => aggregationControl.hideBusyOverlay(),
                e => {
                    aggregationControl.hideBusyOverlay();
                    throw e;
                });

        return promise;
    }

    /** Updates the work item types based on the state of the workItemFilterBlock */
    private updateAggregationWorkItemTypes(): IPromise<void> {

        let promise: IPromise<void> = Q<void>(null);

        if (this.workItemFilterBlock.getSettings().identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {

            let backlog = this.workItemFilterBlock.backlogSettingsField.control.getValue() as Backlog;
            let team = this.teamPickerBlock.control.getValue() as TeamIdentity;
            if (backlog) {
                promise = SettingsHelper.getTeamWorkItemTypesOfBacklogCategory(this.projectId, team.TeamId, backlog.Category)
                    .then(workItemTypes => {
                        this.aggregationBlock.control.showBusyOverlay();
                        return this.aggregationBlock.control.setContext(this.projectId, workItemTypes);
                    });
            }
        }
        else if (this.workItemFilterBlock.getSettings().identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
            let selectedWorkItemType = this.workItemFilterBlock.workItemTypeSettingsField.control.getValue();
            this.aggregationBlock.control.showBusyOverlay();
            promise = this.aggregationBlock.control.setContext(this.projectId, selectedWorkItemType);
        }

        return promise.then<void>(
            () => this.aggregationBlock.control.hideBusyOverlay(),
            e => {
                this.aggregationBlock.control.hideBusyOverlay();
                throw e;
            });
    }

    /**
     * Called when the value of the team selector changes.
     * Propogates changes to other selectors and notifies the widget about the changes once the other selectors have finished setting their data.
     * @param notifyChanges - Whether or not this change should notify the widget about changes after propogation
     * @returns A promise that resolves when all propogated changes triggered by this change are completed
     */
    private onTeamChange(notificationMode: NotificationMode, settings?: VelocitySettings): IPromise<void> {
        this.teamPickerBlock.hideError();

        let errMessage = this.teamPickerBlock.control.validate();
        if (errMessage == null) {
            let selectedTeam = this.teamPickerBlock.control.getValue() as TeamIdentity;

            this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(true);
            return this.workItemFilterBlock.backlogSettingsField.control.setContext(this.tfsContext.project.id, [selectedTeam.TeamId])
                .then(() => {
                    this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(false);
                    return this.setSelectedBacklog(settings);
                }, e => {
                    this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(false);
                    throw e;
                })
                .then<void>(() => {
                    if (notificationMode === NotificationMode.On) {
                        this.packSettingsAndRequestWidgetReload();
                    }
                });
        } else {
            this.teamPickerBlock.showError(errMessage);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q<void>(null);
        }
    }

    private onBacklogChange(notificationMode: NotificationMode): IPromise<void> {
        this.workItemFilterBlock.backlogSettingsField.hideError();

        let errMessage = this.workItemFilterBlock.backlogSettingsField.control.validate();
        if (errMessage == null) {
            return this.updateAggregationWorkItemTypes()
                .then<void>(() => {
                    if (notificationMode === NotificationMode.On) {
                        this.packSettingsAndRequestWidgetReload();
                    }
                });
        }
        else {
            this.workItemFilterBlock.backlogSettingsField.showError(errMessage);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q<void>(null);
        }
    }

    private onWorkItemTypeChange(notificationMode: NotificationMode): IPromise<void> {
        this.workItemFilterBlock.workItemTypeSettingsField.hideError();

        let errMessage = this.workItemFilterBlock.workItemTypeSettingsField.control.validate();
        if (errMessage == null) {
            return this.updateAggregationWorkItemTypes()
                .then<void>(() => {
                    if (notificationMode === NotificationMode.On) {
                        this.packSettingsAndRequestWidgetReload();
                    }
                });
        }
        else {
            this.workItemFilterBlock.workItemTypeSettingsField.showError(errMessage);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q<void>(null);
        }
    }

    private onAggregationChange(notificationMode: NotificationMode): IPromise<void> {
        return this.validateAndReact(
            notificationMode,
            this.aggregationBlock);
    }

    private onIterationChange(notificationMode: NotificationMode): IPromise<void> {
        return this.validateAndReact(
            notificationMode,
            this.iterationsBlock);
    }

    private onAdvancedBlockChange(notificationMode: NotificationMode, settings?: VelocitySettings): IPromise<void> {
        return this.validateAndReact(
            notificationMode,
            this.advancedFeaturesBlock);
    }

    protected getCalculatedWidgetTitle(): string {
        const selectedTeam = this.teamPickerBlock.control.getValue() as TeamIdentity;
        const teamName = selectedTeam.TeamName;

        const title = StringUtils.format(WidgetResources.VelocityConfig_NameFormat, teamName);

        return title;
    }

    protected getSettingsManager(): SettingsManagerBase<VelocitySettings>{
        return new VelocitySettingsManager();
    }
}

SDK.VSS.register("dashboards.velocityConfiguration", () => VelocityConfiguration);
SDK.registerContent("dashboards.velocityConfiguration-init", (context) => {
    let options = <WidgetConfigurationOptions>context.options;
    return Controls.create(VelocityConfiguration, context.$container, options);
});
