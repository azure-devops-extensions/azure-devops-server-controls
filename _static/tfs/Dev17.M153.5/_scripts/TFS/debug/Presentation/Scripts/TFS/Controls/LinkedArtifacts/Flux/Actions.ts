import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import { Action } from "Presentation/Scripts/TFS/TFS.React";

import { IArtifactData } from "VSS/Artifacts/Services";

import Notifications = require("VSS/Controls/Notifications");
  
import { ILinkedArtifactGroup, IMessage, FetchingDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import {
    ViewMode, IZeroDataOptions, IInternalLinkedArtifactDisplayData , IAvailableSpace, FetchingLinks, ISortColumn, IViewOptions
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ILinkedArtifact} from "TFS/WorkItemTracking/ExtensionContracts";

export interface IChangeViewOptions {
    viewOptions: IViewOptions;
}

export interface IChangeReadOnlyPayload {
    readOnly: boolean;
}

export interface IZeroDataOptionsPayload {
    zeroDataOptions: IZeroDataOptions;
}

export interface ISetLinkedArtifactsPayload {
    groupedLinkedArtifacts: ILinkedArtifactGroup[];
    hostArtifact: IArtifactData;
}

export interface IAddLinkedArtifactsPayload {
    linkedArtifactToAdd: ILinkedArtifact;
}

export interface IRemoveLinkedArtifactsPayload {
    linkedArtifactToRemove: ILinkedArtifact;
}

export interface IChangeLinkedArtifactCommentPayload {
    linkedArtifactToChange: ILinkedArtifact;
    newComment: string;
}

export interface ISortLinkedArtifactsPayload {
    sortColumns: ISortColumn[];
}

export interface IMessagePayload {
    message: IMessage;
}

export interface IFetchingLinksPayload {
    fetchingLinks: FetchingLinks;
}

export interface IFetchingDisplayDataPayload {
    fetchingDisplayData: FetchingDisplayData;
}


export class ActionsHub {
    private _scope = `LinkedArtifacts_${TFS_Core_Utils.GUIDUtils.newGuid()}`;

    private _createAction<T>(): Action<T> {
        return new Action<T>(this._scope);
    }

    /** View options of control should change */
    public changeViewOptions = this._createAction<IChangeViewOptions>();

    /** Change read only mode of control */
    public changeReadOnly = this._createAction<IChangeReadOnlyPayload>();

    /** Source links should be set */
    public setLinkedArtifacts = this._createAction<ISetLinkedArtifactsPayload>();

    /** Remove a linked artifact */
    public removeLinkedArtifact = this._createAction<IRemoveLinkedArtifactsPayload>();

    /** Change the comment on a link */
    public changeLinkedArtifactComment = this._createAction<IChangeLinkedArtifactCommentPayload>();

    /** Sort artifacts */
    public sortLinkedArtifacts = this._createAction<ISortLinkedArtifactsPayload>();

    /** Show message (e.g., error or warning) */
    public showMessage = this._createAction<IMessagePayload>();

    /** Sets zero data options */
    public changeZeroDataOptions = this._createAction<IZeroDataOptionsPayload>();

    /** Set if the links are fetched. */
    public changeFetchingLinks = this._createAction<IFetchingLinksPayload>();

    /** Set if the display data is fetched. */
    public changeFetchingDisplayData = this._createAction<IFetchingDisplayDataPayload>();
}