import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");

export class DetailsChangeListSelection {
    public mpath: string;
    public mversion: string;
    public oversion: string;
    public opath: string;
    public canCompare: boolean = false;
    public discussionId: number = 0;
    public changeType: VCLegacyContracts.VersionControlChangeType;
    public gitObjectType: VCOM.GitObjectType;
    public discussionSelectionEventState: any;

    public path: string;
    public version: string;

    constructor(mpath: string, mversion: string, opath: string, oversion: string, changeType: VCLegacyContracts.VersionControlChangeType, gitObjectType: VCOM.GitObjectType, discussionId?: number, discussionSelectionEventState?: any) {
        this.mpath = mpath;
        this.mversion = mversion;
        this.opath = opath;
        this.oversion = oversion;
        this.canCompare = VCOM.ChangeType.isEdit(changeType);
        this.discussionId = discussionId;
        this.changeType = changeType;
        this.gitObjectType = gitObjectType;
        this.discussionSelectionEventState = discussionSelectionEventState;

        if (this.mpath) {
            this.path = this.mpath;
            this.version = this.mversion;
        }
        else {
            this.path = this.opath;
            this.version = this.oversion;
        }
    }

    public IsFileEqual(selection: DetailsChangeListSelection): boolean {
        return this.mpath === selection.mpath &&
            this.opath === selection.opath &&
            this.mversion === selection.mversion;
    }

    public getPath() {
        return this.path;
    }
}
