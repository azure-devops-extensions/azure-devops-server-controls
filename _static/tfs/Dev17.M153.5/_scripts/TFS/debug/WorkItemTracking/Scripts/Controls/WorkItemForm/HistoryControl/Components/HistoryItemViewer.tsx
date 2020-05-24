import React = require("react");
import { HistoryItemViewerHeader } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemViewerHeader";
import { HistoryItemDetail } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemDetail";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { IHistoryItem } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";

export interface IHistoryItemViewerProps {
    item: IHistoryItem;
    actionCreator: HistoryControlActionsCreator;
}

export class HistoryItemViewer extends React.Component<IHistoryItemViewerProps, {}> {
    public render(): JSX.Element {

        if (this.props.item) {
            return (
                <div className="history-item-viewer">
                    <HistoryItemViewerHeader item={this.props.item} enableContactCard={false} />
                    <HistoryItemDetail item={this.props.item} actionCreator={this.props.actionCreator} enableContactCard={true} />
                </div>
            );
        }
        else {
            return (
                <div className="history-item-viewer" />
            );
        }
    }
}
