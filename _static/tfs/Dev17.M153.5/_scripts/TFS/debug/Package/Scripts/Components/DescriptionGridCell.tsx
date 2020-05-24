import * as React from "react";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { Component, Props, State } from "VSS/Flux/Component";

import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/DescriptionGridCell";

export interface IDescriptionGridCellProps extends Props {
    item: Package;
}

export class DescriptionGridCell extends Component<IDescriptionGridCellProps, State> {
    public render(): JSX.Element {
        return (
            <div className="package-description-grid-cell">
                {this.props.item.versions[0].packageDescription ? (
                    <TooltipHost
                        content={this.props.item.versions[0].packageDescription}
                        overflowMode={TooltipOverflowMode.Parent}
                    >
                        <span>{this.props.item.versions[0].packageDescription}</span>
                    </TooltipHost>
                ) : null}
            </div>
        );
    }
}
