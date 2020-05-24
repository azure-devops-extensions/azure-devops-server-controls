import * as React from "react";

import { AddBacklogItemStatus, Backlog } from "Agile/Scripts/Backlog/Backlog";
import { AddItemInsertLocation } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import { IAgileFilterContext } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { AgileFilterManager } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterManager";
import { IFilter } from "VSSUI/Utilities/Filter";
import { IObservableValue } from "VSS/Core/Observable";
import { IFieldValueDictionary } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";

export interface IBacklogWrapperBaseProps {
    /** The backlog context */
    backlogContext: IBacklogContextData;

    /** The filter context observable, which should be derived from the iteration backlog control */
    backlogFilterContext: IObservableValue<IAgileFilterContext>;

    /** The filter object from the Hub */
    filter: IFilter;

    /** Callback for when column option changes have been submitted/saved */
    onColumnOptionsChanged: () => void;
}

export abstract class BacklogWrapperBase<P extends IBacklogWrapperBaseProps, S = {}> extends React.Component<P, S> {
    protected _backlog: Backlog;

    public getDraggingWorkItemInformation(): IWorkItemDragInfo {
        if (this._backlog) {
            return this._backlog.getDraggingWorkItemInformation();
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public moveWorkItemsToIteration(workItemIds: number[], newIterationPath: string) {
        if (this._backlog) {
            this._backlog.moveWorkItemsToIterationAndFireDropCompleted(workItemIds, newIterationPath);
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public openColumnOptions() {
        if (this._backlog) {
            this._backlog.launchColumnOptions();
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public createQuery() {
        if (this._backlog) {
            this._backlog.generateAndLaunchNewQuery();
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public sendEmail() {
        if (this._backlog) {
            this._backlog.emailQueryResults();
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public resize(): void {
        if (this._backlog && this._backlog._grid) {
            this._backlog._grid.resize();
        }
    }

    public toggleInsertionLine(show: boolean, insertLocation?: AddItemInsertLocation) {
        if (this._backlog) {
            this._backlog.setAddPanelHighlight(show, insertLocation);
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    public addWorkItem(workItemTypeName: string, fields: IFieldValueDictionary, location: AddItemInsertLocation): IPromise<{ status: AddBacklogItemStatus, continuationPromise?: IPromise<boolean> }> {
        if (this._backlog) {
            return this._backlog.createAndAddWorkItem(workItemTypeName, fields, location);
        } else {
            throw new Error("The backlog is not yet available");
        }
    }

    protected dispose() {
        if (this._backlog) {
            this._backlog.dispose();
        }
    }

    protected _setupFilterContext(): void {
        const {
            backlogContext,
            backlogFilterContext,
            filter
        } = this.props;

        const dataSource = this._backlog.getGrid();
        const gridFilterManager = this._backlog.getGrid().getFilterManager();
        const filterManager = new AgileFilterManager(dataSource, gridFilterManager, filter, backlogContext.team.id);

        if (!gridFilterManager.isActive()) {
            gridFilterManager.activate();
        }

        if (gridFilterManager.isFiltering()) {
            const ids = gridFilterManager.filter();
            dataSource.filterWorkItems(ids);
        }

        // Set the filter context for the parent
        backlogFilterContext.value = {
            ...backlogFilterContext.value,
            filterManager: filterManager
        };
    }
}