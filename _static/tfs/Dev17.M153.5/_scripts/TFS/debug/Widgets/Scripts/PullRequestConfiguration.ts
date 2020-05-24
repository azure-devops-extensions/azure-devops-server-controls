import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import GitRestClient = require("TFS/VersionControl/GitRestClient");
import Manager = require("Widgets/Scripts/PullRequest");
import Resources = require("Widgets/Scripts/Resources/Tfs.Resources.Widgets");
import SDK = require("VSS/SDK/Shim");
import TfvcRestClient = require("TFS/VersionControl/TfvcRestClient");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCGitRepositorySelectorMenu = require("VersionControl/Scripts/Controls/GitRepositorySelectorMenu");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import WidgetTelemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Q = require("q");
import VSS_Service = require("VSS/Service");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";
var delegate = Utils_Core.delegate;

export module CssClasses {
    export var PULL_REQUEST_CONFIG_CONTAINER = "pull-request-config-container";
    export var REPO_SELECTOR_CONTAINER = "pull-request-config-selector-container";
    export var VIEW_PICKER_CONTAINER = "pull-request-config-view-picker-container";
}

export interface IPullRequestWidgetSettings extends WidgetLiveTitle.ITrackName {
    repo: VCContracts.GitRepository;
    queryType: Manager.QueryType;
}

