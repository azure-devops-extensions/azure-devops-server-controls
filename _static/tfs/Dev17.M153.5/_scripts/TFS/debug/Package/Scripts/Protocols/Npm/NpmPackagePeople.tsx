import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { IPerson } from "Package/Scripts/Protocols/Common/IPerson";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { PackagePerson } from "Package/Scripts/Protocols/Components/PackagePerson";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Npm/NpmPackagePeople";

export interface INpmPackagePeopleProps extends Props {
    author: IPerson;
    contributors: IPerson[];
}

export class NpmPackagePeople extends Component<INpmPackagePeopleProps, State> {
    public render(): JSX.Element {
        if (!this.props.author && !this.props.contributors) {
            return null;
        }

        return (
            <div className="npm-package-people">
                <PackageAttribute title={PackageResources.PackagePeople_Title}>
                    {this.props.author && (
                        <div>
                            <div className="package-group-header">{PackageResources.PackagePeople_Author}</div>
                            <PackagePerson person={this.props.author} />
                        </div>
                    )}
                    {this.props.contributors && (
                        <div>
                            <div className="package-group-spacer" />
                            <div className="package-group-header">{PackageResources.NpmPackagePeople_Contributors}</div>
                            {this.props.contributors.map((contributor: IPerson) => {
                                return <PackagePerson key={contributor.name} person={contributor} />;
                            })}
                        </div>
                    )}
                </PackageAttribute>
            </div>
        );
    }
}
