/// <reference types="jquery" />

import Events_Action = require("VSS/Events/Action");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");
import VSS = require("VSS/VSS");

// Modules for compilation/type support only (no direct require statement)
import TFS_Requirements_Feedback_Views_NO_REQUIRE = require("Requirements/Scripts/TFS.Requirements.Feedback.Views");
import Dialogs_NO_REQUIRE = require("VSS/Controls/Dialogs");

Events_Action.getService().registerActionWorker(HostUIActions.ACTION_REQUEST_FEEDBACK, function (actionArgs, next) {
    VSS.using(["Requirements/Scripts/TFS.Requirements.Feedback.Views", "VSS/Controls/Dialogs"], (_TFS_Requirements_Feedback_Views: typeof TFS_Requirements_Feedback_Views_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
        _Dialogs.Dialog.beginExecuteDialogAction(() => {
            _Dialogs.show(_TFS_Requirements_Feedback_Views.RequestView);
        });
    });
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Requirements.Registration.HostPlugins", exports);
