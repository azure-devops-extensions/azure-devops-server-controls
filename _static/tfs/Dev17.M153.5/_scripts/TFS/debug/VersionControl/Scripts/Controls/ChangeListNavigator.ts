import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Events_Services = require("VSS/Events/Services");

import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";

export class ChangeListNavigator {

    private static EVENT_SOURCE_CHANGED: string = "change-navigator-source-changed";
    private static EVENT_NAVIGATE: string = "change-navigator-navigate";

    private _eventManager: Events_Services.EventService;
    private _items: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[];

    private _fileItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[];
    private _fileIndicesByPath: { [path: string]: number; };

    private _threadItems: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[];
    private _threadIndicesByThreadId: { [threadId: string]: number; };

    constructor() {
        this._eventManager = Events_Services.getService();
        this._fileIndicesByPath = {};
        this._threadIndicesByThreadId = {};
        this._fileItems = [];
        this._threadItems = [];
    }

    public setChanges(items: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {

        this._items = items;
        this._fileItems = this._getFileItems(items);
        this._threadItems = this._getThreadItems(items);

        this._fileIndicesByPath = {};
        $.each(this._fileItems, (index: number, item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            this._fileIndicesByPath[item.path] = index;
        });

        this._threadIndicesByThreadId = {};
        $.each(this._threadItems, (index: number, item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            this._threadIndicesByThreadId["" + item.discussionThread.id] = index;
        });

        this._eventManager.fire(ChangeListNavigator.EVENT_SOURCE_CHANGED, this, null);
    }

    public addDiscussionViewMenuEntries(menuItems: any[], discussionManager: DiscussionOM.DiscussionManager, addSeparatorBeforeItems: boolean, addSeparatorAfterItems: boolean) {
        let showingComments: boolean;
        if (discussionManager.getAllThreads().length > 0) {
            if (addSeparatorBeforeItems) {
                menuItems.push({ separator: true });
            }
            showingComments = !discussionManager.getViewOptions().hideComments;
            menuItems.push({
                id: "show-comments",
                title: showingComments ? VCResources.HideCodeReviewComments : VCResources.ShowCodeReviewComments,
                icon: "bowtie-icon bowtie-comment-outline",
                showText: false,
                toggled: showingComments,
                action: () => {
                    discussionManager.toggleHideComments();
                }
            });
            if (addSeparatorAfterItems) {
                menuItems.push({ separator: true });
            }
            return true;
        }
        return false;
    }

    public addFileNavMenuEntries(menuItems: any[], itemPath: string, addSeparatorBeforeItems: boolean, addSeparatorAfterItems: boolean) {
        let index: number,
            foundFile = false,
            fileItemIndex: number,
            prevFile: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem,
            nextFile: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem;

        if (itemPath) {
            index = this._fileIndicesByPath[itemPath];
            if (index >= 0) {
                foundFile = true;
                fileItemIndex = this._fileItems[index].itemIndex;
                prevFile = this._fileItems[index - 1];
                nextFile = this._fileItems[index + 1];
            }
        }

        if (!foundFile) {
            nextFile = this._fileItems[0];
        }

        if (this._fileItems.length > 1) {
            if (addSeparatorBeforeItems) {
                menuItems.push({ separator: true });
            }
            menuItems.push({
                id: "prev-file",
                showText: false,
                icon: "bowtie-icon bowtie-triangle-left",
                title: VCResources.PreviousFileTooltip + (prevFile ? ("\r\n\r\n" + prevFile.path) : ""),
                disabled: prevFile ? false : true,
                action: () => {
                    this._navigateToItem(prevFile);
                }
            });

            menuItems.push({
                id: "next-file",
                showText: false,
                icon: "bowtie-icon bowtie-triangle-right",
                title: VCResources.NextFileTooltip + (nextFile ? ("\r\n\r\n" + nextFile.path) : ""),
                disabled: nextFile ? false : true,
                action: () => {
                    this._navigateToItem(nextFile);
                }
            });
            if (addSeparatorAfterItems) {
                menuItems.push({ separator: true });
            }
            return true;
        }

        return false;
    }

    public attachSourceChangedEvent(handler: () => void) {
        this._eventManager.attachEvent(ChangeListNavigator.EVENT_SOURCE_CHANGED, handler);
    }

    public detachSourceChangedEvent(handler: () => void) {
        this._eventManager.detachEvent(ChangeListNavigator.EVENT_SOURCE_CHANGED, handler);
    }

    public attachNavigateEvent(handler: (sender: ChangeListNavigator, item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => void) {
        this._eventManager.attachEvent(ChangeListNavigator.EVENT_NAVIGATE, handler);
    }

    public detachNavigateEvent(handler: (sender: ChangeListNavigator, item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => void) {
        this._eventManager.detachEvent(ChangeListNavigator.EVENT_NAVIGATE, handler);
    }

    private _getFileItems(items: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        return $.grep(items || [], (item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            return item.type === ChangeExplorerItemType.File && !VCOM.ChangeType.isSourceRenameDelete(item.change.changeType);
        });
    }

    private _getThreadItems(items: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem[]) {
        return $.grep(items || [], (item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) => {
            return item.isRootThreadItem;
        });
    }

    private _navigateToItem(item: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        this._eventManager.fire(ChangeListNavigator.EVENT_NAVIGATE, this, item);
    }
}
