import * as Action_Base from "VSS/Flux/Action";
import {ITeamSettingData} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";

/**
 * SkypeTeamTab specific actions
 */
export class SkypeTeamTabActions {
    public initialize: Action_Base.Action<ITeamSettingData>;

    public settingChanged: Action_Base.Action<ITeamSettingData>;

    public setMessage: Action_Base.Action<string>;

    constructor() {
        this.initialize = new Action_Base.Action<ITeamSettingData>();
        this.settingChanged = new Action_Base.Action<ITeamSettingData>();
        this.setMessage = new Action_Base.Action<string>();
    }
}