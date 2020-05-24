import * as React from "react";
import { Link } from "OfficeFabric/Link";
import * as Utils_String from "VSS/Utils/String";
import * as ChangesHistoryUtils from "VersionControl/Scripts/Utils/ChangesHistoryUtils";
import { TwoLineView } from "VersionControl/Scenarios/Shared/TwoLineView";
import { getChangesetsHubContributionId, getShelvesetsHubContributionId } from "VersionControl/Scripts/CodeHubContributionsHelper"
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import * as VCControlsCommon from "VersionControl/Scripts/Controls/ControlsCommon";
import { TfsChangeList, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import "VSS/LoaderPlugins/Css!VersionControl/ChangesHistoryListItem";

export interface ChangesHistoryListItemProps {
    changeList: TfsChangeList;
    repositoryContext: RepositoryContext;
    itemChangeType?: VersionControlChangeType;
    serverItem?: string;
}

export class ChangesHistoryListItem extends React.Component<ChangesHistoryListItemProps, {}> {
    private _firstLineText: string;

    constructor(props: ChangesHistoryListItemProps) {
        super(props);

        this._calculateTitle(this.props);
    }

    public componentWillReceiveProps(nextProps: ChangesHistoryListItemProps): void {
        this._calculateTitle(nextProps);
    }

    public render(): JSX.Element {
        return (
            <div className="changes-history-item">
                {
                    this.props.itemChangeType &&
                    <div className="change-type-text">
                        {this._getChangeTypeText()}
                    </div>
                }
                <div className="changes-history-details">
                    <TwoLineView
                        primaryLinkText={this._firstLineText}
                        onPrimaryLinkClick={this._onPrimaryLinkClick}
                        primaryLinkUrl={this._calculateLinkUrl()}
                        secondaryText={this._getDescriptionText()} />
                </div>
            </div>
        );
    }

    private _calculateTitle(props: ChangesHistoryListItemProps): void {
        this._firstLineText = ChangesHistoryUtils.getChangeLinkText(props.changeList);
    }

    private _onPrimaryLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        const hubId = this.props.changeList.isShelveset
            ? getShelvesetsHubContributionId(this.props.repositoryContext)
            : getChangesetsHubContributionId(this.props.repositoryContext);
        onClickNavigationHandler(event, hubId, (event.currentTarget as HTMLAnchorElement).href);
    }

    private _getChangeTypeText(): string {
        return VCOM.ChangeType.getDisplayText(this.props.itemChangeType);
    }

    private _calculateLinkUrl(): string {
        let linkHref: string;
        if (this.props.changeList.isShelveset) {
            linkHref = VersionControlUrls.getShelvesetUrl(this.props.changeList.shelvesetName, this.props.changeList.owner, this.props.repositoryContext.getTfsContext());
        }
        else {
            if (this.props.itemChangeType && this.props.serverItem) {

                linkHref = VersionControlUrls.getChangesetUrlForFile(
                    this.props.changeList.changesetId,
                    this.props.serverItem,
                    VCOM.ChangeType.isEdit(this.props.itemChangeType) ? VCControlsCommon.VersionControlActionIds.Compare : VCControlsCommon.VersionControlActionIds.Contents,
                    this.props.repositoryContext.getTfsContext());
            }
            else {
                linkHref = VersionControlUrls.getChangesetUrl(this.props.changeList.changesetId, this.props.repositoryContext.getTfsContext());
            }
        }

        return linkHref;
    }

    private _getDescriptionText(): string {

        const authorName: string = this.props.changeList.ownerDisplayName || this.props.changeList.owner || "";
        const dateString: string = VCDateUtils.getDateStringWithFriendlyText(this.props.changeList.creationDate, "d");

        const formatString: string = this.props.changeList.isShelveset
            ? VCResources.HistoryList_Shelveset_Created
            : VCResources.HistoryList_Changeset_Created;

        const descriptionText: string = this.props.changeList.isShelveset
            ? Utils_String.format(formatString, authorName, dateString)
            : Utils_String.format(formatString, authorName, this.props.changeList.changesetId, dateString);

        return descriptionText;
    }
}