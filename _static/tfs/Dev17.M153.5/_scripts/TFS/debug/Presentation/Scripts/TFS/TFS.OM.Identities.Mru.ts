import VSS = require("VSS/VSS");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Events_Handlers = require("VSS/Events/Handlers");
import Service = require("VSS/Service");
import TFS_Core_WebApi = require("Presentation/Scripts/TFS/TFS.Core.WebApi");
import Telemetry = require("VSS/Telemetry/Services");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import { IIdentityReference, IdentityHelper, IdentityFilter } from "Presentation/Scripts/TFS/TFS.OM.Identities";

var TfsContext = TFS_Host_TfsContext.TfsContext;

export class IdentityMruStore {
    public static identityMruMap: { [mruName: string]: IdentityMru } = {};

    public static getGlobalMruName() {
        return TFS_Host_TfsContext.TfsContext.getDefault().navigation.serviceHost.instanceId;
    }

    public static beginGetIdentityMru(mruName: string, readFromCache: boolean = true, callback?: (identityMru: IdentityMru) => void, errorCallback?: IErrorCallback, webContext?: Contracts_Platform.WebContext): void {
        var identityMru: IdentityMru = IdentityMruStore.identityMruMap[mruName];
        if (identityMru && readFromCache) {
            if ($.isFunction(callback)) {
                callback(identityMru);
            }
        }
        else {
            if (identityMru) {
                if (identityMru.isRefreshing()) {
                    if ($.isFunction(callback)) {
                        callback(identityMru);
                    }
                    return;
                }
                identityMru.setRefreshing(true);
            }
            var identityMruService = Service.getCollectionService(IdentityMruService, webContext);
            var tStart = new Date();
            identityMruService.beginGetMru(mruName, (mruItems: IIdentityReference[]) => {
                var tEnd = new Date();

                IdentityHelper.preProcessIdentities(mruItems, true);

                if (!identityMru) {
                    identityMru = new IdentityMru(mruName, mruItems);
                    IdentityMruStore.identityMruMap[mruName] = identityMru;
                }
                else {
                    identityMru.refresh(mruItems, true);
                    identityMru.setRefreshing(false);
                }

                var cidata: { [key: string]: any } = { "elapsedTime": tEnd.getTime() - tStart.getTime() };
                Telemetry.publishEvent(new Telemetry.TelemetryEventData("IdentityMru", "IdentityMruLoadTime", cidata));

                if ($.isFunction(callback)) {
                    callback(identityMru);
                }
            }, errorCallback);
        }
    }

    public static getIdentityMru(mruName?: string, webContext?: Contracts_Platform.WebContext): IdentityMru {
        if (!mruName) {
            mruName = IdentityMruStore.getGlobalMruName();
        }
        if (!IdentityMruStore.identityMruMap[mruName]) {
            IdentityMruStore.identityMruMap[mruName] = new IdentityMru(mruName, []);
            IdentityMruStore.beginGetIdentityMru(mruName, false, undefined, undefined, webContext);
        }

        return IdentityMruStore.identityMruMap[mruName];
    }
}

export class IdentityMruService extends Service.VssService {
    private _httpClient: TFS_Core_WebApi.IdentityMruHttpClient;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = tfsConnection.getHttpClient(TFS_Core_WebApi.IdentityMruHttpClient);
    }

    public beginGetMru(mruName: string, callback?: (mruList: IIdentityReference[]) => void, errorCallback?: IErrorCallback) {
        this._httpClient.beginGetMru(mruName).then(
            (mruList: IIdentityReference[]) => {
                if ($.isFunction(callback)) {
                    callback(mruList);
                }
            },
            errorCallback || VSS.handleError);
    }

    public beginPostMruIdentity(mruName: string, identityIds: string[], callback?: () => void, errorCallback?: IErrorCallback) {
        this._httpClient.beginPostMruIdentity(mruName, identityIds).then(
            () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            errorCallback || VSS.handleError);
    }


    public beginDeleteMruIdentity(mruName: string, identityIds: string[], callback?: () => void, errorCallback?: IErrorCallback) {
        this._httpClient.beginDeleteMruIdentity(mruName, identityIds).then(
            () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            errorCallback || VSS.handleError);
    }
}

export class IdentityMru {
    public static MRU_REFRESHED_EVENT = "mru-refreshed";

