/// <reference types="react" />

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { GeneralOptionsActionsHub } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsActions";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentCheckListActionCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListActionCreator";
import { IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DataStoreInstanceIds } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";

export class OptionsActionsCreator extends ActionBase.ActionCreatorBase {

    public initialize(): void {
        this._generalOptionsActionsHub = ActionsHubManager.GetActionsHub<GeneralOptionsActionsHub>(GeneralOptionsActionsHub);
        this._publishDeployStatusCheckListActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentCheckListActionCreator>(EnvironmentCheckListActionCreator, DataStoreInstanceIds.PublishDeployStatus);
        this._badgeStatusCheckListActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentCheckListActionCreator>(EnvironmentCheckListActionCreator, DataStoreInstanceIds.BadgeStatus);
        this._autoLinkWorkItemsCheckListActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentCheckListActionCreator>(EnvironmentCheckListActionCreator, DataStoreInstanceIds.AutoLinkWorkItems);
    }

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_GeneralOptionsActionCreator;
    }

    public updateReleaseDefinitionDescription(newValue: string) {
        this._generalOptionsActionsHub.updateReleaseDefinitionDescription.invoke(newValue);
    }

    public updateReleaseNameFormat(newValue: string) {
        this._generalOptionsActionsHub.updateReleaseNameFormat.invoke(newValue);
    }

    public updateGeneralOptions(definition: CommonTypes.PipelineDefinition) {

        this._generalOptionsActionsHub.updateGeneralOptions.invoke(definition);

        if (!!definition) {
            let envListWithPublishDeployStatus: IEnvironmentReference[] = definition.environments && definition.environments.map(env => {
                return {
                    environmentId: env.id,
                    environmentName: env.name,
                    rank: env.rank,
                    status: !!env.environmentOptions && env.environmentOptions.publishDeploymentStatus
                } as IEnvironmentReference;
            });
            this._publishDeployStatusCheckListActionCreator.updateEnvironments(envListWithPublishDeployStatus);

            let envListWithBadgeStatus: IEnvironmentReference[] = definition.environments && definition.environments.map(env => {
                return {
                    environmentId: env.id,
                    environmentName: env.name,
                    status: !!env.environmentOptions && env.environmentOptions.badgeEnabled,
                    badgeUrl: env.badgeUrl
                } as IEnvironmentReference;
            });
            this._badgeStatusCheckListActionCreator.updateEnvironments(envListWithBadgeStatus);

            let envListWithAutoLink: IEnvironmentReference[] = definition.environments && definition.environments.map(env => {
                return {
                    environmentId: env.id,
                    environmentName: env.name,
                    rank: env.rank,
                    status: !!env.environmentOptions && env.environmentOptions.autoLinkWorkItems
                } as IEnvironmentReference;
            });
            this._autoLinkWorkItemsCheckListActionCreator.updateEnvironments(envListWithAutoLink);
        }
    }

    public updateOptions(definition: CommonTypes.PipelineDefinition) {
        this.updateGeneralOptions(definition);
        this._generalOptionsActionsHub.refreshOptionsTab.invoke(null);
    }

    private _generalOptionsActionsHub: GeneralOptionsActionsHub;
    private _publishDeployStatusCheckListActionCreator: EnvironmentCheckListActionCreator;
    private _badgeStatusCheckListActionCreator: EnvironmentCheckListActionCreator;
    private _autoLinkWorkItemsCheckListActionCreator: EnvironmentCheckListActionCreator;
}
