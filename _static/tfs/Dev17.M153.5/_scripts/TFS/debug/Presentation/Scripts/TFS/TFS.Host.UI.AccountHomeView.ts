//Auto converted from Presentation/Scripts/TFS/TFS.Host.UI.AccountHomeView.debug.js

/// <reference types="jquery" />
 

import Q = require("q");
import VSS = require("VSS/VSS");
import Locations = require("VSS/Locations");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Notifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Menus = require("VSS/Controls/Menus");
import TFSHOSTUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import UICommonControls = require("Presentation/Scripts/TFS/TFS.Host.UI.Controls");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import NewProject = require("Presentation/Scripts/TFS/TFS.UI.Controls.NewProject");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Telemetry = require("VSS/Telemetry/Services");
import Events_Action = require("VSS/Events/Action");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import * as Settings from "VSS/Settings";

var delegate = Utils_Core.delegate;
export var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var accountService: AccountService;
var ACCOUNT_HOME_PAGE_AREA = "AccountHomePage";

function onRemoveMRUTeamClick(target) {
    var url,
        $target = $(target),
        entryHashCode = $target.data("entryHashCode");

    if (entryHashCode) {
        url = Locations.urlHelper.getMvcUrl({ action: "RemoveNavigationMRUEntry", controller: "common", area: "api" });
        Ajax.postHTML(url, { mruEntryHashCode: entryHashCode }, function () {
            $target.closest("li").remove();
            Diag.logTracePoint("Team.MruEntry.Removed");
        });
    }
}

export function getAccountService() {
    if (!accountService) {
        accountService = Service.getApplicationService(AccountService);
    }

    return accountService;
}

export interface IAccountTrialControlOptions {accountTrialData : TFS_UI_Controls_Common.IAccountTrialMode }

export interface INewsResult {
    Link: string;
    Items: INewsItem[];
}

export interface INewsItem {
    Title: string;
    Summary: string;
    Url: string;
}

export interface IMruProject {
    Text: string;
    Title: string;
    Url: string;
    HashCode: number;
    LastAccessed: string;
    IsTeam: boolean;
}

export interface IResourceUsageResult {
    Title: string;
    StartDate: string;
    EndDate: string;
    Resources: IResourceItem[];
}

export interface IResourceItem {
    Title: string;
    CurrentQuantity: string;
    IncludedQuantity: string;
    MaximumQuantity: string;
    Unit: string;
    IsPaid: boolean;
    IsBlocked: boolean;
    BlockedReason: string;
}

export interface ICollectionStatus {
    CollectionIsReady: boolean;
    CanCreateProject: boolean;
    CanCreateRoom: boolean;
    ShowNewProjectControl: boolean;
    ShowNewProjectVisibilityDropDown: boolean;
    ShowProjects: boolean;
    ShowRooms: boolean;
    ProjectExists: boolean;
    HasCollectionPermission: boolean;
}

