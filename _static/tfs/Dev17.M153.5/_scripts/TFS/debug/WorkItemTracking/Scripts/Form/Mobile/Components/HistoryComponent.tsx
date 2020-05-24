import React = require("react");
import ReactDOM = require("react-dom");
import Utils_String = require("VSS/Utils/String");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { autobind } from "OfficeFabric/Utilities";
import { List } from "OfficeFabric/List";
import { KeyCodes } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { HistoryControlBase, IHistoryControlBaseProps, IHistoryControlBaseState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryControlBase";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { IHistoryItemGroup, IHistoryItem, ISelectableHistoryItem, ItemType } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryItemViewer } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemViewer";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";

export class HistoryComponent extends HistoryControlBase<IHistoryControlBaseProps, IHistoryControlBaseState> {

    public componentDidUpdate(): void {
        if (this._revisionListPanel && this.props.store.isHistoryReloaded()) {
            $(this._revisionListPanel).scrollTop(0);
            this.props.store.resetHistoryReloaded();
        }
    }

    public render(): JSX.Element {

        if (this.state.error) {
            var errorMessage = this.state.error.message ? this.state.error.message : WorkItemTrackingResources.GenericHistoryRetrievalError;

            return (<div className='error'>{errorMessage}</div>);
        }

        if (this.state.totalItemCount === 0) {
            return null;
        }

        return (
            <div className='workitem-history-control'>
                <div className='history-revision-list single-column'
                    tabIndex={0}
                    role="tree"
                    aria-label={WorkItemTrackingResources.HistoryControlTreeAriaLabel}
                    ref={this._getListPanelItem}>
                    <div className='history-item-list'>
                        <List items={this.state.historyItems}
                            onRenderCell={this._onRenderCell} />
                    </div>
                </div>
            </div>
        );
    }

    @autobind
    protected _onRenderCell(item: ISelectableHistoryItem): JSX.Element {
        return item.itemType === ItemType.Group ? this._getGroup(item, false) : this._getItem(item, false);
    };
}
