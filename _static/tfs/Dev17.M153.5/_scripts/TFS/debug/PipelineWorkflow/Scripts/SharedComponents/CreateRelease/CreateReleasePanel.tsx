/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { GraphLayoutHelper } from "DistributedTaskControls/Components/Canvas/GraphLayoutHelper";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";

import { CreateReleaseControllerView } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseControllerView";
import { CreateReleaseEnvironmentNodeConstants } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { CreateReleaseStore } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListStore";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { PipelineRelease, PipelineDefinitionEnvironment, PipelineDefinition, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";

export interface ICreateReleasePanelState {
    showPanel: boolean;
    width: number;
}

export interface ICreateReleasePanelProps<T extends PipelineDefinition | PipelineRelease, P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends ComponentBase.IProps {
    createReleaseStore: CreateReleaseStore<T, P>;
    progressStore: ProgressIndicatorStore;
    environmentListStore: EnvironmentListStore<P>;
    variablesListStore: ProcessVariablesV2Store;
    hasCloseButton?: boolean;
    onClose?: () => void;
    elementToFocusOnDismiss?: HTMLElement;
    minWidth?: number;
    onQueueRelease?: (pipelineRelease: PipelineRelease, projectName?: string) => void;
    startReleaseMode?: boolean;
    buildDefinitionId?: string;
}

/**
 * Renders Create release panel
 */
export class CreateReleasePanel<T extends PipelineDefinition | PipelineRelease, P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends ComponentBase.Component<ICreateReleasePanelProps<T, P>, ICreateReleasePanelState> {

    constructor(props: ICreateReleasePanelProps<T, P>) {
        super(props);
        this.state = {
            showPanel: true,
            width: this._getMinWidth()
        };
        this._columnWidth = CreateReleaseEnvironmentNodeConstants.compactEnvironmentNodeWidth +
            CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMargin;
    }

    public render(): JSX.Element {

        return (
            <PanelComponent
                showPanel={this.state.showPanel}
                panelWidth={this.state.width}
                onClose={this._closePanel}
                onClosed={this._handleOnClosed}
                isBlocking={true}
                hasCloseButton={this.props.hasCloseButton}
                cssClass={"create-release-panel"}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                <CreateReleaseControllerView
                    createReleaseStore={this.props.createReleaseStore}
                    progressStore={this.props.progressStore}
                    environmentListStore={this.props.environmentListStore}
                    variablesListStore={this.props.variablesListStore}
                    onCloseClick={this._closePanel}
                    onQueueRelease={this.props.onQueueRelease}
                    onDidUpdate={this._setPanelWidth}
                    startReleaseMode={this.props.startReleaseMode}
                    buildDefinitionId={this.props.buildDefinitionId}>
                </CreateReleaseControllerView>
            </PanelComponent>);
    }

    private _closePanel = () => {
        if (this.state && this.state.showPanel) {
            this.setState({ showPanel: false });
        }
    }

    private _handleOnClosed = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private _setPanelWidth = (): void => {
        if (this.props.environmentListStore) {
            const edges = this.props.environmentListStore.getEnvironmentConnections();
            const environmentsData = this.props.environmentListStore.getEnvironmentsData();
            const nodes = EnvironmentUtils.getNodes(environmentsData, null);
            const stagingOrderAndDependencies = GraphLayoutHelper.createStagingOrderAndDependencies(nodes, edges);

            if (stagingOrderAndDependencies && stagingOrderAndDependencies.stagingOrder) {
                let numColumns = stagingOrderAndDependencies.stagingOrder.length;
                let columns = numColumns < CreateReleasePanel._maxColumnsToShow ? numColumns : CreateReleasePanel._maxColumnsToShow;
                let width = (columns + 1) * this._columnWidth;

                if (width > document.documentElement.clientWidth - 200) {
                    width = document.documentElement.clientWidth - 200;
                }

                let minWidth: number = this._getMinWidth();
                if (width < minWidth) {
                    width = minWidth;
                }

                this.setState({ width: width });
            }
        }
    }

    private _getMinWidth(): number {
        if (this.props.minWidth) {
            return this.props.minWidth;
        }

        return CreateReleasePanel._defaultMinWidth;
    }

    private _columnWidth: number;

    private static readonly _maxColumnsToShow: number = 10;
    private static readonly _defaultMinWidth: number = 670;
}