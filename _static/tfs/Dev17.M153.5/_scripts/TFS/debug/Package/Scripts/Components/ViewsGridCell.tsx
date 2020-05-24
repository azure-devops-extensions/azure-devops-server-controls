import * as React from "react";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { FeedView, FeedViewType, MinimalPackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/ViewsGridCell";

export interface IViewsGridCellProps extends Props {
    packageVersion: MinimalPackageVersion;
}

export class ViewsGridCell extends Component<IViewsGridCellProps, State> {
    public render(): JSX.Element {
        const filteredViews = this.props.packageVersion.views
            .filter((v: FeedView) => v.type !== FeedViewType.Implicit)
            .sort((a: FeedView, b: FeedView) => Utils_String.localeComparer(a.name, b.name));
        const viewsString: string = filteredViews
            .map((view: FeedView) => {
                return "@" + view.name;
            })
            .join(", ");

        return (
            // TODO: +1 instead of tooltip
            <div className="views-grid-cell">
                <TooltipHost content={viewsString} overflowMode={TooltipOverflowMode.Parent}>
                    <ul className="release-views">
                        {filteredViews.map((view: FeedView) => {
                            return (
                                <li className="view-bubble" key={view.id}>
                                    {"@" + view.name}
                                </li>
                            );
                        })}
                    </ul>
                </TooltipHost>
            </div>
        );
    }
}
