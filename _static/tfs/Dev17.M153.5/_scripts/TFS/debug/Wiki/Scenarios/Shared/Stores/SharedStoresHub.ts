import { autobind } from "OfficeFabric/Utilities";
import * as EventsService from "VSS/Events/Services";

import { UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";
import { SharedActionsHub, UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { CommonState, CommonStore } from "Wiki/Scenarios/Shared/Stores/CommonStore";
import { NavigateAwayDialogState, NavigateAwayDialogStore } from "Wiki/Scenarios/Shared/Stores/NavigateAwayDialogStore";
import { PermissionState, PermissionStore } from "Wiki/Scenarios/Shared/Stores/PermissionStore";
import { CompareViews, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { SpecialChars } from "Wiki/Scripts/Generated/Constants";
import { getDefaultUrlParameters, normalizeWikiPagePath } from "Wiki/Scripts/Helpers";
import { WikiHubViewState, URL_Changed_Event } from "Wiki/Scripts/WikiHubViewState";

export interface SharedState {
    commonState: CommonState;
    navigateAwayDialogState: NavigateAwayDialogState;
    permissionState: PermissionState;
    urlState: UrlParameters;
}

export class SharedStoresHub implements IDisposable {
    public commonStore: CommonStore;
    public navigateAwayDialogStore: NavigateAwayDialogStore;
    public permissionStore: PermissionStore;

    constructor(private _actionsHub: SharedActionsHub, private _hubViewState: WikiHubViewState) {
        this.commonStore = this._createCommonStore();
        this.navigateAwayDialogStore = this._createNavigateAwayDialogStore();
        this.permissionStore = this._createPermissionStore();
    }

    public dispose(): void {
        this._disposeNavigateAwayDialogStore();
        this._disposeCommonStore();
        this._disposePermissionStore();
    }

    public get hubViewState(): WikiHubViewState {
        return this._hubViewState;
    }

    public get state(): SharedState {
        return {
            commonState: this.commonStore.state,
            navigateAwayDialogState: this.navigateAwayDialogStore.state,
            permissionState: this.permissionStore.state,
            urlState: this._getUrlStateFromHubViewState(),
        };
    }

    public getSharedState = (): SharedState => ({
        commonState: this.commonStore.state,
        navigateAwayDialogState: this.navigateAwayDialogStore.state,
        permissionState: this.permissionStore.state,
        urlState: this._getUrlStateFromHubViewState(),
    });

    private _createCommonStore(): CommonStore {
        const commonStore = new CommonStore();

        this._actionsHub.errorCleared.addListener(commonStore.clearError);
        this._actionsHub.errorRaised.addListener(commonStore.setError);
        this._actionsHub.wikiMetadataLoaded.addListener(commonStore.loadWikiMetadata);
        this._actionsHub.startedLoading.addListener(commonStore.startLoading);
        this._actionsHub.stoppedLoading.addListener(commonStore.stopLoading);

        EventsService.getService().attachEvent(URL_Changed_Event, this._handleUrlChangedEvent);

        return commonStore;
    }

    private _disposeCommonStore(): void {
        if (!this.commonStore) {
            return;
        }

        this._actionsHub.wikiMetadataLoaded.removeListener(this.commonStore.loadWikiMetadata);
        this._actionsHub.errorRaised.removeListener(this.commonStore.setError);
        this._actionsHub.errorCleared.removeListener(this.commonStore.clearError);
        this._actionsHub.startedLoading.removeListener(this.commonStore.startLoading);
        this._actionsHub.stoppedLoading.removeListener(this.commonStore.stopLoading);

        EventsService.getService().detachEvent(URL_Changed_Event, this._handleUrlChangedEvent);

        this.commonStore = null;
    }

    private _createNavigateAwayDialogStore(): NavigateAwayDialogStore {
        const navigateAwayDialogStore = new NavigateAwayDialogStore();

        this._actionsHub.navigateAwayDialogPrompted.addListener(navigateAwayDialogStore.promptNavigateAwayDialog);
        this._actionsHub.navigateAwayDialogDismissed.addListener(navigateAwayDialogStore.dismissNavigateAwayDialog);

        return navigateAwayDialogStore;
    }

    private _disposeNavigateAwayDialogStore(): void {
        if (!this.navigateAwayDialogStore) {
            return;
        }

        this._actionsHub.navigateAwayDialogPrompted.removeListener(this.navigateAwayDialogStore.promptNavigateAwayDialog);
        this._actionsHub.navigateAwayDialogDismissed.removeListener(this.navigateAwayDialogStore.dismissNavigateAwayDialog);

        this.navigateAwayDialogStore = null;
    }

    private _createPermissionStore(): PermissionStore {
        const permissionStore = new PermissionStore();
        this._actionsHub.permissionsChanged.addListener(permissionStore.changePermissions);
        return permissionStore;
    }

    private _disposePermissionStore(): void {
        if (!this.permissionStore) {
            return;
        }

        this._actionsHub.permissionsChanged.removeListener(this.permissionStore.changePermissions);
        this.permissionStore = null;
    }

    @autobind
    private _handleUrlChangedEvent(updatedUrl: any): void {
        this.commonStore.resetIsPageDirty();
    }

    private _getUrlStateFromHubViewState(): UrlParameters {
        const urlParams: UrlParameters = $.extend({}, getDefaultUrlParameters(), this._hubViewState.viewOptions.getViewOptions());

        if (urlParams && urlParams.action) {
            urlParams.action = urlParams.action.toLowerCase();
        }

        if (urlParams && !urlParams.action) {
            urlParams.action = WikiActionIds.View;
        }

        if (urlParams && urlParams.pagePath) {
            /* '-' in URL relates to space in the page path.
             * '%2D' in URL relates to '-' in page path.
             */
            urlParams.pagePath = normalizeWikiPagePath(urlParams.pagePath, "/");
            urlParams.pagePath = urlParams.pagePath.replace(UrlEscapeConstants.HyphenRegExp, SpecialChars.Space)
                .replace(UrlEscapeConstants.HyphenEncodingRegExp, SpecialChars.Hyphen);
        }

        if (urlParams && urlParams.template) {
            urlParams.template = normalizeWikiPagePath(urlParams.template, "/");
        }

        if (urlParams && urlParams.latestPagePath) {
            /* '-' in URL relates to space in the page path.
             * '%2D' in URL relates to '-' in page path.
             */
            urlParams.latestPagePath = normalizeWikiPagePath(urlParams.latestPagePath, "/")
                .replace(UrlEscapeConstants.HyphenRegExp, SpecialChars.Space)
                .replace(UrlEscapeConstants.HyphenEncodingRegExp, SpecialChars.Hyphen);
        }

        if (urlParams.action === WikiActionIds.Compare) {
            urlParams.view = this._getPageView(urlParams.view);
        }

        return urlParams;
    }

    private _getPageView(value: any): string {
        let view: string;

        if (value) {
            view = value.toLowerCase();
        } else {
            // Default is compare view for compare page
            view = CompareViews.Compare;
        }

        return view;
    }
}
