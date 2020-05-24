import * as React from "react";

import { IContribution } from "WorkItemTracking/Scripts/Form/Models";
import { createGroupContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { IWorkItemFormComponentContext, WorkItemContextProviderPropTypes } from "WorkItemTracking/Scripts/Form/React/FormContext";
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");


export interface IContributionComponentProps {
    /** Layout group to render */
    contribution: IContribution;

    /** Callback used to create the contribution */
    createContribution: (contributionManager: WorkItemViewContributionManager, contribution: IContribution) => JQuery;
}

/**
 * Simple component which wraps a contribution and adds it to the DOM when it has been mounted.
 */
export class ContributionComponent extends React.Component<IContributionComponentProps, {}> {
    public contributionControlElement: HTMLDivElement;
    protected _resolvecontributionControlElement = (element: HTMLDivElement) => this.contributionControlElement = element;
    static contextTypes = WorkItemContextProviderPropTypes;
    public context: IWorkItemFormComponentContext;

    constructor(props: IContributionComponentProps, context: IWorkItemFormComponentContext) {
        super(props, context);
    }

    public render() {
        return <div className="contribution-component" ref={this._resolvecontributionControlElement} />;
    }

    public componentDidMount() {
        var contributedGroupContent = this.props.createContribution(this.context.provider.getFormContext().contributionManager, this.props.contribution);

        this.contributionControlElement.appendChild(contributedGroupContent[0]);
    }
}