    private _mruItems: IIdentityReference[];
    private _mruName: string;
    private _idToMruItemMap: { [id: string]: IIdentityReference };
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _refreshing: boolean;

    constructor(mruName: string, mruItems: IIdentityReference[]) {
        this._mruName = mruName;
        this._refreshing = false;
        this._events = new Events_Handlers.NamedEventCollection();
        this.refresh(mruItems);
    }

    public refresh(mruItems: IIdentityReference[], fireEvent?: boolean) {
        this._mruItems = mruItems;
        this._idToMruItemMap = {};
        $.each(this._mruItems, (index, item: IIdentityReference) => {
            this._idToMruItemMap[item.id] = item;
        });

        if (fireEvent) {
            this.fireMruRefreshed();
        }
    }

    public addItems(identities: IIdentityReference[]) {
        var idsToAdd: string[] = [];
        var identitiesToAdd: IIdentityReference[] = [];
        $.each(identities, (index, identity: IIdentityReference) => {
            if (identity.id) {
                idsToAdd.push(identity.id);
                identitiesToAdd.push(identity);
                this._idToMruItemMap[identity.id] = identity;
            }
        });

        this._mruItems = IdentityHelper.union(this._mruItems, identitiesToAdd);

        if (idsToAdd.length > 0) {
            var tfsContext = TfsContext.getDefault();
            var identityMruService = Service.getCollectionService(IdentityMruService);
            identityMruService.beginPostMruIdentity(this._mruName, idsToAdd);
        }
    }

    public removeItems(identities: IIdentityReference[]) {
        var idsToRemove: string[] = [];
        var identitiesToRemove: IIdentityReference[] = [];
        $.each(identities, (index, identity: IIdentityReference) => {
            if (identity.id && this.isItemInMru(identity)) {
                idsToRemove.push(identity.id);
                identitiesToRemove.push(identity);
                delete this._idToMruItemMap[identity.id];
            }
        });

        this._mruItems = IdentityHelper.subtract(this._mruItems, identitiesToRemove);

        if (idsToRemove.length > 0) {
            var tfsContext = TfsContext.getDefault();
            var identityMruService = Service.getCollectionService(IdentityMruService);
            identityMruService.beginDeleteMruIdentity(this._mruName, idsToRemove);
        }
    }

    public setRefreshing(refreshing: boolean) {
        this._refreshing = refreshing;
    }

    public isRefreshing(): boolean {
        return this._refreshing;
    }

    public isItemInMru(identity: IIdentityReference): boolean {
        return identity && identity.id && this._idToMruItemMap[identity.id] ? true : false
    }

    public getMruItems(): IIdentityReference[] {
        return this._mruItems;
    }

    /**
     * Attaches a mru refreshed event handler.
     * This event handler will be triggered for all changed work items that are
     * managed by work item manager.
     * 
     * @param handler Event handler callback.
     */
    public attachMruRefreshed(handler: IEventHandler) {

        this._events.subscribe(IdentityMru.MRU_REFRESHED_EVENT, <any>handler);
    }

    /**
     * Removes identity mru refreshed handler from the event handler list.
     * 
     * @param handler Event handler callback.
     */
    public detachMruRefreshed(handler: IEventHandler) {

        this._events.unsubscribe(IdentityMru.MRU_REFRESHED_EVENT, <any>handler);
    }

    public fireMruRefreshed() {
        this._events.invokeHandlers(IdentityMru.MRU_REFRESHED_EVENT, this.getMruItems());
    }
}

export class BaseIdentityProvider {
    public beginAadIdentitySearch(searchTerm: string, identityType: IdentityFilter, successCallback?: IResultCallback, errorCallback?: IErrorCallback, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        var tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        var url = tfsContext.getActionUrl("searchAadIdentities", "identity", { project: "", team: "", area: "api" });
        Ajax.getMSJSON(url, { searchTerm: searchTerm, identityType: identityType }, successCallback, errorCallback);
    }

    public beginTfsIdentitySearch(searchTerm: string, identityType: IdentityFilter, successCallback?: IResultCallback, errorCallback?: IErrorCallback, tfsContext?: TFS_Host_TfsContext.TfsContext) {

        var tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        var url = tfsContext.getActionUrl("searchIdentities", "wit", { project: "", team: "", area: "api" });
        Ajax.getMSJSON(url, { searchTerm: searchTerm, identityType: identityType }, successCallback, errorCallback);
    }
}
