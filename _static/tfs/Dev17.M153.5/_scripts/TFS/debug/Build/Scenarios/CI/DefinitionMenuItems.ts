import { IPivotBarAction } from 'VSSUI/PivotBar';
import { VssIconType } from "VSSUI/VssIcon";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import {
    Build,
    BuildDefinition,
    BuildResult,
    BuildReason,
    BuildStatus,
    DefinitionQuality,
    DefinitionQueueStatus
} from "TFS/Build/Contracts";
import {
    BuildsActionCreator,
    IBuildData
} from "Build/Scripts/CI/Actions/Builds";
import { getQueueStatusHandler } from "Build/Scripts/QueueStatus";

import { hasDefinitionPermission, hasProjectPermission, canCancelBuild, canRetainBuild, showFolderSecurityDialog, showDefinitionSecurityDialog } from "Build/Scripts/Security";
import { renderLazyComponentIntoDom } from "Build/Scripts/Components/LazyRenderedDomComponent";
import * as Dialogs_NO_REQUIRE from "VSS/Controls/Dialogs";
import * as DeleteDialog_NO_REQUIRE from "Build/Scripts/Controls.DeleteDefinitionDialog";
import * as CIQueueBuildDialog_NO_REQUIRE from "Build/Scripts/CIQueueBuildDialog";
import * as SaveDefinitionDialog_NO_REQUIRE from "Build/Scripts/Components/SaveDefinitionDialog";
import { Sources } from "Build/Scripts/Telemetry";
import * as Utils from "Build/Scripts/Utilities/Utils";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { UserActions, WellKnownClassNames } from "Build/Scripts/Constants";
import { format } from "VSS/Utils/String";
import { using } from "VSS/VSS";
import { getPageContext } from "VSS/Context";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";

export function getNewDefinitionPivotBarAction(): IPivotBarAction {
    return {
        name: Resources.NewText,
        key: "new",
        important: true,
        iconProps: {
            iconType: VssIconType.fabric,
            iconName: "Add"
        },
        onClick: () => {
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getGettingStartedUrl()
            });
        }
    } as IPivotBarAction;
}

export function getEditDefinitionPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canEditDefinition = definition && hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition);

    return {
        name: Resources.EditText,
        key: "edit",
        important: true,
        iconProps: {
            iconType: VssIconType.fabric,
            iconName: "Edit"
        },
        disabled: !canEditDefinition,
        onClick: () => {
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getEditDefinitionUrl(definition.id)
            });
        }
    } as IPivotBarAction;
}

export function getSecurityPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const project = getPageContext().webContext.project;
    const canManageProjectSecurity = hasProjectPermission(project.id, BuildPermissions.AdministerBuildPermissions);
    const canManageDefinitionSecurity = definition && hasDefinitionPermission(definition, BuildPermissions.AdministerBuildPermissions);

    return {
        name: Resources.SecurityText,
        key: "security",
        important: true,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-shield"
        },
        children: [
            {
                name: definition ? definition.name : Resources.BuildSummaryDefinitionLabel,
                key: "security-definition",
                important: true,
                disabled: !canManageDefinitionSecurity,
                onClick: () => {
                    showDefinitionSecurityDialog(definition);
                }
            },
            {
                name: project.name,
                key: "security-project",
                important: true,
                disabled: !canManageProjectSecurity,
                onClick: () => {
                    showFolderSecurityDialog("\\");
                }
            }
        ]
    } as IPivotBarAction;
}

export function getRenameMovePivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canEditDefinition = definition && hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition);
    const canRenameDefinition = canEditDefinition && definition.quality != DefinitionQuality.Draft;

    return {
        name: Resources.RenameMoveMenuItemText,
        key: "rename-move",
        important: false,
        disabled: !canRenameDefinition,
        iconProps: {
            iconType: VssIconType.fabric,
            iconName: "Rename"
        },
        onClick: () => {
            let props: SaveDefinitionDialog_NO_REQUIRE.ISaveDefinitionDialogProps = {
                showDialog: true,
                definitionId: definition.id,
                hideFolderPicker: false
            };

            renderLazyComponentIntoDom(
                WellKnownClassNames.RenameDefinitionDialog,
                ["Build/Scripts/Components/SaveDefinitionDialog"],
                props,
                (m: typeof SaveDefinitionDialog_NO_REQUIRE) => m.SaveDefinitionDialog,
                null,
                false);
        }
    } as IPivotBarAction;
}

