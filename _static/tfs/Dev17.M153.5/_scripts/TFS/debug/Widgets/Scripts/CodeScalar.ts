import Q = require("q");

import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import Ajax = require("VSS/Ajax");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import Base = require("Widgets/Scripts/BaseScalarWidget");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import TFS_Widgets_CountControl = require("Widgets/Scripts/Shared/CountWidgetControl");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

export interface ICodeScalarWidgetSettings extends WidgetLiveTitle.ITrackName {
    path: string;
    repositoryId: string;
    version: string;
}

interface IPathTileData {
    displayName: string;
    tooltip: string;
    changesetCount: number;
    repositoryName?: string;
}

/**
 * Displays count of recent changes/commits for a TFVC or GIT path
 */
export class CodeScalar extends Base.BaseScalarWidget
    implements Dashboards_WidgetContracts.IConfigurableWidget {
    public static CodeWidgetContentController = "versionControl";
    public static CodeWidgetContentAction = "pathTileWidget";

    public static GitCodeWidgetClickingController = "git";
    public static GitCodeWidgetClickingHashLink = "#_a=history&path={0}&version={1}";

    public static TFVCCodeWidgetClickingController = "versioncontrol";
    public static TFVCCodeWidgetClickingHashLink = "#_a=history&path={0}";

    public static PerformanceSplitAjaxStarted = "CodeScalarAjaxStarted";
    public static PerformanceSplitAjaxEnded = "CodeScalarAjaxEnded";

    // dom constants. 
    public static DomCoreCssClass: string = "codescalar-container";

    private _repoName: string;
    private _selectedRepoType: RepositoryType;
    private _tooltip: string;
    private _widgetSettings: ICodeScalarWidgetSettings;

    constructor(options: Dashboard_Shared_Contracts.WidgetOptions) {
        super(options);
    }

    /**
    * This tells the framework to show the stakeholder view if the current user is a stakeholder 
    */
    public disableWidgetForStakeholders(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<boolean> {
        return Q(true);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: CodeScalar.DomCoreCssClass
        }, options));
    }

    /**
     * Get the url to be used into the creation of the container
     * @param {string} projectPath is the URL to the project     
     * @return {string} A full absolute url
     */
    public getUrlForClickingAction(): string {

        var hashLink = "";
        var action = "";
        var controller = "";

        if (this._selectedRepoType === RepositoryType.Git) {
            hashLink = Utils_String.format(
                CodeScalar.GitCodeWidgetClickingHashLink,
                encodeURIComponent(this._widgetSettings.path),
                this._widgetSettings.version);

            controller = CodeScalar.GitCodeWidgetClickingController;

            action = this._repoName;

        } else {
            hashLink = Utils_String.format(
                CodeScalar.TFVCCodeWidgetClickingHashLink,
                encodeURIComponent(this._widgetSettings.path));

            controller = CodeScalar.TFVCCodeWidgetClickingController;

            action = "";
        }

        var tfscontext = TFS_Host_TfsContext.TfsContext.getDefault();
        var projectPath = tfscontext.getActionUrl(action, controller, {});

        // Append # parameters to the end of URL, this doesn't break server-side logic and is client-side only
        return projectPath + hashLink;
    }

    /**
     * Parse the settings as Json and return object that is of type ICodeScalarWidgetSettings.     
     */
    public parseSettings(): ICodeScalarWidgetSettings {

        var settingsAsJson: ICodeScalarWidgetSettings;
        try {
            settingsAsJson = JSON.parse(this.settings);
        }
        catch (e) {
            // suppress exception.
        }

        // If no path, then settings is invalid
        if (!settingsAsJson.path) {
            settingsAsJson = null;
        }
        return settingsAsJson;
    }

    /** Overrides default behavior, by allowing use of the *current* Query name in place of the name last saved to the widget 
     *  The widgetLiveTitle service only applies this, if the user has not customized the name.
     */
    public getWidgetName(): string {
        //at a minimum, use Widgetname, but defer to live title if 
        // we can get a recommendation of the current artifact, and user hasn't custom-named the widget
        var widgetName = super.getWidgetName();

        /*
        //Note: This only TFVC data is compatible right now. 
        // Requests for history on renamed paths fail to resolve for GIT.
        var parsedSettings = this.parseSettings();
        var currentArtifactname = parsedSettings.path;

        if (parsedSettings) {
            widgetName = WidgetLiveTitle.WidgetLiveTitleViewer.getLiveTitle(widgetName,
                parsedSettings,
                currentArtifactname);
        }*/
        return widgetName;
    }

    /**
    * Returns the url to be used when the user clicks on the widget
    */
    public getUrlForWidget(): string {
        return this.getUrlForClickingAction();
    }

    /**
     * Returns the Id of the hub targeted by the widget Url
     * Id will be and empty string if the repo in the config is external. 
     */
    public getUrlHubId(): string {
        let repositoryHubId = "";
        if (this._selectedRepoType === RepositoryType.Git) {
            repositoryHubId = CodeHubContributionIds.gitFilesHub;
        }
        else if (this._selectedRepoType === RepositoryType.Tfvc) {
            repositoryHubId = CodeHubContributionIds.tfvcFilesHub;
        }
        return repositoryHubId;
    }

    /**
     * For unit tests
     */
    public getWidgetSettings(): ICodeScalarWidgetSettings {
        return this._widgetSettings;
    }

    /**
    * Load widget.
    */
    public loadAndRender(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {

        this._widgetSettings = this.parseSettings();
        if (!this._widgetSettings) {
            return WidgetHelpers.WidgetStatusHelper.Failure(Resources.InvalidConfigurationReconfigure);
        }

        else {
            var data =
                {
                    "path": this._widgetSettings.path,
                    "version": this._widgetSettings.version,
                    "repositoryId": this._widgetSettings.repositoryId
                }

            var tfscontext = TFS_Host_TfsContext.TfsContext.getDefault();
            var url = tfscontext.getActionUrl(CodeScalar.CodeWidgetContentAction, CodeScalar.CodeWidgetContentController, {});
            return Ajax.issueRequest(url, {
                type: "get",
                data: data,
                timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs
            })
                .then((data: IPathTileData) => {
                    if (!this.isDisposed()) {
                        this.scalarResultCount = data.changesetCount;
                        this._tooltip = data.tooltip;
                        this._selectedRepoType = TFS_Widget_Utilities.VersionControlHelper.GetRepoType(this.getWidgetSettings().path);
                        if (data.repositoryName) {
                            this._repoName = data.repositoryName;
                        }
                        this.render();

                        TFS_Widget_Utilities.DashboardGridUIHelper.toggleDarkWidget(this.getElement(), true);
                    }
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }, (e) => {
                    return this._notifyLoadFailed(e);
                });
        }

    }

    public render(): void {
        // The methods loadAndRender and render need to be refactored to avoid having to check twice if we're unconfigured.
        // Since the config for this widget calls UpdateLiveTitle before NotifyConfigurationChange, UpdateLiveTitle causes
        // this widget to repaint itself by calling render rather than loadAndRender, and if we're configuring a previously
        // unconfigured widget, this means we would try to paint with bad data if we didn't also check here.
        if (!this.isUnconfigured(this.settings)) {
            super.render();
        }
    }

    public getCurrentOptions(): TFS_Widgets_CountControl.CountControlOptions {
        return {
            header: this.getWidgetName(),
            count: this.scalarResultCount,
            footer: this._selectedRepoType == RepositoryType.Git ? Resources.CodeScalar_FooterText_Commit_SevenDays : Resources.CodeScalar_FooterText_ChangeSet_SevenDays
        };
    }

    /**
    * Calls notifyLoadFailed from widgetcontext and updates the css for error widget
    */
    private _notifyLoadFailed(error: any): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {
        var errorContent: string = TFS_Widget_Utilities.ErrorParser.stringifyError(error);
        TFS_Widget_Utilities.DashboardGridUIHelper.toggleDarkWidget(this.getElement(), false);
        return WidgetHelpers.WidgetStatusHelper.Failure(errorContent);
    }

}
SDK.VSS.register("dashboards.codeScalar", () => CodeScalar);
SDK.registerContent("dashboards.codeScalar-init", (context) => {
    return Controls.create(CodeScalar, context.$container, context.options);
});
