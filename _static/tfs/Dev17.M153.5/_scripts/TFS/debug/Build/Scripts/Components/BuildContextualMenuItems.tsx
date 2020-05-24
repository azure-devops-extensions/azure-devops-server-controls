/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { UserActions } from "Build/Scripts/Constants";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { hasDefinitionPermission, canCancelBuild, canRetainBuild } from "Build/Scripts/Security";
import { BuildsSource } from "Build/Scripts/Sources/Builds";

import { BuildLinks } from "Build.Common/Scripts/Linking";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { Build } from "TFS/Build/Contracts";

import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";
import { getCollectionService } from "VSS/Service";
import { format } from "VSS/Utils/String";

class SingletonVariables {
    public static BuildsSource: BuildsSource = null;
}

function getBuildsSource() {
    if (!SingletonVariables.BuildsSource) {
        SingletonVariables.BuildsSource = getCollectionService(BuildsSource);
    }

    return SingletonVariables.BuildsSource;
}

export function getCancelBuildsMenuItem(userId: string, builds: Build[], hidden: boolean): IContextualMenuItem {
    if (hidden || (!builds && builds.length == 0)) {
        return null;
    }

    const atLeastOneBuildIsDeleted = builds.some((build) => {
        return build.deleted;
    });

    if (atLeastOneBuildIsDeleted) {
        return null;
    }

    // disable the Cancel option if there are any builds the user can't cancel
    const canCancelBuilds = !builds.some((build) => !canCancelBuild(userId, build));
    if (!canCancelBuilds) {
        return null;
    }

    return {
        key: UserActions.CancelBuild,
        name: BuildResources.CancelBuild,
        iconProps: { className: "bowtie-icon bowtie-stop" },
        data: builds,
        onClick: (event, item) => {
            let builds = item.data as Build[];
            let title = "";

            if (builds.length == 0) {
                return;
            }

            if (builds.length > 1) {
                title = BuildResources.CancelMultipleBuildsConfirmation;
            }
            else {
                title = format(BuildResources.ConfirmCancelBuild, builds[0].buildNumber);
            }

            if (confirm(title)) {
                getBuildsSource().cancelBuilds(builds.map(b => b.id));
            }
        }
    } as IContextualMenuItem;
}

export function getDeleteBuildsMenuItem(builds: Build[], hidden?: boolean): IContextualMenuItem {
    if (hidden || (!builds && builds.length == 0)) {
        return null;
    }

    let atLeastOneBuildIsDeleted = builds.some((build) => {
        return build.deleted;
    });

    if (atLeastOneBuildIsDeleted) {
        return null;
    }

    const canDeleteBuilds = !builds.some((build) => {
        return !hasDefinitionPermission(build.definition, BuildPermissions.DeleteBuilds);
    });

    if (!canDeleteBuilds) {
        return null;
    }

    return {
        key: UserActions.DeleteBuild,
        name: BuildResources.DeleteBuild,
        iconProps: { className: "bowtie-icon bowtie-edit-delete" },
        data: builds,
        onClick: (event, item) => {
            let builds = item.data as Build[];
            let title = "";

            if (builds.length == 0) {
                return;
            }

            let canDelete = true;
            if (builds.length > 1) {
                // check for retainedByRelease or KeepForever
                if (builds.some(buildLockedFromDelete)) {
                    // use alternate message
                    title = BuildResources.DeleteMultipleBuildsSomeLockedConfirmation;
                }
                else {
                    title = BuildResources.DeleteMultipleBuildsConfirmation;
                }
            }
            else {
                // check for retainedByRelease or KeepForever
                if (builds[0].keepForever || builds[0].retainedByRelease) {
                    // use alternate message and don't attempt delete since it will intentionally fail
                    title = format(BuildResources.CantDeleteBuild, builds[0].buildNumber);
                    canDelete = false;
                }
                else {
                    title = format(BuildResources.ConfirmDeleteBuild, builds[0].buildNumber);
                }
            }

            if (confirm(title) && canDelete) {
                getBuildsSource().deleteBuilds(builds);
            }
        }
    } as IContextualMenuItem;
}

function buildLockedFromDelete(build: Build) {
    if (build.keepForever || build.retainedByRelease) {
        return true;
    }
    return false
}

export function getRetainBuildsMenuItem(builds: Build[]): IContextualMenuItem {
    if (!builds || builds.length == 0) {
        return null;
    }

    let firstBuildRetention = builds[0].keepForever;

    // all builds should have the same retention else, don't bother to render item
    let unmatchedBuilds = builds.filter((build) => {
        return build.keepForever != firstBuildRetention;
    });

    let atLeastOneBuildIsDeleted = builds.some((build) => {
        return build.deleted;
    });

    if ((unmatchedBuilds && unmatchedBuilds.length > 0) || atLeastOneBuildIsDeleted) {
        return null;
    }

    const canEditRetainedFlag = !builds.some((build) => {
        return !canRetainBuild(build.definition);
    });

    if (!canEditRetainedFlag) {
        return null
    }

    if (firstBuildRetention) {
        return {
            key: UserActions.StopRetainingBuild,
            name: BuildResources.StopRetainingIndefinitely,
            iconProps: { className: "bowtie-icon bowtie-security-unlock" },
            data: builds,
            onClick: (event, item) => {
                let builds = item.data as Build[];
                let title = "";

                if (builds.length > 1) {
                    title = BuildResources.StopRetainingMultipleBuildsConfirmation;
                }

                if (!title || confirm(title)) {
                    getBuildsSource().retainBuilds(builds.map((build) => {
                        return {
                            buildId: build.id,
                            newState: false
                        };
                    }));
                }
            }
        } as IContextualMenuItem;
    }
    else {
        return {
            key: UserActions.RetainBuild,
            name: BuildResources.BuildRetainText,
            iconProps: { className: "bowtie-icon bowtie-security-lock" },
            data: builds,
            onClick: (event, item) => {
                let builds = item.data as Build[];
                getBuildsSource().retainBuilds(builds.map((build) => {
                    return {
                        buildId: build.id,
                        newState: true
                    };
                }));
            }
        } as IContextualMenuItem;
    }
}

export function getViewBuildMenuItem(build: Build, hidden: boolean = false): IContextualMenuItem {
    if (hidden || !build) {
        return null;
    }

    return {
        key: UserActions.ViewBuild,
        name: BuildResources.BuildDetailMenuItemText,
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

export function getViewBuildMenuItemInNewTab(build: Build, hidden: boolean = false): IContextualMenuItem {
    if (hidden || !build) {
        return null;
    }

    return {
        key: UserActions.ViewBuild,
        name: BuildResources.OpenInNewTab,
        iconProps: { className: "bowtie-icon bowtie-navigate-forward-circle" },
        data: build,
        onClick: (event, item) => {
            let build = item.data as Build;
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_OPEN, {
                url: BuildLinks.getBuildDetailLink(build.id)
            });
        }
    } as IContextualMenuItem;
}

