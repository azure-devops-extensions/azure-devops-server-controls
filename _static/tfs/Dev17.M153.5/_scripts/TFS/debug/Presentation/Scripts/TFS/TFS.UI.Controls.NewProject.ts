/// <reference types="jquery" />



import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Menus = require("VSS/Controls/Menus");
import TFSHOSTUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import UICommonControls = require("Presentation/Scripts/TFS/TFS.Host.UI.Controls");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Context = require("VSS/Context");
import Locations = require("VSS/Locations");

export interface VersionControlSystem {
    id: string;
    name: string;
    description: string;
    icon: string;
    isDefault: boolean;
    isDisabled: boolean;
}

interface AdminDropDownOption {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
}

export class NewProjectControl extends Controls.BaseControl {
    public static LEARN_CREATE_PROJECT_LINK = "https://go.microsoft.com/fwlink/?LinkId=324077";
    public static LEARN_PROCESS_TEMPLATES_LINK = "https://go.microsoft.com/fwlink/?LinkId=324035";
    public static LEARN_VC_LINK = "https://go.microsoft.com/fwlink/?LinkId=324037";
    private static GIT_ID = "git";
    private static TFVC_ID = "TfVc";

    public static enhancementTypeName: string = "tfs.NewProjectControl";
    private _grid: TFS_UI_Controls_Common.ResponsiveGrid;
    private _versionControlSystems: VersionControlSystem[];
    private _createProjectValidationError: Notifications.MessageAreaControl;
    private _projectNameValidationError: Notifications.MessageAreaControl;
    private _processTemplates: any;
    private _processTemplatesCombo: any;
    private _selectedProcessTemplate: any;
    private _selectedVersionControlSystem: VersionControlSystem;
    private _projectCreationJobId: string;
    private _projectName: string;
    private _projectDescription: string;
    private _$createProjectProgress: JQuery;
    private _createReadMe: boolean;
    private _$createButton: JQuery;
    private _$projectNameInput: JQuery;
    private _$projectDescriptionInput: JQuery;
    private _$processTemplatesElem: JQuery;
    private _$versionControlElem: JQuery;
    private _$createReadMeContainer: JQuery;
    private _$createReadMeInput: JQuery;
    private _$errorContainer: JQuery;
    private _$successContainer: JQuery;
    private _$progressDisplay: JQuery;
    private _$formContainer: JQuery;
    private _saveButtonDisabled: boolean;
    private _$errorBox: JQuery;
    private _$formErrorContainer: JQuery;
    private _serviceHost: TFS_Host_TfsContext.IServiceHost;
    private _selectedProjectVisibilityOption: AdminDropDownOption;
    private _projectVisibilityOptions: AdminDropDownOption[];
    private _tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    private _hideErrorContent: boolean;

