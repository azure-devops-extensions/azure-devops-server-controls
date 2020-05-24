import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { IPerson } from "Package/Scripts/Protocols/Common/IPerson";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { PackagePerson } from "Package/Scripts/Protocols/Components/PackagePerson";
import { MavenPomPerson } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Maven/MavenPackagePeople";

export interface IMavenPackagePeopleProps extends Props {
    developers: MavenPomPerson[];
    contributors: MavenPomPerson[];
}

export class MavenPackagePeople extends Component<IMavenPackagePeopleProps, State> {
    public render(): JSX.Element {
        if (!this.props.developers && !this.props.contributors) {
            return null;
        }

        return (
            <div className="maven-package-people">
                <PackageAttribute title={PackageResources.PackagePeople_Title}>
                    {this.props.developers.length > 0 && (
                        <div>
                            <div className="package-group-spacer" />
                            <div className="package-group-header">{PackageResources.MavenPackagePeople_Developers}</div>
                            {this.props.developers.map((developer: MavenPomPerson) => {
                                return <PackagePerson key={developer.name} person={this.ToIPerson(developer)} />;
                            })}
                        </div>
                    )}
                    {this.props.contributors.length > 0 && (
                        <div>
                            <div className="package-group-spacer" />
                            <div className="package-group-header">
                                {PackageResources.MavenPackagePeople_Contributors}
                            </div>
                            {this.props.contributors.map((contributor: MavenPomPerson) => {
                                return <PackagePerson key={contributor.name} person={this.ToIPerson(contributor)} />;
                            })}
                        </div>
                    )}
                </PackageAttribute>
            </div>
        );
    }

    private ToIPerson(person: MavenPomPerson): IPerson {
        return {
            email: person.email,
            name: person.name,
            url: person.url
        } as IPerson;
    }
}
