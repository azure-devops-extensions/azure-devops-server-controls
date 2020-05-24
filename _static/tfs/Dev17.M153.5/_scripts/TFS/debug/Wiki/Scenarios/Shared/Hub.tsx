import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VSS from "VSS/VSS";
import * as SDK_Shim from "VSS/SDK/Shim";

import { WikiContainer, renderInto } from "Wiki/Scenarios/Shared/Components/WikiContainer";

SDK_Shim.registerContent("wiki.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    renderInto(context.container, {});

    const disposable: IDisposable = {
        dispose: (): void => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});
