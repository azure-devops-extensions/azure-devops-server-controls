/// <amd-dependency path='VSS/LoaderPlugins/Css!fabric' />
/// <reference types="react" />

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";
import { ActionCreator } from "MyExperiences/Scenarios/CreateProject/Actions/ActionCreator";
import { ActionsHub } from "MyExperiences/Scenarios/CreateProject/ActionsHub";
import {
    ICreateProjectComponentProps,
    CreateProjectComponent
} from "MyExperiences/Scenarios/CreateProject/Components/CreateProjectComponent";
import { ApiSource } from "MyExperiences/Scenarios/CreateProject/Sources/ApiSource";
import { DataProviderSource } from "MyExperiences/Scenarios/CreateProject/Sources/DataProviderSource";
import { JobResultSource } from "MyExperiences/Scenarios/CreateProject/Sources/JobResultSource";
import { UrlParametersSource } from "MyExperiences/Scenarios/CreateProject/Sources/UrlParametersSource";
import { Store } from "MyExperiences/Scenarios/CreateProject/Stores/Store";
import { StoresHub } from "MyExperiences/Scenarios/CreateProject/StoresHub";

export interface IProjectCreationViewComponentProps {
    /**
     *  Optional handler to be attached to the cancel button of the project creation page
     */
    onCancel?: () => void;
    /**
     *  Optional handler to be attached to perform some action onScenario Complete
     */
    onScenarioComplete?: () => void;
}

export class ProjectCreationViewComponent extends React.Component<IProjectCreationViewComponentProps, ComponentBase.State> {

    public static componentType = "project-creation-view";

    constructor(props: IProjectCreationViewComponentProps) {
        super(props);
    }

    public render(): JSX.Element {
        let createProjectComponentProps: ICreateProjectComponentProps = {
            actionCreator: this.actionCreator,
            store: this.storesHub.store,
            onCancel: this.props.onCancel,
            onScenarioComplete: this.props.onScenarioComplete
        };

        return (
            <div className="create-project-view">
                <CreateProjectComponent {...createProjectComponentProps}/>
            </div>);
    }

    private get actionCreator(): ActionCreator {
        if (!this._actionCreator) {
            let dataProviderSource: DataProviderSource = new DataProviderSource();
            let apiSource: ApiSource = new ApiSource();
            let jobResultSource: JobResultSource = new JobResultSource();
            let urlParamsSource: UrlParametersSource = new UrlParametersSource();
            this._actionCreator = new ActionCreator(
                this.actionsHub,
                apiSource,
                jobResultSource,
                dataProviderSource,
                urlParamsSource
            );
        }

        return this._actionCreator;
    }

    private get storesHub(): StoresHub {
        if (!this._storesHub) {
            this._storesHub = new StoresHub(this.actionsHub);
        }

        return this._storesHub;
    }

    private get actionsHub(): ActionsHub {
        if (!this._actionsHub) {
            this._actionsHub = new ActionsHub();
        }

        return this._actionsHub;
    }

    private _actionsHub: ActionsHub;
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;
}

registerLWPComponent(ProjectCreationViewComponent.componentType, ProjectCreationViewComponent);
