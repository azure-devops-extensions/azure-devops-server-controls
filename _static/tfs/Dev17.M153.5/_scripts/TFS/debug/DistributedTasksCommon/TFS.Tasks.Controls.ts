import ComboControls = require("VSS/Controls/Combos");
import VSS = require("VSS/VSS");
import Q = require("q");
import Controls = require("VSS/Controls");
import IdentityPickerControls = require("VSS/Identities/Picker/Controls");
import IdentityPicker_RestClient = require("VSS/Identities/Picker/RestClient");
import Utils_UI = require("VSS/Utils/UI");

const keyCode = Utils_UI.KeyCode;

export interface IFetchingComboOptions extends ComboControls.IComboOptions {
    refreshData: () => Q.Promise<boolean>;
}

export class FetchingCombo extends ComboControls.ComboO<IFetchingComboOptions> {

    public toggleDropDown(): void {
        var fetchDone = this._options.refreshData();
        if (!!fetchDone) {
            fetchDone.then(() => {
                super.toggleDropDown();
            });
        } else {
            super.toggleDropDown();
        }
    }

    public showDropPopup(e?: JQueryEventObject): void {
        var fetchDone = this._options.refreshData();
        if (!!fetchDone) {
            fetchDone.then(() => {
                super.showDropPopup();
            });
        } else {
            super.showDropPopup();
        }
    }

    public _onInputKeyDown(e?: JQueryEventObject): any {
        if (!e.altKey || e.keyCode !== keyCode.DOWN) {
            return super._onInputKeyDown(e);
        }

        var fetchDone = this._options.refreshData();
        if (!!fetchDone) {
            fetchDone.then(() => {
                return super._onInputKeyDown(e);
            });
        } else {
            return super._onInputKeyDown(e);
        }
    }         
}

export class MultiSelectIdentityPickerControl extends Controls.BaseControl {
    public static CONTROL_ROOT: string = "task-editor-identity-picker";

    private static _distributedCommonPickerConsumerId: string = "33553f9f-9d2b-4d6a-9a6c-209371d5ef99";
    private _identityPickerControl: IdentityPickerControls.IdentityPickerSearchControl;

    public initialize() {
        super.initialize();

        var $rootElem: JQuery = this.getElement();
        $rootElem.addClass(MultiSelectIdentityPickerControl.CONTROL_ROOT);

        this._identityPickerControl = Controls.create(IdentityPickerControls.IdentityPickerSearchControl, $rootElem, <IdentityPickerControls.IIdentityPickerSearchOptions>{
            items: [],
            identityType: { User: true, Group: true },
            multiIdentitySearch: true,
            operationScope: { IMS: true },
            showMru: false,
            consumerId: MultiSelectIdentityPickerControl._distributedCommonPickerConsumerId,
            showContactCard: true,
            callbacks: {
                onItemSelect: () => { this._fireChange() }
            }
        });

        this._bind(IdentityPickerControls.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
            // fired when the user removes an item by clicking on the delete icon on an item in multiselect control
            this._fireChange();
        });
    }

    public setValue(selectedItems: string): void {
        try {
            var deserializedValues = JSON.parse(selectedItems);
            if ($.isArray(deserializedValues)) {
                this._identityPickerControl.setEntities(null, deserializedValues);
            }
        }
        catch (ex) {
            // Reading previous email recipients is best-effort. Ignore errors reading registry values.
        }
    }

    /**
     * Returns an array of identities (GUIDs) currently selected in this picker control.
     */
    public getSelectedIdentities(): { existingUsers: string[], newUsers: string[], unresolvedEntityIds: string[] } {
        let resolvedEntities = this._identityPickerControl.getIdentitySearchResult().resolvedEntities;
        let selectedIdentities = [];
        let unresolvedEntityIds = [];

        if (resolvedEntities && resolvedEntities.length > 0) {
            resolvedEntities.forEach((identity: IdentityPicker_RestClient.IEntity, index: number, array: IdentityPicker_RestClient.IEntity[]) => {
                if (identity.localId) {
                    selectedIdentities.push(identity.localId);
                }
                else if (identity.originId) {
                    unresolvedEntityIds.push(identity.originId);
                }
            });
        }

        return {
            existingUsers: selectedIdentities,
            newUsers: [],
            unresolvedEntityIds: unresolvedEntityIds
        };
    }

    public setEnable(enable: boolean) {
        if (enable) {
            this._identityPickerControl.disableReadOnlyMode();
            this._element.find(".identity-picker-input").removeClass("identity-picker-element-hide");
        }
        else {
            this._identityPickerControl.enableReadOnlyMode();
            this._element.find(".identity-picker-input").addClass("identity-picker-element-hide");
        }
    }

    public getSelectedEntities(): IdentityPicker_RestClient.IEntity[] {
        return this._identityPickerControl.getIdentitySearchResult().resolvedEntities || [];
    }
    
    public dispose() {
        this._unbind(IdentityPickerControls.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT);
        this._identityPickerControl.dispose();
        super.dispose();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Controls", exports);