/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/States/Components/WorkItemTypeStatesPivot";

import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemTypeStatesComponent } from "WorkCustomization/Scripts/Views/States/Components/WorkItemTypeStatesComponent";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData }
    from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { PageLearnMoreLink } from "WorkCustomization/Scripts/Common/Components/LearnMoreLink";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import Utils_String = require("VSS/Utils/String");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export class WorkItemTypeStatesPivot extends React.Component<{}, {}> {
    private _lastError: string;

    render(): JSX.Element {
        let store: WorkItemTypesStore = getWorkItemTypesStore();
        let currentProcess: IProcess = store.getCurrentProcess();
        let processId = currentProcess.templateTypeId;
        if (currentProcess != null && store.getWorkItemTypes(processId) == null) {
            WorkItemTypesActionCreator.beginGetWorkItemTypes(processId);
        }

        return (
            <div className="work-item-type-states-pivot">
                <div className="ms-font-m work-page-header work-item-type-states-pivot-header" id="work-item-type-states-pivot-header-element">
                    <div className="header-section with-learn-more">
                        <span dangerouslySetInnerHTML={
                            {
                                __html: Utils_String.format(
                                    Resources.StatesTabDescription,
                                    `<i class="icon icon-inherited-form" title="${Resources.InheritedStatesText}"></i>`)
                            }} />
                        <PageLearnMoreLink href={Resources.StatesFwLink} />
                    </div>
                </div>
                <WorkItemTypeStatesComponent onErrorMessage={this._onErrorMessage}  ref = {this._calculatePosition}/>
            </div>
        );
    }

    componentDidMount(): void {
        window.addEventListener("resize", this._calculatePosition, false); // every time when window resizes
    }

    componentWillUnmount(): void {
        // remove event listener
        window.removeEventListener("resize", this._calculatePosition, false);
    }

    @autobind
    private _onErrorMessage(message: string): void {
        if (this._lastError == null && message == null) {
            return; // ignore the inital error clear, since we haven't shown an error at all
        }

        this._lastError = message;
        if (message == null) {
            clearErrorAction.invoke(null);
        } else {
            showErrorAction.invoke({ errorMessage: message })
        }
    }
    
    private _calculatePosition = () : void => {
        let statesContainer : HTMLElement = document.getElementById("work-item-type-states-container-element");
        let statesHeaderContainer : HTMLElement = document.getElementById("work-item-type-states-pivot-header-element");
        // using try catch for any unknown errors or exceptions
        try {
            statesContainer.style.top = String(statesHeaderContainer.offsetHeight + 35) + 'px'; 
        }
        catch(e){}
    }
}
