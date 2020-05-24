import ko = require("knockout");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import PopupContent = require("VSS/Controls/PopupContent");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Dialogs = require("VSS/Controls/Dialogs");
import {BuildArtifact} from "Build.Common/Scripts/BuildArtifacts";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import {getStringRepoType} from "VersionControl/Scripts/Utils/Build";
import Git_Client = require("TFS/VersionControl/GitRestClient");
import VCContracts = require("TFS/VersionControl/Contracts");
import Build_Client = require("TFS/Build/RestClient");
import BuildContracts = require("TFS/Build/Contracts");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Artifacts_Constants = require("VSS/Artifacts/Constants");

let delegate = Utils_Core.delegate;
let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class StatusViewModel extends VCViewModel.VersionControlViewModel {
    public primaryText: KnockoutObservable<string>;
    public secondaryText: KnockoutObservable<string>;
    public iconCssClass: KnockoutObservable<string>;
    public link: KnockoutObservable<string>;
    public state: KnockoutObservable<VCContracts.GitStatusState>;
    public date: KnockoutObservable<Date>;
    private _status: VCContracts.GitStatus;

    public static _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    public static _ICON_CLASS_PENDING: string = "bowtie-status-waiting";
    public static _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    public static _ICON_CLASS_ERROR: string = "bowtie-status-error";

    public static _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    public static _TEXT_CLASS_PENDING: string = "vc-status-pending";
    public static _TEXT_CLASS_FAILURE: string = "vc-status-failure";
    public static _TEXT_CLASS_ERROR: string = "vc-status-error";

    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, options?) {
        super(repositoryContext, parent, options);

        this._status = options.status;
        this.primaryText = ko.observable(this._status.description);
        this.secondaryText = ko.observable(this._status.context.genre + "/" + this._status.context.name);
        this.link = ko.observable("");
        this.state = ko.observable(this._status.state);
        this.date = ko.observable(this._status.creationDate);
        this.iconCssClass = ko.observable("");
        this._computeBuildLink(this._status.targetUrl);
        this._computeIconCssClass(this._status.state);
    }

    private _computeIconCssClass(state: VCContracts.GitStatusState) {
        let statusCssClass = (state === VCContracts.GitStatusState.Error && StatusViewModel._TEXT_CLASS_ERROR) ||
            (state === VCContracts.GitStatusState.Failed && StatusViewModel._TEXT_CLASS_FAILURE) ||
            (state === VCContracts.GitStatusState.Pending && StatusViewModel._TEXT_CLASS_PENDING) ||
            StatusViewModel._TEXT_CLASS_SUCCESS;

        let statusIconCssClass = (state === VCContracts.GitStatusState.Error && StatusViewModel._ICON_CLASS_ERROR) ||
            (state === VCContracts.GitStatusState.Failed && StatusViewModel._ICON_CLASS_FAILURE) ||
            (state === VCContracts.GitStatusState.Pending && StatusViewModel._ICON_CLASS_PENDING) ||
            StatusViewModel._ICON_CLASS_SUCCESS;

        // add to the icon class to get the correct color (bowtie icons are all gray)
        this.iconCssClass([statusIconCssClass, statusCssClass].join(" "));
        return;
    }

    private _computeBuildLink(targetUrl: string) {
        if (this._isValidBuildArtifactUri(targetUrl)) {
            let artifactId = Artifacts_Services.LinkingUtilities.decodeUri(targetUrl);
            let artifact = new BuildArtifact(artifactId);
            this.link(artifact.getUrl(tfsContext.contextData));
        }
        else {
            //If targetUrl is not a type of build artifact Uri then we will keep it as it is to support other build systems.
            this.link(targetUrl);
        }

        return;
    }

    private _isValidBuildArtifactUri(artifactUri: string): boolean {
        let VSTFS: string = "VSTFS:///";
        let URISEPARATOR: string = "/";

        let tArtifactUri = artifactUri.trim();

        if (tArtifactUri.toUpperCase().slice(0, VSTFS.length) !== VSTFS) {
            return false;
        }

        tArtifactUri = tArtifactUri.substring(VSTFS.length, tArtifactUri.length);
        let tokens: string[] = tArtifactUri.split(URISEPARATOR, 3);

        if (tokens.length !== 3) {
            return false;
        }

        let tool: string = tokens[0].trim();
        if (tool.toUpperCase() !== Artifacts_Constants.ToolNames.TeamBuild.toUpperCase()) {
            return false;
        }

        let artifactType: string = tokens[1].trim();
        if (artifactType.toUpperCase() !== Artifacts_Constants.ArtifactTypeNames.Build.toUpperCase()) {
            return false;
        }

        let artifactMoniker: string = tokens[2].trim();
        if (!artifactMoniker) {
            return false;
        }
        return true;
    }
}

