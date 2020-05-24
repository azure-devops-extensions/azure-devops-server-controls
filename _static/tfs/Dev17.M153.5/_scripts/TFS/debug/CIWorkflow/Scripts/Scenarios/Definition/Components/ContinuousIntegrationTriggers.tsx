/// <reference types="react" />

import * as React from "react";

import { SettingsSourceType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import * as Common from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { TriggersStore, ITriggersState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TriggersStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";

import { css } from "OfficeFabric/Utilities";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { ChoiceGroup, } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { BuildRepository, DefinitionTriggerType } from "TFS/Build/Contracts";

import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import { Positioning } from "VSS/Utils/UI";
import * as Utils_String from "VSS/Utils/String";
import Utils_Accessibility = require("VSS/Utils/Accessibility");

export interface IContinuousIntegrationTriggerOverviewProps extends Base.IProps {
    item: Item;
}

export class ContinuousIntegrationTriggerOverview extends Base.Component<IContinuousIntegrationTriggerOverviewProps, ITriggersState> {
    private _triggersStore: TriggersStore;
    private _sourcesSelectionStore: SourcesSelectionStore;

    public constructor(props: IContinuousIntegrationTriggerOverviewProps) {
        super(props);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._triggersStore = StoreManager.GetStore<TriggersStore>(TriggersStore);
        this.state = this._triggersStore.getState();
    }

    public render(): JSX.Element {
        const repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        const toggleLabel: string = Resources.TriggerStatusText;
        const iconClass: string = SourceProviderUtils.getIconClass(repositoryType);

        return (
            <div className="repository-trigger-item-overview ci-trigger-overview">
                <TwoPanelOverviewComponent
                    title={repositoryName}
                    view={this._getView()}
                    item={this.props.item}
                    instanceId="trigger-selector"
                    iconClassName={css("bowtie-icon", iconClass, "trigger-icon")}
                    overviewClassName="ci-trigger-overview-body" />
            </div>
        );
    }

    public componentDidMount(): void {
        this._triggersStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._triggersStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._triggersStore.getState());
    }

    private _getView(): JSX.Element {
        if (this.state.isContinuousIntegrationEnabled) {
            if (this._triggersStore.isValid()) {
                return (
                    <div className="repository-triggers-view">
                        {Resources.RepositoryEnabledMessage}
                    </div>
                );
            }
            else {
                return <ErrorComponent cssClass="trigger-overview-error" errorMessage={Resources.SomeSettingsNeedAttention} />;
            }
        }
        else {
            return (
                <div className="repository-triggers-view">
                    {Resources.RepositoryDisabledMessage}
                </div>
            );
        }
    }
}

const MaxConcurrentBuildPerBranch = ({ onMaxConcurrentBuildChange, maxConcurrentBuildValue, onMaxConcurrentBuildErrorMessage, disabled }) => (
    <div className="max-concurrent-build">
        <div className="max-concurrent-build-textfield">
            <StringInputComponent
                value={maxConcurrentBuildValue}
                label={Resources.MaxConcurrentBuildText}
                onValueChanged={onMaxConcurrentBuildChange}
                getErrorMessage={onMaxConcurrentBuildErrorMessage}
                deferredValidationTime={500}
                disabled={disabled} />
        </div>
    </div>);

const ShowMaxConcurentBuildPerBranch = ({ showMaxConcurrentBuildTextbox, isCheckboxChecked, onMaxConcurrentBuildChange,
    maxConcurrentBuildValue, onMaxConcurrentBuildErrorMessage, disabled }) => (
        showMaxConcurrentBuildTextbox && isCheckboxChecked && (
            <MaxConcurrentBuildPerBranch
                onMaxConcurrentBuildChange={onMaxConcurrentBuildChange}
                maxConcurrentBuildValue={maxConcurrentBuildValue}
                onMaxConcurrentBuildErrorMessage={onMaxConcurrentBuildErrorMessage}
                disabled={disabled} />)
    );

export interface IContinuousIntegrationTriggerDetailsProps extends Base.IProps {
    disabled?: boolean;
}

export class ContinuousIntegrationTriggerDetails extends Base.Component<IContinuousIntegrationTriggerDetailsProps, ITriggersState> {
    private _isFocused: boolean = false;
    private _triggersStore: TriggersStore;
    private _triggersActionCreator: TriggersActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _versionControlStore: VersionControlStore;
    private _versionControlActionsCreator: VersionControlActionsCreator;

    public constructor(props: IContinuousIntegrationTriggerDetailsProps) {
        super(props);

        this._triggersStore = StoreManager.GetStore<TriggersStore>(TriggersStore);
        this._triggersActionCreator = ActionCreatorManager.GetActionCreator<TriggersActionsCreator>(TriggersActionsCreator);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);

        this.state = this._triggersStore.getState();
    }

    public render(): JSX.Element {
        const repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        const toggleLabel: string = Resources.TriggerStatusText;
        const iconClass: string = SourceProviderUtils.getIconClass(repositoryType);
        const settingsSourceType: number = this.state.continuousIntegrationTrigger.settingsSourceType || SettingsSourceType.Definition;

        return (
            <div className="ci-trigger-details">
                {
                    this.state.isRemoteWebhookStatusSupported && !this.state.isRemoteWebhookValid && (
                        <div className="trigger-details-message">
                            <MessageBar
                                actions={
                                    <div className="actions-container bowtie">
                                        <DefaultButton
                                            className="btn-cta"
                                            ariaDescription={Resources.RestoreTriggerWebhookButtonDescription}
                                            disabled={!!this.props.disabled || this.state.isRestoringRemoteWebhooks}
                                            onClick={this._onRestoreRemoteWebhooks}>
                                            <span className="restore-webhook-button">
                                                {this.state.isRestoringRemoteWebhooks &&
                                                    <span className="bowtie-icon bowtie-spinner" />
                                                }
                                                {this.state.isRestoringRemoteWebhooks ? Resources.RestoreTriggerWebhookButtonBusyText : Resources.RestoreTriggerWebhookButtonText}
                                            </span>
                                        </DefaultButton>
                                    </div>
                                }
                                messageBarType={ this.state.restoreWebhookErrorMessage ? MessageBarType.error : MessageBarType.warning }
                                isMultiline={ false }>
                                { this._getRestoreWebhookMessage() }
                            </MessageBar>
                        </div>
                    )
                }
                <div className="trigger-details-header">
                    <div className={css(
                        "trigger-header-icon bowtie-icon",
                        iconClass)}>
                    </div>
                    <div className="trigger-title">
                        {repositoryName}
                    </div>
                </div>
                <div className="repo-ci-trigger-body">
                    {
                       !this.state.continuousIntegrationTrigger.isSettingsSourceOptionSupported &&
                       <div>
                           <BooleanInputComponent
                                 cssClass="checkbox-data enable-ci-trigger"
                                 label={Resources.EnableContinuousIntegration}
                                 value={this.state.isContinuousIntegrationEnabled}
                                 onValueChanged={this._onContinuousIntegrationToggle}
                                 disabled={!!this.props.disabled} />
                       </div>
                    }

                    {
                       this.state.continuousIntegrationTrigger.isSettingsSourceOptionSupported &&
                       <div>
                           <BooleanInputComponent
                                 cssClass="checkbox-data override-yaml-ci"
                                 label={Resources.OverrideSettingsSourceContinuousIntegration}
                                 value={!this.state.isContinuousIntegrationEnabled || settingsSourceType == SettingsSourceType.Definition}
                                 onValueChanged={this._onSettingsSourceOptionChange}
                                 disabled={!!this.props.disabled} />
                           {
                              (!this.state.isContinuousIntegrationEnabled || (settingsSourceType == SettingsSourceType.Definition)) &&
                              <div>
                                 <ChoiceGroup
                                    className="ci-yaml-enabled"
                                    options={this._getCIEnabledOptions()}
                                    onChange={this._onCIEnabledOptionChange}
                                    disabled={!!this.props.disabled} />
                              </div>
                           }
                       </div>
                    }

                    {
                        this.state.isContinuousIntegrationEnabled &&
                        this.state.isBatchChangesSupported &&
                        settingsSourceType == SettingsSourceType.Definition &&
                        <div>
                            <BooleanInputComponent
                                cssClass="checkbox-data"
                                label={Resources.TriggerBatchChangesCheckbox}
                                value={this.state.continuousIntegrationTrigger.batchChanges}
                                onValueChanged={this._onBatchCheckboxChange}
                                disabled={!!this.props.disabled}/>
                            <ShowMaxConcurentBuildPerBranch
                                showMaxConcurrentBuildTextbox={this._showMaxConcurrentBuildTextbox()}
                                isCheckboxChecked={this.state.continuousIntegrationTrigger.batchChanges}
                                onMaxConcurrentBuildChange={this._onMaxConcurrentBuildPerBranchChange}
                                maxConcurrentBuildValue={this.state.maxConcurrentBuildPerBranch}
                                onMaxConcurrentBuildErrorMessage={this._getMaxConcurrentBuildPerBranchErrorMessage}
                                disabled={!!this.props.disabled} />
                        </div>
                    }

                    {
                        this.state.isContinuousIntegrationEnabled &&
                        this.state.isPollingSupported &&
                        settingsSourceType == SettingsSourceType.Definition &&
                        <div className="polling-interval-container">
                            <StringInputComponent
                                value={this.state.pollingInterval}
                                label={Resources.PollingIntervalLabel}
                                onValueChanged={this._onPollingIntervalChange}
                                getErrorMessage={this._getPollingIntervalErrorMsgDelegate}
                                disabled={!!this.props.disabled} />
                        </div>
                    }

                    {
                        this.state.isContinuousIntegrationEnabled &&
                        settingsSourceType == SettingsSourceType.Definition &&
                        <div>
                            {
                                !!this.state.isBranchFilterSupported &&
                                <Filters
                                    repository={repository}
                                    repositoryType={repositoryType}
                                    isFilterRequired={true}
                                    onFilterOptionChange={this._onBranchFilterOptionChange}
                                    filterType={Common.FilterType.BranchFilter}
                                    filters={this.state.continuousIntegrationTrigger.branchFilters}
                                    onFilterChange={this._onBranchFilterChange}
                                    onFilterDelete={this._onBranchFilterDelete}
                                    onAddFilterClick={this._onAddBranchFilterClick}
                                    gitBranches={this._sourcesSelectionStore.getBranches()}
                                    isReadOnly={!!this.props.disabled} />
                            }

                            {
                                this._triggersStore.showBranchFilterError() ?
                                    <ErrorComponent
                                        errorMessage={Resources.AddBranchFilterError} />
                                    : null
                            }

                            {
                                !!this.state.isPathFilterSupported &&
                                <Filters
                                    key="ci-triggers-filters"
                                    repository={repository}
                                    repositoryType={repositoryType}
                                    isFilterRequired={!!this.state.isBranchFilterSupported ? false : true}
                                    onFilterOptionChange={this._onPathFilterOptionChange}
                                    filterType={Common.FilterType.PathFilter}
                                    filters={this.state.continuousIntegrationTrigger.pathFilters}
                                    onFilterChange={this._onPathFilterChange}
                                    onAddFilterClick={this._onAddPathFilterClick}
                                    onFilterDelete={this._onPathFilterDelete}
                                    showPathDialog={this._showPathDialog}
                                    isReadOnly={!!this.props.disabled} />
                            }

                            {
                                this._triggersStore.showPathFilterError() ?
                                    <ErrorComponent
                                        errorMessage={Resources.AddPathFilterError} />
                                    : null
                            }
                        </div>
                    }
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this._triggersStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._triggersStore.removeChangedListener(this._onChange);
    }

    private _getCIEnabledOptions(): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];

        options.push({
            key: false.toString(),
            text: Resources.DisableCIYAML,
            checked: this.state.isContinuousIntegrationEnabled === false
        });
        options.push({
            key: true.toString(),
            text: Resources.EnableCIYAML,
            checked: this.state.isContinuousIntegrationEnabled === true
        });

        return options;
    }

    private _onChange = (): void => {
        this.setState(this._triggersStore.getState());
    }

    private _onContinuousIntegrationToggle = (isEnabled: boolean): void => {
        const defaultRepository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryType: string = defaultRepository ? defaultRepository.type : null;
        const togglePayload: Actions.IToggleBranchPayload = {
            toggleValue: isEnabled,
            defaultBranchFilter: defaultRepository ? defaultRepository.defaultBranch : null,
            defaultPathFilter: defaultRepository && SourceProviderUtils.getDefaultPathFilter(repositoryType, defaultRepository),
            repositoryType: repositoryType
        };

        this._isFocused = isEnabled;

        this._triggersActionCreator.toggleContinuousIntegration(togglePayload);
    }

    private _onSettingsSourceOptionChange = (isChecked: boolean): void => {
        // If checked, set to definition, as it will only be checked in the override case
        if (isChecked) {
            this._onContinuousIntegrationToggle(this.state.isContinuousIntegrationEnabled);
            this._triggersActionCreator.changeSettingsSourceOption({settingsSourceType: SettingsSourceType.Definition});
        }
        else {
            if (!this.state.isContinuousIntegrationEnabled) {
               this._onContinuousIntegrationToggle(true);
            }
            this._triggersActionCreator.changeSettingsSourceOption({settingsSourceType: SettingsSourceType.Process});
        }
    }

    private _onCIEnabledOptionChange = (event?: React.SyntheticEvent<HTMLInputElement>, ciEnabledOption?: IChoiceGroupOption) => {

        let enabled: boolean = false;

        // Enum to string conversion neccesary since ChoiceGroupOptions only take strings as keys
        if (ciEnabledOption.key === true.toString()) {
                enabled = true;
        }

        this._onContinuousIntegrationToggle(enabled);
    }

    private _onBatchCheckboxChange = (isChecked: boolean): void => {
        let booleanValue: Actions.IBooleanPayload = {
            value: isChecked
        };
        this._triggersActionCreator.batchCheckbox(booleanValue);
    }

    private _onPollingIntervalChange = (pollingInterval: string): void => {
        let pollingIntervalPayload: Actions.IPollingIntervalPayload = {
            pollingInterval: pollingInterval
        };
        this._triggersActionCreator.changePollingInterval(pollingIntervalPayload);
    }

    private _onPathFilterOptionChange = (option: IDropdownOption, index: number, rowIndex: number): void => {
        let dropdownIndexRowPair: Actions.IDropdownIndexRowPair = {
            dropdownIndex: index,
            rowIndex: rowIndex
        };
        this._triggersActionCreator.changePathFilterOption(dropdownIndexRowPair);
    }

    private _onPathFilterChange = (modifiedPathFilter: string, rowIndex: number): void => {
        let inputIndexPair: Actions.InputIndexPair = {
            input: modifiedPathFilter,
            index: rowIndex
        };
        this._triggersActionCreator.changePathFilter(inputIndexPair);
    }

    private _onPathFilterDelete = (rowIndex: number): void => {
        let indexNumber: Actions.IFilterRowIndex = {
            index: rowIndex
        };
        this._triggersActionCreator.removePathFilter(indexNumber);
    }

    private _onAddPathFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        const repositoryType: string = provider ? provider.getRepositoryType() : null;
        const defaultPathFilter: string = SourceProviderUtils.getDefaultPathFilter(repositoryType, this._sourcesSelectionStore.getBuildRepository());
        this._triggersActionCreator.addPathFilter(defaultPathFilter);
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
    }

    private _onBranchFilterOptionChange = (option: IDropdownOption, optionIndex: number, rowIndex: number): void => {
        let dropdownIndexRowPair: Actions.IDropdownIndexRowPair = {
            dropdownIndex: optionIndex,
            rowIndex: rowIndex
        };
        this._triggersActionCreator.changeBranchFilterOption(dropdownIndexRowPair);
    }

    private _onBranchFilterChange = (branch: string, rowIndex: number): void => {
        let branchIndexPair: Actions.InputIndexPair = {
            input: branch,
            index: rowIndex,
            branches: this._sourcesSelectionStore.getBranches()
        };
        this._triggersActionCreator.changeBranchFilter(branchIndexPair);
    }

    private _onBranchFilterDelete = (rowIndex: number): void => {
        let indexNumber: Actions.IFilterRowIndex = {
            index: rowIndex
        };
        this._triggersActionCreator.removeBranchFilter(indexNumber);
    }

    private _onAddBranchFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._triggersActionCreator.addBranchFilter(this._sourcesSelectionStore.getBuildRepository().defaultBranch);
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
    }

    private _onMaxConcurrentBuildPerBranchChange = (maxConcurrentBuildPerBranch: string): void => {
        let maxConcurrentBuild: Actions.IContinuousConcurrentBuildPayload = {
            maxConcurrentBuildPerBranch: maxConcurrentBuildPerBranch
        };
        this._triggersActionCreator.changeMaxConcurrentBuildPerBranch(maxConcurrentBuild);
    }

    private _showPathDialog = (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void): void => {
        this._sourcesSelectionStore.showPathDialog(initialValue, callback);
    }

    private _getPollingIntervalErrorMsgDelegate = (value): string => {
        if (!this._triggersStore.isPollingIntervalValid(value)) {
            return Utils_String.format(Resources.NumberFieldErrorMessage, Common.MinPollingIntervalInSeconds, Common.MaxPollingIntervalInSeconds);
        }

        return Utils_String.empty;
    }

    private _getMaxConcurrentBuildPerBranchErrorMessage = (value: string): string => {
        if (value.length === 0) {
            return Resources.CannotBeEmptyText;
        }
        if (!this._triggersStore.isMaxConcurrentBuildPerBranchValid(value)) {
            return Utils_String.format(Resources.NumberFieldErrorMessage, Common.MinConcurrentBuildsPerBranch, Common.MaxConcurrentBuildsPerBranch);
        }

        return Utils_String.empty;
    }

    private _getRestoreWebhookMessage(): string {
        if (!this.state.restoreWebhookErrorMessage) {
            return Resources.RepositoryWebhookMissingDescription;
        }

        return Resources.RestoreTriggerWebhookErrorTextPrefix + this.state.restoreWebhookErrorMessage;
    }

    private _onRestoreRemoteWebhooks = (): void => {
        const state = this._versionControlStore.getState();
        Utils_Accessibility.announce(Resources.RestoreTriggerWebhookButtonBusyText, true);
        this._versionControlActionsCreator.restoreWebhooks(
            state.repositoryType,
            state.selectedConnectionId,
            state.selectedRepository,
            [DefinitionTriggerType.ContinuousIntegration]);
    }

    private _showMaxConcurrentBuildTextbox(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.MaxConcurrentBuildsPerBranchFeature, false);
    }
}
