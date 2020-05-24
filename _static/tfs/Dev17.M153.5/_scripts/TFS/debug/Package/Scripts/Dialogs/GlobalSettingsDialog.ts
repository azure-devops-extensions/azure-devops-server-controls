/// <reference types="jquery" />
import * as Controls from "VSS/Controls";
import * as Dialogs from "VSS/Controls/Dialogs";
import {
    ITabControlOption,
    ITabGroupRegistration,
    ITabRegistration,
    TabControl,
    TabControlSavingMode,
    TabControlsRegistration
} from "VSS/Controls/TabContent";
import * as Actions from "VSS/Events/Action";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { PermissionsTab } from "Package/Scripts/Dialogs/GlobalSettingsDialog.Permissions";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Dialogs/GlobalSettingsDialog";

import { GlobalSettingsTabControlIds } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

const delegate = Utils_Core.delegate;

interface IButton {
    id: string;
    text: string;
    click: () => void;
    disabled?: string;
}

export class GlobalSettingsDialogOptions {
    public defaultTabId: string;
}

export class GlobalSettingsDialog extends Dialogs.ModalDialogO<any> {
    private static ON_RESIZE_THROTTLE_TIME = 20;
    private static hasRegistered: boolean = false;

    private _control: TabControl;
    private _resizeThrottleDelegate: IArgsFunctionR<any>;

    public static show(options?: any): any {
        return Dialogs.Dialog.show(GlobalSettingsDialog, options);
    }

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(
            $.extend(
                {
                    beforeClose: () => this.beforeClose,
                    buttons: this._getButtons(false),
                    minWidth: 600,
                    width: 800,
                    minHeight: 450,
                    height: 500,
                    attachResize: true,
                    dialogClass: "bowtie configuration-dialog"
                },
                options
            )
        );
    }

    public initialize() {
        super.initialize();

        this.setTitle(
            Utils_String.format(PackageResources.GlobalSettingsDialog_Title, PackageResources.AzureArtifacts)
        );

        const tabCollectionOption: ITabControlOption = {
            id: GlobalSettingsTabControlIds.TAB_CONTROL_ID,
            defaultTabId: this._options.defaultTabId,
            errorMessage: PackageResources.GlobalSettingsDialog_GenericServerError,
            savingMode: TabControlSavingMode.SAVE_ON_CONTROL
        };

        if (GlobalSettingsDialog.hasRegistered) {
            TabControlsRegistration.clearRegistrations();
        }

        this._registerTabGroup();
        this._registerPermissionsTab();
        GlobalSettingsDialog.hasRegistered = true;

        this._control = <TabControl>(
            Controls.Control.createIn<ITabControlOption>(TabControl, this.getElement(), tabCollectionOption)
        );

        this._control._bind(TabControl.EVENT_DIRTY_STATE_CHANGED, delegate(this, this._refreshButton));
        this._resizeThrottleDelegate = Utils_Core.throttledDelegate(
            this._control,
            GlobalSettingsDialog.ON_RESIZE_THROTTLE_TIME,
            this._control.onResize
        );
        this._bind("dialogresize", this._resizeThrottleDelegate);
        this._bind(window, "resize", this._resizeThrottleDelegate);
        $("#ok").attr("aria-disabled", "true");
    }

    private _registerTabGroup() {
        const group: ITabGroupRegistration = {
            tabControlId: GlobalSettingsTabControlIds.TAB_CONTROL_ID,
            id: GlobalSettingsTabControlIds.TAB_GROUP_ID,
            title: PackageResources.GlobalSettingsDialog_TabsTitle
        };
        TabControlsRegistration.registerTabGroup(group);
    }

    private _registerPermissionsTab() {
        const permissionsOptions: ITabRegistration<any> = {
            groupId: GlobalSettingsTabControlIds.TAB_GROUP_ID,
            id: "0",
            title: PackageResources.GlobalSettingsDialogPermissions_Title,
            tabContent: PermissionsTab,
            tabContentOptions: {}
        } as ITabRegistration<any>;

        TabControlsRegistration.registerTab(permissionsOptions);
    }

    private _refreshButton() {
        const buttons = this._getButtons(this._control.isDirty());
        const dialog = this.getElement().parent();
        for (const button of buttons) {
            dialog.find("#" + button.id).button("option", "label", button.text);
            this._updateButton(button.id, button.disabled !== "disabled");
        }
    }

    private _getButtons(editModeOn: boolean): IButton[] {
        return [
            {
                id: "ok",
                text: PackageResources.Dialog_SaveButtonText,
                click: delegate(this, this.onOkClick),
                disabled: editModeOn ? null : "disabled"
            },
            {
                id: "cancel",
                text: PackageResources.Dialog_CancelButtonText,
                click: delegate(this, this.onCancelClick)
            }
        ];
    }

    /**
     * Updates button's status
     * @param button The button Id
     * @param enabled True if the button needs to be enabled
     */
    private _updateButton(button: string, enabled: boolean) {
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button, enabled });
        $("#" + button).attr("aria-disabled", "true");
    }

    public beforeClose(e?, ui?): boolean {
        return (
            (!this._control ||
                !this._control.isDirty() ||
                window.confirm(PackageResources.GlobalSettingsDialog_UnsavedChangesMessage)) &&
            this._evaluateOnCloseStrategy()
        ); // Ensure that the onSave delegates get called on closing the CSC dialog using the x button
    }

    private _evaluateOnCloseStrategy(): boolean {
        if (this._control) {
            if (this._control.getRefreshOnCloseStatus()) {
                Actions.getService().performAction(Actions.CommonActions.ACTION_WINDOW_RELOAD);
            } else {
                this._control.invokeSaveCallbacks();
                this._control.clearOnSavedCallbackList();
            }
        }
        return true; // Return true to ensure that the dialog close always evaluates this
    }

    public onOkClick(e?: JQueryEventObject) {
        this.updateOkButton(false);
        this._updateButton("close", false);
        const savingCompleted = () => {
            this._evaluateOnCloseStrategy();
            this.close();
        };
        const savingError = () => {
            this._refreshButton();
        };
        this._control.beginSave(e).then(savingCompleted, savingError);
    }

    public onCancelClick(e?: JQueryEventObject) {
        this._evaluateOnCloseStrategy();
        this.close();
    }

    public dispose() {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
        this._unbind("dialogresize", this._resizeThrottleDelegate);
        this._unbind(window, "resize", this._resizeThrottleDelegate);
        this._resizeThrottleDelegate = null;
        super.dispose();
    }
}
