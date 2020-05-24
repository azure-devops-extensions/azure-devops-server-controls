import { BoardFilterDataSource } from "Agile/Scripts/Board/BoardFilterDataSource";
import { BoardFilter_Announcer_ItemCount } from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { Notifications } from "Agile/Scripts/TFS.Agile.Boards";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";


export class BoardFilterAnnouncer {
    private _dataSource: BoardFilterDataSource;
    private _boardMemberCount: number;
    private _memberFilterEventsCompleted: number;
    private _itemsReturnedByFilter: number;

    public startListening(dataSource: BoardFilterDataSource) {
        // Stop listening on old events
        this._detachEvents();
        // Set starting values and attach events
        this._dataSource = dataSource;
        this._boardMemberCount = dataSource.getFilterableMembers().length;
        this._memberFilterEventsCompleted = 0;
        this._itemsReturnedByFilter = 0;
        this._attachEvents();
    }

    public dispose(): void {
        this._detachEvents();
    }

    private _attachEvents(): void {
        for (const member of this._dataSource.getFilterableMembers()) {
            member.attachEvent(Notifications.BoardItemFilteringComplete, this._checkAndAnnounce);
        }
    }

    private _detachEvents(): void {
        if (!this._dataSource) {
            // Nothing to detach
            return;
        }

        for (const member of this._dataSource.getFilterableMembers()) {
            member.detachEvent(Notifications.BoardItemFilteringComplete, this._checkAndAnnounce);
        }
    }

    private _checkAndAnnounce = (sender, filteredItemIds: number[]) => {
        // Increment that we have completed another filter event and add the filtered items
        this._memberFilterEventsCompleted = this._memberFilterEventsCompleted + 1;
        this._itemsReturnedByFilter = this._itemsReturnedByFilter + filteredItemIds.length;

        // If we have caught the expected number of events, announce how many items are left on the board
        if (this._memberFilterEventsCompleted === this._boardMemberCount) {
            announce(format(BoardFilter_Announcer_ItemCount, this._itemsReturnedByFilter));
            // We have hit our expected number of events, stop listening
            this._detachEvents();
        }
    }
}