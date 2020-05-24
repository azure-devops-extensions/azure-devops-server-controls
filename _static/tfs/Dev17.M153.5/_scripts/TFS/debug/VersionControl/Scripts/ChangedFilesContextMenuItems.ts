import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");

export module ChangedFilesContextMenuItems {
        
    export function getContextMenuItems(
        repositoryContext: RepositoryContext,
        path: string,
        changeList: VCLegacyContracts.ChangeList,
        change: VCLegacyContracts.Change,
        discussionManager?: DiscussionOM.DiscussionManager) {

        let menuItems: any[] = [];

        if (!(<VCLegacyContracts.TfsChangeList>changeList).isShelveset) {
            menuItems.push({ id: "explore-as-of-version", text: VCResources.ExploreThisVersionMenuText, title: VCResources.ExploreThisVersionMenuTooltip, icon: "bowtie-icon bowtie-folder" });
        }

        if (repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            menuItems.push({ id: "explore-latest-version", text: VCResources.ExploreLatestVersionMenuText, title: VCResources.ExploreLatestVersionMenuTooltip, icon: "bowtie-icon bowtie-folder" });
        }

        if (change && !change.item.isFolder) {
            menuItems.push({ separator: true });

            menuItems.push({ id: "view-content", text: VCResources.ViewContentsMenu });
            menuItems.push({ id: "view-history", text: VCResources.ViewHistory, icon: "bowtie-icon bowtie-navigate-history" });

            if (!VCOM.ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                if (!VCOM.ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Add)) {
                    menuItems.push({ id: "compare-previous", text: VCResources.CompareToPrev, icon: "bowtie-icon bowtie-tfvc-compare" });
                }

                if (repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                    // Do not show for shelveset adds
                    menuItems.push({
                        id: "compare-latest",
                        text: VCResources.CompareToLatest,
                        icon: "bowtie-icon bowtie-tfvc-compare",
                        disabled: (<VCLegacyContracts.TfsChangeList>changeList).isShelveset && VCOM.ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Add)
                    });
                }

                menuItems.push({ separator: true });

                menuItems.push({
                    id: "download",
                    text: VCResources.DownloadFile,
                    icon: "bowtie-icon bowtie-transfer-download",
                    action: "navigate",
                    "arguments": {
                        url: VersionControlUrls.getFileContentUrl(repositoryContext, path, changeList.version),
                        target: "_blank"
                    }
                });
            }

            if (discussionManager) {
                menuItems.push({ separator: true });

                menuItems.push({
                    id: "add-file-discussion",
                    text: VCResources.AddCommentAction,
                    icon: "bowtie-icon bowtie-comment-add",
                    arguments: {
                        discussionManager: discussionManager,
                        itemPath: change.item.serverItem
                    }
                });
            }
        }

        return menuItems;
    }

    export function handleMenuItemClick(
        command: string,
        repositoryContext: RepositoryContext,
        path: string,
        changeList: VCLegacyContracts.ChangeList,
        change: VCLegacyContracts.Change,
        showInExplorerContext: boolean = false) {

        /// <param name="e" type="any" />
        /// <returns type="any" />
        let folder = (change && !change.item.isFolder) ? VersionControlPath.getFolderName(path) : path,
            fileName = VersionControlPath.getFileName(path);

        switch (command) {
            case "explore-as-of-version":
                window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, folder, null, {
                    version: changeList.version,
                    fileName: fileName
                });
                return false;
            case "explore-latest-version":
                window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, folder, null, {
                    fileName: fileName
                });
                return false;
            case "view-content":
                if (showInExplorerContext) {
                    window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, path, VCControlsCommon.VersionControlActionIds.Contents, {
                        version: changeList.version,
                        fileName: fileName
                    });
                }
                else {
                    window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, path, null);
                }
                return false;
            case "view-history":
                if (showInExplorerContext) {
                    window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, path, VCControlsCommon.VersionControlActionIds.History, {
                        version: changeList.version,
                        fileName: fileName
                    });
                }
                else {
                    window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.History, path, null);
                }
                return false;
            case "compare-previous":
                const previousParams = {
                    oversion: "P" + changeList.version,
                    mversion: changeList.version
                };
                if (showInExplorerContext) {
                    window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, path, VCControlsCommon.VersionControlActionIds.Compare, previousParams);
                }
                else {
                    window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Compare, path, null, previousParams);
                }
                return false;
            case "compare-latest":
                const latestParams = {
                    oversion: changeList.version,
                    mversion: "T" + changeList.version
                };
                if (showInExplorerContext) {
                    window.location.href = VersionControlUrls.getExplorerUrl(repositoryContext, path, VCControlsCommon.VersionControlActionIds.Compare, latestParams);
                }
                else {
                    window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Compare, path, null, latestParams);
                }
                return false;
        }
    }
}
