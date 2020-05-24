import { ISettingsField, SettingsField } from 'Dashboards/Scripts/SettingsField';
import * as Q from 'q';
import * as WidgetHelpers from 'TFS/Dashboards/WidgetHelpers';
import * as Controls from 'VSS/Controls';
import * as StringUtils from 'VSS/Utils/String';
import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { ProjectTeamPickerList } from 'Widgets/Scripts/Burndown/ProjectTeamPickerList';
import { AnalyticsChartingClient } from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import { AnalyticsFilterScope } from 'Widgets/Scripts/Controls/FieldFilter/AnalyticsFilterBlock';
import { Backlog } from 'Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient';
import { BehaviorTiming, NotificationMode } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';
import { IValidate, IConfigurationControl, ModernConfigurationBase } from 'Widgets/Scripts/ModernWidgetTypes/ModernConfigurationBase';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { Checkbox } from 'Widgets/Scripts/Shared/Checkbox';
import { WITSelector, WorkItemTypeFilterMode, WorkItemTypePicker } from 'Widgets/Scripts/Shared/WorkItemTypePicker';
import { SettingsHelper } from 'Widgets/Scripts/Utilities/SettingsHelper';
import { AggregationConfigurationControl } from 'Widgets/Scripts/Velocity/AggregationConfigurationControl';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { LegacyProjectDataHelper } from "Widgets/Scripts/Shared/LegacyProjectDataHelper";
import { BacklogPicker } from "Widgets/Scripts/Shared/AnalyticsPickers";
import { TimePeriodControl, TimePeriodControlOptions } from 'Widgets/Scripts/Burndown/TimePeriodControl';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { SelectorControl } from 'Dashboards/Scripts/Selector';
import {
    AnalyticsFilterBlock,
    AnalyticsFilterBlockOptions,
} from 'Widgets/Scripts/Controls/FieldFilter/AnalyticsFilterBlock';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { ValidatedCombo } from 'Widgets/Scripts/Shared/ValidatedCombo';


/** This is the parent class of the BurndownConfiguration and MonteCarloConfiguration files. */
export abstract class LookBackConfiguration extends ModernConfigurationBase<BurndownSettings> {

    /** Project and teams picker **/
    protected projectTeamPickerList: ProjectTeamPickerList;

    /** "Work Items" Filtering block contains:
      *   -Backlog and Work Item Type Pickers
      */
    protected workItemFilterBlock: WITSelector;

    /** Analytics Picker block with metadata support */
    protected analyticsRichFilterBlock: IConfigurationControl<FieldFilter[], AnalyticsFilterScope>;

    /** Burndown Aggregation settings field block:
     *  -Sum/Count picker
     *  -Work item field picker (empty on count)
     */
    protected aggregationBlock: SettingsField<AggregationConfigurationControl>;

    /** Time Period panel. Contains date pickers, plot by pickers, and plot unit picker **/
    protected timePeriodControl: TimePeriodControl;

    /** Added Monte Carlo Forecast config field */
    protected customConfiguration: SettingsField<ValidatedCombo>;

    /** List of controls to be validated **/
    protected controlValidationList: IValidate[];

    /** Checkbox and a supporting message element for rare scenario where the checkbox is disabled due to XML Process customizations. Message is normally hidden. */
    protected includeBugsCheckbox: Checkbox;
    private blockedCheckboxMessage: JQuery;

