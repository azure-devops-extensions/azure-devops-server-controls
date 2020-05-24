/// <reference types="react" />

import * as React from "react";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { TextField } from "OfficeFabric/TextField";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { PickListV2InputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListV2InputComponent";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { VariableColumnKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { IProcessVariablesOptions } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesV2ControllerView } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { CreateReleaseActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActionsCreator";
import { CreateReleaseArtifactsComponent } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseArtifactsComponent";
import { CreateReleaseEnvironmentNodeConstants, CreateReleaseProgressIndicatorAction } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { CommonConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { CreateReleaseEnvironmentsCanvas } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseEnvironmentsCanvas";
import { CreateReleaseStore, IReleaseDialogState } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListStore";
import { ReleaseEnvironmentUtils, ReleaseDialogContentConstants } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PipelineRelease, PipelineDefinitionEnvironment, PipelineDefinition, PipelineEnvironment, PipelineReleaseCreationSourceConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { SpinnerSize } from "OfficeFabric/Spinner";
import { SelectionMode } from "OfficeFabric/Selection";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSSContext from "VSS/Context";
import * as Performance from "VSS/Performance";
import { IPickListItem } from "VSSUI/Components/PickList";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseControllerView";

export interface ICreateReleaseControllerViewState<T extends PipelineDefinition | PipelineRelease> extends IReleaseDialogState<T> {
}

export interface ICreateReleaseControllerViewProps<T extends PipelineDefinition | PipelineRelease, P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends ComponentBase.IProps {
    createReleaseStore: CreateReleaseStore<T, P>;
    progressStore: ProgressIndicatorStore;
    environmentListStore: EnvironmentListStore<P>;
    variablesListStore: ProcessVariablesV2Store;    
    onCloseClick: () => void;
    onQueueRelease?: (pipelineRelease: PipelineRelease, projectName?: string) => void;
    startReleaseMode?: boolean;
    onDidUpdate: () => void;
    buildDefinitionId?: string;
}

/**
 * Renders Create release controller view
 */
export class CreateReleaseControllerView<T extends PipelineDefinition | PipelineRelease, P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends ComponentBase.Component<ICreateReleaseControllerViewProps<T, P>, ICreateReleaseControllerViewState<T>> {

    constructor(props: ICreateReleaseControllerViewProps<T, P>) {
        super(props);
        const storeInstanceId = this.props.createReleaseStore.getInstanceId();
        this._actionsCreator = ActionCreatorManager.GetActionCreator<CreateReleaseActionsCreator<T, P>>(CreateReleaseActionsCreator, storeInstanceId);
        this.state = { ...this.props.createReleaseStore.getState() };
    }

    public componentWillMount(): void {
        this.props.progressStore.addChangedListener(this._onStoreChange);
        this.props.createReleaseStore.addChangedListener(this._onStoreChange);
        this.props.variablesListStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.progressStore.removeChangedListener(this._onStoreChange);
        this.props.createReleaseStore.removeChangedListener(this._onStoreChange);
        this.props.variablesListStore.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        let controllerViewHeight = window.innerHeight - 44; // 44px is height of panel close button set by office fabric Panel component.

        return (
            <div className="create-release-controller-view" style={{height: controllerViewHeight}}>
                <div className="create-release-header-section">
                    {this._getHeaderSection()}
                </div>
                <div className="create-release-content-section">
                    {this._isDefinitionDataLoaded() && this._getErrorSection()}
                    {this._getProjectsSection()}
                    <div className="create-release-definition-section">
                        {this._getReleaseDefinitionsSection()}
                        {this._getDefinitionLoadingSection()}
                        {this._getEnvironmentTriggerSection()}
                        {this._getArtifactSection()}
                        {this._getVariablesSection()}
                        {this._getDescriptionSection()}
                        {this._getCreateReleaseLoadingComponent()}
                    </div>
                </div>
                <div className="create-release-footer-section">
                    {this._getFooterSection()}
                </div>
            </div>
        );
    }

    private _getDefinitionLoadingSection(): JSX.Element {
        if (!this._isDefinitionDataLoaded()) {
            return <LoadingComponent className="create-release-panel-main-loading" size={SpinnerSize.large} />;
        }
        else {
            return null;
        }
    }
    private _getProjectsSection(): JSX.Element {
        if (!this.state.selectedProject) {
            return null;
        }
        return (
            <div className="create-release-projects">
            <div className="create-release-projects-header-text">{Resources.ProjectsTitle}</div>
                {/* <i class="collapsible-section-icon bowtie-icon bowtie-folder"></i> */}
                <DropDownInputControl
                    ariaLabel={Resources.SelectProjectText}
                    cssClass="create-release-projects-drop-down"
                    onValueChanged={this._onProjectChanged}
                    selectedKey={this.state.selectedProject.id}
                    options={this._getLinkedProjects()} />
            </div>
        );
    }

    private _getReleaseDefinitionsSection(): JSX.Element {
        if (!this.state.selectedProject) {
            return null;
        }
        return (
            <div className="create-release-definition">
            <div className="create-release-definition-header-text">{Resources.ReleaseDefinitionsTitle}</div>
                {/* <i class="collapsible-section-icon bowtie-icon bowtie-rocket"></i> */}
                <DropDownInputControl
                    ariaLabel={Resources.SelectDefinitionText}
                    cssClass="create-release-definition-drop-down"
                    onValueChanged={this._onDefinitionChanged}
                    selectedKey={this.state.data ? this.state.data.id : null}
                    options={this._getLinkedReleaseDefinitions()} />
            </div>
        );
    }

    private _onProjectChanged = (val: IDropDownItem): void => {
        const item : IDropdownOption = val.option;
        const project = { id: item.key, name: item.text} as RMContracts.ProjectReference;
        const storeInstanceId = this.props.createReleaseStore.getInstanceId();
        this._actionsCreator.initializeData(-1, storeInstanceId, storeInstanceId, false, project, this.props.buildDefinitionId);
    }

    private _onDefinitionChanged = (val: IDropDownItem): void => {
        const item : IDropdownOption = val.option;
        const storeInstanceId = this.props.createReleaseStore.getInstanceId();
        this._actionsCreator.initializeData(parseInt(String(item.key)), storeInstanceId, storeInstanceId, false, this.state.selectedProject);
    }
    private _getLinkedReleaseDefinitions(): IDropdownOption[] {
        return (this.state.linkedReleaseDefinitions || []).map((releaseDefinition) => {
            return { key: releaseDefinition.id, text: releaseDefinition.name } as IDropdownOption;
        });
    }

    private _getLinkedProjects(): IDropdownOption[] {
        return (this.props.createReleaseStore.getlinkedProjects() || []).map((project) => {
            return { key: project.id, text: project.name } as IDropdownOption;
        });
    }

    private _getVariablesSection(): JSX.Element {
        if (this.props.startReleaseMode || !this.state.hasVariables || !this.state.data) {
            return null;
        }

        const instanceId = this.props.createReleaseStore.getInstanceId();
        const options: IProcessVariablesOptions = this._getVariablesSectionOptions();
        
        return (
            <AccordionCustomRenderer
                label={Resources.CreateReleasePanelVariablesAccordionLabel}
                initiallyExpanded={true}
                headingLevel={2}
                addSeparator={true}
                description={Resources.CreateReleasePanelVariablesAccordionDescription}
                descriptionInfoText={Resources.CreateReleasePanelVariablesSectionInfoText}>
                
                <ProcessVariablesV2ControllerView 
                    instanceId={instanceId}
                    options={options} />

            </AccordionCustomRenderer>
        );
    }

    private _getVariablesSectionOptions(): IProcessVariablesOptions {
        let options: IProcessVariablesOptions = {
            settableAtQueueTime: false,
            supportScopes: true,
            supportGridView: false,
            disableSorting: true,
            hideDelete: true,
            hideSecret: true,
            hideError: true,
            columnOptionOverrides: { }
        };

        options.columnOptionOverrides[VariableColumnKeys.NameColumnKey] = { minWidth: 150, maxWidth: 150, isReadOnly: true };
        options.columnOptionOverrides[VariableColumnKeys.ValueColumnKey] = { minWidth: 200, maxWidth: 200, isReadOnly: false };
        options.columnOptionOverrides[VariableColumnKeys.ScopeColumnKey] = { minWidth: 150, maxWidth: 150, isReadOnly: true };

        return options;
    }

    private _onStoreChange = () => {
        let state = this.props.createReleaseStore.getState();
        state.hasVariables = (this.props.variablesListStore.getVariableList() || []).length > 0;

        this.setState(state);
    }

    private _getHeaderSection(): JSX.Element {
        const definitionName: string = this.state.data ? this.state.data.name : Utils_String.empty;
        let label: string = this.props.startReleaseMode ? Resources.CreateReleasePanelStartReleaseLabel : Resources.CreateReleasePanelHeaderLabel;
        return (
            <OverlayPanelHeading label={label}
                infoButtonRequired={false}
                description={definitionName}>
            </OverlayPanelHeading>
        );
    }

    private _getCreateReleaseLoadingComponent(): JSX.Element {
        if (this._isCreateReleaseInProgress()) {
            return <LoadingComponent className="create-release-loading-component" size={SpinnerSize.large} blocking={true} />;
        } else {
            return null;
        }
    }

    private _getErrorSection() {
        if (!!this.state.errorMessage) {
            return (
                <div className="create-release-error-section">
                    <MessageBar
                        className="release-dialog-message-bar"
                        onDismiss={this._onErrorBarDismiss}
                        messageBarType={MessageBarType.error}
                        dismissButtonAriaLabel={Resources.CloseText}>
                        {this.state.errorMessage}
                    </MessageBar>
                </div>
            );
        } else {
            return null;
        }
    }

    private _getEnvironmentTriggerSection(): JSX.Element {
        return (
            <AccordionCustomRenderer
                label={Resources.CreateReleasePanelDeploymentTriggerLabel}
                initiallyExpanded={true}
                headingLevel={2}
                addSeparator={true}
                description={Resources.CreateReleasePanelDeploymentTriggerDescription}
                bowtieIconName="bowtie-trigger">
                <CreateReleaseEnvironmentsCanvas
                    nodeHeight={CreateReleaseEnvironmentNodeConstants.compactEnvironmentNodeHeight}
                    nodeWidth={CreateReleaseEnvironmentNodeConstants.compactEnvironmentNodeWidth}
                    gridCellHeight={CreateReleaseEnvironmentNodeConstants.gridCellHeight}
                    gridCellWidth={CreateReleaseEnvironmentNodeConstants.gridCellWidth}
                    verticalMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasVerticalMargin}
                    horizontalMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMargin}
                    instanceId={this.props.environmentListStore.getInstanceId()}
                    cssClass={"create-release-environment-canvas"}
                    environmentTriggers={this.state.environmentTriggers}
                    onEnvironmentNodeClick={this._onEnvironmentNodeClick}
                    ariaLabel={Resources.CreateReleaseEnvironmentCanvasAriaLabel}
                    leftMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasLeftMargin}
                    onDidUpdate={this.props.onDidUpdate}>
                </CreateReleaseEnvironmentsCanvas>
                <div className="create-release-environment-picklist">{this._getPickList()}</div>
            </AccordionCustomRenderer>
        );
    }

    private _getPickList(): JSX.Element {
        if (this.state.data) {
            let selectedEnvironments = this._getSelectedEnvironments();
            let infoProps = {
                calloutContentProps: {
                    calloutMarkdown: Resources.CreateReleaseEnvironmentDropdownHelpText
                }
            };
            let options: IPickListItem[] = this._getPickListOptions();
            let items = this._getPickListItems(options);
            if (items && items.length > 0) {
                return <PickListV2InputComponent
                    label={Resources.CreateReleaseEnvironmentDropdownLabel}
                    ariaLabel={Resources.CreateReleaseEnvironmentDropdownLabel}
                    selectionMode={SelectionMode.multiple}
                    key="pick-list-component"
                    infoProps={infoProps}
                    pickListInputClassName="environment-trigger-pick-list-input"
                    value={selectedEnvironments}
                    onValueChanged={this._onEnvironmentTriggerChanged}
                    options={options}                    
                    getPickListItems={this._getPickListItems}
                    showSelectAll={true} />;
            } else {
                return null;
            }
        }
    }

    private _getArtifactSection(): JSX.Element {
        if (this._showArtifactSection()) {
            return (
                <AccordionCustomRenderer
                    label={Resources.CreateReleasePanelArtifactAccordionLabel}
                    initiallyExpanded={true}
                    headingLevel={2}
                    addSeparator={true}
                    description={Resources.CreateReleasePanelArtifactAccordionDescription}
                    showErrorDelegate={() => { return this.state.hasAnyErrorsInArtifacts; }}
                    bowtieIconName="bowtie-package">
                    {
                        this._isArtifactDataLoaded() ?
                            <div className="create-release-panel-artifact-section">
                                <CreateReleaseArtifactsComponent
                                    artifactsVersionsData={this.state.artifactsVersionsData}
                                    onArtifactSelectedVersionChange={this._onArtifactSelectedVersionChange} />
                            </div>
                            : <LoadingComponent />
                    }
                </AccordionCustomRenderer>

            );
        } else {
            return null;
        }
    }

    private _getDescriptionSection(): JSX.Element {
        return (
            <div>
                <div className="create-release-panel-description-header-text">{Resources.ReleaseDescriptionText}</div>
                <div className="create-release-panel-description-section">
                    <TextField
                        className="create-release-content-description"
                        ariaLabel={Resources.ReleaseDescriptionText}
                        resizable={true}
                        value={this.state.description}
                        multiline={true}
                        onChanged={this._onReleaseDescriptionChange}
                        maxLength={CommonConstants.ReleaseDescriptionLengthLimit} />
                </div>
            </div>
        );
    }

    private _getFooterSection(): JSX.Element {
        return (
            <div className="create-release-panel-footer" >
                <PrimaryButton
                    ariaLabel={DTCResources.Create}
                    onClick={this._onCreateReleaseClick}
                    className="create-release-queue-button"
                    disabled={!this._canCreatePipelineRelease()} >
                    {DTCResources.Create}
                </PrimaryButton>
                <DefaultButton
                    className="create-release-cancel-button"
                    onClick={() => { this._onCloseClick(); }}
                    ariaLabel={Resources.CancelText}>
                    {Resources.CancelText}
                </DefaultButton>
            </div>
        );
    }

    private _isArtifactDataLoaded(): boolean {
        return !(this.props.progressStore.isActionInProgress(CreateReleaseProgressIndicatorAction.initializeArtifactVersionsAction));
    }

    private _isDefinitionDataLoaded(): boolean {
        return !(this.props.progressStore.isActionInProgress(CreateReleaseProgressIndicatorAction.initializeDefinitionAction));
    }

    private _isCreateReleaseInProgress(): boolean {
        return this.props.progressStore.isActionInProgress(CreateReleaseProgressIndicatorAction.createReleaseAction) ||
            this.props.progressStore.isActionInProgress(CreateReleaseProgressIndicatorAction.updateReleaseAction);
    }

    private _canCreatePipelineRelease(): boolean {
        // We do not consider trigger warnings as error case
        return !!this.state.data &&
            this.state.canShowDialogContent &&
            !this.state.hasAnyErrorsInArtifacts &&
            !this.props.progressStore.hasAnyActionsInProgress();
    }
    
    private _showArtifactSection(): boolean {
    if (this.state.data) {
            return this.state.data.artifacts && this.state.data.artifacts.length > 0;
        }
        return false;
    }

    private _getPickListOptions(): IPickListItem[] {
        let options: IPickListItem[] = [];
        if (this.state.environmentTriggers && this.state.environmentTriggers.length > 0) {
            for (let trigger of this.state.environmentTriggers) {
                const _isManualTrigger: boolean = ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger);
                if (!_isManualTrigger) {
                    options.push({
                        key: trigger.environmentId.toString(),
                        name: trigger.environmentName
                    });
                }
            }
        }
        return options;
    }

    private _getPickListItems = (options: IPickListItem[]): IPickListItem[] => {
        let data: IPickListItem[] = [];
        if (options && this.state.data && this.state.data.environments) {
            let environments = this.state.data.environments as P[];
            environments.sort((env1, env2) => { return env1.rank - env2.rank; });
            for (let environment of environments) {

                let option: IPickListItem = Utils_Array.first(options, (option) => option.key === environment.id.toString());
                
                if (option) {
                    data.push(option);
                }
            }
        }
        return data;
    }

    private _getSelectedEnvironments(): IPickListItem[] {
        let selectedValues: IPickListItem[] = [];
        if (this.state.environmentTriggers && this.state.environmentTriggers.length > 0) {
            for (let trigger of this.state.environmentTriggers) {
                const _isManualTrigger: boolean = ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger);
                if (!_isManualTrigger &&
                    trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                    selectedValues.push({
                        key: trigger.environmentId.toString(),
                        name: trigger.environmentName
                    });
                }
            }
        }
        return selectedValues;
    }

    private _onCloseClick(): void {
        if (this.props.onCloseClick) {
            this.props.onCloseClick();
        }
    }

    private _publishTelemetry(): void {
        this.state.artifactsVersionsData.forEach(artifactVersionsData => {
            let isVersionFromDropDown: boolean = false;
            let areVersionsAvailable: boolean = true;

            if (!artifactVersionsData.artifactVersion.versions ||
                artifactVersionsData.artifactVersion.versions && artifactVersionsData.artifactVersion.versions.length === 0) {
                    isVersionFromDropDown = false;
                    areVersionsAvailable = false;
                }

            if (areVersionsAvailable){
                isVersionFromDropDown = artifactVersionsData.artifactVersion.versions.some((version) => {
                    return Utils_String.localeIgnoreCaseComparer(ArtifactUtility.getArtifactVersionDisplayValue(version), artifactVersionsData.selectedVersion) === 0;
                });
            }            

            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.IsVersionManuallyEntered] = !isVersionFromDropDown;
            eventProperties[Properties.AreVersionsAvailable] = areVersionsAvailable;
            eventProperties[Properties.ArtifactType] = artifactVersionsData.artifactSource.type;
            Telemetry.instance().publishEvent(Feature.ArtifactVersionInputMethod, eventProperties);
        });
    }

    private _onCreateReleaseClick = () => {
        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.StartRelease);
        const variableList = this.props.variablesListStore.getVariableList();
        this._publishTelemetry();
        this._actionsCreator.createRelease(this._onCreateReleaseSuccessful, this.state, variableList, this.props.startReleaseMode, this.state.selectedProject ? this.state.selectedProject.name : VSSContext.getDefaultWebContext().project.name, PipelineReleaseCreationSourceConstants.ReleaseHub);
    }

    private _onArtifactSelectedVersionChange = (artifactIndex: number, newSelectedVersion: string) => {
        this._actionsCreator.updateArtifactSelectedVersion(artifactIndex, newSelectedVersion);
    }

    private _onReleaseDescriptionChange = (newDescriptionValue: string) => {
        this._actionsCreator.updateDescription(newDescriptionValue);
    }

    private _onEnvironmentNodeClick = (environmentId: number) => {
        this._actionsCreator.toggleDeploymentTrigger(environmentId);
        this._environmentToggledByCanvas = true;
    }

    private _onEnvironmentTriggerChanged = (selectedItems: IPickListItem[]) => {
        this._actionsCreator.updateManualDeploymentTriggers(selectedItems.map((item) => item.key));
        this._environmentToggledByPicklist = true;
    }

    private _onCreateReleaseSuccessful = (pipelineRelease: PipelineRelease, projectName?: string) => {
        if (this.props.onQueueRelease) {
            this.props.onQueueRelease(pipelineRelease, projectName);
        }
        this._publishQueueReleaseTelemetry();
        this._onCloseClick();
    }

    private _publishQueueReleaseTelemetry(): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        let manuallyToggledEnvironments = ReleaseEnvironmentUtils.getToggledManullyTriggeredEnvironmentCount(this.state.environmentTriggers);

        eventProperties[Properties.ToggledEnvironmentsCount] = manuallyToggledEnvironments;
        eventProperties[Properties.EnvironmentToggledByCanvas] = this._environmentToggledByCanvas;
        eventProperties[Properties.EnvironmentToggledByPicklist] = this._environmentToggledByPicklist;
        eventProperties[Properties.DescriptionAdded] = !!this.state.description;
        Telemetry.instance().publishEvent(Feature.CreateReleasePanelQueueRelease, eventProperties);
    }

    private _onErrorBarDismiss = (): void => {
        this._actionsCreator.updateErrorMessage(Utils_String.empty);
    }

    private _actionsCreator: CreateReleaseActionsCreator<T, P>;
    private _environmentToggledByCanvas: boolean = false;
    private _environmentToggledByPicklist: boolean = false;
    private _processVariablesInstanceId: string;
}