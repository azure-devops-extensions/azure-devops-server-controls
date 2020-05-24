import * as React from "react";

import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { findIndex } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IMultiCommandPackageDetails, IPackagePromotedPayload } from "Package/Scripts/Common/ActionPayloads";
import { InfoCallout } from "Package/Scripts/Components/InfoCallout";
import { IPackageVersionsMap, MultiCommandPanel } from "Package/Scripts/Components/MultiCommandPanel";
import { IHelperResult, MultiPromoteHelper } from "Package/Scripts/Helpers/MultiPromoteHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import * as PackageResources from "Feed/Common/Resources";
import { IMultiCommandDropdownVersions } from "Package/Scripts/Types/IMultiCommandDropdownVersions";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/MultiPromotePanel";

export interface IMultiPromotePanelProps extends Props {
    feed: Feed;
    isOpen: boolean;
    selectedPackages: Package[];
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    views: FeedView[];
    mruViewId?: string;
    multiCommandDropdownVersions: IMultiCommandDropdownVersions;
}

export interface IMultiPromotePanelState extends State {
    selectedPackageVersionsMap: IPromotePackageVersionsMap[];
    selectedView: FeedView;
    viewOptions: IDropdownOption[];
    isSaving: boolean;
}

export interface IPromotePackageVersionsMap extends IPackageVersionsMap {
    selectedVersionViews: FeedView[];
    versionAlreadyPromoted: boolean;
}

export class MultiPromotePanel extends Component<IMultiPromotePanelProps, IMultiPromotePanelState> {
    private _cachedPackagesSelected: boolean;
    private _versionsPromotedToViewMap: { [viewId: string]: string[] };

    constructor(props: IMultiPromotePanelProps) {
        super(props);
        const initializeResult: IHelperResult = MultiPromoteHelper.initialize(props);
        this._versionsPromotedToViewMap = initializeResult.versionsPromotedToViewMap;
        this._cachedPackagesSelected = initializeResult.cachedPackagesSelected;
        this.state = initializeResult.newState;
    }

    public componentWillReceiveProps(nextProps: IMultiPromotePanelProps): void {
        if (
            (!this.props.multiCommandDropdownVersions && nextProps.multiCommandDropdownVersions) ||
            (this.props.multiCommandDropdownVersions &&
                nextProps.multiCommandDropdownVersions &&
                nextProps.multiCommandDropdownVersions.packageId !== this.props.multiCommandDropdownVersions.packageId)
        ) {
            const newPackageVersionsMap = this.state.selectedPackageVersionsMap;
            const fetchedPackageIndex = findIndex(
                newPackageVersionsMap,
                (item: IPackageVersionsMap) =>
                    item.packageSummary.id === nextProps.multiCommandDropdownVersions.packageId
            );
            if (fetchedPackageIndex !== -1) {
                newPackageVersionsMap[fetchedPackageIndex].packageSummary.versions =
                    nextProps.multiCommandDropdownVersions.versions;
                newPackageVersionsMap[fetchedPackageIndex].allVersionsFetched = true;
            }

            this.setState({
                selectedPackageVersionsMap: newPackageVersionsMap
            });
        }
    }

