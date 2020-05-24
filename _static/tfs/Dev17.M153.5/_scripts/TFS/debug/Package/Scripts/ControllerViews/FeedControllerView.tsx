import * as React from "react";

import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";
import { Link } from "OfficeFabric/Link";
import { MessageBar } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";

import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import { Component, Props } from "VSS/Flux/Component";
import * as Locations from "VSS/Locations";
import * as Utils_String from "VSS/Utils/String";

import { Hub } from "VSSUI/Components/Hub/Hub";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

import * as Actions from "Package/Scripts/Actions/Actions";
import { FeedActionCreator } from "Package/Scripts/Actions/FeedActionCreator";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { OpenConnectToFeedDialog } from "Package/Scripts/Components/ConnectToFeedButton";
import { CreateBadgePanel } from "Package/Scripts/Components/CreateBadgePanel";
import { EmptyFeedPanel } from "Package/Scripts/Components/EmptyFeedPanel";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { MultiPromotePanel } from "Package/Scripts/Components/MultiPromotePanel";
import { PackageFilterBar } from "Package/Scripts/Components/PackageFilterBar";
import { IPackageGridProps, PackageGrid } from "Package/Scripts/Components/PackageGrid";
import { WelcomePanel } from "Package/Scripts/Components/WelcomePanel";
import * as CommandGetters from "Package/Scripts/Helpers/CommandGetters";
import { FeedPickerHelper } from "Package/Scripts/Helpers/FeedPickerHelper";
import { PackageFilterBarHelper } from "Package/Scripts/Helpers/PackageFilterBarHelper";
import { PackageGridMessages } from "Package/Scripts/Helpers/PackageGridMessages";
import { hasAccessToBaseFeed } from "Package/Scripts/Helpers/PermissionHelper";
import * as PivotGetters from "Package/Scripts/Helpers/PivotBarActionGetter";
import { FeedState, FeedStore } from "Package/Scripts/Stores/FeedStore";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { FeedMessage } from "Package/Scripts/Types/WebPage.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/ControllerViews/FeedControllerView";

import { HubViewDefaultPivots } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { MessageState } from "Feed/Common/Types/IFeedMessage";

export interface IFeedControllerViewProps extends Props {
    store: FeedStore;
}

export interface IBannerMessage {
    messageBarType: MessageBarType;
    message: string;
    bannerLocalStorageStatus: string;
}

export class FeedControllerView extends Component<IFeedControllerViewProps, FeedState> {
    constructor(props: IFeedControllerViewProps) {
        super(props);
        this.actionCreator = new FeedActionCreator(this.getStore());
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.actionCreator.initializeListeners();
        // invoke setfeedmessage action
        this.actionCreator.updateFeedMessage.invoke({});
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.actionCreator.detachListeners();
    }

