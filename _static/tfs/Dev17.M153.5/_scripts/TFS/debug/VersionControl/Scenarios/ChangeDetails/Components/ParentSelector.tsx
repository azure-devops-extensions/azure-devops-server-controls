import * as React from "react";
import { css, getId } from 'OfficeFabric/Utilities';

import * as Utils_String from "VSS/Utils/String";

import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { AvatarImageSize, IAvatarImageProperties, IAvatarImageStyle } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { Parser } from "VersionControl/Scripts/CommentParser";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getCommitUrl } from "VersionControl/Scripts/VersionControlUrls";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import { defaultGravatarMysteryManString } from "VersionControl/Scenarios/Shared/AvatarControls";
import { LinkWithTooltip } from "VersionControl/Scenarios/Shared/LinkWithTooltip";
import { TwoLineView } from "VersionControl/Scenarios/Shared/TwoLineView";

import { ChangeDetailsTelemetryFeatures, ChangeDetailsTelemetryProperties, getCustomerIntelligenceData } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { Dropdown, DropdownItem } from "VersionControl/Scenarios/ChangeDetails/Components/Dropdown";
import { ExtendedGitIdentityReference } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";

import "VSS/LoaderPlugins/Css!VersionControl/ParentSelector";

import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";

export interface ParentSelectorProps extends IChangeDetailsPropsBase {
    currentCommit: GitCommit;
    onDiffParentUpdated(newDiffParent: string): void;
    parentDetails: GitCommit[];
    parentIndex: number;
    isFullScreenMode?: boolean;
    repositoryContext: GitRepositoryContext;
}

export class ParentSelector extends React.Component<ParentSelectorProps, {}> {
    private _parentSelectorDescribedById: string;
    private _parentItemDescribedByIds: { [key: number]: string };

    constructor(props: ParentSelectorProps) {
        super(props);

        this._parentSelectorDescribedById = getId('described-by');
        this._parentItemDescribedByIds = {};
    }

    public render(): JSX.Element {
        return (
            <div>
                <Dropdown
                    className={"commit-parents"}
                    dropDownButtonAriaLabel={VCResources.CommitDetails_ParentSelectorAriaLabel}
                    dropDownButtonAriaDescribedBy={this._parentSelectorDescribedById}
                    items={this._getItems()}
                    onItemSelected={this._diffEntrySelected}
                    initialSelectedItemIndex={this._getDiffIndex()} />
                <div id={this._parentSelectorDescribedById} className={"hidden"}>
                    {VCResources.CommitDetails_ParentSelectorAriaDescription}
                </div>
                {this._getParentDescriptionElements(this.props.currentCommit.parents.length)}
            </div>
        );
    }

    private _diffEntrySelected = (itemIndex: number): void => {
        const ciData = getCustomerIntelligenceData(this.props.customerIntelligenceData);

        const newParentIndex = itemIndex + 1;
        if (newParentIndex !== this.props.parentIndex) {
            const newDiffParentAction = newParentIndex > this.props.parentDetails.length ? VersionControlActionIds.Summary : VersionControlActionIds.DiffParent + newParentIndex;
            this.props.onDiffParentUpdated(newDiffParentAction);

            ciData.properties[ChangeDetailsTelemetryProperties.selectedDiffAction] = newDiffParentAction;
        }

        ciData.publish(ChangeDetailsTelemetryFeatures.diffSelection);
    };

    private _getDiffIndex(): number {
        let newParentIndex = 0;

        if (this.props.currentCommit.parents.length > 1) {
            if (this.props.parentIndex === -1) {
                newParentIndex = this.props.currentCommit.parents.length; // Last entry is for changes while merging
            } else {
                newParentIndex = this.props.parentIndex - 1;
            }
        }

        return newParentIndex;
    }

