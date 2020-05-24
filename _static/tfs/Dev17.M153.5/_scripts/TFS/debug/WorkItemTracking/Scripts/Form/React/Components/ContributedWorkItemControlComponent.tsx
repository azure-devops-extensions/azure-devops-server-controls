import Q = require("q");
import React = require("react");

import { ILayoutControl } from "WorkItemTracking/Scripts/Form/Layout";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { createControlContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { ContributionComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributionComponent";

export interface IContributedWorkItemControlProps {
    control: ILayoutControl;
}

/** Contributed work item control wrapper */
export class ContributedWorkItemControlComponent extends WorkItemBindableComponent<IContributedWorkItemControlProps, {}> {
    public render(): JSX.Element {
        return <div className="control">
            <div className="workitemcontrol work-item-control">
                <ContributionComponent
                    contribution={this.props.control}
                    createContribution={createControlContribution} />
            </div>
        </div>;
    }
}
