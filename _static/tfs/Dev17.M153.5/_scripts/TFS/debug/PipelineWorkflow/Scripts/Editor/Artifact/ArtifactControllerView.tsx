/// <reference types="react" />

import * as React from "react";
import * as ReactDom from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";

import { ArtifactSourceType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSourceType";
import { ArtifactTypeStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { BuildArtifactTypeStore } from "PipelineWorkflow/Scripts/Editor/Artifact/BuildArtifactTypeStore";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { ArtifactActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActionCreator";
import { ArtifactTypeListActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListActionCreator";
import { ArtifactTypeActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActionCreator";
import { ArtifactComponent } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComponent";
import { ArtifactsConstants, ArtifactInputState, BranchInputType } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ArtifactViewStore, IArtifactTypesData, IArtifactInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactViewStore";
import { IUpdateArtifactTnputPayload, IUpdateArtifactInputOptionsPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";
import { ISelectableArtifactType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { PipelineArtifact, PipelineArtifactTypes } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { Overlay } from "OfficeFabric/Overlay";

import * as Context from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactControllerView";

export interface IArtifactProps {
    mode: ArtifactMode; //mode=1: edit, mode=0:add
    instanceId: string;
    onAddArtifact?: (artifactType: string) => void;
}

export interface IArtifactControllerViewState extends IArtifactTypesData {
    showDeleteDialog: boolean;
}

export class ArtifactControllerView extends Base.Component<IArtifactProps, IArtifactControllerViewState> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<ArtifactViewStore>(ArtifactViewStore, this.props.instanceId);
        this._artifactTypeListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactTypeListActionCreator>(ArtifactTypeListActionCreator, this.props.instanceId);
        this._artifactActionCreator = ActionCreatorManager.GetActionCreator<ArtifactActionCreator>(ArtifactActionCreator, this.props.instanceId);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState() as IArtifactControllerViewState, () => {
            this._initializeArtifactTypes();
        });
    }

    public componentWillUnmount() {
        //Unmount the command bar
        if (this._artifactCommandBarHeader) {
            ReactDom.unmountComponentAtNode(this._artifactCommandBarHeader);
        }
        this._store.removeChangedListener(this._onChange);
    }

    public componentDidMount() {
        this._renderArtifactCommandBar();
    }

    public componentDidUpdate() {
        this._renderArtifactCommandBar();
    }

    public render(): JSX.Element {

        let artifactSelectionClass = this.props.mode === 0 ? "artifacts-selection artifacts-add" : "artifacts-selection";
        return (
            <div className={artifactSelectionClass} aria-busy={this._isComponentBusyLoading()}>
                {this._getOverlayComponent()}
                {
                    <div className="artifacts-selection-tab-panel">
                        {this._getArtifactHeader()}
                        {this._getInputSchema()}
                        {this._getAliasWarningSection()}
                        {this._getArtifactDetailsMessageSection()}
                        {this._getConfirmButtonDetails()}
                    </div>
                }
                {this._getLoadingComponent()}

                <ConfirmationDialog
                    title={Resources.DeleteArtifact}
                    subText={Utils_String.localeFormat(Resources.DeleteArtifactConfirmationMessage, this.state.selectedArtifactType.alias)}
                    onConfirm={this._onDeleteArtifact}
                    showDialog={this.state.showDeleteDialog}
                    onCancel={this._hideDeleteDialog} />
            </div>
        );
    }

    private _getAliasWarningSection(): JSX.Element {
        return (!this._onGetAliasErrorMessage(this.state.selectedArtifactType.alias) && !!this.state.warning ? (
            <MessageBarComponent
                messageBarType={MessageBarType.warning}
                onDismiss={this._onDismissWarning}
                className={"artifact-selection-warning-bar"}>
                {this.state.warning}
            </MessageBarComponent>
        ) : null);
    }

    private _getInputSchema(): JSX.Element {

        return (
            // Start displaying Artifact Input drop down control in Initialization state in case it is populated with the valid values.
            // Don't wait for the input schema components initialization.
            (this._showInputSchema() ||
                (this.state.inputState === ArtifactInputState.Initializing && this.state.selectedArtifactType.name !== Utils_String.empty)) &&
            <div className="artifact-selection-tab-content" data-first-focus-element={true}>
                {this._getErrorDetails()}
                {(this.props.mode === ArtifactMode.Add) &&
                    <ArtifactSourceType
                        artifactTypes={this.state.artifactTypes}
                        selectedKey={this.state.selectedArtifactType.name}
                        onSourceTypeChanged={this._onSourceOptionChange} />
                }
                {this._getArtifactComponent()}
            </div>);
    }

    private _getArtifactComponent(): JSX.Element {
        const artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.props.instanceId);
        const instanceId = artifactTypeListStore.getArtifactTypeStoreInstanceId(this.state.selectedArtifactType.name);
        let buildArtifactTypeStore: BuildArtifactTypeStore = null;
        let isBuildArtifact = this.state.selectedArtifactType && (Utils_String.ignoreCaseComparer(this.state.selectedArtifactType.name, PipelineArtifactTypes.Build) === 0);
        if (isBuildArtifact) {
            buildArtifactTypeStore = StoreManager.GetStore<ArtifactTypeStore>(ArtifactTypeStore, instanceId) as BuildArtifactTypeStore;
        }

        if (this.state.inputState !== ArtifactInputState.Initializing) {
            return (<ArtifactComponent
                artifactInputs={this.state.selectedArtifactType ? this.state.selectedArtifactType.inputs : []}
                selectedArtifact={this.state.selectedArtifactType ? this.state.selectedArtifactType.name : Utils_String.empty}
                selectedArtifactEndpointTypeId={this.state.selectedArtifactType ? this.state.selectedArtifactType.endpointTypeId : Utils_String.empty}
                alias={this.state.selectedArtifactType.alias}
                branchInputType={buildArtifactTypeStore ? ArtifactUtility.getBuildBranchInputType(buildArtifactTypeStore.getBuildArtifactSourceType()) : BranchInputType.Combo}
                onUpdateArtifactInput={this._updateArtifactInput}
                onUpdateArtifactInputOptions={this._updateArtifactInputOptions}
                onUpdateArtifactAlias={this._updateArtifactAlias}
                onGetAliasErrorMessage={this._onGetAliasErrorMessage}
                onSearchArtifactInput={this._searchArtifactInput}
                isLoading={this._isComponentBusyLoading()} />);
        }

        return null;
    }

    private _renderArtifactCommandBar() {
        //Rendering command bar after ArtifactControllerView is mounted
        //This is a temp fix. Actual fix should happen in Overlaypanel
        Utils_Core.delay(this, 0, () => {
            if (this._artifactCommandBarHeader) {
                let commandBar = React.createElement<ICommandBarProps>(CommandBar, {
                    isSearchBoxVisible: false,
                    elipisisAriaLabel: DTCResources.CommandBarEllipsesAriaLabel,
                    items: this._getVisibleButtons(),
                    overflowItems: this._getOverFlowButtons(),
                    className: "edit-command-bar"
                });

                ReactDom.render(commandBar, this._artifactCommandBarHeader);
            }
        });
    }

    private _isComponentBusyLoading(): boolean {
        if (this.state.inputState === ArtifactInputState.Initializing ||
            this.state.inputState === ArtifactInputState.FetchingDependencies) {
            return true;
        }
        return false;
    }

    private _getConfirmButtonDetails(): JSX.Element {
        return (
            this.props.mode === ArtifactMode.Add &&
            this._showInputSchema() &&
            <PrimaryButton
                className={"confirm-artifact-button"}
                disabled={!this.state.isValid}
                onClick={this._onAddArtifact}
                ariaLabel={Resources.AddArtifact}
                aria-disabled={!this.state.isValid}>
                {Resources.Add}
            </PrimaryButton>);
    }

    private _onAddArtifact = (): void => {
        if (this.props.onAddArtifact) {
            this.props.onAddArtifact(this.state.selectedArtifactType.name);
        }
    }

    private _getErrorDetails(): JSX.Element {
        return (
            !!this.state.error &&
            <MessageBarComponent
                messageBarType={this.state.errorType ? this.state.errorType : MessageBarType.error}
                onDismiss={this.state.isErrorDismissible ? this._onDismissError : null}>
                {this.state.error}
            </MessageBarComponent>);
    }

    private _getLoadingComponent(): JSX.Element {

        let loadingMessageClassName = "artifact-loading-container load-above-center";
        let loadingMessage = this._getLoadingMessage();
        if (loadingMessage) {
            return (<div className={loadingMessageClassName}>
                <LoadingComponent label={loadingMessage} />
            </div>);
        }

        return null;
    }

    private _getOverlayComponent(): JSX.Element {
        let loadingMessage = this._getLoadingMessage();
        if (loadingMessage) {
            return (<div className="artifact-overlay">
                <Overlay className="overlay-dialog" />
            </div>);
        }

        return null;
    }

    private _hideDeleteDialog = () => {
        this._toggleDeleteConfirmationDialog(false);
    }

    private _onDeleteArtifact = () => {
        this._artifactActionCreator.markingArtifactIsDeleting(this.props.instanceId);
    }

    private _getLoadingMessage(): string {
        switch (this.state.inputState) {
            case ArtifactInputState.Initializing:
            case ArtifactInputState.FetchingDependencies:
                return Resources.Loading;
            default:
                return null;
        }
    }

    private _showInputSchema(): boolean {
        return this.state.inputState === ArtifactInputState.Initialized ||
            this.state.inputState === ArtifactInputState.FetchingDependencies || !!this.state.error;
    }


    private _onGetAliasErrorMessage = (alias: string): string => {
        let artifact: ArtifactStore = this._artifactListStore.getArtifactById(this.props.instanceId);
        return artifact.getAliasErrorMessage(alias);
    }

    private _onDismissError = (): void => {
        let artifact: ArtifactStore = this._artifactListStore.getArtifactById(this.props.instanceId);
        this._artifactTypeListActionCreator.clearError(artifact.getState().type);
    }

    private _onDismissWarning = (): void => {
        let state = this._store.getState();
        state.warning = Utils_String.empty;
        this.setState(state as IArtifactControllerViewState);
    }

    private _getVisibleButtons(): IContextualMenuItem[] {
        return [
            {
                name: DTCResources.Delete,
                key: "delete-artifact",
                ariaLabel: Resources.DeleteArtifact,
                icon: "Delete",
                className: css("fabric-style-overrides", "commandBar-hover-override", "delete-artifact-button"),
                onClick: this._showDeleteConfirmationDialog
            }
        ];
    }

    private _toggleDeleteConfirmationDialog(visible: boolean) {
        this.setState({ showDeleteDialog: visible } as IArtifactControllerViewState);
    }

    private _showDeleteConfirmationDialog = () => {
        this._toggleDeleteConfirmationDialog(true);
    }

    private _getOverFlowButtons(): IContextualMenuItem[] {
        const nameString: string = this.state.isPrimary ? Resources.PrimaryArtifact : Resources.MarkAsPrimary;
        let iconClass: string = "bowtie-icon bowtie-status-success";
        if (!this.state.isPrimary) {
            iconClass = css(iconClass, "primary-tick-mark-icon");
        }

        let markPrimaryContextMenu: IContextualMenuItem = {
            name: nameString,
            key: "mark-primary-artifact",
            ariaLabel: nameString,
            iconProps: { className: iconClass },
            disabled: this.state.isPrimary,
            className: "fabric-style-overrides commandBar-hover-override mark-primary",
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => this._onMarkArtifactPrimary()
        };

        return [markPrimaryContextMenu];
    }

    private _onMarkArtifactPrimary(): void {
        if (this.props.mode === ArtifactMode.Edit) {
            this._artifactActionCreator.setArtifactPrimary(this.props.instanceId);
        }
    }

    private _getArtifactHeader(): JSX.Element {
        if (this.props) {
            if (this.props.mode === ArtifactMode.Add) {
                return this._getNewArtifactHeader();
            }
            else {
                return this._getEditArtifactHeader();
            }
        }
    }

    private _getNewArtifactHeader(): JSX.Element {
        return (
            <OverlayPanelHeading
                cssClass="add-artifact-header"
                label={Resources.AddArtifact}
                infoButtonRequired={false}>
            </OverlayPanelHeading>);
    }




    private _onSourceOptionChange = (selectedArtifactType: ISelectableArtifactType) => {
        this._artifactTypeListActionCreator.changeArtifactType(selectedArtifactType.artifactType, selectedArtifactType.initialValues);
    }

    private _getEditArtifactHeader(): JSX.Element {
        let returnElement: JSX.Element;
        let selectedArtifactType: string = Utils_String.empty;
        let selectedArtifactAlias: string = Utils_String.empty;
        let panelSubtitle: string = Utils_String.empty;
        let linkToSourceDefinition: string = Utils_String.empty;

        if (this.state && this.state.selectedArtifactType && this.state.selectedArtifactType.name) {
            if (this.state.selectedArtifactType.name) {
                selectedArtifactType = this.state.selectedArtifactType.name;
                panelSubtitle = Utils_String.format(Resources.SelectedArtifactTypeSummary, selectedArtifactType);
            }
            if (this.state.selectedArtifactType.alias) {
                selectedArtifactAlias = this.state.selectedArtifactType.alias;
                if (this.state.selectedArtifactType.sourceDefinitionUrl) {
                    linkToSourceDefinition = this.state.selectedArtifactType.sourceDefinitionUrl;
                }
                if (selectedArtifactType) {
                    panelSubtitle = Utils_String.format(Resources.SelectedArtifactAliasSummary, selectedArtifactType, selectedArtifactAlias);
                } else {
                    panelSubtitle = Utils_String.format(Resources.SelectedArtifactTypeSummary, selectedArtifactAlias);
                }
            }
        }


        returnElement = (
            <div className="artifact-header">
                <div className="artifact-overlay-header">
                    <OverlayPanelHeading label={Resources.Artifact}
                        infoButtonRequired={false}
                        description={panelSubtitle}
                        linkedUrl={linkToSourceDefinition}>
                    </OverlayPanelHeading>
                </div>

                <div className="artifact-command-bar-container" ref={this._resolveRef("_artifactCommandBarHeader")} />

            </div>);

        return returnElement;
    }

    private _getArtifactDetailsMessageSection(): JSX.Element {
        // In addition to disabling the detail message during initialization or fetching dependencies, disable when defintion has
        // no selected value. _doesDefinitionInputFieldHaveValue
        if (this.state && !this.state.error && this.state.selectedArtifactType && this.state.selectedArtifactType.artifactDetailsMessage &&
            this.state.inputState !== ArtifactInputState.Initializing &&
            this.state.inputState !== ArtifactInputState.FetchingDependencies &&
            this._doesDefinitionInputFieldHaveValue()) {
            return (<MessageBarComponent
                className={"artifacts-detail-message"}
                messageBarType={MessageBarType.info} >
                {this._getArtifactDetailsMessage(this.state.selectedArtifactType.artifactDetailsMessage)}
            </MessageBarComponent>);
        }
    }

    // Return true only when definition field has the valid input field
    private _doesDefinitionInputFieldHaveValue(): boolean {
        let artifactInputs = this.state.selectedArtifactType ? this.state.selectedArtifactType.inputs : [];
        let isDefinitionSet: boolean = false;
        artifactInputs.forEach((artifactInput: IArtifactInput) => {
            if (ArtifactUtility.isDefinitionInput(artifactInput.id)) {
                if (artifactInput.selectedValue) {
                    isDefinitionSet = true;
                }
            }
        });
        return isDefinitionSet;
    }

    private _getArtifactDetailsMessage(message: string): JSX.Element {
        //disabling tslint check for dangerouslySetInnerHTML as we have verified all input strings are html Encoded.
        /* tslint:disable-next-line */
        return (<div className="message-container"
            dangerouslySetInnerHTML={this._renderHtml(message)}>
        </div>);
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _initializeArtifactTypes(): void {
        if (this.state.inputState === ArtifactInputState.Uninitialized) {
            let artifact: ArtifactStore = this._artifactListStore.getArtifactById(this.props.instanceId);
            this._artifactTypeListActionCreator.initializeSchemaAndInputs(artifact.getState(), this.props.mode);
        }
    }

    private _onChange = () => {
        let state: IArtifactTypesData = this._store.getState();
        this.setState(state as IArtifactControllerViewState);
    }

    private _searchArtifactInput = (payload: IUpdateArtifactTnputPayload) => {
        const artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.props.instanceId);
        const instanceId = artifactTypeListStore.getArtifactTypeStoreInstanceId(payload.type);
        const artifactTypeActionCreator = ActionCreatorManager.GetActionCreator<ArtifactTypeActionCreator>(ArtifactTypeActionCreator, instanceId);
        
        if (payload && payload.displayValue && Boolean.isFalse(payload.displayValue, true)) {
            payload.displayValue = Utils_String.empty;
        }

        return artifactTypeActionCreator.searchArtifactInput(JQueryWrapper.extend(payload, { artifactId: this.props.instanceId }));
    }

    private _updateArtifactInput = (payload: IUpdateArtifactTnputPayload, skipFetchinDependency?: boolean) => {
        const artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.props.instanceId);
        const instanceId = artifactTypeListStore.getArtifactTypeStoreInstanceId(payload.type);
        const artifactTypeActionCreator = ActionCreatorManager.GetActionCreator<ArtifactTypeActionCreator>(ArtifactTypeActionCreator, instanceId);
        if (payload && payload.displayValue && Boolean.isFalse(payload.displayValue, true)) {
            payload.displayValue = Utils_String.empty;
        }
        artifactTypeActionCreator.updateArtifactInput(JQueryWrapper.extend(payload, { artifactId: this.props.instanceId }), skipFetchinDependency);
    }

    private _updateArtifactInputOptions = (payload: IUpdateArtifactInputOptionsPayload) => {
        const artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, this.props.instanceId);
        const instanceId = artifactTypeListStore.getArtifactTypeStoreInstanceId(payload.type);
        const artifactTypeActionCreator = ActionCreatorManager.GetActionCreator<ArtifactTypeActionCreator>(ArtifactTypeActionCreator, instanceId);
        artifactTypeActionCreator.updateArtifactInputOptions(JQueryWrapper.extend(payload, { artifactId: this.props.instanceId }));
    }

    private _updateArtifactAlias = (artifactType: string, alias: string) => {
        this._artifactActionCreator.updateArtifactAlias(this.props.instanceId, alias);
    }

    private _artifactCommandBarHeader: HTMLDivElement;
    private iconSize: number = 30;
    private _artifactTypeListActionCreator: ArtifactTypeListActionCreator;
    private _artifactActionCreator: ArtifactActionCreator;
    private _store: ArtifactViewStore;
    private _artifactListStore: ArtifactListStore;
}
