import "VSS/LoaderPlugins/Css!fabric";

import * as React from "react";

import { WorkItem, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";

import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemDiscussionFactory, IWorkItemDiscussionIterator } from "WorkItemTracking/Scripts/OM/History/Discussion";
import { WorkItemDiscussionList } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/WorkItemDiscussionList";
import { WorkItemDiscussionInputComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/WorkItemDiscussionInputComponent";

export interface IWorkItemDiscussionComponentState {
    discussionIterator: IWorkItemDiscussionIterator;
    workItemId: number;
}

export class WorkItemDiscussionComponent extends WorkItemBindableComponent<{}, IWorkItemDiscussionComponentState> {
    constructor(props, context) {
        super(props, context);

        this.state = {
            discussionIterator: null,
            workItemId: null
        };

        this._subscribeToWorkItemChanges();
    }

    public render(): JSX.Element {
        return <div className="mobile-discussion-control">
            {this.state.discussionIterator &&
                <WorkItemDiscussionList discussionIterator={this.state.discussionIterator} workItemId={this.state.workItemId} />}
            <WorkItemDiscussionInputComponent />
        </div>;
    }

    protected _workItemChanged(change?: IWorkItemChangedArgs) {
        const workItem = this._formContext.workItem;
        if (change === WorkItemChangeType.SaveCompleted) {
            this.setState({
                discussionIterator: WorkItemDiscussionFactory.getDiscussionIterator(workItem),
                workItemId: workItem.id
            });
        }
    }

    protected _bind(workItem: WorkItem, isDisabledView?: boolean) {
        super._bind(workItem, isDisabledView);
        const iterator = WorkItemDiscussionFactory.getDiscussionIterator(workItem);
        this.setState({
            discussionIterator: iterator,
            workItemId: workItem.id
        });
    }

    protected _unbind() {
        this.setState({
            discussionIterator: null,
            workItemId: null
        });
    }
}
