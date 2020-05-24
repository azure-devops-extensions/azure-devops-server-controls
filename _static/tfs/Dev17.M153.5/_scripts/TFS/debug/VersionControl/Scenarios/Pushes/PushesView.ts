/// <reference types="react-dom" />
import * as Controls from "VSS/Controls";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ActionCreator } from "VersionControl/Scenarios/Pushes/ActionCreator";
import { ActionsHub, PushesSearchFilterData } from "VersionControl/Scenarios/Pushes/ActionsHub";
import * as PushesPage from "VersionControl/Scenarios/Pushes/Components/PushesPage";
import { BranchUpdatesSource } from "VersionControl/Scenarios/Pushes/Sources/BranchUpdatesSource";
import { PushesViewTelemetrySpy } from "VersionControl/Scenarios/Pushes/Sources/PushesViewTelemetrySpy";
import { StoresHub } from "VersionControl/Scenarios/Pushes/Stores/StoresHub";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ViewBase } from "VersionControl/Scripts/Views/BaseView";

import "VSS/LoaderPlugins/Css!fabric";

const elementToRender = ".version-control-item-right-pane";

export class PushesView extends ViewBase {
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            hubContentSelector: elementToRender,
        }, options));
    }

    public initialize(): void {

        if (this._emptyRepository) {
            this._showEmptyRepositoryView($(elementToRender));
        }
        else {
            this._customerIntelligenceData.setView(CustomerIntelligenceConstants.PUSHES_PAGE_VIEW);
            this._initializeFlux();
        }
        super.initialize();

        this.setViewTitle(StringUtils.format(
            VCResources.PushesTitleFormat,
            this._getFriendlyPathTitle(this._repositoryContext.getRootPath())));
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): void {

        let searchCriteria: PushesSearchFilterData = {};

        let itemVersion: string = rawState.itemVersion;
        let versionSpec: VCSpecs.VersionSpec;
        let isUrlPrepopulatedWithVersion: boolean = true;

        if (itemVersion && VCSpecs.VersionSpec.isGitItem(itemVersion)) {
            versionSpec = VCSpecs.VersionSpec.parse(itemVersion);
            if (this._actionCreator) {
                this._actionCreator.saveBranchVersionSpec(versionSpec);
            }
        } else {
            isUrlPrepopulatedWithVersion = false;
            itemVersion = new VCSpecs.GitBranchVersionSpec(this._defaultGitBranchName).toVersionString();
        }
        // form a search criteria based on URL
        searchCriteria.itemVersion = itemVersion;
        searchCriteria.toDate = rawState.toDate;
        searchCriteria.fromDate = rawState.fromDate;
        searchCriteria.allRefs = rawState.allRefs;
        searchCriteria.userId = rawState.userId;
        searchCriteria.userName = rawState.userName;
        searchCriteria.excludeUsers = rawState.excludeUsers;
        
        if (this._actionCreator) {
            // in case url does not contain version, append version (from search criteria) for ease of bookmarking
            // in this setSearchCriteria will happen later when page loads with version in url
            if (!isUrlPrepopulatedWithVersion) {
                this._actionCreator.changeUrl(searchCriteria);
            } else {
                this._actionCreator.setSearchCriteria(searchCriteria);
            }
        }
    }

    private _initializeFlux(): void {
        const actionsHub = new ActionsHub();
        let repoContext = this._repositoryContext as GitRepositoryContext;
        this._storesHub = new StoresHub(actionsHub);
        this._actionCreator = new ActionCreator(
            actionsHub,
            new BranchUpdatesSource(this._repositoryContext as GitRepositoryContext, "ms.vss-code-web.pushes-data-provider"),
            new GitPermissionsSource(repoContext.getProjectId(), repoContext.getRepositoryId()),
            this._storesHub.getAggregateState,
            new PushesViewTelemetrySpy(actionsHub)
        );

        this._actionCreator.initialize(this._repositoryContext, this._defaultGitBranchName);

        PushesPage.renderInto(
            $(elementToRender)[0],
            {
                actionCreator: this._actionCreator,
                storesHub: this._storesHub,
            });
    }

    public _dispose(): void {
        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }

        if (this._actionCreator) {
            this._actionCreator.dispose();
            this._actionCreator = null;
        }

        super._dispose();
    }
}

VSS.classExtend(PushesView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(PushesView, ".versioncontrol-pushes-view");
