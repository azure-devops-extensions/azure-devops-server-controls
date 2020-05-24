
import * as Store_Base from "VSS/Flux/Store";

import { ITeamSettingData } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import { SkypeTeamTabActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActions";
import { IFeatureConfigStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfigStore";
import { SkypeTeamTabBusinessLogic } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabBusinessLogic";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

export class SkypeTeamTabStore extends Store_Base.Store implements IFeatureConfigStore<ITeamSettingData> {
    private _value: ITeamSettingData;
    private _actions: SkypeTeamTabActions;
    private _logic: SkypeTeamTabBusinessLogic;

    constructor(actions: SkypeTeamTabActions) {
        super();
        this._actions = actions;
        this._addActionListeners();
        this._logic = SkypeTeamTabBusinessLogic.getInstance();

    }

    public getValue(): ITeamSettingData {
        return this._value;
    }

    private _addActionListeners() {
        this._actions.initialize.addListener(this._onChange, this);
        this._actions.settingChanged.addListener(this._onChange, this);
        this._actions.setMessage.addListener(this._setErrorMessage, this);
    }

    private _onChange(data: ITeamSettingData) {
        this._value = data;
        this.emitChanged();
    }

    /**
     * Set the server error message
     * @param {string} message - The error message
     */
    private _setErrorMessage(message: string) {
        if (this._value) {
            this._value.message = message;
        }
        this.emitChanged();
    }

    public isValueValid(): boolean {
        return this._logic.validateSetting(this._value);
    }

    public getErrorMessage(): string {
        let message = null;
        if (this._value) {
            message = this._value.message;
        }

        return message;
    }

    public dismissErrorMessage(): void {
        this._value.message = null;
        this.emitChanged();
    }

    public getTabSettings(): microsoftTeams.settings.Settings {
        return {
            entityId: GUIDUtils.newGuid(),
            contentUrl: this._logic.toPageUrl(this._value),
            suggestedDisplayName: this._logic.generateName(this._value),
            websiteUrl:  this._logic.toWebsiteUrl(this._value)
        }
    }
}

