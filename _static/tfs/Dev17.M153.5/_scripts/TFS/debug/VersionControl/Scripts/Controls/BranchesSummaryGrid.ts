import Grids = require("VSS/Controls/Grids");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCBranchesContextMenuItems = require("VersionControl/Scripts/BranchesContextMenuItems");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export class SummaryGrid extends Grids.GridO<any> {

    private _repositoryContext: RepositoryContext;
    private _contextActionId: string;

    private static _defaultStringComparer(column, order, item1, item2) {
        let compare = SummaryGrid._compareBaseCommit(order, item1, item2);
        if (!compare) {
            compare = Utils_String.localeIgnoreCaseComparer(item1[column.index], item2[column.index]);
        }
        return compare;
    }

    private static _defaultComparer(column, order, item1, item2) {
        let compare = SummaryGrid._compareBaseCommit(order, item1, item2);
        if (!compare) {
            compare = item1[column.index] - item2[column.index];
        }
        return compare;
    }

    private static _compareBaseCommit(order, item1, item2) {
        if (item1.isBaseCommit) {
            return order === "asc" ? -1 : 1;
        }
        else if (item2.isBaseCommit) {
            return order === "asc" ? 1 : -1;
        }
        else {
            return 0;
        }
    }

    public initializeOptions(options?: any) {

        let enabledEvents = {};
        enabledEvents[Grids.GridO.EVENT_ROW_UPDATED] = true;
        this._repositoryContext = options.repositoryContext;
        this._contextActionId = options.contextActionId;

        super.initializeOptions($.extend({
            cssClass: 'vc-branch-summary-grid',
            allowMultiSelect: false,
            useBowtieStyle: true,
            sortOrder: [{
                index: 'commitTime',
                order: 'desc'
            }],
            openRowDetail: {
                hrefIndex: "href"
            },
            gutter: {
                contextMenu: true
            },
            contributionIds: ["ms.vss-code-web.git-branches-summary-grid-menu"],
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick),
                contributionIds: ["ms.vss-code-web.git-branches-summary-grid-diff-menu"],
                columnIndex: "name"
            },
            columns: <any[]>[
                {
                    index: 'name',
                    text: VCResources.BranchSummaryBranchColumn,
                    width: 200,
                    hrefIndex: 'href',
                    comparer: SummaryGrid._defaultStringComparer
                },
                {
                    index: 'committer',
                    text: VCResources.BranchSummaryUpdatedByColumn,
                    width: 300,
                    getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                        return this._dataSource[dataIndex].committer.displayName || this._dataSource[dataIndex].committer.id;
                    },
                    comparer: function (column, order, item1, item2) {
                        let compare = SummaryGrid._compareBaseCommit(order, item1, item2);
                        if (!compare) {
                            compare = Utils_String.localeIgnoreCaseComparer((item1.committer.displayname || item1.committer.id), (item2.committer.displayname || item2.committer.id));
                        }
                        return compare;
                    }
                },
                {
                    index: 'commitTime',
                    text: VCResources.BranchSummaryUpdatedDateColumn,
                    getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                        return Utils_Date.ago(this._dataSource[dataIndex].committer.date);
                    },
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        let cell = this._drawCell.apply(this, arguments);
                        cell.attr('title', Utils_Core.convertValueToDisplayString(this.getColumnValue(dataIndex, column.index, columnOrder)));
                        return cell;
                    },
                    comparer: SummaryGrid._defaultComparer
                },
                {
                    index: 'behindCount',
                    text: VCResources.BranchSummaryBehindColumn,
                    rowCss: 'behind-count-cell',
                    getCellContents: this._drawBarBackground,
                    headerCss: 'behind-count-header',
                    comparer: SummaryGrid._defaultComparer,
                    canMove: false
                },
                {
                    index: 'aheadCount',
                    text: VCResources.BranchSummaryAheadColumn,
                    rowCss: 'ahead-count-cell',
                    getCellContents: this._drawBarBackground,
                    comparer: SummaryGrid._defaultComparer,
                    canMove: false
                }],
            enabledEvents: enabledEvents
        }, options));
    }

    public initialize() {
        super.initialize();

        this._bind(Grids.GridO.EVENT_ROW_UPDATED, (event, rowInfo) => {
            let rowData = this.getRowData(rowInfo.dataIndex);
            if (rowData.isBaseCommit) {
                rowInfo.row.addClass('base-branch-row');
            }
        });
    }

    private _drawBarBackground(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        if (!column.maxValue) {
            let values = $.map(this._dataSource, (element, index) => {
                return element[column.index];
            });
            column.maxValue = Math.max.apply(null, values);
        }

        let value = column.getColumnValue.call(this, dataIndex, column.index);
        let cell = $("<div class='grid-cell background-bar'/>").width(column.width || 100);
        if (value >= 0) {
            let state = Navigation_Services.getHistoryService().getCurrentState();
            let scaleFactor;
            if (state.exp) {
                scaleFactor = Math.pow(value / column.maxValue - 1, state.exp) + 1;
            }
            else {
                let log = state.log || 10;
                scaleFactor = Math.log((log * value / column.maxValue) + 1) / Math.log(log * 1 + 1);
            }

            let clickable = $(domElem('a')).appendTo(cell);
            if (column.index === 'aheadCount') {
                clickable.attr('href', this._dataSource[dataIndex].aheadHref);
            }
            else if (column.index === 'behindCount') {
                clickable.attr('href', this._dataSource[dataIndex].behindHref);
            }

            $(domElem('span', 'background')).appendTo(clickable).width(Math.ceil(column.width * scaleFactor));
            let text = Utils_Number.toDecimalLocaleString(value, true);
            column.maxLength = Math.max(column.maxLength || 0, text.length);
            $(domElem('span', 'container')).appendTo(clickable).text(text);
        }

        if (column.rowCss) {
            cell.addClass(column.rowCss);
        }
        return cell;
    }

    private _getContextMenuItems(contextInfo) {
        contextInfo.branches = this._dataSource.slice(0);
        contextInfo.branches.sort((item1, item2) => {
            return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
        });
        contextInfo.repositoryContext = this._repositoryContext;
        return VCBranchesContextMenuItems.getBranchesContextMenuItems(contextInfo, false, this._contextActionId, null, null, null);
    }

    private _onMenuItemClick(e?): any {
        e._commandArgument = this.getRowData(this.getSelectedDataIndex());
        this._fire("branches-menu-item-clicked", e);
    }
}
