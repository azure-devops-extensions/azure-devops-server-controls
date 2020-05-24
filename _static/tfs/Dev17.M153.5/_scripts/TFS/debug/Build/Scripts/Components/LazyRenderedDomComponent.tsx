import * as React from "react";
import * as ReactDOM from "react-dom";

import { globalProgressIndicator, using } from "VSS/VSS";
import { logError, logWarning } from "VSS/Diag";

var DataKey = "IS_COMPONENT_RENDERED";

/** Given the imported modules (in the order given in the modules array), return the type of the component to create */
export type ModuleComponentSelector<TComponent> = (...modules: any[]) => { new (props: any): TComponent };

/**
 * Render the component into the DOM element which will be obtained based on class through className parameter
 * @param element DOM element's class name to render on or the DOM element it'self
 * @param modules Paths of modules to load
 * @param props Props to be sent to component
 * @param onRender Callback that's triggered after rendering the component into the element
 * @param moduleComponentSelector Selector function, given the imported modules to return the type/constructor method to create
 *                                the desired component.
 */
export function renderLazyComponentIntoDom<TComponent extends React.Component<TProps, any>, TProps>
    (element: string | HTMLElement,
    modules: string[],
    props: TProps,
    moduleComponentSelector: ModuleComponentSelector<TComponent>,
    onRender?: () => void,
    renderOnlyOnce: boolean = true): (props: TProps) => JSX.Element {

    let jElement = typeof element === "string" ? $("." + element) : $(element);
    if (jElement.length == 0) {
        if (typeof element === "string") {
            logWarning("Provided element " + element + " is not found, creating a placeholder");
            jElement = $("<div>").addClass(element).appendTo($("body"));
        }
        else {
            logError("DOM element provided doesn't exist, no-op");
            return;
        }
    }

    if (renderOnlyOnce && jElement.data(DataKey)) {
        logWarning("Component is already rendered and renderOnlyOnce is set, just calling call back.");
        onRender && onRender();
        return;
    }
    else {
        ReactDOM.unmountComponentAtNode(jElement[0]);
        let progressId = globalProgressIndicator.actionStarted("renderingComponentOn", true);
        using(modules, (...modules) => {
            let reactElement = React.createElement(moduleComponentSelector(...modules), props);
            ReactDOM.render(reactElement, jElement[0]);

            jElement.data(DataKey, true);
            onRender && onRender();
            globalProgressIndicator.actionCompleted(progressId);
        });
    }
}