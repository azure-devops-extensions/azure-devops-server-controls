import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { CollapsibleItemOverviewList, ICollapsibleItemOverviewList } from "DistributedTaskControls/Components/CollapsibleItemOverviewList";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";

import { IList } from "OfficeFabric/List";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveDefinitionsPanelItemOverview } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsPanelItemOverview";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";

export class ActiveDefinitionsSectionItem implements Item {

    constructor(private _sectionName: string, private _id: number | string, private _childItems: Item[], private _initiallyExpanded: boolean) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        // There is a reason behind keeping this here.
        // There is a hack in our code, to handle selection properly. We need the recent section item in the two panel's item list
        // We'll fix this with a planned change in two panel selector
        if (!this._childItems || this._childItems.length <= 0) {
            return null;
        }

        let expanded: boolean = (this._isExpanded === undefined) ? this._initiallyExpanded : this._isExpanded;

        return <CollapsibleItemOverviewList
            componentRef={(itemOverviewList: ICollapsibleItemOverviewList) => { this._collapsibleItemOverviewList = itemOverviewList; }}
            cssClass={"active-definition-section-overview"}
            title={this._sectionName}
            headingLevel={1}
            initiallyExpanded={expanded}
            addSectionHeaderLine={false}
            items={this._childItems}
            noItemsControl={this._getNoItemsControl()}
            onToggleCallback={(isExpanded) => this._isExpanded = isExpanded} />;
    }

    public getScrollableList(): IList {
        if (this._collapsibleItemOverviewList) {
            return this._collapsibleItemOverviewList.getListReference();
        }
        else {
            return null;
        }
    }

    public getDetails(instanceId?: string): JSX.Element {
        // No details
        return null;
    }

    public getKey(): string {
        return "active-definition-section-item-" + this._id;
    }

    public getChildItems(): Item[] {
        return this._childItems;
    }

    public updateChildItems(items: Item[], initiallyExpanded: boolean): void {
        this._childItems = items;
        this._initiallyExpanded = initiallyExpanded;
    }

    private _getNoItemsControl(): JSX.Element {
        return <MessageBarComponent
            className={"empty-recent-message"}
            messageBarType={MessageBarType.info}
        >
            {Resources.NoRecentDefinitions}
        </MessageBarComponent>;
    }

    private _collapsibleItemOverviewList: ICollapsibleItemOverviewList;
    private _isExpanded: boolean;
}