export class AccountHomeView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.AccountHomeView";
    private _accountService: AccountService;
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private _newProjectContainer: JQuery;
    private _statusContainer: JQuery;
    private _statusControl: StatusIndicator.StatusIndicator;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view"
        }, options));
    }

    public initialize() {

        var scenario = Performance.getScenarioManager().startScenarioFromNavigation("Acquisition", "AccountHomeLoaded", true);
        scenario.addSplitTiming("AccountHomeView-initialize-start");

        super.initialize();
        this._accountService = this._options.accountService || getAccountService();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this.populate();

        scenario.end();
    }

    public populate() {

        this.initializeCollection();
        this.buildNewProjectControl();
        this.buildAboutTfsControl();
        this.buildProjectMruList();
        this.buildPowerBIAnnouncementControl();
        this.buildAzureBenefitsAnnouncementControl();
        this.buildElsVsoIntegrationAnnouncementControl();
        this.buildOpenPlatformAnnouncementControl();
        this.buildAccountTrialControl();
        this.buildNewsControl();
        this.buildVSLinks();
        this.buildResourceUsageControl();

        this.buildStakeholderInfoMessageControl();

        if (this._options.TeamProjectsData.OpenPCWOnLoad) {
            VSS.using(["Admin/Scripts/TFS.Admin.Registration.HostPlugins"], () => {
                Events_Action.getService().performAction(HostUIActions.ACTION_NEW_PROJECT, {
                    tfsContext: tfsContext,
                    source: "HomePage"
                });
            });
        }

        this.RenderVideo();
    }

    public initializeCollection() {
        if (!this._options.CollectionData.CollectionIsReady) {
            this._newProjectContainer = this._grid.createContainer(1, 1, 4);
            this._statusContainer = $("<div />").addClass("status-container").appendTo(this._newProjectContainer);
            this._statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._statusContainer, {
                center: true,
                imageClass: "big-status-progress",
                message: PresentationResources.Loading
            });

            this._statusControl.start();

            this._initCollectionData();
        };
    }

    public buildNewProjectControl() {
        if (this._options.NewProjectControlData.ShowNewProjectControl) {
            if (this._newProjectContainer == null) {
                this._newProjectContainer = this._grid.createContainer(1, 1, 4);
            }
            var newProjectControl = <NewProject.NewProjectControl>Controls.BaseControl.createIn(NewProject.NewProjectControl, this._newProjectContainer, { adjustHeight: true, showVisibilityOptions: this._options.NewProjectControlData.ShowNewProjectVisibilityDropDown });
        }
    }

    public buildAboutTfsControl() {
        if (this._options.AboutTfsData.ShowAboutTfs) {
            <AboutTFS>Controls.BaseControl.createIn(AboutTFS, this._grid.createContainer(1, 1, 4));
        }

        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "AboutTFSVisibility", "Visibility", this._options.AboutTfsData.ShowAboutTfs ? "Visible" : "Hidden"));
    }

    public buildProjectMruList() {

        if (this._options.TeamProjectsData.ShowProjects) {
            var showStakeholderNoItemsMessage: boolean =
                this._options.StakeholderData && this._options.StakeholderData.ShowMessage
                && !this._options.CollectionData.ProjectExists;

            <TeamProjectMruList>Controls.BaseControl.createIn(TeamProjectMruList, this._grid.createContainer(1, 2, 2),
                {
                    accountService: this._accountService,
                    adjustHeight: true,
                    canCreateProject: this._options.TeamProjectsData.CanCreateProject,
                    showStakeholderNoItemsMessage: showStakeholderNoItemsMessage
                });
        }
    }

    public buildOpenPlatformAnnouncementControl() {
        if (this._options.OpenPlatformAnnouncementData.ShowAnnouncement) {
            <AnnouncementControl>Controls.BaseControl.createIn(AnnouncementControl, this._grid.createContainer(2, 1, 2),
                {
                    announcementType: this._options.OpenPlatformAnnouncementData.AnnouncementType,
                    id: this._options.OpenPlatformAnnouncementData.AnnouncementId,
                    link: this._options.OpenPlatformAnnouncementData.Link,
                    backgroundImage: PresentationResources.OpenPlatformBackgroundImage,
                    closeButtonTitle: PresentationResources.AnnouncementCloseButtonTitle,
                    fontColor: PresentationResources.AnnouncementFontColor,
                    closeTileIcon: PresentationResources.AnnouncementCloseTileIcon,
                    subTitle: "",
                    title: PresentationResources.OpenPlatformTitle,
                    tileSubTitle: PresentationResources.OpenPlatformSubtitle,
                    tileSubTitleClass: "open-platform-tile-subtitle",
                    linkTarget: "_blank"
                });
        }

        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "OpenPlatformAnnouncementControl", "Visibility", this._options.OpenPlatformAnnouncementData.ShowAnnouncement ? "Visible" : "Hidden"));

        if (this._options.OpenPlatformAnnouncementData.AnnouncementId > 0) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "OpenPlatformAnnouncementControl", "Id", this._options.OpenPlatformAnnouncementData.AnnouncementId));
        }
    }

    public buildPowerBIAnnouncementControl() {
        if (this._options.PowerBIAnnouncementData.ShowAnnouncement) {
            <AnnouncementControl>Controls.BaseControl.createIn(AnnouncementControl, this._grid.createContainer(2, 1, 2),
                {
                    announcementType: this._options.PowerBIAnnouncementData.AnnouncementType,
                    id: this._options.PowerBIAnnouncementData.AnnouncementId,
                    link: this._options.PowerBIAnnouncementData.Link,
                    backgroundImage: PresentationResources.PowerBIBackgroundImage,
                    closeButtonTitle: PresentationResources.AnnouncementCloseButtonTitle,
                    fontColor: PresentationResources.AnnouncementFontColor,
                    closeTileIcon: PresentationResources.AnnouncementCloseTileIcon,
                    subTitle: "",
                    title: PresentationResources.PowerBITitle,
                    tileSubTitle: PresentationResources.PowerBITileSubTitle,
                    tileSubTitleClass: "power-bi-tile-subtitle",
                    linkTarget: "_blank"
                });
        }

        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "PowerBIAnnouncementControl", "Visibility", this._options.PowerBIAnnouncementData.ShowAnnouncement ? "Visible" : "Hidden"));

        if (this._options.PowerBIAnnouncementData.AnnouncementId > 0) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "PowerBIAnnouncementControl", "Id", this._options.PowerBIAnnouncementData.AnnouncementId));
        }
    }

    private buildAzureBenefitsAnnouncementControl() {
        if (this._options.AzureBenefitsAnnouncementData.ShowAnnouncement) {
            <AnnouncementControl>Controls.BaseControl.createIn(AnnouncementControl, this._grid.createContainer(2, 1, 2),
                {
                    announcementType: this._options.AzureBenefitsAnnouncementData.AnnouncementType,
                    id: this._options.AzureBenefitsAnnouncementData.AnnouncementId,
                    link: this._options.AzureBenefitsAnnouncementData.Link,
                    backgroundImage: PresentationResources.AzureBenefitTileBackgroundImage,
                    closeButtonTitle: PresentationResources.AnnouncementCloseButtonTitle,
                    fontColor: PresentationResources.AnnouncementFontColor,
                    closeTileIcon: PresentationResources.AnnouncementCloseTileIcon,
                    title: PresentationResources.AzureBenefitTitle,
                    subTitle: PresentationResources.AzureBenefitSubTitle,
                    linkTarget: "_blank"
                });
        }

        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "AzureBenefitsAnnouncementControl", "Visibility", this._options.AzureBenefitsAnnouncementData.ShowAnnouncement ? "Visible" : "Hidden"));

        if (this._options.AzureBenefitsAnnouncementData.AnnouncementId > 0) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "AzureBenefitsAnnouncementControl", "Id", this._options.AzureBenefitsAnnouncementData.AnnouncementId));
        }
    }

    public buildElsVsoIntegrationAnnouncementControl() {
        if (this._options.ElsVsoIntegrationAnnouncementData.ShowAnnouncement) {
            <AnnouncementControl>Controls.BaseControl.createIn(AnnouncementControl, this._grid.createContainer(2, 1, 2),
                {
                    announcementType: this._options.ElsVsoIntegrationAnnouncementData.AnnouncementType,
                    id: this._options.ElsVsoIntegrationAnnouncementData.AnnouncementId,
                    link: this._options.ElsVsoIntegrationAnnouncementData.Link,
                    backgroundImage: PresentationResources.ElsVsoIntegrationBackgroundImage,
                    closeButtonTitle: PresentationResources.AnnouncementCloseButtonTitle,
                    fontColor: PresentationResources.AnnouncementFontColor,
                    closeTileIcon: PresentationResources.AnnouncementCloseTileIcon,
                    subTitle: PresentationResources.ElsVsoIntegrationSubtitle,
                    title: PresentationResources.ElsVsoIntegrationTitle,
                    tileSubTitle: PresentationResources.ElsVsoIntegrationTileSubTitle,
                    tileSubTitleClass: "els-vso-integration-tile-subtitle",
                    linkTarget: this._options.ElsVsoIntegrationAnnouncementData.NewTab
                });
        }
        
        Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "ElsVsoIntegrationAnnouncementControl", "Visibility", this._options.ElsVsoIntegrationAnnouncementData.ShowAnnouncement ? "Visible" : "Hidden"));

        if (this._options.ElsVsoIntegrationAnnouncementData.AnnouncementId > 0) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "ElsVsoIntegrationAnnouncementControl", "Id", this._options.ElsVsoIntegrationAnnouncementData.AnnouncementId));
        }
    }

    public buildNewsControl() {
        <NewsControl>Controls.BaseControl.createIn(NewsControl, this._grid.createContainer(2, 2, 2),
            { accountService: this._accountService });
    }

    public buildAccountTrialControl() {
        var _$accountTrialData = $('.accountTrialInformationData');
        if (_$accountTrialData && _$accountTrialData.length > 0) {
            var _accountTrialData: TFS_UI_Controls_Common.IAccountTrialMode = Utils_Core.parseMSJSON(_$accountTrialData.html(), false);

            if (_accountTrialData && _accountTrialData.IsAccountEligibleForTrialMode && this._options.AccountTrialData.CanStartAccountTrial) {
                <AccountTrialControl>Controls.BaseControl.createIn(AccountTrialControl, this._grid.createContainer(3, 1, 2), { accountTrialData: _accountTrialData });
            }
        }
    }


    public RenderVideo() {
        if (this._options.StartedVideo.CanSeeGettingStartedVideo)
        {
            if (this._options.StartedVideo.isIframeDailog) {
                this._options.isIframeDailog = true;
                this._options.contenturl = PresentationResources.GettingStartedVideos;
            }
            else {
                this._options.isIframeDailog = false;
                this._options.gettingStartedContentImageurl = PresentationResources.gettingStartedContentImageurl;
                this._options.gettingStartedContentVideourl = PresentationResources.gettingStartedContentVideourl;
            }

            Dialogs.show(AccountGettingStartedVideoDialog, this._options);
        }
    }

    public buildVSLinks() {
        if (this._options.VsLinksData.ShowVsLinks) {
            <VSLinksList>Controls.BaseControl.createIn(VSLinksList, this._grid.createContainer(3, 1, 2),
                { vsOpenLink: this._options.VsLinksData.VsOpenLink });
        }
    }

    public buildResourceUsageControl() {
        if (this._options.ResourceUsageData && this._options.ResourceUsageData.ShowResourceUsage) {
            <ResourceUsageControl>Controls.BaseControl.createIn(ResourceUsageControl, this._grid.createContainer(3, 1, 2),
                { accountService: this._accountService });
        }
    }

    public buildStakeholderInfoMessageControl() {
        if (
            this._options.StakeholderData && this._options.StakeholderData.ShowMessage
            && this._options.CollectionData.ProjectExists) {
            var options: IExternalInfoOptions = {
                externalInfoUri: "https://go.microsoft.com/fwlink/?LinkID=404054"
            };

            <ExternalInfoControl>Controls.BaseControl.createIn(ExternalInfoControl, this._grid.createContainer(3, 3, 2), options);
        }
    }

    private _initCollectionData() {
        setTimeout(() => {
            this._getCollectionData();
        }, 2000);
    }

    private _getCollectionData() {
        this._accountService.beginGetCollectionData((result: ICollectionStatus) => {
            if (result.CollectionIsReady) {
                if (result.ShowNewProjectControl) {
                    this._statusContainer.remove();
                } else {
                    this._grid.removeContainer(this._statusContainer);
                }

                this._statusControl.dispose();

                this._statusControl = null;
                this._statusContainer = null;

                this._options.CollectionData.CollectionIsReady = result.CollectionIsReady;
                this._options.NewProjectControlData.ShowNewProjectControl = result.ShowNewProjectControl;
                this._options.NewProjectControlData.ShowNewProjectVisibilityDropDown = result.ShowNewProjectVisibilityDropDown;
                this._options.TeamProjectsData.CanCreateProject = result.CanCreateProject;
                this._options.TeamProjectsData.ShowProjects = result.ShowProjects;
                this._options.TeamRoomsData.CanCreateRoom = result.CanCreateRoom;
                this._options.TeamRoomsData.ShowRooms = result.ShowRooms;

                this.buildNewProjectControl();
                this.buildProjectMruList();
            }
            else if (!result.HasCollectionPermission) {
                this._grid.removeContainer(this._statusContainer);
            } else {
                this._initCollectionData();
            }
        }, (errorCallback?) => {
            this._statusControl.dispose();
            this._statusControl = null;

            this._statusContainer.remove();
            this._statusContainer = null;

            var errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._newProjectContainer, { closeable: false });
            errorPane.setError(PresentationResources.ErrorLoadingProjects);
        });
    }
}

