/// <reference types="react" />

import * as React from "react";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { IAccordionState } from "DistributedTaskControls/SharedControls/Accordion/Accordion";

import { List, IList } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";

export interface ICollapsibleItemOverviewListProps extends IProps {
    /**
    * Title on the collapsible element
    */
    title: string;

    /**
    * Items whose overviews are to be rendered
    */
    items: Item[];

    /**
    * Heading aria-level of the title 
    */
    headingLevel: number;

    /**
    * Initial expansion state
    */
    initiallyExpanded: boolean;

    /**
    * Current expansion state
    */
    expanded?: boolean;

    /**
    * Icon that can be shown next to the title
    */
    bowtieIconName?: string;

    /**
    * Sub text to show under title
    */
    description?: string;

    /**
    * Line to mark the section
    */
    addSectionHeaderLine?: boolean;

    /**
    * Control to show when there are no items
    */
    noItemsControl?: string | JSX.Element;

    /**
    * ComponentRef for CollapsibleItemOverviewList
    */
    componentRef?: (component: ICollapsibleItemOverviewList) => void;

    /**
     * Callback to invoke when the collapsible is toggled
     */
    onToggleCallback?: (isExpanded: boolean) => void;
}

export interface ICollapsibleItemOverviewList {
    getListReference(): IList;
    isCurrentlyExpanded(): boolean;
}

export class CollapsibleItemOverviewList extends Component<ICollapsibleItemOverviewListProps, IAccordionState> implements ICollapsibleItemOverviewList {
    public render(): JSX.Element {
        return (
            <AccordionCustomRenderer
                ref={this._resolveRef("_accordion")}
                cssClass={css(this.props.cssClass, "collapsible-item-overview-list")}
                label={this.props.title}
                initiallyExpanded={this.props.initiallyExpanded}
                bowtieIconName={this.props.bowtieIconName}
                description={this.props.description}
                expanded={this._isExpanded()}
                headingLevel={this.props.headingLevel}
                addSectionHeaderLine={this.props.addSectionHeaderLine}
                onHeaderClick={this._onHeaderClick}
            >
                {
                    this.props.items && this.props.items.length > 0
                        ? (<List
                            componentRef={this._resolveRef("_listReference")}
                            role="tablist"
                            items={this.props.items}
                            data-is-scrollable={true}
                            onRenderCell={this._onRenderItem}>
                        </List>)
                        : this.props.noItemsControl
                }
            </AccordionCustomRenderer>
        );
    }

    public componentDidMount(): void {
        if (this.props.componentRef) {
            this.props.componentRef(this);
        }
    }

    public getListReference(): IList {
        return this._listReference;
    }

    public isCurrentlyExpanded(): boolean {
        return this.state && this.state.expanded;
    }

    private _onHeaderClick = (isExpanded: boolean) => {
        this.setState({ expanded: isExpanded });
        if (this.props.onToggleCallback && typeof this.props.onToggleCallback === "function") {
            this.props.onToggleCallback(isExpanded);
        }
    }

    private _isExpanded(): boolean {
        if (this.props.expanded !== undefined && this.props.expanded !== null) {
            return this.props.expanded;
        }

        if (!this.state) {
            return this.props.initiallyExpanded;
        }

        return this.state.expanded;
    }

    private _onRenderItem = (item: Item) => {
        return item.getOverview(this.props.instanceId);
    }

    private _accordion: AccordionCustomRenderer;
    private _listReference: IList;
}