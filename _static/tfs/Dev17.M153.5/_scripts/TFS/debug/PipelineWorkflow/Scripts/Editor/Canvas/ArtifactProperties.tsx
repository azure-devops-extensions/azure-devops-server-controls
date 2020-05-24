/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { OverlayPanelStore } from "DistributedTaskControls/Stores/OverlayPanelStore";
import { Circle } from "DistributedTaskControls/Components/Canvas/Circle";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";

import { ArtifactActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActionCreator";
import { ArtifactListActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActionCreator";
import { AddArtifactControllerView } from "PipelineWorkflow/Scripts/Editor/Artifact/AddArtifactControllerView";
import { ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ArtifactPropertiesItem, IArtifactPropertiesItemArgs } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactPropertiesItem";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { IArtifactPropertiesViewState, ArtifactPropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactPropertiesViewStore";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseConstants from "ReleaseManagement/Core/Constants";

import { TooltipDelay, TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";

import * as Utils_Core from "VSS/Utils/Core";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/ArtifactProperties";

export interface IArtifactPropertiesNodeViewState extends IArtifactPropertiesViewState {
    showDeleteDialog: boolean;
}

export interface IArtifactPropertiesProps extends Base.IProps {
    onAddArtifactComplete?: () => void;
}

export class ArtifactProperties extends Base.Component<IArtifactPropertiesProps, IArtifactPropertiesNodeViewState> {

    public componentWillMount(): void {
        this._artifactPropertiesViewStore = StoreManager.GetStore<ArtifactPropertiesViewStore>(ArtifactPropertiesViewStore, this.props.instanceId);
        this._artifactPropertiesViewStore.addChangedListener(this._handleArtifactPropertiesChanges);
        this._overlayPanelStore = StoreManager.GetStore<OverlayPanelStore>(OverlayPanelStore, CanvasSelectorConstants.CanvasSelectorInstance);
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.CanvasSelectorInstance);
        this._artifactActionCreator = ActionCreatorManager.GetActionCreator<ArtifactActionCreator>(ArtifactActionCreator, this.props.instanceId);
        this._artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator, this.props.instanceId);
        this.setState(this._artifactPropertiesViewStore.getState() as IArtifactPropertiesNodeViewState);
    }

    public componentDidMount() {
        if (this.state.isTemporary && !this._panelShown) {
            this._panelShown = true;
            this._openAddArtifactPanel();
        }
    }

    public componentWillUnmount(): void {
        if (this.state.isDeleting) {
            this._overlayPanelActionsCreator.hideOverlay();
            this._artifactListActionCreator.removeArtifact(this.props.instanceId);
        }
        this._artifactPropertiesViewStore.removeChangedListener(this._handleArtifactPropertiesChanges);
    }

    public render(): JSX.Element {

        const artifactTypeClassName = "artifact-type";

        const ariaLabelId = "dtc-id-overlay-panel-description-label-" + DtcUtils.getUniqueInstanceId();

        const artifactCorePropCircleClassName = css({
            "cd-artifact-properties": true,
            "dtc-canvas-element-border": true,
            "cd-artifact-properties-temporary-container": this.state.isTemporary
        });

        const artifactCorePropStyle: React.CSSProperties = {
            height: LayoutConstants.artifactPropertiesHeight,
            width: LayoutConstants.artifactPropertiesWidth,
            marginTop: LayoutConstants.artifactPropertiesTopMargin
        };

        return (
            <div className="cd-artifact-properties-container" ref={(element) => this._element = element} tabIndex={-1} onKeyDown={this._handleKeyDown}>
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                    getItem={this._getItem}
                    isValid={this._isValid()}
                    cssClass={this.props.cssClass}
                    ariaLabel={Resources.ArtifactPropertiesAriaLabel}>

                    <div className={artifactCorePropCircleClassName} aria-labelledby={ariaLabelId} style={artifactCorePropStyle} >

                        <div className={artifactTypeClassName}>{this._getArtitfactTypeIcon()}</div>

                        {this._getArtifactAliasElement(ariaLabelId)}

                    </div>

                </OverlayPanelSelectable>

                <ConfirmationDialog
                    title={Resources.DeleteArtifact}
                    subText={Utils_String.localeFormat(Resources.DeleteArtifactConfirmationMessage, this.state.alias)}
                    onConfirm={this._onDeleteArtifact}
                    showDialog={this.state.showDeleteDialog}
                    onCancel={this._hideDeleteDialog}
                />
            </div>
        );
    }

    private _getArtifactAliasElement(ariaLabelId: string): JSX.Element {
        const artifactAliasClassName = "artifact-alias";
        let artifactAliasElement: JSX.Element;
        if (this.state.isTemporary) {
            artifactAliasElement = (
                <div className={artifactAliasClassName}  >
                    {!this._isValid() && <i className="cd-artifact-alias-error bowtie-icon bowtie-status-error-outline" />}
                    <span id={ariaLabelId}> {Resources.AddArtifact} </span>
                </div>
            );
        }
        else {
            artifactAliasElement = (
                <TooltipHost
                    directionalHint={DirectionalHint.bottomCenter}
                    content={this.state.alias}
                    delay={TooltipDelay.medium}>
                    <div className={artifactAliasClassName} id={ariaLabelId}  >
                        {!this._isValid() && <i className="cd-artifact-alias-error bowtie-icon bowtie-status-error-outline" />}
                        {this.state.alias}
                        <span className="fade-out-container"></span>
                    </div>
                </TooltipHost>
            );
        }
        return artifactAliasElement;
    }

    private _getArtitfactTypeIcon(): JSX.Element {
        let iconClass = ArtifactUtility.getArtifactBowtieIcon(this.state.type);
        let iconElement: JSX.Element;

        if (this.state.isTemporary) {
            iconElement = (
                <i className={css("artifact-type-icon", "bowtie-icon", iconClass)} />
            );
        } else {
            iconElement = (
                <TooltipHost content={this.state.type}>
                    <i className={css("artifact-type-icon", "bowtie-icon", iconClass)} />
                </TooltipHost>
            );
        }

        return iconElement;
    }

    private _isValid(): boolean {
        // temporary artifact is always valid
        return this.state.isTemporary ? true : this.state.isValid;
    }

    private _onDeleteArtifact = () => {
        this._artifactActionCreator.markingArtifactIsDeleting(this.props.instanceId);
    }

    private _hideDeleteDialog = () => {
        this._toggleDeleteConfirmationDialog(false);
    }

    private _toggleDeleteConfirmationDialog(visible: boolean) {
        this.setState({ showDeleteDialog: visible } as IArtifactPropertiesNodeViewState);
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.DELETE) {
            this._showDeleteDialog();
        }
    }

    private _showDeleteDialog = () => {
        this._toggleDeleteConfirmationDialog(true);
    }

    private _getItem = (): ArtifactPropertiesItem => {
        let state = this._artifactPropertiesViewStore.getState();
        return new ArtifactPropertiesItem(
            {
                instanceId: state.id,
                mode: ArtifactMode.Edit
            });
    }

    private _openAddArtifactPanel(): void {
        const overlayPanelState = this._overlayPanelStore.getState();
        const panelWidth = overlayPanelState.detailsPaneWidth || 0;
        Utils_Core.delay(this, 0, () => {
            if (this._element) {
                this._addArtifactPanelContainer = document.createElement("div");
                document.body.appendChild(this._addArtifactPanelContainer);
                this._elementInFocusBeforeOpeningSelectorPanel = this._element.ownerDocument.activeElement as HTMLElement;
                let component = React.createElement(
                    AddArtifactControllerView,
                    {
                        onClose: this._onCloseAddArtifactPanel,
                        hasCloseButton: true,
                        addArtifactPanelWidth: panelWidth,
                        instanceId: this._artifactPropertiesViewStore.getState().id,
                    });
                ReactDOM.render(component, this._addArtifactPanelContainer);
                this._overlayPanelActionsCreator.setIsBlockingPanelOpen(true);
            }
        });
    }

    private _onCloseAddArtifactPanel = (instanceId: string) => {
        if (this._addArtifactPanelContainer) {
            ReactDOM.unmountComponentAtNode(this._addArtifactPanelContainer);
            document.body.removeChild(this._addArtifactPanelContainer);
            this._addArtifactPanelContainer = null;
            this._overlayPanelActionsCreator.setIsBlockingPanelOpen(false);
        }

        let temporaryArtifactInstanceId = this._artifactPropertiesViewStore.getTemporaryArtifactInstance();
        if (temporaryArtifactInstanceId) {
            if (instanceId) {
                //add temporary artifact
                this._artifactActionCreator.updateTemporaryArtifact(this._artifactPropertiesViewStore.getState().id);
                if (this.props.onAddArtifactComplete) {
                    this.props.onAddArtifactComplete();
                }
            }
            else {
                // remove corresponding ArtifactStore from ArtifactListStore
                this._onDeleteArtifact();
                if (this._elementInFocusBeforeOpeningSelectorPanel) {
                    this._elementInFocusBeforeOpeningSelectorPanel.focus();
                }
            }
        }
    }

    private _handleArtifactPropertiesChanges = () => {
        let state = this._artifactPropertiesViewStore.getState() as IArtifactPropertiesNodeViewState;
        this.setState(state);
        if (state.isTemporary && !this._panelShown) {
            this._panelShown = true;
            this._openAddArtifactPanel();
        }
    }

    private _artifactActionCreator: ArtifactActionCreator;
    private _artifactListActionCreator: ArtifactListActionCreator;
    private _artifactPropertiesViewStore: ArtifactPropertiesViewStore;
    private _element: HTMLElement;
    private _addArtifactPanelContainer: HTMLElement;
    private _overlayPanelStore: OverlayPanelStore;
    private _panelShown: boolean = false;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _elementInFocusBeforeOpeningSelectorPanel: HTMLElement;
}
