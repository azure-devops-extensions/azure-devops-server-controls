import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { ActionCreator} from "Search/Scripts/React/ActionCreator";
import * as Search_Strings from "Search/Scripts/Resources/TFS.Resources.Search";
import { VersionControlType } from "Search/Scripts/Contracts/TFS.Search.Base.Contracts";
import {CodeUtils} from "Search/Scripts/Providers/Code/TFS.Search.CodeUtils";
import { copyToClipboard } from "VSS/Utils/Clipboard";
import { GitCommitVersionSpec, ChangesetVersionSpec} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getFileContentUrl } from "VersionControl/Scripts/VersionControlUrls";

export interface CommandsOptions {    
    item: any;
    actionCreator: ActionCreator;
}

interface CommandCreator {
    (options: CommandsOptions, index: number): IContextualMenuItem;
}

export namespace Keys {
    export const browseFile = "browseFile";
    export const download = "download";
    export const copyPath = "copyPath";
    export const linkToFile = "linkToFile";
}

export function getCommandsInContextMenu(options: CommandsOptions): IContextualMenuItem[] {
    const { item, actionCreator } = options;
    if (!item) {
        return [];
    }

    const commands = item.vcType !== VersionControlType.Custom
        ? create(nonSourceDepotResultCommandCreators, options)
        : create(sourceDepotResultCommandCreators, options);

    return commands;
}

export const creators = {
    browseFile: (options: CommandsOptions, index: number) => ({
        key: Keys.browseFile,
        name: Search_Strings.OpenFileInNewTab,
        iconProps: getMenuIcon("bowtie-arrow-open"),
        onClick: (ev?, item?: IContextualMenuItem) => {
            window.open(CodeUtils.constructLinkToContent(options.item), "_blank");
        }
    }),
    download: (options: CommandsOptions, index: number) => ({
        key: Keys.download,
        name: Search_Strings.DownloadFile,
        iconProps: getMenuIcon("bowtie-transfer-download"),
        onClick: (ev?, item?: IContextualMenuItem) => {
            executeDownloadCommand(options.item);
        }
    }),
    copyPath: (options: CommandsOptions, index: number) => ({
        key: Keys.copyPath,
        name: Search_Strings.CopyFilePath,
        iconProps: getMenuIcon("bowtie-copy-to-clipboard"),
        onClick: (ev?, item?: IContextualMenuItem) => {
            copyToClipboard(options.item.path);
        }
    }),
    linkToFile: (options: CommandsOptions, index: number) => ({
        key: Keys.linkToFile,
        name: Search_Strings.CopyFileURL,
        iconProps: getMenuIcon("bowtie-link"),
        onClick: (ev?, item?: IContextualMenuItem) => {
            copyToClipboard(CodeUtils.constructLinkToContent(options.item));
        }
    })
};

const nonSourceDepotResultCommandCreators: CommandCreator[] = [
    creators.browseFile,
    creators.download,
    creators.copyPath,
    creators.linkToFile
];

const sourceDepotResultCommandCreators: CommandCreator[] = [   
    creators.download,
    creators.copyPath
];

function getMenuIcon(name: string): IIconProps {
    return { className: "bowtie-icon " + name, iconName: undefined };
}

function create(creators: CommandCreator[], options: CommandsOptions): IContextualMenuItem[] {
    return creators
        .map((creator, index) => creator(options, index))
        .filter(command => command);
}

function executeDownloadCommand(item: any): void {
    let versionString: string,
        isGit = item.vcType === VersionControlType.Git,
        isTfvc = item.vcType === VersionControlType.Tfvc;
    
    versionString = isGit 
        ? (item.changeId 
            ? new GitCommitVersionSpec(item.changeId).toVersionString()
            : item.branch)
        : (isTfvc 
            ? new ChangesetVersionSpec(item.changeId).toVersionString()
            : "");

    // VC Supported scenario.
    if (isGit || isTfvc) {
        CodeUtils.getRepositoryContextForResult(item, (repositoryContext: any) => {
            let url = getFileContentUrl(repositoryContext, item.path, versionString);
            window.open(url, "_blank");
        }, ()=>{
            // Error scenario no-op for now.
        });
    }
    else {
        // Source depot scenario
        let url = CodeUtils.getOfflineFileDownloadUrl(item);
        window.open(url, "_blank");      
    }
}