import Q = require("q");

import * as VSS from "VSS/VSS";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import Utils_String = require("VSS/Utils/String");
import * as Diag from "VSS/Diag";

import { IArtifactData } from "VSS/Artifacts/Services";

import { MessageAreaType } from "VSS/Controls/Notifications";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ActionsHub } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Actions";

import {
    ViewMode, IZeroDataOptions, IColumn, IInternalLinkedArtifactDisplayData , ILinkedArtifactsCache, FetchingLinks, ISortColumn, SortDirection,
    IViewOptions
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

import { ILinkedArtifactGroup, IMessage, FetchingDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import { ArtifactResolver, IArtifactResult } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ArtifactResolver";
import { ArtifactFilterHelper } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/Filtering";

import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import { RequestCache } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/RequestCache";
import { getLinkedArtifactProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider.Registration";
import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

export class ActionsCreator {
    protected _actionsHub: ActionsHub;
    private _tfsContext: TfsContext;
    private _filterHelper: ArtifactFilterHelper;
    private _cache: ILinkedArtifactsCache;
    private _columns: IColumn[];

    private _retrievingLinks: Utils_Core.Cancelable;

    constructor(tfsContext: TfsContext, actionsHub: ActionsHub, columns: IColumn[], filterHelper: ArtifactFilterHelper, cache?: ILinkedArtifactsCache) {
        this._tfsContext = tfsContext;
        this._actionsHub = actionsHub;
        this._filterHelper = filterHelper;
        
        this._columns = columns;
        this._cache = cache;
    }

    public removeLinkedArtifact(linkedArtifactToRemove: ILinkedArtifact) {
        this._actionsHub.removeLinkedArtifact.invoke({
            linkedArtifactToRemove: linkedArtifactToRemove
        });
    }

    public changeLinkedArtifactComment(linkedArtifact: ILinkedArtifact, newComment: string) {
        ArtifactResolver.invalidateArtifactCacheEntry(this._cache, linkedArtifact, this._columns);
        this._actionsHub.changeLinkedArtifactComment.invoke({
            linkedArtifactToChange: linkedArtifact,
            newComment: newComment
        });
    }

    /**
     * Change view options for control
     * @param viewOptions Updated view options
     */
    public changeViewOptions(viewOptions: IViewOptions) {
        this._actionsHub.changeViewOptions.invoke({
            viewOptions: viewOptions
        });
    }

    public changeZeroDataOptions(zeroDataOptions: IZeroDataOptions) {
        this._actionsHub.changeZeroDataOptions.invoke({
            zeroDataOptions: zeroDataOptions
        });
    }

    public changeReadOnly(readOnly: boolean) {
        this._actionsHub.changeReadOnly.invoke({
            readOnly: readOnly
        });
    }

    public changeFetchingLinks(fetchingLinks: FetchingLinks) {
        this._actionsHub.changeFetchingLinks.invoke({
            fetchingLinks: fetchingLinks
        });
    }

    /**
     * Set the given linked artifacts. Will resolve artifacts before triggering action.
     * 
     * @param linkedArtifacts 
     * @param hostArtifact Optional host artifact
     */
    public setLinks(linkedArtifacts: ILinkedArtifact[], hostArtifact?: IArtifactData) {
        // First, cancel any previous, outstanding requests for this control instance
        if (this._retrievingLinks) {
            this._retrievingLinks.cancel();
        }
        this._retrievingLinks = new Utils_Core.Cancelable(null);

        this._setStartFetchingDisplayData();

        // Filter linked artifacts by tool and link types
        let filteredArtifacts = this._filterHelper.filter(linkedArtifacts.slice(0));
        if (filteredArtifacts.length === 0) {
            this._groupAndSetArtifacts([], hostArtifact);
            this.clearMessage();
            this._setEndFetchingData();
            return;
        }

        ArtifactResolver.getInstance().resolveArtifacts(
            filteredArtifacts,
            this._columns,
            hostArtifact,
            this._tfsContext,
            (tool) => this._filterHelper.getSubtypeFilterForDataProvider(tool),
            this._cache).then(this._retrievingLinks.wrap((artifactResult: IArtifactResult) => {
                let resolvedArtifacts = artifactResult.resolvedArtifacts;
                this._groupAndSetArtifacts(resolvedArtifacts, hostArtifact);

                // Show any info/error messages, if generated
                if (artifactResult.messages && artifactResult.messages.length > 0) {
                    let errors = artifactResult.messages.filter(m => m.type === MessageAreaType.Error);
                    if (errors.length > 0) {
                        this.showMessage(errors[0].text, errors[0].type);
                    } else {
                        this.showMessage(artifactResult.messages[0].text, artifactResult.messages[0].type);
                    }
                } else {
                    this.clearMessage();
                }

                this._setEndFetchingData();
            }) as (result: IArtifactResult) => void);
    }

    /**
     * Trigger sort action for all current artifacts
     * @param sortOrder List of objects depicting the requested sort order
     */
    public sortLinkedArtifacts(sortOrder: { index: string; order: string; }[]) {
        // Map given sort columns into column model
        let sortColumns = sortOrder.map(order => {
            let column = Utils_Array.first(this._columns, c => c.refName === order.index);
            if (column) {
                return <ISortColumn>{
                    column: column,
                    direction: order.order === "desc" ? SortDirection.Descending : SortDirection.Ascending
                };
            }
        }).filter(c => !!c);

        this._actionsHub.sortLinkedArtifacts.invoke({
            sortColumns: sortColumns
        });
    }

    /**
     * Show message with the given text and level
     * @param message Message text to display
     * @param type Type of message
     */
    public showMessage(text: string | Error, type: MessageAreaType = MessageAreaType.Error) {
        let stringText: string = "";
        if (typeof text === "string") {
            stringText = text;
        }
        else if (typeof text === "object" && text.message) {
            stringText = (<Error>text).message;
        }
        else {
            Diag.Debug.fail("Message text is not string or Error");
            return;
        }

        this._actionsHub.showMessage.invoke({
            message: {
                text: stringText,
                type: type
            }
        });
    }

    /**
     * Clear any info message
     */
    public clearMessage() {
        this._actionsHub.showMessage.invoke({
            message: null
        });
    }

    /**
     * Group the given artifacts by link type and raise an update action
     * @param linkedArtifacts Linked artifacts to group and set
     * @param hostArtifact Optional host artifact
     */
    protected _groupAndSetArtifacts(linkedArtifacts: IInternalLinkedArtifactDisplayData [], hostArtifact?: IArtifactData) {
        let groups = ArtifactResolver.groupLinkedArtifactsByLinkType(linkedArtifacts);

        this._actionsHub.setLinkedArtifacts.invoke({
            groupedLinkedArtifacts: groups,
            hostArtifact: hostArtifact
        });
    }

    private _setStartFetchingDisplayData() {
        this._actionsHub.changeFetchingDisplayData.invoke({
            fetchingDisplayData: FetchingDisplayData.InProgress
        });
    }

    private _setEndFetchingData() {
        this._actionsHub.changeFetchingDisplayData.invoke({
            fetchingDisplayData: FetchingDisplayData.Done
        });
    }
}