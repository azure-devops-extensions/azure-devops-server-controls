//Auto converted from Presentation/Scripts/TFS/TFS.UI.Unified.Shim.BuildReport.debug.js

/// <reference types="jquery" />



declare var Host_OpenArtifactLink, Host_OpenWorkItemLink, Host_OpenURL, Host_DeleteBuild, Host_BuildStopped, Host_BuildPropertyChanged;



import Artifacts_Services = require("VSS/Artifacts/Services");
import Events_Action = require("VSS/Events/Action");
import Events_Document = require("VSS/Events/Document");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

import TFS_WorkItemTracking_Controls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");

var actionSvc = Events_Action.getService();
if (typeof (Host_OpenArtifactLink) === 'function') {
    actionSvc.registerActionWorker(Artifacts_Services.Artifact.ACTION_ARTIFACT_EXECUTE, function (actionArgs, next) {
        /*jslint newcap: false */
        var handled = Host_OpenArtifactLink(actionArgs.artifact.getUri());
        /*jslint newcap: true */
        if (handled === false) {
            next(actionArgs);
        }
    }, 90);
}

if (typeof (Host_OpenWorkItemLink) === 'function') {
    actionSvc.registerActionWorker(TFS_WorkItemTracking_Controls.WorkItemActions.ACTION_WORKITEM_OPEN, function (actionArgs, next) {
        /*jslint newcap: false */
        Host_OpenWorkItemLink(actionArgs.id);
        /*jslint newcap: true */
    }, 90);
}

if (typeof (Host_OpenURL) === 'function') {
    actionSvc.registerActionWorker(Events_Action.CommonActions.ACTION_WINDOW_OPEN, function (actionArgs, next) {
        /*jslint newcap: false */
        var handled = Host_OpenURL(actionArgs.url);
        /*jslint newcap: true */
        if (handled === false) {
            next(actionArgs);
        }
    }, 90);
}

var hostDocSvc = Service.getLocalService(Events_Document.DocumentService);

if (typeof (hostDocSvc.addDeleteListener) === 'function') {
    hostDocSvc.addDeleteListener(function (source, args) {
        if (typeof (Host_DeleteBuild) === 'function') {
            /*jslint newcap: false */
            Host_DeleteBuild(args.moniker);
            /*jslint newcap: true */
        }
    });
}

if (typeof (hostDocSvc.addBuildStoppedListener) === 'function') {
    hostDocSvc.addBuildStoppedListener(function (source, args) {
        if (typeof (Host_BuildStopped) === 'function') {
            /*jslint newcap: false */
            Host_BuildStopped(args.moniker);
            /*jslint newcap: true */
        }
    });
}

if (typeof (hostDocSvc.addBuildPropertyChangedListener) === 'function') {
    hostDocSvc.addBuildPropertyChangedListener(function (source, args) {
        if (typeof (Host_BuildPropertyChanged) === 'function') {
            /*jslint newcap: false */
            Host_BuildPropertyChanged(args.moniker, args.property, args.value);
            /*jslint newcap: true */
        }
    });
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.UI.Unified.Shim.BuildReport", exports);