export class StatusListViewModel extends VCViewModel.VersionControlViewModel {
    private _buildClient: Build_Client.BuildHttpClient;
    private _gitClient: Git_Client.GitHttpClient;

    public repoContext: KnockoutObservable<RepositoryContext>;
    public commitId: KnockoutObservable<string>;
    public branchName: KnockoutObservable<string>;

    private _statuses: KnockoutObservableArray<StatusViewModel>;
    private _currentRepoContext: RepositoryContext;
    private _currentBranchName: string;
    private _currentVersionControlFullBranchName: KnockoutObservable<string>;
    public errorCount: KnockoutComputed<any>;
    public failureCount: KnockoutComputed<any>;
    public pendingCount: KnockoutComputed<any>;
    public successCount: KnockoutComputed<any>;

    private disposables: IDisposable[];
    private doesBuildDefExist: KnockoutObservable<boolean>;
    private doneLoadingStatuses: KnockoutObservable<boolean>;
    public buildBadgeImgUrl: KnockoutObservable<string>;
    public canShowMainText: KnockoutObservable<boolean>;

    public canShowLoading: KnockoutComputed<boolean>;
    public canShowUpsell: KnockoutComputed<boolean>;
    public statusUpdates: KnockoutComputed<boolean>;
    public statusMainText: KnockoutComputed<string>;
    public statusTooltipPrimaryText: KnockoutComputed<string>;
    public statusTooltipSecondaryText: KnockoutComputed<string>;
    public statusCssClass: KnockoutComputed<string>;
    public statusCssIconClass: KnockoutComputed<string>;
    
    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, options?) {
        super(repositoryContext, parent, options);
        let tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);

        this._gitClient = tfsConnection.getHttpClient(Git_Client.GitHttpClient);
        this._buildClient = tfsConnection.getHttpClient(Build_Client.BuildHttpClient);

        this.repoContext = ko.observable(null);
        this.branchName = ko.observable("");
        this.commitId = ko.observable("");
        this._statuses = ko.observableArray([]);
        this.doneLoadingStatuses = ko.observable(false);
        this.doesBuildDefExist = ko.observable(false);
        this.buildBadgeImgUrl = ko.observable("");
        this.errorCount = ko.computed(this._computeErrorCount, this);
        this.pendingCount = ko.computed(this._computePendingCount, this);
        this.successCount = ko.computed(this._computeSuccessCount, this);
        this.failureCount = ko.computed(this._computeFailureCount, this);
        this.canShowMainText = ko.observable(!options || !options.showIconOnly);
        this.canShowLoading = ko.computed(this._computeCanShowLoading, this);
        this.canShowUpsell = ko.computed(this._computeCanShowUpsell, this);
        this.statusCssClass = ko.computed(this._computeStatusCssClass, this);
        this.statusCssIconClass = ko.computed(this._computeStatusCssIconClass, this);
        this.statusMainText = ko.computed(this._computeStatusMainText, this);
        this.statusTooltipPrimaryText = ko.computed(this._computeStatusTooltipPrimaryText, this);
        this.statusTooltipSecondaryText = ko.computed(this._computeStatusTooltipSecondaryText, this);
        this._currentVersionControlFullBranchName = ko.observable("");

        this.disposables = [];

        this.disposables.push(ko.computed(() => {
            let repoContext = this.repoContext();
            let branchName = this.branchName();

            if (repoContext) {
                // since we update repository context every time the state is updated, we should make calls only when needed
                if (this._currentRepoContext &&
                    this._currentBranchName &&
                    this._currentRepoContext.getRepositoryId() === repoContext.getRepositoryId() &&
                    this._currentRepoContext.getRepositoryType() === repoContext.getRepositoryType() &&
                    this._currentBranchName === branchName) {
                    return;
                }

                this._currentRepoContext = repoContext;
                let fullBranchNameToGetStatus = "";
                if (repoContext.getRepositoryType() === RepositoryType.Git) {
                    this._currentBranchName = branchName;
                    fullBranchNameToGetStatus = branchName;
                    this._currentVersionControlFullBranchName(fullBranchNameToGetStatus);
                }
                else if (repoContext.getRepositoryType() === RepositoryType.Tfvc) {
                    // for tfs branchname is $/projectID for getDefinitions, but $/PROJECTNAME for getBuilds/getBadge, since we are using branchname to getBadge only using later
                    this._currentBranchName = tfsContext.navigation.project;
                    fullBranchNameToGetStatus = "$/" + tfsContext.navigation.project;
                    this._currentVersionControlFullBranchName(fullBranchNameToGetStatus);
                }

                //It means we are on commit details page and looking for commit status
                if (this.commitId() !== "") {
                    this._initCommitStatus(repoContext, this.commitId());
                }
                //It means we are in Explorer hub and looking for branch status
                else if (this._currentBranchName !== "") {
                    this._initBranchStatus(repoContext, fullBranchNameToGetStatus);
                }
            }
        }));
    }

    public dispose() {
        $.each(this.disposables, (index, disposable) => {
            disposable.dispose();
        });
    }

    private _clearStatuses() {
        this._statuses.removeAll();
    }

    private _initCommitStatus(repoContext: RepositoryContext, commitId: string) {
        this._clearStatuses();

        if (repoContext.getRepositoryType() !== RepositoryType.Tfvc) {
            this._gitClient.getStatuses(commitId, repoContext.getRepositoryId(), tfsContext.navigation.projectId)
                .then((statuses: VCContracts.GitStatus[]) => {
                    this._buildStatusesList(statuses);
                    this.doneLoadingStatuses(true);
                },
                (rejectReason) => {
                    this.doneLoadingStatuses(true);
                });
        }
        else {
            this.doneLoadingStatuses(true);
        }
    }

    private _initBranchStatus(repoContext: RepositoryContext, branchName: string) {
        this._clearStatuses();
        if (repoContext.getRepositoryType() !== RepositoryType.Tfvc) {

            this._gitClient.getRefs(repoContext.getRepositoryId(), tfsContext.navigation.projectId, branchName.replace("refs/", ""), false, true)
                .then((refs: VCContracts.GitRef[]) => {
                    if (refs && refs[0] && refs[0].statuses && refs[0].statuses.length > 0) {
                        let refStatuses: VCContracts.GitStatus[];
                        //Typically, it would be first ref that we need to build statuses for 
                        //unless something changes in getRef REST Client.
                        //Double checking the ref as a defensive approach to avoid a potential bug 
                        //if we get multiple refs and if getRefs Rest client no longer sorts refs by name.
                        for (let index in refs) {
                            if (refs[index].name === branchName) {
                                refStatuses = refs[index].statuses;
                            }
                        }
                        this._buildStatusesList(refStatuses);
                        this.doneLoadingStatuses(true);
                    }
                    else if (refs && refs[0]) {
                        this.doneLoadingStatuses(true);
                        this._computeBuildDefExistence(repoContext, branchName);
                    }
                    
                },
                (rejectReason) => {
                    this.doneLoadingStatuses(true);
                    this._computeBuildDefExistence(repoContext, branchName);
                });
        }
        else {
            this.doneLoadingStatuses(true);
            this._computeBuildDefExistence(repoContext, branchName);
        }
    }

    private _computeBuildDefExistence(repoContext: RepositoryContext, branchName: string) {
        // try to get the latest definition for given repository details
        let repoId = repoContext.getRepositoryId();
        let repoType = getStringRepoType(repoContext.getRepositoryType());

        let definitionsPromise = this._buildClient.getDefinitions(
            tfsContext.navigation.projectId, // project
            undefined,                       // name of definition
            repoId,                          // repositoryID
            repoType,                        // repositorytype
            BuildContracts.DefinitionQueryOrder.LastModifiedDescending, // to get latest first
            1);                              // top = 1

        // get the build definition for the current repo
        definitionsPromise.then((definitions) => {
            let buildBadgePromise = this._buildClient.getBuildBadge(
                tfsContext.navigation.projectId,
                repoType,
                repoId,
                branchName);
                
            // get the build badge for the current definition - gives us the upsell img src as well as the build id
            buildBadgePromise.then((badge: BuildContracts.BuildBadge) => {

                if (definitions && definitions[0] && badge.buildId) {
                    this.doesBuildDefExist(true);
                }
                else if (!definitions || !definitions[0]) {
                    this.buildBadgeImgUrl(badge.imageUrl);
                }
            });
        });
    }

    private isAnyStatus(): boolean {
        return (this._statuses && this._statuses().length > 0);
    }

    private _computeErrorCount() {
        let errorsCount = 0;
        // get a count of each commit status state category
        if (this.isAnyStatus()) {
            this._statuses().forEach((status) => {
                errorsCount += status.state() === VCContracts.GitStatusState.Error ? 1 : 0;
            });
        }
        return errorsCount;
    }

    private _computePendingCount() {
        let pendingsCount = 0;
        // get a count of each commit status state category
        if (this.isAnyStatus()) {
            this._statuses().forEach((status) => {
                pendingsCount += status.state() === VCContracts.GitStatusState.Pending ? 1 : 0;
            });
        }
        return pendingsCount;
    }

    private _computeFailureCount() {
        let failuresCount = 0;
        // get a count of each commit status state category
        if (this.isAnyStatus()) {
            this._statuses().forEach((status) => {
                failuresCount += status.state() === VCContracts.GitStatusState.Failed ? 1 : 0;
            });
        }
        return failuresCount;
    }

    private _computeSuccessCount() {
        let successesCount = 0;
        // get a count of each commit status state category
        if (this.isAnyStatus()) {
            this._statuses().forEach((status) => {
                successesCount += status.state() === VCContracts.GitStatusState.Succeeded ? 1 : 0; 
            });
        }
        return successesCount;
    }

    private _computeCanShowLoading(): boolean {
        // show the loading spinner if we're not done loading one of build defs or statuses
        if (this.commitId() !== "" && this.isAnyStatus()) {
            return !this.doneLoadingStatuses();
        }
        else if (this.branchName() !== "" && this.isAnyStatus() && this.doesBuildDefExist()) {
            return !this.doneLoadingStatuses();
        }
        else {
            return false;
        }
    }

    private _computeCanShowUpsell(): boolean {
        // show the upsell if there are no statuses currently stored and there are no build definitions created for the branch
        if (this.branchName() !== "") {
            return (!this.doesBuildDefExist() && !this.isAnyStatus() && this.doneLoadingStatuses() && (this.buildBadgeImgUrl() !== ""));
        }
        return false;
    }

    private _buildStatusesList(statuses: VCContracts.GitStatus[]) {
        if (statuses && statuses.length > 0) {

            let latestStatusesLookup = {};
            let statusesToDisplay: VCContracts.GitStatus[] = [];

            statuses.forEach((status) => {
                let statusType = this._getStatusType(status);

                let existingStatus = latestStatusesLookup[statusType];
                if (existingStatus) {
                    if (latestStatusesLookup[statusType].creationDate < status.creationDate) {
                        latestStatusesLookup[statusType] = status;
                    }
                }
                else {
                    latestStatusesLookup[statusType] = status;
                }
            });

            for (let key in latestStatusesLookup) {
                statusesToDisplay.push(latestStatusesLookup[key]);
            }

            statusesToDisplay.forEach((statusToDisplay) => {
                this._statuses.push(new StatusViewModel(this.repoContext(), this, {
                    status: statusToDisplay
                }));
            });
        }
        this.doneLoadingStatuses(true);
    }

    private _getStatusType(status: VCContracts.GitStatus): string {
        return (status.context.genre + "/" + status.context.name);
    }

    private _computeStatusMainText(): string {
        
        // If there are multiple statuses for an artifact, the status will be rolled up into one of the four states as follows:
        //      Error - if there are any errors
        //      Failed - no errors, but 1+ failures
        //      Pending - no errors or failures, but 1+ pending
        //      Success - All statuses are success
        if (this.errorCount() > 0 || this.failureCount() > 0 || this.pendingCount() > 0 || this.successCount() > 0) {

            return ((this.errorCount() > 0) && VCResources.Status_StatusMain_Error) ||
                ((this.failureCount() > 0) && VCResources.Status_StatusMain_Failure) ||
                ((this.pendingCount() > 0) && VCResources.Status_StatusMain_Pending) ||
                ((this.successCount() > 0) && VCResources.Status_StatusMain_Success);
        }
        return "";
    }

    private _computeStatusTooltipPrimaryText(): string {
        if (this.errorCount() > 0 || this.failureCount() > 0 || this.pendingCount() > 0 || this.successCount() > 0) {
            let primaryFailureString = this.failureCount() === 1 ? VCResources.Status_Tooltip_Primary_Failure_Singular : VCResources.Status_Tooltip_Primary_Failure_Plural;
            let primaryErrorString = this.errorCount() === 1 ? VCResources.Status_Tooltip_Primary_Error_Singular : VCResources.Status_Tooltip_Primary_Error_Plural;

            return ((this.errorCount() > 0) && primaryErrorString) ||
                ((this.failureCount() > 0) && primaryFailureString) ||
                ((this.pendingCount() > 0) && VCResources.Status_Tooltip_Primary_Pending) ||
                ((this.successCount() > 0) && VCResources.Status_Tooltip_Primary_Success);
        }
        return "";
    }

    private _computeStatusTooltipSecondaryText(): string {
        let statusTooltipSecondaryText = "";

        if (this.errorCount() > 0 || this.failureCount() > 0 || this.pendingCount() > 0 || this.successCount() > 0) {
            // get pluralized error and failure strings if needed
            let secondaryErrorString = this.errorCount() === 1 ? VCResources.Status_Tooltip_Secondary_Error_Singular : VCResources.Status_Tooltip_Secondary_Error_Plural;
            let secondaryFailureString = this.failureCount() === 1 ? VCResources.Status_Tooltip_Secondary_Failure_Singular : VCResources.Status_Tooltip_Secondary_Failure_Plural;

            statusTooltipSecondaryText = VCResources.Status_Tooltip_Secondary_AllSuccess;

            if (this.errorCount() || this.failureCount() || this.pendingCount()) {
                let strings = [];

                // format the numbers of each category of state
                this.errorCount() && strings.push(Utils_String.format(secondaryErrorString, this.errorCount()));
                this.failureCount() && strings.push(Utils_String.format(secondaryFailureString, this.failureCount()));
                this.pendingCount() && strings.push(Utils_String.format(VCResources.Status_Tooltip_Secondary_Pending, this.pendingCount()));
                this.successCount() && strings.push(Utils_String.format(VCResources.Status_Tooltip_Secondary_Success, this.successCount()));

                statusTooltipSecondaryText = strings.join(", ");
            }
        }
        return statusTooltipSecondaryText;
    }

    private _computeStatusCssClass(): string {

        if (this.errorCount() > 0 || this.failureCount() > 0 || this.pendingCount() > 0 || this.successCount() > 0) {
            return ((this.errorCount() > 0) && StatusViewModel._TEXT_CLASS_ERROR) ||
                ((this.failureCount() > 0) && StatusViewModel._TEXT_CLASS_FAILURE) ||
                ((this.pendingCount() > 0) && StatusViewModel._TEXT_CLASS_PENDING) ||
                ((this.successCount() > 0) && StatusViewModel._TEXT_CLASS_SUCCESS);
        }
        return "";
    }

    private _computeStatusCssIconClass(): string {

        let statusIconCssClass = "";

        if (this.errorCount() > 0 || this.failureCount() > 0 || this.pendingCount() > 0 || this.successCount() > 0) {
            statusIconCssClass = ((this.errorCount() > 0) && StatusViewModel._ICON_CLASS_ERROR) ||
                ((this.failureCount() > 0) && StatusViewModel._ICON_CLASS_FAILURE) ||
                ((this.pendingCount() > 0) && StatusViewModel._ICON_CLASS_PENDING) ||
                ((this.successCount() > 0) && StatusViewModel._ICON_CLASS_SUCCESS);

            // add to the icon class to get the correct color (bowtie icons are all gray)
            statusIconCssClass = [statusIconCssClass, this.statusCssClass()].join(" ");
        }
        return statusIconCssClass;
    }

    public onBadgeClick(context: StatusListViewModel) {
        VSS.using(["Build/Scripts/NewDefinitionDialog"], (newDefinitionDialog) => {
            if (!newDefinitionDialog) {
                Diag.logError("Build/Scripts/NewDefinitionDialog is not loaded");
                return;
            }

            newDefinitionDialog.showNewBuildDefinitionDialog({
                source: "Code",
                repositoryContext: context.repoContext.peek(),
                branchName: context._currentVersionControlFullBranchName.peek(),
                successAction: Events_Action.CommonActions.ACTION_WINDOW_OPEN,
                hideFolderPicker: true
            });
        });
    }
}

