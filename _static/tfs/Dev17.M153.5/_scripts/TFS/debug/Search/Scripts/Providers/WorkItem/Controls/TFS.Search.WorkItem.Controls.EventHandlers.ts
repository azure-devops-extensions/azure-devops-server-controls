// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict"

import Events_Action_NO_REQUIRE = require("VSS/Events/Action");
import VSS = require("VSS/VSS");
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

export class WorkItemEventHandlers {
    public static openModalDialogForWorkItem(workItemId: number) {
        WITDialogShim.showWorkItemById(workItemId);
    }
}