    public render(): JSX.Element {
        this.state = this.getState();
        const feedMessage: FeedMessage = this.state.selectedFeedMessage;
        return (
            <div className="feed-controller-view">
                {this.state.displayWelcomeMessage ? (
                    <WelcomePanel />
                ) : (
                    <div className="feed-content">
                        {
                            <Hub
                                className="feed-pivot-bar"
                                hubViewState={this.state.hubState}
                                commands={this._getMainCommands()}
                                hideFullScreenToggle={true}
                                viewActions={this._getMainViewActions()}
                                onRenderFilterBar={(): JSX.Element => {
                                    return (
                                        this.getGridMessage() !== MessageState.EmptyFeed && (
                                            <PackageFilterBar
                                                selectedFeed={this.state.selectedFeed}
                                                feedViews={this.state.feedViews}
                                                hubState={this.state.hubState}
                                            />
                                        )
                                    );
                                }}
                            >
                                <HubHeader
                                    headerItemPicker={FeedPickerHelper.getFeedPicker(
                                        this.state.feeds,
                                        this.state.selectedFeed
                                    )}
                                    hubBreadcrumbAriaLabel={PackageResources.FeedPicker_AriaLabel}
                                />
                                <PivotBarItem
                                    className="detailsListPadding absolute-fill"
                                    itemKey={HubViewDefaultPivots.feed}
                                    name="" // Note: This is the only pivot and it is not shown so leaving blank
                                    commands={this._getPackagesPivotCommands()}
                                >
                                    {/* banner for Selected Feeds */
                                    feedMessage && (
                                        <MessageBar
                                            messageBarType={MessageBarType.info}
                                            onDismiss={() => this.actionCreator.dismissfeedMessageBar.invoke({})}
                                            actions={<div />} /* Workaround for office fabric bug */
                                            isMultiline={false}
                                        >
                                            <span>{feedMessage.message}</span>
                                            {feedMessage.linkUrl && (
                                                <Link href={feedMessage.linkUrl}>{feedMessage.linkText}</Link>
                                            )}
                                        </MessageBar>
                                    )}
                                    <LoadingContainer isLoading={this.state.packagesLoading}>
                                        {this.getGridMessage() === MessageState.EmptyFeed ? (
                                            <EmptyFeedPanel
                                                feed={this.state.selectedFeed}
                                                feedViews={this.state.feedViews}
                                                protocolMap={this.state.protocolMap}
                                            />
                                        ) : (
                                            <div
                                                className="package-list"
                                                aria-label={PackageResources.AriaLabel_PackageList}
                                            >
                                                <PackageGrid {...this.feedStateToPackageGridProps()} />
                                            </div>
                                        )}
                                    </LoadingContainer>
                                </PivotBarItem>
                            </Hub>
                        }
                        {this.state.selectedPackages &&
                            this.state.selectedPackages.length > 0 &&
                            this.state.isMultiPromotePanelOpen && (
                                <MultiPromotePanel
                                    isOpen={this.state.isMultiPromotePanelOpen}
                                    selectedPackages={this.state.selectedPackages}
                                    views={this.state.feedViews}
                                    feed={this.state.selectedFeed}
                                    protocolMap={this.state.protocolMap}
                                    mruViewId={this.state.mruViewId}
                                    multiCommandDropdownVersions={this.state.multiCommandDropdownVersions}
                                />
                            )}
                        {this.state.showCreateBadgePanel && (
                            <CreateBadgePanel
                                feed={this.state.selectedFeed}
                                views={this.state.feedViews}
                                selectedPackage={this.state.selectedPackages[0]}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }

    private feedStateToPackageGridProps(): IPackageGridProps {
        const packageGridProps: IPackageGridProps = {
            feed: this.state.selectedFeed,
            packages: this.state.packages,
            requestedPackageCount: this.state.requestedPackageCount,
            nextPageLoading: this.state.nextPageLoading,
            pageSize: this.state.pageSize,
            filterLoading: this.state.packagesLoading,
            protocolMap: this.state.protocolMap,
            upstreamSourceEnabled: this.state.selectedFeed != null && this.state.selectedFeed.upstreamEnabled,
            messageState: this.getGridMessage(),
            isMultiPromotePanelOpen: this.state.isMultiPromotePanelOpen,
            feedViews: this.state.feedViews,
            selectedPackages: this.state.selectedPackages,
            metricsEnabled: this.state.metricsEnabled,
            metricsMap: this.state.metricsMap
        };
        return packageGridProps;
    }

    private getGridMessage(): MessageState {
        const filterText = PackageFilterBarHelper.getKeywordFilterTextFromFilter(this.state.hubState.filter);
        return PackageGridMessages.getMessageForFeed(this.state.selectedFeed, this.state.packages, filterText);
    }

    private _connectToFeed(): void {
        OpenConnectToFeedDialog(this.state.selectedFeed, this.state.feedViews, this.state.protocolMap, HubAction.Feed);
    }

    private _getPackagesPivotCommands(): IPivotBarAction[] {
        let commands: IPackageCommand[] = [];
        const packageCommandsGetter: CommandGetters.PackageCommandsGetter = new CommandGetters.PackageCommandsGetter();
        const pivotActionsGetter: PivotGetters.PivotBarActionsGetter = new PivotGetters.PivotBarActionsGetter();

        if (!this.state.selectedPackages || this.state.selectedPackages.length === 0) {
            return [];
        }

        if (this.state.selectedPackages.length === 1) {
            const packageO: Package = this.state.selectedPackages[0];
            commands = packageCommandsGetter.getSingleSelectionItems(
                this.state.selectedFeed,
                this.state.protocolMap[packageO.protocolType],
                packageO,
                packageO.versions[0] as PackageVersion,
                true
            );
        } else {
            commands = packageCommandsGetter.getMultipleSelectionItems(
                this.state.selectedFeed,
                this.state.protocolMap,
                this.state.selectedPackages
            );
        }

        return pivotActionsGetter.GetPivotBarActions(commands);
    }

    private _getMainViewActions(): IPivotBarAction[] {
        const settingsAction: IPivotBarAction = {
            key: "settings",
            important: true,
            iconProps: {
                iconType: VssIconType.fabric,
                iconName: "Settings"
            } as IVssIconProps,
            title: PackageResources.Feed_Settings_ButtonTitle,
            ariaLabel: PackageResources.Feed_Settings_ButtonTitle
        };

        if (this.state.userCanAdministerFeeds === true) {
            const brandingName = Utils_String.format(
                PackageResources.Feed_Settings_Extension_ButtonTitle,
                PackageResources.AzureArtifacts
            );
            settingsAction.children = [
                {
                    key: "feedsettings",
                    name: PackageResources.Feed_Settings_Feed_ButtonTitle,
                    ariaLabel: PackageResources.Feed_Settings_Feed_ButtonTitle,
                    onClick: this.navigateToSettings
                },
                {
                    key: "globalsettings",
                    name: brandingName,
                    ariaLabel: brandingName,
                    onClick: this.openGlobalSettingsDialog
                }
            ];
        } else {
            settingsAction.onClick = this.navigateToSettings;
        }

        return [settingsAction];
    }

    private _getMainCommands(): IPivotBarAction[] {
        const commands: IPivotBarAction[] = [];

        if (this.state.userCanCreateFeed === true) {
            const createNewFeedCommand: IPivotBarAction = {
                key: "createnewfeed",
                important: true,
                name: PackageResources.NewFeedCommand,
                onClick: this.navigateToCreateFeed,
                iconProps: {
                    iconType: VssIconType.bowtie,
                    iconName: "bowtie-icon bowtie-math-plus-light"
                }
            };
            commands.push(createNewFeedCommand);
        }

        const connectToFeedCommand: IPivotBarAction = {
            key: "connect",
            name: PackageResources.ConnectToFeedButtonText,
            important: true,
            iconProps: {
                iconName: "bowtie-icon bowtie-plug-outline connect-to-feed-button-icon",
                iconType: VssIconType.bowtie
            },
            onClick: this._connectToFeed.bind(this)
        };
        commands.push(connectToFeedCommand);

        if (hasAccessToBaseFeed(this.state.selectedFeed)) {
            const recycleBinAction: IPivotBarAction = {
                key: "recycleBin",
                name: PackageResources.RecycleBinButtonText,
                important: true,
                iconProps: {
                    iconType: VssIconType.bowtie,
                    iconName: "bowtie-recycle-bin"
                } as IVssIconProps,
                onClick: () => RecycleBinActions.RecycleBinClicked.invoke({})
            } as IPivotBarAction;
            commands.push(recycleBinAction);
        }

        return commands;
    }

    private navigateToCreateFeed(): void {
        Actions.CreateFeedNavigateClicked.invoke({});
    }

    @autobind
    private navigateToSettings(): void {
        SettingsActions.FeedSettingsNavigateClicked.invoke({});
    }

    @autobind
    private openGlobalSettingsDialog(): void {
        this.actionCreator.showPackageManagementSettingDialog.invoke(null);
    }

    private _getUserHubUrl(): string {
        const isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
        const userHubUrl = Locations.urlHelper.getMvcUrl({
            level: NavigationContextLevels.Collection,
            area: "admin",
            controller: isHosted ? "users" : "userHub"
        });
        return userHubUrl;
    }

    public getStore(): FeedStore {
        return this.props.store;
    }

    public getState(): FeedState {
        return this.getStore().getFeedState();
    }

    private actionCreator: FeedActionCreator;
}
