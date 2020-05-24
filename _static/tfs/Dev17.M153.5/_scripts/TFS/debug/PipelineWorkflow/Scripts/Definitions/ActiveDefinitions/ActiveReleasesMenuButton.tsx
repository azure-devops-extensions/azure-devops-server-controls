import * as React from "react";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { css } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { NavigationConstants, CommonConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { PipelineRelease, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveReleasesMenuItemKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { ActiveReleasesStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { UIUtils } from "PipelineWorkflow/Scripts/Shared/Utils/UIUtils";
import { renderAbandonReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/Dialogs/AbandonReleaseDialog";
import { renderDeleteReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/Dialogs/DeleteReleaseDialog";
import { renderUndeleteReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/Dialogs/UndeleteReleaseDialog";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Manager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager";

import { Release, ReleaseStatus } from "ReleaseManagement/Core/Contracts";

import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { getService as getEventsService, CommonActions } from "VSS/Events/Action";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Performance from "VSS/Performance";
import { getLocalService } from "VSS/Service";
import { using } from "VSS/VSS";
import { localeFormat } from "VSS/Utils/String";

// Lazy load
import * as CreateReleasePanel_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";


export interface IActiveReleasesMenuButtonProps extends IProps {
    release: Release;
    releaseUrl: string;
    isDeleted: boolean;
    onReleaseDelete: (release: Release) => void;
    onReleaseFound?: () => void;
    releasesActionSuccessCallback?: (message: React.ReactNode) => void;
    releasesActionErrorCallback?: (message: React.ReactNode) => void;
}

export class ActiveReleasesMenuButton {

    public static getMenuItems(props?: IActiveReleasesMenuButtonProps): IContextualMenuItem[] {
        let menuItems: IContextualMenuItem[] = [];
        const commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
        const permissionCollection = commonDefinitionsStore.getPermissions();

        // TODO - If DefinitionReference has path, get the path from there (That is the work being done for Release progress view)
        // The few lines below and some other modifications in certain files are a complete hack for the time being.
        const activeReleasesStore = StoreManager.GetStore<ActiveReleasesStore>(ActiveReleasesStore);
        const folderPath = activeReleasesStore.getState().folderPath;
        const token = SecurityUtils.getCompleteSecurityTokenForDefinition(folderPath, props.release.releaseDefinition.id);

        const canViewRelease = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.ViewReleases);
        const canManageRelease = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.ManageReleases);
        const canDeleteRelease = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.DeleteReleases);
        const canUndeleteRelease = canManageRelease;

        if (props.isDeleted && canManageRelease) {
            // Undelete
            menuItems.push({
                key: ActiveReleasesMenuItemKeys.UndeleteReleaseMenuItemKey,
                name: Resources.UndeleteReleaseMenuItemText,
                onClick: () => this._undeleteRelease(props)
            });
        }
        else {
            // Open
            if (canViewRelease) {
                menuItems.push({
                    key: ActiveReleasesMenuItemKeys.OpenMenuItemKey,
                    name: Resources.ViewReleaseMenuItemText,
                    onClick: () => this._openRelease(props),
                    iconProps: { className: "bowtie-icon bowtie-arrow-right" },
                    title: UIUtils.getAccessDeniedTooltipText(!canViewRelease, Resources.OpenReleaseMenuItemText)
                });
            }

            if (Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled()) {
                if (canManageRelease) {
                    // Start
                    menuItems.push({
                        key: ActiveReleasesMenuItemKeys.StartMenuItemKey,
                        name: Resources.StartReleaseMenuItemText,
                        onClick: () => this._startRelease(props),
                        iconProps: { className: "bowtie-icon bowtie-status-run-outline" },
                        disabled: props.release.status !== ReleaseStatus.Draft,
                        title: UIUtils.getAccessDeniedTooltipText(!canManageRelease, Resources.StartReleaseMenuItemText)
                    });

                    // Retain
                    const isRetained = props.release.keepForever;
                    let retainReleaseItemName = isRetained ? Resources.StopRetainingReleaseMenuItemText : Resources.RetainReleaseMenuItemText;
                    menuItems.push({
                        key: ActiveReleasesMenuItemKeys.RetainReleaseMenuItemKey,
                        name: retainReleaseItemName,
                        onClick: () => this._retainRelease(props),
                        iconProps: { className: isRetained ? "bowtie-icon bowtie-security-unlock" : "bowtie-icon bowtie-security-lock" },
                        title: UIUtils.getAccessDeniedTooltipText(!canManageRelease, retainReleaseItemName)
                    });

                    // Abandon
                    menuItems.push({
                        key: ActiveReleasesMenuItemKeys.AbandonReleaseMenuItemKey,
                        name: Resources.AbandonReleaseMenuItemText,
                        onClick: () => this._abandonRelease(props),
                        iconProps: { className: "bowtie-icon bowtie-status-no" },
                        disabled: props.release.status === ReleaseStatus.Abandoned,
                        title: UIUtils.getAccessDeniedTooltipText(!canManageRelease, Resources.AbandonReleaseMenuItemText)
                    });
                }

                if (canDeleteRelease) {
                    // Delete
                    menuItems.push({
                        key: ActiveReleasesMenuItemKeys.DeleteReleaseMenuItemKey,
                        name: Resources.DeleteReleaseMenuItemText,
                        onClick: () => this._deleteRelease(props),
                        iconProps: { className: "bowtie-icon bowtie-trash" },
                        title: UIUtils.getAccessDeniedTooltipText(!canDeleteRelease, Resources.DeleteReleaseMenuItemText)
                    });
                }
            }
        }

        return menuItems;
    }

    private static _openRelease(props: IActiveReleasesMenuButtonProps): void {
        DefinitionsHubTelemetry.OpenReleaseClicked();
        if (FeatureFlagUtils.isNewReleaseProgressFastHubSwitchDisabled()) {
            location.href = props.releaseUrl;
        }
        else {
            getLocalService(HubsService).navigateToHub(NavigationConstants.ReleaseProgressHubId, props.releaseUrl);
        }
    }

    private static _openReleaseInNewTab(props: IActiveReleasesMenuButtonProps): void {
        DefinitionsHubTelemetry.OpenReleaseInNewTabClicked();
        getEventsService().performAction(
            CommonActions.ACTION_WINDOW_OPEN,
            {
                url: props.releaseUrl,
                target: "_blank",
                rel: "noopener noreferrer"
            });
    }

    private static _startRelease(props: IActiveReleasesMenuButtonProps): void {
        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        DefinitionsHubTelemetry.StartDraftReleaseClicked();
        using(["PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper"], (CreateReleasePanelHelper: typeof CreateReleasePanel_TypeOnly) => {

            const createReleasePanel = new CreateReleasePanelHelper.CreateReleasePanelHelper<PipelineRelease, PipelineEnvironment>({
                definitionId: props.release.releaseDefinition.id,
                releaseId: props.release.id,
                startReleaseMode: true,
                onQueueRelease: (release: Release) => {
                    const message = <span>
                        {Resources.ReleaseCreatedTextPrefix}
                        <SafeLink href={DefinitionsUtils.getReleaseUrl(release)} target="_blank" allowRelative={true}>{release.name}</SafeLink>
                        {Resources.ReleaseStartedTextSuffix}
                    </span>;
                    this._activeReleasesActionCreator.updateRelease(release, message);

                    if (props.releasesActionSuccessCallback) {
                        props.releasesActionSuccessCallback(message);
                    }
                }
            });

            createReleasePanel.openCreateReleasePanel();
        });
    }

    private static _retainRelease(props: IActiveReleasesMenuButtonProps): void {
        if (props.release.keepForever) {
            DefinitionsHubTelemetry.StopRetainingReleaseClicked();
        }
        else {
            DefinitionsHubTelemetry.RetainReleaseClicked();
        }

        this._activeReleasesActionCreator.changeRetention(props.release.id, !props.release.keepForever, props.releasesActionSuccessCallback, props.releasesActionErrorCallback);
    }

    private static _abandonRelease(props: IActiveReleasesMenuButtonProps): void {
        DefinitionsHubTelemetry.AbandonReleaseClicked();
        const message = localeFormat(Resources.AbandonReleaseConfirmationMessageFormat, props.release.name);
        renderAbandonReleaseDialog(
            props.release,
            (release) => {
                this._activeReleasesActionCreator.updateRelease(release, message);
                if (props.releasesActionSuccessCallback) {
                    props.releasesActionSuccessCallback(message);
                }
            });
    }

    private static _deleteRelease(props: IActiveReleasesMenuButtonProps): void {
        DefinitionsHubTelemetry.DeleteReleaseClicked();
        props.onReleaseDelete(props.release);
    }

    private static _undeleteRelease(props: IActiveReleasesMenuButtonProps): void {
        DefinitionsHubTelemetry.UndeleteReleaseClicked();
        const message = localeFormat(Resources.UndeleteReleaseConfirmationMessageFormat, props.release.name);
        renderUndeleteReleaseDialog(
            props.release, () => {
                this._activeReleasesActionCreator.removeRelease(props.release.id, message);

                if (props.releasesActionSuccessCallback) {
                    props.releasesActionSuccessCallback(message);
                }
            });
    }

    private static _onMenuButtonClicked(props: IActiveReleasesMenuButtonProps): void {
        // Publish Releases_Desired_Release_Found event if context menu button of release is clicked
        if (props.onReleaseFound) {
            props.onReleaseFound();
        }
    }

    private static _activeReleasesActionCreator: ActiveReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
}