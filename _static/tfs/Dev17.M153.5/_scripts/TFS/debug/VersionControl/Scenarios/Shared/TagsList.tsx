/// <reference types="react" />

import * as React from "react";
import { ColumnActionsMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { css, getId } from "OfficeFabric/Utilities";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCControlsCommon from "VersionControl/Scripts/Controls/ControlsCommon";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { Flyout } from "VersionControl/Scenarios/Shared/Flyout";

import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";

import "VSS/LoaderPlugins/Css!VersionControl/TagsList";

export interface TagsListProps extends React.Props<void> {
    tags: GitTag[];
    itemPath: string;
    repositoryContext: RepositoryContext;
    className?: string;
    maxTagCount?: number;
}

export class TagsList extends React.Component<TagsListProps, {}> {
    private showInitialTags;
    constructor(props) {
        super(props);
    }
    public render(): JSX.Element {
        if (!this.props.tags || this.props.tags.length === 0) {
            return null;
        }

        let maxTagsToshow = this.props.maxTagCount || this.props.tags.length;
        if (maxTagsToshow > this.props.tags.length) {
            maxTagsToshow = this.props.tags.length;
        }

        return <div className={css("tags-list-control", this.props.className) }>
            {
                this.props.tags.slice(0, maxTagsToshow - 1).map((tag: GitTag, index: number) =>
                    <TagFlyoutComponent
                        key={index.toString()}
                        tag={tag}
                        repositoryContext={this.props.repositoryContext}
                        itemPath={this.props.itemPath}/>)
            }
            {
                // If all tags cannot be accomodated in the space given 
                // We start showing +n more tags after the displayed tags
                // Which onClick will show the rest of the tags as list
                maxTagsToshow === this.props.tags.length
                    ? <TagFlyoutComponent
                        tag={this.props.tags[maxTagsToshow - 1]}
                        repositoryContext={this.props.repositoryContext}
                        itemPath={this.props.itemPath}/>
                    : maxTagsToshow < this.props.tags.length && <ShowRemainingTagsComponent
                        tags={this.props.tags.slice(maxTagsToshow - 1, this.props.tags.length)}
                        repositoryContext={this.props.repositoryContext}
                        itemPath={this.props.itemPath}/>

            }
        </div>;
    }
}

interface TagsDetailsListProps {
    tags: GitTag[];
    repositoryContext: RepositoryContext;
    itemPath: string;
    tagFlyoutContentTitle: string
}

class TagsDetailsList extends React.Component<TagsDetailsListProps, {}>{
    private _columns: IColumn[] = [];

    constructor(props: TagsDetailsListProps) {
        super(props);
        this._populateTagsListColumns(props.tagFlyoutContentTitle);
    }

    private _onRenderTagsListColumn = (item: GitTag): JSX.Element => {
        return (
            <TagDetails
                tag={item}
                href={this._getTagNameLinkHref(item.name) }/>);
    }

    private _populateTagsListColumns(tagFlyoutContentTitle: string): void {
        const tagsListColumn: IColumn = {
            key: "Tag Details",
            name: tagFlyoutContentTitle,
            headerClassName: "tag-flyout-content-title",
            columnActionsMode: ColumnActionsMode.disabled,
            minWidth: 170,
            fieldName: null,
            isMultiline: true,
            onRender: this._onRenderTagsListColumn
        };

        this._columns.push(tagsListColumn);
    }

    private _getTagNameLinkHref = (tagName: string): string => {
        return VersionControlUrls.getTagExplorerUrl(
            this.props.repositoryContext as GitRepositoryContext,
            tagName);
    }

    public render(): JSX.Element {

        return (
            <div
                className={"tags-flyout-content"}>
                <VssDetailsList
                    key={"tags-flyout-list"}
                    ariaLabelForListHeader={this.props.tagFlyoutContentTitle}
                    initialFocusedIndex={0}
                    items={this.props.tags}
                    columns={this._columns}
                    selectionMode={SelectionMode.none}
                    isHeaderVisible={true}/>
            </div>
        );
    }
}

const TagDetails = (props: { tag: GitTag, href: string }): JSX.Element => {
    let taggerText = "";
    let taggerTooltip = "";
    if (props.tag.tagger) {
        const dateString = VCDateUtils.getDateStringWithUTCOffset(props.tag.tagger.date);
        const taggerDisplayName = props.tag.tagger.email
            ? Utils_String.format(
                VCResources.TagFlyout_TaggerDisplayNameFormat,
                props.tag.tagger.name,
                props.tag.tagger.email)
            : props.tag.tagger.name;

        taggerText = Utils_String.format(VCResources.TagFlyout_TaggerText, props.tag.tagger.name, dateString);
        taggerTooltip = Utils_String.format(VCResources.TagFlyout_TaggerText, taggerDisplayName, dateString);
    }

    return (<div className={"tag-details"}>
        <Link
            className={"tag-name"}
            href={props.href}
            onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                onClickNavigationHandler(event, CodeHubContributionIds.gitFilesHub, (event.currentTarget as HTMLAnchorElement).href) }
            title={VCResources.TagFlyout_BrowseTagText}>
            {props.tag.name}
        </Link>
        {
            !!props.tag.comment &&
            <div className={"tag-comment"}>
                {props.tag.comment}
            </div>
        }
        {
            !!props.tag.tagger &&
            <div className={"tag-tagger-and-date"} title={taggerTooltip}>
                {taggerText}
            </div>
        }
    </div>);
}

