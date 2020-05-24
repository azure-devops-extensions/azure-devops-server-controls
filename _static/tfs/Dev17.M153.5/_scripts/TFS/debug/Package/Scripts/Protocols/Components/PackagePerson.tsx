import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Url from "VSS/Utils/Url";

import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { IPerson } from "Package/Scripts/Protocols/Common/IPerson";
import { CiConstants } from "Package/Scripts/Protocols/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackagePerson";

export interface IPersonProps extends Props {
    person: IPerson;
}

export class PackagePerson extends Component<IPersonProps, State> {
    public render(): JSX.Element {
        if (!this.props.person) {
            return null;
        }

        const isUrlSafe =
            this.props.person.url &&
            (Url.isSafeProtocol(this.props.person.url) || this.props.person.url.indexOf(":") === -1);
        const additionalInfo = this.props.person.email || isUrlSafe;

        return (
            <div className={"person package-attribute-item" + (additionalInfo ? " additional-info" : "")}>
                <span className={"package-attribute-item-icon bowtie-icon bowtie-user"} />
                <div className="person-text">{this.props.person.name}</div>
                {additionalInfo && (
                    <div className="person-hover">
                        {this.props.person.email && (
                            <a
                                className="person-email"
                                href={"mailto:" + Utils_String.htmlEncode(this.props.person.email)}
                                tabIndex={0}
                                rel="noopener noreferrer"
                                onClick={() => this._registerLinkClick(CiConstants.PersonEmailLinkClicked)}
                            >
                                <span className="bowtie-icon bowtie-mail-message" />
                                <span className="person-text">{PackageResources.Email}</span>
                            </a>
                        )}
                        {isUrlSafe && (
                            <a
                                className="person-url"
                                href={Utils_String.htmlEncode(this.props.person.url)}
                                target="_blank"
                                tabIndex={0}
                                rel="noopener noreferrer"
                                onClick={() => this._registerLinkClick(CiConstants.PersonUrlLinkClicked)}
                            >
                                <span className="bowtie-icon bowtie-globe" />
                                <span className="person-text">{PackageResources.Website}</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    }

    private _registerLinkClick(feature: string) {
        CustomerIntelligenceHelper.publishEvent(feature);
    }
}
