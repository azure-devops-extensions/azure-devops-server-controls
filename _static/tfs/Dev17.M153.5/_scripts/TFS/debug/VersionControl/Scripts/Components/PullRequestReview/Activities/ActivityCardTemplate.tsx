import React = require("react");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

// Presentational components
import ActivityCardContainer = require("VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityFeedBox");
import {ActivityCardTimestamp} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTimestamp";

import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");
import Format = require("VersionControl/Scripts/Utils/Format");

export interface IActivityCardSubduedTemplateProps extends React.ClassAttributes<any> {
    key?: any;
    createdDate: Date;
    isNew?: boolean;
    showTimelineLine?: boolean;
}

export class ActivityCardSubduedTemplate extends React.Component<IActivityCardSubduedTemplateProps, any> {
    public render(): JSX.Element {

        return (
            <ActivityCardContainer.Component 
                showTimelineDot={true}
                showTimelineLine={this.props.showTimelineLine}
                useSubduedStyle={true}
                isNew={this.props.isNew}>
                <div className="activity-card-body">
                    <div className="activity-card-body-content" role="heading" aria-level={3}>
                        {this.props.children}
                    </div>
                    <ActivityCardTimestamp date={this.props.createdDate} />
                </div>
            </ActivityCardContainer.Component>
        );
    }
}
