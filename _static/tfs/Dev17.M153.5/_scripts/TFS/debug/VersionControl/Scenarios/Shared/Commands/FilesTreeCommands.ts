import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { create, separator, CommandCreator } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import { getTargetFilesHubId } from "VersionControl/Scripts/CodeHubContributionsHelper";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { getExplorerUrl, getFileContentUrl, getZippedContentUrl } from "VersionControl/Scripts/VersionControlUrls";

export namespace Keys {
    export const viewFolderInExplorer = "viewFolderInExplorer";
    export const viewFileInExplorer = "viewFileInExplorer";
    export const download = "download";
    export const downloadAsZip = "downloadAsZip";
}

export interface FilesTreeCommandsOptions {
    repositoryContext: RepositoryContext;
    path: string;
    version: string;
    isFolder: boolean;
    isGit: boolean;
    isFullPageNavigate: boolean;
    isShelveset: boolean;
}

export function getFilesTreeCommands(options: FilesTreeCommandsOptions): IContextualMenuItem[] {
    return create(options.isFolder ? folderItemCommands : fileItemCommands, options);
}

export const download = createDownload(
    ({ path, version, repositoryContext }: FilesTreeCommandsOptions) => {
        const url: string = getFileContentUrl(repositoryContext, path, version);
        window.location.href = url;
    });

export const downloadAsZip = createDownloadAsZip(
    ({ path, version, repositoryContext }: FilesTreeCommandsOptions) => {
        const url: string = getZippedContentUrl(repositoryContext, path, version);
        window.location.href = url;
    });

type FilesTreeCommandCreator = CommandCreator<FilesTreeCommandsOptions>;

const creators = {
    viewFolderInExplorer: createViewFolderInExplorer(
        ({ path, version, repositoryContext }) => getExplorerUrl(repositoryContext, path, null, { version })),

    viewFileInExplorer: createViewFileInExplorer(
        ({ path, version, repositoryContext }) => getExplorerUrl(repositoryContext, path, null, { version })),

    download,
    downloadAsZip,
};

const folderItemCommands: FilesTreeCommandCreator[] = [
    creators.viewFolderInExplorer,
    separator,
    creators.downloadAsZip,
];

const fileItemCommands: FilesTreeCommandCreator[] = [
    creators.viewFileInExplorer,
    separator,
    creators.download,
];

export function createViewFolderInExplorer<TCommandsOptions extends FilesTreeCommandsOptions>(getFolderUrl: (options: TCommandsOptions) => string) {
    return (options: TCommandsOptions) => !options.isShelveset && {
        key: Keys.viewFolderInExplorer,
        name: VCResources.ViewInFileExplorerMenu,
        iconProps: { iconName: "FabricFolder" },
        ...getNavigateToExplorerProps(getFolderUrl(options), options),
    } as IContextualMenuItem;
}

export function createViewFileInExplorer<TCommandsOptions extends FilesTreeCommandsOptions>(getFileUrl: (options: TCommandsOptions) => string) {
    return (options: TCommandsOptions) => !options.isShelveset && {
        key: Keys.viewFileInExplorer,
        name: VCResources.ViewInFileExplorerMenu,
        iconProps: { iconName: "TextDocument" },
        ...getNavigateToExplorerProps(getFileUrl(options), options),
    } as IContextualMenuItem;
}

export function createDownload<TCommandsOptions>(onClick: (options: TCommandsOptions) => void) {
    return (options: TCommandsOptions) => ({
        key: Keys.download,
        name: VCResources.DownloadFile,
        iconProps: { iconName: "Download" },
        onClick: () => onClick(options),
    } as IContextualMenuItem);
}

export function createDownloadAsZip<TCommandsOptions>(onClick: (options: TCommandsOptions) => void) {
    return (options: TCommandsOptions) => ({
        key: Keys.downloadAsZip,
        name: VCResources.DownloadAsZip,
        iconProps: { iconName: "Download" },
        onClick: () => onClick(options),
    } as IContextualMenuItem);
}

export function getNavigateToExplorerProps<TCommandsOptions extends FilesTreeCommandsOptions>(url: string, options: TCommandsOptions): Partial<IContextualMenuItem> {
    return {
        href: url,
        onClick: (event: React.MouseEvent<HTMLElement>) =>
            onFileHubNavigationHandler(event, options.repositoryContext, url, options.isFullPageNavigate),
    };
}

/**
 * Calculate the files hub, perform an XHR navigation with that hub ID, otherwise navigate via the window location.
 */
function onFileHubNavigationHandler(event: React.MouseEvent<HTMLElement>, repositoryContext: RepositoryContext, url: string, fullPageNavigation: boolean = false): void {
    const targetHubId = !fullPageNavigation && getTargetFilesHubId(repositoryContext);

    onClickNavigationHandler(event, targetHubId, url);
}
