import { IContextualMenuItem, IContextualMenu } from "OfficeFabric/ContextualMenu";
import * as React from "react";

import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { create, getMenuIcon, separator, CommandCreator, CommandFiltering } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import * as VCFilesTreeCommands from "VersionControl/Scenarios/Shared/Commands/FilesTreeCommands";
import { IDiscussionContextItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionContextItemActionCreator";
import * as VCControlsCommon from "VersionControl/Scripts/Controls/ControlsCommon";
import { Change, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import { getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";

export interface CommandsOptions extends VCFilesTreeCommands.FilesTreeCommandsOptions {
    tfsContext: TfsContext;
    disableAddThread: boolean;
    change?: Change;
    thread?: DiscussionThread;
    discussionActionCreator?: IDiscussionContextItemActionCreator;
}

export function getTreeItemCommands(options: CommandsOptions): IContextualMenuItem[] {
    let menuItems: IContextualMenuItem[] = null;

    if (options.thread) {
        menuItems = create(threadItemCommands, options);
    }
    else if (options.change && !options.change.item.isFolder) {
        if (ChangeType.hasChangeFlag(options.change.changeType, VersionControlChangeType.Add)) {
            menuItems = create(fileItemAddedCommands, options);
        }
        else if (ChangeType.hasChangeFlag(options.change.changeType, VersionControlChangeType.Delete)) {
            menuItems = create(fileItemDeletedCommands, options);
        }
        else {
            menuItems = create(fileItemCommands, options);
        }
    }
    else {
        menuItems = create(folderItemCommands, options);
    }

    if (options.disableAddThread) {
        menuItems = CommandFiltering.filterForbidden(menuItems, [Commands.addComment]);
    }

    return menuItems;
}

namespace Commands {
    export const viewLatestFolderInExplorer = "viewLatestFolderInExplorer";
    export const viewLatestFileInExplorer = "viewLatestFileInExplorer";
    export const viewHistory = "viewHistory";
    export const compareToPreviousVersion = "compareToPreviousVersion";
    export const compareToLatestVersion = "compareToLatestVersion";
    export const addComment = "addComment";
}

type PullRequestCommandCreator = CommandCreator<CommandsOptions>;

const creators = {
    viewFolderInExplorer: VCFilesTreeCommands.createViewFolderInExplorer<CommandsOptions>(
        (options: CommandsOptions) => getExplorerFolderUrl(options, { version: options.version })),

    viewFileInExplorer: VCFilesTreeCommands.createViewFileInExplorer(
        (options: CommandsOptions) => getExplorerFileUrl(options, { version: options.version })),

    viewLatestFolderInExplorer: (options: CommandsOptions) =>
        !options.isGit && {
            key: Commands.viewLatestFolderInExplorer,
            name: VCResources.ViewLatestInFileExplorerMenu,
            title: VCResources.ViewLatestInFileExplorerMenu,
            iconProps: getMenuIcon("bowtie-folder"),
            ...VCFilesTreeCommands.getNavigateToExplorerProps(getExplorerFolderUrl(options), options),
        },

    viewLatestFileInExplorer: (options: CommandsOptions) =>
        !options.isGit && {
            key: Commands.viewLatestFileInExplorer,
            name: VCResources.ViewLatestInFileExplorerMenu,
            title: VCResources.ViewLatestInFileExplorerMenu,
            iconProps: getMenuIcon("bowtie-file-content"),
            ...VCFilesTreeCommands.getNavigateToExplorerProps(getExplorerFileUrl(options), options),
        },

    viewHistory: (options: CommandsOptions) => ({
        key: Commands.viewHistory,
        name: VCResources.ViewHistory,
        title: VCResources.ViewHistory,
        iconProps: getMenuIcon("bowtie-navigate-history"),
        ...VCFilesTreeCommands.getNavigateToExplorerProps(
            getExplorerUrl(options.repositoryContext, options.path, VCControlsCommon.VersionControlActionIds.History, { version: options.version }),
            options),
    }),

    compareToPreviousVersion: (options: CommandsOptions) => ({
        key: Commands.compareToPreviousVersion,
        name: VCResources.CompareToPrev,
        title: VCResources.CompareToPrev,
        iconProps: getMenuIcon("bowtie-tfvc-compare"),
        ...VCFilesTreeCommands.getNavigateToExplorerProps(
            getExplorerUrl(options.repositoryContext, options.path, VCControlsCommon.VersionControlActionIds.Compare, {
                oversion: "P" + options.version,
                mversion: options.version,
            }),
            options),
    }),

    compareToLatestVersion: (options: CommandsOptions) =>
        !options.isGit && {
            key: Commands.compareToLatestVersion,
            name: VCResources.CompareToLatest,
            title: VCResources.CompareToLatest,
            iconProps: getMenuIcon("bowtie-tfvc-compare"),
            disabled: options.isShelveset && ChangeType.hasChangeFlag(options.change.changeType, VersionControlChangeType.Add),
            ...VCFilesTreeCommands.getNavigateToExplorerProps(
                getExplorerUrl(options.repositoryContext, options.path, VCControlsCommon.VersionControlActionIds.Compare, {
                    oversion: options.version,
                    mversion: "T" + options.version,
                }),
                options),
        },

    addComment: ({ path, discussionActionCreator, tfsContext }: CommandsOptions) => (discussionActionCreator && {
        key: Commands.addComment,
        name: VCResources.AddCommentAction,
        title: VCResources.AddCommentAction,
        iconProps: getMenuIcon("bowtie-comment-add"),
        onClick: (event: React.MouseEvent<HTMLElement>) => {
            discussionActionCreator.createThreadAndNavigate({
                itemPath: path,
                comments: [{
                    isDirty: true,
                    author: {
                        id: tfsContext.currentIdentity.id,
                        displayName: tfsContext.currentIdentity.displayName,
                    },
                } as DiscussionComment],
                supportsMarkdown: true,
            } as DiscussionThread, true);
        },
    }),
};

function getExplorerFolderUrl({ repositoryContext, path, change }: CommandsOptions, routeData?: any) {
    const folder: string = (change && !change.item.isFolder) ? VersionControlPath.getFolderName(path) : path;
    return getExplorerUrl(repositoryContext, folder, null, null, routeData);
}

function getExplorerFileUrl({ repositoryContext, path }: CommandsOptions, routeData?: any) {
    return getExplorerUrl(repositoryContext, path, null, null, routeData);
}

const folderItemCommands: PullRequestCommandCreator[] = [
    creators.viewFolderInExplorer,
    creators.viewLatestFolderInExplorer,
];

const fileItemCommands: PullRequestCommandCreator[] = [
    creators.viewFileInExplorer,
    creators.viewLatestFileInExplorer,
    creators.viewHistory,
    creators.compareToPreviousVersion,
    creators.compareToLatestVersion,
    separator,
    VCFilesTreeCommands.download,
    separator,
    creators.addComment,
];

const fileItemAddedCommands: PullRequestCommandCreator[] = [
    creators.viewFileInExplorer,
    creators.viewLatestFileInExplorer,
    creators.viewHistory,
    creators.compareToLatestVersion,
    separator,
    VCFilesTreeCommands.download,
    separator,
    creators.addComment,
];

const fileItemDeletedCommands: PullRequestCommandCreator[] = [
    creators.addComment,
];

const threadItemCommands: PullRequestCommandCreator[] = [
];