interface ITileItem {
  Title: string;
  Subtitle: string;
  Url: string;
  CITitle: string; // CI Title data sent - unlocalized
  Id: string;
}

export class AboutTFS extends UICommonControls.HorizontalGridControl {

    public static enhancementTypeName: string = "tfs.AboutTFS";
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    
    constructor(options?) {        
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-about-tfs-panel"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this.render();       
    }

    public render(): void {
        super.render();        

        var featureItem: ITileItem = {
            Title: PresentationResources.AboutTFSFeaturesTitle,
            CITitle: "Features",
            Subtitle: tfsContext.isHosted ? PresentationResources.AboutTFSFeaturesSubtitle_Hosted : PresentationResources.AboutTFSFeaturesSubtitle_OnPrem,
            Url: tfsContext.isHosted ? "https://go.microsoft.com/fwlink/?LinkId=322126" : "https://go.microsoft.com/fwlink/?LinkId=322127",
            Id: "features-tile-item"
        },
        pricingItem: ITileItem = {
            Title: PresentationResources.AboutTFSPricingTitle,
            CITitle: "Pricing",
            Subtitle: PresentationResources.AboutTFSPricingSubtitle,
            Url: "https://go.microsoft.com/fwlink/?LinkID=269576",
            Id: "pricing-tile-item"
        },
        learnItem: ITileItem = {
            Title: PresentationResources.AboutTFSLearnTitle,
            CITitle: "Learn",
            Subtitle: tfsContext.isHosted ? PresentationResources.AboutTFSLearnSubtitle_Hosted : PresentationResources.AboutTFSLearnSubtitle_OnPrem,
            Url: tfsContext.isHosted ? "https://go.microsoft.com/fwlink/?LinkId=322128" : "https://go.microsoft.com/fwlink/?LinkId=322129",
            Id: "learn-tile-item"
        },
        getVsItem: ITileItem = {
            Title: PresentationResources.AboutTFSGetVSTitle,
            CITitle: "Get Visual Studio",
            Subtitle: PresentationResources.AboutTFSGetVSSubtitle,
            Url: "https://go.microsoft.com/fwlink/?LinkId=309297",
            Id: "download-tile-item"
        },
        administerItem: ITileItem = {
            Title: PresentationResources.AboutTFSAdminTitle,
            CITitle: "Administer",
            Subtitle: PresentationResources.AboutTFSAdminSubtitle,
            Url: tfsContext.getActionUrl("", "admin"),
            Id: "admin-tile-item"
        };
        
        var hostedTiles = [ featureItem, pricingItem, learnItem, getVsItem ];
        var onPremTiles = [ featureItem, learnItem, getVsItem, administerItem ];
        
        var tiles = tfsContext.isHosted ? hostedTiles : onPremTiles;

        if (tfsContext.isHosted)
        {
            this.renderAbout(PresentationResources.AboutTFSTitle_Hosted, PresentationResources.AboutTFSCloseIconTitle_Hosted);
        }
        else
        {
            this.renderAbout(PresentationResources.AboutTFSTitle_OnPrem, PresentationResources.AboutTFSCloseIconTitle_OnPrem);
        }
        
        $.each(tiles, (i, item) => {
            this.addTile(item);
        });
    }
    
