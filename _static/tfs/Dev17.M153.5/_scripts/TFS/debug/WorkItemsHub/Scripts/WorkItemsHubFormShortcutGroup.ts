import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { WorkShortcutGroup } from "WorkItemTracking/Scripts/WorkShortcutGroup";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import {
    KeyboardShortcutDescription_Next_Item,
    KeyboardShortcutDescription_Previous_Item,
} from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as UserClaimsService from "VSS/User/Services";

export interface ITriageShortcutOptions {
    navigatePrevious: () => void;
    navigateNext: () => void;
    returnToTab: () => void;
}

export class WorkItemsHubFormShortcutGroup extends ShortcutGroupDefinition {
    private constructor(triageOptions: ITriageShortcutOptions = null, isAnonUser?: boolean) {
        super(Resources.KeyboardShortcutGroup_WorkItems);

        if (!UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Anonymous)) {
            // register work page shortcuts
            new WorkShortcutGroup(true /* no full screen */);
        }

        // register work items hub triage shortcuts if they're available
        if (triageOptions) {
            this.registerShortcuts(
                ["k", "alt+p"],
                {
                    description: KeyboardShortcutDescription_Previous_Item,
                    action: () => triageOptions.navigatePrevious(),
                    globalCombos: ["alt+p"]
                });

            this.registerShortcuts(
                ["j", "alt+n"],
                {
                    description: KeyboardShortcutDescription_Next_Item,
                    action: () => triageOptions.navigateNext(),
                    globalCombos: ["alt+n"]
                });

            this.registerShortcut(
                "alt+q",
                {
                    description: Resources.KeyboardShortcutDescription_BackToWorkItemsHub,
                    action: () => triageOptions.returnToTab(),
                    globalCombos: ["alt+q"]
                });
        }
    }

    public static Register(triageOptions: ITriageShortcutOptions = null): void {
        new WorkItemsHubFormShortcutGroup(triageOptions);
    }
}
