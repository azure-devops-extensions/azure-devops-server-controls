import "VSS/LoaderPlugins/Css!TfsCommon/MobileNavigation/Navigation/Navigation";

import * as React from "react";

import { Area, Feature } from "TfsCommon/Scripts/CustomerIntelligenceConstants";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { toDictionary } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { css, autobind } from "OfficeFabric/Utilities";

import { INavigationItem } from "TfsCommon/Scripts/MobileNavigation/Navigation/Navigation.Props";
import { INavigationEntryProps } from "TfsCommon/Scripts/MobileNavigation/Navigation/NavigationEntry.Props";
import * as Telemetry from "VSS/Telemetry/Services";

export interface INavigationEntryState {
    expanded: IDictionaryStringTo<boolean>;
}

export class NavigationEntry extends React.Component<INavigationEntryProps, INavigationEntryState> {
    constructor(props: INavigationEntryProps, context?: any) {
        super(props, context);

        const { items } = this.props;
        this.state = {
            expanded: toDictionary(items, i => i.id, i => i.initialExpanded)
        };
    }

    public render(): JSX.Element {
        const { items } = this.props;

        return <ul className="navigation-items" role="tree">
            {this._renderItems(items)}
        </ul>;
    }

    private _renderItems(items: INavigationItem[], level: number = 0): JSX.Element[] {
        return items.map(item => this._renderItem(item, level));
    }

    private _renderItem(item: INavigationItem, level: number = 0): JSX.Element {
        const { items, title, icon, id, href, onClick } = item;
        const hasChildren = items && items.length > 0;

        const expanded = this._isExpanded(item);
        const selected = this._isSelected(item);

        let TagName = "a";
        if (hasChildren || (!href && onClick)) {
            // Render as button if
            // - the element has children, so it can be expanded/collapsed, or
            // - a custom click handler is passed and no href is set
            TagName = "button";
        }

        let clickHandler = undefined;
        if (hasChildren) {
            clickHandler = (ev: React.MouseEvent<HTMLButtonElement>) => this._toggleExpand(ev, item);
        } else {
            clickHandler = (ev: React.MouseEvent<HTMLAnchorElement>) => this._onClick(ev, item);
        }

        return <li
            role="treeitem"
            key={id}
            className={css("navigation-item-container", `navigation-item-level-${level}`, {
                "navigation-item-selected": selected
            })}>
            <TagName
                className="navigation-item"
                onClick={clickHandler}
                href={!hasChildren && href}
                aria-current={selected && "page"}>
                {icon && <div className="navigation-item-icon">
                    <i className={css(icon)} aria-hidden={true} />
                </div>}
                <div className="navigation-item-title">
                    {title}
                </div>
                {hasChildren && <div className="navigation-item-expand">
                    <i className={css("bowtie-icon", {
                        "bowtie-chevron-down-light": !expanded,
                        "bowtie-chevron-up-light": expanded
                    })} aria-hidden={true} />
                </div>}
            </TagName>

            {hasChildren && <div className={css("navigation-item-children-container", {
                "expanded": expanded
            })}>
                <ul className="navigation-items navigation-item-children" style={{
                    marginTop: `calc(${items.length} * -40px)`, // -40px has to match $itemHeight, allow expand/collapse effect
                }} role="group">
                    {this._renderItems(items, level + 1)}
                </ul>
            </div>}
        </li>;
    }

    private _isExpanded(item: INavigationItem): boolean {
        return this.state.expanded[item.id];
    }

    private _isSelected(item: INavigationItem): boolean {
        const { selectedItemId } = this.props;

        return equals(selectedItemId, item.id, true);
    }

    @autobind
    private _toggleExpand(ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, item: INavigationItem) {
        this.setState({
            expanded: {
                ...this.state.expanded,
                [item.id]: !this.state.expanded[item.id]
            }
        });
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.NavigationItemToggleExpand,
            {
                itemId: item.id,
                expanded: this.state.expanded[item.id]
            }), false);
    }

    @autobind
    private _onClick(ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, item: INavigationItem) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.NavigationItemClick, { itemId: item.id }), true);
        const { onClick } = item;

        if (onClick) {
            onClick(item);
        } else {
            this._navigate(item);
        }

        ev.preventDefault();
    }

    private _navigate(item: INavigationItem) {
        const { postNavigation } = this.props;
        const { id, href, external } = item;

        if (external && href) {
            const openedWindow = window.open(href);
            openedWindow.opener = null;
        } else {
            Service.getLocalService(HubsService).navigateToHub(id, href);
        }

        if (postNavigation) {
            postNavigation(item);
        }
    }
}
