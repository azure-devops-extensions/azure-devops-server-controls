import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackagePeople";

export interface IPackagePeopleProps extends Props {
    authors: string[];
}

export class PackagePeople extends Component<IPackagePeopleProps, State> {
    public render(): JSX.Element {
        return (
            <div className="package-people">
                <PackageAttribute title={PackageResources.PackagePeople_Title}>
                    <div className="package-group-header" aria-label={PackageResources.PackagePeople_Authors}>
                        {PackageResources.PackagePeople_Authors}
                    </div>
                    {this.props.authors.map(author => {
                        return (
                            <div className="package-attribute-item" key={author}>
                                <span className={"package-attribute-item-icon bowtie-icon bowtie-user"} />
                                {author}
                            </div>
                        );
                    })}
                </PackageAttribute>
            </div>
        );
    }
}
