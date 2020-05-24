import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import { MessageBarType, MessageBar } from "OfficeFabric/MessageBar";
import { PrimaryButton } from "OfficeFabric/Button";

import { Component, Props, State } from "VSS/Flux/Component";

import { Filter } from "VSSUI/Utilities/Filter";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { AddUpstreamPanel } from "Package/Scripts/Components/Settings/AddUpstreamPanel";
import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { IUpstreamSettingsRowData, UpstreamSettingsList } from "Package/Scripts/Components/Settings/UpstreamSettingsList";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/UpstreamSettingsPane";

import { SettingsPivotKeys } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface IUpstreamSettingsPaneProps extends Props {
    /**
     * The description for the pivot
     */
    description: string;

    /**
     * The filter associated with the pivot's filter bar
     */
    filter: Filter;

    /**
     * There are no upstream sources
     */
    hasNoUpstreamSources: boolean;

    /**
     * No upstream sources after filtering
     */
    hasNoFilterResults: boolean;

    /**
     * List of upstream sources to display to the user, may include unsaved changes
     */
    upstreamSourceRows: IUpstreamSettingsRowData[];

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * Protocols to filter on
     */
    protocolFilterValues: IPackageProtocol[];

    /**
     * Error message to display on upstream source name field in the AddUpstreamPanel
     */
    upstreamSourceNameInvalidMessage?: string;

    /**
     * Error message to display on upstream source location field in the AddUpstreamPanel
     */
    upstreamSourceLocationInvalidMessage?: string;

    /**
     * True to display the AddUpstreamPanel
     */
    displayAddUpstreamPanel: boolean;

    /**
     * List of feeds in the account
     */
    availableFeeds: () => Feed[];

    /**
     * Currently selected feed
     */
    currentFeed: Feed;

    /**
     * List of active upstream sources for the selected feed
     */
    activeUpstreamSources: UpstreamSource[];

    /**
     * Internal upstream feature availability
     */
    internalUpstreamSettings: IInternalUpstreamSettingsState;

    /**
     * Tracks if views are getting saved to server
     */
    isSavingChanges: boolean;

    /**
     * While saving, captures errors if they occur to show in UI
     */
    error: Error;

    /**
     * Feature flag for custom upstream sources
     */
    isCustomPublicUpstreamsFeatureEnabled: boolean;

    /**
     * Maximum number of upstream sources
     */
    upstreamSourceLimit: number;

}

export class UpstreamSettingsPane extends Component<IUpstreamSettingsPaneProps, State> {
    public render(): JSX.Element {
        return (
            <div className="upstream-settings-pane">
                {this._getUpstreamLimitReachedMessage()}
                {this._getUpstreamListOrMessage()}
                {this.props.displayAddUpstreamPanel ? (
                    <AddUpstreamPanel
                        upstreamSourceNameInvalidMessage={this.props.upstreamSourceNameInvalidMessage}
                        upstreamSourceLocationInvalidMessage={this.props.upstreamSourceLocationInvalidMessage}
                        currentFeed={this.props.currentFeed}
                        availableFeedsForUpstreams={this.props
                            .availableFeeds()
                            .filter((feed: Feed) => feed.id !== this.props.currentFeed.id)}
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                        activeUpstreamSources={this.props.activeUpstreamSources}
                        isSavingChanges={this.props.isSavingChanges}
                        error={this.props.error}
                        isCustomPublicUpstreamsFeatureEnabled={this.props.isCustomPublicUpstreamsFeatureEnabled}
                    />
                ) : null}
            </div>
        );
    }

    private _getUpstreamLimitReachedMessage(): JSX.Element {
        let mapCount:{ [key: string] : number } = {};
        const limit:number = this.props.upstreamSourceLimit;

        this.props.activeUpstreamSources.forEach((src) => {
            let p = src.protocol.toLowerCase();
            mapCount[p] = (mapCount[p] | 0) + 1;
        });

        let protocolList:string[] = [];
        for(var protocol in mapCount){
            if(mapCount[protocol] >= limit) { 
                protocolList.push(protocol);
            }
        }

        if (protocolList.length > 0) {
            return <MessageBar
                messageBarType={MessageBarType.warning}
                actions={<div />} /* Workaround for office fabric bug */
                isMultiline={true}
            > 
                {
                    protocolList.map((protocol, index) => {
                        return <div key={protocol + "-source-limit-reached"}>{Utils_String.format(PackageResources.UpstreamSourcesLimitReached, protocol)}</div>
                    })
                } 
            </MessageBar>

        }
        return null;
    }
    /**
     * Returns the upstream list component, or a message if there are no upstream sources
     */
    private _getUpstreamListOrMessage(): JSX.Element {
        if (this.props.hasNoUpstreamSources) {
            return (
                <NoResultsPane
                    header={PackageResources.UpstreamSettings_NoUpstreamSources}
                    subheader={this.props.description}
                    iconClass={"bowtie-cloud-fill"}
                >
                    {this.props.isUserAdmin ? (
                        <PrimaryButton
                            className="add-upstreamsource-button"
                            iconProps={{ iconName: "Add" }}
                            ariaLabel={PackageResources.UpstreamSettings_AddUpstreamSourceButton_Label}
                            onClick={() => {
                                FeedSettingsActionCreator.openAddUpstreamPanelRequested.invoke({});
                            }}
                        >
                            {PackageResources.UpstreamSettings_AddUpstreamSourceButton_Label}
                        </PrimaryButton>
                    ) : (
                        <div />
                    )}
                </NoResultsPane>
            );
        }

        if (this.props.hasNoFilterResults) {
            return (
                <NoResultsPane
                    header={PackageResources.UpstreamSettings_NoUpstreamSourcesMatch}
                    iconClass={"bowtie-search"}
                />
            );
        }

        return (
            <UpstreamSettingsList
                upstreamSourceRows={this.props.upstreamSourceRows}
                isUserAdmin={this.props.isUserAdmin}
                isSavingChanges={this.props.isSavingChanges}
            />
        );
    }

    protected getPivotKey(): string {
        return SettingsPivotKeys.upstreams;
    }
}