    private renderAbout(title: string, closeButtonTitle: string): void {
        this.addGridControlTitle(title);
        this.addCloseButtonToGridHeader(closeButtonTitle, () => {
            var url = tfsContext.getActionUrl("HideAboutTfsModule", "common", { area: "api" });
            this._grid.removeContainer(this._element);
            Ajax.postHTML(url); //This is to save the user preference (to hide AboutTFS module) in registry table.
        });
    }
    
    private addTile(tileItem: ITileItem): void {
      var horizGridListItem: UICommonControls.HorizontalGridListItem = new UICommonControls.HorizontalGridListItem('icon-arrow-forward', tileItem.Title, tileItem.Url, tileItem.Subtitle, Utils_String.format("{0}&#013;{1}", tileItem.Title, tileItem.Subtitle), null, tileItem.Id);
      this.addListItem(horizGridListItem).find("a").click(() => {
          Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "AboutTFS", "Title", tileItem.CITitle));
          });
    }
}

export class AnnouncementControl extends UICommonControls.HorizontalGridControl {
    public static enhancementTypeName: string = "tfs.AnnouncementControl";
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private _currentId: number;
    private _link: string;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-announcement-control"
        }, options));
    }

    public initialize(): void {
        Diag.logTracePoint("AccountHomePage.AnnouncementControl.Start");
        super.initialize();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this._currentId = this._options.id;
        this._link = this._options.link;

        this.render();
    }

    public render(): void {
        super.render();
        
        var backgroundImageUrl = tfsContext.configuration.getResourcesFile(this._options.backgroundImage);
        
        var title = this.addGridControlTitle(this._options.title);
        this.addCloseButtonToGridHeader(this._options.closeButtonTitle, (e) => {
            e.preventDefault();
            var url = tfsContext.getActionUrl("HideAnnouncementModule", "common", { area: "api" });
            this._grid.removeContainer(this._element);
            Ajax.postHTML(url, { announcementType: this._options.announcementType, id: this._currentId });
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "AnnouncementControl", "HideClicked", true));
        }, this._options.closeTileIcon);
        
        var horizGridListItem: UICommonControls.HorizontalGridListItem = 
                                       new UICommonControls.HorizontalGridListItem('icon-arrow-forward', 
                                                                                   this._options.subTitle, 
                                                                                   this._link, 
                                                                                   this._options.tileSubTitle, 
                                                                                   this._options.subTitle);
        
        var listItem = this.addListItem(horizGridListItem);
        listItem.find(".grid-cell-item-subTitle").addClass("announcement-subtitle").css({ "color": this._options.fontColor });
        
        if (this._options.tileSubTitleClass) {
            listItem.find(".grid-cell-item-subTitle").addClass(this._options.tileSubTitleClass);
        }
        listItem.find(".grid-cell-bgfill").addClass("announcement-background").css({ 'background-image': 'url("' + backgroundImageUrl + '")' });
        listItem.find("a").attr("target", this._options.linkTarget).attr("id", "announcement-link");
        listItem.find("a").click(() => {            
            var ciData: { [key: string]: any } = {"AnnouncementClickedId": this._currentId, "AnnouncementClickedUrl": this._link
                };
          
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(ACCOUNT_HOME_PAGE_AREA, "AnnouncementControl", ciData));
          });

        Diag.logTracePoint("AccountHomePage.AnnouncementControl.Complete");
    }
}

