import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_Date from "VSS/Utils/Date";

import { ProvenanceDataService } from "Package/Scripts/DataServices/ProvenanceDataService";
import { getFullyQualifiedFeedId } from "Package/Scripts/Helpers/FeedNameResolver";
import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { PackageVersionProvenance, Provenance } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageProvenance";

import * as PackageResources from "Feed/Common/Resources";

export interface IProvenanceProps extends Props {
    feed: Feed;
    packageId: string;
    versionId: string;
    publishDate: Date;
    isProvenanceEnabled: boolean;
    isProvenanceSupported: boolean;
}

export interface IProvenanceState extends State {
    provenance: Provenance;
}

export class PackageProvenance extends Component<IProvenanceProps, IProvenanceState> {
    private _mounted: boolean;

    constructor(props: IProvenanceProps) {
        super(props);
        this.state = { provenance: null } as IProvenanceState;
        this._mounted = false;
    }

    public componentDidMount(): void {
        this._mounted = true;

        if (this.props.isProvenanceEnabled && this.props.isProvenanceSupported) {
            const provenanceDataService = Service.getLocalService(ProvenanceDataService);
            const feedId = getFullyQualifiedFeedId(this.props.feed);
            provenanceDataService.getPackageVersionProvenance(feedId, this.props.packageId, this.props.versionId).then(
                (packageVersionProvenance: PackageVersionProvenance) => {
                    // only set state if you're still mounted after provenance fetching is done
                    if (this._mounted === true) {
                        this.setState({
                            provenance: packageVersionProvenance.provenance
                        });
                    }
                },
                (err: any) => {
                    if (err != null && err.status === 404) {
                        // noop
                    } else {
                        throw err;
                    }
                }
            );
        }
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public render(): JSX.Element {
        return (
            <div className="package-provenance">
                <PackageAttribute title={PackageResources.PackageAttributeTitle_Provenance}>
                    <div className="package-group-spacer" />
                    <div className="package-group-header">{PackageResources.Publisher}</div>

                    {this.showProvenanceData() && (
                        <div className="package-attribute-item">
                            <span className="bowtie-icon bowtie-user package-attribute-item-icon" />
                            {this.state.provenance.data && (
                                <span>
                                    {this.state.provenance.data["Common.IdentityDisplayName"] ||
                                        PackageResources.PackageProvenance_UnknownUser}
                                </span>
                            )}
                            {this.state.provenance.userAgent && <span> using {this.state.provenance.userAgent}</span>}
                        </div>
                    )}

                    <div className="package-attribute-item">
                        <span className="bowtie-icon bowtie-status-waiting package-attribute-item-icon" />
                        <span>
                            {Utils_Date.ago(this.props.publishDate) +
                                " (" +
                                this.props.publishDate.toLocaleDateString() +
                                " " +
                                this.props.publishDate.toLocaleTimeString() +
                                ")"}
                        </span>
                    </div>
                </PackageAttribute>
            </div>
        );
    }

    private showProvenanceData(): boolean {
        return this.props.isProvenanceEnabled && this.props.isProvenanceSupported && this.state.provenance != null;
    }
}
