import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/GroupComponent";

import * as React from "react";

import { CollapsiblePanel } from "WorkItemTracking/Scripts/Form/React/Components/CollapsiblePanel";
import { createGroupContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { ContributionComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributionComponent";
import { GroupComponentBase, IGroupComponentBaseProps } from "WorkItemTracking/Scripts/Form/React/Components/GroupComponentBase";

export interface IContributedGroupComponentProps extends IGroupComponentBaseProps {
}

export class ContributedGroupComponent extends GroupComponentBase<IContributedGroupComponentProps> {
    public render(): JSX.Element {
        const { isExpanded } = this.state;

        return <CollapsiblePanel
            animate={false}
            headerLabel={this.props.group.label}
            renderContent={this._renderContent}
            isCollapsible={this.props.group.isCollapsible}
            initialIsExpanded={isExpanded}
            onToggle={this._onToggle}
            alwaysRenderContents={true} />
    }

    private _renderContent = (): JSX.Element => {
        return <ContributionComponent contribution={this.props.group} createContribution={createGroupContribution} />;
    }
}