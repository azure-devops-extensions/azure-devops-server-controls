
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

import {
    ActionClickTarget,
    IReleaseEnvironmentActionInfo,
    ReleaseEnvironmentAction,
    ReleaseIndicatorType
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import {IDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { DeploymentCancelActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActionCreator";
import { EnvironmentDeployItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployItem";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { ReleaseManualInterventionItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionItem";
import { ReleasePreDeploymentItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePreDeploymentItem";
import { ReleasePostDeploymentItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePostDeploymentItem";
import { ReleaseConditionDetailsViewSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ManualInterventionHelper } from "PipelineWorkflow/Scripts/Shared/ReleaseEnvironment/ManualInterventionHelper";


export class CanvasDeploymentActionsProvider implements IDeploymentActionsProvider{

    public getActionHandler(actionInfo: IReleaseEnvironmentActionInfo) {

        let handler = null;
        switch (actionInfo.action) {
            case ReleaseEnvironmentAction.Cancel:
                {
                   handler = (environmentId: string, actionClickTarget: ActionClickTarget) => {
                        this._publishButtonClickTelemetry(actionInfo.actionText, environmentId, actionClickTarget, actionInfo);
                        let cancelActionCreator = ActionCreatorManager.GetActionCreator<DeploymentCancelActionCreator>(
                            DeploymentCancelActionCreator, environmentId);
                        cancelActionCreator.showDialog();
                    };
                    break;
                }
            case ReleaseEnvironmentAction.Deploy:
            case ReleaseEnvironmentAction.Redeploy:
            case ReleaseEnvironmentAction.ManualIntervention:
                {
                    handler = (environmentId: string, actionClickTarget: ActionClickTarget, environmentName: string, eventTarget: HTMLElement) => {
                        this._publishButtonClickTelemetry(actionInfo.actionText, environmentId, actionClickTarget, actionInfo);
                        this._showActionItemOverlay(actionInfo, environmentId, eventTarget);
                    };
                    break;
                }
            case ReleaseEnvironmentAction.PreDeployApprove:
            case ReleaseEnvironmentAction.PostDeployApprove:
                {
                    handler = (environmentId: string,  actionClickTarget: ActionClickTarget, environmentName: string) => {
                        this._publishButtonClickTelemetry(actionInfo.actionText, environmentId, actionClickTarget, actionInfo);
                        this._actionForPrePostDeployCondition(actionInfo.action, environmentId, environmentName);
                    };
                    break;
                }
            case ReleaseEnvironmentAction.PreDeployGate:
            case ReleaseEnvironmentAction.PostDeployGate:
            {
                handler = (environmentId: string,  actionClickTarget: ActionClickTarget, environmentName: string) => {
                    this._publishButtonClickTelemetry(actionInfo.actionText, environmentId, actionClickTarget, actionInfo);
                    this._actionForPrePostDeployCondition(actionInfo.action, environmentId, environmentName);
                };
                break;
            }
            case ReleaseEnvironmentAction.ViewLogs:
                {
                    handler = (environmentId: string, actionClickTarget: ActionClickTarget) => {
                        this._publishButtonClickTelemetry(actionInfo.actionText, environmentId, actionClickTarget, actionInfo);
                        ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId });
                    };
                    break;
                }
            default: {
                break;
            }
        }
        return handler;
    }

    protected _publishButtonClickTelemetry(actionText: string, environmentId: string, actionClickTarget: ActionClickTarget, actionInfo: IReleaseEnvironmentActionInfo) {
        let feature: string = Feature.EnvironmentAction;
        let eventProperties: IDictionaryStringTo<any> = {};

        let releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, environmentId.toString());
        let environment: RMContracts.ReleaseEnvironment = releaseEnvironmentStore.getEnvironment();

        if (environment) {
            eventProperties[Properties.ReleaseId] = environment.releaseId;
            eventProperties[Properties.ReleaseDefinitionId] = environment.releaseDefinition.id;
            eventProperties[Properties.EnvironmentId] = environmentId;
            eventProperties[Properties.EnvironmentDefinitionId] = environment.definitionEnvironmentId;
            eventProperties[Properties.ActionName] = actionText;
            eventProperties[Properties.EnvironmentStatus] = environment.status;
            eventProperties[Properties.actionClickTarget] = actionClickTarget;
            eventProperties[Properties.isUserHavingPermissions] = actionInfo.isPermissible;
        }    
        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    protected _showActionItemOverlay(actionInfo: IReleaseEnvironmentActionInfo, environmentId: string, eventTarget: HTMLElement): void {
        let item = null;
        this._currentActionTarget = eventTarget;

        switch (actionInfo.action) {
            case ReleaseEnvironmentAction.Deploy:
            case ReleaseEnvironmentAction.Redeploy:
                item = new EnvironmentDeployItem(environmentId);
                break;

            case ReleaseEnvironmentAction.ManualIntervention:
                let releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, environmentId.toString());
                let environment: RMContracts.ReleaseEnvironment = releaseEnvironmentStore.getEnvironment();
                const pendingMi = ManualInterventionHelper.getPendingManualInterventionInEnvironment(environment);
                if (pendingMi && pendingMi.id && pendingMi.releaseEnvironment && pendingMi.releaseEnvironment.id) {
                    item = new ReleaseManualInterventionItem(pendingMi.id.toString(), pendingMi.releaseEnvironment.id, pendingMi.releaseEnvironment.name, actionInfo.isPermissible);
                }
                break;
        }

        if (item) {
            if (eventTarget){
                item.onHideDetails = this._onHideDetails;
            }
            this._selectItem(item);
        }
    }

    private _onHideDetails = (): void => {
        if (this._currentActionTarget) {
            this._currentActionTarget.focus();
        }
    }

    protected _actionForPrePostDeployCondition(action: ReleaseEnvironmentAction, instanceId: string, environmentName: string) {
        let item = null;

        if (action === ReleaseEnvironmentAction.PreDeployApprove || action === ReleaseEnvironmentAction.PreDeployGate) {
            //  This means open pre deploy conditions panel
            item = new ReleasePreDeploymentItem({
                environmentName: environmentName,
                instanceId: instanceId,
                sourceLocation: ReleaseConditionDetailsViewSource.EnvironmentLink,
                initialSelectedPivot: action === ReleaseEnvironmentAction.PreDeployApprove ? ReleaseIndicatorType.Approval : ReleaseIndicatorType.Gate
            });
        }
        else {
            //  Open post deploy conditions panel
            item = new ReleasePostDeploymentItem({
                environmentName: environmentName,
                instanceId: instanceId,
                sourceLocation: ReleaseConditionDetailsViewSource.EnvironmentLink,
                initialSelectedPivot: action === ReleaseEnvironmentAction.PostDeployApprove ? ReleaseIndicatorType.Approval : ReleaseIndicatorType.Gate
            });
        }

        this._selectItem(item);
    }

    private _selectItem(item) {
        let overlayPanelActions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActions.showOverlay.invoke(null);

        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        itemSelectorActions.selectItem.invoke({
            data: item
        });

        overlayPanelActions.setFocusOnCloseButton.invoke(null);
    }

    private _currentActionTarget: HTMLElement = null;
}
