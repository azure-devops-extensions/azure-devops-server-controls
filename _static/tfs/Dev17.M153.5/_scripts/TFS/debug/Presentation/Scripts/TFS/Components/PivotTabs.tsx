import * as React from "react";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Link } from "OfficeFabric/Link";
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import "VSS/LoaderPlugins/Css!Presentation/Components/PivotTabs";

export interface PivotTabItem {
    tabKey: string;
    title: string;
    ariaLabel?: string;
}

export interface PivotTabsProps {
    items: PivotTabItem[];
    selectedKey: string;
    getLink: (key: string) => string;
    getClickHandler?: (key: string) => (ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
    commandBarItems?: IContextualMenuItem[];
}

export function getTabHeaderId(tabKey: string): string {
    return `pivotview-header-${tabKey}`;
}

export const PivotTabs = (props: PivotTabsProps): JSX.Element =>
    <div className="views pivot-views-container">
        <FocusZone className="tfs-pivot-tabs-view pivot-view" direction={FocusZoneDirection.horizontal}>
            <nav aria-label={PresentationResources.PivotTabNavigationAriaLabel}>
                <div className="tablist" role="tablist">
                    {props.items.map(item =>
                        <PivotItemComponent
                            key={item.tabKey}
                            tabKey={item.tabKey}
                            title={item.title}
                            ariaLabel={item.ariaLabel ? item.ariaLabel : item.title}
                            isSelected={item.tabKey === props.selectedKey}
                            linkUrl={props.getLink(item.tabKey)}
                            onClick={props.getClickHandler(item.tabKey)} />
                    )}
                </div>
            </nav>
        </FocusZone>
        {props.commandBarItems && props.commandBarItems.length > 0 && 
            <div className="tfs-pivot-command-bar-container">
                <div className="bowtie-icon bowtie-separator"/>
                <CommandBar
                    className="tfs-pivot-command-bar"
                    items={props.commandBarItems}
                />
            </div>}
    </div>;

interface PivotItemProps {
    tabKey: string;
    title: string;
    isSelected: boolean;
    linkUrl: string;
    ariaLabel: string;
    onClick?: (ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

const PivotItemComponent = (props: PivotItemProps): JSX.Element => {
    const cssClass = "pivotTab-link" + (props.isSelected ? " is-selected" : "");
    // we could just use office fabric's pivotview, but it uses buttons, we use links...so :)
    return <Link
            role="tab"
            id={getTabHeaderId(props.tabKey)}
            aria-selected={props.isSelected}
            aria-label={props.ariaLabel}
            className={cssClass}
            onClick={props.onClick}
            href={props.linkUrl}>
            {props.title}
        </Link>;
}
