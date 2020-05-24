import { Action } from "VSS/Flux/Action";
import { getPageContext } from "VSS/Context";

/**
 * Apply to an ActionsHub to register it with the perf panel actions monitor
 * @param originalConstructor ActionsHub that contains public Action<T> properties
 */
export const registerDiagActions = <T>(originalConstructor: new (...args: any[]) => T): new (...args: any[]) => T => {
    // Only add listener when the perf bar is enabled
    if (!!getPageContext().diagnostics.tracePointCollectionEnabled) {
        const newConstructor = (...args) => {
            const actionsHub = new originalConstructor(args);

            const untypedInstance = actionsHub as any;
            const actionsHubName = actionsHub.constructor ? actionsHub.constructor.name : "";

            for (const property in untypedInstance) {
                if (actionsHub.hasOwnProperty(property)) {
                    const action = actionsHub[property];

                    if (action instanceof Action) {
                        const actionName = actionsHubName ? `${actionsHubName}.${property}` : property;
                        action.addListener((payload) => {
                            const stack = new Error().stack || "";
                            const actionEvent = new CustomEvent("ACTION_FIRED", {
                                detail: {
                                    actionName,
                                    payload,
                                    stack,
                                    timestamp: new Date()
                                }
                            });
                            document.dispatchEvent(actionEvent);
                        });
                    }
                }
            }

            return actionsHub;
        };

        newConstructor.prototype = originalConstructor.prototype;
        return newConstructor as any;
    }

    return originalConstructor;
};
