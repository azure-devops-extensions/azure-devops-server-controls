import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { compareCommands, GetCompareCommandsOptions } from "VersionControl/Scenarios/Explorer/Commands/CompareItemCommands";
import { create, separator, CommandFiltering, CommandCreator, makeDisabledOn } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import * as VCFilesTreeCommands from "VersionControl/Scenarios/Shared/Commands/FilesTreeCommands";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getFileExtension } from "VersionControl/Scripts/VersionControlPath";

export type ExplorerCommandUiSource =
    "command-bar" |
    "tree-context-menu" |
    "grid-context-menu";

export interface GetCommandsOptions extends GetCompareCommandsOptions {
    uiSource: ExplorerCommandUiSource;
    allowEditing: boolean;
    hasEditPermissions: boolean;
    isGit: boolean;
    isRoot: boolean;
    item: ItemModel;
    isCurrentItem: boolean;
    isEditing: boolean;
    isDirty: boolean;
    isNewFile: boolean;
    isTooBigToEdit?: boolean;
    isFullScreen?: boolean;
    tab?: string;
    actionCreator: ActionCreator;
    extraCommands: ExplorerCommandCreator[];
}

export function getCommands(options: GetCommandsOptions): IContextualMenuItem[] {
    const { item } = options;
    if (!item) {
        return [];
    }

    let commands: IContextualMenuItem[];
    if (isCommandBar(options) && options.tab === VersionControlActionIds.Compare) {
        commands = createWithExtra(compareCreators, options);
    } else if (isCommandBar(options) && !canDisplayEditCommandsInBar(options.tab)) {
        commands = [];
    } else {
        commands = item.isFolder
            ? getFolderCommands(options)
            : item.isSymLink
                ? []
                : getFileCommands(options);
    }

    if (isCommandBar(options)) {
        return CommandFiltering.exceptSeparators(commands);
    } else {
        return CommandFiltering.exceptUselessSeparators(commands);
    }
}

export function getSideCommands(options: GetCommandsOptions): IContextualMenuItem[] {
    const { tab, isFullScreen, actionCreator, isEditing } = options;
    let commands: IContextualMenuItem[];
    if (tab === VersionControlActionIds.Compare) {
        commands = create(compareSideCreators, options);
    } else if (isEditing) {
        commands = create(fileEditingSideCreators, options);
    } else {
        commands = [];
    }

    commands.push(getFullScreenCommand(isFullScreen, actionCreator));

    return commands;
}

function isCommandBar(options: GetCommandsOptions): boolean {
    return options.uiSource === "command-bar";
}

function canDisplayEditCommandsInBar(tab: string): boolean {
    return tab === VersionControlActionIds.Contents ||
        tab === VersionControlActionIds.Annotate ||
        tab === VersionControlActionIds.HighlightChanges ||
        tab === VersionControlActionIds.Preview;
}

function getFolderCommands(options: GetCommandsOptions): IContextualMenuItem[] {
    let commands = createWithExtra(folderCreators, options);

    if (options.isRoot) {
        commands = CommandFiltering.filterForbidden(commands, rootForbiddenCommands);
    }

    if (isCommandBar(options)) {
        commands = filterByCurrentItem(commands, options.isCurrentItem);
    }

    return commands;
}

function filterByCurrentItem(commands: IContextualMenuItem[], isCurrentItem: boolean) {
    if (isCurrentItem) {
        return CommandFiltering.filterAllowed(commands, displayedItemKeys);
    } else {
        return CommandFiltering.filterForbidden(commands, displayedItemKeys);
    }
}

function getFileCommands(options: GetCommandsOptions): IContextualMenuItem[] {
    const creators = options.isEditing && isCommandBar(options)
        ? fileEditingCreators
        : fileCreators;

    return createWithExtra(creators, options);
}

function createWithExtra(creators: ExplorerCommandCreator[], options: GetCommandsOptions) {
    if (options.extraCommands) {
        creators = options.extraCommands.concat(creators);
    }

    return create(creators, options);
}

namespace Keys {
    export const addNewItem = "addNewItem";
    export const uploadFile = "uploadFile";
    export const edit = "edit";
    export const rename = "rename";
    export const remove = "remove";
    export const save = "save";
    export const discard = "discard";
    export const fullScreen = "fullScreen";
}

const rootForbiddenCommands = [
    Keys.rename,
    Keys.remove,
];

