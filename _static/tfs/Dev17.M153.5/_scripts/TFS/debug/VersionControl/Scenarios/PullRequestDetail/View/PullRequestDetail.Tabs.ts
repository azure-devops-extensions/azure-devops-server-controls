/// <reference types="react-dom" />

import * as ReactDOM from "react-dom";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { createExtensionHost, IExtensionHost } from "VSS/Contributions/Controls";
import { NavigationViewTab } from "VSS/Controls/Navigation";
import Performance = require("VSS/Performance");
import { PullRequestTabExtensionConfig } from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as StringUtils from "VSS/Utils/String";
import * as Navigation_Services from "VSS/Navigation/Services";

import { OverviewRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Tabs/OverviewTab";
import { FilesRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Tabs/FilesTab";
import { CommitsRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Tabs/CommitsTab";
import { UpdatesRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Tabs/UpdatesTab";
import { MainRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Main";

// control tab visibility with css "visibility" instead of the inherited "display"
export class BaseTab extends NavigationViewTab {
    public onNavigate(rawState: any, parsedState: any): void {
        this._element && this._element.removeClass("tab-hidden");
    }

    public onNavigateAway(): void {
        this._element && this._element.addClass("tab-hidden");
    }

    // do nothing tabs are requested to show/hide
    // we control this with visibility and we don't want the document to force a reflow
    public hideElement(): void { }
    public showElement(): void { }
}

// shim for overview tab -> react rendering
export class OverviewTab extends BaseTab {
    private _component: any;

    public onNavigate(rawState: any, parsedState: any) {
        if (!this._component) {
            this._component = true;
            OverviewRenderer.attachTab(this._element[0]);
        }
        super.onNavigate(rawState, parsedState);
    }
}

// shim for files tab -> react rendering
export class FilesTab extends BaseTab {
    private _component: boolean;

    public onNavigate(rawState: any, parsedState: any) {
        if (!this._component) {
            this._component = true;
            FilesRenderer.attachTab(this._element[0]);
        }
        super.onNavigate(rawState, parsedState);
    }
}

// shim for updates tab -> react rendering
export class UpdatesTab extends BaseTab {
    private _component: boolean;

    public onNavigate(rawState: any, parsedState: any) {
        if (!this._component) {
            this._component = true;
            UpdatesRenderer.attachTab(this._element[0]);
        }
        super.onNavigate(rawState, parsedState);
    }
}

// shim for commits tab -> react rendering
export class CommitsTab extends BaseTab {
    private _component: any;

    public onNavigate(rawState: any, parsedState: any) {
        if (!this._component) {
            this._component = true;
            CommitsRenderer.attachTab(this._element[0]);
        }
        super.onNavigate(rawState, parsedState);
    }
}

// shim for contributed tab -> react rendering
export class ContributedTab extends BaseTab {
    private _contribution: IExtensionHost;
    private _contributionId: string;
    private _isLoading: boolean;
    private _initialConfig: PullRequestTabExtensionConfig;

    public constructor(options) {
        super(options);

        const pullRequestId: number = (options.navigationView && options.navigationView._pullRequestId) || 0;
        const repositoryId: string = (options.navigationView && options.navigationView._repositoryId) || "";

        this._contribution = null;
        this._contributionId = null;
        this._isLoading = false;

        this._initialConfig = <PullRequestTabExtensionConfig>{
            pullRequestId: pullRequestId,
            repositoryId: repositoryId
        };
    }

    public onNavigate(rawState: any, parsedState: any) {
        if (!this._isLoading && !this._contribution && parsedState.contributionId) {
            this._isLoading = true;
            MainRenderer.startLoading(this._element[0]);

            createExtensionHost(this._element, parsedState.contributionId, this._initialConfig).then(
                (host) => {
                    MainRenderer.loadingComplete(this._element[0]);
                    this._contribution = host;
                    this._contributionId = parsedState.contributionId;
                    this._isLoading = false;
                },
                (rejected) => {
                    MainRenderer.loadingComplete(this._element[0]);
                    MainRenderer.attachTabError(this._element[0], StringUtils.format(VCResources.Navigation_ContributedTabError, parsedState.contributionId));
                });
        }
        super.onNavigate(rawState, parsedState);
    }

    public onNavigateAway(): void {
        const currentState = Navigation_Services.getHistoryService().getCurrentState();

        // if we're navigating away from a contributed tab (navigating away with the same contribution id) 
        // remove the contribution id from the url
        if (currentState.contributionId && currentState.contributionId === this._contributionId) {
            Navigation_Services.getHistoryService().replaceHistoryPoint(
                undefined, // don't use a custom action
                { ...currentState, contributionId: null }, // replace state exactly as it was except remove contributionId
                null, // no custom window title
                true); // suppress navigation callbacks
        }
        
        super.onNavigateAway();
    }
}
