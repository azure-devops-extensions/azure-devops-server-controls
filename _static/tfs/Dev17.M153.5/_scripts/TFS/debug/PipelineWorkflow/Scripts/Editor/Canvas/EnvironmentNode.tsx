/// <reference types="react" />
import * as React from "react";
import { TransitionGroup as ReactTransitionGroup } from "react-transition-group";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Telemetry, Feature, Properties, Source } from "DistributedTaskControls/Common/Telemetry";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";

import { EnvironmentCoreProperties } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCoreProperties";
import { EnvironmentCorePropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCorePropertiesViewStore";
import { EnvironmentTriggersAndPreDeploymentApprovals } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentTriggersAndPreDeploymentApprovals";
import { PostDeploymentApprovals } from "PipelineWorkflow/Scripts/Editor/Canvas/PostDeploymentApprovals";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { EnvironmentListActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsCreator";
import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";
import { IconButton, DefaultButton } from "OfficeFabric/Button";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNode";

const transitionTime = 500;

export interface IEnvironmentNodeProps extends Base.IProps {
    onAddEnvironment?: (instanceId: string) => void;
    onCloneEnvironment?: (instanceId: string) => void;
    onDeleteEnvironment?: () => void;
    onAddEnvironmentComplete?: () => void;
    onCloneEnvironmentComplete?: () => void;
    onDeleteEnvironmentComplete?: () => void;
    onMoveEnvironment?: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void;
    isMoveEnvironmentEnabled?: (instanceId: string, moveDirection: MoveDirection) => boolean;
    newEnvironmentInstanceId?: string;
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
    corePropertiesWidth?: number;
}

export enum animationStates {
    enter = 1,
    enterActive = 2,
    leave = 3,
    leaveActive = 4
}

export interface IEnvironmentNodeViewState extends IStoreState {
    isTemporary: boolean;
    isDeleting: boolean;
    animationState: animationStates;
}

export class EnvironmentNodeChild extends Base.Component<IEnvironmentNodeProps, IEnvironmentNodeViewState> {

    public componentWillEnter(callback) {
        const initialRenderTime = 0;
        setTimeout(() => {
            this.setState({ animationState: animationStates.enterActive } as IEnvironmentNodeViewState, () => {
                this._enterAnimationTimeoutHandle = Utils_Core.delay(this,
                    transitionTime, () => {
                        this._enterAnimationTimeoutHandle = null;
                        callback();
                    });
            });
        }, initialRenderTime);
    }

    public shouldComponentUpdate(nextProps, nextState): boolean {
        if (nextProps.newEnvironmentInstanceId === this.props.newEnvironmentInstanceId &&
            nextProps.releaseDefinitionFolderPath === this.props.releaseDefinitionFolderPath &&
            nextProps.releaseDefinitionId === this.props.releaseDefinitionId &&
            nextProps.corePropertiesWidth === this.props.corePropertiesWidth) {
            return !Utils_Core.equals(nextState, this.state);
        }
        return true;
    }

    public componentDidEnter() {
        let selectedEnvironmentItem = this._itemSelectionStore.getSelectedItem();
        if (selectedEnvironmentItem && selectedEnvironmentItem.getInstanceId && (selectedEnvironmentItem.getInstanceId() === this.props.instanceId)) {
            this._environmentListActionsCreator.selectEnvironmentItemByInstanceId(this.props.instanceId, selectedEnvironmentItem);
            if (this.props.onCloneEnvironmentComplete) {
                this.props.onCloneEnvironmentComplete();
                this._innerFocusZone.focus();
            }
        }
    }

    public componentWillLeave(callback) {
        this.setState({ animationState: animationStates.leave } as IEnvironmentNodeViewState, () => {
            this._leaveAnimationTimeoutHandle = Utils_Core.delay(this,
                transitionTime, () => {
                    this._leaveAnimationTimeoutHandle = null;
                    callback();
                });
        });
    }

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, this.props.instanceId);
        this._store.addChangedListener(this._handleStoreChange);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.CanvasSelectorInstance);
        const isNewEnvironment = (this.props.instanceId === this.props.newEnvironmentInstanceId);
        this.setState({
            isTemporary: this._store.isTemporary(),
            isDeleting: false,
            animationState: ((isNewEnvironment && (this._environmentListStore.getDataStoreList().length !== 1)) ? animationStates.enter : animationStates.enterActive)
        } as IEnvironmentNodeViewState);
        this._environmentListActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionsCreator>(EnvironmentListActionsCreator);
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.CanvasSelectorInstance);
    }

    public componentWillUnmount(): void {
        if (this.state.isDeleting) {
            this._overlayPanelActionsCreator.hideOverlay();
            this._environmentListActionsCreator.deleteEnvironmentByInstanceId(this.props.instanceId, this._store.isTemporary());
            if (this.props.onDeleteEnvironmentComplete) {
                this.props.onDeleteEnvironmentComplete();
            }
        }
        this._store.removeChangedListener(this._handleStoreChange);

        if (this._enterAnimationTimeoutHandle) {
            this._enterAnimationTimeoutHandle.cancel();
        }

        if (this._leaveAnimationTimeoutHandle) {
            this._leaveAnimationTimeoutHandle.cancel();
        }
    }

    public render(): JSX.Element {

        const corePropertiesStyle = {
            marginLeft: LayoutConstants.marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments
        };

        const postApprovalsStyle = {
            marginLeft: LayoutConstants.marginLeftForPostDeploymentToOverlapOnCoreProperties
        };

        const envNodeParentClassNames = css("cd-environment-node-parent", {
            "cd-environment-temporary-node": this.state.isTemporary
        });

        const environmentNodeClassNames = css("cd-environment-node", {
            "zoom-in-out-animation-enter": (this.state.animationState === animationStates.enter || this.state.animationState === animationStates.enterActive),
            "zoom-in-out-animation-enter-active": (this.state.animationState === animationStates.enterActive),
            "zoom-in-out-animation-leave": (this.state.animationState === animationStates.leave),
            "zoom-in-out-animation-leave-active": (this.state.animationState === animationStates.leave)
        });

        const ariaLabel = Utils_String.localeFormat(Resources.EnvironmentNodeAriaLabel, this._store.getEnvironmentName());

        return (
            <div className={envNodeParentClassNames}>

                <InnerFocusZone ref={this._resolveRef("_innerFocusZone")} ariaLabel={ariaLabel}>
                    <div className={environmentNodeClassNames}>
                        <EnvironmentTriggersAndPreDeploymentApprovals cssClass="pre-deployment-conditions flex-item" {...this.props} />

                        <div className="core-properties-container flex-item" style={corePropertiesStyle}>
                            <EnvironmentCoreProperties
                                cssClass="core-properties show-shadow"
                                instanceId={this.props.instanceId}
                                onAddEnvironmentComplete={this._handleOnAddEnvironmentComplete}
                                onEnvironmentSelectorClosed={this._handleEnvironmentSelectorClosed}
                                releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                                releaseDefinitionId={this.props.releaseDefinitionId}
                                width={this.props.corePropertiesWidth}
                                onMoveEnvironment={this.props.onMoveEnvironment}
                                isMoveEnvironmentEnabled={this.props.isMoveEnvironmentEnabled} />
                        </div>

                        <div className="post-approvals-container" style={postApprovalsStyle}>
                            <PostDeploymentApprovals cssClass="post-approvals flex-item" {...this.props} />
                        </div>
                    </div>
                </InnerFocusZone>

                <div className="cd-environment-node-commands">

                    <div className="cd-add-button-container" aria-hidden="true">
                        <div className="cd-environment-button-container">
                            <div className="cd-icon-button-container">
                                <IconButton
                                    aria-hidden="true"
                                    iconProps={{ iconName: "Add" }}
                                    title={Resources.AddEnvironmentDescription}
                                    onClick={this._handleAddEnvironment}
                                    className="cd-icon-button"
                                    tabIndex={-1}
                                />
                            </div>
                            <div className="cd-default-button-container">
                                <DefaultButton
                                    aria-hidden="true"
                                    iconProps={{ iconName: "Add" }}
                                    text={Resources.Add}
                                    title={Resources.AddEnvironmentDescription}
                                    onClick={this._handleAddEnvironment}
                                    className="cd-icon-button"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="cd-clone-button-container" aria-hidden="true">
                        <div className="cd-environment-button-container">
                            <div className="cd-icon-button-container">
                                <IconButton
                                    aria-hidden="true"
                                    iconProps={{ iconName: "Copy" }}
                                    title={Resources.CloneSelectedEnvironment}
                                    onClick={this._handleCloneEnvironment}
                                    className="cd-icon-button"
                                    tabIndex={-1}
                                />
                            </div>
                            <div className="cd-default-button-container">
                                <DefaultButton
                                    aria-hidden="true"
                                    iconProps={{ iconName: "Copy" }}
                                    text={Resources.CloneText}
                                    title={Resources.CloneSelectedEnvironment}
                                    onClick={this._handleCloneEnvironment}
                                    className="cd-icon-button"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        );
    }

    private _handleAddEnvironment = () => {
        if (!EnvironmentNodeChild._isEnvironmentAddInProgress) {
            if (this.props.onAddEnvironment) {
                this.props.onAddEnvironment(this.props.instanceId);
                this._publishTelemetry(Feature.AddNewEnvironment);
            }

            EnvironmentNodeChild._isEnvironmentAddInProgress = true;
        }
    }

    private _handleOnAddEnvironmentComplete = () => {
        // The focus needs to be set after the panel has closed i.e. the panel is dismissed.
        // Otherwise, setting focus will have no effect. On IE11, the focus does shift but the
        // outline is not shown. This is a known issue.
        Utils_Core.delay(this, 0, () => {
            if (this._innerFocusZone) {
                this._innerFocusZone.focus();
            }
        });

        if (this.props.onAddEnvironmentComplete) {
            this.props.onAddEnvironmentComplete();
        }
    }

    private _handleEnvironmentSelectorClosed = () => {
        EnvironmentNodeChild._isEnvironmentAddInProgress = false;
    }

    private _handleCloneEnvironment = () => {
        if (this.props.onCloneEnvironment) {
            this.props.onCloneEnvironment(this.props.instanceId);

            this._publishTelemetry(Feature.CloneEnvironment);
        }
    }

    private _handleStoreChange = () => {
        let currentState: IEnvironmentNodeViewState = this.state;
        let isTemporary: boolean = this._store.isTemporary();
        let isDeleting: boolean = this._store.isEnvironmentSetToDeletion();
        if (currentState.isTemporary !== isTemporary || currentState.isDeleting !== isDeleting) {
            this.setState({
                isTemporary: isTemporary,
                isDeleting: isDeleting
            } as IEnvironmentNodeViewState);
        }
        if (currentState.isDeleting !== isDeleting) {
            this.props.onDeleteEnvironment();
        }
    }

    private _publishTelemetry(feature: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.EnvironmentSelected] = true;

        Telemetry.instance().publishEvent(feature, eventProperties, Source.Hover);
    }

    private _store: DeployEnvironmentStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _environmentListStore: EnvironmentListStore;
    private _environmentListActionsCreator: EnvironmentListActionsCreator;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _innerFocusZone: InnerFocusZone;
    private _enterAnimationTimeoutHandle: Utils_Core.DelayedFunction;
    private _leaveAnimationTimeoutHandle: Utils_Core.DelayedFunction;

    // Only one environment add can be in progress.
    private static _isEnvironmentAddInProgress: boolean;
}

