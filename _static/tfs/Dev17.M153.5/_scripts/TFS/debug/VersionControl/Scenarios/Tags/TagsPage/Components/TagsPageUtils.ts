/// <reference types="react" />
/// <reference types="react-dom" />

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import * as VSS from "VSS/VSS";

import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { getBowtieIconProps } from "VersionControl/Scenarios/Shared/IconUtils";
import { ActionCreator } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionCreator";
import { IEnhancedTagRef } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as GitUIService_NO_REQUIRE from "VersionControl/Scripts/Services/GitUIService";
import { VersionSpec, GitBranchVersionSpec, GitTagVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { Utils } from "VersionControl/Scenarios/Shared//Utils";
import Settings_RestClient = require("VSS/Settings/RestClient");

export function getTagsCommandsInContextMenu(
    tagRef: IEnhancedTagRef,
    repositoryContext: RepositoryContext,
    xhrNavigationCallback: Function,
    onDeleteTag: (name: string) => void,
    onCompareTag: (name: string) => void,
    isCreateBranchAllowed: boolean,
    isForcePushAllowed: boolean,
    isSettingWriteAllowed?: boolean,
    compareTagBase?: string): IContextualMenuItem[] {

    const MenuItemId_CreateBranch = "menu-create-branch";
    const MenuItemId_DownloadZip = "menu-download-zip";
    const MenuItemId_Explore = "menu-view-files";
    const MenuItemId_History = "menu-view-history";
    const MenuItemId_DeleteTag = "menu-delete-tag";
    const MenuItemId_Separator = "menu-separator";
    const MenuItemId_Separator1 = "menu-separator-1";
    const MenuItemId_SetAsCompare = "menu-set-as-compare";
    const MenuItemId_CompareTags = "menu-compare-tags";
    const isOnPrem = !repositoryContext.getTfsContext().isHosted;

    const menuItems: IContextualMenuItem[] = [];
    if (isCreateBranchAllowed) {
        menuItems.push({
            key: MenuItemId_CreateBranch,
            name: VCResources.NewBranchText,
            iconProps: getBowtieIconProps(Constants.bowtieMathPlusLight),
            disabled: tagRef.isDeleted,
            onClick: () => _createBranch(tagRef, repositoryContext, xhrNavigationCallback)
        });
    }

    menuItems.push({
        key: MenuItemId_Separator,
        name: "-",
    });

    menuItems.push({
        key: MenuItemId_DownloadZip,
        name: VCResources.DownloadAsZip,
        iconProps: getBowtieIconProps(Constants.bowtieTransferDownload),
        disabled: tagRef.isDeleted,
        onClick: () => {
            window.open(
                VersionControlUrls.getZippedContentUrl(
                    repositoryContext,
                    repositoryContext.getRootPath(),
                    VersionControlUrls.getTagItemVersion(tagRef.item.fullName)),
                "_blank");
        },
    });

    menuItems.push({
        key: MenuItemId_Explore,
        name: VCResources.ViewFiles,
        ariaLabel: VCResources.ViewFiles,
        iconProps: getBowtieIconProps(Constants.bowtieFile),
        disabled: tagRef.isDeleted,
        onClick: () => {
            xhrNavigationCallback(
                VersionControlUrls.getTagExplorerUrl(repositoryContext as GitRepositoryContext, tagRef.item.fullName),
                CodeHubContributionIds.gitFilesHub);
        }
    });

    menuItems.push({
        key: MenuItemId_History,
        name: VCResources.ViewHistory,
        ariaLabel: VCResources.ViewHistory,
        iconProps: getBowtieIconProps(Constants.bowtieNavigateHistory),
        disabled: tagRef.isDeleted,
        onClick: () => {
            xhrNavigationCallback(
                VersionControlUrls.getTagHistoryUrl(repositoryContext as GitRepositoryContext, tagRef.item.fullName),
                CodeHubContributionIds.historyHub);
        },
    });

    menuItems.push({
        key: MenuItemId_Separator1,
        name: "-",
    });

    if (isOnPrem || isForcePushAllowed) {
        menuItems.push({
            key: MenuItemId_DeleteTag,
            name: VCResources.DeleteTag_Option,
            ariaLabel: VCResources.DeleteTag_Option,
            iconProps: getBowtieIconProps(Constants.bowtieTrash),
            disabled: tagRef.isDeleted,
            onClick: () => {
                onDeleteTag(tagRef.item.fullName);
            }
        });
    }

    // Don't show option of Set as Compare when that tag is already set to compare or user dont have permissio to write setting service
    if (isSettingWriteAllowed && !tagRef.isCompareTagBase) {
        menuItems.push({
            key: MenuItemId_SetAsCompare,
            name: VCResources.SetAsCompareTagDialog,
            ariaLabel: VCResources.SetAsCompareTagDialog,
            iconProps: getBowtieIconProps(Constants.bowtieTfvcCompare),
            disabled: tagRef.isDeleted,
            onClick: () => {
                onCompareTag(tagRef.item.fullName);
            }
        });
    }

    // If base compare tag is defined only then show the option to compare tags
    if (!tagRef.isCompareTagBase && compareTagBase) {
        menuItems.push({
            key: MenuItemId_CompareTags,
            name: VCResources.CompareTagsDialog,
            ariaLabel: VCResources.CompareTagsDialog,
            iconProps: getBowtieIconProps(Constants.bowtieDiffSideBySide),
            disabled: tagRef.isDeleted,
            onClick: () => {
                xhrNavigationCallback(
                    VersionControlUrls.getBranchCompareUrl(
                        repositoryContext as GitRepositoryContext,
                        new GitTagVersionSpec(compareTagBase).toVersionString(),
                        new GitTagVersionSpec(tagRef.item.fullName).toVersionString()),
                    CodeHubContributionIds.branchesHub);
            },
        });
    }

    return menuItems;
}

function _createBranch(tagRef: IEnhancedTagRef, repositoryContext: RepositoryContext, xhrNavigationCallback: Function): void {

    VSS.using(["VersionControl/Scripts/Services/GitUIService"],
        (_GitUIService: typeof GitUIService_NO_REQUIRE) => {
            const gitUIService = _GitUIService.getGitUIService(repositoryContext as GitRepositoryContext);
            const createBranchOptions = {
                sourceRef: new GitTagVersionSpec(tagRef.item.fullName),
                suggestedFriendlyName: "branch-from-" + tagRef.item.fullName,
            } as GitUIService_NO_REQUIRE.ICreateBranchOptions;

            gitUIService.createBranch(createBranchOptions).then<void>(
                (result) =>
                    !result.cancelled &&
                    xhrNavigationCallback(
                        VersionControlUrls.getExplorerUrl(repositoryContext, null, null, {
                            version: new GitBranchVersionSpec(result.selectedFriendlyName).toVersionString(),
                        }),
                        CodeHubContributionIds.gitFilesHub));
        });
}