export function getQueueNewBuildPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canQueueBuild = definition && hasDefinitionPermission(definition, BuildPermissions.QueueBuilds);

    return {
        name: Resources.QueueNewBuildMenuItemText,
        key: "queue",
        important: false,
        disabled: !canQueueBuild,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-build-queue-new"
        },
        onClick: () => {
            using(['Build/Scripts/CIQueueBuildDialog'], (_CIQueueBuildDialog: typeof CIQueueBuildDialog_NO_REQUIRE) => {
                var ciQueueBuildDialog = new _CIQueueBuildDialog.CIQueueBuildDialog(definition.id, Sources.AllDefinitions);
                ciQueueBuildDialog.open();
            });
        }
    } as IPivotBarAction;
}

export function getPauseBuildsPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canEditDefinition = definition && hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition);
    const definitionPaused = definition && definition.queueStatus !== DefinitionQueueStatus.Enabled;
    
    return {
        name: definitionPaused ? Resources.ResumeBuildsText : Resources.PauseBuildsText,
        key: "pause-resume",
        important: false,
        disabled: !canEditDefinition,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: definitionPaused ? "bowtie-play-resume" : "bowtie-status-pause-outline"
        },
        onClick: () => {
            if (definitionPaused) {
                getQueueStatusHandler().enableDefinition(definition.id);
            }
            else {
                getQueueStatusHandler().pauseDefinition(definition.id);
            }
        }
    } as IPivotBarAction;
}

export function getAddToFavoritesPivotBarAction(): IPivotBarAction {
    return {
        name: Resources.AddToFavoritesText,
        key: "add-to-favorites",
        important: false,
        disabled: true,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-favorite-outline"
        }
    } as IPivotBarAction;
}

export function getAddToDashboardPivotBarAction(): IPivotBarAction {
    return {
        name: Resources.AddToDashboardText,
        key: "add-to-dashboard",
        important: false,
        disabled: true,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-dashboard"
        }
    } as IPivotBarAction;
}

export function getCloneDefinitionPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canCloneDefinition = definition;

    return {
        name: Resources.CloneText,
        key: "clone",
        important: false,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-clone"
        },
        disabled: !canCloneDefinition,
        onClick: () => {
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getCloneDefinitionUrl(definition.id)
            });
        }
    } as IPivotBarAction;
}

export function getSaveAsTemplatePivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canEditDefinition = definition && hasDefinitionPermission(definition, BuildPermissions.EditBuildDefinition);

    return {
        name: Resources.SaveAsTemplateText,
        key: "save-as-template",
        important: false,
        disabled: !canEditDefinition,
        iconProps: {
            iconType: VssIconType.fabric,
            iconName: "SaveAs"
        },
        onClick: () => {
            let props: SaveDefinitionDialog_NO_REQUIRE.ISaveDefinitionDialogProps = {
                showDialog: true,
                definitionId: definition.id
            };

            renderLazyComponentIntoDom(
                WellKnownClassNames.SaveDefinitionDialog,
                ["Build/Scripts/Components/SaveDefinitionDialog"],
                props,
                (m: typeof SaveDefinitionDialog_NO_REQUIRE) => m.SaveAsTemplateDefinitionDialog,
                null,
                false);
        }
    } as IPivotBarAction;
}

export function getExportDefinitionPivotBarAction(definition: BuildDefinition): IPivotBarAction {
    const canExportDefinition = definition;

    return {
        name: Resources.ExportDefinitionMenuItemText,
        key: "export",
        important: false,
        disabled: !canExportDefinition,
        iconProps: {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-arrow-export"
        },
        onClick: () => {
            let definitionJson = JSON.stringify(definition);
            Utils.downloadAsJsonFile(definitionJson, definition.name);
        }
    } as IPivotBarAction;
}

export function getDeleteDefinitionPivotBarAction(definition: BuildDefinition, buildsActionCreator: BuildsActionCreator, postDeleteCallback?: () => any): IPivotBarAction {
    const canDeleteDefinition = definition && hasDefinitionPermission(definition, BuildPermissions.DeleteBuildDefinition);

    return {
        name: Resources.DeleteQueueMenuItemText,
        key: "delete",
        important: false,
        disabled: !canDeleteDefinition,
        iconProps: {
            iconType: VssIconType.fabric,
            iconName: "Delete"
        },
        onClick: () => {
            using(["VSS/Controls/Dialogs", "Build/Scripts/Controls.DeleteDefinitionDialog"], (_Dialogs: typeof Dialogs_NO_REQUIRE, _DeleteDialog: typeof DeleteDialog_NO_REQUIRE) => {
                _Dialogs.show(_DeleteDialog.DeleteDefinitionDialog, {
                    name: definition.name,
                    isDraft: !!definition.draftOf,
                    okCallback: () => {
                        buildsActionCreator.deleteDefinition(definition, postDeleteCallback);
                    }
                });
            });
        }
    } as IPivotBarAction;
}
