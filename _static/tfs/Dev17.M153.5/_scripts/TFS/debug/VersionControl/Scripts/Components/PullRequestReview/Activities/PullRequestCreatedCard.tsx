import React = require("react");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

// Presentational components
import {ActivityCardSubduedTemplate} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");
import Format = require("VersionControl/Scripts/Utils/Format");

export interface IPRCreatedCardProps extends React.ClassAttributes<any> {
    createdDate: Date;
    createdBy: VSS_Common_Contracts.IdentityRef;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    isNew?: boolean;
}

/**
 * Activity card for the Pull Request Created discussion entry
 */
export class Component extends React.Component<IPRCreatedCardProps, any> {
    public render(): JSX.Element {
        return (
            <ActivityCardSubduedTemplate createdDate={this.props.createdDate} isNew={this.props.isNew} showTimelineLine={false}>
                <Format.FormattedComponent format={VCResources.PullRequest_ActivityFeed_PRCreatedCardText}>
                    <InlineIdentity.Component identity={this.props.createdBy} tfsContext={this.props.tfsContext}/>
                </Format.FormattedComponent>
            </ActivityCardSubduedTemplate>
        );
    }

    public shouldComponentUpdate(nextProps: IPRCreatedCardProps): boolean {
        if (this.props.tfsContext !== nextProps.tfsContext
            || this.props.createdDate !== nextProps.createdDate
            || this.props.createdBy !== nextProps.createdBy
            || this.props.isNew !== nextProps.isNew) {
            return true;
        }

        return false;
    }
}