export class TeamProjectMruList extends UICommonControls.GridListControl {
    public static DEFAULT_MAX_PROJECTS_COUNT = 8;
    private static STAKEHOLDER_NO_PROJECT_LINK: string = "https://go.microsoft.com/fwlink/?LinkId=402657";

    public static enhancementTypeName: string = "tfs.TeamProjectMruList";
    private _accountService: AccountService;
    private _maxCount: number;
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private _teamIcon: string = 'icon-project-white';
    private _projectIcon: string = 'icon-folder-white';
    private _teamIconTitle: string = PresentationResources.ProjectMruListTeamIconTitle;
    private _projectIconTitle: string = PresentationResources.ProjectMruListProjectIconTitle;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-team-project-panel"
        }, options));
    }

    public initialize(): void {
        Diag.logTracePoint("AccountHomePage.ProjectMru.Start");
        super.initialize();
        this._accountService = this._options.accountService || getAccountService();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this._maxCount = this._options.maxCount || TeamProjectMruList.DEFAULT_MAX_PROJECTS_COUNT;
        this.render();
    }

    public render(): void {
        super.render();

        this.addGridControlTitle(PresentationResources.ProjectMruListRecentProjectsAndTeams);
        this._addButtons(this._options.canCreateProject);

        var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, {
            center: true,
            imageClass: "big-status-progress",
            message: PresentationResources.Loading,
            throttleMinTime: 100,
        });

        statusIndicator.start();

        this._accountService.beginGetTeamProjectMruList(this._maxCount, (result: IMruProject[]) => {
            statusIndicator.dispose();
            statusIndicator = null;
            this._renderControl(result);
        },
            error => {
                statusIndicator.dispose();
                statusIndicator = null;

                var errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._element, { closeable: false });
                errorPane.setError(PresentationResources.ErrorLoadingProjects);
                this._adjustHeight();
            });
    }

    private _renderControl(result: IMruProject[]) {
        this._renderList(result);
    }

    private _addButtons(canCreateProject: boolean): void {
        if (canCreateProject) {
            var newButton: UICommonControls.GridListContextButton = new UICommonControls.GridListContextButton(
                PresentationResources.ProjectMruListCreateNewProjectText,
                PresentationResources.ProjectMruListCreateNewProjectTitle,
                ['create-project'],
                "create-project-link");
            this.addContextButton(newButton).click(() => {
                Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "Project", "Action", "New"));

                Events_Action.getService().performAction(HostUIActions.ACTION_NEW_PROJECT, {
                    tfsContext: tfsContext,
                    source: "HomePage"
                });
            });
        }
        

        var browseButton: UICommonControls.GridListContextButton = new UICommonControls.GridListContextButton(
            PresentationResources.ProjectMruListBrowseText,
            PresentationResources.ProjectMruListBrowseTitle,
            ['single-command', 'project-browse'],
            "browse-projects");
        var browseElement = this.addContextButton(browseButton).attr("data-command-name", "browseTeams")
            .attr("data-command-complete-event", "browse-dialog-open")
            .click(() => {
                Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "Project", "Action", "Browse"));
            });

        Controls.Enhancement.ensureEnhancement(browseElement);
    }

    private _renderList(items: IMruProject[]): void {
        if (items && items.length > 0) {
            $.each(items, (i, item: IMruProject) => {
                this._renderItem(item);
            });
        } else {
            if (this._options.showStakeholderNoItemsMessage) {
                this._addNoItemMessageStakeholder();
            } else {
                this.addNoItemMessage(PresentationResources.NoMruProjects);
            }
        }
        this._onRenderComplete();
    }

    private _addNoItemMessageStakeholder() {
        var link = [];
        link.push('<a href="');
        link.push(TeamProjectMruList.STAKEHOLDER_NO_PROJECT_LINK);
        link.push('">');
        link.push(PresentationResources.Stakeholder_NoProjectMessage_LinkText);
        link.push('</a>');
        var message = Utils_String.format(PresentationResources.Stakeholder_NoProjectMessage, link.join(""));

        this.addNoItemMessageHtml(message);
    }

    private _renderItem(item: IMruProject): void {
        var lastAccessedFriendly = super.getLastAccessedFriendly(item.LastAccessed);
        var icon = item.IsTeam ? this._teamIcon : this._projectIcon;
        var iconTitle = item.IsTeam ? this._teamIconTitle : this._projectIconTitle;
        var gridListItem: UICommonControls.GridListItem = new UICommonControls.GridListItem(icon, iconTitle, item.Text, item.Url, lastAccessedFriendly, 'icon-close', PresentationResources.ProjectMruListRemoveFromList, item.Title);

        var gridItem = this.addListItem(gridListItem);
        gridItem.find('.icon-close').attr("data-entry-hash-code", item.HashCode)
            .click((e) => {
                e.preventDefault();
                onRemoveMRUTeamClick(e.target);
            });

        gridItem.find("a").click(() => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "Project", "Action", "Navigate"));
        });
    }

    private _onRenderComplete(): void {
        this._adjustHeight();
        Diag.logTracePoint("AccountHomePage.ProjectMru.Complete");
    }

    private _adjustHeight() {
        if (this._options.adjustHeight) {
            this._grid.adjustHeight(this._element);
        }
    }
}

