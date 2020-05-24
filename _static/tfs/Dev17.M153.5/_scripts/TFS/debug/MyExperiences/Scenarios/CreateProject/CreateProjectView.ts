/// <amd-dependency path='VSS/LoaderPlugins/Css!fabric' />

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS from "VSS/VSS";
import * as Controls from "VSS/Controls";
import * as Performance from "VSS/Performance";
import { Constants } from "MyExperiences/Scenarios/CreateProject/Constants";
import {
    ICreateProjectComponentProps,
    CreateProjectComponentRenderer
} from "MyExperiences/Scenarios/CreateProject/Components/CreateProjectComponent";
import { ApiSource } from "MyExperiences/Scenarios/CreateProject/Sources/ApiSource";
import { JobResultSource } from "MyExperiences/Scenarios/CreateProject/Sources/JobResultSource";
import { DataProviderSource } from "MyExperiences/Scenarios/CreateProject/Sources/DataProviderSource";
import { UrlParametersSource } from "MyExperiences/Scenarios/CreateProject/Sources/UrlParametersSource";
import { ActionCreator } from "MyExperiences/Scenarios/CreateProject/Actions/ActionCreator";
import { Store } from "MyExperiences/Scenarios/CreateProject/Stores/Store";
import { StoresHub } from "MyExperiences/Scenarios/CreateProject/StoresHub";
import { ActionsHub } from "MyExperiences/Scenarios/CreateProject/ActionsHub";

SDK_Shim.registerContent("createProjectView.initialize", (context) => {

    var dataProviderSource: DataProviderSource = new DataProviderSource();
    var apiSource: ApiSource = new ApiSource();
    var jobResultSource: JobResultSource = new JobResultSource();
    var urlParamsSource: UrlParametersSource = new UrlParametersSource();
    var actionsHub: ActionsHub = new ActionsHub();
    var actionCreator: ActionCreator = new ActionCreator(
        actionsHub,
        apiSource,
        jobResultSource,
        dataProviderSource,
        urlParamsSource
    );
    var createProjectScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenarioFromNavigation(
        Constants.Area,
        Constants.Feature, true);

    let createProjectComponentProps: ICreateProjectComponentProps = {
        actionCreator: actionCreator,
        store: new StoresHub(actionsHub).store,
        onScenarioComplete: () => {
            if (createProjectScenario.isActive()) {
                createProjectScenario.end();
            }
        }
    };

    context.$container.addClass("create-project-view");

    CreateProjectComponentRenderer.renderControl(
        context.$container[0],
        createProjectComponentProps);
});