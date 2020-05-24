import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import {
    AddCollectionInternalSourcePanelSection
} from "Package/Scripts/Components/Settings/AddCollectionInternalSourcePanelSection";
import {
    AddOrganizationInternalSourcePanelSection
} from "Package/Scripts/Components/Settings/AddOrganizationInternalSourcePanelSection";
import { AddPublicSourcePanelSection } from "Package/Scripts/Components/Settings/AddPublicSourcePanelSection";
import { AddUpstreamPanelStage } from "Package/Scripts/Components/Settings/CommonTypes";
import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { UpstreamTypeSelectionPanelSection } from "Package/Scripts/Components/Settings/UpstreamTypeSelectionPanelSection";
import { filterDefaultUpstreamSources } from "Package/Scripts/Helpers/UpstreamHelper";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { ExtendedUpstreamSource, Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { UpstreamSource, UpstreamSourceType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

import * as PackageResources from "Feed/Common/Resources";

export interface IAddUpstreamPanelProps extends Props {
    /**
     * Error message to display on upstream source name field
     */
    upstreamSourceNameInvalidMessage?: string;

    /**
     * Error message to display on upstream source location field
     */
    upstreamSourceLocationInvalidMessage?: string;

    /**
     * List of available feeds for upstreams in the collection
     */
    availableFeedsForUpstreams: Feed[];

    /**
     * Currently selected feed for which upstreams are being configured
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
}

export interface IAddUpstreamPanelState extends State {
    selectedUpstreamSources: ExtendedUpstreamSource[];
    stage: AddUpstreamPanelStage;
}

/**
 * Panel that allows the user to specify an upstream source for addition to the feed
 */
export class AddUpstreamPanel extends Component<IAddUpstreamPanelProps, IAddUpstreamPanelState> {
    constructor(props: IAddUpstreamPanelProps) {
        super();
        const stage = this._getDisplayOnlyPublicUpstream(props)
            ? AddUpstreamPanelStage.PublicUpstream
            : AddUpstreamPanelStage.Initial;

        this.state = {
            upstreamName: Utils_String.empty,
            selectedUpstreamSources: null,
            stage,
            locatorCalloutVisible: false,
            selectedAccount: null,
            selectedFeedId: null,
            selectedViewId: null
        };
    }

    public render(): JSX.Element {
        return (
            <Panel
                isOpen={true}
                onDismiss={this._onDismiss}
                type={PanelType.medium}
                isFooterAtBottom={true}
                onRenderFooterContent={this._onRenderFooterContent}
                headerText={PackageResources.AddUpstreamPanel_Header}
                closeButtonAriaLabel={PackageResources.AriaLabel_ClosePanel}
                hasCloseButton={this.props.isSavingChanges === false}
            >
                {this.props.error != null && (
                    <MessageBar messageBarType={MessageBarType.error}>{this.props.error.message}</MessageBar>
                )}
                {// The selected subcontrol manually sets focus to itself in its ComponentDidMount,
                // since Panel.focusTrapZoneProps.firstFocusableSelector code is not rexecuted when
                // this._stageHandler updates the subcomponent to render.
                this._getControlsAccordingToStage()}
                {this.props.isSavingChanges && (
                    <Overlay className="feed-overlay">
                        <div className="content">
                            <Spinner
                                size={SpinnerSize.small}
                                label={PackageResources.FeedSettings_Overlay_SavingChanges}
                            />
                        </div>
                    </Overlay>
                )}
            </Panel>
        );
    }

    @autobind
    private _getControlsAccordingToStage(): JSX.Element {
        if (this._getDisplayOnlyPublicUpstream(this.props)) {
            return this._getAddPublicSourcePanelSection();
        }

        switch (this.state.stage) {
            default:
            case AddUpstreamPanelStage.Initial: {
                const availablePublicUpstreamSources = this._getAvailablePublicUpstreamSources();
                return (
                    <UpstreamTypeSelectionPanelSection
                        hasAvailablePublicUpstreamSources={
                            availablePublicUpstreamSources != null && availablePublicUpstreamSources.length > 0
                        }
                        onStageChangedHandler={this._stageHandler}
                        hasAvailableFeeds={
                            this.props.availableFeedsForUpstreams && this.props.availableFeedsForUpstreams.length > 0
                        }
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                    />
                );
            }
            case AddUpstreamPanelStage.PublicUpstream: {
                return this._getAddPublicSourcePanelSection();
            }
            case AddUpstreamPanelStage.OrganizationUpstream: {
                return (
                    <AddOrganizationInternalSourcePanelSection
                        selectedUpstreamSourcesHandler={this._selectedUpstreamSourcesHandler}
                        upstreamSourceNameInvalidMessage={this.props.upstreamSourceNameInvalidMessage}
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                    />
                );
            }
            case AddUpstreamPanelStage.FinalStageUpstream: {
                const internalUpstreamSources = this.props.activeUpstreamSources.filter(
                    (source: UpstreamSource) => source.upstreamSourceType === UpstreamSourceType.Internal
                );
                return (
                    <AddCollectionInternalSourcePanelSection
                        availableFeedsForUpstreams={this.props.availableFeedsForUpstreams}
                        selectedUpstreamSourcesHandler={this._selectedUpstreamSourcesHandler}
                        currentInternalUpstreamSources={internalUpstreamSources}
                        upstreamSourceNameInvalidMessage={this.props.upstreamSourceNameInvalidMessage}
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                    />
                );
            }
        }
    }

    private _getAddPublicSourcePanelSection(): JSX.Element {
        const availablePublicUpstreamSources = this._getAvailablePublicUpstreamSources();
        return (
            <AddPublicSourcePanelSection
                availablePublicUpstreamSources={availablePublicUpstreamSources}
                selectedUpstreamSourcesHandler={this._selectedUpstreamSourcesHandler}
                upstreamSourceNameInvalidMessage={this.props.upstreamSourceNameInvalidMessage}
                upstreamSourceLocationInvalidMessage={this.props.upstreamSourceLocationInvalidMessage}
                isCustomPublicUpstreamsFeatureEnabled={this.props.isCustomPublicUpstreamsFeatureEnabled}
            />
        );
    }

    @autobind
    private _stageHandler(stage: AddUpstreamPanelStage): void {
        this.setState({ stage });
    }

    @autobind
    private _selectedUpstreamSourcesHandler(upstreamSources: ExtendedUpstreamSource[]): void {
        this.setState({ selectedUpstreamSources: upstreamSources });
    }

    @autobind
    private _onDismiss(): void {
        FeedSettingsActionCreator.closeAddUpstreamPanelRequested.invoke({});
    }

    @autobind
    private _onSave() {
        const upstreamSources: ExtendedUpstreamSource[] = [];

        for (const upstreamSource of this.state.selectedUpstreamSources) {
            upstreamSources.push({
                id: upstreamSource.id,
                name: upstreamSource.name,
                location: upstreamSource.location,
                protocol: upstreamSource.protocol,
                upstreamSourceType: upstreamSource.upstreamSourceType,
                deletedDate: null,
                internalUpstreamCollectionId: upstreamSource.internalUpstreamCollectionId,
                internalUpstreamFeedId: upstreamSource.internalUpstreamFeedId,
                internalUpstreamViewId: upstreamSource.internalUpstreamViewId,
                isCustom: upstreamSource.isCustom
            } as ExtendedUpstreamSource);
        }

        FeedSettingsActionCreator.addUpstreamSources.invoke(upstreamSources);
    }

    @autobind
    private _onRenderFooterContent(): JSX.Element {
        return (
            <div className="add-upstream-panel-footer">
                <div>
                    <PrimaryButton
                        onClick={this._onSave}
                        disabled={this._shouldDisableOkFooterButton()}
                        className="add-upstream-panel-ok-button"
                    >
                        {PackageResources.AddUpstreamPanel_Save}
                    </PrimaryButton>
                    <DefaultButton onClick={this._onDismiss} disabled={this.props.isSavingChanges === true}>
                        {PackageResources.AddUpstreamPanel_Cancel}
                    </DefaultButton>
                </div>
            </div>
        );
    }

    private _shouldDisableOkFooterButton(): boolean {
        const hasInvalidMessage =
            (this.props.upstreamSourceNameInvalidMessage && this.props.upstreamSourceNameInvalidMessage !== null) ||
            (this.props.upstreamSourceLocationInvalidMessage &&
                this.props.upstreamSourceLocationInvalidMessage !== null);
        const thereAreNoSelectedUpstreamSources =
            this.state.selectedUpstreamSources == null || this.state.selectedUpstreamSources.length === 0;
        const noProtocolSelected =
            thereAreNoSelectedUpstreamSources || this.state.selectedUpstreamSources[0].protocol == null;
        const noLocationEntered =
            thereAreNoSelectedUpstreamSources ||
            (this.state.stage === AddUpstreamPanelStage.PublicUpstream &&
                (this.state.selectedUpstreamSources[0].location == null ||
                    this.state.selectedUpstreamSources[0].location === ""));
        const noNameEntered =
            thereAreNoSelectedUpstreamSources ||
            this.state.selectedUpstreamSources[0].name == null ||
            this.state.selectedUpstreamSources[0].name === "";
        const upstreamSourceNotComplete = noProtocolSelected || noLocationEntered || noNameEntered;
        const onInitialStage = this.state.stage === AddUpstreamPanelStage.Initial;

        return hasInvalidMessage || upstreamSourceNotComplete || this.props.isSavingChanges || onInitialStage;
    }

    private _getAvailablePublicUpstreamSources(): ExtendedUpstreamSource[] {
        const availablePublicUpstreamSources = filterDefaultUpstreamSources(this.props.currentFeed, null);

        const upstreamSourcesToRemoveMap: IDictionaryStringTo<string> = {};
        for (const upstreamSource of this.props.activeUpstreamSources) {
            upstreamSourcesToRemoveMap[upstreamSource.location] = upstreamSource.location;
        }

        const upstreamSources: ExtendedUpstreamSource[] = [];

        // remove existing upstream sources
        for (const upstreamSource of availablePublicUpstreamSources) {
            if (upstreamSourcesToRemoveMap[upstreamSource.location] == null) {
                upstreamSources.push(upstreamSource);
            }
        }

        // add Custom option
        if (this.props.isCustomPublicUpstreamsFeatureEnabled) {
            upstreamSources.push({
                deletedDate: null,
                id: null,
                internalUpstreamCollectionId: null,
                internalUpstreamFeedId: null,
                internalUpstreamViewId: null,
                location: null,
                name: PackageResources.AddUpstreamPanel_Custom,
                protocol: NpmKey, // npm option is the only one currently available
                upstreamSourceType: UpstreamSourceType.Public,
                isCustom: true
            } as ExtendedUpstreamSource);
        }

        // add new upstream sources
        return upstreamSources;
    }

    private _getDisplayOnlyPublicUpstream(props: IAddUpstreamPanelProps) {
        return (
            props.internalUpstreamSettings.isV2Feed === false ||
            (props.internalUpstreamSettings.collectionUpstreamsEnabled === false &&
                props.internalUpstreamSettings.organizationUpstreamsEnabled === false)
        );
    }
}
