/// <reference types="react" />

import * as React from "react";

import { SettingsSourceType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { IDropdownRowIndexPayload, InputIndexPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Payloads";
import { PullRequestTriggerActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/PullRequestTriggerActionsCreator";
import { IBooleanPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { FilterType } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { CommentsComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/CommentsComponent";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { ForksComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/ForksComponent";
import { RepositorySettingsContainer } from "CIWorkflow/Scripts/Scenarios/Definition/Components/RepositorySettingsContainer";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { IPullRequestTriggerState, PullRequestTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/PullRequestTriggerStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { ChoiceGroup, } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { BuildRepository, DefinitionTriggerType } from "TFS/Build/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_String from "VSS/Utils/String";
import { Positioning } from "VSS/Utils/UI";
import Utils_Accessibility = require("VSS/Utils/Accessibility");

export interface IPullRequestTriggerOverviewProps extends Base.IProps {
    item: Item;
}

export class PullRequestTriggerOverview extends Base.Component<IPullRequestTriggerOverviewProps, IPullRequestTriggerState> {
    private _triggersStore: PullRequestTriggerStore;
    private _sourcesSelectionStore: SourcesSelectionStore;

    public constructor(props: IPullRequestTriggerOverviewProps) {
        super(props);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._triggersStore = StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore);
        this.state = this._triggersStore.getState();
    }

    public render(): JSX.Element {
        const repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        const toggleLabel: string = Resources.TriggerStatusText;

        return (
            <div className="repository-trigger-item-overview pr-trigger-overview">
                <TwoPanelOverviewComponent
                    title={repositoryName}
                    view={this._getView()}
                    item={this.props.item}
                    instanceId="trigger-selector"
                    iconClassName={css("bowtie-icon", SourceProviderUtils.getIconClass(repositoryType), "trigger-icon")}
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
        if (this.state.isEnabled) {
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

export interface IPullRequestTriggerDetailsProps extends Base.IProps {
    disabled?: boolean;
}

export class PullRequestTriggerDetails extends Base.Component<IPullRequestTriggerDetailsProps, IPullRequestTriggerState> {
    private _isFocused: boolean = false;
    private _triggersStore: PullRequestTriggerStore;
    private _triggerActionCreator: PullRequestTriggerActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _versionControlStore: VersionControlStore;
    private _versionControlActionsCreator: VersionControlActionsCreator;

    public constructor(props: IPullRequestTriggerDetailsProps) {
        super(props);

        this._triggersStore = StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore);
        this._triggerActionCreator = ActionCreatorManager.GetActionCreator<PullRequestTriggerActionsCreator>(PullRequestTriggerActionsCreator);

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
        const settingsSourceType: number = this.state.settingsSourceType || SettingsSourceType.Definition;
        return (
            this.state.isSupported && this._isFeatureEnabled() &&
            <div className="pr-trigger-details">
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
                        SourceProviderUtils.getIconClass(repositoryType))}>
                    </div>
                    <div className="trigger-title">
                        {repositoryName}
                    </div>
                </div>
                {
                    this._isCommentIntegrationFeatureEnabled() &&
                    <div className="trigger-descriptions">
                        {Resources.PullRequestDescriptionText}
                    </div>
                }

                <div className="pr-trigger-body">
                    {
                        !this.state.isSettingsSourceTypeSupported &&
                        <div>
                            <BooleanInputComponent
                                cssClass="checkbox-data enable-pr-trigger"
                                label={Resources.EnablePullRequestValidation}
                                value={this.state.isEnabled}
                                onValueChanged={this._onPullRequestToggle}
                                disabled={!!this.props.disabled} />
                        </div>
                    }

                    {
                        this.state.isSettingsSourceTypeSupported &&
                        <div>
                            <BooleanInputComponent
                                cssClass="checkbox-data override-yaml-pr"
                                label={Resources.OverrideSettingsSourcePullRequest}
                                value={!this.state.isEnabled || settingsSourceType == SettingsSourceType.Definition}
                                onValueChanged={this._onSettingsSourceCheckboxChange}
                                disabled={!!this.props.disabled} />
                            {
                                (!this.state.isEnabled || (settingsSourceType == SettingsSourceType.Definition)) &&
                                <div>
                                    <ChoiceGroup
                                        className="pr-yaml-enabled"
                                        options={this._getPREnabledOptions()}
                                        onChange={this._onPREnabledOptionChange}
                                        disabled={!!this.props.disabled} />
                                </div>
                            }
                        </div>
                    }

                    {
                        this.state.isEnabled &&
                        settingsSourceType == SettingsSourceType.Definition &&
                        <Filters
                            repository={repository}
                            repositoryType={repositoryType}
                            isFilterRequired={true}
                            onFilterOptionChange={this._onBranchFilterOptionChange}
                            filterType={FilterType.BranchFilter}
                            filters={this.state.branchFilters}
                            onFilterChange={this._onBranchFilterChange}
                            onFilterDelete={this._onBranchFilterDelete}
                            onAddFilterClick={this._onAddBranchFilterClick}
                            gitBranches={this._sourcesSelectionStore.getBranches()}
                            isReadOnly={!!this.props.disabled} />
                    }

                    {
                        this.state.isEnabled &&
                        settingsSourceType == SettingsSourceType.Definition &&
                        this._isPathFilterSupported() &&
                        <Filters
                            key="pr-triggers-filters"
                            repository={repository}
                            repositoryType={repositoryType}
                            isFilterRequired={false}
                            onFilterOptionChange={this._onPathFilterOptionChange}
                            filterType={FilterType.PathFilter}
                            filters={this.state.pathFilters}
                            onFilterChange={this._onPathFilterChange}
                            onFilterDelete={this._onPathFilterDelete}
                            onAddFilterClick={this._onAddPathFilterClick}
                            isReadOnly={!!this.props.disabled} />
                    }

                    {
                        this.state.isEnabled &&
                        this._isForkFeatureEnabled() &&
                        this._isBuildForksSupported() &&
                        <ForksComponent
                            forks={this.state.forks}
                            onValueChanged={this._onForkCheckboxChange}
                            disabled={!!this.props.disabled}
                            onSecretsForForksChanged={this._onSecretsForForksCheckboxChange}
                            enableSecretsForForks={this.state.enableSecretsForForks} />
                    }
                    {
                        this.state.isEnabled &&
                        this._isCommentIntegrationFeatureEnabled() &&
                        <CommentsComponent
                            value={this.state.isCommentRequiredForPullRequest }
                            onValueChanged={this._onCommentCheckboxChange} />
                    }
                    {
                        !this._triggersStore.isValid() ?
                            <ErrorComponent
                                errorMessage={Resources.AddBranchFilterError} />
                            : null
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

    private _getPREnabledOptions(): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];

        options.push({
            key: false.toString(),
            text: Resources.DisablePRYAML,
            checked: this.state.isEnabled === false
        });
        options.push({
            key: true.toString(),
            text: Resources.EnablePRYAML,
            checked: this.state.isEnabled === true
        });

        return options;
    }

    private _onChange = (): void => {
        this.setState(this._triggersStore.getState());
    }

    private _onPullRequestToggle = (isEnabled: boolean): void => {
        this._isFocused = isEnabled;
        this._triggerActionCreator.toggleEnabled(isEnabled);
    }

    private _onSettingsSourceCheckboxChange = (isChecked: boolean): void => {
        // If checked, set to definition, as it will only be checked in the override case
        if (isChecked) {
            this._triggerActionCreator.changeSettingsSourceOption(SettingsSourceType.Definition);
        }
        else {
            if (!this.state.isEnabled) {
               this._onPullRequestToggle(true);
            }
            this._triggerActionCreator.changeSettingsSourceOption(SettingsSourceType.Process);
        }
    }

    private _onPREnabledOptionChange = (event?: React.SyntheticEvent<HTMLInputElement>, prEnabledOption?: IChoiceGroupOption) => {
        let enabled: boolean = false;

        // Enum to string conversion neccesary since ChoiceGroupOptions only take strings as keys
        if (prEnabledOption.key === true.toString()) {
            enabled = true;
        }

        this._isFocused = enabled;

        this._triggerActionCreator.toggleEnabled(enabled);
    }

    private _onBranchFilterOptionChange = (option: IDropdownOption, optionIndex: number, rowIndex: number): void => {
        let payload: IDropdownRowIndexPayload = {
            dropdownIndex: optionIndex,
            rowIndex: rowIndex
        };
        this._triggerActionCreator.changeBranchFilterOption(payload);
    }

    private _onBranchFilterChange = (branch: string, rowIndex: number): void => {
        let payload: InputIndexPayload = {
            input: branch,
            index: rowIndex
        };
        this._triggerActionCreator.changeBranchFilter(payload);
    }

    private _onBranchFilterDelete = (rowIndex: number): void => {
        this._triggerActionCreator.removeBranchFilter(rowIndex);
    }

    private _onAddBranchFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._triggerActionCreator.addBranchFilter(this._sourcesSelectionStore.getBuildRepository().defaultBranch);
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
    }

    private _onPathFilterOptionChange = (option: IDropdownOption, index: number, rowIndex: number): void => {
        let payload: IDropdownRowIndexPayload = {
            dropdownIndex: index,
            rowIndex: rowIndex
        };
        this._triggerActionCreator.changePathFilterOption(payload);
    }

    private _onPathFilterChange = (path: string, rowIndex: number): void => {
        let payload: InputIndexPayload = {
            input: path,
            index: rowIndex
        };
        this._triggerActionCreator.changePathFilter(payload);
    }

    private _onPathFilterDelete = (rowIndex: number): void => {
        this._triggerActionCreator.removePathFilter(rowIndex);
    }

    private _onAddPathFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._triggerActionCreator.addPathFilter("");
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
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
            [DefinitionTriggerType.PullRequest]);
    }

    private _isFeatureEnabled(): boolean {
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        return provider && provider.isTriggerSupported(DefinitionTriggerType.PullRequest);
    }

    private _isForkFeatureEnabled(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.GitHubForkBuilds, false);
    }

    private _isCommentIntegrationFeatureEnabled(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.GitHubCommentHandling, false);
    }

    private _isBuildForksSupported(): boolean {
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        return provider && provider.isBuildForksSupported(DefinitionTriggerType.PullRequest);
    }

    private _isPathFilterSupported(): boolean {
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        return provider && provider.isPathFilterSupported(DefinitionTriggerType.PullRequest);
    }

    private _onForkCheckboxChange = (isChecked: boolean): void => {
        const booleanValue: IBooleanPayload = {
            value: isChecked
        };
        this._triggerActionCreator.toggleBuildingForks(booleanValue);
    }

    private _onSecretsForForksCheckboxChange = (isChecked: boolean): void => {
        const booleanValue: IBooleanPayload = {
            value: isChecked
        };
        this._triggerActionCreator.toggleAllowSecretsForForks(booleanValue);
    }

    private _onCommentCheckboxChange = (isChecked: boolean): void => {
        const booleanValue: IBooleanPayload = {
            value: isChecked
        };
        this._triggerActionCreator.toggleIsCommentRequiredForPullRequest(booleanValue);
    }
}
