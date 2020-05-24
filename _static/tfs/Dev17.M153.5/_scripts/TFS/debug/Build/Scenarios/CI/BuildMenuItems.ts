import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { VssIconType } from "VSSUI/VssIcon";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import {
    Build,
    BuildDefinition,
    BuildResult,
    BuildReason,
    BuildStatus
} from "TFS/Build/Contracts";
import {
    BuildsActionCreator,
    IBuildData
} from "Build/Scripts/CI/Actions/Builds";

import { hasDefinitionPermission, canCancelBuild, canRetainBuild } from "Build/Scripts/Security";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { UserActions } from "Build/Scripts/Constants";
import { format } from "VSS/Utils/String";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";

export function getDeleteBuildMenuItem(build: Build, buildsActionCreator: BuildsActionCreator): IContextualMenuItem {
    if (!build || build.deleted) {
        return null;
    }

    const canDeleteBuild = hasDefinitionPermission(build.definition, BuildPermissions.DeleteBuilds);

    return {
        key: UserActions.DeleteBuild,
        name: Resources.DeleteBuild,
        iconProps: { className: "bowtie-icon bowtie-edit-delete" },
        data: build,
        disabled: !canDeleteBuild,
        onClick: (event, item) => {
            let build = item.data as Build;
            let title = "";
            let canDelete = true;
            if (build.keepForever || build.retainedByRelease) {
                title = format(Resources.CantDeleteBuild, build.buildNumber);
                canDelete = false;
            }
            else {
                title = format(Resources.ConfirmDeleteBuild, build.buildNumber);
            }

            if (confirm(title) && canDelete) {
                buildsActionCreator.deleteBuild(build);
            }
        }
    } as IContextualMenuItem;
}

export function getViewBuildMenuItem(build: Build) {
    if (!build) {
        return null;
    }

    return {
        key: UserActions.ViewBuild,
        name: Resources.BuildDetailMenuItemText,
        iconProps: { className: "bowtie-icon bowtie-navigate-forward-circle" },
        data: build,
        onClick: (event, item) => {
            let build = item.data as Build;
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getBuildDetailLink(build.id)
            });
        }
    } as IContextualMenuItem;
}

export function getRetainBuildMenuItem(build: Build, buildsActionCreator: BuildsActionCreator): IContextualMenuItem {
    if (!build) {
        return null;
    }

    let buildRetention = build.keepForever;

    if (build.deleted) {
        return null;
    }

    const canEditRetainedFlag = canRetainBuild(build.definition);

    if (buildRetention) {
        return {
            key: UserActions.StopRetainingBuild,
            name: Resources.StopRetainingIndefinitely,
            iconProps: { className: "bowtie-icon bowtie-security-unlock" },
            data: build,
            disabled: !canEditRetainedFlag,
            onClick: (event, item) => {
                let build = item.data as Build;
                let title = "";

                if (build) {
                    title = Resources.StopRetainingMultipleBuildsConfirmation;
                }

                if (!title || confirm(title)) {
                    buildsActionCreator.retainBuild(build, false);
                }
            }
        } as IContextualMenuItem;
    }
    else {
        return {
            key: UserActions.RetainBuild,
            name: Resources.BuildRetainText,
            iconProps: { className: "bowtie-icon bowtie-security-lock" },
            data: build,
            disabled: !canEditRetainedFlag,
            onClick: (event, item) => {
                let build = item.data as Build;
                buildsActionCreator.retainBuild(build, true);
            }
        } as IContextualMenuItem;
    }
}
