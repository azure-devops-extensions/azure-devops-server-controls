import * as React from "react";

import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { Link } from "OfficeFabric/Link";
import { autobind } from "OfficeFabric/Utilities";
import { Action } from "VSS/Flux/Action";
import * as Utils_Date from "VSS/Utils/Date";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { getDateStringWithUTCOffset, getPrDisplayDateString } from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiPage, WikiV2 } from "TFS/Wiki/Contracts";
import { AssociatedWorkItemsBadge } from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItemsBadge";
import { AuthorBadge } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/Components/AuthorBadge";
import { IAvatarImageProperties, AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import { getAuthorfromTFSIdentity } from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

import { getCurrentHub } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { isPageWithoutAssociatedContent } from "Wiki/Scripts/WikiPagesHelper";
import { getWikiPageHistoryUrl } from "Wiki/Scripts/WikiUrls";

import { createWikiEventData } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";

import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import { PageMetadataBarActionCreator } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarActionCreator";
import { PageMetadataBarActionsHub } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarActionsHub";
import { PageMetadataSource } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataSource";
import { PageMetadataState, PageMetadataStore } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataStore";
import { getGitItemPathForPage } from "Wiki/Scripts/Helpers";
import * as WikiPageArtifactHelpers from "Wiki/Scripts/WikiPageArtifactHelpers";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarContainer";

export interface PageMetadataBarContainerProps {
    wiki: WikiV2;
    wikiVersion: GitVersionDescriptor;
    page: WikiPage;
    repositoryContext: GitRepositoryContext;
    onLinkedWorkItemsUpdated: Action<void>;
    forceFetch?: boolean;
    showMetadata?: boolean;
    commandBarProps?: ICommandBarProps;
    showPageViewCount?: boolean;
    // PagePath will be used if page is not available
    pagePath?: string;
}

export class PageMetadataBarContainer extends React.Component<PageMetadataBarContainerProps, PageMetadataState> {
    private _store: PageMetadataStore;
    private _pageMetadataSource: PageMetadataSource;
    private _linkWorkItemsSource: LinkWorkItemsSource;
    private _actionsHub: PageMetadataBarActionsHub;
    private _actionCreator: PageMetadataBarActionCreator;

    constructor(props: PageMetadataBarContainerProps) {
        super(props);

        this.state = {
            author: null,
            authoredDate: null,
            revisions: null,
            workItemIds: [],
            pageViewStats: null,
        };

        this._actionsHub = new PageMetadataBarActionsHub();
        this._store = new PageMetadataStore(this._actionsHub);
        this._pageMetadataSource = new PageMetadataSource(this.props.repositoryContext, this.props.wikiVersion);
        this._linkWorkItemsSource = new LinkWorkItemsSource();

        this._actionCreator = new PageMetadataBarActionCreator(
            this.props.wiki,
            this._actionsHub,
            {
                pageMetadataSource: this._pageMetadataSource,
                linkWorkItemsSource: this._linkWorkItemsSource
            },
        )
        this._store.addChangedListener(this._onPageMetadataChanged);
    }

    public componentDidMount(): void {
        if (!this.props.page && !this.props.pagePath) {
            return;
        }

        if (this.props.page && isPageWithoutAssociatedContent(this.props.page)) {
            // code wiki, page is a directory
            return;
        } else {
            const pagePath: string = this.props.page ? this.props.page.path : this.props.pagePath;
            // If page & page's gitItemPath are not available, pagePath is used to calculate gitItemPath
            const gitItemPath: string = this.props.page && this.props.page.gitItemPath
                ? this.props.page.gitItemPath
                : getGitItemPathForPage(this.props.pagePath);
            this._actionCreator.getPageMetadata(pagePath, gitItemPath, this.props.showPageViewCount);
        }
        
        this.props.onLinkedWorkItemsUpdated.addListener(this._onLinkedWorkItemsUpdated);
    }

    public componentWillReceiveProps(nextProps: PageMetadataBarContainerProps) {
        if (nextProps.page) {
            const oldPagePath = this.props.page && this.props.page.path;
            const newPagePath = nextProps.page && nextProps.page.path;

            if (isPageWithoutAssociatedContent(nextProps.page)) {
                return;
            } else if (oldPagePath !== newPagePath || this.props.forceFetch) {
                this._actionCreator.getPageMetadata(nextProps.page.path, nextProps.page.gitItemPath, nextProps.showPageViewCount);
            }
        } else if (this.props.pagePath && nextProps.pagePath && (this.props.pagePath !== nextProps.pagePath)) {
            this._actionCreator.getPageMetadata(nextProps.pagePath, getGitItemPathForPage(nextProps.pagePath), nextProps.showPageViewCount);
        }
    }

    public componentWillUnmount(): void {
        if (this._store) {
            this._store.removeChangedListener(this._onPageMetadataChanged);

            this._store.dispose();
            this._store = null;
        }

        this.props.onLinkedWorkItemsUpdated.removeListener(this._onLinkedWorkItemsUpdated);
    }

    public render(): JSX.Element {
        const pagePath: string = this.props.page ? this.props.page.path : this.props.pagePath;

        if (!pagePath) {
            return null;
        }

        const wikiPageArtifactData: LinkedArtifacts.IHostArtifact = {
            id: WikiPageArtifactHelpers.getWikiPageArtifactId(
                this.props.wiki.projectId,
                this.props.wiki.id,
                pagePath,
            ),
            tool: WikiPageArtifactHelpers.Tool,
            type: WikiPageArtifactHelpers.Type,
            additionalData: {
                [LinkedArtifacts.HostArtifactAdditionalData.ProjectId]: this.props.wiki.projectId,
            },
        };

        const metadataProps = {
            revisionsLink: getWikiPageHistoryUrl(
                {
                    pagePath: pagePath,
                }
            ),
            showPageViewCount: this.props.showPageViewCount,
            pageViewCount: this.state.pageViewStats ? this.state.pageViewStats.count : undefined,
            ...this._store.state
        };

        return (
            <PageMetadataBar
                {...{
                    hostArtifact: wikiPageArtifactData,
                    ...(this.props.showMetadata !== false && metadataProps),
                    commandBarProps: this.props.commandBarProps,
                }}
            />
        );
    }

    @autobind
    public _onLinkedWorkItemsUpdated(): void {
        this._actionCreator.getLinkedWorkItems(this.props.page.path);
    }

    public getAuthor(): string {
        return getAuthorfromTFSIdentity({
            displayName: this.state.author.displayName,
            alias: this.state.author.email,
        });
    }

    public getAuthorDate(): Date {
        return this.state.authoredDate;
    }

    @autobind
    private _onPageMetadataChanged(): void {
        this.setState(this._store.state);
    }
}

export interface PageMetadataBarProps {
    author?: IAvatarImageProperties;
    authoredDate?: Date;
    commandBarProps?: ICommandBarProps;
    revisions?: number;
    revisionsLink?: string;
    showDetailDate?: boolean;
    workItemIds?: number[];
    showPageViewCount?: boolean;
    pageViewCount?: number;
    hostArtifact?: LinkedArtifacts.IHostArtifact;
}

export const PageMetadataBar = (props: PageMetadataBarProps): JSX.Element => {
    let authoredBadge: JSX.Element;
    const authoredDate: Date = props.authoredDate;

    if (authoredDate) {
        const authoredDateString = props.showDetailDate ? getDateStringWithUTCOffset(authoredDate) : getPrDisplayDateString(authoredDate);

        if (WikiFeatures.isImmersiveWikiEnabled() && !props.showDetailDate) {
            authoredBadge = (
                <span className={"immersive-authored-date"}>
                    {`${Utils_Date.isGivenDayToday(props.authoredDate) ? WikiResources.LastUpdated : WikiResources.LastUpdatedOn} ${authoredDateString}`}
                </span>
            );
        } else if (props.author) {
            authoredBadge = (
                <AuthorBadge
                    imageProperties={{ size: AvatarImageSize.SmallMinus, ...props.author }}
                    authoredDateString={authoredDateString}
                />
            );
        }
    }

    return (
        <div className={"wiki-page-metadata-bar"}>
            <div className={"near-items"}>
                {authoredBadge}
                {props.revisions &&
                    <RevisionsLink
                        link={props.revisionsLink}
                        revisions={props.revisions}
                    />
                }
                {props.showPageViewCount && props.pageViewCount &&
                    <FormatComponent
                        className={"immersive-page-views-badge"}
                        format={WikiResources.WikiPageViewsBadgeTextFormat}>
                        <VssIcon iconType={VssIconType.fabric} iconName={"EntryView"} />
                        {props.pageViewCount}
                    </FormatComponent>
                }
                {props.workItemIds &&
                    <div className={"stats-badges-container"}>
                        <AssociatedWorkItemsBadge
                            hostArtifact={props.hostArtifact}
                            associatedWorkItemIds={props.workItemIds}
                            tfsContext={TfsContext.getDefault()}
                            telemetryEventData={createWikiEventData("WITBadge")} />
                    </div>
                }
            </div>
            {props.commandBarProps &&
                <CommandBar
                    items={props.commandBarProps.items}
                    farItems={props.commandBarProps.farItems}
                    className={"wiki-commands-bar"}
                />
            }
        </div>);
};

export interface RevisionsLinkProps {
    revisions: number;
    link: string;
}

export const RevisionsLink = ({ revisions, link }: RevisionsLinkProps): JSX.Element => {
    const revisionString: string = WikiResources.RevisionsString;
    const onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, getCurrentHub(), (event.currentTarget as HTMLAnchorElement).href);
    };

    return (
        <Link
            className={"revisions-link"}
            href={link}
            onClick={onLinkClick}>
            {revisionString}
        </Link>
    );
};
