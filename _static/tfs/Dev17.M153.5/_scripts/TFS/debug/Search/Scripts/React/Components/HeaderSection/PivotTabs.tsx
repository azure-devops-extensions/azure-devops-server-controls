import * as React from "react";

import { Pivot, PivotItem, PivotLinkFormat, PivotLinkSize } from "OfficeFabric/Pivot";
import { PivotTabItem } from "Search/Scripts/React/Models";

export interface PivotTabsProps {
    visibleTabs: PivotTabItem[];
    currentTab: string;
    onClick(tabKey: string): void;
}

export const PivotTabs = (props: PivotTabsProps): JSX.Element =>
    <div className="search-entities">
        <Pivot
            linkFormat={PivotLinkFormat.links}
            linkSize={PivotLinkSize.normal}
            selectedKey={props.currentTab}
            onLinkClick={pivotItem => props.onClick(pivotItem.props.itemKey)}>
            {
                props.visibleTabs.map(pivotTabItem =>
                    <PivotItem
                        key={pivotTabItem.tabKey}
                        linkText={pivotTabItem.title}
                        itemKey={pivotTabItem.tabKey}
                        />)
            }
        </Pivot>
</div>;