interface ShowRemainingTagsComponentProps {
    tags: GitTag[];
    repositoryContext: RepositoryContext;
    itemPath: string;
}

const ShowRemainingTagsComponent = (props: ShowRemainingTagsComponentProps): JSX.Element => {
    return <Flyout
        className="tag-flyout-control"
        isEnabled={true}
        setInitialFocus={true}
        calloutHasFocusableElements={true}
        toolTip={VCResources.TagsList_ShowRemainingTags}
        dropdownContent={<TagsDetailsList {...props} tagFlyoutContentTitle={VCResources.TagFlyout_AnnotatedTagTitle}/>}>
        <span className="flyout-header-title" aria-label={VCResources.TagsList_ShowRemainingTags}>
            <span className="tags-icon bowtie-icon bowtie-tag"/>
            <span className="tags-name">
                {Utils_String.format(VCResources.TagsList_RemainingTagsHeader, props.tags.length) }
            </span>
        </span>
    </Flyout>
}

interface TagFlyoutComponentProps {
    tag: GitTag;
    repositoryContext: RepositoryContext;
    itemPath: string;
}

const TagFlyoutComponent = (props: TagFlyoutComponentProps): JSX.Element => {
    const tagNameTooltip = Utils_String.format(VCResources.TagFlyout_TagNameTooltip, props.tag.name);
    let tagFlyoutContentTitle: string = VCResources.TagFlyout_AnnotatedTagTitle;

    if (!props.tag.tagger) {
        tagFlyoutContentTitle = VCResources.TagFlyout_LightweightTagTitle;
    }

    return <Flyout
        className="tag-flyout-control"
        key={props.tag.name}
        isEnabled={true}
        calloutHasFocusableElements={true}
        setInitialFocus={true}
        toolTip={tagNameTooltip}
        dropdownContent={
            <TagsDetailsList
                tags={[props.tag]}
                itemPath={props.itemPath}
                repositoryContext={props.repositoryContext}
                tagFlyoutContentTitle={tagFlyoutContentTitle}/>
        }>
        <span className="flyout-header-title" aria-label={tagNameTooltip}>
            <span className="tags-icon bowtie-icon bowtie-tag"/>
            <span className="tags-name">
                {props.tag.name}
            </span>
        </span>
    </Flyout>
}