export interface IEnvironmentTransitionNodeState extends Base.IState {
    isDeleting: boolean;
    isMounted: boolean;
}

export class EnvironmentNode extends Base.Component<IEnvironmentNodeProps, IEnvironmentTransitionNodeState> {

    public componentWillMount(): void {
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
    }

    public componentDidMount(): void {
        this.setState({
            isMounted: true
        } as IEnvironmentTransitionNodeState);
    }

    public render(): JSX.Element {
        const noEnvAddButtonContainerStyle: React.CSSProperties = {
            position: "absolute",
            width: LayoutConstants.nodeWidth,
            height: LayoutConstants.nodeHeight,
            top: 0,
            left: 0
        };

        const noEnvAddButtonStyle: React.CSSProperties = {
            height: LayoutConstants.corePropertiesHeight,
            width: this.props.corePropertiesWidth || LayoutConstants.corePropertiesWidth
        };

        const noEnvironmentsAddButtonContainer = (
            <div className="no-environment-add-button-container" style={noEnvAddButtonContainerStyle}>
                <div className="no-environment-add-button" style={noEnvAddButtonStyle}>
                    <span className="add-icon bowtie-icon bowtie-math-plus-light"></span>
                    {Resources.AddEnvironmentDescription}
                </div>
            </div>
        );

        const showNoEnvironmentAddButton = (this.state.isDeleting && (this._environmentListStore.getDataStoreList().length === 1));

        return (
            <div>

                {showNoEnvironmentAddButton && noEnvironmentsAddButtonContainer}

                < ReactTransitionGroup component="div" >
                    {!this.state.isDeleting && this.state.isMounted && <EnvironmentNodeChild key={this.props.instanceId} { ...this.props} onDeleteEnvironment={this._handleDeleteEnvironment} />}
                </ReactTransitionGroup>

            </div>
        );
    }

    private _handleDeleteEnvironment = () => {
        this.setState({
            isDeleting: true
        } as IEnvironmentTransitionNodeState);
    }

    private _environmentListStore: EnvironmentListStore;
}
