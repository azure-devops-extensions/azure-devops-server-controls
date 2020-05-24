import * as React from "react";
import { IRenderFunction } from "OfficeFabric/Utilities";
import { Pivot, PivotItem, PivotLinkFormat, PivotLinkSize, IPivotItemProps } from "OfficeFabric/Pivot";
import { PivotContainerProps, PivotTab, CountFormat } from "Search/Scenarios/Shared/Components/PivotContainer/PivotContainer.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/PivotContainer/Pivot";

export const PivotContainer: React.StatelessComponent<PivotContainerProps> = (props: PivotContainerProps) => {
    return (
        <div className={props.className} >
            <Pivot
                linkFormat={PivotLinkFormat.links}
                linkSize={PivotLinkSize.normal}
                selectedKey={props.selectedTabId}
                onLinkClick={pivotItem => props.onTabClick(pivotItem.props.itemKey)}>
                {
                    (props.pivotTabs || []).map(pivotTab =>
                        <PivotItem
                            className="search-pivot-item"
                            key={pivotTab.tabKey}
                            onRenderItemLink={getOnRenderItemLink(pivotTab)}
                            linkText={pivotTab.title}
                            itemKey={pivotTab.tabKey}
                            ariaLabel={pivotTab.ariaLabel}
                        />)
                }
            </Pivot>
        </div>);
}

const getOnRenderItemLink = (pivotTab: PivotTab): IRenderFunction<IPivotItemProps> => {
    const delegate = (props: IPivotItemProps, defaultRender: (props?: IPivotItemProps) => JSX.Element | null) => {
        const defaultLinkContent: JSX.Element = defaultRender(props),
            { count, countFormat } = pivotTab,
            renderPivotCount = typeof count !== "undefined" && typeof countFormat !== "undefined";

        if (renderPivotCount) {
            return (
                <span className="search-pivot-item-linkContent">
                    {defaultLinkContent}
                    <span className="badge">{formatCount(count, countFormat)}</span>
                </span>);
        }

        return defaultLinkContent;
    };

    return delegate;
}

function formatCount(count: number, format: CountFormat): string {
    if (format === CountFormat.None) {
        return count.toString();
    }

    if (format === CountFormat.LessThanEqualTo) {
        return `${count.toString()}+`;
    }
    
    // Below 1000, display the exact number
    // otherwise, segment into K, M and B.
    // Maximum limit is 999B.
    if (count < Math.pow(10, 3)) {
        return count.toString();
    }
    else if (count < Math.pow(10, 6)) {
        return `${Math.floor(count / Math.pow(10, 3)).toString()}K`;
    }
    else if (count < Math.pow(10, 9)) {
        return `${Math.floor(count / Math.pow(10, 6)).toString()}M`;
    }
    else if (count < Math.pow(10, 12)) {
        return `${Math.floor(count / Math.pow(10, 9)).toString()}B`;
    }
    else {
        return "999B+";
    }
}