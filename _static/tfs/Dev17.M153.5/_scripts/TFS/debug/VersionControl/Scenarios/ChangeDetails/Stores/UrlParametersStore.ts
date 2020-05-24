import * as VSSStore from "VSS/Flux/Store";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import { ChangeExplorerItemType } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ActionsHub, UrlParameters } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";

export const MERGE_DIFF = -1;

export class UrlParametersStore extends VSSStore.Store {
    private static _isSummary(parameter: string): boolean {
        return Utils_String.localeIgnoreCaseComparer(parameter, VersionControlActionIds.Summary) === 0;
    }

    private static _parseDiffParentIndex(diffParent: string): number {
        return Utils_Number.parseInvariant(diffParent.substr(VersionControlActionIds.DiffParent.length));
    }

    private _state: UrlParameters;

    constructor(private _actionsHub: ActionsHub) {
        super();
        this._state = {} as UrlParameters;

        this._actionsHub.urlParametersChanged.addListener(this._onUrlParametersChange);
    }

    public get annotate(): boolean {
        return this._state.annotate;
    }

    public get currentAction(): string {
        return this._state.action;
    }

    public get diffParent(): string {
        return this._state.diffParent;
    }

    public get discussionId(): number {
        return this._state.discussionId;
    }

    public get codeReviewId(): number {
        return this._state.codeReviewId;
    }

    /**
     * -1: Summary: Changes made while merging
     *  x: diffParent<x> in Url;
     */
    public get gitParentDiffIndex(): number {
        const diffParent = this._state.diffParent || this._state.action;

        if (diffParent && VersionControlActionIds.isDiffParentActionId(diffParent)) {
            return UrlParametersStore._parseDiffParentIndex(diffParent);
        }

        if (UrlParametersStore._isSummary(diffParent)) {
            return MERGE_DIFF;
        }

        return null;
    }

    public get isFullScreen(): boolean {
        return this._state.isFullScreen;
    }

    public get gridItemType(): ChangeExplorerItemType {
        return this._state.gridItemType;
    }

    public get hideComments(): boolean {
        return this._state.hideComments;
    }

    public get isCompareAction(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._state.action, VersionControlActionIds.Compare) === 0;
    }

    public get isContentsAction(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._state.action, VersionControlActionIds.Contents) === 0;
    }

    public get isDiffParentAction(): boolean {
        if (this._state.action) {
            return VersionControlActionIds.isDiffParentActionId(this._state.action);
        }

        return false;
    }

    public get isHistoryAction(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._state.action, VersionControlActionIds.History) === 0;
    }

    public get isSummaryAction(): boolean {
        return UrlParametersStore._isSummary(this._state.action);
    }

    public get mpath(): string {
        return this._state.mpath;
    }

    public get mversion(): string {
        return this._state.mversion;
    }

    public get opath(): string {
        return this._state.opath;
    }

    public get oversion(): string {
        return this._state.oversion;
    }

    public get path(): string {
        return this._state.path;
    }

    public get refName(): string {
        return this._state.refName;
    }

    public get UrlParameters(): UrlParameters {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.urlParametersChanged.removeListener(this._onUrlParametersChange);
            this._actionsHub = null;
        }

        this._state = {};
    }

    private _onUrlParametersChange = (urlParameters: UrlParameters): void => {
        const isChanged = urlParameters &&
            (this._state.action !== urlParameters.action ||
                this._state.annotate !== urlParameters.annotate ||
                this._state.diffParent !== urlParameters.diffParent ||
                this._state.discussionId !== urlParameters.discussionId ||
                this._state.codeReviewId !== urlParameters.codeReviewId ||
                this._state.mpath !== urlParameters.mpath ||
                this._state.opath !== urlParameters.opath ||
                this._state.mversion !== urlParameters.mversion ||
                this._state.oversion !== urlParameters.oversion ||
                this._state.path !== urlParameters.path ||
                this._state.gridItemType !== urlParameters.gridItemType ||
                this._state.hideComments !== urlParameters.hideComments ||
                this._state.isFullScreen !== urlParameters.isFullScreen ||
                this._state.refName !== urlParameters.refName
            );

        if (isChanged) {
            this._state = urlParameters;
            this.emitChanged();
        }
    }

}
