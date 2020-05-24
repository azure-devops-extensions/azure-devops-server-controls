import * as React from "react";

import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import { findIndex } from "VSS/Utils/Array";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { AddUpstreamProtocolSelection } from "Package/Scripts/Components/Settings/AddUpstreamProtocolSelection";
import { UpstreamConstants } from "Package/Scripts/Components/Settings/CommonTypes";
import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { getPermissionSettingsUrl } from "Package/Scripts/Helpers/UrlHelper";
import * as PackageResources from "Feed/Common/Resources";
import {
    Feed,
    FeedView,
    FeedVisibility,
    UpstreamSource,
    UpstreamSourceType
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

export interface IAddCollectionInternalSourcePanelSectionProps extends Props {
    /**
     * List of  feeds in the collection
     */
    availableFeedsForUpstreams: Feed[];

    /**
     * Callback to be used when a set of upstream sources have been selected
     */
    selectedUpstreamSourcesHandler: (sources: UpstreamSource[]) => void;

    /**
     * List of upstreams sources which are configured for the current feed
     */
    currentInternalUpstreamSources: UpstreamSource[];

    /**
     * Error message to display on upstream source name field
     */
    upstreamSourceNameInvalidMessage?: string;

    /**
     * Internal upstream feature availability
     */
    internalUpstreamSettings: IInternalUpstreamSettingsState;
}

export interface IAddCollectionInternalSourcePanelSectionState extends State {
    /**
     * Selected feed to configure as upstream
     */
    selectedFeed: Feed;

    /**
     * Views from the selected feed
     */
    viewsFromSelectedFeed: FeedView[];

    /**
     * The name of the upstream
     */
    upstreamName: string;

    /**
     * Selected view to configure as upstream
     */
    selectedView: FeedView;

    /**
     * List of selected protocols
     */
    selectedProtocols: string[];

    /**
     * Function that returns message bar
     */
    getMessageBar: () => JSX.Element;
}

/**
 * Panel that allows the user to specify an upstream source for addition to the feed
 */
export class AddCollectionInternalSourcePanelSection extends Component<
    IAddCollectionInternalSourcePanelSectionProps,
    IAddCollectionInternalSourcePanelSectionState
> {
    private _isUpstreamNameDirty: boolean = false;
    private _feedsDataService: FeedsDataService;
    private _collectionContext: HostContext;
    private currentInternalUpstreamsMap: { [feedId: string]: string[] };
    private _dropdown: Dropdown = null;

    constructor(props: IAddCollectionInternalSourcePanelSectionProps) {
        super(props);
        this._collectionContext = Service.VssConnection.getConnection().getWebContext().collection;
        /*
        NOTE: Do not repeat this pattern until it has been approved
         */
        this._feedsDataService = Service.getLocalService(FeedsDataService);

        this.currentInternalUpstreamsMap = {};
        props.currentInternalUpstreamSources.forEach((source: UpstreamSource) => {
            if (source.upstreamSourceType !== UpstreamSourceType.Internal) {
                return;
            }

            if (source.internalUpstreamFeedId == null) {
                return;
            }

            if (!this.currentInternalUpstreamsMap[source.internalUpstreamFeedId]) {
                this.currentInternalUpstreamsMap[source.internalUpstreamFeedId] = [] as string[];
            }

            this.currentInternalUpstreamsMap[source.internalUpstreamFeedId].push(source.internalUpstreamViewId);
        });

        this.state = {
            selectedFeed: null,
            viewsFromSelectedFeed: null,
            upstreamName: "",
            selectedView: null,
            selectedProtocols: [],
            getMessageBar: () => null
        };
    }

    public render(): JSX.Element {
        return (
            <div>
                <div className="upstream-panel-element">
                    <TextField
                        label={PackageResources.AddUpstream_AccountTextFieldLabel}
                        disabled={true}
                        value={this._collectionContext.name}
                    />
                </div>
                <div className="upstream-panel-element">
                    <Dropdown
                        placeHolder={PackageResources.AddUpstream_FeedSelectorPlaceholder}
                        label={PackageResources.AddUpstream_FeedSelectorLabel}
                        options={this.props.availableFeedsForUpstreams.map((feed: Feed) => ({
                            key: feed.id,
                            text: feed.name,
                            data: feed
                        }))}
                        onChanged={this._onSelectedFeedChanged}
                        required={true}
                        selectedKey={!!this.state.selectedFeed ? this.state.selectedFeed.id : null}
                        ref={(element: Dropdown) => (this._dropdown = element)}
                    />
                </div>
                {this.state.getMessageBar()}
                <div className="upstream-panel-element">
                    <AddUpstreamProtocolSelection
                        selectedProtocolsChangedHandler={this.selectedProtocolsChangedHandler}
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                    />
                </div>
                <div className="upstream-panel-element">
                    <Dropdown
                        placeHolder={this._getViewSelectorPlaceholderText()}
                        label={PackageResources.AddUpstream_ViewSelectorLabel}
                        options={this._getViewOptions()}
                        disabled={!this.state.viewsFromSelectedFeed || this.state.viewsFromSelectedFeed.length === 0}
                        onChanged={this._onSelectedViewChanged}
                        required={true}
                        selectedKey={!!this.state.selectedView ? this.state.selectedView.id : null}
                    />
                </div>
                <div className="upstream-panel-element">
                    <TextField
                        label={PackageResources.AddUpstream_UpstreamNameTextFieldLabel}
                        value={this._getUpstreamName()}
                        required={true}
                        onChanged={this._onUpstreamNameChanged}
                        disabled={!this.state.selectedView}
                        maxLength={UpstreamConstants.MaxUpstreamNameLength}
                        errorMessage={this.props.upstreamSourceNameInvalidMessage}
                    />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this.setFocus();
    }

    private getNoUpstreamableViewsMessage(feedName: string): JSX.Element {
        const feedPermissionSettingsUrl = getPermissionSettingsUrl(feedName);
        // TODO: link to shared view docs
        return (
            <MessageBar messageBarType={MessageBarType.warning}>
                <FormatComponent format={PackageResources.AddUpstream_NoAvailableViewsMessage}>
                    <ExternalLink href={feedPermissionSettingsUrl}>
                        {PackageResources.AddUpstream_NoAvailableViewsMessage_FeedOwner}
                    </ExternalLink>
                    {PackageResources.AddUpstream_NoAvailableViewsMessage_SharedView}
                </FormatComponent>
            </MessageBar>
        );
    }

    private getNoMoreUpstreamableViewsMessage(): JSX.Element {
        return (
            <MessageBar messageBarType={MessageBarType.warning}>
                {PackageResources.AddUpstream_NoMoreUpstreamableViewsMessage}
            </MessageBar>
        );
    }

    private _getViewOptions(): IDropdownOption[] {
        if (this.state.viewsFromSelectedFeed && this.state.viewsFromSelectedFeed.length > 0) {
            return this.state.viewsFromSelectedFeed.map((view: FeedView) => ({
                key: view.id,
                text: view.name,
                data: view,
                disabled: view.visibility === FeedVisibility.Private
            }));
        }

        return [];
    }

    @autobind
    private _getViewSelectorPlaceholderText(): string {
        if (!this.state.viewsFromSelectedFeed) {
            return PackageResources.AddUpstream_ViewSelectorPlaceholder_SelectFeed;
        }

        if (this.state.viewsFromSelectedFeed.length === 0) {
            return PackageResources.AddUpstream_ViewSelectorPlaceholder_NoViewsAvailable;
        }

        return PackageResources.AddUpstream_ViewSelectorPlaceholder_Default;
    }

    @autobind
    private _onSelectedFeedChanged(item: IDropdownOption): void {
        if (item.data == null) {
            return;
        }

        // Clear the upstream source in the parent
        this.props.selectedUpstreamSourcesHandler(null);

        const selectedFeed = item.data as Feed;
        /*
        NOTE: Do not repeat this pattern until it has been approved
         */
        this._feedsDataService.getFeedViewsAsync(selectedFeed).then((views: FeedView[]) => {
            const selectedViewsForFeed = this.currentInternalUpstreamsMap[selectedFeed.id] || ([] as string[]);

            const remainingViews: FeedView[] = views.filter(
                (view: FeedView) => selectedViewsForFeed.indexOf(view.id) < 0
            );

            const selectableViews: FeedView[] = remainingViews.filter(
                (view: FeedView) => view.visibility !== FeedVisibility.Private
            );

            const defaultViewIndex = findIndex(selectableViews, view => view && view.id === selectedFeed.defaultViewId);

            const selectedView =
                defaultViewIndex !== -1
                    ? selectableViews[defaultViewIndex]
                    : selectableViews.length > 0
                        ? selectableViews[0]
                        : null;

            let getMessageBar: () => JSX.Element = () => null;

            if (selectableViews.length === 0) {
                // In the past, user added a view from this feed
                // and at the moment, feed doesn't contain any more upstream-able views
                if (selectedViewsForFeed.length > 0) {
                    getMessageBar = () => this.getNoMoreUpstreamableViewsMessage();
                }

                // no views were upstreamed from this feed yet
                // and at the moment, feed doesn't contain any upstream-able views
                if (selectedViewsForFeed.length === 0) {
                    getMessageBar = () => this.getNoUpstreamableViewsMessage(selectedFeed.name);
                }
            }

            this.setState(
                {
                    viewsFromSelectedFeed: remainingViews,
                    selectedFeed,
                    upstreamName: this._getFormattedUpstreamName(selectedFeed, selectedView),
                    selectedView,
                    getMessageBar
                },
                () => this.props.selectedUpstreamSourcesHandler(this._getUpstreamSources())
            );
        });
    }

    @autobind
    private _onUpstreamNameChanged(newValue: string): void {
        FeedSettingsActionCreator.changeUpstreamSourceName.invoke(newValue);

        this._isUpstreamNameDirty = true;

        this.setState({ upstreamName: newValue }, () => {
            this.props.selectedUpstreamSourcesHandler(this._getUpstreamSources());
        });
    }

    @autobind
    private _onSelectedViewChanged(item: IDropdownOption): void {
        if (item.data == null) {
            return;
        }

        const selectedView = item.data as FeedView;
        this.setState(
            (prevState, props) => {
                return {
                    selectedView,
                    upstreamName: this._getFormattedUpstreamName(prevState.selectedFeed, selectedView)
                };
            },
            () => {
                this.props.selectedUpstreamSourcesHandler(this._getUpstreamSources());
            }
        );
    }

    private _getUpstreamName(): string {
        if (this._isUpstreamNameDirty) {
            return this.state.upstreamName;
        }

        return this._getFormattedUpstreamName(this.state.selectedFeed, this.state.selectedView);
    }

    private _getFormattedUpstreamName(feed: Feed, view: FeedView): string {
        if (!!feed && !!view) {
            let feedName = feed.name;
            let viewName = view.name;

            const currentLength = feedName.length + viewName.length;
            const maxLength = UpstreamConstants.MaxUpstreamNameLength - 1;

            if (currentLength > maxLength) {
                const sectionLength = maxLength / 2;
                feedName = feedName.substring(0, sectionLength);
                viewName = viewName.substring(0, sectionLength);
            }

            return `${feedName}@${viewName}`;
        }

        return "";
    }

    @autobind
    private selectedProtocolsChangedHandler(protocols: string[]): void {
        this.setState(
            {
                selectedProtocols: protocols
            },
            () => {
                this.props.selectedUpstreamSourcesHandler(this._getUpstreamSources());
            }
        );
    }

    private _getUpstreamSources(): UpstreamSource[] {
        if (
            this.state.selectedFeed != null &&
            this.state.selectedView != null &&
            this.state.upstreamName != null &&
            this.state.upstreamName.length > 0
        ) {
            const upstreamSources: UpstreamSource[] = [];

            for (const protocol of this.state.selectedProtocols) {
                upstreamSources.push({
                    id: null,
                    name: this.state.upstreamName,
                    location: null,
                    protocol,
                    upstreamSourceType: UpstreamSourceType.Internal,
                    deletedDate: null,
                    internalUpstreamCollectionId: this._collectionContext.id,
                    internalUpstreamFeedId: this.state.selectedFeed.id,
                    internalUpstreamViewId: this.state.selectedView.id
                } as UpstreamSource);
            }

            return upstreamSources.length > 0 ? upstreamSources : null;
        }

        return null;
    }

    private setFocus(): void {
        if (this._dropdown) {
            this._dropdown.focus();
        }
    }
}
