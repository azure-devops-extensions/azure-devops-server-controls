import { IIconProps } from "OfficeFabric/Icon";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { copyToClipboard } from "VSS/Utils/Clipboard";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { isVCType, constructLinkToContent } from "Search/Scenarios/Code/Utils";
import { ItemCommandKeys } from "Search/Scenarios/Code/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

export interface CommandsOptions {
    item: CodeResult;

    onMenuItemInvoked?: (menuItem: IContextualMenuItem) => void;
}

interface CommandCreator {
    (options: CommandsOptions, index: number): IContextualMenuItem;
}

export function getCommandsInContextMenu(options: CommandsOptions): IContextualMenuItem[] {
    const { item } = options;
    if (!item) {
        return [];
    }

    const commands = isVCType(item.vcType)
        ? create(nonSourceDepotResultCommandCreators, options)
        : create(sourceDepotResultCommandCreators, options);

    return commands;
}

export const creators = {
    browseFile: (options: CommandsOptions, index: number) => ({
        key: ItemCommandKeys.browseFile,
        name: Resources.OpenFileInNewTabMenuItem,
        iconProps: getMenuIcon("bowtie-arrow-open"),
        onClick: (ev?, menuItem?: IContextualMenuItem) => {
            const { item, onMenuItemInvoked } = options;
            window.open(constructLinkToContent(item), "_blank");
            if (onMenuItemInvoked) {
                onMenuItemInvoked(menuItem);
            }
        }
    }),
    download: (options: CommandsOptions, index: number) => ({
        key: ItemCommandKeys.download,
        name: Resources.DownloadText,
        iconProps: getMenuIcon("bowtie-transfer-download"),
        data: {
            item: options.item
        },
        onClick: (ev?, menuItem?: IContextualMenuItem) => {
            const { onMenuItemInvoked } = options;

            if (onMenuItemInvoked) {
                onMenuItemInvoked(menuItem);
            };
        }
    }),
    copyPath: (options: CommandsOptions, index: number) => ({
        key: ItemCommandKeys.copyPath,
        name: Resources.CopyFilePathMenuItem,
        iconProps: getMenuIcon("bowtie-copy-to-clipboard"),
        onClick: (ev?, menuItem?: IContextualMenuItem) => {
            const { item, onMenuItemInvoked } = options;
            copyToClipboard(item.path);
            if (onMenuItemInvoked) {
                onMenuItemInvoked(menuItem);
            }
        }
    }),
    linkToFile: (options: CommandsOptions, index: number) => ({
        key: ItemCommandKeys.linkToFile,
        name: Resources.CopyFileURLMenuItem,
        iconProps: getMenuIcon("bowtie-link"),
        onClick: (ev?, menuItem?: IContextualMenuItem) => {
            const { item, onMenuItemInvoked } = options;
            copyToClipboard(constructLinkToContent(item));
            if (onMenuItemInvoked) {
                onMenuItemInvoked(menuItem);
            }
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