export class NewsControl extends UICommonControls.GridListControl {
    public static DEFAULT_MAX_NEWS_COUNT = 3;
    public static VIEWALL_LINK = "https://go.microsoft.com/fwlink/?LinkId=323493";

    public static enhancementTypeName: string = "tfs.TeamProjectMruList";
    private _accountService: AccountService;
    private _maxCount: number;
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-news-panel"
        }, options));
    }

    public initialize(): void {
        Diag.logTracePoint("AccountHomePage.News.Start");

        super.initialize();
        this._accountService = this._options.accountService || getAccountService();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this._maxCount = this._options.maxCount || NewsControl.DEFAULT_MAX_NEWS_COUNT;
        this.render();
    }

    public render(): void {
        super.render();
        this.addGridControlTitle(PresentationResources.NewsTitle);

        var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, {
            center: true,
            imageClass: "big-status-progress",
            message: PresentationResources.Loading,
            throttleMinTime: 100,
        });

        statusIndicator.start();
        this._accountService.beginGetNews(this._maxCount, (result: INewsResult) => {
            if (statusIndicator != null) {
                statusIndicator.dispose();
                statusIndicator = null;
            }
            this._renderControl(result);
        },
        () => {
            statusIndicator.dispose();
            statusIndicator = null;
            this._grid.removeContainer(this._element);
        });
    }

    private _renderControl(result: INewsResult) {
        if (!result) {
            this._grid.removeContainer(this._element);
            return;
        }

        if (!result.Items) {
            this._grid.removeContainer(this._element);
            return;
        }
        
        this.addActionLinkToGridHeader(PresentationResources.NewsViewAllLink, "view-all-news", NewsControl.VIEWALL_LINK, Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "NewsFeed", "Action", "ViewAll"));

        $.each(result.Items, (i, item: INewsItem) => {
            this._renderItem(item);
        });

        this._onRenderComplete();
    }

    private _renderItem(item: INewsItem): void {
        var gridListItem: UICommonControls.GridListItem = new UICommonControls.GridListItem('', '', item.Title, item.Url, item.Summary, '', '', item.Title);
        var newsItem = this.addListItem(gridListItem);
        newsItem.find('.icon-container').remove();
        newsItem.find('.grid-cell-item-text a').attr('target', '_blank').click(() => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "NewsFeed", "Action", "Navigate"));
        });
    }

    private _onRenderComplete(): void {
        this._adjustHeight();
        Diag.logTracePoint("AccountHomePage.News.Complete");
    }

    private _adjustHeight() {
        if (this._options.adjustHeight) {
            this._grid.adjustHeight(this._element);
        }
    }
}

export class VSLinksList extends UICommonControls.GridListControl {

    public static enhancementTypeName: string = "tfs.VsLinksList";
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private static _openVsIcon: string = 'icon-open-white';
    private static _getVsIcon: string = 'icon-visual-studio-large';
    public static vsDownloadLink: string = "https://go.microsoft.com/fwlink/?LinkId=309297";
    
    //This is a temporary url. We don't know what this will be right now. It will be updated once we have response from NC team.
    private vsOpenLink: string = "";

    constructor(options?) {
        super(options);
    }
    
    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-vs-links-panel"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this.render();
    }

    public render(): void {
        super.render();
        this.addGridControlTitle(PresentationResources.VsLinksMainTitle);        

        this.vsOpenLink = this._options.vsOpenLink;
        var openVsgridListItem: UICommonControls.GridListItem = new UICommonControls.GridListItem(VSLinksList._openVsIcon, PresentationResources.VsLinksOpenInVsTooltip, PresentationResources.VsLinksOpenInVsTitle, this.vsOpenLink, PresentationResources.RequiresVS2012, '', '');
        var openVsItem = this.addListItem(openVsgridListItem);

        openVsItem.find('.grid-cell-item-text a').attr("title", PresentationResources.VsLinksOpenInVsTooltip).attr("id", "open-in-visualstudio");
        openVsItem.find('.grid-cell-item-text a, a.icon-container').click(() => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "VsLinks", "LinkType", "OpenVs"));
        });

        var getVsUIgridListItem: UICommonControls.GridListItem = new UICommonControls.GridListItem(VSLinksList._getVsIcon, PresentationResources.VsLinksGetVsIconTitle, PresentationResources.VsLinksGetVsTitle, VSLinksList.vsDownloadLink, PresentationResources.VsLinksGetVsSubTitle, '', '', "get-visualstudio");
        var getVsItem = this.addListItem(getVsUIgridListItem);
        getVsItem.find('a.icon-container').attr("target", "_blank").click(() => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "VsLinks", "LinkType", "GetVs"));
        });
        getVsItem.find('.grid-cell-item-text a').attr("target", "_blank").click(() => {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "VsLinks", "LinkType", "GetVs"));
        });
        getVsItem.find(".icon-container").addClass("large");
    }
}

