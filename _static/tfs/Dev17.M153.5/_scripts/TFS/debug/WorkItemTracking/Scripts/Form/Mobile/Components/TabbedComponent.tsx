import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/TabbedComponent";

import React = require("react");

import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String")
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { isPageValid } from "WorkItemTracking/Scripts/Form/Validation";

// Work-around for https://github.com/OfficeDev/office-ui-fabric-react/issues/1665
import "OfficeFabric/Button";
import { Pivot, PivotItem, IPivotItemProps } from "OfficeFabric/Pivot";
import { autobind, IRenderFunction, css } from "OfficeFabric/Utilities";

import { pivotIcon } from "VSSPreview/OfficeFabric/Helpers";

import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

export interface ITabComponentProps {
    tabs: FormLayout.ILayoutPage[];

    setActiveTab: (tab: FormLayout.ILayoutPage) => void;
}

export class TabbedComponent extends WorkItemBindableComponent<ITabComponentProps, {}> {
    private _pageMap: { [id: string]: FormLayout.ILayoutPage };

    constructor(props: ITabComponentProps, context?: any) {
        super(props, context, {
            eventThrottlingInMs: 200
        });

        this._pageMap = Utils_Array.toDictionary<FormLayout.ILayoutPage, FormLayout.ILayoutPage>(
            this.props.tabs,
            tab => tab.id);

        this._subscribeToWorkItemChanges();
    }

    protected _workItemChanged() {
        this.forceUpdate();
    }

    public render(): JSX.Element {
        return <div className="workitem-tabs" key="tablist"><Pivot onLinkClick={this._onLinkClick}>
            {this.props.tabs.map(tab => <PivotItem
                linkText={tab.label}
                itemKey={tab.id}
                key={tab.id}
                itemCount={this._getTabCount(tab.pageType)}
                itemIcon={this._getTabIcon(tab.pageType)}
                onRenderItemLink={this._renderPivotItem}
            />)}
        </Pivot></div>;
    }

    @autobind
    private _renderPivotItem(item: IPivotItemProps, defaultRender: IRenderFunction<IPivotItemProps>): JSX.Element {
        const isValid = this._formContext.workItem && isPageValid(this._pageMap[item.itemKey], this._formContext.workItem);

        return <span className={css({
            "invalid": !isValid
        })}>
            {defaultRender(item)}
        </span>;
    }

    @autobind
    private _onLinkClick(item?: PivotItem) {
        if (item) {
            const pageItem = this._pageMap[item.props.itemKey];
            this.props.setActiveTab(pageItem);
            WIFormCIDataHelper.workItemTabClick(pageItem.label, {});
        }
    }

    private _getTabCount(pageType: FormModels.PageType): number {
        if (!this._formContext.workItem) {
            return undefined;
        }

        // This returns all links and attachments that have not been removed or deleted
        const links = this._formContext.workItem.getLinks();
        const attachmentsCount = links.filter((x) => { return Utils_String.ignoreCaseComparer(x.baseLinkType, WorkItemTrackingResources.AttachmentAsLinkType) === 0 }).length;
        const linksCount = links.length - attachmentsCount;

        if (pageType === FormModels.PageType.links) {
            return linksCount === 0 ? undefined : linksCount;
        }
        else if (pageType === FormModels.PageType.attachments) {
            return attachmentsCount === 0 ? undefined : attachmentsCount;
        }

        return undefined;
    }

    private _getTabIcon(pageType: FormModels.PageType): string {
        switch (pageType) {
            case FormModels.PageType.links:
                return pivotIcon("bowtie-link");

            case FormModels.PageType.attachments:
                return pivotIcon("bowtie-attach");

            case FormModels.PageType.history:
                return pivotIcon("bowtie-navigate-history");
        }

        return undefined;
    }
}