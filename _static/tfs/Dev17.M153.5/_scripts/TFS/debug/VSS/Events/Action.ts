
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");

export interface IActionWorker {
    (actionArgs: any, next: (actionArgs: any) => any): any;
}

interface IActionWorkerEntry {
    worker: IActionWorker;
    order: number;
}

var maxOrder = Math.pow(2, 32);

export class ActionService implements Service.ILocalService {
    public static MaxOrder: any = maxOrder;

    private _actionWorkers: IDictionaryStringTo<IActionWorkerEntry[]> = {};

    /**
     * Register a handler for an action. The handler participates in the Chain of Responsibility pattern.
     * 
     * @param action The action to register
     * @param actionWorker Function(actionArgs, next), The handler to invoke for the given action when the performAction
     *     operation is called for the registered action.
     *     The function is passed the action arguments for next which it should call with the actionsArgs UNLESS
     *     it explicitly wants to be the end of the chain.
     *     e.g.
     *     registerActionWorker('some.action', function (actionArgs, next) {
     *         if (iCanHandle(actionArgs)) {
     *             return doProcessing(actionArgs);
     *         }
     *         else {
     *             return next(actionArgs);
     *         }
     *     }, 50);
     * 
     * if ActionWorker functions are asynchronous they can still participate in the chain
     * 
     *     registerActionWorker('some.async.action', function (actionArgs, next) {
     *         beginDoSomeStuff(function (result) {
     *             if (that.imDone(results)) {
     *                 actionArgs.onSuccess.call(this, results);
     *             }
     *             else {
     *                 next(actionArgs);
     *             }
     *         });
     *     }, 50);
     * 
     * @param order The order of the action (default:100).
     *       Action workers are executed in increasing order. Order must be less than MaxOrder (inclusive)
     */
    public registerActionWorker(action: string, actionWorker: IActionWorker, order?: number): void {

        Diag.Debug.assertParamIsStringNotEmpty(action, "action");
        Diag.Debug.assertParamIsFunction(actionWorker, "actionWorker");
        if (order !== undefined) {
            Diag.Debug.assertParamIsNumber(order, "order");
            Diag.Debug.assert(order <= maxOrder, "order must not be greater than " + maxOrder);
        }

        var workers = this._actionWorkers[action];

        if (!workers) {
            this._actionWorkers[action] = workers = <any>[];
        }

        workers.push({
            worker: actionWorker,
            order: order || (order === 0 ? 0 : 100)
        });

        workers.sort(function (wa, wb) {
            return wa.order - wb.order;
        });
    }

    /**
     * Un-Register a handler for an action.
     *
     * @param action The action to un-register
     * @param actionWorker Function(actionArgs, next), The IActionWorker that was registered.
     */
    public unregisterActionWorker(action: string, actionWorker: IActionWorker): void {
        Diag.Debug.assertParamIsStringNotEmpty(action, "action");
        Diag.Debug.assertParamIsFunction(actionWorker, "actionWorker");

        var workers = this._actionWorkers[action];

        if (workers) {
            var indexToRemove: number = -1;
            $.each(workers, (index: number, entry: IActionWorkerEntry) => {
                if (entry.worker === actionWorker) {
                    indexToRemove = index;
                    return false;
                }
            });
            if (indexToRemove > -1) {
                workers.splice(indexToRemove, 1);
            }

            if (workers.length === 0) {
                delete this._actionWorkers[action];
            }
        }
    }

    /**
     * Un-Register all handlers for an action.
     *
     * @param action The action to un-register
     */
    public unregisterActionWorkers(action: string): void {
        Diag.Debug.assertParamIsStringNotEmpty(action, "action");

        delete this._actionWorkers[action];
    }
    
    /**
     * Invoke the registered action workers for the an action
     * 
     * @param action The action identifier
     * @param actionArgs An object passed to the registered action workers.
     */
    public performAction(action: string, actionArgs?: any): any {

        Diag.Debug.assertParamIsStringNotEmpty(action, "action");

        var workers = this._actionWorkers[action];
        var index = 0;

        function next(actionArgs: any) {
            var entry = workers && workers[index++];

            if (entry) {
                return entry.worker.call(this, actionArgs, next);
            }
        }

        return next(actionArgs);
    }

    /**
     *  Clears all action workers
     */
    public clearActionWorkers(): void {
        this._actionWorkers = {};
    }

    /**
     * Manage actions and the workers that are invoked when those actions are performed.
     * Action workers register to handle specific actions. They take whatever action they desire
     * and usually call the "next" handler in the chain (see the Chain of Responsibility pattern).
     */
    constructor() {
    }
}

export module CommonActions {
    export var ACTION_WINDOW_OPEN = "window-open";
    export var ACTION_WINDOW_NAVIGATE = "window-navigate";
    export var ACTION_WINDOW_RELOAD = "window-reload";
    export var ACTION_WINDOW_UNLOAD = "window-unload";
}

export function getService(): ActionService {
    return Service.getLocalService(ActionService);
}

getService().registerActionWorker(CommonActions.ACTION_WINDOW_OPEN, function (actionArgs, next) {
    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.url, "actionArgs.url");

    let openedWindow = null;
    if (typeof actionArgs.features !== "undefined") {
        openedWindow = window.open(actionArgs.url, actionArgs.target || "_blank", actionArgs.features);
    } else {
        //even if features are undefined IE opens a new unresizable window.
        openedWindow = window.open(actionArgs.url, actionArgs.target || "_blank");
    }

    if(openedWindow) {
        openedWindow.opener = null;
    }
});

getService().registerActionWorker(CommonActions.ACTION_WINDOW_NAVIGATE, function (actionArgs, next) {
    // Action to have the host navigate to a new url
    //   VSS.Host.ActionManager.performAction(VSS.Host.CommonActions.ACTION_WINDOW_NAVIGATE, { url: location });
    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.url, "actionArgs.url");

    window.location.href = actionArgs.url;
});

getService().registerActionWorker(CommonActions.ACTION_WINDOW_RELOAD, function () {
    // Action to have the host reload the current page.
    //   VSS.Host.ActionManager.performAction(VSS.Host.CommonActions.ACTION_WINDOW_RELOAD);
    window.location.reload();
});
