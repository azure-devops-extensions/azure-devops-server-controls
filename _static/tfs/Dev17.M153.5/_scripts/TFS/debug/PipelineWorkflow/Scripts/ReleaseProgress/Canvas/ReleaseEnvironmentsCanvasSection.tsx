/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { LayoutConstants, ReleaseEnvironmentSummaryCanvasConstants, ReleaseProgressCanvasConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ReleaseEnvironmentNode } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNode";
import { ReleaseEnvironmentSummaryNode } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentSummaryNode";
import { ReleaseEnvironmentsCanvas, IReleaseEnvironmentsCanvasProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentsCanvas";
import { ReleaseProgressCanvasTabActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTabActionCreator";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { CreateReleaseEnvironmentNodeConstants } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import { IconButton } from "OfficeFabric/Button";
import { FocusZone } from "OfficeFabric/FocusZone";
import { autobind, css } from "OfficeFabric/Utilities";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export interface IReleaseEnvironmentsCanvasSectionProps extends Base.IProps {
    isEditMode: boolean;
    isSummaryView: boolean;
    forceRefresh: boolean;
}

export class ReleaseEnvironmentsCanvasSection extends Base.Component<IReleaseEnvironmentsCanvasSectionProps, Base.IState>{

    render() {
        const showSummaryView = !this.props.isEditMode && this.props.isSummaryView;
        const headerMenu = this._getHeaderMenu();
        const canvasClassNames = css("cd-environment-canvas-container", "release-environments-canvas-container",
            { "menu-not-visible": !headerMenu });

        let canvasProps: IReleaseEnvironmentsCanvasProps = {
            instanceId: this.props.instanceId,
            cssClass: canvasClassNames,
            label: Resources.EnvironmentsText,
            isEditMode: this.props.isEditMode,
            headerMenu: headerMenu,
            forceRefresh: this.props.forceRefresh
        } as IReleaseEnvironmentsCanvasProps;

        if (showSummaryView) {
            canvasProps = {
                ...canvasProps,
                nodeHeight: ReleasesViewCanvasConstants.EnvironmentNodeHeight,
                nodeWidth: ReleaseEnvironmentSummaryCanvasConstants.nodeWidth,
                gridCellHeight: CreateReleaseEnvironmentNodeConstants.gridCellHeight,
                gridCellWidth: CreateReleaseEnvironmentNodeConstants.gridCellWidth,
                verticalMargin: ReleaseEnvironmentSummaryCanvasConstants.verticalMargin,
                horizontalMargin: CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMargin,
                leftMargin: CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasLeftMargin,
                getNodeElement: this._getSummaryNodeElement,
                getNodeHeightHint: this._getSummaryNodeHeightHint
            };
        } else {
            canvasProps = {
                ...canvasProps,
                horizontalMargin: ReleaseProgressCanvasConstants.horizontalMargin,
                verticalMargin: ReleaseProgressCanvasConstants.verticalMargin,
                nodeHeight: LayoutConstants.releaseCorePropertiesHeight,
                getNodeElement: this._getDefaultNodeElement,
                getNodeHeightHint: this._getDefaultNodeHeightHint
            };
        }

        return <ReleaseEnvironmentsCanvas {...canvasProps} />;
    }

    private _getDefaultNodeElement = (key: string, isEditMode: boolean, data: any): JSX.Element => {
        return <ReleaseEnvironmentNode
            instanceId={key}
            isEditMode={isEditMode} />;
    }

    private _getDefaultNodeHeightHint = (environmentInstanceId: string) => {
        const numberOfContributions = ReleaseEnvironmentCanvasViewUtils.getVisibleContributionsCount(environmentInstanceId);
        const nodeHeightHint = ReleaseEnvironmentCanvasViewUtils.getNodeHeightHint(environmentInstanceId);
        return ((numberOfContributions * ReleaseEnvironmentsCanvasSection.EXTENSION_MAX_HEIGHT) + nodeHeightHint);
    }

    private _getSummaryNodeElement = (key: string, isEditMode: boolean, releaseEnvironment: ReleaseEnvironment): JSX.Element => {
        return <ReleaseEnvironmentSummaryNode instanceId={key} isEditMode={isEditMode} releaseEnvironment={releaseEnvironment} />;
    }

    private _getSummaryNodeHeightHint = (environmentInstanceId: string) => {
        return 0;
    }

    private _getHeaderMenu = (): JSX.Element => {
        const isFeatureEnabled = FeatureFlagUtils.isShowReleaseProgressCanvasZoomOptionsEnabled();
        const isHeaderMenuVisible = !this.props.isEditMode && isFeatureEnabled;

        if (isHeaderMenuVisible) {
            return <FocusZone>
                <div className="cd-release-environments-canvas-view-buttons">
                    <IconButton
                        iconProps={{ iconName: "ZoomIn" }}
                        className={css("cd-release-environment-menu-icon-button", { "selected": !this.props.isSummaryView })}
                        onClick={this._setZoomInView}
                        title={Resources.ZoomInEnvironments}
                        ariaLabel={Resources.ZoomInEnvironments}
                        disabled={!this.props.isSummaryView}
                    />
                    <IconButton
                        iconProps={{ iconName: "ZoomOut" }}
                        className={css("cd-release-environment-menu-icon-button", { "selected": !!this.props.isSummaryView })}
                        onClick={this._setZoomOutView}
                        title={Resources.ZoomOutEnvironments}
                        ariaLabel={Resources.ZoomOutEnvironments}
                        disabled={!!this.props.isSummaryView}
                    />
                </div>
            </FocusZone>;
        } else {
            return null;
        }
    }

    @autobind
    private _setZoomOutView(): void {
        this._changeCanvasSize(true);
    }

    @autobind
    private _setZoomInView(): void {
        this._changeCanvasSize(false);
    }

    private _changeCanvasSize(showSummaryView: boolean): void {
        if (this.props.isSummaryView !== showSummaryView) {
            const actionCreator = ActionCreatorManager.GetActionCreator<ReleaseProgressCanvasTabActionCreator>(ReleaseProgressCanvasTabActionCreator);
            actionCreator.showEnvironmentsSummaryView(showSummaryView);
        }
    }

    private static readonly EXTENSION_MAX_HEIGHT: number = 30;
}