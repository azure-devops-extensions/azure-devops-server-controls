/// <reference types="jquery" />



import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import AccountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import NewProject = require("Presentation/Scripts/TFS/TFS.UI.Controls.NewProject");
import FeatureAvailabilityServices = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

interface INewProjectControlSettings {
    adjustHeight: boolean;
    showVisibilityOptions: boolean;
    progressIndicatarId: string;
    doNotWaitForCompletion: boolean;
    renderFluid: boolean;
    versionControlGitFirst: boolean;
    returnUrl: string;
    cancelUrl: string;
    cancelText: string;
    scenario: string;
    showCreateReadMe: boolean;
}

class CreateProjectView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.CreateProjectView";
    private _newProjectContainerId: string = "#new-project-container";
    private _progressIndicationId: string = "#create-project-progress";
    private _newProjectContainer: JQuery;
    private _newProjectControl: NewProject.NewProjectControl;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._newProjectContainer = $(this._newProjectContainerId);
        var pageContext = window["_pageContext"];
        var nextUrl = pageContext ? pageContext.nextUrl : "";
        var doNotWaitForCompletion = nextUrl ? true : false;
        var settings = <INewProjectControlSettings>{};
        settings.adjustHeight = false;
        settings.showVisibilityOptions = false;
        settings.progressIndicatarId = this._progressIndicationId;
        settings.returnUrl = nextUrl;
        settings.renderFluid = true;
        settings.versionControlGitFirst = false;
        settings.cancelUrl = nextUrl;
        settings.cancelText = AccountResources.CreateProjectCancelLink;
        settings.doNotWaitForCompletion = nextUrl ? true : false;
        settings.scenario = pageContext ? pageContext.scenario : "";
        settings.showCreateReadMe = FeatureAvailabilityServices.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.VersionControlAllowCreateReadMe);

        this._newProjectControl = <NewProject.NewProjectControl>Controls.BaseControl.createIn(NewProject.NewProjectControl, this._newProjectContainer, settings);
        if (!nextUrl) {
            $(".project-info-contanier").show();
        }
    }    
}

VSS.initClassPrototype(CreateProjectView, {
});

Controls.Enhancement.registerEnhancement(CreateProjectView, ".create-project-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.CreateProject", exports);
