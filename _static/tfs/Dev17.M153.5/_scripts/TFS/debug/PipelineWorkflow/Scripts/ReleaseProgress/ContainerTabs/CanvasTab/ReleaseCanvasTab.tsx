import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { InputControlShortKeys } from "DistributedTaskControls/Common/ShortKeys";
import { Edge } from "DistributedTaskControls/Components/Canvas/Edge";
import { OverlayPanelComponent } from "DistributedTaskControls/Components/OverlayPanelComponent";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentsCanvasSection } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentsCanvasSection";
import { ReleaseProgressCanvasTabStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTabStore";
import { ReleasePropertiesCanvas } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePropertiesCanvas";
import { ReleaseSummaryLayoutConstants, ReleaseEnvironmentSummaryCanvasConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { autobind } from "OfficeFabric/Utilities";

import * as KeyboardShortcuts_LAZY_LOAD from "VSS/Controls/KeyboardShortcuts";
import * as VSS from "VSS/VSS";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/CanvasTab/ReleaseCanvasTab";

export interface IReleaseCanvasTabProps extends Base.IProps {
    isEditMode?: boolean;
}

export interface IReleaseCanvasTabState extends Base.IState {
    showEnvironmentsSummaryView: boolean;
    forceRefresh: boolean;
}

export class ReleaseCanvasTab extends Base.Component<IReleaseCanvasTabProps, IReleaseCanvasTabState> {

    constructor(props) {
        super(props);
        this._canvasTabStore = StoreManager.GetStore<ReleaseProgressCanvasTabStore>(ReleaseProgressCanvasTabStore);
        this._canvasTabStore.addChangedListener(this._handleCanvasTabStoreChange);
        const storeState = this._canvasTabStore.getState();
        this.state = {
            showEnvironmentsSummaryView: storeState && storeState.showEnvironmentsSummaryView,
            forceRefresh: false
        };
    }

    public static getDerivedStateFromProps(nextProps, prevState) {
        // set forceRefresh false to do not reset grid navigation for updates other than canvas view mode change(handled in store listener)
        return {
            forceRefresh: false
        };
    }

    public componentDidMount(): void {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            const keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();
            keyboardShortcutManager.registerShortcut(
                DTCResources.EditorShortKeyGroup,
                InputControlShortKeys.MasterDetailsToggleShortKey,
                {
                    description: Resources.ToggleBetweenOverviewAndDetails,
                    action: () => { },
                    element: document.body,
                    allowPropagation: true // allowing propagation since these are dummy actions
                });
        });
    }

    public componentWillUnmount(): void {
        this._canvasTabStore.removeChangedListener(this._handleCanvasTabStoreChange);
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            const keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();
            keyboardShortcutManager.unRegisterShortcut(
                DTCResources.EditorShortKeyGroup,
                InputControlShortKeys.MasterDetailsToggleShortKey
            );
        });
    }

    public render(): JSX.Element {
        const verticalMarginForJoiningEdge = (this.state.showEnvironmentsSummaryView && !this.props.isEditMode) ? ReleaseEnvironmentSummaryCanvasConstants.verticalMarginOfEdgeJoiningReleaseAndEnvironmentPanel :
            ReleaseSummaryLayoutConstants.verticalMarginOfEdgeJoiningReleaseAndEnvironmentPanel;

        return (
            <div className="cd-canvas-tab-content">
                <div className="cd-overlay-panel-parent">
                    <OverlayPanelComponent
                        instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                        isRightPaneScrollable={true}
                        leftPaneARIARegionRoleLabel={Resources.ReleaseCanvasLeftPane}
                        rightPaneARIARegionRoleLabel={Resources.ReleaseCanvasRightPane}
                        detailsPanelInitialWidth={this.c_detailsPanelInitialWidth}>

                        <div className="cd-canvas-container">

                            <ReleasePropertiesCanvas cssClass="release-properties-canvas-container" isEditMode={this.props.isEditMode} />

                            <div className="cd-canvas-sections-separator" >
                                <svg className="cd-svg-separator-surface" width={ReleaseSummaryLayoutConstants.gapBetweenReleaseAndEnvironmentPanel + "px"} focusable="false">
                                    <Edge
                                        from={{ x: 0, y: verticalMarginForJoiningEdge }}
                                        to={{ x: ReleaseSummaryLayoutConstants.gapBetweenReleaseAndEnvironmentPanel, y: verticalMarginForJoiningEdge }} />
                                </svg>
                            </div>

                            <ReleaseEnvironmentsCanvasSection
                                forceRefresh={this.state.forceRefresh}
                                isSummaryView={this.state.showEnvironmentsSummaryView}
                                isEditMode={this.props.isEditMode} />
                        </div>

                    </OverlayPanelComponent>
                </div>
            </div>
        );
    }


    @autobind
    private _handleCanvasTabStoreChange(): void {
        let storeState = this._canvasTabStore.getState();
        // set forceRefresh true to reset grid navigation only when we change canvas view
        this.setState({
            showEnvironmentsSummaryView: storeState.showEnvironmentsSummaryView,
            forceRefresh: (this.state.showEnvironmentsSummaryView !== storeState.showEnvironmentsSummaryView)
        });
    }

    private c_detailsPanelInitialWidth: number = 850;
    private _canvasTabStore: ReleaseProgressCanvasTabStore;
}
