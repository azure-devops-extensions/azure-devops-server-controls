// TODO Task - 933297 [Refactor] ItemCommands to be refactored so that major logic exists at one place
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import { WikiPage } from "TFS/Wiki/Contracts";
import { ViewActionCreator } from "Wiki/Scenarios/Overview/ViewActionCreator";
import { bowtieIcon, getDepthOfPage } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { isPageWithoutAssociatedContent, isTemplate } from "Wiki/Scripts/WikiPagesHelper";

export interface CommandsOptions {
    actionCreator: ViewActionCreator;
    item: WikiPage;
    canEditWiki: boolean;
    isCurrentItem?: boolean;
    isEditing?: boolean;
    isCodeWiki?: boolean;
}

export function getTreeItemCommands(options: CommandsOptions): IContextualMenuItem[] {
    if (options.canEditWiki) {
        return options.isCodeWiki ? create(codeWikiTreeItemCommands, options) : create(treeItemCommands, options);
    }
    return create(readonlyTreeItemCommands, options);
}

namespace Commands {
    export const openInNewTab = "openInNewTab";
    export const editPage = "editPage";
    export const deletePage = "deletePage";
    export const favoritePage = "favoritePage";
    export const viewHistory = "viewHistory";
    export const addSubPage = "addSubPage";
    export const copyPagePath = "copyPagePath";
    export const linkWorkItems = "linkWorkItems";
    export const setAsHomePage = "setAsHomePage";
    export const cloneWiki = "cloneWiki";
    export const wikiSecurity = "wikiSecurity";
    export const movePageTo = "movePageTo";
    export const printPage = "printPage";
    export const getPageId = "getPageId";
}

interface CommandCreator {
    (options: CommandsOptions, index?: number): IContextualMenuItem;
}

function create(creators: CommandCreator[], options: CommandsOptions): IContextualMenuItem[] {
    return creators
        .map((creator: CommandCreator, index: number) => creator(options, index))
        .filter((command: IContextualMenuItem) => {
            switch (command.key) {
                // We do not support print in firefox because of the issue: http://kb.mozillazine.org/Problems_printing_web_pages
                case Commands.printPage:
                    return !BrowserCheckUtils.isFirefox();
                case Commands.getPageId:
                    return WikiFeatures.isGetWikiPageIdFeatureEnabled();
                default:
                    return true; 
            }
        });
}

