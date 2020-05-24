
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

var handleError = VSS.handleError;

/**
 * Represents a document to a host.
 *  A host can be tha browser, an IDE (e.g. Eclipse, Visual Studio) 
 */
export interface RunningDocument {

    /**
    * Method which returns true if the document is currently in a dirty-state which should block (prompt) attempts to navigate-away.
    */
    isDirty(): boolean;

    /**
    * (Optional) Callback method called before a save operation is performed on the document service
    */
    beginSave?: (successCallback: IResultCallback, errorCallback?: IErrorCallback) => void;

    /**
    * (Optional) Callback method called to get the titles of the currently dirty items.
    */
    getDirtyDocumentTitles?: (maxTitle?: number) => string[];
}

export interface RunningDocumentsTableEntry {
    document: RunningDocument;
    moniker: string;
}

export class RunningDocumentsTable implements Service.ILocalService {

    private _runningDocEntries: RunningDocumentsTableEntry[];

    constructor() {
        this._runningDocEntries = [];  // running document table
        this._registerUnloadEvent();

        Events_Services.getService().attachEvent(HubEventNames.PostXHRNavigate, (sender: any, args: IHubEventArgs) => {
            // Clear the running document entries on XHR navigate
            this._runningDocEntries = [];
        });
    }

    /**
     *   Add specified document to the running document table
     *   The document must have a method named isDirty that returns boolean
     * 
     * @param moniker Name for this document type
     * @param document Object that will be called to determine state (e.g. dirty//modified)
     * @return A handle to the entry in the running document table. The handle can be used to remove the entry
     */
    public add(moniker: string, document: RunningDocument): RunningDocumentsTableEntry {
        var entry = { moniker: moniker, document: document };
        Diag.Debug.assertIsFunction(document.isDirty, "RunningDocumentsTable.add() parameter document must have isDirty function");
        this._runningDocEntries.push(entry);
        return entry;
    }

    /**
     *   Remove an entry from the running document table
     * 
     * @param entry The handle to the entry that will be removed. The handle is returned from the add function
     */
    public remove(entry: RunningDocumentsTableEntry): void {
        this._runningDocEntries = Utils_Array.subtract(this._runningDocEntries, [entry]);
    }

    /**
     *   Check if the specified document is modified.  If specified moniker is null or undefined
     *   will return true if any currently opened documents are modified
     * 
     * @param moniker Name for this document type
     * @return True if the specified moniker\document is modified, false otherwise.
     *   Null or undefined moniker will return true if any opened documents are modified
     */
    public isModified(moniker?: string): boolean {
        if (moniker) {
            var entry = this._runningDocEntries.filter(e => e.moniker === moniker)[0];
            if (!entry) {
                throw new Error(`Document ${moniker} not found.`);
            }

            return entry.document.isDirty();
        }

        return this._isAnyModified();
    }

    public beginSave(callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;
        var dirtyDocs: RunningDocument[] = [];
        var index = 0;

        function failed(error: TfsError) {
            handleError(error, errorCallback, that);
        }

        $.each(this._runningDocEntries, function (index: number, entry: RunningDocumentsTableEntry) {
            if (entry.document.isDirty() && $.isFunction((<any>entry.document).beginSave)) {
                dirtyDocs.push(<RunningDocument>entry.document);
            }
        });

        function next() {
            var document = dirtyDocs[index++];

            if (document) {
                document.beginSave(function () {
                    Utils_Core.delay(that, 0, next);
                }, failed);
            } else {
                if ($.isFunction(callback)) {
                    callback.call(that);
                }
            }
        }

        next();
    }