export class PullRequestConfigurationView
    extends Base.BaseWidgetConfiguration<Dashboards_UIContracts.WidgetConfigurationOptions>
    implements Dashboards_WidgetContracts.IWidgetConfiguration {
    public static PullRequestConfigEnhancementName: string = "Microsoft.VisualStudioOnline.MyWork.PullRequestRFConfiguration";

    private static ViewPickerModel: { displayName: string, queryType: Manager.QueryType }[] = [
        { displayName: VCResources.PullRequest_Filter_AssignedToTeam, queryType: Manager.QueryType.AssignedToTeam },
        { displayName: VCResources.PullRequest_Filter_AssignedToMe, queryType: Manager.QueryType.AssignedToMe },
        { displayName: VCResources.PullRequest_Filter_CreatedByMe, queryType: Manager.QueryType.CreatedByMe }
    ];

    private static InitialRepoSelectionTimeoutMsec: number = 1000;

    private _liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private _repoSelector: PullRequestGitRepositorySelectorMenu;
    private _viewPicker: Combos.Combo;
	private _repoSelectorContainer: JQuery;
    private _repoSelectorSection: SettingsField<Controls.Control<any>>;
    private _viewPickerContainer: JQuery;
    private _viewPickerSection: SettingsField<Controls.Control<any>>;
    private _widgetSettings: IPullRequestWidgetSettings;
    private _projectInfo: VCContracts.VersionControlProjectInfo;
    private _hostTfsContext: TFS_Host_TfsContext.TfsContext;
    
    private newWidgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext;

    constructor(options: any) {
        if (options == null) {
            throw new Error("Options must be defined.");
        }
        super(options);
    }

    public __test() {
        return {
            repoSelector: this._repoSelector,
            viewPicker: this._viewPicker
        };
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "pull-request-config-container"
        }, options));
    }

    public load(
        widgetSettings: Dashboards_WidgetContracts.WidgetSettings,
        widgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext):
        IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this.newWidgetConfigurationContext = widgetConfigurationContext;

        this._hostTfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        this._widgetSettings = <IPullRequestWidgetSettings>JSON.parse(
            widgetSettings.customSettings.data) || { repo: null, queryType: null };

        this._liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(this._widgetSettings, Resources.PullRequestWidgetTitle);
        if (this._widgetSettings.repo && this._widgetSettings.repo.name) {
            var pullRequestWidgetTitle = this._getPullRequestWidgetTitle(this._widgetSettings.repo.name);
            this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, pullRequestWidgetTitle);
        }

        var tfvcRestClient = VSS_Service.getClient(TfvcRestClient.TfvcHttpClient2_2);
        var projInfoPromise = tfvcRestClient.getProjectInfo(this.tfsContext.project.id);
        return projInfoPromise.then((projInfo: VCContracts.VersionControlProjectInfo) => {
            this._projectInfo = projInfo;
            this._createControls();
            return WidgetHelpers.WidgetStatusHelper.Success();
        }, (e) => {
            return WidgetHelpers.WidgetStatusHelper.Failure(e);
        });
    }

    public _getCustomSettings(): Dashboards_WidgetContracts.CustomSettings {
        return { data: this._getWidgetSettingsAsString() };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<Dashboards_WidgetContracts.SaveStatus> {
        this._setupValidateState();

        if (this._isValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {
        // Publish
        WidgetTelemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId());
    }

    private _createControls() {
        this._repoSelectorContainer = $("<div>").addClass(CssClasses.REPO_SELECTOR_CONTAINER);
        this._repoSelectorSection = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.PullRequestWidgetConfigurationRepoSectionHeader,
            initialErrorMessage: Resources.PullRequestWidgetConfigurationNoRepoSelected,
        }, this._repoSelectorContainer);

        this._repoSelector = <PullRequestGitRepositorySelectorMenu>Controls.BaseControl.createIn<PullRequestGitRepositorySelectorMenuOptions>(
            PullRequestGitRepositorySelectorMenu,
            this._repoSelectorContainer,
            {
                tfsContext: this._hostTfsContext,
                projectId: this.tfsContext.project.id,
                projectInfo: this._projectInfo,
                showRepositoryActions: false,
                onItemChanged: delegate(this, this._onRepoChanged),
                showItemIcons: true,
                initialRepository: this._widgetSettings.repo,
                onInitialSelectedItem: delegate(this, this._onInitialRepoSelected)
            } as VCPathSelectorControl.GitRepositorySelectorMenuOptions);
        this.getElement().append(this._repoSelectorSection.getElement());

        this._viewPickerContainer = $('<div>').addClass(CssClasses.VIEW_PICKER_CONTAINER);
        this._viewPickerSection = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.PullRequestWidgetConfigurationViewSectionHeader,
            initialErrorMessage: Resources.PullRequestWidgetConfigurationNoViewSelected,
        }, this._viewPickerContainer);

        var viewPickerOptions: Combos.IComboOptions = {
            allowEdit: false,
            source: $.map(PullRequestConfigurationView.ViewPickerModel, (val, index) => val.displayName),
            indexChanged: delegate(this, this._onPullRequestViewSelectionChanged)
        };

        this._viewPicker = <Combos.Combo>Controls.BaseControl.createIn<Combos.IComboOptions>(Combos.Combo, this._viewPickerContainer, viewPickerOptions);

        if (this._widgetSettings.queryType) {
            var selectedIndex = $.inArray(this._widgetSettings.queryType, $.map(PullRequestConfigurationView.ViewPickerModel, (val, index) => val.queryType));
            this._viewPicker.setSelectedIndex(selectedIndex, false);
        }
        else {
            this._viewPicker.setSelectedIndex(0, false);
            this._widgetSettings.queryType = PullRequestConfigurationView.ViewPickerModel[0].queryType;
        }

        this.getElement().append(this._viewPickerSection.getElement());
    }

    private _onPullRequestViewSelectionChanged(selectedIndex: number) {
        var queryType = PullRequestConfigurationView.ViewPickerModel[selectedIndex].queryType;

        this._widgetSettings.queryType = queryType;
        this._viewPickerSection.toggleError(!this._isViewValid());
        var telemetryProperties: { [key: string]: string } = { "queryType": PullRequestConfigurationView.ViewPickerModel[selectedIndex].displayName };
        WidgetTelemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), telemetryProperties);

        this._notifyConfigurationChange();
    }

    private _onInitialRepoSelected(selectedRepo: VCContracts.GitRepository): void {
        setTimeout(() => this._onRepoChanged(selectedRepo), PullRequestConfigurationView.InitialRepoSelectionTimeoutMsec);
    }

    private _onRepoChanged(selectedRepo: VCContracts.GitRepository): void {

        this._widgetSettings.repo = selectedRepo;
        this._repoSelectorSection.toggleError(!this._isRepoValid());
        var pullRequestWidgetTitle = this._getPullRequestWidgetTitle(selectedRepo.name);
        this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, pullRequestWidgetTitle);
        if (selectedRepo && selectedRepo.name) {
            var telemetryProperties: { [key: string]: string } = { "repoName": selectedRepo.name };
            WidgetTelemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), telemetryProperties);
        }

        this._notifyConfigurationChange();
    }

    private _notifyConfigurationChange(): void {
        this._setupValidateState();
        if (this._isValid()) {
            this._liveTitleState.appendToSettings(this._widgetSettings);
            this.newWidgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }

    private _setupValidateState(): void {
        this._repoSelectorSection.toggleError(!this._isRepoValid());
        this._viewPickerSection.toggleError(!this._isRepoValid());
    }

    private _isValid(): boolean {
        return this._isRepoValid() && this._isViewValid();
    }

    private _isRepoValid(): boolean {
        return !!this._widgetSettings.repo && !!this._widgetSettings.repo.id;
    }

    private _isViewValid(): boolean {
        return !!this._widgetSettings.queryType;
    }
    
    private _getWidgetSettingsAsString(): string {
        return JSON.stringify(this._widgetSettings);
    }
    
    private _getPullRequestWidgetTitle(repoName: string): string{
        return Utils_String.format(Resources.PullRequestWidgetTitleFormat, repoName);
    }
}

SDK.VSS.register(PullRequestConfigurationView.PullRequestConfigEnhancementName, () => PullRequestConfigurationView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.PullRequestConfiguration.Initialize", (context) => {
    return Controls.create(PullRequestConfigurationView, context.$container, context.options);
});

export interface PullRequestGitRepositorySelectorMenuOptions extends VCPathSelectorControl.GitRepositorySelectorMenuOptions{
    initialRepository?: VCContracts.GitRepository;
}

export class PullRequestGitRepositorySelectorMenu extends VCPathSelectorControl.GitRepositoryBasedSelectorMenu {
    public initialize() {
        super.initialize();
    }

    public initializeOptions(options?: PullRequestGitRepositorySelectorMenuOptions) {
        super.initializeOptions(options);
    }

    protected initializeSelectedRepository() {
        if (this._options.initialRepository) {
            this.setSelectedRepository(this._options.initialRepository);
        }
        else {
            super.initializeSelectedRepository();
        }
    }
}