import * as React from "react";
import * as ReactDOM from "react-dom";

import { PrimaryButton } from "OfficeFabric/Button";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Unlicensed/PackageUnlicensedView";

import * as PackageResources from "Feed/Common/Resources";

export interface IPackageUnlicensedViewProps extends Props {
    userHubUrl: string;
}

export class PackageUnlicensedView extends Component<IPackageUnlicensedViewProps, State> {
    public static render(container: HTMLElement, props: IPackageUnlicensedViewProps): void {
        ReactDOM.render(<PackageUnlicensedView {...props} />, container);
    }

    public render(): JSX.Element {
        return (
            <div className="package-unlicensed-view">
                <div className="package-unlicensed-message">
                    {Utils_String.format(PackageResources.Unlicensed_Description, PackageResources.AzureArtifacts)}
                </div>
                <div className="package-unlicensed-button">
                    <PrimaryButton href={this.props.userHubUrl} className="unlicensed-button">
                        <span className="bowtie-icon bowtie-settings-gear" />
                        {PackageResources.Unlicensed_LinkTest}
                    </PrimaryButton>
                </div>
            </div>
        );
    }
}
