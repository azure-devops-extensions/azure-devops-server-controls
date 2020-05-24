import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Utils_Culture = require("VSS/Utils/Culture");
import Events_Document = require("VSS/Events/Document");

export module MenuBarCommandHelper {
    export function getMenusBarInitialCommands(isExtensionCommands: boolean, isAdmin: boolean, isAccountOwner: boolean): Menus.ICommand[] {
        return <Menus.ICommand[]>[
            { id: "addUser", text: AccountResources.AddUser, icon: "bowtie-icon bowtie-math-plus", hidden: isExtensionCommands, title: AccountResources.AddUserToolTips },
            { id: "editUser", text: AccountResources.EditUser, icon: "icon-delete", noIcon: true, hidden: isExtensionCommands, title: AccountResources.EditUserToolTips },
            { id: "removeUser", text: AccountResources.DeleteUser, icon: "icon-delete", noIcon: true, hidden: isExtensionCommands, title: AccountResources.DeleteUserToolTips },
            { id: "assignUsers", text: AccountResources.AssignUsers, icon: "bowtie-icon bowtie-math-plus", hidden: !isExtensionCommands },
            { id: "assignAllUsers", text: AccountResources.AssignAllUsers, icon: "iconh-delete", noIcon: true, hidden: !isExtensionCommands },
            { id: "unassign", text: AccountResources.Unassign, icon: "icon-delete", noIcon: true, hidden: !isExtensionCommands },
            { id: "exportCSV", text: AccountResources.ExportCSV, disabled: !(isAdmin || isAccountOwner), icon: "bowtie-icon bowtie-transfer-download" },
            { id: "refresh", text: AccountResources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh", showText: false }
        ];
    }

    export function getMenusBarUpdateCommandsWhenNoUserIsSelected(isExtensionCommands: boolean, isAdmin: boolean, isAccountOwner: boolean, isTrial: boolean, hasIncludedQty: boolean): Menus.ICommand[] {
        var cannotAdd = !(isAdmin || isAccountOwner);
        return <Menus.ICommand[]>[
            { id: "addUser", disabled: cannotAdd, hidden: isExtensionCommands },
            { id: "editUser", disabled: true, hidden: isExtensionCommands },
            { id: "removeUser", disabled: true, hidden: isExtensionCommands },
            { id: "assignUsers", disabled: cannotAdd || (isTrial && !hasIncludedQty), hidden: !isExtensionCommands },
            { id: "assignAllUsers", disabled: cannotAdd || (isTrial && !hasIncludedQty), hidden: !isExtensionCommands},
            { id: "unassign", disabled: true, hidden: !isExtensionCommands },
            { id: "exportCSV", text: AccountResources.ExportCSV, disabled: cannotAdd, icon: "bowtie-icon bowtie-transfer-download" },
            { id: "refresh" }
        ];
    }

    export function getMenusBarUpdateByBitFieldAndExtensionState(isExtensionCommands: boolean, bools: boolean[], isAdmin: boolean, isAccountOwner: boolean) {
        return <Menus.ICommand[]>[
            { id: "addUser", text: AccountResources.AddUser, icon: "bowtie-icon bowtie-math-plus", hidden: isExtensionCommands, disabled: bools[0] },
            { id: "editUser", text: AccountResources.EditUser, icon: "icon-delete", noIcon: true, hidden: isExtensionCommands, disabled: bools[1] },
            { id: "removeUser", text: AccountResources.DeleteUser, icon: "icon-delete", noIcon: true, hidden: isExtensionCommands, disabled: bools[2] },
            { id: "assignUsers", text: AccountResources.AssignUsers, icon: "bowtie-icon bowtie-math-plus", hidden: !isExtensionCommands, disabled: bools[3] },
            { id: "assignAllUsers", text: AccountResources.AssignAllUsers, icon: "iconh-delete", noIcon: true, hidden: !isExtensionCommands, disabled: bools[4] },
            { id: "unassign", text: AccountResources.Unassign, icon: "icon-delete", noIcon: true, hidden: !isExtensionCommands, disabled: bools[5] },
            { id: "exportCSV", text: AccountResources.ExportCSV, disabled: !(isAdmin || isAccountOwner), icon: "bowtie-icon bowtie-transfer-download" },
            { id: "refresh", text: AccountResources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh", showText: false }
        ];
    }

    export function getMenusBarUpdateWhenSelectedUserIsChanged(isExtensionCommands: boolean, selfDelete: boolean, rowSaving: boolean, allowEdit: boolean, isAdmin: boolean, isAccountOwner: boolean, isTrial: boolean, hasIncludedQty: boolean) {
        return <Menus.ICommand[]>[
            { id: "addUser", disabled: !(isAdmin || isAccountOwner), hidden: isExtensionCommands },
            { id: "removeUser", disabled: !((isAdmin || isAccountOwner) && (!selfDelete) && (!rowSaving)), hidden: isExtensionCommands },
            { id: "editUser", disabled: !(isAdmin || isAccountOwner) || (!allowEdit), hidden: isExtensionCommands },
            { id: "assignUsers", disabled: !(isAdmin || isAccountOwner) || isTrial, hidden: !isExtensionCommands },
            { id: "assignAllUsers", disabled: !(isAdmin || isAccountOwner) || isTrial, hidden: !isExtensionCommands },
            { id: "exportCSV", text: AccountResources.ExportCSV, disabled: !(isAdmin || isAccountOwner), icon: "bowtie-icon bowtie-transfer-download" },
            { id: "unassign", disabled: !((isAdmin || isAccountOwner) && (!rowSaving)) || (isTrial && !hasIncludedQty), hidden: !isExtensionCommands }
        ];
    }

    export function showNoMenuBars(disabled, hidden, isAdmin: boolean, isAccountOwner: boolean) {
        return <Menus.ICommand[]>[
            { id: "addUser", disabled: disabled, hidden: hidden },
            { id: "removeUser", disabled: disabled, hidden: hidden },
            { id: "editUser", disabled: disabled, hidden: hidden },
            { id: "assignUsers", disabled: disabled, hidden: hidden },
            { id: "assignAllUsers", disabled: disabled, hidden: hidden },
            { id: "unassign", disabled: disabled, hidden: hidden },
            { id: "exportCSV", text: AccountResources.ExportCSV, disabled: !(isAdmin || isAccountOwner), icon: "bowtie-icon bowtie-transfer-download" },
            { id: "refresh", disabled: disabled, hidden: hidden }
        ];
    }

}

export module ControlsHelper {
    export function isEmpty(str: string): boolean {
        return (!str || 0 === str.length);
    }

    export function isNumber(o): boolean {
        return !isNaN(o - 0) && o != null;
    }
}

export module FormatUtils {

    export var _numberFormatRegexp: any = new RegExp("(\\" + Utils_Culture.getNumberFormat().NumberDecimalSeparator + "0*|0+)$");

    export var REMAINING_WORK_PRECISION: number = 2;

    export function formatNumberForDisplay(value: number, precision: number) {
        /// <summary>Formats a number to the specified precision for display purposes.</summary>
        /// <param name="value" type="number">The number to format</param>
        /// <param name="precision" type="number">The maximum number of decimal places to use</param>

        Diag.Debug.assertParamIsNumber(value, "value");
        Diag.Debug.assertParamIsNumber(precision, "precision");

        var fixedPrecisionValue = Utils_String.localeFormat("{0:n" + precision + "}", value);

        return fixedPrecisionValue.replace(FormatUtils._numberFormatRegexp, '');
    }

    export function formatRemainingWorkForDisplay(remainingWorkValue: any) {
        /// <summary>Used to consistently format the remaining work value across sprint planning and taskboard pages.</summary>
        /// <param name="remainingWorkValue" type="object">The value to format.</param>

        var result,
            value = Number(remainingWorkValue);

        // If there is no value, return empty string.
        if (!remainingWorkValue || isNaN(value)) {
            result = "";
        }
        else {
            // There is a value, so format it with the precision.
            result = FormatUtils.formatNumberForDisplay(value, FormatUtils.REMAINING_WORK_PRECISION);

            // If the value is zero after truncating to precision, return empty string.
            if (result === "0") {
                result = "";
            }
        }

        return result;
    }
}

export module PendingOperationHelper {

    export var _operationsCounter: number = 0;
    export var _operations: any = {};
    export var _isInit: boolean = false;

    export function _init() {
        /// <summary>init the helper by adding it to the running documents table</summary>
        if (!this._isInit) {
            Events_Document.getRunningDocumentsTable().add("PendingOperationHelper", this);
            this._isInit = true;
        }
    }

    export function reset() {
        /// <summary>Reset the object state. Used for Unit Testing</summary>
        this._operationsCounter = 0;
        this._operations = {};
        this._isInit = false;
    }

    export function addOperation(operationId: string) {
        /// <summary>Add operation id to track by the helper. it increase ref counting if operation exists</summary>
        /// <param name="operationId" type="string">id of the operation</param>
        Diag.Debug.assertParamIsString(operationId, "operationId");

        this._init();
        if (!this._operations.hasOwnProperty(operationId)) {
            this._operations[operationId] = 1; // set reference count to 1
            this._operationsCounter += 1; // increment total operations count
        }
        else {
            // increase ref count for operation
            this._operations[operationId] = this._operations[operationId] + 1;
        }
    }

    export function removeOperation(operationId: string) {
        /// <summary>decrement operation id reference count and remove it if reached zero</summary>
        /// <param name="operationId" type="string">id of the operation</param>
        Diag.Debug.assertParamIsString(operationId, "operationId");
        var value;

        if (this._operations.hasOwnProperty(operationId)) {
            value = this._operations[operationId];
            if (value > 1) {
                // decrement reference count
                this._operations[operationId] = value - 1;
            }
            else {
                this.clearOperation(operationId);
            }
        }
    }

    export function clearOperation(operationId: string) {
        /// <summary>clear operation id reference and remove it regardless of reference count</summary>
        /// <param name="operationId" type="string">id of the operation</param>
        Diag.Debug.assertParamIsString(operationId, "operationId");

        if (this._operations.hasOwnProperty(operationId)) {
            // remove operations and reduce total operations count
            delete this._operations[operationId];
            this._operationsCounter -= 1;
        }
    }

    export function isDirty(): boolean {
        /// <summary>isDirty method used by running document table to determine if it need to show the warning or not</summary>
        /// <returns type="boolean" />

        return this._operationsCounter > 0;
    }
}