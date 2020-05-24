import * as React from "react";
import {
    ConstrainMode,
    DetailsList,
    IColumn,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { getId } from 'OfficeFabric/Utilities';
import * as Utils_String from "VSS/Utils/String";
import { PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";
import { AvatarBadge, AvatarCard } from "VersionControl/Scenarios/Shared/AvatarControls";
import { AvatarImageSize, IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { Flyout } from "VersionControl/Scenarios/Shared/Flyout";
import {
    ChangeDetailsAuthorDetailsTitle,
    ChangeDetailsAuthoredOn,
    CommitDetailsCommittedOn,
    CommitDetailsPushedOn,
    ChangeDetailsAuthoredAriaLabel,
    CommitDetailsCommittedAriaLabel,
    CommitDetailsPushedAriaLabel,
    CommitDetails_PushDetailsLink_Tooltip,
    StakeHoldersFlyout_AriaDescription
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";

import "VSS/LoaderPlugins/Css!VersionControl/StakeholdersFlyout";

export interface IStakeholdersProps {
    badgeHeader: IAvatarImageProperties;
    author?: IAvatarImageProperties;
    committer?: IAvatarImageProperties;
    pusher?: IAvatarImageProperties;
    authoredDate?: Date;
    commitDate?: Date;
    pushedDate?: Date;
    imageUrl?: string;
    pushUrl?: string;
    flyoutContentClassName?: string;
    onFlyoutOpen?: () => void;
}

interface AvatarCardArguments {
    stakeholderImage: IAvatarImageProperties;
    secondaryText?: string;
    secondaryTextTooltip?: string;
    secondaryLinkText?: string;
    secondaryLinkTextTooltip?: string;
    secondaryLinkUrl?: string;
    onSecondaryLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
    rowAriaLabel?: string;
}

export class StakeholdersFlyout extends React.Component<IStakeholdersProps, {}> {
    private _ariaDescribedById: string;

    constructor(props: IStakeholdersProps) {
        super(props);

        this._ariaDescribedById = getId("stakeholders-flyout-describedby");
    }

    public render(): JSX.Element {
        const badgeHeader = this.props.badgeHeader;

        if (!badgeHeader) {
            return null;
        }

        return (
            <Flyout
                isEnabled={true}
                setInitialFocus={true}
                calloutHasFocusableElements={true}
                toolTip={badgeHeader.email}
                ariaLabel={badgeHeader.displayName}
                ariaDescribedBy={this._ariaDescribedById}
                dropdownContent={this._getStakeholdersFlyoutContent()}
                onOpen={this.props.onFlyoutOpen}
                >
                <AvatarBadge imageProperties={badgeHeader} />
                <div className="hidden" id={this._ariaDescribedById}>
                    {StakeHoldersFlyout_AriaDescription}
                </div>
            </Flyout>
        );
    }

    private _getStakeholdersFlyoutContent(): JSX.Element {
        const avatarCardArgsList: AvatarCardArguments[] = this._getAvatarCardArgsList();
        const classNameFromProps = (this.props.flyoutContentClassName) ? this.props.flyoutContentClassName : ""; 

        return (
            <div className={"stakeholders-flyout-content " + classNameFromProps}>
                <div className={"flyout-content-title"} title={ChangeDetailsAuthorDetailsTitle} aria-label={ChangeDetailsAuthorDetailsTitle} >
                    {ChangeDetailsAuthorDetailsTitle}
                </div>

                <DetailsList
                    initialFocusedIndex={0}
                    columns={this._getColumn()}
                    getRowAriaLabel={this._getRowAriaLabel}
                    items={avatarCardArgsList}
                    isHeaderVisible={false}
                    constrainMode={ConstrainMode.unconstrained}
                    selectionMode={SelectionMode.none} />
            </div>
        );
    }

    private _getColumn(): IColumn[] {
        return [{
            fieldName: null,
            key: "AuthorDetailsList",
            name: "Author Details",
            minWidth: 300,
            maxWidth: Infinity,
            onRender: (item: AvatarCardArguments, index: number, column: IColumn) =>
                <AvatarCard
                    imageProperties={item.stakeholderImage}
                    imageTooltip={item.stakeholderImage.email}
                    primaryText={item.stakeholderImage.displayName}
                    primaryTextTooltip={item.stakeholderImage.email}
                    secondaryText={item.secondaryText}
                    secondaryTextTooltip={item.secondaryTextTooltip}
                    secondaryLinkText={item.secondaryLinkText}
                    secondaryLinkTextTooltip={item.secondaryLinkTextTooltip}
                    secondaryLinkUrl={item.secondaryLinkUrl}
                    onSecondaryLinkClick={item.onSecondaryLinkClick} />
            ,
            className: "authorlist-row"
        } as IColumn];
    }

    private _getAvatarCardArgsList(): AvatarCardArguments[] {
        const avatarCardArgsList: AvatarCardArguments[] = [];

        if (this.props.author && this.props.authoredDate) {
            const authorRowAriaLabel = this._getAriaLabelForStakeHolder(ChangeDetailsAuthoredAriaLabel, this._getSanitizedAriaText(this.props.author.email), this.props.authoredDate);
            const avatarCardSecondaryText = this._getAvatarCardSecondaryText(ChangeDetailsAuthoredOn, this.props.authoredDate);
            avatarCardArgsList.push(this._getAvatarCardArguments(this.props.author, avatarCardSecondaryText, null, null, null, null, null, authorRowAriaLabel));
        }

        if (this.props.committer && this.props.commitDate) {
            const committerRowAriaLabel = this._getAriaLabelForStakeHolder(CommitDetailsCommittedAriaLabel, this._getSanitizedAriaText(this.props.committer.email), this.props.commitDate);
            const avatarCardSecondaryText = this._getAvatarCardSecondaryText(CommitDetailsCommittedOn, this.props.commitDate);
            avatarCardArgsList.push(this._getAvatarCardArguments(this.props.committer, avatarCardSecondaryText, null, null, null, null, null, committerRowAriaLabel));
        }

        if (this.props.pusher && this.props.pushedDate && this.props.pushUrl) {
            const pusherRowAriaLabel = this._getAriaLabelForStakeHolder(CommitDetailsPushedAriaLabel, this._getSanitizedAriaText(this.props.pusher.email), this.props.pushedDate);
            const avatarCardSecondaryText = this._getAvatarCardSecondaryText(CommitDetailsPushedOn, this.props.pushedDate);
            avatarCardArgsList.push(this._getAvatarCardArguments(this.props.pusher, null, avatarCardSecondaryText, this.props.pushUrl, null, CommitDetails_PushDetailsLink_Tooltip, this._onClickNavigationHandlerForPusher, pusherRowAriaLabel));
        }

        return avatarCardArgsList;
    }

    private _getAvatarCardArguments(
        stakeholderImage: IAvatarImageProperties,
        secondaryText?: string,
        secondaryLinkText?: string,
        secondaryLinkUrl?: string,
        secondTextToolTip?: string,
        secondLinkTextToolTip?: string,
        onSecondaryLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void,
        rowAriaLabel?: string): AvatarCardArguments {

        if (!stakeholderImage) {
            return null;
        }

        stakeholderImage.size = AvatarImageSize.Small;
        const avatarCardArgs: AvatarCardArguments = {
            stakeholderImage: stakeholderImage,
            secondaryText: secondaryText,
            secondaryTextTooltip: secondTextToolTip,
            secondaryLinkText: secondaryLinkText,
            secondaryLinkTextTooltip: secondLinkTextToolTip,
            secondaryLinkUrl: secondaryLinkUrl,
            onSecondaryLinkClick: onSecondaryLinkClick,
            rowAriaLabel: rowAriaLabel
        }
        return avatarCardArgs;
    }

    private _getRowAriaLabel = (item: AvatarCardArguments): string => {
        return item.rowAriaLabel;
    }

    private _getAriaLabelForStakeHolder(ariaLabelFormat: string, stakeHolderWithEmailId: string, date: Date): string {
        return Utils_String.format(ariaLabelFormat, stakeHolderWithEmailId, VCDateUtils.getDateStringWithUTCOffset(date));
    }

    private _getAvatarCardSecondaryText(textFormat: string, date: Date): string {
        return Utils_String.format(textFormat, VCDateUtils.getDateStringWithUTCOffset(date));
    }

    private _onClickNavigationHandlerForPusher = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, PushesHubRoutes.pushViewHubId, (event.currentTarget as HTMLAnchorElement).href);
    }

    private _getSanitizedAriaText(ariaText: string): string {
        const ariaLabel = (ariaText) ? ariaText : "";
        return ariaLabel;
    }
}