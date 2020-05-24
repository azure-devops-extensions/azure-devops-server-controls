
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import {
    ActionClickTarget,
    IReleaseEnvironmentActionInfo,
    ReleaseEnvironmentAction
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { IDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { DeployEnvironmentPanel } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentPanel";
import { DeploymentCancelActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActionCreator";
import { DeploymentAttemptActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptActionCreator";


export class ProgressHubDeploymentActionsProvider implements IDeploymentActionsProvider {

    public getActionHandler(actionInfo: IReleaseEnvironmentActionInfo) {
        let handler = null;
        switch (actionInfo.action) {
            case ReleaseEnvironmentAction.Cancel:
                {
                    handler = (environmentId: string, actionClickTarget: ActionClickTarget) => {
                        let cancelActionCreator = ActionCreatorManager.GetActionCreator<DeploymentCancelActionCreator>(
                            DeploymentCancelActionCreator, environmentId);
                        cancelActionCreator.showDialog();
                    };
                    break;
                }
            case ReleaseEnvironmentAction.Deploy:
            case ReleaseEnvironmentAction.Redeploy:
                {
                    handler = (environmentId: string, actionClickTarget: ActionClickTarget) => {
                        let resetLogsOnClose = () => {
                            const deploymentAttemptActionCreator = ActionCreatorManager.GetActionCreator<DeploymentAttemptActionCreator>(DeploymentAttemptActionCreator, environmentId);
                            deploymentAttemptActionCreator.resetSelectedAttempt();
                        };
                        DeployEnvironmentPanel.openDeployPanel(environmentId, null, resetLogsOnClose);
                    };
                    break;
                }

            default: {
                break;
            }
        }
        return handler;
    }
}