/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { GridFocusZone } from "DistributedTaskControls/Components/Canvas/GridFocusZone";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";

import { ArtifactListActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActionCreator";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactNode } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactNode";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IArtifactsCanvasViewState, IArtifactAndTrigger, ArtifactsCanvasViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactsCanvasViewStore";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { PipelineArtifactDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseScheduleTrigger } from "PipelineWorkflow/Scripts/Editor/Canvas/ReleaseScheduleTrigger";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as ReleaseConstants from "ReleaseManagement/Core/Constants";
import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { KeyCode } from "VSS/Utils/UI";

import { DefaultButton, IButton } from "OfficeFabric/Button";

import { css } from "OfficeFabric/Utilities";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/ArtifactsCanvas";

export interface IArtifactsCanvasState extends IArtifactsCanvasViewState {
    gridZoneKey: string;
    showNoArtifactsAddButton?: boolean;
}

export class ArtifactsCanvas extends Base.Component<Base.IProps, IArtifactsCanvasState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<ArtifactsCanvasViewStore>(ArtifactsCanvasViewStore);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        this._store.addChangedListener(this._handleStoreChange);
        this._artifactListStore.addChangedListener(this._onDataStoreChanged);
        this.setState({ ...this._store.getState(), showNoArtifactsAddButton: (this._artifactListStore.getStores().length === 0) });
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
        this._artifactListStore.removeChangedListener(this._onDataStoreChanged);
    }

    public componentDidUpdate(): void {
        if (this._focusOnAddButton && this._addArtifactButton) {
            this._addArtifactButton.focus();
            this._focusOnAddButton = false;
        }
    }

    public shouldComponentUpdate(nextProps, nextState): boolean {
        return !Utils_Core.equals(nextState, this.state);
    }

    public render(): JSX.Element {

        let artifactNodes = this.state.artifactAndTriggers.map((artifactAndTrigger: IArtifactAndTrigger, index: number) => {
            return (
                <ArtifactNode
                    setFocusOnAddArtifact={this._setFocusOnAddArtifactButton}
                    cssClass="artifact-node-container"
                    instanceId={artifactAndTrigger.artifactId}
                    key={artifactAndTrigger.artifactId}
                    showTrigger={artifactAndTrigger.showTrigger} />
            );
        });

        const noArtifactAddButtonStyle: React.CSSProperties = {
            height: LayoutConstants.artifactPropertiesHeight,
            width: LayoutConstants.artifactPropertiesWidth,
            marginTop: LayoutConstants.artifactPropertiesTopMargin
        };

        const addArtifactDescriptionId = "add-artifact-description" + Utils_String.generateUID();
        const noArtifactAddButtonContainer = (
            <div className="add-artifact-circle-button-container">
                <div className="add-artifact-circle-button"
                    style={noArtifactAddButtonStyle}
                    onClick={this._handleAddArtifact}
                    onKeyDown={this._handleKeyDown}
                    role={"button"}
                    tabIndex={0}
                    aria-describedby={addArtifactDescriptionId}
                    aria-label={Resources.AddArtifact}
                >
                    <div className="hidden" id={addArtifactDescriptionId}>{Resources.AddArtifact}</div>
                    <div className="add-artifact-icon">
                        <span className="bowtie-icon bowtie-math-plus-light"></span>
                    </div>
                    <div>{Resources.AddArtifact}</div>
                </div>
            </div>
        );

        const artifactWidthAfterMargin = (LayoutConstants.artifactTriggerRadius * 2 - LayoutConstants.artifactTriggerLeftMargin);

        const artifactNodesContainerStyle: React.CSSProperties = {
            minWidth: (LayoutConstants.artifactPropertiesWidth + artifactWidthAfterMargin),
            marginLeft: artifactWidthAfterMargin
        };

        return (
            <div role="region" aria-label={Resources.ArtifactsText} className={css("cd-artifact-canvas", this.props.cssClass)} >
                <div className="cd-artifacts-canvas-title">
                    {Resources.ArtifactsText}
                </div>
                {this._getAddButton()}

                <div className="cd-artifact-nodes-container" style={artifactNodesContainerStyle}>
                    {!this.state.showNoArtifactsAddButton &&
                        <div className="cd-artifact-nodes">
                            <GridFocusZone
                                gridCellHeight={LayoutConstants.gridFocusZoneCellHeight}
                                gridCellWidth={LayoutConstants.gridFocusZoneCellWidth}
                                rowMarginCount={0}
                                columnMarginCount={0}
                                gridZoneKey={this.state.gridZoneKey}>

                                {artifactNodes}

                            </GridFocusZone>
                        </div>
                    }

                    {this.state.showNoArtifactsAddButton && noArtifactAddButtonContainer}

                    <InnerFocusZone cssClass="release-schedule-trigger-canvas-container" tabIndex={0} ariaLabel={Resources.DefinitionScheduleTriggerHeading}>
                        <ReleaseScheduleTrigger />
                    </InnerFocusZone>
                </div>

            </div>
        );
    }

    private _getAddButton(): JSX.Element {
        return (
            <div className="add-button-container">
                <div className="add-button-separator"></div >
                <div className="add-artifact-button-container">
                    <DefaultButton
                        componentRef={this._resolveRef("_addArtifactButton")}
                        className={css("add-artifact-button", "fabric-style-overrides")}
                        iconProps={{ iconName: "Add" }}
                        text={Resources.Add}
                        ariaLabel={Resources.AddArtifact}
                        onClick={this._handleAddArtifact}
                        ariaDescription={Resources.AddArtifact}>
                    </DefaultButton>
                </div>
            </div>
        );
    }

    private _setFocusOnAddArtifactButton = () => {
        this._focusOnAddButton = true;
    }

    private _handleAddArtifact = () => {
        this._hideOverlay();
        this._artifactListActionCreator.addArtifact(this._getDefaultArtifactToAdd());
    }

    private _hideOverlay(): void {
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.CanvasSelectorInstance);
        this._overlayPanelActionsCreator.hideOverlay();
    }

    private _getDefaultArtifactToAdd(): ReleaseContracts.Artifact {
        return {
            alias: null,
            definitionReference: this._getDefinitionReference(),
            isPrimary: false,
            sourceId: null,
            type: ReleaseTypes.ArtifactTypes.Build,
            isRetained: false
        };
    }

    private _getDefinitionReference(): IDictionaryStringTo<ReleaseContracts.ArtifactSourceReference> {
        let definitionReference: IDictionaryStringTo<ReleaseContracts.ArtifactSourceReference> = {};
        definitionReference[ReleaseConstants.ArtifactDefinitionConstants.ProjectId] = { id: "0", name: null };
        definitionReference[ReleaseConstants.ArtifactDefinitionConstants.DefinitionId] = { id: "0", name: null };
        definitionReference[ReleaseConstants.ArtifactDefinitionConstants.DefaultVersionTypeId] = { id: null, name: null };
        return definitionReference;
    }

    private _handleStoreChange = () => {
        let state = this._store.getState() as IArtifactsCanvasState;
        state.gridZoneKey = `gridZoneKey${DtcUtils.getUniqueInstanceId()}`;
        this.setState(state);
    }

    private _handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._handleAddArtifact();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _onDataStoreChanged = (): void => {
        let artifactStores = this._artifactListStore.getStores();
        const shouldShowNoArtifactsAddButton: boolean = (artifactStores.length === 0);
        if (shouldShowNoArtifactsAddButton !== this.state.showNoArtifactsAddButton) {
            this.setState({
                showNoArtifactsAddButton: shouldShowNoArtifactsAddButton
            });
        }
    }

    private _focusOnAddButton: boolean = false;
    private _addArtifactButton: IButton;
    private _store: ArtifactsCanvasViewStore;
    private _artifactListActionCreator: ArtifactListActionCreator;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _artifactListStore: ArtifactListStore;
}
