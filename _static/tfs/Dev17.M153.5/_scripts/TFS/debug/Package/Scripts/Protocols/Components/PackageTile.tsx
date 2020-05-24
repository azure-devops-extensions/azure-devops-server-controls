import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageTile";

export interface IPackageTileProps extends Props {
    title?: string;
    id?: string;
    /* Optional css class from the component */
    cssClass?: string;
}

export class PackageTile extends Component<IPackageTileProps, State> {
    public render(): JSX.Element {
        return (
            <div className={css("package-tile", this.props.cssClass)} id={this.props.id ? this.props.id : null}>
                {this.props.title && <h2 className="package-tile-title">{this.props.title}</h2>}
                <div className="package-tile-content">{this.props.children}</div>
            </div>
        );
    }
}