    private _getItems(): DropdownItem[] {
        const elements: DiffSelectorItem[] = [];
        let imageProperties: IAvatarImageProperties;
        let avatarImageStyle: IAvatarImageStyle;
        let identityImage: JSX.Element;

        if (this.props.currentCommit.author) {
            imageProperties = {
                displayName: this.props.currentCommit.author.displayName,
                email: this.props.currentCommit.author.id,
                identityId: null,
                size: AvatarImageSize.Small,
                imageUrl: (this.props.currentCommit.author as ExtendedGitIdentityReference).imageUrl,
            }
            avatarImageStyle = AvatarUtils.AvatarImageSizeToCssStyle(imageProperties.size);
            identityImage = <IdentityImage.Component
                cssClass={css("avatar-identity-picture", "cursor-hover-card")}
                size={avatarImageStyle.className}
                identity={AvatarUtils.AvatarImagePropertiesToPersonaCardIdentityRef(imageProperties)}
                defaultGravatar={defaultGravatarMysteryManString}
                dataIsFocusable
                showProfileCardOnClick={true} />;
        }
        for (let i = 0; i < this.props.currentCommit.parents.length; i++) {
            const fullSha = this.props.currentCommit.parents[i].objectId.full;

            const stateParams: any = { fullScreen: undefined };
            if (this.props.isFullScreenMode) {
                stateParams.fullScreen = this.props.isFullScreenMode;
            }
            elements.push({
                commitId: fullSha,
                isParent: true,
                metaText: Utils_String.format(VCResources.ParentCommitAnnotationFormat, i + 1),
                commitUrl: getCommitUrl(this.props.repositoryContext, fullSha, true, null, stateParams),
                imageComponent: this.props.currentCommit.author && identityImage,
            });

            if (this.props.parentDetails) {
                elements[i].commit = this.props.parentDetails[i];
            }
        }

        if (this.props.currentCommit.parents.length > 1) {
            elements.push({
                commitId: this.props.currentCommit.commitId.full,
                isParent: false,
                metaText: VCResources.CommitDetailsParentSelectorMergeText,
                commit: this.props.currentCommit,
                imageComponent: this.props.currentCommit.author && identityImage,
            });
        }

        return elements.map((value: DiffSelectorItem, index: number): DropdownItem => {
            return {
                content: <DiffSelectorItemDropdownComponent item={value} />,
                contentAriaLabel: value.metaText,
                contentAriaDescribedBy: this._getParentItemDescribedById(index),
                contentInHeader: <DiffSelectorItemHeaderComponent
                    item={value}
                    customerIntelligenceData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />,
                commit: value.commit,
                imageComponent: value.imageComponent,
            };
        });
    }

    private _getParentDescriptionElements(parentCount: number): JSX.Element[] {
        const _parentDescriptionElements: JSX.Element[] = [];
        for (let i = 0; i < parentCount; i++) {
            _parentDescriptionElements.push(
                <div key={i} id={this._getParentItemDescribedById(i)} className={"hidden"}>
                    {Utils_String.format(VCResources.CommitDetails_ParentItem_Description, i + 1)}
                </div>
            );
        }
        if (parentCount > 1) {
            _parentDescriptionElements.push(
                <div key={parentCount} id={this._getParentItemDescribedById(parentCount)} className={"hidden"}>
                    {VCResources.CommitDetails_MergeChanges_Description}
                </div>
            );
        }
        return _parentDescriptionElements;
    }

    private _getParentItemDescribedById(parentIndex: number): string {
        if (!this._parentItemDescribedByIds || !this._parentItemDescribedByIds[parentIndex]) {
            this._parentItemDescribedByIds[parentIndex] = getId("parent-described-by");
        }
        return this._parentItemDescribedByIds[parentIndex];
    }
}

// Exported for UT
export interface DiffSelectorItemComponentsProps extends IChangeDetailsPropsBase {
    item: DiffSelectorItem;
}

// Exported for UT
export interface DiffSelectorItem {
    commitId: string;
    isParent: boolean;
    metaText: string;
    commit?: GitCommit;
    commitUrl?: string;
    imageComponent?: JSX.Element;
}

// Exported for UT
export const DiffSelectorItemDropdownComponent = (props: DiffSelectorItemComponentsProps): JSX.Element => {
    const commit = props.item.commit;
    if (!commit || !commit.author) {
        return <DiffSelectorItemHeaderComponent item={props.item} />;
    }

    return (
        <TwoLineView
            primaryText={Parser.getShortComment(commit.comment, null, true)}
            secondaryText={Utils_String.format(
                VCResources.DiffSelectorItemSecondaryText,
                props.item.metaText,
                getShortCommitId(commit.commitId.full),
                commit.author.displayName)}
        />
    );
};

// Exported for UT
export class DiffSelectorItemHeaderComponent extends React.Component<DiffSelectorItemComponentsProps, {}> {
    public render(): JSX.Element {
        const item = this.props.item;

        return (
            <span className={"diff-selector-item"}>
                {item.isParent
                    ? VCResources.CommitDetailsParentSelectorDiffTo
                    : VCResources.CommitDetailsParentSelectorMergeText}
                {item.isParent &&
                    <span>
                        <LinkWithTooltip
                            className={"parent-link"}
                            href={item.commitUrl}
                            tooltipContent={Utils_String.format(VCResources.CommitDetails_ParentSelectorLink_Tooltip, item.metaText)}
                            ariaDescription={Utils_String.format(VCResources.CommitDetails_ParentSelectorLink_AriaDescribedBy, item.metaText, getShortCommitId(item.commitId))}
                            onClick={this._onLinkClick}>
                            {item.metaText}
                        </LinkWithTooltip>
                        {" - "}
                        <span className={"commit-id"}>
                            {getShortCommitId(item.commitId)}
                        </span>
                    </span>
                }
            </span>
        );
    }

    private _onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, CodeHubContributionIds.historyHub, (event.currentTarget as HTMLAnchorElement).href);

        const ciData = getCustomerIntelligenceData(this.props.customerIntelligenceData);
        ciData.properties[ChangeDetailsTelemetryProperties.parentIndex] = this.props.item.metaText;

        ciData.publish(ChangeDetailsTelemetryFeatures.parentNavigation, true);
    };
}
