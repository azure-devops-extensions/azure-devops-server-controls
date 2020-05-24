import * as React from "react";

import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import {
    DeployMultipleEnvironmentsPanelItem,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsPanelItem";
import {
    ApproveMultipleEnvironmentsPanelItem,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelItem";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    ActionClickTarget,
    IReleaseEnvironmentActionInfo,
    ReleaseEnvironmentAction,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { autobind } from "OfficeFabric/Utilities";

export class EnvironmentActionsHelper {

    public static isEnvironment(id: number): boolean {
        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        let isEnvironment = false;

        for (const environment of releaseStore.getRelease().environments){
            if (environment.id === id){
                isEnvironment = true;
                break;
            }
        }
        return isEnvironment;

    }

    public static isDeployActionPresent(): boolean {
        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        let isDeployPossible = false;

        for (let environment of releaseStore.getRelease().environments){
            let actionsStore = StoreManager.GetStore<ReleaseEnvironmentActionsStore>(
                ReleaseEnvironmentActionsStore,
                environment.id.toString()
            );
            if (actionsStore.isActionPermissible([ReleaseEnvironmentAction.Deploy, ReleaseEnvironmentAction.Redeploy])){
                return true;
            }
        }
        return isDeployPossible;

    }

    public static isApproveActionPresent(): boolean {
        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        let isApprovePossible = false;

        for (let environment of releaseStore.getRelease().environments){
            let actionsStore = StoreManager.GetStore<ReleaseEnvironmentActionsStore>(
                ReleaseEnvironmentActionsStore,
                environment.id.toString()
            );
            if (actionsStore.isActionPermissible([ReleaseEnvironmentAction.PreDeployApprove, ReleaseEnvironmentAction.PostDeployApprove])){
                return true;
            }
        }
        return isApprovePossible;

    }

    public getActions(
        selectedEnvironmentId: string,
        actions: IReleaseEnvironmentActionInfo[],
        instanceId: string,
        allowMultipleEnvironmentActions: boolean,
        isDeployPermissible: boolean,
        isApprovePermissible: boolean): IPivotBarAction[] {
        this._instanceId = instanceId;
        let items: IPivotBarAction[] = [];
        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);

        items.push(this._getDeployMenu(selectedEnvironmentId, actions, instanceId, isDeployPermissible, allowMultipleEnvironmentActions));
        items.push(this._getCancelAction(selectedEnvironmentId, actions));
        if (isApprovePermissible && allowMultipleEnvironmentActions) {
            items.push(this._getMultipleApprovalAction(selectedEnvironmentId, actions, instanceId, isApprovePermissible));
        }
        return items;
    }

    private _getMultipleApprovalAction(selectedEnvironmentId: string, actions: IReleaseEnvironmentActionInfo[], instanceId: string, isApprovePermissible: boolean): IPivotBarAction {
        return {
            key: "approval-menu",
            name: Resources.ApproveMultiple,
            iconProps: { iconName: "Contact" },
            important: true,
            disabled: !isApprovePermissible,
            onClick: this._openApprovalPanel
        } as IPivotBarAction;
    }

    private _getDeployMenu(selectedEnvironmentId: string, actions: IReleaseEnvironmentActionInfo[], instanceId: string, isDeployPermissible: boolean, allowMultipleEnvironmentActions: boolean): IPivotBarAction {
        if (allowMultipleEnvironmentActions) {
            return {
                key: "deploy-menu",
                name: Resources.DeployText,
                iconProps: { iconName: "Add" },
                important: true,
                disabled: !isDeployPermissible,
                onClick: this._onDeployMenuClick,
                children: [
                    this._getDeployAction(selectedEnvironmentId, actions, instanceId, Resources.DeployEnvironment),
                    {
                        key: "deploy-mutliple",
                        name: Resources.DeployMultiple,
                        iconProps: { iconName: "Cloudy"},
                        disabled: !isDeployPermissible,
                        onClick: this._openDeployPanel
                    }
                ]
            } as IPivotBarAction;
        } else {
            return this._getDeployAction(selectedEnvironmentId, actions, instanceId, Resources.DeployText);
        }
    }

    private _onDeployMenuClick = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        this._deployMenuButtonTarget = ev.currentTarget;
    }

    private _getDeployAction(selectedEnvironmentId: string, actions: IReleaseEnvironmentActionInfo[], instanceId: string, actionName: string): IPivotBarAction {
        let deployAction: IPivotBarAction = {
            key: "deploy-environment",
            name: actionName,
            iconProps: { iconName: ReleaseEnvironmentStatusHelper.getActionIcon(ReleaseEnvironmentAction.Deploy)},
            important: true,
            disabled: true,
        } as IPivotBarAction;


        if (actions && selectedEnvironmentId) {
            let presentActions = actions;
            for (let presentAction of presentActions) {
                if ((presentAction.action === ReleaseEnvironmentAction.Deploy || presentAction.action === ReleaseEnvironmentAction.Redeploy )
                    && !presentAction.isDisabled
                    && presentAction.isVisible) {
                    deployAction.disabled = false;
                    deployAction.onClick = () => { presentAction.onExecute(selectedEnvironmentId, ActionClickTarget.commandBar, null, this._deployMenuButtonTarget); };
                }
            }
        }
        return deployAction;
    }

    private _getCancelAction(selectedEnvironmentId: string, actions: IReleaseEnvironmentActionInfo[]): IPivotBarAction {
        let cancelAction: IPivotBarAction = {
            key: "cancel-button",
            name: Resources.CancelAction,
            iconProps: { iconName: ReleaseEnvironmentStatusHelper.getActionIcon(ReleaseEnvironmentAction.Cancel)},
            disabled: true,
            important: true,
        };
        if (actions && selectedEnvironmentId) {
            let presentActions = actions;
            for (let presentAction of presentActions) {
                if ((presentAction.action === ReleaseEnvironmentAction.Cancel )
                    && !presentAction.isDisabled
                    && presentAction.isVisible) {
                    cancelAction.disabled = false;
                    cancelAction.onClick = () => { presentAction.onExecute(selectedEnvironmentId, ActionClickTarget.actionButton); };
                }
            }
        }
        return cancelAction;
    }


    @autobind
    private _openDeployPanel() {
        this._currentActionTarget = this._deployMenuButtonTarget;
        this._publishButtonClickTelemetry(Feature.MultipleEnvironmentsDeploy_OpenPanel);
        let item = null;
        item = new DeployMultipleEnvironmentsPanelItem(this._instanceId);
        item.onHideDetails = this._onHideDetails;
        let overlayPanelActions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActions.showOverlay.invoke(null);

        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        itemSelectorActions.selectItem.invoke({
            data: item
        });

        overlayPanelActions.setFocusOnCloseButton.invoke(null);
    }

    @autobind
    private _openApprovalPanel(ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
        this._currentActionTarget = ev.currentTarget;
        this._publishButtonClickTelemetry(Feature.MultipleEnvironmentsApprove_OpenPanel);
        let item = null;
        item = new ApproveMultipleEnvironmentsPanelItem(this._instanceId);
        item.onHideDetails = this._onHideDetails;

        let overlayPanelActions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActions.showOverlay.invoke(null);

        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        itemSelectorActions.selectItem.invoke({
            data: item
        });

        overlayPanelActions.setFocusOnCloseButton.invoke(null);
    }

    private _onHideDetails = (): void => {
        if (this._currentActionTarget) {
            this._currentActionTarget.focus();
        }
    }

    private _publishButtonClickTelemetry(action: string) {
        let feature: string = action;
        let eventProperties: IDictionaryStringTo<any> = {};

        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        eventProperties[Properties.ReleaseDefinitionId] = releaseStore.getReleaseDefinitionId();
        eventProperties[Properties.ReleaseId] = releaseStore.getReleaseId();

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _currentActionTarget: HTMLElement = null;
    private _instanceId;
    private _deployMenuButtonTarget: HTMLElement = null;
    private static DEFAULT_COMMAND_VISIBLE_LENGTH = 2;
}