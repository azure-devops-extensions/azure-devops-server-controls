/// <amd-dependency path="jQueryUI/core"/>
/// <reference types="jquery" />
 
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Dialogs = require("VSS/Controls/Dialogs");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import ControlsCommon = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Menus = require("VSS/Controls/Menus");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export class DiscussionThreadControlManagerBase {

    private _discussionThreadControlsById: any;

    constructor () {
        this._discussionThreadControlsById = {};
    }

    public registerThreadControl(threadControl: any) {
        this._discussionThreadControlsById[threadControl.getThread().id] = threadControl;
    }

    public getThreadControl(threadId: number) {
        return this._discussionThreadControlsById[threadId];
    }

    public unregisterThreadControl(threadControl) {
        var threadId = threadControl.getThread().id;
        delete this._discussionThreadControlsById[threadId];
    }

    public clearDiscussionThreads() {
        $.each(this._discussionThreadControlsById, (i, threadControl) => {
            threadControl.dispose();
        });
        this._discussionThreadControlsById = {};
    }
}