export class StatusControl extends Controls.BaseControl {
    private static _statusTemplateName = "vc-status";
    private static _tooltipTemplateName = "vc-status-tooltip";
    private static _tooltipContainerClassName = ".vc-status-tooltip-clickable";
    private static _TOOLTIP_LEFT_OFFSET_PIXELS: number = -20;

    private _viewModel: StatusListViewModel;

    constructor(repositoryContext: RepositoryContext, options?) {
        super();
        this._viewModel = new StatusListViewModel(repositoryContext, null);
    }

    public initialize() {
        super.initialize();

        // set up the status template and apply bindings
        let statusTemplate = TFS_Knockout.loadHtmlTemplate(StatusControl._statusTemplateName);
        this._element.append(statusTemplate);
        ko.applyBindings(this._viewModel, statusTemplate[0]);

        // set up the tooltip, which displays if the user clicks inside of the _tooltipContainerClassName
        Controls.Enhancement.enhance(PopupContent.RichContentTooltip, this._element.find(StatusControl._tooltipContainerClassName), {
            cssClass: "status-rich-content-tooltip",
            html: delegate(this, this._getTooltipContent),
            openCloseOnHover: false,
            elementAlign: "left-top",
            leftOffsetPixels: StatusControl._TOOLTIP_LEFT_OFFSET_PIXELS
        });
    }

    public dispose(): void {
        super.dispose();
        this._viewModel.dispose();
    }

    public getViewModel(): StatusListViewModel {
        return this._viewModel;
    }

    private _getTooltipContent() {
        let tooltipTemplate = TFS_Knockout.loadHtmlTemplate(StatusControl._tooltipTemplateName);
        ko.applyBindings(this._viewModel, tooltipTemplate[0]);
        return tooltipTemplate;
    }
}