    public getUnsavedItemsMessage(): string {
        var i: number;
        var l: number;
        var entry: RunningDocumentsTableEntry;
        var titles: string[];
        var messages: string[] = [];
        var title: string;
        var titleIndex: number;
        var titleLength: number;

        for (i = 0, l = this._runningDocEntries.length; i < l; i++) {
            entry = this._runningDocEntries[i];
            var doc = <RunningDocument>entry.document;
            if (doc.isDirty() && $.isFunction(doc.getDirtyDocumentTitles)) {

                titles = doc.getDirtyDocumentTitles(6);
                for (titleIndex = 0, titleLength = titles.length; titleIndex < titleLength; titleIndex++) {
                    title = titles[titleIndex];
                    if (messages.length === 5) {
                        messages.push(Resources_Platform.UnsavedChangesMore);
                        break;
                    }
                    if (title.length > 55) {
                        title = title.substr(0, 52) + "...";
                    }
                    messages.push(title);
                }

                if (messages.length > 5) {
                    break;
                }
            }
        }

        if (messages.length === 0) {
            return Resources_Platform.UnsavedChanges;
        }
        else {
            return Resources_Platform.UnsavedChangesWithNames + "\n" + messages.join("\n");
        }
    }

    private _isAnyModified(): boolean {
        for (var i = 0, l = this._runningDocEntries.length; i < l; i++) {
            var entry = this._runningDocEntries[i];
            if (entry.document.isDirty()) {
                return true;
            }
        }
        return false;
    }

    private _registerUnloadEvent() {
        Events_Action.getService().registerActionWorker(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, (actionArg, next) => {
            if (this.isModified()) {
                return this.getUnsavedItemsMessage();
            }
        });

        // Confirm user wants to navigate away if modified documents
        // Note: Browsers own this dialog and we do not have control
        // over buttons and layout, etc.
        // By returning undefined/nothing no message box is displayed
        const $window = $(window);
        $window.bind("beforeunload", () => {
            try {
                return Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, {});
            }
            catch (ex) {
                alert(ex);
            }
        });
    }
}

export interface Document {
    save(successCallback: IResultCallback, errorCallback?: IErrorCallback): void;
    getMoniker(): string;
}

/**
* Service for host environment to interact with documents in Web Access
*  A host environment can be tha browser, an IDE (e.g. Eclipse, Visual Studio) 
*/
export class DocumentService implements Service.ILocalService {
    private _activeDocument: Document;
    private _runningDocumentsTable: RunningDocumentsTable;

    constructor() {
        this._runningDocumentsTable = getRunningDocumentsTable();
    }

    public addDeleteListener(callBack: Function) {
        Events_Services.getService().attachEvent("tfs-document-delete", callBack);
    }

    public removeDeleteListener(callBack: IEventHandler) {
        Events_Services.getService().detachEvent("tfs-document-delete", callBack);
    }

    public addBuildPropertyChangedListener(callBack: IEventHandler) {
        Events_Services.getService().attachEvent("tfs-document-build-property-changed", callBack);
    }

    public removeBuildPropertyChangedListener(callBack: IEventHandler) {
        Events_Services.getService().detachEvent("tfs-document-build-property-changed", callBack);
    }

    public addBuildStoppedListener(callBack: IEventHandler) {
        Events_Services.getService().attachEvent("tfs-document-build-stopped", callBack);
    }

    public removeBuildStoppedListener(callBack: IEventHandler) {
        Events_Services.getService().detachEvent("tfs-document-build-stopped", callBack);
    }

    public addModifiedChangedListener(callBack: IEventHandler) {
        Events_Services.getService().attachEvent("tfs-document-modified-change", callBack);
    }

    public removeModifiedChangedListener(callBack: IEventHandler) {
        Events_Services.getService().detachEvent("tfs-document-modified-change", callBack);
    }

    public isModified(args?: string): boolean {
        return this._runningDocumentsTable.isModified(args);
    }

    public save(successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        var doc = this.getActiveDocument();

        if (doc) {
            doc.save(successCallback, errorCallback);
        }
        else {
            return this._runningDocumentsTable.beginSave(successCallback, errorCallback);
        }
    }

    public getActiveDocument(): Document {
        return this._activeDocument;
    }

    public setActiveDocument(activeDocument: Document) {
        this._activeDocument = activeDocument;
    }
}

export function getService(): DocumentService {
    return Service.getLocalService(DocumentService);
}

export function getRunningDocumentsTable(): RunningDocumentsTable {
    return Service.getLocalService(RunningDocumentsTable);
}
