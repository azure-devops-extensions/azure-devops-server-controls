import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageTags";

export interface IPackageTagsProps extends Props {
    tags: string[];
    protocol?: string;
}

export class PackageTags extends Component<IPackageTagsProps, State> {
    public render(): JSX.Element {
        return (
            <div className="package-tags">
                {this.props.tags && (
                    <PackageAttribute
                        title={
                            this.props.protocol && this.props.protocol === NpmKey
                                ? PackageResources.PackageTags_Title_Npm
                                : PackageResources.PackageTags_Title
                        }
                    >
                        {this.props.tags.map((tag: string, index: number) => {
                            return (
                                <div className="package-tag" key={tag + index}>
                                    {tag}
                                </div>
                            );
                        })}
                    </PackageAttribute>
                )}
            </div>
        );
    }
}
