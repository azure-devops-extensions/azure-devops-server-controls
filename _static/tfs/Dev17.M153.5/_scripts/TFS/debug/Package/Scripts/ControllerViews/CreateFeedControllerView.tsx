import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Image } from "OfficeFabric/Image";
import { Label } from "OfficeFabric/Label";
import { Spinner } from "OfficeFabric/Spinner";
import { ITextField, TextField } from "OfficeFabric/TextField";

import * as WebContext from "VSS/Context";
import { Component, Props } from "VSS/Flux/Component";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import * as Actions from "Package/Scripts/Actions/Actions";
import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { CiConstants, FwLinks, PerfScenarios } from "Feed/Common/Constants/Constants";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import {
    createFeed,
    ICreateFeedSettings,
    setFeedVisibility,
    Sources,
    Visibility
} from "Package/Scripts/Helpers/CreateFeedHelper";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as UrlHelper from "Package/Scripts/Helpers/UrlHelper";
import { Feed as FeedUx, Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/ControllerViews/CreateFeedControllerView";

import * as PackageResources from "Feed/Common/Resources";
import { ValidateName } from "Feed/Common/Utils/Validator";

export interface ICreateFeedControllerProps extends Props {
    getSelectedFeed: () => Feed;
}

export interface ICreateFeedControllerState {
    feedName: string;
    sources: string;
    visibility: string;
    createClicked: boolean;
}

export class CreateFeedControllerView extends Component<ICreateFeedControllerProps, ICreateFeedControllerState> {
    private static _teamProjectFieldId = "CreateFeedTeamProjectField";
    private _project: ContextIdentifier;
    private _collection: ContextIdentifier;
    private _createFeedScenario: Performance.IScenarioDescriptor;
    private _createFeedLabelId: string;
    private _orgUpstreamsEnabled: boolean;
    private _collUpstreamsEnabled: boolean;
    private _organizationName: string;

    constructor() {
        super();

        this._project = WebContext.getPageContext().webContext.project;
        this._collection = WebContext.getPageContext().webContext.collection;
        this._createFeedLabelId = "create-new-feed-label";

        const webPageDataService = Service.getLocalService(HubWebPageDataService);
        this._orgUpstreamsEnabled = webPageDataService.isOrganizationUpstreamsEnabled();
        this._collUpstreamsEnabled = webPageDataService.isCollectionUpstreamsEnabled();
        this._organizationName = webPageDataService.getOrganizationName();

        const visibility = this._orgUpstreamsEnabled
            ? Visibility.organization
            : this._collUpstreamsEnabled
                ? Visibility.collection
                : Visibility.defaultProjCollValidUsers;

        this.state = {
            createClicked: false,
            feedName: undefined,
            sources: Sources.public,
            userHasTyped: false,
            visibility
        };
    }

    public componentDidMount(): void {
        this._textField.focus();
    }

    public render(): JSX.Element {
        return (
            <div className={"createfeed-controller-view"}>
                <div
                    role="form"
                    aria-labelledby={this._createFeedLabelId}
                    className="createfeed-controller-view-content"
                >
                    <Image
                        alt=""
                        src={UrlHelper.getVersionedContentUrl("zerodata-add-a-feed.svg")}
                        className={"createfeed-image"}
                        height={300}
                    />
                    <div id={this._createFeedLabelId} className={"createfeed-label margin-bottom"}>
                        {PackageResources.CreateFeedControllerView_CreateNewFeed}
                    </div>
                    <div className={"createfeed-description margin-bottom"}>
                        {PackageResources.CreateFeedControllerView_Description}
                    </div>
                    <TextField
                        className={"margin-bottom"}
                        componentRef={textField => (this._textField = textField)}
                        label={PackageResources.CreateFeedControllerView_Name}
                        required={true}
                        value={this.state.feedName}
                        maxLength={64}
                        onKeyDown={e => (e.keyCode === KeyCode.ENTER ? this._onSave() : null)}
                        onChanged={newValue => this.setState({ feedName: newValue })}
                        onGetErrorMessage={newValue =>
                            this.state.feedName === undefined || ValidateName(newValue)
                                ? ""
                                : PackageResources.CreateFeedControllerView_FeedNameError
                        }
                    />
                    <TextField
                        className={"margin-bottom"}
                        label={PackageResources.CreateFeedControllerView_TeamProject}
                        id={CreateFeedControllerView._teamProjectFieldId}
                        disabled={true}
                        value={this._project.name}
                        onRenderLabel={() => (
                            <Label htmlFor={CreateFeedControllerView._teamProjectFieldId}>
                                <FormatComponent format={"{0} - {1}"}>
                                    {PackageResources.CreateFeedControllerView_TeamProject}
                                    <ExternalLink
                                        href={FwLinks.CreateFeedPageWhatsThis}
                                        linkAriaLabel={Utils_String.format(
                                            "{0} {1}",
                                            PackageResources.CreateFeedControllerView_TeamProject,
                                            PackageResources.CreateFeedControllerView_TeamProjectWhatsThis
                                        )}
                                    >
                                        {PackageResources.CreateFeedControllerView_TeamProjectWhatsThis}
                                    </ExternalLink>
                                </FormatComponent>
                            </Label>
                        )}
                    />
                    <ChoiceGroup
                        key="visibility"
                        selectedKey={this.state.visibility}
                        onChange={(event, option) => this.setState({ visibility: option.key })}
                        options={this._getVisibilityOptions()}
                        label={Utils_String.format(
                            "{0} - {1}",
                            PackageResources.CreateFeedControllerView_Visibility,
                            PackageResources.CreateFeedControllerView_WhoCanUseYourFeed
                        )}
                    />
                    <div className="margin-bottom" />
                    <ChoiceGroup
                        key="upstreams"
                        selectedKey={this.state.sources}
                        onChange={(event, option) => this.setState({ sources: option.key })}
                        options={CreateFeedControllerView._getUpstreamSourceOptions()}
                        label={PackageResources.CreateFeedControllerView_UseAndSaveOpenSourcePackages}
                    />
                    <hr className={"separator"} />
                    <div className={"createfeed-controller-view-buttons"}>
                        {this.state.createClicked && <Spinner className={"spinner"} />}
                        <PrimaryButton
                            type="submit"
                            text={PackageResources.CreateFeedControllerView_Create}
                            onClick={() => this._onSave()}
                            disabled={!ValidateName(this.state.feedName) || this.state.createClicked}
                        />
                        <DefaultButton
                            text={PackageResources.CreateFeedControllerView_Cancel}
                            onClick={() => {
                                CustomerIntelligenceHelper.publishEvent(CiConstants.CreateFeedPageClosed);
                                const selectedFeed = this.props.getSelectedFeed();
                                Actions.CreateFeedCanceled.invoke(selectedFeed);
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    private _onSave(): void {
        this.setState({ createClicked: true });
        this._createFeedScenario = Performance.getScenarioManager().startScenario(
            PerfScenarios.Area,
            PerfScenarios.CreateFeed
        );

        // Clear the possible error message before starting feed creation
        // so that the screen reader will read the possible new error message.
        Actions.ErrorDismissed.invoke({});

        const createFeedSettings = this._getCreateFeedSettings();
        const createFeedPromise = createFeed(createFeedSettings)
            .then(
                (feed: Feed) => {
                    CustomerIntelligenceHelper.publishEvent(CiConstants.NewFeedCreated);
                    Actions.NewFeedCreated.invoke({ createdFeed: feed as FeedUx });
                    return feed;
                },
                // Feed was not created
                (error: Error) => {
                    this._createFeedScenario.abort();
                    CustomerIntelligenceHelper.publishEvent(CiConstants.CreateFeedPageError, { error: error.message });
                    Actions.ErrorEncountered.invoke({ message: error.message });
                    this.setState({ createClicked: false });
                    throw error;
                }
            )
            // After the feed was created, configure visibility
            .then(
                (feed: Feed) => {
                    return setFeedVisibility(feed, createFeedSettings.visibility).then(
                        (feedWithPerms: Feed) => {
                            Actions.FeedUpdated.invoke(feedWithPerms as FeedUx);
                        },
                        error => {
                            Actions.ErrorEncountered.invoke({ message: PackageResources.Error_VisibilityOnViewNotSet });
                        }
                    );
                },
                // Error occurs when feed was not created successfully
                (error: Error) => {
                    throw error;
                    // Do nothing, error has already been handled above
                }
            );

        ProgressAnnouncer.forPromise(createFeedPromise, {
            announceStartMessage: PackageResources.CreateFeed_StartAnnouncement,
            announceEndMessage: PackageResources.CreateFeed_SuccessAnnouncement,
            announceErrorMessage: PackageResources.CreateFeed_ErrorAnnouncement,
            alwaysAnnounceEnd: true
        });
    }

    private _getVisibilityOptions(): IChoiceGroupOption[] {
        const options: IChoiceGroupOption[] = [];

        if (this._orgUpstreamsEnabled) {
            options.push({
                key: Visibility.organization,
                onRenderLabel: option => (
                    <Label id={option.labelId}>
                        <FormatComponent format={"{0} {1} - {2}"}>
                            <VssIcon iconName={"EMI"} iconType={VssIconType.fabric} />
                            {Utils_String.format(
                                PackageResources.CreateFeedControllerView_OrganizationVisibility_Header,
                                this._organizationName
                            )}
                            <span className={"subtle"}>
                                {PackageResources.CreateFeedControllerView_OrganizationVisibility_Description}
                            </span>
                        </FormatComponent>
                    </Label>
                ),
                text: PackageResources.CreateFeedControllerView_Account
            });
        }

        if (!this._orgUpstreamsEnabled) {
            const optionKey: string = this._collUpstreamsEnabled
                ? Visibility.collection
                : Visibility.defaultProjCollValidUsers;
            options.push({
                key: optionKey,
                onRenderLabel: option => (
                    <Label id={option.labelId}>
                        <FormatComponent format={"{0} {1} - {2}"}>
                            <VssIcon iconName={"EMI"} iconType={VssIconType.fabric} />
                            {Utils_String.format(
                                PackageResources.CreateFeedControllerView_CollectionVisibility_Header,
                                this._collection.name
                            )}
                            <span className={"subtle"}>
                                {PackageResources.CreateFeedControllerView_CollectionVisibility_Description}
                            </span>
                        </FormatComponent>
                    </Label>
                ),
                text: PackageResources.CreateFeedControllerView_Account
            });
        }

        options.push({
            key: Visibility.private,
            onRenderLabel: option => (
                <Label id={option.labelId}>
                    <FormatComponent format={"{0} {1} - {2}"}>
                        <VssIcon iconName={"Lock"} iconType={VssIconType.fabric} />
                        {PackageResources.CreateFeedControllerView_PrivateVisibility_Header}
                        <span className={"subtle"}>
                            {PackageResources.CreateFeedControllerView_PrivateVisibility_Description}
                        </span>
                    </FormatComponent>
                </Label>
            ),
            text: PackageResources.CreateFeedControllerView_Private
        });

        return options;
    }

    private static _getUpstreamSourceOptions(): IChoiceGroupOption[] {
        return [
            {
                key: Sources.public,
                text: PackageResources.CreateFeedControllerView_UsePackagesFromPublicSources
            },
            {
                key: Sources.local,
                text: PackageResources.CreateFeedControllerView_UsePackagesPublishedToThisFeed
            }
        ];
    }

    private _getCreateFeedSettings(): ICreateFeedSettings {
        const feedSettings = {} as ICreateFeedSettings;
        feedSettings.feedName = this.state.feedName;
        feedSettings.project = this._project;
        feedSettings.sources = this.state.sources;
        feedSettings.visibility = this.state.visibility;
        return feedSettings;
    }

    private _textField: ITextField;
}
