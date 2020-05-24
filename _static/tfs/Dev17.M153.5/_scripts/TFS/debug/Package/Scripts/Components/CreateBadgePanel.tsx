import * as React from "react";

import { Dropdown, DropdownMenuItemType, IDropdownOption } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import * as UrlHelper from "Package/Scripts/Helpers/UrlHelper";
import { CopyableTextField, ICopyableTextFieldTelemetry } from "Package/Scripts/Protocols/Components/CopyableTextField";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/CreateBadgePanel";

import { CiConstants } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface ICreateBadgePanelProps extends Props {
    /**
     * the currently selected feed
     */
    feed: Feed;

    /**
     * the views available on the feed
     */
    views?: FeedView[];

    /**
     * the currently selected package
     */
    selectedPackage: Package;
}

export interface ICreateBadgePanelState extends State {
    /**
     * true if the badge URI is being loaded
     */
    loadingUri: boolean;

    /**
     * the uri of the badge
     */
    badgeUri: string;

    /**
     * true if there was an error loading the preview
     * (probably because package isn't in the selected view, or only pre-release versions are in the feed)
     */
    previewError: boolean;

    /**
     * message to show if there was an error loading the preview
     */
    warningMessage: string;

    /**
     * the view that is selected
     */
    selectedViewId: string;
    selectedViewName: string;
}

export class CreateBadgePanel extends Component<ICreateBadgePanelProps, ICreateBadgePanelState> {
    private static readonly noViewKey = "_noView";
    private static readonly dividerKey = "_divider";

    private _feedsDataService: FeedsDataService;

    constructor(props: ICreateBadgePanelProps) {
        super();

        this._feedsDataService = Service.getLocalService(FeedsDataService);

        this.state = {
            loadingUri: true,
            badgeUri: null,
            previewError: false,
            warningMessage: null,
            selectedViewId: null,
            selectedViewName: null
        };
    }

    public componentDidMount(): void {
        this._getBadgeUri(null);
    }

    public render(): JSX.Element {
        const viewOptions = this._viewsDropDownOptions(this.props.views);

        return (
            <Panel
                className={"create-badge-panel"}
                isOpen={true}
                isLightDismiss={true}
                onDismiss={this._onDismiss}
                type={PanelType.medium}
                headerText={PackageResources.CreateBadgePanel_Header}
                closeButtonAriaLabel={PackageResources.AriaLabel_MultiCommandPanel_CloseButton}
            >
                {
                    <div>
                        {this.state.previewError && (
                            <div className={"create-badge-panel-block"}>
                                <PackageMessagePanel message={this.state.warningMessage} isMultiline={true} />
                            </div>
                        )}
                        <div className={"fontSizeM create-badge-panel-block"}>
                            {PackageResources.CreateBadgePanel_Description}
                        </div>
                        <div className={"create-badge-panel-block"}>
                            <Dropdown
                                label={PackageResources.CreateBadgePanel_ViewDropdown_Label}
                                options={viewOptions}
                                defaultSelectedKey={CreateBadgePanel.noViewKey}
                                onChanged={this._onViewChanged}
                            />
                        </div>
                        <div className={"create-badge-panel-block"}>
                            <Label>{PackageResources.CreateBadgePanel_Preview_Label}</Label>
                            {this.state.previewError ? (
                                <div className={"image-load-error fontSizeS"}>{this.state.warningMessage}</div>
                            ) : this.state.loadingUri ? (
                                <Spinner size={SpinnerSize.xSmall} />
                            ) : (
                                <Link href={this._getPackageUri()}>
                                    <img
                                        className={"preview-image"}
                                        alt={Utils_String.format(
                                            PackageResources.CreateBadgePanel_BadgeImage_AltText_Preview,
                                            this.props.selectedPackage.protocolType,
                                            this.props.selectedPackage.versions[0].version
                                        )}
                                        src={this._getImageUri()}
                                        onError={this._onImageError}
                                    />
                                </Link>
                            )}
                        </div>
                        <div className={"create-badge-panel-block"}>
                            <Label>{PackageResources.CreateBadgePanel_Markdown_Label}</Label>
                            {this.state.loadingUri ? (
                                <Spinner size={SpinnerSize.small} />
                            ) : (
                                <CopyableTextField
                                    text={this._getMarkdownText()}
                                    buttonAriaLabel={
                                        PackageResources.AriaLabel_CopyToClipBoard_CopyMarkdown_ButtonLabel
                                    }
                                    textFieldAriaLabel={
                                        PackageResources.AriaLabel_CopyToClipBoard_CopyMarkdown_TextFieldLabel
                                    }
                                    telemetryProperties={
                                        {
                                            commandName: CiConstants.CopyCommandBadgeMarkdown,
                                            feedName: this.props.feed.name,
                                            packageName: this.props.selectedPackage.name,
                                            protocol: this.props.selectedPackage.protocolType
                                        } as ICopyableTextFieldTelemetry
                                    }
                                />
                            )}
                        </div>
                        <div className={"margin-bottom"}>
                            <Label>{PackageResources.CreateBadgePanel_ImageLink_Label}</Label>
                            {this.state.loadingUri ? (
                                <Spinner size={SpinnerSize.small} />
                            ) : (
                                <CopyableTextField
                                    text={this._getImageUri()}
                                    buttonAriaLabel={
                                        PackageResources.AriaLabel_CopyToClipBoard_CopyImageLink_ButtonLabel
                                    }
                                    textFieldAriaLabel={
                                        PackageResources.AriaLabel_CopyToClipBoard_CopyImageLink_TextFieldLabel
                                    }
                                    telemetryProperties={
                                        {
                                            commandName: CiConstants.CopyCommandBadgeImage,
                                            feedName: this.props.feed.name,
                                            packageName: this.props.selectedPackage.name,
                                            protocol: this.props.selectedPackage.protocolType
                                        } as ICopyableTextFieldTelemetry
                                    }
                                />
                            )}
                        </div>
                    </div>
                }
            </Panel>
        );
    }

