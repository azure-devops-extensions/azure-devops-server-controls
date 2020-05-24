import Artifacts_Services = require("VSS/Artifacts/Services");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Events_Document = require("VSS/Events/Document");
import VSS = require("VSS/VSS");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

export class WorkItemDocument implements Events_Document.Document {
    private _workItem: WITOM.WorkItem;
    constructor(workItem: WITOM.WorkItem) {
        ///<param name="workItem" type="WorkItem" />
        this._workItem = workItem;
    }

    public save(successCallback, errorCallback?: IErrorCallback) {
        this._workItem.beginSave(successCallback, errorCallback);
    }
    public getMoniker() {
        return Artifacts_Services.LinkingUtilities.encodeUri({ tool: Artifacts_Constants.ToolNames.WorkItemTracking, type: Artifacts_Constants.ArtifactTypeNames.WorkItem, id: this._workItem.id.toString() });
    }

    public getWorkItem(): WITOM.WorkItem {
        return this._workItem;
    }
}

VSS.initClassPrototype(WorkItemDocument, {
    _workItem: null
});