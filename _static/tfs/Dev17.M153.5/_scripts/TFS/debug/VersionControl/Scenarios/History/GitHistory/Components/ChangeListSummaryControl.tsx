/// <reference types="react" />

import React = require("react");
import { AvatarCard } from  "VersionControl/Scenarios/Shared/AvatarControls";
import { IAvatarImageProperties } from  "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ChangeList, GitCommit, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as Utils_Date from "VSS/Utils/Date";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import "VSS/LoaderPlugins/Css!VersionControl/ChangeListSummaryControl";

export enum ChangeListType {
    TfsChangeList,
    GitCommit
}
export interface IChangeListSummaryControlProps extends React.Props<void> {
    repositoryContext: RepositoryContext;
    changeList: ChangeList;
    changeListType: ChangeListType;
}

/**
 * Renders changelist summary control.
 */
export class ChangeListSummaryControl extends React.Component<IChangeListSummaryControlProps, {}> {
    private _changeListId: string = "";
    private _changeListUrl: string = "";
    private _authorDisplayName: string = "";
    private _authorEmail: string = "";
    private _authoredDate: string = ""; 

    public render(): JSX.Element {
        if (this.props.repositoryContext && this.props.changeList && this.props.changeListType) {
            this._populateControlAttributes();

            const imageProperties: IAvatarImageProperties = {
                email: this._authorEmail,
                displayName: this._authorDisplayName,
                identityId: this.props.changeList.ownerId
            }

            return (
                <div className={'changelist-summary-control'}>
                    <AvatarCard
                        imageProperties={imageProperties}
                        primaryLinkText={this.props.changeList.comment}
                        primaryLinkUrl={this._changeListUrl}
                        secondaryText={ `${this._authorDisplayName} ${this._changeListId} ${this._authoredDate}` }
                        />
                </div>);
        } else {
            return <div/>;
        }
    }

    private _populateControlAttributes(): void {
        // populating the author's email id
        this._authorEmail = !this.props.changeList.ownerId ? this.props.changeList.ownerDisplayName : "";

        // populating the authored date
        this._authoredDate = Utils_Date.friendly(this.props.changeList.creationDate);

        // populating the author's display name
        const authorName = this.props.changeList.ownerDisplayName || this.props.changeList.owner || "";
        const idReference = IdentityHelper.parseUniquefiedIdentityName(authorName);
        this._authorDisplayName = idReference ? (idReference.displayName || authorName) : authorName;

        // populating the changeList Id and Url
        if (this.props.changeListType === ChangeListType.GitCommit) {
            const gitCommit = this.props.changeList as GitCommit;
            if (gitCommit && gitCommit.commitId) {
                this._changeListId = gitCommit.commitId.short;
                this._changeListUrl = VersionControlUrls.getCommitUrl(this.props.repositoryContext as GitRepositoryContext, gitCommit.commitId.full);
            }
        } else {
            const tfsChangeList = this.props.changeList as TfsChangeList;
            if (tfsChangeList && tfsChangeList.changesetId) {
                this._changeListId = tfsChangeList.changesetId.toString();
                this._changeListUrl = VersionControlUrls.getChangesetUrl(tfsChangeList.changesetId);
            }
        }
    }
}
