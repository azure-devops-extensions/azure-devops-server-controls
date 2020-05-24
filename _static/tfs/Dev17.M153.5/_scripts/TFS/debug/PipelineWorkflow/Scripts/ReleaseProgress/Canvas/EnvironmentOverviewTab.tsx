/// <reference types="react" />

import * as Q from "q";

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { PipelineDefinition, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";
import { CanvasDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CanvasDeploymentActionsProvider";
import { ReleaseEnvironmentNodeViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeViewStore";
import { ReleaseTaskAttachmentView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentView";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import { IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseDefinitionSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseDefinitionSource";
import { ReleaseEnvironmentDeploymentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseEnvironmentDeploymentSource";
import { EnvironmentTimeline } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentTimeline";

import { EnvironmentExecutionPolicy, EnvironmentStatus, ReleaseEnvironment, ReleaseReason, ReleaseStatus } from "ReleaseManagement/Core/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentOverviewTab";

export interface IEnvironmentOverviewProps extends Base.IProps {
    showCommitsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
    showWorkItemsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
}

export interface IEnvironmentOverviewState extends Base.IState {
    environment: ReleaseEnvironment;
    deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>;
    environmentExecutionPolicy: EnvironmentExecutionPolicy;
    nowAtReleaseId?: number;
    nowAtReleaseName?: string;
    nowAtReleaseError?: string;
    isEnvironmentInEndState?: boolean;
}

export class EnvironmentOverviewTab extends Base.Component<IEnvironmentOverviewProps, IEnvironmentOverviewState> {

    constructor(props: IEnvironmentOverviewProps) {
        super(props);
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseEnvironmentNodeStore = StoreManager.GetStore<ReleaseEnvironmentNodeViewStore>(ReleaseEnvironmentNodeViewStore, this.props.instanceId);
        this._releaseEnvironmentActionsStore = StoreManager.GetStore(ReleaseEnvironmentActionsStore, this.props.instanceId);

        const release = this._releaseStore.getRelease();
        if (release) {
            this._releaseReason = release.reason;
        }

        this.state = this._getState();

        this._releaseEnvironmentNodeStore.addChangedListener(this._onChange);
    }

    public componentDidMount(): void {
        this._mounted = true;

        if (this.state.environment && this.state.environment.releaseDefinition && this.state.environment.releaseDefinition.id) {
            ReleaseDefinitionSource.instance().getReleaseDefinition(this.state.environment.releaseDefinition.id).then((definition: PipelineDefinition) => {
                if (definition.environments && definition.environments.length > 0) {
                    const environment = definition.environments.find(x => x.id === this.state.environment.definitionEnvironmentId);
                    if (environment && this._mounted) {
                        this.setState({ environmentExecutionPolicy: environment.executionPolicy });
                    }
                }
            });
        }

        this._initializeNowAtData(this.state.environment);
    }

    public shouldComponentUpdate(nextProps: IEnvironmentOverviewProps, nextState: IEnvironmentOverviewState) {
        if (!this.state.isEnvironmentInEndState && nextState.isEnvironmentInEndState) {
            this._initializeNowAtData(nextState.environment);
        }

        return true;
    }

    public componentWillUnmount(): void {
        this._mounted = false;
        this._releaseEnvironmentNodeStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div className="environment-overview">
                <EnvironmentTimeline
                    instanceId={this.props.instanceId}
                    environment={this.state.environment}
                    artifacts={this._releaseStore.getArtifacts()}
                    deploymentActionsMap={this.state.deploymentActionsMap}
                    environmentExecutionPolicy={this.state.environmentExecutionPolicy}
                    releaseReason={this._releaseReason}
                    showCommitsDelegate={this.props.showCommitsDelegate}
                    showWorkItemsDelegate={this.props.showWorkItemsDelegate}
                    releaseId={this._releaseStore.getReleaseId()}
                    releaseDefinitionId={this._releaseStore.getReleaseDefinitionId()}
                    nowAtReleaseId={this.state.nowAtReleaseId}
                    nowAtReleaseName={this.state.nowAtReleaseName}
                    nowAtReleaseError={this.state.nowAtReleaseError}
                    isEnvironmentInEndState={this.state.isEnvironmentInEndState}
                />

                {!this._isDraftRelease() &&
                    <ReleaseTaskAttachmentView
                        instanceId={this.props.instanceId}
                        releaseId={this._releaseStore.getReleaseId()} />
                }
            </div>
        );
    }

    private _onChange = () => {
        this.setState(this._getState());
    }

    private _getState(): IEnvironmentOverviewState {

        const environment = this._releaseEnvironmentNodeStore.getEnvironment();
        const actionHandlerProvider = new CanvasDeploymentActionsProvider();
        let actions = this._releaseEnvironmentActionsStore.getAllActions();

        let deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo> = {};
        for (let action of actions) {
            action.onExecute = actionHandlerProvider.getActionHandler(action);
            deploymentActionsMap[action.action] = action;
        }

        return ({
            environment: environment,
            deploymentActionsMap: deploymentActionsMap,
            environmentExecutionPolicy: this.state.environmentExecutionPolicy,
            nowAtReleaseId: this.state.nowAtReleaseId,
            nowAtReleaseName: this.state.nowAtReleaseName,
            nowAtReleaseError: this.state.nowAtReleaseError,
            isEnvironmentInEndState: this._isEnvironmentInEndState(environment)
        });
    }

    private _isDraftRelease(): boolean {
        return this._releaseStore.getRelease().status === ReleaseStatus.Draft;
    }

    private _initializeNowAtData(environment: ReleaseEnvironment): void {
        if (environment) {
            ReleaseEnvironmentDeploymentSource.instance().getLatestReleaseToCompareForAllEnvironments(this._releaseStore.getReleaseDefinitionId(), [environment.definitionEnvironmentId], this._releaseStore.getReleaseId())
                .then((deployments: {
                    [id: string]: ReleaseDeployment;
                }) => {
                    if (!this._mounted) {
                        return;
                    }
                    if (deployments) {
                        if (deployments[environment.definitionEnvironmentId]) {
                            let deployment = deployments[environment.definitionEnvironmentId];
                            if (deployment && deployment.release) {
                                this.setState({ nowAtReleaseId: deployment.release.id, nowAtReleaseName: deployment.release.name, nowAtReleaseError: null });
                                return;
                            }
                        }
                    }
                    this.setState({ nowAtReleaseId: 0, nowAtReleaseName: null, nowAtReleaseError: null });
                }, (error: any) => {
                    if (this._mounted) {
                        this.setState({ nowAtReleaseError: error });
                    }
                    return Q.reject(error);
                });
        }
    }

    private _isEnvironmentInEndState(environment: ReleaseEnvironment): boolean {
        if (environment && environment.status) {
            const status = environment.status;
            if (status === EnvironmentStatus.InProgress || status === EnvironmentStatus.Queued) {
                return false;
            }
        }

        return true;
    }

    private _releaseStore: ReleaseStore;
    private _releaseEnvironmentNodeStore: ReleaseEnvironmentNodeViewStore;
    private _releaseEnvironmentActionsStore: ReleaseEnvironmentActionsStore;
    private _releaseReason: ReleaseReason = ReleaseReason.None;
    private _mounted: boolean;
}