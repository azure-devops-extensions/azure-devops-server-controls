/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import { Link } from "OfficeFabric/Link";
import { Spacer } from "VersionControl/Scenarios/Shared/RefTree/Spacer";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as VSS_Events from "VSS/Events/Services";
import "VSS/LoaderPlugins/Css!VersionControl/Shared/RefTree/HasMoreRow";

export interface HasMoreProperties {
    key: string;
    folderName: string;
    depth?: number;
    onFolderExpanded(fullName: string): void;
    expanding: boolean;
}

export class HasMoreRow extends React.Component<HasMoreProperties, {}> {

    constructor(props: HasMoreProperties) {
        super(props);
    }

    public render() {
            const folderName: string = this.props.folderName;
            
            if (this.props.expanding) {
                return (
                    <span>
                        <Spacer depth={this.props.depth}/>
                        <span>
                           <span className="vc-has-more status-progress" ></span>
                           <span className="vc-has-more-loading">Loading...</span>
                        </span>
                    </span>
                );      
            }
            return (
                <span className="vc-has-more-container">
                   <Spacer depth={this.props.depth}/>
                    <Link onClick={() => this.props.onFolderExpanded(folderName) } aria-label={VCResources.ShowMore} className={"vc-has-more"}>
                        {VCResources.ShowMore}
                    </Link>
                </span>
            );        
    }
}

