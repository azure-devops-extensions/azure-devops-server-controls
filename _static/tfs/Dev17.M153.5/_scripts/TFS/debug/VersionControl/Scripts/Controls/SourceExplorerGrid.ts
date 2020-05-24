/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import ControlsCommon = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import FileInput = require("VSS/Controls/FileInput");
import Grids = require("VSS/Controls/Grids");
import VSS = require("VSS/VSS");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCUIContracts = require("TFS/VersionControl/UIContracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {GitClientService} from "VersionControl/Scripts/GitClientService"
import {TfvcClientService} from "VersionControl/Scripts/TfvcClientService"
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingDialogs = require("VersionControl/Scripts/Controls/SourceEditingDialogs");
import VCSourceEditingMenuItems = require("VersionControl/Scripts/Controls/SourceEditingMenuItems");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import TFS_Dashboards_PushToDashboard = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");
import VCSourceExplorerGridOrTreeMenuItemClickedEvent = require("VersionControl/Scripts/SourceExplorerGridOrTreeMenuItemClickedEvent");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";

import CommonMenuItems = ControlsCommon.CommonMenuItems;
import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class Grid extends Grids.GridO<any> {
    private _customerIntelligenceData: CustomerIntelligenceData;

    private static _nameColumn: any = {
        index: "name",
        text: VCResources.FileListColumnName,
        width: 400,
        hrefIndex: "href",
        comparer: function (column, order, item1, item2) {
            if (item1.root) {
                return order === "desc" ? 1 : -1; // we want root always first item
            }
            else if (item2.root) {
                return order === "desc" ? -1 : 1; // we want root always first item
            }

            if (item1.isFolder) {
                if (!item2.isFolder) {
                    // folders are first in asc, last in desc
                    return -1;
                }
            }
            else if (item2.isFolder) {
                // folders are first in asc, last in desc
                return 1;
            }

            return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
        },
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            let $cell: JQuery = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

            let item = this._dataSource[dataIndex];

            // Prepend the item's icon in the Name column instead of putting it in the gutter.
            if (item && item.icon) {
                $cell.prepend($(domElem("span", "vc-file-list-item-icon " + item.icon)));
            }

            if (item && this._isEditableVersion && item.isFolder && !item.root) {
                FileInput.FileDropTarget.makeDropTarget($cell, {
                    dropCallback: (dataDrop: DataTransfer) => {
                        VCSourceEditingDialogs.Actions.showAddNewItemsUI(this._repository, item.serverItem, this._version, dataDrop, false, true);
                    },
                    dragEnterCallback: (dragEnterEvent: JQueryEventObject) => {
                        // Clear the grid's droppable effect when on this specific folder and prevent propagation of the event
                        this._clearDroppableEffect();
                        return true;
                    }
                });
            }
            return $cell;
        }
    };
    private static _commentColumn: any = {
        index: "comment",
        text: VCResources.FileListColumnComments,
        canSortBy: false,
        width: 600,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            let cell;
            let cellDom;
            let width = column.width || 20;
            let item = this._dataSource[dataIndex];
            let actionUrl;
            let comment = item.comment || "";
            let displayName = item.ownerDisplayName || "";
            
            if (displayName && this._repository.getRepositoryType() === RepositoryType.Git) {
                displayName = ChangeListIdentityHelper.getUserNameWithoutEmail(displayName);
            }

            cellDom = domElem("div", "grid-cell");
            cellDom.style.width = isNaN(width) ? width : width + "px";
            cell = $(cellDom);

            if (comment || item.ownerDisplayName) {
                cell.addClass('comment-column');

                if (item.commitId) {
                    cell.attr('title', Utils_String.format('{0}: ({1})', item.commitId.short, item.ownerDisplayName));
                    actionUrl = VersionControlUrls.getCommitUrl(<GitRepositoryContext>this._repository, item.commitId.full);
                }
                else {
                    cell.attr('title', Utils_String.format('{0}: ({1}) \r\n{2}', item.changeset, item.ownerDisplayName, comment));
                    actionUrl = VersionControlUrls.getChangesetUrl(item.changeset, this._options.tfsContext);
                }

                $(domElem('a')).appendTo(cell)
                    .attr("href", actionUrl)
                    .text(VCCommentParser.Parser.getChangeListDescription(item, true));
                $(domElem('span')).appendTo(cell)
                    .addClass('checkin-committer')
                    .attr('title', Utils_String.format(VCResources.ChangedByTooltip, item.owner))
                    .text(Utils_String.format(' - {0}', displayName));
                column.maxLength = Math.max(column.maxLength || 0, cell.text().length);
            }
            else {
                // add non-breaking whitespace to ensure the cell has the same height as non-empty cells
                cell.html("&nbsp;");
            }
            return cell;
        }
    };
    private static _changeDateColumn: any = {
        index: "changeDate",
        text: VCResources.FileListColumnLastChange,
        width: 110,
        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            let cell,
                cellDom,
                width = column.width || 20,
                value = this._dataSource[dataIndex][column.index],
                changeDateText;

            cellDom = domElem("div", "grid-cell");
            cellDom.style.width = isNaN(width) ? width : width + "px";
            cell = $(cellDom);

            if (value) {
                cell.attr("title", Utils_Date.localeFormat(value, "F"));
                changeDateText = Utils_Date.friendly(value);
                cell.text(changeDateText);
                column.maxLength = Math.max(column.maxLength || 0, changeDateText.length);
            }
            else {
                // add non-breaking whitespace to ensure the cell has the same height as non-empty cells
                cell.html("&nbsp;");
            }
            return cell;
        },
        comparer: function (column, order, item1, item2) {
            if (item1.root) {
                return order === "desc" ? 1 : -1; // we want root always first item
            }
            else if (item2.root) {
                return order === "desc" ? -1 : 1; // we want root always first item
            }

            if (item1.isFolder) {
                if (!item2.isFolder) {
                    // folders are first
                    return -1;
                }
            }
            else if (item2.isFolder) {
                // folders are first
                return 1;
            }

            return item1.changeDate - item2.changeDate;
        }
    };

    private _repository: RepositoryContext;
    private _version: string;
    private _isEditableVersion: boolean;
    private _folder: VCLegacyContracts.ItemModel;
    private _dropTargetEnhancement: FileInput.FileDropTarget;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "version-control-file-list",
            useBowtieStyle: true,
            allowMoveColumns: false,
            allowMultiSelect: false,
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                columnIndex: "name",
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick),
                contributionIds: ["ms.vss-code-web.source-item-menu", "ms.vss-code-web.source-grid-item-menu"]
            },
            openRowDetail: {
                hrefIndex: "href"
            },
            columns: [Grid._nameColumn, Grid._changeDateColumn],
            sortOrder: [{ index: "name", order: "asc" }]
        }, options));

        if (this._options.customerIntelligenceData) {
            this._customerIntelligenceData = this._options.customerIntelligenceData.clone();
            this._customerIntelligenceData.properties["ParentControl"] = "SourceExplorerGrid";
        }
    }

    public setSource(repository: RepositoryContext, folder: VCLegacyContracts.ItemModel, version: string) {
        let i, l, datasource, item, path,
            versions;

        this._repository = repository;
        this._version = version;
        this._folder = folder;
        this._isEditableVersion = VCSourceEditing.EditingEnablement.showEditingActions(repository, version);
        this._setupDropTarget();

        datasource = [];

        if (folder.serverItem && folder.serverItem !== repository.getRootPath() && folder.serverItem !== "$/") {
            item = $.extend({
                root: true,
                icon: "bowtie-icon bowtie-arrow-up ",
                name: "[..]",
                noContextMenu: true,
                href: VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, VersionControlPath.getFolderName(folder.serverItem), version)
            }, folder);

            datasource.push(item);
        }

        if (folder.childItems) {
            versions = [];
            for (i = 0, l = folder.childItems.length; i < l; i++) {
                item = $.extend({}, folder.childItems[i]);

                if (repository.getRepositoryType() === RepositoryType.Tfvc && !item.isFolder) {
                    versions.push(item.version);
                }

                if (item.isFolder) {
                    item.icon = "bowtie-icon bowtie-folder";
                }
                else {
                    item.icon = "bowtie-icon " + VCFileIconPicker.getIconNameForFile(item.serverItem);
                }

                if (item.isBranch) {
                    item.icon = "bowtie-icon bowtie-tfvc-branch";
                }
                else if (item.gitObjectType === VCOM.GitObjectType.Commit) {
                    item.icon = "bowtie-icon bowtie-repository-submodule";
                }
                else if (item.isSymLink) {
                    item.icon = "bowtie-icon bowtie-file-symlink";
                }

                path = item.serverItem;
                item.name = VersionControlPath.getFileOrFolderDisplayName(item, folder.serverItem);
                item.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, path, version);
                item.change = VCOM.ChangeType.getDisplayText(item.changeType);

                item.getContributionContext = this._getContributionContextFunc(item, repository, version);

                datasource[datasource.length] = item;
            }

            if (repository.getRepositoryType() === RepositoryType.Tfvc && versions.length) {
                this.delayExecute("fetchCheckinComments", 1000, true, delegate(this, () => {
                    (<TfvcClientService>repository.getClient()).beginGetChangesets(folder.serverItem, version, delegate(this, this._populateCheckinComments));
                }));
            }
            else if (repository.getRepositoryType() === RepositoryType.Git) {
                (<GitClientService>repository.getClient()).beginGetCommitItems((<GitRepositoryContext>repository).getRepository(), version, folder.serverItem, (commits: VCLegacyContracts.GitCommit[]) => {
                    if (this._folder.serverItem === folder.serverItem) {
                        this._populateCommitItemMetadata(commits);
                    }
                });
            }
        }

        this._options.columns = [Grid._nameColumn, Grid._changeDateColumn, Grid._commentColumn];
        this._options.source = datasource;
        this._options.sortOrder = this._sortOrder;
        this.initializeDataSource();
        this._trySorting(this._options.sortOrder);
    }

    private _getContributionContextFunc(item: any, repository: RepositoryContext, version: string): () => VCUIContracts.SourceItemContext {
        return (): VCUIContracts.SourceItemContext => {
            let contextItem: VCUIContracts.ISourceItem;
            let currentRepoType = repository.getRepositoryType();
            let context = <VCUIContracts.SourceItemContext>{};
            context.version = VCSpecs.VersionSpec.parse(version).toDisplayText();
            if (currentRepoType === RepositoryType.Git) {
                contextItem = {
                    isFolder: (item.isFolder || item.folder) ? true : false,
                    isSymLink: item.isSymLink ? true : false,
                    path: item.serverItem,
                    url: item.url,
                    sourceProvider: "Git",
                    item: <VCContracts.GitItem>{
                        commitId: item.commitId ? (item.commitId.full ? item.commitId.full : item.commitId) : null,
                        gitObjectType: <VCContracts.GitObjectType>item.gitObjectType,
                        latestProcessedChange: null,
                        objectId: item.objectId ? (item.objectId.full ? item.objectId.full : item.objectId) : null,
                    },
                    _links: null,
                    content: null,
                    contentMetadata: null,
                };
                context.gitRepository = repository.getRepository();
            } else if (currentRepoType === RepositoryType.Tfvc) {
                contextItem = {
                    isFolder: (item.isFolder || item.folder) ? true : false,
                    isSymLink: item.isSymLink ? true : false,
                    path: item.serverItem,
                    url: item.url,
                    sourceProvider: "Tfvc",
                    item: <VCContracts.TfvcItem>{
                        changeDate: new Date(item.changeDate),
                        deletionId: item.deletionId ? item.deletionId : null,
                        isBranch: item.isBranch ? true : false,
                        isPendingChange: item.isPendingChange ? true : false,
                        version: item.versionDescription
                    },
                    _links: null,
                    content: null,
                    contentMetadata: null,
                };
                context.gitRepository = null;
            }
            context.item = contextItem;
            return context;
        };
    }

    public getSelectedItem(): VCLegacyContracts.ItemModel {
        return this._dataSource[this._selectedIndex];
    }

    public setSelectedPath(path) {
        let item = this.getSelectedItem(), i, l;

        if (item && this._repository.comparePaths(item.serverItem, path) === 0) {
            return;
        }
        else {
            for (i = 0, l = this._dataSource.length; i < l; i++) {
                item = this._dataSource[i];
                if (this._repository.comparePaths(item.serverItem, path) === 0) {
                    this.setSelectedRowIndex(i);
                    this.getSelectedRowIntoView();
                }
            }
        }
    }

    public _clearDroppableEffect() {
        this._element.removeClass("grid-container-drop-on");
    }

    private _setupDropTarget() {
        if (this._isEditableVersion && !this._dropTargetEnhancement) {
            this._dropTargetEnhancement = FileInput.FileDropTarget.makeDropTarget(this._element, {
                dropCallback: (dataDrop: DataTransfer) => {
                    VCSourceEditingDialogs.Actions.showAddNewItemsUI(this._repository, this._folder.serverItem, this._version, dataDrop, false, true);
                },
                dragOverCssClass: "grid-container-drop-on"
            });
        }
        else if (!this._isEditableVersion && this._dropTargetEnhancement) {
            this._dropTargetEnhancement.dispose();
        }
    }

    private _populateCommitItemMetadata(entries) {
        let itemMap = [];

        $.each(entries, (i, entry) => {
            itemMap[entry.item.serverItem] = {
                comment: VCCommentParser.Parser.getShortComment(entry.comment),
                owner: entry.owner,
                ownerDisplayName: entry.ownerDisplayName,
                commitId: entry.commitId,
                changeDate: entry.item.changeDate
            };
        });

        $.each(this._options.source, (i, item) => {
            this._options.source[i] = $.extend(item, this._findInItemMap(item.serverItem, itemMap));
        });

        this.layout();

        if (this._options.onLatestChangesLoaded) {
            this._options.onLatestChangesLoaded();
        }
    }

    private _findInItemMap(path: string, itemMap) {
        let lastSlashIndex: number;

        let mappedItem = itemMap[path];

        // If the mapped item was not found because the path argument
        // is a combined, nested folder path (/folder1/folder2/folder3/folder4),
        // attempt to find the mapped item by the longest possible segment of the path (/folder1/folder2).
        while (!mappedItem && path.length > 2 && (lastSlashIndex = path.lastIndexOf('/')) > 1) {
            path = path.substr(0, lastSlashIndex);
            mappedItem = itemMap[path];
        }

        return mappedItem;
    }

    private _populateCheckinComments(changesets) {
        let changesetMap = {};

        $.each(changesets, (i, item) => {
            changesetMap[item.version] = item;
        });

        $.each(this._options.source, (i, item) => {
            if (!item.isFolder) {
                this._options.source[i] = $.extend(item, changesetMap[item.changeset]);
            }
            else {
                // Clear Loading text
                delete this._options.source[i].comment;
            }
        });

        this.layout();

        if (this._options.onLatestChangesLoaded) {
            this._options.onLatestChangesLoaded();
        }
    }

    private _getContextMenuItems(contextInfo) {
        let menuItems = [],
            item: VCLegacyContracts.ItemModel = contextInfo.item;

        const viewContentAction = () => {
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERGRID_VIEW_CONTENT, {}));
            window.open(VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, item.serverItem, this._version), "_self");
            return false;
        };

        if (item.isFolder) {
            if (this._isEditableVersion) {
                menuItems.push({
                    id: "view-folder",
                    text: VCResources.OpenFolderMenuItem,
                    title: VCResources.OpenFolderMenuItem,
                    action: viewContentAction,
                    groupId: "viewing"
                });
                menuItems.push({ separator: true });
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getAddNewFileMenuItem(this._repository, item.serverItem, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getRenameMenuItem(this._repository, item.serverItem, this._version, item.isFolder, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getDeleteMenuItem(this._repository, item.serverItem, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push({ separator: true });
            }
        }
        else {
            menuItems.push({
                id: "view",
                text: VCResources.ViewContents,
                title: VCResources.ViewContents,
                action: viewContentAction,
                groupId: "viewing"
            });

            if (this._isEditableVersion) {
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getEditFileMenuItem(this._repository, item.serverItem, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
            }

            menuItems.push({ separator: true });

            if (this._isEditableVersion) {
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getRenameMenuItem(this._repository, item.serverItem, this._version, item.isFolder, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push(VCSourceEditingMenuItems.MenuItems.getDeleteMenuItem(this._repository, item.serverItem, this._version, { customerIntelligenceData: this._customerIntelligenceData }));
                menuItems.push({ separator: true });
            }
        }

        menuItems.push({
            id: "view-history",
            icon: "bowtie-icon bowtie-navigate-history",
            text: VCResources.ViewHistory,
            title: VCResources.ViewHistory,
            action: () => {
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERGRID_VIEW_HISTORY, {}));
                window.open(VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.History, item.serverItem, this._version), "_self");
                return false;
            },
            groupId: "viewing"
        });

        if (!item.isFolder && !item.isSymLink) {
            menuItems.push({
                id: "download",
                text: VCResources.DownloadFile,
                title: VCResources.DownloadFile,
                icon: "bowtie-icon bowtie-transfer-download",
                action: () => {
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERGRID_DOWNNLOAD, {}));
                    window.open(VersionControlUrls.getFileContentUrl(this._repository, item.serverItem, this._version), "_blank");
                    return false;
                },
                groupId: "actions"
            });

            if (item.serverItem.split('.').pop().toLowerCase() === "md") {
                menuItems.push({ separator: true });
                this._buildDashboardMenuEntry(menuItems,
                    JSON.stringify({
                        path: item.serverItem,
                        version: this._version,
                        repositoryId: this._repository.getRepositoryId()
                    }));
            }
        }
        else if (item.isFolder) {
            menuItems.push({
                id: "downloadAsZip",
                text: VCResources.DownloadAsZip,
                icon: "bowtie-icon bowtie-transfer-download",
                action: () => {
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SOURCEEXPLORERGRID_DOWNNLOAD_AS_ZIP, {}));
                    window.open(VersionControlUrls.getZippedContentUrl(this._repository, item.serverItem, this._version), "_blank");
                    return false;
                },
                groupId: "actions"
            });
        }

        if (this._repository && this._repository.getRepositoryType() === RepositoryType.Tfvc) {
            menuItems.push({ separator: true });
            menuItems.push(CommonMenuItems.security());
        }

        return menuItems;
    }

    private _buildDashboardMenuEntry(menuItems: any[], artifactId: string): void {
        menuItems.push({ separator: true });
        let widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning("Pinned Markdown", TFS_Dashboards_PushToDashboardConstants.Markdown_WidgetTypeID, artifactId);
        //Create the main menu for pinning to dashboard and do an Ajax call to get submenu
        let mainMenuWithSubMenus = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.getDefault().contextData, widgetData);
        menuItems.push(mainMenuWithSubMenus);
    }

    private _onMenuItemClick(e?: any): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />
        let command = e.get_commandName();
        let commandArgs = e.get_commandArgument();
        if (command === TFS_Dashboards_PushToDashboardConstants.PinToDashboardCommand) {
            TFS_Dashboards_PushToDashboard.PushToDashboard.pinToDashboard(TfsContext.getDefault().contextData, commandArgs);
        }

        let item = this.getSelectedItem(),
            evt: any;

        evt = e;

        evt._commandArgument = <VCSourceExplorerGridOrTreeMenuItemClickedEvent.Arguments>{
            item: {
                path: item.serverItem,
                title: item.serverItem
            }
        };

        this._fire(VCSourceExplorerGridOrTreeMenuItemClickedEvent.name, evt);
    }
}

VSS.classExtend(Grid, TfsContext.ControlExtensions);
