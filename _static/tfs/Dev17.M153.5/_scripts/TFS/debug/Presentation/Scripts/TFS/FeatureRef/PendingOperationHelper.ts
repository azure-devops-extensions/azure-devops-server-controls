import Events_Document = require("VSS/Events/Document");
import Diag = require("VSS/Diag");

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