const separatorName = "-";
const creators = {
    separator: (options: CommandsOptions, index: number) => ({
        key: "separator" + index,
        name: separatorName,
    }),
    openInNewTab: ({ item, actionCreator, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.openInNewTab,
        iconProps: bowtieIcon("bowtie-browser-tab"),
        name: WikiResources.OpenInNewTab,
        className: "wiki-open-newtab",
        disabled: item.isNonConformant,
        onClick: () => { actionCreator.openInNewTab(item.path); },
    }),
    editPage: ({ item, actionCreator, isCurrentItem, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.editPage,
        name: WikiResources.EditCommand,
        iconProps: bowtieIcon("bowtie-edit-outline"),
        className: "wiki-edit",
        disabled: (isCurrentItem && isEditing) || isPageWithoutAssociatedContent(item),
        onClick: () => { actionCreator.editPage(item.path); },
    }),
    deletePage: ({ item, actionCreator, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.deletePage,
        name: WikiResources.DeleteCommand,
        iconProps: bowtieIcon("bowtie-trash"),
        className: "wiki-delete",
        disabled: isEditing || isTemplate(item.path),
        onClick: () => { actionCreator.promptDeletePageDialog(item.path); },
    }),
    viewHistory: ({ item, actionCreator, isCurrentItem, isEditing }: CommandsOptions) => ({
        key: Commands.viewHistory,
        name: WikiResources.ViewRevisionsCommand,
        iconProps: bowtieIcon("bowtie-navigate-history"),
        className: "wiki-view-revisions",
        disabled: (isCurrentItem && isEditing) || isPageWithoutAssociatedContent(item),
        onClick: () => { actionCreator.viewPageHistory(item.path); },
    }),
    addSubPage: ({ item, actionCreator, isCurrentItem, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.addSubPage,
        name: WikiResources.AddSubPageCommand,
        iconProps: bowtieIcon("bowtie-math-plus-light"),
        className: "wiki-add-sub-page",
        disabled: (isCurrentItem && isEditing) || isTemplate(item.path),
        onClick: () => { actionCreator.addPage(item.path); },
    }),
    movePageTo: ({ item, actionCreator, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.movePageTo,
        name: WikiResources.MovePageCommand,
        iconProps: bowtieIcon("bowtie-arrow-import"),
        className: "wiki-move-page-to",
        disabled: isEditing || isTemplate(item.path),
        onClick: () => { actionCreator.promptMovePagePickerDialog(item); },
    }),
    copyPagePath: ({ item, actionCreator, isCurrentItem, isEditing }: CommandsOptions) => ({
        key: Commands.copyPagePath,
        name: WikiResources.CopyPagePathCommand,
        iconProps: bowtieIcon("bowtie-edit-copy"),
        className: "wiki-copy-path",
        disabled: (isCurrentItem && isEditing) || isPageWithoutAssociatedContent(item) || isTemplate(item.path),
        onClick: () => { actionCreator.copyPagePathToClipboard(item.path); },
    }),
    linkWorkItems: ({ item, actionCreator, isCurrentItem, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.linkWorkItems,
        name: WikiResources.LinkWorkItemsCommand,
        iconProps: bowtieIcon("bowtie-link"),
        className: "wiki-link-work-items",
        disabled: isEditing || isTemplate(item.path),
        onClick: () => { actionCreator.promptLinkWorkItemsDialog(item); },
    }),
    printPage: ({ item, actionCreator, isCurrentItem, isEditing }: CommandsOptions) => ({
        key: Commands.printPage,
        name: WikiResources.WikiPrintCommand,
        iconProps: bowtieIcon("bowtie-print"),
        className: "wiki-print-page",
        disabled: isEditing || !isCurrentItem || isTemplate(item.path),
        onClick: () => actionCreator.promptPrintPage(),
    }),
    setAsHome: ({ item, actionCreator, isEditing, canEditWiki }: CommandsOptions) => ({
        key: Commands.setAsHomePage,
        name: WikiResources.SetAsHomeCommand,
        iconProps: bowtieIcon("bowtie-home"),
        className: "wiki-set-as-home",
        disabled: (getDepthOfPage(item.path) === 1 && !item.order)
        || isEditing
        || isPageWithoutAssociatedContent(item)
        || isTemplate(item.path), 
        onClick: () => actionCreator.setAsHomePage(item.path),
    }),
    wikiSecurity: ({ item, actionCreator }: CommandsOptions) => ({
        key: Commands.wikiSecurity,
        name: WikiResources.WikiSecurityCommand,
        iconProps: bowtieIcon("bowtie-security"),
        onClick: () => { actionCreator.showWikiSecurityDialog(); },
    }),
    getPageId: ({ item, actionCreator }: CommandsOptions) => ({
        key: Commands.getPageId,
        name: "Get Page Id",
        iconProps: bowtieIcon("bowtie-browser-tab"),
        onClick: () => { actionCreator.getPageIds(item.path); },
    }),
};

const treeItemCommands: CommandCreator[] = [
    creators.openInNewTab,
    creators.viewHistory,
    creators.copyPagePath,
    creators.printPage,
    creators.separator,
    creators.editPage,
    creators.deletePage,
    creators.addSubPage,
    creators.movePageTo,
    creators.linkWorkItems,
    creators.separator,
    creators.setAsHome,
    creators.getPageId,
];

const codeWikiTreeItemCommands: CommandCreator[] = [
    creators.openInNewTab,
    creators.viewHistory,
    creators.printPage,
    creators.separator,
    creators.editPage,
    creators.linkWorkItems,
    creators.getPageId,
];

const readonlyTreeItemCommands: CommandCreator[] = [
    creators.openInNewTab,
    creators.viewHistory,
    creators.printPage,
];