export class AccountTrialControl extends UICommonControls.GridListControl {

    public static enhancementTypeName: string = "tfs.AccountTrialControl";
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private static _accountTrialIcon: string = 'icon-trial-white';
    private static _settingsUrl = tfsContext.getActionUrl("Settings", "Home", { area: 'admin' });

    constructor(options? : IAccountTrialControlOptions) {
        super(options);
    }
    
    public initializeOptions(options? : IAccountTrialControlOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-account-trial-panel"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this.render();
    }

    public render(): void {
        super.render();
        if(this._options.accountTrialData.IsAccountEligibleForTrialMode)
        {
           this.addGridControlTitle(PresentationResources.AccountTrial);
           this.addActionLinkToGridHeader(PresentationResources.AccountTrialLearnMore, "learn-more", this._options.accountTrialData.TrialFeatureUrl,  Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "Trial", "Action", "LearnMore"), "account-trial-learnmore" );
           var accountTrialListItem: UICommonControls.GridListItem = new UICommonControls
                        .GridListItem(AccountTrialControl._accountTrialIcon, PresentationResources.AccountTrialStartAccountTrial, PresentationResources.AccountTrialStartAccountTrial, '', PresentationResources.TryAllFeatures, 'icon-trial-white-bg', '', "start-account-trial");
           
           var accountTrialItem = this.addListItem(accountTrialListItem);
           accountTrialItem.find('a').bind('click', delegate(this, this._onStartAccountTrialClick));
           accountTrialItem.find('a.icon-container').addClass('account-start-trial-icon-bg');
        }
    }

    private _onStartAccountTrialClick(e? : JQueryEventObject) {
        e.preventDefault();
        Dialogs.show(TFS_UI_Controls_Common.AccountTrialDialog, this._options.accountTrialData);
    }
}

export interface IExternalInfoOptions {
    externalInfoUri: string;
}

export class ExternalInfoControl extends Controls.BaseControl {
    /// <summary>Control displaying an external website in an iframe</summary>

    public static enhancementTypeName: string = "tfs.ExternalInfoControl";
    
    constructor(options?: IExternalInfoOptions) {
        super(options);
    }

    public initializeOptions(options?: IExternalInfoOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-external-info"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this.render();
    }

    public render(): void {
        $("<iframe>")
            .attr("src", (<IExternalInfoOptions>this._options).externalInfoUri)
            .attr("scrolling", "no")    // required because not all current browsers support overflow:hidden for iframes, yet
            .appendTo(this._element);
    }
}

export interface AccountGettingStartedVideoDialogOptions extends Dialogs.IModalDialogOptions {
    contenturl?: string;
    isIframeDailog?: boolean;
    gettingStartedContentImageurl?: string;
    gettingStartedContentVideourl?: string;
}

export class AccountGettingStartedVideoDialog extends Dialogs.ModalDialogO<AccountGettingStartedVideoDialogOptions> {
  //  private _$waitControl: any;
   // private _$data: any;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 840,
            minWidth: 840,
            height: 550,
            minHeight: 550,
            resizable: false,
            hasProgressElement: false,
            allowMultiSelect: false
        }, options));
    }

    public initialize() {
        super.initialize();
        $('div.ui-dialog').addClass('ui-dialog-getting-started-Video');
        $('.ui-dialog-titlebar').addClass('ui-dialog-getting-started-Video-tittle');
        $('.ui-dialog-buttonpane').hide();
        $('.ui-dialog-titlebar').addClass('ui-dialog-getting-started-Video-tittle');
        $('.ui-dialog-titlebar-close').addClass('ui-video-close-icon-closethick');
        $('.ui-icon-closethick').addClass('ui-icon-videoclosethick');
        $('.ui-widget-overlay').addClass('video-ui-widget-overlay');

        var wrapper = $('<div>')
            .addClass('geting-started-video-content');

        if (this._options && this._options.isIframeDailog) {
            var iframe = $("<iframe " + this._getSandboxAttributes() + ">")
                .attr("src", this._options.contenturl);
            wrapper.append(iframe);
        }
        else {
            var video = $("<video>")
                .addClass('ui-dialog-getting-started-Videoembaded')
                .attr("controls", '')
                .attr("poster", this._options.gettingStartedContentImageurl);

            var videoSource = $("<source>")
                .attr("src", this._options.gettingStartedContentVideourl)
                .attr("type", 'video/mp4');

            video.append(videoSource);
            wrapper.append(video);
        }

        this.getElement().append(wrapper);
    }

    private _getSandboxAttributes() {
        return " scrolling='no' allowFullScreen frameBorder='0' class='geting-started-video-iframe' sandbox='allow-scripts allow-popups allow-same-origin'";
    }

    private _onCloseClick(e?: JQueryEventObject) {
        this.close();
    }

    private _onCancelClick(e?: JQueryEventObject) {
        this.close();
    }

    private _onSaveClick(e?: JQueryEventObject) {
    }
}