    /** Performs validation of all fields. Stops on first failure..*/
    protected isValid(): boolean {
        var isValid: boolean = true;
        for (var i = 0; i < this.controlValidationList.length; i++) {
            if (this.controlValidationList[i].validate()) {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    public initializeOptions(options?: Controls.EnhancementOptions) {
        super.initializeOptions($.extend(<Controls.EnhancementOptions>{
            cssClass: "burndown-configuration"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this.controlValidationList = [];
    }

    protected shouldShowIncludeBugsCheckbox(): boolean {
        const workItemFilterBlockSettings = this.workItemFilterBlock.getSettings();
        return workItemFilterBlockSettings.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]
            && workItemFilterBlockSettings.settings === "Microsoft.RequirementCategory" && this.isBurndown();
    }

    /**
     * This is a temporary solution to retrieve the plural backlog name from Analytics.
     * TODO: User Story 1074777 - Update configuration to use cacheable query for getBacklogs call to retrieve backlog name for include bugs checkbox. https://mseng.visualstudio.com/VSOnline/_workitems/edit/1074777
     */
    private getIncludeBugsCheckboxLabel(): IPromise<string> {
        let chartingClient = new AnalyticsChartingClient(this._options.widgetTypeId);
        let backlogName: string = StringUtils.empty;

        return chartingClient.getBacklogs(this.getPrimaryProject(), [this.getPrimaryTeam()]).then((backlogs) => {
            if (backlogs) {
                backlogs.map(backlog => {
                    if (backlog.Category === "Microsoft.RequirementCategory") {
                        backlogName = backlog.BacklogName;
                    }
                })
            }

            return backlogName;
        });
    }

    /* Returns selected projects and teams - we currently use the context project and team id to populate downstream controls */
    private getPrimaryProject(): string {
        return this.tfsContext.project.id;
    }

    private getPrimaryTeam(): string {
        return this.teamContext.id;
    }

    /*
     * onChange callback for the Projects-Teams picker. As of now, the current context project id is used to populate downstream controls
     * like the WITSelector, the Field Criteria picker and the iterations picker. Eventually, a list of selected project ids will be used
     * as input for these controls.
     */
    protected onProjectTeamPickerUpdated(notificationMode: NotificationMode, settings: BurndownSettings): void {
        // Validate but do not display error message.
        let errorMessage = this.projectTeamPickerList.validate(true);

        if (errorMessage == null) {
            this.setProjectDownstreamConfig(settings)
                .then<void>(() => {
                    if (notificationMode === NotificationMode.On) {
                        this.packSettingsAndRequestWidgetReload();
                    }
                });
        }
    }

    protected onFieldFilterBlockChange(notificationMode: NotificationMode, settings?: BurndownSettings) {
        let errorMessage = this.analyticsRichFilterBlock.validate();

        if (errorMessage == null) {
            this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);
        } else {
            return WidgetHelpers.WidgetStatusHelper.Failure(WidgetResources.BurndownConfiguration_FieldCriteriaValidationFailed);
        }
    }

    /** Ensures Backlog picker is active mode, and applies setting value, or chooses relevant default.*/
    private setSelectedBacklog(settings?: BurndownSettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        let backlogPicker = this.workItemFilterBlock.backlogSettingsField.control;
        if (settings.workItemTypeFilter && settings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
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

    private setSelectedWorkItemType(settings?: BurndownSettings): IPromise<void> {
        let promise: IPromise<void> = Q<void>(null);

        let workItemTypePicker = this.workItemFilterBlock.workItemTypeSettingsField.control;
        if (settings.workItemTypeFilter && settings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
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
    private setSelectedAggregationValues(settings: BurndownSettings): IPromise<void> {
        if (this.isBurndown()) {
            let promise: IPromise<void> = Q<void>(null);
            let aggregationControl = this.aggregationBlock.control;

            aggregationControl.showBusyOverlay();
            if (settings.workItemTypeFilter && settings.workItemTypeFilter.identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
                promise = SettingsHelper.getTeamWorkItemTypesOfBacklogCategory(this.getPrimaryProject(), this.getPrimaryTeam(), settings.workItemTypeFilter.settings)
                    .then((workItemTypes) => {
                        return aggregationControl.setContext(this.getPrimaryProject(), workItemTypes);
                    });
            } else if (settings.workItemTypeFilter && settings.workItemTypeFilter.identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
                promise = aggregationControl.setContext(this.getPrimaryProject(), settings.workItemTypeFilter.settings);
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
        } else { return Q<void>(null); }
    }

    /** Updates the work item types based on the state of the workItemFilterBlock */
    private updateAggregationWorkItemTypes(): IPromise<void> {
        if (this.isBurndown()) {
            this.aggregationBlock.control.showBusyOverlay();
            return this.getSelectedWorkItemTypes()
                .then(workItemTypes => this.aggregationBlock.control.setContext(this.getPrimaryProject(), workItemTypes))
                .then(
                    () => this.aggregationBlock.control.hideBusyOverlay(),
                    e => {
                        this.aggregationBlock.control.hideBusyOverlay();
                        throw e;
                    }
                );
        } else { return Q<void>(null); }
    } 

    protected onBacklogChange(notificationMode: NotificationMode): IPromise<void> {
        if (this.includeBugsCheckbox) {
            this.setCheckBoxVisibility(this.shouldShowIncludeBugsCheckbox());
        }

        return this.onWitBlockChange(notificationMode, this.workItemFilterBlock.backlogSettingsField);
    }

    protected setCheckBoxVisibility(isVisible: boolean) {
        if (isVisible) {
            this.includeBugsCheckbox.showElement();
            this.blockedCheckboxMessage.show();
        } else {
            this.includeBugsCheckbox.hideElement();
            this.blockedCheckboxMessage.hide();
        }
    }

    protected onWorkItemTypeChange(notificationMode: NotificationMode): IPromise<void> {
        return this.onWitBlockChange(notificationMode, this.workItemFilterBlock.workItemTypeSettingsField);
    }

    private onWitBlockChange(notificationMode: NotificationMode, control: ISettingsField<IValidate>): IPromise<void> {
        control.hideError();

        let promises = [];

        let errMessage = control.getControl().validate();
        if (errMessage == null) {
            if (this.isBurndown()) {
                promises.push(this.updateAggregationWorkItemTypes());
            }

            promises.push(this.updateFieldFilterContext());

            return Q.all<void>(promises).then<void>(() => {
                if (notificationMode === NotificationMode.On) {
                    this.packSettingsAndRequestWidgetReload();
                }
            });
        }
        else {
            control.showError(errMessage);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q<void>(null);
        }
    }

    protected onAggregationChange(notificationMode: NotificationMode): IPromise<void> {
        return this.validateAndReact(
            notificationMode,
            this.aggregationBlock);
    }

    private updateFieldFilterContext(): IPromise<void> {
        return this.getSelectedWorkItemTypes()
            .then<void>(workItemTypes => {
                return this.analyticsRichFilterBlock.setContext({
                    projectId: this.getPrimaryProject(),
                    workItemTypes: workItemTypes
                });
            });
    }

    private getSelectedWorkItemTypes(): PromiseLike<string[]> {
        let promise: IPromise<string[]> = Q(null);

        if (this.workItemFilterBlock.getSettings().identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
            const backlog = this.workItemFilterBlock.backlogSettingsField.control.getValue() as Backlog;
            if (backlog) {
                const includeBugs = this.shouldShowIncludeBugsCheckbox() && this.includeBugsCheckbox.getSettings();
                promise = SettingsHelper.getProjectWorkItemTypesOfBacklogCategory(this.getPrimaryProject(), backlog.Category, includeBugs);
            }
        } else if (this.workItemFilterBlock.getSettings().identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
            const selectedWorkItemType = this.workItemFilterBlock.workItemTypeSettingsField.control.getValue() as string;
            promise = Q([selectedWorkItemType]);
        }

        return promise;
    }

    /** Sets context for controls that depend on selection of projects and teams */
    private setProjectDownstreamConfig(settings: BurndownSettings): IPromise<void[]> {
        let promises = [];

        // Enable and prep WIT Selector for user interaction.
        this.workItemFilterBlock.setEnabled(true);

        // Fetch current settings to ensure already-set downstream config doesn't get reset.
        let currentSettings: BurndownSettings = this.getSettings();

        if (!currentSettings.workItemTypeFilter || !currentSettings.workItemTypeFilter.settings) {
            currentSettings.workItemTypeFilter = settings.workItemTypeFilter;
        }

        if (!currentSettings.aggregation || !currentSettings.aggregation.settings) {
            currentSettings.aggregation = settings.aggregation;
        }

        this.workItemFilterBlock.selectField(currentSettings.workItemTypeFilter.identifier, false);

        this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(true);
        promises.push(this.workItemFilterBlock.workItemTypeSettingsField.control.setContext(this.getPrimaryProject())
            .then((workItemTypes: string[]) => {
                return this.setSelectedWorkItemType(currentSettings).then(() => {
                    this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(false);

                    promises.push(this.updateFieldFilterContext());
                    // Once work item types are available, enable the aggregation control and set the aggregation work item types.
                    if (this.isBurndown()) {
                        this.aggregationBlock.control.setEnabled(true);
                        return this.setSelectedAggregationValues(currentSettings);
                    }
                });
            }, e => {
                this.workItemFilterBlock.workItemTypeSettingsField.toggleControlBusyOverlay(false);
                throw e;
            }));

        this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(true);
        promises.push(this.workItemFilterBlock.backlogSettingsField.control.setContext(this.getPrimaryProject(), [this.getPrimaryTeam()])
            .then(() => {
                return this.setSelectedBacklog(currentSettings).then(() => {
                    this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(false);
                    return this.setSelectedBacklog(currentSettings);
                });
            }, e => {
                this.workItemFilterBlock.backlogSettingsField.toggleControlBusyOverlay(false);
                throw e;
            }));

        promises.push(this.timePeriodControl.setContext([this.getPrimaryProject()]));

        return Q.all<void>(promises);
    }

    protected abstract getCalculatedWidgetTitle(): string;

    /** Handles init of dynamically populated options, and application of initial selections. */
    protected loadDataAndSetSelections(settings: BurndownSettings): IPromise<void[]> {

        this.projectTeamPickerList.setContext(settings.teams);

        if (settings.teams.length > 0) {
            // IMPORTANT NOTE: Creating the checkbox here instead of in render() because of the async call for retrieving the label.
            // Checkbox must be created before setting the downstream config because it is used during the process.
            return this.getIncludeBugsCheckboxLabel()
                .then((checkboxLabel) => {
                    this.includeBugsCheckbox = new Checkbox(
                        this.workItemFilterBlock.backlogSettingsField.getElement(), {
                            customCssClass: "include-bugs-checkbox",
                            checkboxId: "include-bugs-for-requirement-category",
                            checkboxLabel: StringUtils.format(WidgetResources.BurnConfig_IncludeBugsLabelFormat, checkboxLabel),
                            onChange: () => {
                                this.onWitBlockChange(NotificationMode.On, this.workItemFilterBlock.backlogSettingsField);
                            }
                        });


                    this.blockedCheckboxMessage = $("<div>");
                    if (!SettingsHelper.useAnalyticsForProcessData() || LegacyProjectDataHelper.getResults().ProjectUsesKnownBugCategoryName) {
                        this.includeBugsCheckbox.setChecked(settings.includeBugsForRequirementCategory, false /* fire event */);
                    } else {
                        //Disallow use of includeBugsCheckBox, if the project does not support it.
                        this.includeBugsCheckbox.setChecked(false, false /* fire event */);
                        this.includeBugsCheckbox.setEnabled(false);
                        this.blockedCheckboxMessage = this.renderCheckBoxMessage(this.workItemFilterBlock.backlogSettingsField.getElement());
                    }

                    this.setCheckBoxVisibility(false); // Start hidden and let workItemFilterBlock show
                })
                .then<void[]>(() => this.setProjectDownstreamConfig(settings)
                    .then<void[]>(() => {
                        //If the baseline settings included bugs, force the widget to reload using current state.
                        if (settings.includeBugsForRequirementCategory && !LegacyProjectDataHelper.getResults().ProjectUsesKnownBugCategoryName) {
                            this.packSettingsAndRequestWidgetReload();
                        }
                        return Q(null);
                    }));
        }

        return Q<void[]>(null);
    }

    // Synchronously constructs pertinent controls. Initial selections and dynamic data population happens subsequent to this step.
    // IMPORTANT NOTE: "Include bugs" checkbox isn't rendered here but rather in the loadDataAndSetSelections() step because its creation options requires an async call.
    protected render(settings: BurndownSettings): void {

        const $container = this.getElement();

        // ProjectTeamPickerList
        if (settings) {
            this.projectTeamPickerList = ProjectTeamPickerList.create(
                ProjectTeamPickerList,
                $container,
                {
                    change: () => {
                        this.onProjectTeamPickerUpdated(NotificationMode.On, settings);
                    }
                }
            );
        }

        this.controlValidationList.push(this.projectTeamPickerList);

        // Work item type filter
        this.workItemFilterBlock = WITSelector.create(WITSelector, $container, {
            labelText: WidgetResources.AnalyticsWidgetsCommonConfig_WorkItemsLabel,
            includeOnlyVisibleBacklogs: false,
            collapseOnHide: true,
            layout: {
                [BacklogPicker.getInstanceName()]: "backlog-field",
                [WorkItemTypePicker.getInstanceName()]: "work-item-type-field"
            },
            onChange: (identifier: string, field: SettingsField<SelectorControl>) => {
                if (identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
                    this.onBacklogChange(NotificationMode.On);
                } else {
                    this.setCheckBoxVisibility(false);
                    this.onWorkItemTypeChange(NotificationMode.On);
                }
            },
            onBacklogChange: () => {
                this.onBacklogChange(NotificationMode.On);
            },
            onWorkItemTypeChange: () => this.onWorkItemTypeChange(NotificationMode.On)
        });

        // WIT Selector is disabled until projects & teams are selected.
        this.workItemFilterBlock.setEnabled(false);

        this.controlValidationList.push(this.workItemFilterBlock);

        let filterOptions: AnalyticsFilterBlockOptions = {
            onChange: () => this.onFieldFilterBlockChange(NotificationMode.On),
            initialFilters: settings.fieldFilters
        };
        this.analyticsRichFilterBlock = AnalyticsFilterBlock.create(AnalyticsFilterBlock, $container, filterOptions);
        this.controlValidationList.push(this.analyticsRichFilterBlock);


        // Aggregation block
        if (this.isBurndown()) {
            this.aggregationBlock = SettingsField.createSettingsField({
                labelText: WidgetResources.BurndownConfig_BurndownLabel,
                control: AggregationConfigurationControl.create(AggregationConfigurationControl, $container, {
                    onChanged: (mode: AggregationMode, field: string) => { this.onAggregationChange(NotificationMode.On) }
                }),
                hasErrorField: true,
            },
                $container);

            // Aggregation control is disabled until work item types are selected.
            this.aggregationBlock.control.setEnabled(false);

            this.controlValidationList.push(this.aggregationBlock.control);
        }

        // Time Period Control - Date and Iteration selectors.
        let timePeriodControlOptions: TimePeriodControlOptions = {
            hideIterationPickerList: !this.isBurndown(),
            dropdownValue: settings.timePeriodConfiguration,
            labelText: this.getLabelText(),
            onChange: () => {
                this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);
            }
        }

        this.timePeriodControl = TimePeriodControl.create<TimePeriodControl, TimePeriodControlOptions>(
            TimePeriodControl,
            $container,
            timePeriodControlOptions
        )

        this.controlValidationList.push(this.timePeriodControl);

        if (!this.isBurndown()) {
            this.customConfiguration = this.renderCustomConfiguration(settings);
            this.controlValidationList.push(this.customConfiguration.control);
        }

        this.createOptionsBlock(settings);
    }

    // default implementation; overridden by MonteCarloConfiguration
    protected renderCustomConfiguration(settings: BurndownSettings): SettingsField<ValidatedCombo> {
        return null;
    };

    protected abstract createOptionsBlock(settings: BurndownSettings): SettingsField<any>;

    protected abstract isBurndown(): boolean;

    protected getBurndownTrendlineLabel(): string {
        return WidgetResources.BurndownWidget_AdvancedFeaturesBurndownTrendlineLabel;
    }

    protected abstract getLabelText(): string;

    protected abstract getSettingsManager(): SettingsManagerBase<BurndownSettings>;

    private renderCheckBoxMessage(parent: JQuery): JQuery {
        const BugCategoryOnXmlProcessesLink: string = "https://go.microsoft.com/fwlink/?linkid=870940";
        return $("<div>")
            .addClass("blocked-checkbox-message")
            .append($("<span>")
                .addClass("icon icon-info"))
            .append($("<span>")
                .addClass("blocked-checkbox-text")
                .text(WidgetResources.BurndownConfig_BlockedBugsCheckboxMessage))
            .append($("<a>")
                .text(WidgetResources.BurndownConfig_BlockedBugsLearnMore)
                .attr("href", BugCategoryOnXmlProcessesLink)
                .attr("target", "_blank")
            )
            .appendTo(parent);
    }
}