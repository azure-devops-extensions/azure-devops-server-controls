import * as CIQueueBuildDialog_NO_REQUIRE from "Build/Scripts/CIQueueBuildDialog";
import { UserActions } from "Build/Scripts/Constants";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { hasDefinitionPermission } from "Build/Scripts/Security";

import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { DefinitionReference } from "TFS/Build/Contracts";

import { using } from "VSS/VSS";

export const DIVIDER_KEY_PREFIX = "DIVIDER_";

export function getDivider(key: string | number) {
    return {
        key: DIVIDER_KEY_PREFIX + key,
        name: "-"
    } as IContextualMenuItem;
}

export function getQueueNewBuildMenuItem(definition: DefinitionReference, telemetrySource: string): IContextualMenuItem {
    if (hasDefinitionPermission(definition, BuildPermissions.QueueBuilds)) {
        return {
            key: UserActions.QueueBuild,
            name: BuildResources.QueueNewBuildMenuItemText,
            iconProps: { className: "bowtie-icon bowtie-build-queue-new" },
            data: definition.id,
            onClick: (ev?, item?) => {
                using(['Build/Scripts/CIQueueBuildDialog'], (_CIQueueBuildDialog: typeof CIQueueBuildDialog_NO_REQUIRE) => {
                    const ciQueueBuildDialog = new _CIQueueBuildDialog.CIQueueBuildDialog(definition.id, telemetrySource);
                    ciQueueBuildDialog.open();
                });
            }
        } as IContextualMenuItem;
    }
    else {
        return null;
    }
}