    constructor(options?) {
        super(options);
        this._hideErrorContent = options && options.returnUrl ? true : false;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "account-home-view-new-project-panel"
        }, options));

    }

    public initialize(): void {
        super.initialize();
        this._grid = TFS_UI_Controls_Common.ResponsiveGrid.GetInstance();

        this.render();

        this._$projectNameInput.focus();
    }

    public render(): void {
        var table, tr1, td1, td2, tr2, td3, td4, tr3, td5, td6, tr4, td7, td8, tr5, td9, td10;

        if (this._$formContainer) {
            this._$formContainer.remove();
        }

        this._$formContainer = $("<div>").addClass("create-project-container").appendTo(this._element);
        this._createProjectValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._$formContainer, { closeable: false });
        this._createProjectValidationError._bind(Notifications.MessageAreaControl.ERROR_DETAILS_TOGGLED, (e) => {
            this._adjustHeight();
        });

        var $header = $("<div>").addClass("project-header").text(TFS_Resources_Presentation.CreateFirstProject).appendTo(this._$formContainer);
        var $textContainer = $("<div>").addClass("project-text").appendTo(this._$formContainer);
        var learnMoreLink = $("<a>").addClass("learn-more-link").text(TFS_Resources_Presentation.LearnMore).attr("href", NewProjectControl.LEARN_CREATE_PROJECT_LINK).attr("target", "_blank");
        var accountUrl = this._tfsContext.navigation.publicAccessPoint.uri;

        $textContainer.append($("<div>").addClass("create-project-welcome").html(Utils_String.format(TFS_Resources_Presentation.CreateFirstProjectWelcomeText, accountUrl)).append(learnMoreLink));

        if (this._options.renderFluid) {
            this._renderFluidLayout(this._$formContainer);
        }
        else {
            this._renderTableLayout(this._$formContainer);
        }

        var buttonContainer = this._$formContainer;
        if (this._options.cancelUrl) {
            buttonContainer = $("<div>").addClass("create-project-buttons").appendTo(this._$formContainer);
            $("<a>").attr("href", this._options.cancelUrl).text(this._options.cancelText).addClass("create-project-cancel-link").appendTo(buttonContainer);
        }

        this._$createButton = $("<span>").attr("title", PresentationResources.CreateProject)
            .text(PresentationResources.CreateProject)
            .addClass("create-project button")
            .appendTo(buttonContainer)
            .attr("tabindex", "0")
            .attr("id", "create-project-button")
            .click(() => this._onCreateClick())
            .keypress((event) => {
                if (event.keyCode == 13) {
                    this._$createButton.trigger('click');
                }
            });



        this._$projectNameInput.keypress((event) => {
            if (event.keyCode == 13) {
                this._$createButton.trigger('click');
            }
        });

        if (this._options.progressIndicatarId) {
            this._$progressDisplay = $(this._options.progressIndicatarId).hide();
        }
        else {
            this._$progressDisplay = $("<div>").addClass("project-create-progress").appendTo(this._$formContainer).hide();
        }

        $("<div>").addClass("clearfix").appendTo(this._$formContainer);

        this._onRenderComplete();
    }

    private _renderTableLayout(container: JQuery) {

        var table, tr1, td1, td2, tr2, td3, td4, tr3, td5, td6, tr4, td7, td8, tr5, td9, td10;

        table = $('<table>').addClass('create-project-form').appendTo(container);

        tr1 = $('<tr>').attr('valign', 'top').appendTo(table);
        td1 = $('<td>').appendTo(tr1);
        $('<label>').attr('for', 'project-name').text(PresentationResources.CreateProjectNameLabel + ":").appendTo(td1);
        $("<span>").text("*").addClass("required-field").appendTo(td1);
        td2 = $('<td>').appendTo(tr1).addClass("project-name-container");
        this._$projectNameInput = $('<input type="text">').addClass('requiredInfoLight').addClass('textbox').attr('id', 'create-project-name').appendTo(td2);
        this._projectNameValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, td2, { closeable: false, showIcon: true, type: Notifications.MessageAreaType.Warning });
        this._projectNameValidationError._bind(Notifications.MessageAreaControl.ERROR_DETAILS_TOGGLED, (e) => {
            this._adjustHeight();
        });

        tr2 = $('<tr>').addClass('create-project-description-container').attr('valign', 'top').appendTo(table);
        td3 = $('<td>').appendTo(tr2);
        $('<label>').attr('for', 'project-description').text(PresentationResources.CreateProjectDescriptionLabel + ":").appendTo(td3);
        td4 = $('<td>').appendTo(tr2);
        this._$projectDescriptionInput = $('<textarea>').addClass('requiredInfoLight').addClass('textbox').attr('id', 'create-project-description').appendTo(td4);

        tr3 = $('<tr>').attr('valign', 'top').appendTo(table);
        td5 = $('<td>').appendTo(tr3);
        $('<label>').attr('for', 'project-version-control').text(PresentationResources.SourceControlSystemLabel + ":").appendTo(td5);
        $("<span>").text("*").addClass("required-field").appendTo(td5);
        $("<a>").addClass("learn-more-link").attr("href", NewProjectControl.LEARN_VC_LINK).text(TFS_Resources_Presentation.LearnMore).appendTo(td5).attr("target", "_blank");
        td6 = $('<td>').appendTo(tr3);

        tr4 = $('<tr>').attr('valign', 'top').appendTo(table);
        td7 = $('<td>').appendTo(tr4);
        $('<label>').text(PresentationResources.CreateProjectProcessTemplateLabel + ":").appendTo(td7);
        $("<a>").addClass("learn-more-link").attr("href", NewProjectControl.LEARN_PROCESS_TEMPLATES_LINK).text(TFS_Resources_Presentation.LearnMore).appendTo(td7).attr("target", "_blank");
        td8 = $('<td>').appendTo(tr4);

        if (this._options.showVisibilityOptions) {
            tr5 = $('<tr>').attr('valign', 'top').appendTo(table);
            td9 = $('<td>').appendTo(tr5);
            $('<label>').text(PresentationResources.ProjectVisibilityLabel + ":").appendTo(td9);
            $('<div>').addClass("project-visibility-spacer").appendTo(td9);
            td10 = $('<td>').appendTo(tr5);
            this._populateProjectVisibility(td10);
        }

        this._$processTemplatesElem = $('<div>').appendTo(td8);

        this._populateVersionControlSystems(td6);
        this._populateProcessTemplates();
    }

    private _renderFluidLayout(container: JQuery) {

        var topContainer = $('<div>').addClass('create-project-form').appendTo(container);
        this._$formErrorContainer = $('<div>').addClass("create-project-error-container").appendTo(topContainer);;

        var nameContainer = $('<div>').addClass("create-project-name-container").appendTo(topContainer);
        var nameLabelContainer = $('<div>').addClass("label-container").appendTo(nameContainer);
        $('<label>').attr('for', 'project-name').text(PresentationResources.CreateProjectNameLabel + ":").appendTo(nameLabelContainer);
        $("<span>").text(" *").addClass("required-field").appendTo(nameLabelContainer);
        var nameInputContainer = $('<div>').addClass("input-container").appendTo(nameContainer);
        this._projectNameValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, nameInputContainer, { closeable: false, showIcon: false, type: Notifications.MessageAreaType.Warning });
        this._projectNameValidationError._bind(Notifications.MessageAreaControl.ERROR_DETAILS_TOGGLED, (e) => {
            this._adjustHeight();
        });
        this._$projectNameInput = $('<input type="text">').addClass('requiredInfoLight').addClass('textbox').attr('id', 'create-project-name').attr('placeholder', PresentationResources.CreateProjectNamePlaceholderText).appendTo(nameInputContainer);

        var descContainer = $('<div>').addClass('create-project-description-container').appendTo(topContainer);
        var descLabelContainer = $('<div>').appendTo(descContainer);
        $('<label>').attr('for', 'project-description').text(PresentationResources.CreateProjectDescriptionLabel + ":").appendTo(descLabelContainer);
        var descInputContainer = $('<div>').appendTo(descContainer);
        this._$projectDescriptionInput = $('<textarea>').addClass('requiredInfoLight').addClass('textbox').attr('id', 'create-project-description').appendTo(descInputContainer);

        var templateContainer = $('<div>').addClass("create-project-template-container").appendTo(topContainer);
        var templateLabelContainer = $('<div>').addClass("label-container").appendTo(templateContainer);
        $('<label>').text(PresentationResources.CreateProjectProcessTemplateLabel + ":").appendTo(templateLabelContainer);
        $("<span>").text(" *").addClass("required-field").appendTo(templateLabelContainer);
        var templateInputContainer = $('<div>').addClass("input-container").appendTo(templateContainer);

        var versionControlContainer = $('<div>').addClass("create-project-version-control-container").appendTo(topContainer);
        var versionLabelContainer = $('<div>').addClass("label-container").appendTo(versionControlContainer);
        $('<label>').attr('for', 'project-version-control').text(PresentationResources.SourceControlSystemLabel + ":").appendTo(versionLabelContainer);
        $("<span>").text(" *").addClass("required-field").appendTo(versionLabelContainer);
        var versionInputContainer = $('<div>').addClass("input-container").appendTo(versionControlContainer);

        this._$processTemplatesElem = $('<div>').appendTo(templateInputContainer);

        this._$createReadMeContainer = $('<div>').addClass("create-project-create-readme-container").appendTo(topContainer);
        this._$createReadMeInput = $('<input type="checkbox">').attr('id', 'create-readme').appendTo(this._$createReadMeContainer);
        $("<label>").attr('for', 'create-readme').text(PresentationResources.CreateReadMeWithProjectLabel).appendTo(this._$createReadMeContainer);

        this._$createReadMeContainer.hide();

        this._populateVersionControlSystems(versionInputContainer);
        this._populateProcessTemplates();
    }

    private _updateSaveButton(enable: boolean) {
        if (enable) {
            this._$createButton.attr("tabindex", "0");
            this._$createButton.removeClass("disabled");
            this._saveButtonDisabled = false;
        }
        else {
            this._$createButton.removeAttr("tabindex");
            this._$createButton.addClass("disabled");
            this._saveButtonDisabled = true;
        }
    }

    private _onCreateClick() {
        if (!this._saveButtonDisabled) {
            this._projectName = $.trim(this._$projectNameInput.val());
            this._projectDescription = this._$projectDescriptionInput.val();
            this._createReadMe = this._$createReadMeInput.prop('checked');

            if (this.validate()) {
                this._updateSaveButton(false);
                this._$progressDisplay.show();
                this._$formErrorContainer && this._$formErrorContainer.hide();
                this._tryCreateProject(false);
            }
        }
    }

    private _tryCreateProject(retry: boolean) {
        var url = this._tfsContext.getActionUrl('CreateProject', 'project', { area: 'api' });
        var projectData: any = {};

        projectData.VersionControlOption = this._selectedVersionControlSystem.id;
        projectData.ProjectVisibilityOption = this._selectedProjectVisibilityOption ? this._selectedProjectVisibilityOption.id : null;
        projectData.CreateReadMe = this._createReadMe;
        var data = {
            projectName: this._projectName,
            projectDescription: this._projectDescription,
            processTemplateTypeId: this._selectedProcessTemplate.TypeId,
            source: "HomePage",
            projectData: Utils_Core.stringifyMSJSON(projectData)
        };

        Ajax.postMSJSON(
            url,
            data,
            result => {
                this._clearProjectValidationError();
                this._trackProjectCreation(result);
            },
            error => {
                this._clearProjectValidationError();
                // if only the error is "project already exist, show the error in create form"

                if (error.type === "Microsoft.TeamFoundation.Core.WebApi.ProjectAlreadyExistsException" && !retry) {
                    this._$progressDisplay.hide();
                    this._updateSaveButton(true);
                    this._showProjectValidationError({
                        header: Utils_String.format(TFS_Resources_Presentation.ProjectNameInvalid, this._projectName),
                        content: this._hideErrorContent ? null : error.message
                    });
                }
                else {
                    if (this._hideErrorContent) {
                        this._onProjectCreationFailure();
                    } else {
                        this._$progressDisplay.hide();
                        this._updateSaveButton(true);
                        this._showProjectValidationError({
                            header: TFS_Resources_Presentation.ProjectCreationErrorGeneral,
                            content: error.message
                        });
                    }
                }
            });
    }

    private _showProjectValidationError(error: any) {
        this._projectNameValidationError.setError(error);
        this._$projectNameInput.addClass("validation-error");
        this._adjustHeight();
    }

    private _clearProjectValidationError() {
        this._projectNameValidationError.clear();
        this._$projectNameInput.removeClass("validation-error");
        this._adjustHeight();
    }

    /**
     * Get project redirection URL based on scenario
     */
    public static getProjectRedirectionUrl(
        webContext: Contracts_Platform.WebContext,
        projectName: string,
        scenario: string,
        sourceControlType: string,
        returnUrl: string = null,
        createReadme: boolean = false): string {

        switch (scenario) {
            case "agile":
                return Locations.urlHelper.getMvcUrl({
                    action: "board",
                    controller: "backlogs",
                    project: projectName,
                    webContext: webContext
                });
            case "test":
                return Locations.urlHelper.getMvcUrl({
                    action: "",
                    controller: "TestManagement",
                    project: projectName,
                    webContext: webContext
                });
            case "vc":
                if (sourceControlType.toLowerCase() === "git") {
                    return Locations.urlHelper.getMvcUrl({
                        action: "",
                        controller: "git",
                        project: projectName,
                        webContext: webContext
                    });
                } else if (sourceControlType.toLowerCase() === "tfvc") {
                    return Locations.urlHelper.getMvcUrl({
                        action: "",
                        controller: "versionControl",
                        project: projectName,
                        webContext: webContext
                    });
                }
                break;
            default:
                if (returnUrl) {
                    return returnUrl;
                } else if (sourceControlType.toLowerCase() === "git" && createReadme) {
                    return Locations.urlHelper.getMvcUrl({
                        action: "",
                        controller: "git",
                        project: projectName,
                        webContext: webContext
                    });
                }
        }

        var controller: string = "home";

        var queryParams: IDictionaryStringTo<string> = {
            welcome: "true"
        }
        var defaultMvcOptions: Locations.MvcRouteOptions = {
            action: "",
            controller: controller,
            webContext: webContext,
            project: projectName,
            queryParams: queryParams
        };

        return Locations.urlHelper.getMvcUrl(defaultMvcOptions);
    }

    private _onProjectCreationSuccess() {
        // convert this._serviceHost to WebContext
        var webContext: Contracts_Platform.WebContext = $.extend(true, {}, Context.getDefaultWebContext());
        if (this._serviceHost) {
            webContext.host.relativeUri = this._serviceHost.relVDir;
            webContext.host.hostType = Contracts_Platform.ContextHostType.ProjectCollection;
            webContext.host.uri = this._serviceHost.uri;
            webContext.host.name = this._serviceHost.name;
            webContext.collection = {
                id: this._serviceHost.instanceId,
                name: this._serviceHost.name,
                relativeUri: this._serviceHost.relVDir,
                uri: this._serviceHost.uri
            }
        }

        window.location.href = NewProjectControl.getProjectRedirectionUrl(
            webContext,
            this._projectName,
            this._options.scenario,
            this._selectedVersionControlSystem.id,
            this._options.returnUrl,
            this._createReadMe);
    }

    private _onProjectCreationFailure() {

        //If a return url is set exit immediately with out showing any error.
        if (this._options.returnUrl) {
            window.location.href = this._options.returnUrl;
            return;
        }

        this._$progressDisplay.hide();
        this._updateSaveButton(true);
        !this._$formErrorContainer && this._$formContainer.hide();

        if (!this._$formErrorContainer && this._$errorBox) {
            this._$errorBox.remove();
        }
        var tryAgain = "<a href='#' class='try-again'>" + TFS_Resources_Presentation.ProjectCreationErrorTryAgain + "</a>";
        var $backIcon = $("<span>").attr("tabindex", "0").addClass("back-icon")
            .click((e) => {
                this._$errorBox.remove();
                this._$formContainer.show();
            });

        if (this._$formErrorContainer) {
            this._$formErrorContainer.empty();
            this._$formErrorContainer.show();
            this._$errorBox = this._$formErrorContainer;
        }
        else {
            this._$errorBox = $("<div>").addClass("create-project-error-container").appendTo(this._element);
            var $header = $("<div>").addClass("project-header")
                .append($backIcon)
                .append($("<span>").text(TFS_Resources_Presentation.CreateFirstProject))
                .appendTo(this._$errorBox);
        }

        var $error = $("<div>").addClass("create-project-error-text")
            .append($("<span>").addClass("icon icon-tfs-build-status-failed"))
            .append($("<span>").html(Utils_String.format(TFS_Resources_Presentation.ProjectCreationError, tryAgain)))
            .appendTo(this._$errorBox);

        $(".try-again", $error).click((e) => {
            e.preventDefault();
            $("<div>").addClass("project-create-progress").appendTo(this._$errorBox);
            this._tryCreateProject(true);
            return false;
        });
    }

    private _trackProjectCreation(result: any) {
        if (this._options.doNotWaitForCompletion) {
            this._onProjectCreationSuccess();
        }
        this._projectCreationJobId = result.JobId;
        this._serviceHost = result.CollectionHost;
        this._monitorJobProgress();
    }

    private _monitorJobProgress(): boolean {
        Ajax.getMSJSON(
            this._tfsContext.getActionUrl('MonitorJobProgress', 'job', { area: 'api' }),
            {
                jobId: this._projectCreationJobId
            },
            (data) => this._onStatusUpdate(data),
            (error) => this._onProjectCreationFailure());

        return false;
    }

    public _onStatusUpdate(data: { State: number; PercentComplete?: number; }) {
        switch (data.State) {
            case 0:
            case 1:
                this.delayExecute("monitorProgress", 5000, true, this._monitorJobProgress);
                break;

            case 2:     // Complete
                this._onProjectCreationSuccess();
                break;

            case 3:     // Error
                this._onProjectCreationFailure();
                break;

            default:
                break;
        }
    }

    private _processTemplateChanged(index) {
        this._selectedProcessTemplate = this._processTemplates[index];
    }

    private _populateProcessTemplates() {
        var i, defaultIndex = 0, processTemplate, processTemplateValues = [];

        if (this._processTemplates) {
            if (this._processTemplates.length < 1) {
                this._createProjectValidationError.setError(PresentationResources.CreateProjectNoTemplates);
                this._adjustHeight();
            }
            else {
                for (i = 0; i < this._processTemplates.length; i++) {
                    processTemplate = this._processTemplates[i];
                    if (processTemplate.IsDefault) {
                        defaultIndex = i;
                    }
                    processTemplateValues.push(processTemplate.Name);
                }

                this._processTemplatesCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._$processTemplatesElem, {
                    source: processTemplateValues,
                    allowEdit: false,
                    indexChanged: (index) => {
                        this._processTemplateChanged(index);
                        $(".icon.icon-info-white", this._$processTemplatesElem).attr("title", this._processTemplates[index].Description);
                    }
                });
                $("<span>").addClass("icon icon-info-white").attr("tabindex", "0").addClass("process-template-info").attr("title", this._processTemplates[defaultIndex].Description).appendTo(this._$processTemplatesElem);

                this._processTemplatesCombo.setSelectedIndex(defaultIndex);
                this._processTemplateChanged(defaultIndex);
            }
        }
        else {
            this._getProcessTemplates();
        }
    }

    private _getProcessTemplates() {
        Ajax.getMSJSON(
            this._tfsContext.getActionUrl('ProcessTemplates', 'project', { area: 'api' }),
            null,
            (data) => {
                // Make sure the dialog has not been disposed
                if (!this._disposed) {
                    this._processTemplates = data.Templates;
                    this._populateProcessTemplates();
                }
            },
            (error) => {
                this._updateSaveButton(false);
                this._createProjectValidationError.setError({
                    header: PresentationResources.GetProcessTemplatesError,
                    content: this._hideErrorContent ? null : error.message
                });
                this._adjustHeight();
            }
        );
    }

    private _populateVersionControlSystems($container: JQuery) {
        var vcSystemNames: string[] = [],
            defaultSystemIndex = 0;
        var isGitScenario = this._options.scenario === "git";
        var isTfsScenario = this._options.scenario === "tfvc";

        this._versionControlSystems = [
            {
                id: NewProjectControl.GIT_ID,
                name: PresentationResources.SourceControlSystemNameGit,
                description: PresentationResources.SourceControlSystemDescriptionGit,
                icon: "bowtie-git",
                //When it's not a Tfvc scenario then we always default to Git even if Tfvc Scenario is not passed
                isDefault: !isTfsScenario,
                isDisabled: isTfsScenario
            }, {
                id: NewProjectControl.TFVC_ID,
                name: PresentationResources.SourceControlSystemNameTFVC,
                description: PresentationResources.SourceControlSystemDescriptionTFVC,
                icon: "bowtie-tfvc-repo",
                isDefault: isTfsScenario,
                isDisabled: isGitScenario
            }];

        //Change the order of version control systems
        if (this._options.versionControlGitFirst && this._versionControlSystems.length == 2) {
            var git = this._versionControlSystems.pop();
            var tfs = this._versionControlSystems.pop();
            git.isDefault = true;
            tfs.isDefault = false;
            this._versionControlSystems.push(git);
            this._versionControlSystems.push(tfs);
        }

        $.each(this._versionControlSystems, (i, vcSystem) => {
            vcSystemNames.push(vcSystem.name);
            var vciContainer = $("<div>").addClass("vc-container").appendTo($container);
            var vci = $("<input type='radio'>").attr("name", "version-control").attr("id", vcSystem.id).appendTo(vciContainer).click(() => {
                this._versionControlSystemChanged(i);
            });
            $("<label>").attr("for", vcSystem.id).addClass("bowtie-icon").addClass(vcSystem.icon).appendTo(vciContainer);
            $("<label>").attr("for", vcSystem.id).text(vcSystem.name).addClass("vc").appendTo(vciContainer);
            $("<span>").addClass("icon icon-info-white").attr("title", vcSystem.description).appendTo(vciContainer);
            if (vcSystem.isDefault) {
                defaultSystemIndex = i;
                vci.prop("checked", true);
            }
            if (vcSystem.isDisabled) {
                vci.attr("disabled", "");
            }
        });

        if (defaultSystemIndex >= 0) {
            this._versionControlSystemChanged(defaultSystemIndex);
        }
    }

    private _versionControlSystemChanged(index: number) {
        this._selectedVersionControlSystem = this._versionControlSystems[index];

        if (this._options.showCreateReadMe && this._selectedVersionControlSystem.id === NewProjectControl.GIT_ID) {
            this._$createReadMeContainer.slideDown("fast", "swing");
        } else {
            this._$createReadMeContainer.slideUp("fast", "swing");
        }
    }

    private _populateProjectVisibility($container: JQuery) {

        var projectVisibilityNames: string[] = [],
            defaultVisibilityIndex = -1,
            $cell: JQuery;

        this._projectVisibilityOptions = [{
            id: TFS_Server_WebAccess_Constants.ProjectVisibilityConstants.EveryoneInTenant,
            name: PresentationResources.ProjectVisibilityNameEveryoneInMicrosoftTenant,
            description: PresentationResources.ProjectVisibilityDescriptionEveryoneInTenant,
            isDefault: true
        },
            {
                id: TFS_Server_WebAccess_Constants.ProjectVisibilityConstants.TeamMembers,
                name: PresentationResources.ProjectVisibilityNameTeamMembers,
                description: PresentationResources.ProjectVisibilityDescriptionTeamMembers,
                isDefault: false
            }];

        $.each(this._projectVisibilityOptions, (i, projectVisibility) => {
            projectVisibilityNames.push(projectVisibility.name);
            if ((defaultVisibilityIndex === -1 && projectVisibility.isDefault)) {
                defaultVisibilityIndex = i;
            }
        });

        this._selectedProjectVisibilityOption = this._projectVisibilityOptions[defaultVisibilityIndex];

        var $projectVisibilityElem = $('<div>').appendTo($container);
        var projectVisibilityCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $projectVisibilityElem, {
            source: projectVisibilityNames,
            allowEdit: false,
            indexChanged: (index) => {
                this._projectVisibilityChanged(index);
            }
        });

        if (defaultVisibilityIndex >= 0) {
            projectVisibilityCombo.setSelectedIndex(defaultVisibilityIndex, false);
            this._projectVisibilityChanged(defaultVisibilityIndex);
        }
    }

    private _projectVisibilityChanged(index: number) {
        this._selectedProjectVisibilityOption = this._projectVisibilityOptions[index];
    }

    public validate() {
        var projectName = this._$projectNameInput.val(),
            index, isValid = true,
            invalidProjectCharacters = [
                '@', '~', ';', '{', '}', '\'',
                '+', '=', ',', '<', '>', '|',
                '/', '\\', '?', ':', '&', '$',
                '*', '\"', '#', '[', ']', '&',
                '%'];

        // Account names must be 1 or more characters and cant start with
        // . or _
        // These are requirements from CssUtil.IsValidProjectName()
        if (projectName === null ||
            projectName.length === 0 ||
            projectName.length > 64 ||
            projectName.substring(0, 1) === '_' ||
            projectName.substring(0, 1) === '.') {

            isValid = false;
            this._showProjectValidationError(TFS_Resources_Presentation.ProjectNameNotSpecified);
        }

        if (isValid) {
            // Check for invalid characters within the project name.
            for (index = 0; index < invalidProjectCharacters.length; index++) {
                if (projectName.indexOf(invalidProjectCharacters[index]) !== -1) {
                    isValid = false;
                    break;
                }
            }
        }

        if (isValid) {
            this._clearProjectValidationError();
        }
        else if (projectName.length > 0) {
            this._showProjectValidationError({
                header: Utils_String.format(TFS_Resources_Presentation.ProjectNameInvalid, projectName),
                content: this._hideErrorContent ? null : $("<div>").html(PresentationResources.CreateProjectProjectNameInvalidDescription)
            });
        }

        isValid = isValid && this._selectedProcessTemplate !== null && this._selectedVersionControlSystem !== null;

        return isValid;
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
