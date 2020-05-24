// Copyright (c) Microsoft Corporation.  All rights reserved.

import React = require("react");
import Context = require("VSS/Context");
import Dialogs = require("VSS/Controls/Dialogs");
import Component_SecurityRoles = require("ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolSecurityRoles");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");

export class DeploymentPoolsConstants {
    public static DeploymentPoolsView = "pools";
    public static DeploymentPoolView = "pool";
    public static DeploymentPoolsIconClass = "ms-Icon ms-Icon--EngineeringGroup";
    public static onlineStatus = "Online";
    public static offlineStatus = "Offline";
    public static hubTitleIconColor: string = "#333333";
};

export class DeploymentPoolActions {
    public static UpdateErrorMessage = "UpdateErrorMessage";
    public static ClearErrorMessage = "ClearErrorMessage";
    public static UpdateCreatePoolFailureMessage = "UpdateCreatePoolFailureMessage";
    public static ClearCreatePoolFailureMessage = "ClearCreatePoolFailureMessage";
}

export const targetSort = (t1: Model.DeploymentPoolTarget, t2: Model.DeploymentPoolTarget): number => {
    if (t1.latestDeployment && !t2.latestDeployment) {
        return -1;
    } else if (!t1.latestDeployment && t2.latestDeployment) {
        return 1;
    } else {
        return t1.name.localeCompare(t2.name);
    }
}

export function showSecurityDialog(dpId?: number, name?: string) {
    let options: Component_SecurityRoles.ISecurityDialogOptions = {
        deploymentPoolId: dpId,
        name: name
    }
    Dialogs.show(Component_SecurityRoles.SecurityDialog, options);
}

export class DeploymentPoolTabs {
    public static details = "Details";
    public static targets = "Targets";
}

export namespace ActionsKeys {
    export const DeploymentPoolActions = "Common.DeploymentPoolActions";
    export const DeploymentPoolsActions = "Common.DeploymentPoolsActions";
    export const DeploymentPoolTargetsActions = "Common.DeploymentPoolTargetsActions";
    export const DeploymentPoolEventsActions = "Common.DeploymentPoolEventsActions";
    export const DeploymentPoolTargetActions = "Common.DeploymentPoolTargetActions";
}

export namespace ActionCreatorKeys {
    export const DeploymentPoolActionCreator = "Common.DeploymentPoolActionCreator";
    export const DeploymentPoolsActionCreator = "Common.DeploymentPoolsActionCreator";
    export const DeploymentPoolTargetsActionCreator = "Common.DeploymentPoolTargetsActionCreator";
    export const DeploymentPoolEventsActionCreator = "Common.DeploymentPoolEventsActionCreator";
    export const DeploymentPoolTargetActionCreator = "Common.DeploymentPoolTargetActionCreator";
}

export namespace StoreKeys {
    export const DeploymentPoolStore = "Common.DeploymentPoolStore";
    export const DeploymentPoolsStore = "Common.DeploymentPoolsStore";
    export const DeploymentPoolTargetsStore = "Common.DeploymentPoolTargetsStore";
    export const DeploymentPoolTargetStore = "Common.DeploymentPoolTargetStore";
}

/**
 * Constants - Deployment Pool unique key prefix
 */
export const DEPLOYMENT_POOL_ITEM_PREFIX = "common-deployment-pool-item";