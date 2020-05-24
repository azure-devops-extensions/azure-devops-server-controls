import "VSS/LoaderPlugins/Css!fabric";

import * as ReactDOM from "react-dom";
import { TabbedNavigationView } from "VSS/Controls/Navigation";
import * as Utils_String from "VSS/Utils/String";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Serialization from "VSS/Serialization";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import * as Events_Document from "VSS/Events/Document";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { PagePerformance, SplitNames } from "VersionControl/Scenarios/Shared/PagePerformance";
import { GitShortcutGroup } from "VersionControl/Scenarios/Shared/GitShortcutGroup";
import { showEmptyRepository } from "VersionControl/Scenarios/Shared/EmptyRepository";
import { Flux } from "VersionControl/Scenarios/PullRequestCreate/Flux";
import { CreatePageRenderer } from "VersionControl/Scenarios/PullRequestCreate/Components/CreatePage";

const viewName = "PullRequestCreateView";

export class PullRequestCreateView extends TabbedNavigationView {
    public static HubContentSelector: string = ".versioncontrol-pullrequest-create-view";

    private _hubContentElement: HTMLElement;
    private _tfsContext: TfsContext;
    private _repositoryContext: GitRepositoryContext;
    private _projectInfo: VCContracts.VersionControlProjectInfo;    
    private _emptyRepository: boolean;
    private _customerIntelligenceData: CustomerIntelligenceData;
    private _reviewMode: boolean;
    private _defaultGitBranchName: string;

    private _sourceBranch: string;
    private _targetBranch: string;

    private _flux: Flux;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;

    constructor(options?) {
        super(options);

        PagePerformance.initializePage(CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_CREATE_FEATURE,
            true);

        PagePerformance.scenario.addSplitTiming(SplitNames.viewInitializationStarted);
    }

    public initializeOptions(options?) {
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const vcViewModel = webPageDataSvc.getPageData<any>(Constants.versionControlDataProviderId);
        if (vcViewModel) {
            $.extend(options, vcViewModel);
        }

        options = Serialization.ContractSerializer.deserialize(options, VCWebAccessContracts.TypeInfo.VersionControlViewModel, false);

        this._tfsContext = options.tfsContext || TfsContext.getDefault();
        this._projectInfo = options.projectVersionControlInfo;
        this._emptyRepository = options.isEmptyRepository;
        this._reviewMode = options.reviewMode === true;
        this._customerIntelligenceData = new CustomerIntelligenceData();
        this._defaultGitBranchName = options.defaultGitBranchName;

        if (options.gitRepository) {
            this._repositoryContext = GitRepositoryContext.create(options.gitRepository, this._tfsContext);
            this._customerIntelligenceData.setRepositoryId((<GitRepositoryContext>this._repositoryContext).getRepositoryId());
        }

        this.setWindowTitle(VCResources.PullRequest_CreatePullRequestTitle);

        super.initializeOptions({
            hubContentSelector: PullRequestCreateView.HubContentSelector,
            attachNavigate: true,
            ...options,
        });
    }

    public initialize(options?) {
        this._customerIntelligenceData.setView(viewName);
        PagePerformance.scenario.addSplitTiming(SplitNames.fluxInitializationStarted);

        this._flux = new Flux();
        this._flux.createActionCreator.initialize(this._tfsContext, this._repositoryContext);
        this._flux.createActionCreator.queryFeatureFlags();
        PagePerformance.scenario.addSplitTiming(SplitNames.fluxInitialized);

        // if the repository context is available do additional initialization
        if (this._repositoryContext) {

            if (this._reviewMode || Utils_String.localeIgnoreCaseComparer((Navigation_Services.getHistoryService().getCurrentState() || {}).fullScreenMode, "true") === 0) {
                this.setFullScreenMode(true, this._reviewMode);
            }

            this._customerIntelligenceData.publish((this._emptyRepository ? "EmptyRepositoryView" : this._customerIntelligenceData.getView()) + ".FirstView", true);

            new GitShortcutGroup({
                repoContext: this._repositoryContext,
                tfsContext: this._tfsContext,
                navigateToUrl: (url: string) => { window.location.href = url; },
                newPullRequestUrl: VersionControlUrls.getCreatePullRequestUrl(this._repositoryContext as GitRepositoryContext)
            });
        }

        super.initialize();

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add(viewName, this);

        this._hubContentElement = this._element.find(PullRequestCreateView.HubContentSelector)[0];
        if (this._emptyRepository) {
            showEmptyRepository(
                this._hubContentElement,
                document,
                this._options.activeImportRequest,
                this._repositoryContext,
                this._tfsContext,
                this._projectInfo,
                this._options.sshEnabled,
                this._options.sshUrl,
                this._options.cloneUrl);
        } else {
            this.attachTopView(this._hubContentElement);
        }

        PagePerformance.scenario.addSplitTiming(SplitNames.viewInitialized);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        const state: any = {};
        this.setState(state);

        state.repositoryContext = this._repositoryContext;

        if (rawState.sourceRef) {
            state.sourceRef = decodeURIComponent(rawState.sourceRef);
        }
        if (rawState.targetRef) {
            state.targetRef = decodeURIComponent(rawState.targetRef);
        }
        if (rawState.sourceRepositoryId) {
            state.sourceRepositoryId = decodeURIComponent(rawState.sourceRepositoryId);
        }
        if (rawState.targetRepositoryId) {
            state.targetRepositoryId = decodeURIComponent(rawState.targetRepositoryId);
        }

        if (this._emptyRepository) {
            PagePerformance.scenario.addSplitTiming(SplitNames.emptyRepositoryLoaded);
            PagePerformance.scenario.end();
            return;
        }

        callback(VCPullRequestsControls.PullRequestsActions.CREATENEW, state);
    }

    public onNavigate(state: any) {
        this._flux.createActionCreator.initializeBranches(
            state.sourceRef,
            state.targetRef,
            state.sourceRepositoryId,
            state.targetRepositoryId,
            this._defaultGitBranchName);
    }

    public isDirty(): boolean {
        if (this._flux) {
            const {isCreationPending} = this._flux.storesHub.pageStateStore.state;
            const {isDirty} = this._flux.storesHub.propertiesStore.state;
            return isDirty && !isCreationPending;
        }
        return false;
    }

    protected attachTopView(container: HTMLElement): void {
        CreatePageRenderer.attachTab(container, {
            storesHub: this._flux.storesHub,
            actionCreator: this._flux.createActionCreator,
            customerIntelligenceData: this._customerIntelligenceData,
            scenario: PagePerformance.scenario,
        });
    }

    protected _dispose(): void {
        super._dispose();

        if (this._hubContentElement) {
            ReactDOM.unmountComponentAtNode(this._hubContentElement);
        }

        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }
    }
}