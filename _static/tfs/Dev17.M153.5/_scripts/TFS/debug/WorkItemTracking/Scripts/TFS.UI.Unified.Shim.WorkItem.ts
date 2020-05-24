// Auto converted from WorkItemTracking/Scripts/TFS.UI.Unified.Shim.WorkItem.debug.js

/// <reference types="jquery" />

declare var Host_OpenArtifactLink, Host_OpenURL, Host_OpenWorkItemLink, Host_WorkItemDirtyChanged, Host_DiscardNewWorkItem, Host_WorkItemSaved, Host_WorkItemSaveFailed;

import VSS = require("VSS/VSS");
import Events_Document = require("VSS/Events/Document");
import Events_Action = require("VSS/Events/Action");
import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_WorkItemTracking_Controls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");

const hostDocSvc = Events_Document.getService();
const hostActionSvc = Events_Action.getService();

if (typeof (Host_OpenArtifactLink) === "function") {
    hostActionSvc.registerActionWorker(Artifacts_Services.Artifact.ACTION_ARTIFACT_EXECUTE, function (actionArgs, next) {
        /*jslint newcap: false */
        const handled = Host_OpenArtifactLink(actionArgs.artifact.getUri());
        /*jslint newcap: true */
        if (handled === false) {
            next(actionArgs);
        }
    }, 90);
}

if (typeof (Host_OpenURL) === "function") {
    hostActionSvc.registerActionWorker(Events_Action.CommonActions.ACTION_WINDOW_OPEN, function (actionArgs, next) {
        /*jslint newcap: false */
        const handled = Host_OpenURL(actionArgs.url);
        /*jslint newcap: true */
        if (handled === false) {
            next(actionArgs);
        }
    }, 90);
}

if (typeof (Host_OpenWorkItemLink) === "function") {
    hostActionSvc.registerActionWorker(TFS_WorkItemTracking_Controls.WorkItemActions.ACTION_WORKITEM_OPEN, function (actionArgs, next) {
        /*jslint newcap: false */
        Host_OpenWorkItemLink(actionArgs.id);
        /*jslint newcap: true */
    }, 90);
}

hostActionSvc.registerActionWorker(TFS_WorkItemTracking_Controls.WorkItemActions.ACTION_WORKITEM_DISCARD_IF_NEW, function (actionArgs, next) {
    if (typeof (Host_DiscardNewWorkItem) === "function") {
        /*jslint newcap: false */
        Host_DiscardNewWorkItem();
        /*jslint newcap: true */
    }
}, 90);

hostActionSvc.registerActionWorker(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, function (actionArgs, next) {
    return undefined;
}, 90);

hostDocSvc.addModifiedChangedListener(function (source, args) {
    if (typeof (Host_WorkItemDirtyChanged) === "function") {
        /*jslint newcap: false */
        Host_WorkItemDirtyChanged(args.moniker);
        /*jslint newcap: true */
    }
});

export function save() {
    const doc = hostDocSvc.getActiveDocument();

    doc.save(
        function (args) {
            if (typeof (Host_WorkItemSaved) === "function") {
                /*jslint newcap: false */
                Host_WorkItemSaved(doc.getMoniker());
                /*jslint newcap: true */
            }
        },
        function (error) {
            if (typeof (Host_WorkItemSaveFailed) === "function") {
                /*jslint newcap: false */
                Host_WorkItemSaveFailed(error.message);
                /*jslint newcap: true */
            }
        }
    );
}

export function isModified() {
    const hostReturn = hostDocSvc.isModified();
    return hostReturn;
}

export function getWorkItemID() {
    const doc = <any>hostDocSvc.getActiveDocument();
    const hostReturn = doc._workItem.id;
    return hostReturn;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.UI.Unified.Shim.WorkItem", exports);
