/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { OverlayPanelComponent } from "DistributedTaskControls/Components/OverlayPanelComponent";
import { Edge } from "DistributedTaskControls/Components/Canvas/Edge";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlShortKeys } from "DistributedTaskControls/Common/ShortKeys";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentsCanvas } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentsCanvas";
import { ArtifactsCanvas } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactsCanvas";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as KeyboardShortcuts_LAZY_LOAD from "VSS/Controls/KeyboardShortcuts";
import { format } from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { ISliderProps, Slider } from "OfficeFabric/Slider";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/CanvasTab/CanvasTab";

export interface ICanvasTabState extends ContainerTabBase.IContainerTabBaseState {
    showNoEnvironmentErrorMessageBar: boolean;
    scale?: number;
}

export class CanvasTab extends Base.Component<ContainerTabBase.IContainerTabBaseProps, ICanvasTabState> {

    constructor(props: ContainerTabBase.IContainerTabBaseProps){
        super(props);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this.state = {
            showNoEnvironmentErrorMessageBar: false,
            scale: 1
        };
    }

    public componentWillMount(): void {
        this._environmentListStore.addChangedListener(this._onChange);
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
        this._environmentListStore.removeChangedListener(this._onChange);
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            const keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();
            keyboardShortcutManager.unRegisterShortcut(
                DTCResources.EditorShortKeyGroup,
                InputControlShortKeys.MasterDetailsToggleShortKey
            );
        });
    }

    public render(): JSX.Element {
        const noEnvironmentMessageBar = (
            <MessageBar
                className="no-environment-infobar"
                messageBarType={MessageBarType.info} >
                {Resources.NoEnvironmentsPipelineTabText}
            </MessageBar>);

        // Point fix for port to releases branch.
        const overlayPanelParentStyle = {
            top: this.state.showNoEnvironmentErrorMessageBar ? 48 : 0
        };

        const zoomCanvas = NavigationStateUtils.canZoomCanvas();
        let containerStyle: React.CSSProperties;
        if (zoomCanvas) {
            containerStyle = {
                transform: format("scale({0},{0})", this.state.scale),
                transformOrigin: "top left",
                marginTop: 90
            };
        }

        return (
            <div className="cd-canvas-tab-content">
                {this.state.showNoEnvironmentErrorMessageBar && noEnvironmentMessageBar}
                <div className="cd-overlay-panel-parent" style={overlayPanelParentStyle} >
                    <OverlayPanelComponent
                        instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                        leftPaneARIARegionRoleLabel={Resources.PipelineEditorLeftPane}
                        rightPaneARIARegionRoleLabel={Resources.PipelineEditorRightPane}>

                        {
                            zoomCanvas &&
                            <div className="cd-canvas-zoom-slider">
                                <Slider label="Zoom" min={5} max={20} step={1} defaultValue={10} showValue={false} onChange={this._handleZoomChange} />
                            </div>
                        }

                        <div className="cd-canvas-container" style={containerStyle}>

                            <ArtifactsCanvas cssClass="cd-artifacts-canvas-container" />
                            <div className="cd-canvas-sections-separator">
                                <svg className="cd-svg-separator-surface" width={LayoutConstants.gapBetweenArtifactAndEnvironmentPanel + "px"} focusable="false">
                                    <Edge
                                        from={{ x: 0, y: LayoutConstants.verticalMarginOfEdgeJoiningArtifactAndEnvironmentPanel }}
                                        to={{ x: LayoutConstants.gapBetweenArtifactAndEnvironmentPanel, y: LayoutConstants.verticalMarginOfEdgeJoiningArtifactAndEnvironmentPanel }} />
                                </svg>
                            </div>
                            <EnvironmentsCanvas cssClass="cd-environment-canvas-container" />
                        </div>
                    </OverlayPanelComponent>
                </div>
            </div>
        );
    }

    private _handleZoomChange = (value: number) => {
        this.setState({
            scale: value / 10
        } as ICanvasTabState);
    }

    private _onChange = () => {
        const shouldShowNoEnvironmentErrorMessageBar: boolean = (this._environmentListStore.getDataStoreList().length === 0);
        if (this.state.showNoEnvironmentErrorMessageBar !== shouldShowNoEnvironmentErrorMessageBar) {
            this.setState({
                showNoEnvironmentErrorMessageBar: shouldShowNoEnvironmentErrorMessageBar
            });
        }
    }

    private _environmentListStore: EnvironmentListStore;

}
