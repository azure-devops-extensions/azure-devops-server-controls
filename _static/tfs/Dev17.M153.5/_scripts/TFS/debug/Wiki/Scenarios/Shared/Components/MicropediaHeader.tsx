import * as React from "react";

import { IconButton, DefaultButton } from "OfficeFabric/Button";
import { IconType } from "OfficeFabric/Icon";
import { autobind } from "OfficeFabric/Utilities";
import * as Ajax from "VSS/Ajax";
import * as Locations from "VSS/Locations";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import * as Utils_Array from "VSS/Utils/Array";

import { ContributionKeys, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { TelemetryConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { getDefaultUrlParameters } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { getWikiPageViewUrl, redirectToUrl } from "Wiki/Scripts/WikiUrls";
import { getUrlWithTrackingData } from "Wiki/Scripts/WikiTelemetryUtils";

import { AutoCompleteSearch } from "Wiki/Scenarios/Shared/Components/AutoCompleteSearch";
import { SharedContainerProps } from "Wiki/Scenarios/Shared/Components/WikiContainer";
import { TelemetryWriter } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import { SharedState } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/MicropediaHeader";

export class MicropediaHeader extends React.PureComponent<SharedContainerProps, {}> {
    private _orgHomePageUrl: string;
    private _orgHomeUrlPromise: PromiseLike<void>;
    private _telemetryWriter: TelemetryWriter;

    constructor(props: SharedContainerProps) {
        super(props);
    }

    public componentWillMount(): void {
        this._orgHomeUrlPromise = this._fetchOrgHomeUrl();
        this._telemetryWriter = new TelemetryWriter();
    }

    public render(): JSX.Element {
        const sharedState: SharedState = this.props.sharedStoresHub.state;

        return (
            <div className={"micropedia-header"}>
                <IconButton
                    ariaLabel={"Microsoft Logo"}
                    className={"microsoft-logo"}
                    iconProps={{
                        iconType: IconType.image,
                        imageProps: {
                            src: Locations.urlHelper.getVersionedContentUrl("Wiki/microsoft_logo.png"),
                        },
                    }}
                    onClick={this._navigateToOrgHome}
                    title={WikiResources.NavigateToOrgHomeToolTip}
                />
                <span className="separator" />
                <DefaultButton
                    className={"micropedia-home-link"}
                    onClick={this._navigateToWikiHome}
                    text={"Micropedia"}
                    title={WikiResources.NavigateToMicropediaHomeToolTip}
                />
                <AutoCompleteSearch
                    wiki={sharedState.commonState.wiki}
                    onSearch={this._onSearch}
                    onPageChange={this._onPageChange}
                />
            </div>
        );
    }

    private _fetchOrgHomeUrl(): PromiseLike<void> {
        // HACK: This should come via a data provider
        const url: string = Locations.urlHelper.getMvcUrl({
            action: "MruContextsWithAccountHubGroups",
            area: "api",
            controller: "common",
            queryParams: {
                maxCount: "1",
            },
        });

        return Ajax.issueRequest(url, { type: "GET", dataType: "json" }).then((result) => {
            const resultArray: any[] = result.__wrappedArray;
            const orgHomeUrlItem = Utils_Array.first(resultArray, item => item.isOrgHomePageUrl === true);
            this._orgHomePageUrl = orgHomeUrlItem && orgHomeUrlItem.orgHomePageUrl;
        });
    }

    @autobind
    private _navigateToOrgHome(): void {
        this._telemetryWriter.publish(TelemetryConstants.NavigateToOrgHome);

        const wikiPivotUrlPart: string = "?view=wiki";

        if (this._orgHomePageUrl) {
            redirectToUrl(this._orgHomePageUrl + wikiPivotUrlPart);
            return;
        }

        this._orgHomeUrlPromise.then(() => {
            if (this._orgHomePageUrl) {
                redirectToUrl(this._orgHomePageUrl + wikiPivotUrlPart);
            }
        });
    }

    private _navigateToSearchPage(orgHomePageUrl: string, searchText: string): void {
        this._telemetryWriter.publish(TelemetryConstants.NavigateToOrgSearch);

        const queryUrl = `${this._orgHomePageUrl}_search?queryText=${searchText}&type=ms.vss-orgsearch.wiki-search-provider`;
        const queryUrlWithTrackingData = getUrlWithTrackingData(queryUrl, {
            source: TelemetryConstants.MicropediaSearchSource
        });

        redirectToUrl(queryUrlWithTrackingData);
    }

    @autobind
    private _navigateToWikiHome(): void {
        this._telemetryWriter.publish(TelemetryConstants.NavigateToOrgHome);

        redirectToUrl(getWikiPageViewUrl({}, StateMergeOptions.routeValues));
    }

    @autobind
    private _onPageChange(pagePath: string): void {
        const currentAction: string = this.props.sharedStoresHub.state.urlState.action;
        this._telemetryWriter.publish(TelemetryConstants.MicropediaPageChange, { sourceView: currentAction });

        if (WikiActionIds.History === this.props.sharedStoresHub.state.urlState.action) {
            // Navigation via updateUrl is not working for history page.
            redirectToUrl(getWikiPageViewUrl({ pagePath }), true, ContributionKeys.ImmersiveWikiHub);
            return;
        }

        const tentativeAction = () => this.props.sharedActionCreator.updateUrl({
            ...getDefaultUrlParameters(),
            action: WikiActionIds.View,
            pagePath,
        });

        if (!this.props.sharedActionCreator.checkChangesToLose(tentativeAction)) {
            tentativeAction();
        }
    }

    @autobind
    private _onSearch(value: string): void {
        if (this._orgHomePageUrl) {
            this._navigateToSearchPage(this._orgHomePageUrl, value);
            return;
        }

        this._orgHomeUrlPromise.then(() => {
            if (this._orgHomePageUrl) {
                this._navigateToSearchPage(this._orgHomePageUrl, value);
            }
        });
    }
}