    private _getMarkdownText(): string {
        let feedName = this.props.feed.name;
        if (this.state.selectedViewName != null) {
            feedName = Utils_String.format("{0}@{1}", feedName, this.state.selectedViewName);
        }

        const altText = Utils_String.format(
            PackageResources.CreateBadgePanel_BadgeImage_AltText,
            this.props.selectedPackage.name,
            feedName,
            PackageResources.AzureArtifacts
        );
        return Utils_String.format("[![{0}]({1})]({2})", altText, this._getImageUri(), this._getPackageUri());
    }

    private _getImageUri(): string {
        return this.state.badgeUri;
    }

    private _getPackageUri(): string {
        const absolute = UrlHelper.getLatestPackageDetailsPageUrl(
            this.props.feed.id,
            this.props.selectedPackage,
            this.state.selectedViewId,
            "true" /* preferRelease */
        );
        return UrlHelper.resolveUri(absolute);
    }

    private _getNoBadgeText(): string {
        if (this.state.selectedViewName != null) {
            return Utils_String.format(
                PackageResources.CreateBadgePanel_BadgeLoadError_View,
                this.props.selectedPackage.name,
                this.state.selectedViewName
            );
        }
        return Utils_String.format(PackageResources.CreateBadgePanel_BadgeLoadError, this.props.selectedPackage.name);
    }

    private _getBadgeUri(selectedView: string): void {
        this._beginGetBadgeUri(selectedView).then((badgeUri: string) => {
            badgeUri = UrlHelper.resolveUri(badgeUri);
            // the markdown renderer used by VSTS encodes the uri for the image before fetching it, which results in a double-encoded string
            // eg guid%2540guid
            const deEncodedBadgeUri = badgeUri.replace("%40", "@");

            this.setState({
                badgeUri: deEncodedBadgeUri,
                loadingUri: false
            });
        });
    }

    private _beginGetBadgeUri(selectedView: string): IPromise<string> {
        let feedId = this.props.feed.id;
        if (selectedView != null) {
            feedId = Utils_String.format("{0}@{1}", feedId, selectedView);
        }

        // Making call in component because this component is used in both feed & package controller views/stores
        // Move it out once we have a single store.
        return this._feedsDataService.getPackageBadgeUrl(feedId, this.props.selectedPackage.id);
    }

    private _viewsDropDownOptions(views: FeedView[]): IDropdownOption[] {
        const viewOptions = views.map(view => {
            return {
                key: view.name,
                text: Utils_String.format("@{0}", view.name),
                data: view.id
            } as IDropdownOption;
        });

        viewOptions.push({
            key: CreateBadgePanel.dividerKey,
            text: "-",
            itemType: DropdownMenuItemType.Divider
        } as IDropdownOption);

        viewOptions.push({
            key: CreateBadgePanel.noViewKey,
            text: PackageResources.CreateBadgePanel_NoView,
            data: null
        } as IDropdownOption);

        return viewOptions;
    }

    @autobind
    private _onImageError(ev: React.SyntheticEvent<HTMLImageElement>): void {
        const warningMessage = this._getNoBadgeText();
        this.setState({
            previewError: true,
            warningMessage
        });
    }

    @autobind
    private _onViewChanged(option: IDropdownOption): void {
        const viewId = option.data as string;
        const viewName = option.key === CreateBadgePanel.noViewKey ? null : (option.key as string);
        if (viewId !== this.state.selectedViewId) {
            this.setState({
                badgeUri: null,
                loadingUri: true,
                previewError: false,
                warningMessage: null,
                selectedViewId: viewId,
                selectedViewName: viewName
            });
            this._getBadgeUri(viewId);
        }
    }

    @autobind
    private _onDismiss(): void {
        Actions.ToggleCreateBadgePanel.invoke(false);
    }
}