    public render(): JSX.Element {
        return (
            <MultiCommandPanel
                additionalPanelContent={
                    this.state.selectedPackageVersionsMap.length > 0 ? this._getViewsDropdown() : null
                }
                className={"multi-promote-panel"}
                detailsListItems={this.state.selectedPackageVersionsMap}
                isOpen={this.props.isOpen}
                onPanelClosedCallback={() => this._closePanel()}
                onPanelSavedCallback={(items: IMultiCommandPackageDetails[]) => this._onSavePackages(items)}
                saveButtonText={PackageResources.PromotePackage_PromoteButton}
                saveButtonDisabled={
                    this.state.selectedView && this.state.selectedPackageVersionsMap.length > 0 ? false : true
                }
                headerText={
                    this.state.selectedPackageVersionsMap.length === 1
                        ? PackageResources.PackageOperationsMenu_ReleasePackageDialogTitle
                        : Utils_String.format(
                              PackageResources.MultiPromote_TitleText,
                              this.state.selectedPackageVersionsMap.length
                          )
                }
                messageBarMessage={this._getMessageBarMessage()}
                panelInstructionsParagraph={PackageResources.MultiPromotePanel_Instructions}
                tooManyPackagesToDisplayMessage={
                    PackageResources.MultiPromotePanel_Instructions_TooManyPackagesToDisplay
                }
                protocolMap={this.props.protocolMap}
                selectedPackages={this.props.selectedPackages}
                onVersionChangedCallback={option => this._onVersionChanged(option)}
                useLatestTag={this.props.feed.view ? false : true}
                getInfoBubble={(item: IPromotePackageVersionsMap) => this._getInfoBubble(item)}
                hideDeletedVersions={true}
                isSaving={this.state.isSaving}
            />
        );
    }

    private _getMessageBarMessage(): string {
        let message = null;
        if (this._cachedPackagesSelected) {
            message = PackageResources.MultiPromotePanel_CantPromoteCachedPackages;
        } else if (!this.state.selectedView) {
            message = PackageResources.MultiPromotePanel_AllPackagesInAllViews;
        }

        return message;
    }

    private _getViewsDropdown(): JSX.Element {
        return (
            <div className="views-dropdown-container">
                <Dropdown
                    disabled={(this.state.viewOptions.length > 0 ? false : true) || this.state.isSaving}
                    className={"views-dropdown"}
                    label={PackageResources.MultiPromote_DropdownTitle}
                    options={this.state.viewOptions}
                    onChanged={option => this._onFeedViewChanged(option)}
                    selectedKey={this.state.selectedView ? this.state.selectedView.id : null}
                />
            </div>
        );
    }

    private _getInfoBubble(item: IPromotePackageVersionsMap): JSX.Element {
        return item.versionAlreadyPromoted ? (
            <InfoCallout
                className="version-info"
                buttonAriaLabel={PackageResources.AriaLabel_MultiPromotePanel_MoreInfoButton}
                calloutAriaLabel={PackageResources.AriaLabel_MultiPromotePanel_MoreInfoCallout}
                calloutMessage={
                    this.state.selectedView
                        ? Utils_String.format(
                              PackageResources.MultiPromote_InfoCalloutText_AlreadyPromoted,
                              item.packageSummary.name,
                              this.props.feed.name,
                              this.state.selectedView.name
                          )
                        : Utils_String.format(
                              PackageResources.MultiPromote_InfoCalloutText_AlreadyPromoted_AllPackages,
                              item.packageSummary.name
                          )
                }
                calloutWidth={240}
            />
        ) : null;
    }

    private _closePanel(): void {
        Actions.MultiPromotePanelClosed.invoke({});
    }

    private _onVersionChanged(option: IDropdownOption): void {
        const versionChangedResult = MultiPromoteHelper.onVersionChanged(
            option,
            this._versionsPromotedToViewMap,
            this.state,
            this.props
        );
        this.setState(versionChangedResult.newState);
        this._versionsPromotedToViewMap = versionChangedResult.versionsPromotedToViewMap;
    }

    private _onSavePackages(items: IMultiCommandPackageDetails[]): void {
        this.setState({ isSaving: true });
        Actions.MultiplePackagesPromoted.invoke({
            promotedView: this.state.selectedView,
            minimalPackageDetails: items
        } as IPackagePromotedPayload);
    }

    private _onFeedViewChanged(option: IDropdownOption): void {
        const newView = {
            id: option.key,
            name: option.text.split("@")[1],
            _links: null,
            url: null,
            type: null
        } as FeedView;

        const newMap: IPromotePackageVersionsMap[] = MultiPromoteHelper.updateVersionAlreadyPromoted(
            this.state.selectedPackageVersionsMap,
            newView
        );

        this.setState({
            selectedView: newView,
            selectedPackageVersionsMap: newMap
        });
    }
}