const creators = {
    download: makeDisabledOn(
        ({ isEditing, isCurrentItem }) => isEditing && isCurrentItem,
        VCFilesTreeCommands.createDownload(
            ({ item, actionCreator, uiSource }: GetCommandsOptions) =>
                actionCreator.downloadFile(item.serverItem, uiSource))),

    downloadAsZip: VCFilesTreeCommands.createDownloadAsZip(
        ({ item, actionCreator, uiSource }: GetCommandsOptions) =>
            actionCreator.downloadZippedFolder(item.serverItem, uiSource)),

    addNewFileOrFolder: (options: GetCommandsOptions) =>
        options.hasEditPermissions && ({
            key: Keys.addNewItem,
            name: VCResources.AddNewItem,
            iconProps: { iconName: "Add" },
            disabled: !options.allowEditing,
            subMenuProps: {
                items: [
                    {
                        key: "addNewFile",
                        name: VCResources.File,
                        iconProps: { iconName: "TextDocument" },
                        onClick: () => options.actionCreator.promptAddNewFile(options.item.serverItem, options.uiSource),
                    },
                    {
                        key: "addNewFolder",
                        name: VCResources.Folder,
                        iconProps: { iconName: "FabricFolder" },
                        onClick: () => options.actionCreator.promptAddNewFolder(options.item.serverItem, options.uiSource),
                    },
                ],
            },
        }),

    uploadFile: ({ item, actionCreator, uiSource, allowEditing, hasEditPermissions }: GetCommandsOptions) =>
        hasEditPermissions && ({
            key: Keys.uploadFile,
            name: VCResources.UploadFiles,
            disabled: !allowEditing,
            iconProps: { iconName: "Upload" },
            onClick: () => actionCreator.promptUploadFiles(item.serverItem, uiSource),
        }),
    edit: ({ item, actionCreator, isEditing, isCurrentItem, isTooBigToEdit, uiSource, allowEditing, hasEditPermissions }: GetCommandsOptions) =>
        hasEditPermissions && ({
            key: Keys.edit,
            name: VCResources.EditFileContextMenuText,
            disabled: ((isEditing || isTooBigToEdit) && isCurrentItem) || !allowEditing || isBinary(item),
            iconProps: { iconName: "Edit" },
            onClick: () => actionCreator.editFile(item.serverItem, uiSource),
        }),
    rename: ({ item, actionCreator, isEditing, isCurrentItem, uiSource, allowEditing, hasEditPermissions }: GetCommandsOptions) =>
        hasEditPermissions && ({
            key: Keys.rename,
            name: VCResources.RenameItemMenuItem,
            disabled: (isEditing && isCurrentItem) || !allowEditing,
            iconProps: { iconName: "Rename" },
            onClick: () => actionCreator.promptRenameItem(item.serverItem, uiSource),
        }),
    remove: ({ item, actionCreator, isEditing, isCurrentItem, uiSource, allowEditing, hasEditPermissions }: GetCommandsOptions) =>
        hasEditPermissions && ({
            key: Keys.remove,
            name: VCResources.DeleteItemMenuItem,
            disabled: (isEditing && isCurrentItem) || !allowEditing,
            iconProps: { iconName: "Delete" },
            onClick: () => actionCreator.promptDeleteItem(item.serverItem, uiSource),
        }),
    save: ({ actionCreator, isGit, isDirty, isNewFile, uiSource }: GetCommandsOptions) => ({
        key: Keys.save,
        name: isGit ? VCResources.CommitCommandLabel : VCResources.CheckinCommandLabel,
        disabled: !isDirty && !isNewFile,
        iconProps: { iconName: "Save" },
        onClick: () => actionCreator.promptSaveEditingFile(uiSource),
    }),
    discard: ({ actionCreator, isDirty, uiSource }: GetCommandsOptions) => ({
        key: Keys.discard,
        name: isDirty ? VCResources.EditFileDiscard : VCResources.EditFileCancel,
        iconProps: { iconName: isDirty ? "Undo" : "Cancel" },
        onClick: () => actionCreator.discardEditingFile(uiSource),
    }),
};

export interface ExplorerCommandCreator extends CommandCreator<GetCommandsOptions> {}

const fileCreators: ExplorerCommandCreator[] = [
    creators.edit,
    creators.rename,
    creators.remove,
    separator,
    creators.download,
];

const fileEditingCreators: ExplorerCommandCreator[] = [
    creators.save,
    creators.discard,
];

const fileEditingSideCreators: ExplorerCommandCreator[] = [
    compareCommands.toggleInlineDiff,
];

const folderCreators: ExplorerCommandCreator[] = [
    creators.addNewFileOrFolder,
    creators.uploadFile,
    creators.rename,
    creators.remove,
    separator,
    creators.downloadAsZip,
];

const compareCreators: ExplorerCommandCreator[] = [
    compareCommands.originalVersion,
    compareCommands.modifiedVersion,
];

const compareSideCreators: ExplorerCommandCreator[] = [
    compareCommands.goToPreviousDiff,
    compareCommands.goToNextDiff,
    compareCommands.toggleInlineDiff,
];

const displayedItemKeys = [
    Keys.addNewItem,
    Keys.uploadFile,
    VCFilesTreeCommands.Keys.downloadAsZip,
];

export function getFullScreenCommand(isFullScreen: boolean, actionCreator: ActionCreator): IContextualMenuItem {
    return {
        key: Keys.fullScreen,
        name: isFullScreen ? VCResources.ExitFullScreenMode : VCResources.EnterFullScreenModeTooltip,
        iconOnly: true,
        iconProps: { iconName: isFullScreen ? "BackToWindow" : "FullScreen" },
        onClick: () => actionCreator.toggleFullScreen(!isFullScreen),
    };
}

export function hasFileExtension(item: ItemModel, extension: string): boolean {
    return localeIgnoreCaseComparer(getFileExtension(item.serverItem), extension) === 0;
}

function isBinary(item: ItemModel): boolean {
    return Boolean(item && item.contentMetadata && item.contentMetadata.isBinary);
}
