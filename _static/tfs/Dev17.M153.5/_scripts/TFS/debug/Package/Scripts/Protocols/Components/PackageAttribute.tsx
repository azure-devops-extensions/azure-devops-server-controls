import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageAttribute";

export interface IPackageAttributeProps extends Props {
    title: string;
}

export class PackageAttribute extends Component<IPackageAttributeProps, State> {
    public render(): JSX.Element {
        const shouldRender =
            this.props.children &&
            (this.props.children as any).length > 0 &&
            (this.props.children[0] || (this.props.children as any).length > 1);

        return (
            <div className="package-attribute" aria-label={this.props.title}>
                {shouldRender ? (
                    <div>
                        {this.props.title ? <h2 className="package-attribute-title">{this.props.title}</h2> : null}
                        <div className="package-attribute-content">{this.props.children}</div>
                    </div>
                ) : null}
            </div>
        );
    }
}
