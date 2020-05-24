import ControlsCommon = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");

import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import TfsContext = TFS_Host_TfsContext.TfsContext;
import CommonMenuItems = ControlsCommon.CommonMenuItems;

export function getBranchesContextMenuItems(
    contextInfo,
    includeBranchLockUnlock: boolean,
    contextActionId: string,
    unlockAction: () => void,
    lockAction: () => void,
    lockUnlockErrorAction: (error) => void) {

    let menuItems = [];

    if (contextInfo.item.isRepository) {
        menuItems.push(CommonMenuItems.security());
    }
    else {
        menuItems.push({
            icon: "bowtie-icon bowtie-tfvc-compare",
            text: VCResources.BranchesContextMenuCompareTo,
            childItems: (contextInfo, callback, errorCallback) => {
                let menuItems = [];

                let baseVersion = new VCSpecs.GitBranchVersionSpec(contextInfo.item.friendlyName || contextInfo.item.name).toVersionString();
                $.each(contextInfo.branches, (index, element) => {
                    let branchName = element.friendlyName || element.name;
                    if (contextInfo.item.name !== element.name) {
                        menuItems.push({
                            id: "compare-branches",
                            icon: "bowtie-icon bowtie-tfvc-branch",
                            text: branchName,
                            title: Utils_String.format(VCResources.BranchesContextMenuCompareBaseToTarget, contextInfo.item.name, branchName),
                            action: "navigate",
                            "arguments": {
                                url: Navigation_Services.getHistoryService().getFragmentActionLink(contextActionId, {
                                    baseVersion: baseVersion,
                                    targetVersion: new VCSpecs.GitBranchVersionSpec(branchName).toVersionString()
                                })
                            }
                        });
                    }
                });

                if (menuItems.length === 0) {
                    menuItems.push({
                        text: VCResources.NoOtherBranches,
                        disabled: true
                    });
                }

                return menuItems
            },
            groupId: "actions"
        });

        if (includeBranchLockUnlock) {
            if (contextInfo.item.isLockedBy) {
                menuItems.push({
                    id: "git-unlock-branch",
                    icon: "bowtie-icon bowtie-tfvc-branch", // Show unlocked icon for unlock action
                    text: VCResources.UnlockBranchMenuItem,
                    action: () => {
                        let repositoryContext = contextInfo.repositoryContext;
                        let branchName = (!contextInfo.item.name || contextInfo.item.name.indexOf("refs/heads/") == 0) ?
                            contextInfo.item.name :
                            "refs/heads/" + contextInfo.item.name;
                        (<GitRepositoryContext>repositoryContext).getGitClient().beginUnlockGitRef(repositoryContext.getRepository(), branchName, () => {
                            contextInfo.item.isLockedBy = null;
                            if ($.isFunction(unlockAction)) {
                                unlockAction();
                            }
                        }, (error) => {
                            if ($.isFunction(lockUnlockErrorAction)) {
                                lockUnlockErrorAction(error);
                            }
                            else {
                                VSS.errorHandler.showError(error);
                            }
                        });
                    },
                    groupId: "actions"
                });
            }
            else {
                menuItems.push({
                    id: "git-lock-branch",
                    icon: "bowtie-icon bowtie-tfvc-branch-locked", // Show locked icon for lock action
                    text: VCResources.LockBranchMenuItem,
                    action: () => {
                        let repositoryContext = contextInfo.repositoryContext;
                        let branchName = (!contextInfo.item.name || contextInfo.item.name.indexOf("refs/heads/") == 0) ?
                            contextInfo.item.name :
                            "refs/heads/" + contextInfo.item.name;
                        (<GitRepositoryContext>repositoryContext).getGitClient().beginLockGitRef(repositoryContext.getRepository(), branchName, () => {
                            let currentIdentity = TfsContext.getDefault().currentIdentity;
                            contextInfo.item.isLockedBy = {
                                id: currentIdentity.id,
                                uniqueName: currentIdentity.uniqueName,
                                displayName: currentIdentity.displayName
                            };
                            if ($.isFunction(lockAction)) {
                                lockAction();
                            }
                        }, (error) => {
                            if ($.isFunction(lockUnlockErrorAction)) {
                                lockUnlockErrorAction(error);
                            }
                            else {
                                VSS.errorHandler.showError(error);
                            }
                        });
                    },
                    groupId: "actions"
                });
            }
        }
    }

    return menuItems;
}
