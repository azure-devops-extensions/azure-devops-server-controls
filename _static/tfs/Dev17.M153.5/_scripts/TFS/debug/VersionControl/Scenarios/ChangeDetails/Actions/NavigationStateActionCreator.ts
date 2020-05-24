import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

import { ActionsHub, UrlParameters } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";

/**
 * Creates actions related to URL change
 */
export class NavigationStateActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _storesHub: StoresHub,
        private _setFullScreenMode?: (fullScreen: boolean) => void,
    ) { }

    /**
     * Parse the raw state to preserve in UrlParameters.
     * Fills in default parameter values like action
     * @param rawState: raw state received from parseStateInfo
     */
    public loadUrlParameters(rawState: any, defaultAction?: string, isReviewMode?: boolean): void {
        const annotate = Utils_String.localeIgnoreCaseComparer(rawState.annotate, "true") === 0;
        const currentAction: string = rawState.action || defaultAction;

        // Page full-screen mode is dependent on two parameters:
        // a. fullscreen
        // b. reviewMode
        let isFullScreen: boolean;
        if (rawState.fullScreen) {
            isFullScreen = Utils_String.localeIgnoreCaseComparer("true", rawState.fullScreen) === 0;
        } else {
            isFullScreen = !!isReviewMode;
        }

        const discussionId = parseInt(rawState.discussionId) || 0;
        const codeReviewId = parseInt(rawState.codeReviewId) || 0;
        const hideComments = annotate || Utils_String.localeIgnoreCaseComparer(rawState.hideComments, "true") === 0;

        const urlParameters = {
            annotate: annotate,
            action: currentAction,
            diffParent: rawState.diffParent,
            discussionId: discussionId,
            codeReviewId: codeReviewId,
            isFullScreen: isFullScreen,
            isReviewMode: !!isReviewMode,
            gridItemType: Number(rawState.gridItemType),
            mpath: rawState.mpath,
            opath: rawState.opath,
            mversion: rawState.mversion,
            oversion: rawState.oversion,
            path: rawState.path,
            hideComments: hideComments,
            refName: rawState.refName,
            ss: rawState.ss,
        };

        if (this._setFullScreenMode) {
            this._setFullScreenMode(isFullScreen);
        }

        this._actionsHub.urlParametersChanged.invoke(urlParameters);
    }

    /**
     * Triggers a navigate event with the addition of the given action and state information
     */
    public navigateWithState = (action: string, newState: UrlParameters = {}, replaceHistoryEntry?: boolean): void => {
        if (newState.isFullScreen === undefined) {
            const {fullScreen} = Navigation_Services.getHistoryService().getCurrentState();

            if (fullScreen !== undefined) {
                newState = {...newState, fullScreen} as any;
            }
        }

        Navigation_Services.getHistoryService().updateHistoryEntry(action, newState, replaceHistoryEntry);
    }
}