export class ResourceUsageControl extends UICommonControls.GridListControl {

    public static enhancementTypeName: string = "tfs.ResourceUsageControl";
    private _accountService: AccountService;
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private _learnMoreUrl = "https://go.microsoft.com/fwlink/?LinkID=327497&clcid=0x409";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-resourceusage-panel"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._accountService = this._options.accountService || getAccountService();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();
        this.render();
    }

    public render(): void {
        super.render();
        this.addGridControlTitle(PresentationResources.ResourceUsageTitle);
        this.addActionLinkToGridHeader(PresentationResources.ResourceUsageLearnMore, "learn-more", this._learnMoreUrl, Telemetry.TelemetryEventData.fromProperty(ACCOUNT_HOME_PAGE_AREA, "ResourceUsage", "Action", "LearnMore"), "resource-usage-learnmore" );

        var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, {
            center: true,
            imageClass: "big-status-progress",
            message: PresentationResources.Loading,
            throttleMinTime: 100,
        });

        statusIndicator.start();
        this._accountService.beginGetResourceUsage((result: IResourceUsageResult) => {
            statusIndicator.dispose();
            statusIndicator = null;
            this._renderControl(result);
        },
        () => {
            statusIndicator.dispose();
            statusIndicator = null;
            this._grid.removeContainer(this._element);
        });
    }

    private _renderControl(result: IResourceUsageResult) {

        if (!result || !result.Resources || !$.isArray(result.Resources) || result.Resources.length == 0) {
            this._grid.removeContainer(this._element);
            return;
        }

        //Add Subtitle
        this.addHtmlListItem('<div class="grid-cell-resource-subtitle">' + result.StartDate + ' - ' + result.EndDate + '</div>');
        this._renderResourceItems(result.Resources);

        this._onRenderComplete();
    }

    private _renderResourceItems(resourceItems : IResourceItem[]) : void {
         $.each(resourceItems, (i, resourceItem: IResourceItem) => {
            var item = [];
            item.push('<div class="grid-cell-item-resource-title">');
            item.push(resourceItem.Title);
            item.push('</div><div class="grid-cell-item-resource-usage">');            
            item.push('<span>')
            if(resourceItem.IsBlocked) {
                item.push('<span class="grid-cell-item-resource-blocked icon-tfs-tcm-blocked-small" title="');
                item.push(resourceItem.BlockedReason);
                item.push('"></span>');
            }

            item.push(resourceItem.CurrentQuantity);
             // Display the maximum quantity based on whether the billing is paid or not.
             // 1: If billing is Paid (pay as go): Then display the format as (current quantity ) of (max quantity)
             // 1.1: If max is zero, then do not display the max.
             // 2: If billing is not Paid: Then use Included quantity. The format will be (current quantity ) of (included quantity)
             if (resourceItem.IsPaid) {
                var maxQuantity = resourceItem.MaximumQuantity;
                if (maxQuantity != "0") {
                    item.push(' ');
                    item.push(PresentationResources.ResourceUsageSeperator);
                    item.push(' ');
                    item.push(resourceItem.MaximumQuantity);
                }
            }
            else {
                item.push(' ');
                item.push(PresentationResources.ResourceUsageSeperator);
                item.push(' ');
                item.push(resourceItem.IncludedQuantity);
            }
            item.push('</span><span class="grid-cell-item-resource-unit">');
            item.push(resourceItem.Unit);
            item.push('</span></div>');

            this.addHtmlListItem(item.join(""));
        });
    }

    private _onRenderComplete(): void {
        this._adjustHeight();
    }

    private _adjustHeight() {
        if (this._options.adjustHeight) {
            this._grid.adjustHeight(this._element);
        }
    }
}


export class AccountService extends Service.VssService {

    public beginGetTeamProjectMruList(maxCount: number, callback: (result: IMruProject[]) => void , errorCallback?: IErrorCallback) {
        var url = tfsContext.getActionUrl("GetTeamProjectMruList", "common", { area: "api" });
        Ajax.getMSJSON(
            url,
            { maxCount: maxCount },
            result => callback(result.entries),
            errorCallback);
    }

    public beginGetNews(maxCount: number, callback: (result: INewsResult) => void , errorCallback?: IErrorCallback) {
        var url = tfsContext.getActionUrl("GetNews", "common", { area: "api" });
        Ajax.getMSJSON(
            url,
            { maxCount: maxCount },
            result => callback(result),
            errorCallback);
    }

    public beginGetResourceUsage(callback: (result: IResourceUsageResult) => void , errorCallback?: IErrorCallback) {
        var url = tfsContext.getActionUrl("GetResourceUsage", "common", { area: "api" });
        Ajax.getMSJSON(
            url,
            null,
            result => callback(result),
            errorCallback);
    }

    public beginGetCollectionData(callback: (result: ICollectionStatus) => void, errorCallback?: IErrorCallback) {
        var url = tfsContext.getActionUrl("GetCollectionData", "home");
        Ajax.getMSJSON(
            url,
            null,
            result => callback(result),
            errorCallback);
    }
}

Diag.logTracePoint("AccountHomePage.PageLoad.Complete");

VSS.classExtend(AccountHomeView, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(AccountHomeView, "div.account-home-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Host.UI.AccountHomeView", exports);
