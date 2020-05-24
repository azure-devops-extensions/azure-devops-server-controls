/// <reference types="react" />

import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { CanvasDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CanvasDeploymentActionsProvider";
import { ActionClickTarget, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentNodeActionsCommandBar, IReleaseEnvironmentNodeActionsCommandBarProps, IAction } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeActionsCommandBar";
import { DeploymentCancel } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancel";

import {
    ReleaseEnvironmentActionsStore,
    IReleaseEnvironmentActionsState
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeActions";

export interface IReleaseEnvironmentNodeActionsProps extends Base.IProps {
    environmentName: string;
    onDeploymentCancelCompleted: () => void;
    hideEnvironmentActions?: boolean;
}

export class ReleaseEnvironmentNodeActions extends Base.Component<IReleaseEnvironmentNodeActionsProps, IReleaseEnvironmentActionsState> {
    constructor(props: IReleaseEnvironmentNodeActionsProps) {
        super(props);
        this._actionHandlerProvider = new CanvasDeploymentActionsProvider();
    }

    public componentWillMount() {
        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    protected getViewStore() {
        return StoreManager.GetStore<ReleaseEnvironmentActionsStore>(ReleaseEnvironmentActionsStore, this.props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <div>
                {
                    !this.props.hideEnvironmentActions &&
                    <div className="action-buttons">
                        {<ReleaseEnvironmentNodeActionsCommandBar  {...this._getEnvironmentNodeActionProps()} />}
                    </div>
                }
                <div className="action-components">
                    <DeploymentCancel onDeploymentCancelCompleted={this.props.onDeploymentCancelCompleted} instanceId={this.props.instanceId} />
                </div>
            </div>
        );
    }

    private _getEnvironmentNodeActionProps(): IReleaseEnvironmentNodeActionsCommandBarProps {
        let props: IReleaseEnvironmentNodeActionsCommandBarProps = {
            actions: this.state.actions,
            instanceId: this.props.instanceId,
            showIconButtons: false
        };
        let logsButtonLargeSize: boolean = true;
        let isImportantActionAvaliable: boolean = false;
        let visibleActionsCount: number = props.actions.length;
        props.actions.map((action, index) => {
            if (action.isVisible) {
                switch (action.action) {
                    case ReleaseEnvironmentAction.Redeploy:
                        logsButtonLargeSize = false;
                    case ReleaseEnvironmentAction.PreDeployApprove:
                    case ReleaseEnvironmentAction.PostDeployApprove:
                    case ReleaseEnvironmentAction.ManualIntervention:
                    case ReleaseEnvironmentAction.Deploy:
                        if (!isImportantActionAvaliable && action.isImportant) {
                            isImportantActionAvaliable = true;
                        }
                    case ReleaseEnvironmentAction.Cancel: {
                        action.isHidden = false;
                        break;
                    }
                    case ReleaseEnvironmentAction.ViewLogs: {
                        action.largeSize = logsButtonLargeSize;
                        action.isHidden = false;
                        break;
                    }
                    default: {
                        action.isHidden = true;
                        break;
                    }
                }
                action.onClick = () => { this._onClick(action); };
                if (!action.onExecute) {
                    action.onExecute = this._actionHandlerProvider.getActionHandler(action);
                }
            }
            else {
                visibleActionsCount = visibleActionsCount - 1;
                action.render = this._emptyButton.bind(action, index);
                return;
            }
        });

        if (visibleActionsCount > 2) {
            props.showIconButtons = true;
        }

        props.isImportantActionAvaiable = isImportantActionAvaliable;

        return props;
    }

    private _onClick(action: IAction): void {
        if (action.onExecute) {
            return action.onExecute(this.props.instanceId, ActionClickTarget.actionButton, this.props.environmentName);
        }
    }

    @autobind
    private _emptyButton(index: number, action: IAction): JSX.Element {
        return null;
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _viewStore: ReleaseEnvironmentActionsStore;
    private _actionHandlerProvider: CanvasDeploymentActionsProvider;
}