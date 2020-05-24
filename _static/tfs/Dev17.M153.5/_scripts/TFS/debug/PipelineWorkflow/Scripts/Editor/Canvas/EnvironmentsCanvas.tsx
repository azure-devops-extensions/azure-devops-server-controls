import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Graph, GraphList } from "DistributedTaskControls/Components/Canvas/Graph";
import { IGraphProps, INodeData, Constants } from "DistributedTaskControls/Components/Canvas/Types";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { Telemetry, Feature, Properties, Source } from "DistributedTaskControls/Common/Telemetry";
import { GridFocusZone } from "DistributedTaskControls/Components/Canvas/GridFocusZone";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SaveStatusStore } from "DistributedTaskControls/Stores/SaveStatusStore";

import { EnvironmentNode, IEnvironmentNodeProps } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNode";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { EnvironmentRankIncrementGenerator } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentRankIncrementGenerator";
import { IEnvironmentsCanvasViewState, EnvironmentsCanvasViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentsCanvasViewStore";
import { EnvironmentNodeMover, MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { EnvironmentMenu, IOperationType } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentMenu";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { EnvironmentListActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsCreator";
import { EnvironmentActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentActionsCreator";
import { EnvironmentTemplateSelectorControllerView } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTemplateSelectorControllerView";
import { TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentsCanvas";

import { css } from "OfficeFabric/Utilities";
import { ISliderProps, Slider } from "OfficeFabric/Slider";

export interface IEnvironmentsCanvasState extends IEnvironmentsCanvasViewState {
    selectedEnvironmentKey?: string;
    gridZoneKey?: string;
    showNoEnvironmentAddButton?: boolean;
    horizontalMargin?: number;
    verticalMargin?: number;
    corePropertiesWidth?: number;
}

export class EnvironmentsCanvas extends Base.Component<Base.IProps, IEnvironmentsCanvasState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<EnvironmentsCanvasViewStore>(EnvironmentsCanvasViewStore);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._environmentListActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionsCreator>(EnvironmentListActionsCreator);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.CanvasSelectorInstance);
        this._saveStatusStore = StoreManager.GetStore<SaveStatusStore>(SaveStatusStore);

        this._store.addChangedListener(this._handleStoreChange);
        this._itemSelectionStore.addChangedListener(this._handleItemSelectionChange);
        this._environmentListStore.addChangedListener(this._onEnvironmentsListStoreChange);
        this._saveStatusStore.addChangedListener(this._handleSaveStatusChange);

        this.setState({
            ...this._store.getState(),
            newEnvironmentInstanceId: "",
            showNoEnvironmentAddButton: this._environmentListStore.getDataStoreList().length === 0
        });
    }

    public shouldComponentUpdate(nextProps, nextState): boolean {
        return !Utils_Core.equals(nextState, this.state);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
        this._itemSelectionStore.removeChangedListener(this._handleItemSelectionChange);
        this._environmentListStore.removeChangedListener(this._onEnvironmentsListStoreChange);
        this._saveStatusStore.removeChangedListener(this._handleSaveStatusChange);
    }

    public componentDidUpdate(): void {
        if (this._setFocusOnAddEnvMenu && this._envMenu) {
            this._envMenu.setFocus();
            this._setFocusOnAddEnvMenu = false;
        }

        if (!this._environmentNodeMover) {
            this._environmentNodeMover = new EnvironmentNodeMover(this._graphComponent, this._graphListComponent);
        }

        if (this._onMoveComplete) {
            this._onMoveComplete();
        }
    }

    public componentDidMount(): void {
        this._environmentNodeMover = new EnvironmentNodeMover(this._graphComponent, this._graphListComponent);
    }

    public render(): JSX.Element {
        let props = this._getGraphProps(this.state);
        const customizeCanvas = NavigationStateUtils.canCustomizeCanvas();
        const splitGraph = NavigationStateUtils.splitGraph();

        const noEnvironmentsAddBtnContainerWidth = LayoutConstants.nodeWidth + LayoutConstants.horizontalMargin + (2 * Constants.graphLeftMargin);
        const noEnvironmentsAddBtnContainerHeight = LayoutConstants.nodeHeight + LayoutConstants.verticalMargin + (2 * LayoutConstants.releaseScheduleTriggerSideLength);

        const noEnvironmentsAddBtnContainerStyle: React.CSSProperties = {
            position: "relative",
            width: noEnvironmentsAddBtnContainerWidth,
            height: noEnvironmentsAddBtnContainerHeight
        };

        const noEnvironmentsAddButtonStyle: React.CSSProperties = {
            height: LayoutConstants.corePropertiesHeight,
            width: LayoutConstants.corePropertiesWidth,
            position: "absolute",
            left: (LayoutConstants.horizontalMargin + LayoutConstants.postDeploymentIndicatorElementRadius)
        };

        const addEnvironmentDescriptionId = "add-environment-description" + Utils_String.generateUID();
        const noEnvironmentsAddButtonContainer = (
            <div className="no-environment-add-button-container" style={noEnvironmentsAddBtnContainerStyle}>
                <div className="no-environment-add-button"
                    style={noEnvironmentsAddButtonStyle}
                    onClick={this._handleAddEnvironment}
                    onKeyDown={this._handleKeyDown}
                    role={"button"}
                    tabIndex={0}
                    aria-describedby={addEnvironmentDescriptionId}
                    aria-label={Resources.AddEnvironmentDescription}
                >
                    <div className="hidden" id={addEnvironmentDescriptionId}>{Resources.AddEnvironmentDescription}</div>
                    <span className="add-icon bowtie-icon bowtie-math-plus-light"></span>
                    {Resources.AddEnvironmentDescription}
                </div>
            </div>
        );

        return (
            <div role="region" aria-label={Resources.EnvironmentsText} className={css("cd-environment-canvas", this.props.cssClass)}>

                <div className="environment-canvas-heading">
                    <div className="cd-environment-canvas-title">{Resources.EnvironmentsText}</div>
                    <div className="add-button-separator"></div>
                    <div className="add-environment-button">
                        <EnvironmentMenu
                            ref={this._resolveRef("_envMenu")}
                            onClick={this._handleOperationOnEnvironment}
                            isCloneOperationEnabled={this._isCloneOperationEnabled} />
                    </div>
                </div>
                {this.state.showNoEnvironmentAddButton && noEnvironmentsAddButtonContainer}

                {!this.state.showNoEnvironmentAddButton &&
                    <GridFocusZone
                        gridCellHeight={LayoutConstants.gridFocusZoneCellHeight}
                        gridCellWidth={LayoutConstants.gridFocusZoneCellWidth}
                        rowMarginCount={LayoutConstants.gridFocusMargin}
                        columnMarginCount={0}
                        gridZoneKey={this.state.gridZoneKey}>

                        {
                            splitGraph ?
                                <GraphList ref={this._resolveRef("_graphListComponent")} {...props} /> :
                                <Graph ref={this._resolveRef("_graphComponent")} {...props} />
                        }

                    </GridFocusZone>
                }
                {
                    customizeCanvas &&
                    <div className="cd-canvas-customization-container">
                        <Slider label="Horizontal margin" min={10} max={500} step={10} defaultValue={LayoutConstants.horizontalMargin} showValue={true} onChange={this._handleHorizontalMarginChange} />
                        <Slider label="Vertical margin" min={10} max={500} step={5} defaultValue={LayoutConstants.verticalMargin} showValue={true} onChange={this._handleVerticalMarginChange} />
                        <Slider label="Core properties width" min={100} max={500} step={10} defaultValue={LayoutConstants.corePropertiesWidth} showValue={true} onChange={this._handleCorePropertiesWidthChange} />
                    </div>
                }

            </div>
        );
    }

    private _isCloneOperationEnabled = (): boolean => {
        return !!this._getSelectedEnvironmentId();
    }

    private _handleOperationOnEnvironment = (operationType: IOperationType) => {
        switch (operationType) {
            case IOperationType.Add:
                this._handleAddEnvironment();
                break;

            case IOperationType.Clone:
                this._handleCloneEnvironment();
                break;

            default:
                break;
        }
    }

    private _handleHorizontalMarginChange = (value: number) => {
        this.setState({ horizontalMargin: value } as IEnvironmentsCanvasState);
    }

    private _handleVerticalMarginChange = (value: number) => {
        this.setState({ verticalMargin: value } as IEnvironmentsCanvasState);
    }

    private _handleCorePropertiesWidthChange = (value: number) => {
        this.setState({ corePropertiesWidth: value } as IEnvironmentsCanvasState);
    }

    private _handleAddEnvironment = (): void => {
        let parentEnvironmentId = this._getSelectedEnvironmentId();
        this._environmentListActionsCreator.createNewEnvironment(
            TemplateConstants.EmptyTemplateGuid,
            parentEnvironmentId,
            true,
            this._handleMoveEnvironment,
            this._isMoveEnvironmentEnabled);

        let isEnvironmentSelected = parentEnvironmentId ? true : false;
        this._publishTelemetry(Feature.AddNewEnvironment, isEnvironmentSelected);
    }

    private _handleCloneEnvironment = (): void => {
        let parentEnvironmentId = this._getSelectedEnvironmentId();
        this._environmentListActionsCreator.cloneEnvironment(
            parentEnvironmentId,
            this._handleMoveEnvironment,
            this._isMoveEnvironmentEnabled);

        let isEnvironmentSelected = parentEnvironmentId ? true : false;
        this._publishTelemetry(Feature.CloneEnvironment, isEnvironmentSelected);
    }

    private _handleMoveEnvironment = (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void): void => {
        if (this._environmentNodeMover) {
            this._environmentNodeMover.move(
                moveDirection,
                this.state.selectedEnvironmentKey,
                this._moveEnvironmentAcrossSingleNode.bind(this),
                this._moveEnvironmentAcrossMultipleNodes.bind(this),
            );

            this._onMoveComplete = onMoveComplete;
        }
    }

    private _moveEnvironmentAcrossMultipleNodes(moveDirection: MoveDirection, sourceNodeList: INodeData[], targetNodeList: INodeData[]): void {

        let targetEnvironment: PipelineDefinitionEnvironment;
        if (moveDirection === MoveDirection.down) {
            // Move down scenario. Move below the last node of node list.
            targetEnvironment = targetNodeList[targetNodeList.length - 1].data as PipelineDefinitionEnvironment;
        }
        else {
            // Move up scenario. Move above the first node of the node list.
            targetEnvironment = targetNodeList[0].data as PipelineDefinitionEnvironment;
        }

        sourceNodeList.forEach((node, index) => {
            const envActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, node.key);
            const newRank = targetEnvironment.rank + this._rankIncrementGenerator.getNextIncrement(moveDirection, index);
            envActionCreator.updateEnvironmentRank({rank : newRank, forceRefresh: true});
        });

        this._rankIncrementGenerator.updateIncrement();

        this._publishMoveTelemetry(moveDirection, sourceNodeList.length, targetNodeList.length);
    }

    private _moveEnvironmentAcrossSingleNode(moveDirection: MoveDirection, selectedNodeKey: string, stagingOrder: INodeData[][]): void {

        if (stagingOrder) {
            const nextSibling = moveDirection === MoveDirection.down;
            const siblingNode = EnvironmentNodeMover.getSiblingNodeInAStage(selectedNodeKey, nextSibling, stagingOrder);
            if (siblingNode) {

                const environment = siblingNode.data as PipelineDefinitionEnvironment;

                // Adjust the rank of the current environment based on the rank of sibling environment. 
                const envActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, selectedNodeKey);

                envActionCreator.updateEnvironmentRank({rank : environment.rank + this._rankIncrementGenerator.getNextIncrement(moveDirection, 0), forceRefresh: true});
                this._rankIncrementGenerator.updateIncrement();

                this._publishMoveTelemetry(moveDirection, 1, 1);
            }
        }
    }

    private _publishMoveTelemetry(moveDirection: MoveDirection, sourceEnvironmentCount: number, targetEnvironmentCount: number): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.moveDirection] = MoveDirection.up ? "up" : "down";
        eventProperties[Properties.sourceEnvironmentCount] = sourceEnvironmentCount;
        eventProperties[Properties.targetEnvironmentCount] = targetEnvironmentCount;

        Telemetry.instance().publishEvent(Feature.MoveEnvironments, eventProperties);
    }

    private _handleItemSelectionChange = (): void => {
        if (this._getSelectedEnvironmentId()) {
            const selectedItem = this._itemSelectionStore.getSelectedItem();
            this.setState({
                selectedEnvironmentKey: selectedItem.getInstanceId()
            } as IEnvironmentsCanvasState);
        }
        else {
            this.setState({
                selectedEnvironmentKey: Utils_String.empty
            } as IEnvironmentsCanvasState);
        }
    }

    private _getSelectedEnvironmentId(): number {
        let selectedItem = this._itemSelectionStore.getSelectedItem();
        if (selectedItem && selectedItem.getInstanceId) {
            let instanceId = selectedItem.getInstanceId();
            return this._environmentListStore.getEnvironmentIdFromInstanceId(instanceId);
        }

        return null;
    }

    private _publishTelemetry(feature: string, isEnvironmentSelected: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.EnvironmentSelected] = isEnvironmentSelected;

        Telemetry.instance().publishEvent(feature, eventProperties, Source.MenuItem);
    }

    private _handleStoreChange = () => {
        let state = this._store.getState() as IEnvironmentsCanvasState;
        state.gridZoneKey = `gridZoneKey${DtcUtils.getUniqueInstanceId()}`;
        this._environmentNodeMover = null;
        this.setState(state);
    }

    private _handleCloneEnvironmentComplete = () => {
        this._setGridZoneKey();
    }

    private _handleAddEnvironmentComplete = () => {
        this._setGridZoneKey();
    }

    private _handleDeleteEnvironmentComplete = () => {
        this._setFocusOnAddEnvMenu = true;
        this._setGridZoneKey();
    }

    private _handleSaveStatusChange = () => {
        // Revert back rank increment to initial value after save since the ranks are anyway re-assigned. 
        if (this._saveStatusStore.hasSaveCompleted()) {
            this._rankIncrementGenerator.resetIncrement();
        }
    }

    private _setGridZoneKey(): void {
        this.setState({ gridZoneKey: `gridZoneKey${DtcUtils.getUniqueInstanceId()}` } as IEnvironmentsCanvasState);
    }

    private _getGraphProps(viewState: IEnvironmentsCanvasState): IGraphProps {
        let nodes: INodeData[] = EnvironmentUtils.getNodes(viewState.environmentsData, this._getNodeElement);
        const verticalMargin = (LayoutConstants.verticalMargin + (2 * LayoutConstants.releaseScheduleTriggerSideLength));

        let nodeWidth = LayoutConstants.nodeWidth;
        if (this.state.corePropertiesWidth) {
            nodeWidth = this.state.corePropertiesWidth + LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth / 2 + LayoutConstants.postDeploymentIndicatorElementRadius;
        }

        return {
            nodeWidth: nodeWidth,
            nodeHeight: LayoutConstants.nodeHeight,
            horizontalMargin: this.state.horizontalMargin || LayoutConstants.horizontalMargin,
            verticalMargin: this.state.verticalMargin || verticalMargin,
            nodes: nodes,
            edges: viewState.environmentConnections,
            selectedNodeKey: viewState.selectedEnvironmentKey,

            // Collect telemetry when a saved definition is loaded. If a new release definition is created,
            // then the telemetry is published when it is loaded again.
            telemetryKey: viewState.releaseDefinitionId > 0 ? viewState.releaseDefinitionId.toString() : null
        };
    }

    private _getNodeElement = (key: string): JSX.Element => {
        let listOfStores = this._environmentListStore.getDataStoreList();
        let environmentNodeProps: IEnvironmentNodeProps = {
            instanceId: key,
            onAddEnvironment: this._handleAddEnvironmentForInstanceId,
            onCloneEnvironment: this._handleCloneEnvironmentForInstanceId,
            onAddEnvironmentComplete: this._handleAddEnvironmentComplete,
            onCloneEnvironmentComplete: this._handleCloneEnvironmentComplete,
            onDeleteEnvironmentComplete: this._handleDeleteEnvironmentComplete,
            onMoveEnvironment: this._handleMoveEnvironment,
            isMoveEnvironmentEnabled: this._isMoveEnvironmentEnabled,
            newEnvironmentInstanceId: this.state.newEnvironmentInstanceId,
            releaseDefinitionFolderPath: this.state.releaseDefinitionFolderPath,
            releaseDefinitionId: this.state.releaseDefinitionId,
            corePropertiesWidth: this.state.corePropertiesWidth
        } as IEnvironmentNodeProps;

        return <EnvironmentNode {...environmentNodeProps} />;
    }

    private _isMoveEnvironmentEnabled = (instanceId: string, moveDirection: MoveDirection): boolean => {
        if (this._environmentNodeMover) {
            const moveEvaluation = this._environmentNodeMover.evaluateMove(instanceId);
            if (moveDirection === MoveDirection.up) {
                return moveEvaluation.canMoveAbove;
            }
            else {
                return moveEvaluation.canMoveBelow;
            }
        }
        else {
            return false;
        }
    }

    private _handleAddEnvironmentForInstanceId = (instanceId: string) => {
        const envId = this._environmentListStore.getEnvironmentIdFromInstanceId(instanceId);
        this._environmentListActionsCreator.createNewEnvironment(
            TemplateConstants.EmptyTemplateGuid,
            envId,
            true,
            this._handleMoveEnvironment,
            this._isMoveEnvironmentEnabled);
    }

    private _handleCloneEnvironmentForInstanceId = (instanceId: string) => {
        const envId = this._environmentListStore.getEnvironmentIdFromInstanceId(instanceId);
        this._environmentListActionsCreator.cloneEnvironment(
            envId,
            this._handleMoveEnvironment,
            this._isMoveEnvironmentEnabled);
    }

    private _onEnvironmentsListStoreChange = () => {
        const shouldShowNoEnvironmentAddButton: boolean = (this._environmentListStore.getDataStoreList().length === 0);
        if (shouldShowNoEnvironmentAddButton !== this.state.showNoEnvironmentAddButton) {
            this.setState({
                showNoEnvironmentAddButton: shouldShowNoEnvironmentAddButton
            });
        }
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._handleAddEnvironment();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _setFocusOnAddEnvMenu: boolean = false;
    private _envMenu: EnvironmentMenu;
    private _store: EnvironmentsCanvasViewStore;
    private _environmentListStore: EnvironmentListStore;
    private _environmentTemplateSelectorContainer: HTMLElement;
    private _environmentListActionsCreator: EnvironmentListActionsCreator;
    private _itemSelectionStore: ItemSelectionStore;
    private _graphComponent: Graph;
    private _graphListComponent: GraphList;
    private _saveStatusStore: SaveStatusStore;
    private _onMoveComplete: () => void;

    private _environmentNodeMover: EnvironmentNodeMover;
    private _rankIncrementGenerator: EnvironmentRankIncrementGenerator = new EnvironmentRankIncrementGenerator();
}
