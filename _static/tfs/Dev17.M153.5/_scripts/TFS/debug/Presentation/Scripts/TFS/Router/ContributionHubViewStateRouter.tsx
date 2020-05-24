import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { ContributionComponent } from "Presentation/Scripts/TFS/Router/ContributionComponent";
import { IContributionHubViewState } from "Presentation/Scripts/TFS/Router/ContributionHubViewState";
import { IRouterContribution } from "Presentation/Scripts/TFS/Router/Contributions/RouterContribution";
import { PerformanceEvents, addSplitTiming } from "Presentation/Scripts/TFS/Router/PerformanceUtilities";
import { ExtensionService } from "VSS/Contributions/Services";
import { Debug } from "VSS/Diag";
import * as Events_Services from "VSS/Events/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Navigation_Services from "VSS/Navigation/NavigationHistoryService";
import { getScenarioManager } from "VSS/Performance";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import { contains, first } from "VSS/Utils/Array";
import { equals, ignoreCaseComparer } from "VSS/Utils/String";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { HubViewStateEventNames } from "VSSUI/Utilities/HubViewState";
import { IViewStateChangeEvent, ViewStateEventNames } from "VSSUI/Utilities/ViewState";
import * as PropTypes from "prop-types";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface IContributionHubViewStateRouterRequestHandler {
    onPreRequestExecute?: () => void;
    onHubDispose?: () => void;
}

export interface IContributionHubViewStateRouterProps {
    actionMapping: IDictionaryStringTo<IRouterContribution>;
    default: IRouterContribution;
    requestHandler?: IContributionHubViewStateRouterRequestHandler;
    hubViewState?: IContributionHubViewState;
}

export interface IContributionHubViewStateRouterState {
    contribution: IRouterContribution;
    routeData: IDictionaryStringTo<string>;
}

export interface IContributionHubViewStateRouterContext {
    contextManager: ContributionHubViewStateRouterContextManager;
}

/**
 * Context manager available to all child components
 */
export class ContributionHubViewStateRouterContextManager {
    private registeredContexts: IDictionaryStringTo<any> = {};

    public setContext<T>(name: string, store: T): void {
        this.registeredContexts[name] = store;
    }

    public getContext<T>(name: string): T {
        return this.registeredContexts[name];
    }
}

export const ContributionHubViewStateRouterContextPropTypes: React.ValidationMap<any> = {
    contextManager: PropTypes.object.isRequired,
};

/**
 * Router component that routes depends on the configuration. It uses the navigation services
 * to navigate between registered views.
 */
export class ContributionHubViewStateRouter extends React.Component<IContributionHubViewStateRouterProps, IContributionHubViewStateRouterState> {
    private historyService: Navigation_Services.INavigationHistoryService = Navigation_Services.getNavigationHistoryService();
    private eventService: Events_Services.EventService = Events_Services.getService();
    private contextManager: ContributionHubViewStateRouterContextManager = new ContributionHubViewStateRouterContextManager();
    static childContextTypes = ContributionHubViewStateRouterContextPropTypes;

    constructor(props: IContributionHubViewStateRouterProps, context?: any) {
        super(props, context);

        addSplitTiming(PerformanceEvents.Mount, true);
        this.state = this.getState();
    }

    public render(): JSX.Element {
        return <ContributionComponent key={this.state.contribution.id} contribution={this.state.contribution} />;
    }

    public componentDidMount() {
        addSplitTiming(PerformanceEvents.Mount, false);
        this.props.hubViewState.subscribe(this.onNavigate);
    }

    public componentWillUnmount() {
        this.props.hubViewState.unsubscribe(this.onNavigate);

        if (this.props.requestHandler && this.props.requestHandler.onHubDispose) {
            this.props.requestHandler.onHubDispose();
        }
    }

    public shouldComponentUpdate(nextProps: IContributionHubViewStateRouterProps, nextState: IContributionHubViewStateRouterState): boolean {
        if (this.state.contribution.id === nextState.contribution.id) {
            return this.state.routeData !== nextState.routeData;
        }

        return true;
    }

    public getChildContext(): IContributionHubViewStateRouterContext {
        return {
            contextManager: this.contextManager,
        };
    }

    /**
     * Gets contribution based on the action, if not found returns default contribution
     */
    private getActiveContribution(): IRouterContribution {
        const action = this.props.hubViewState.selectedPivot.value;
        const validActions = Object.keys(this.props.actionMapping);
        if (action) {
            const key = first(validActions, a => equals(a, action, true));
            if (!key) {
                Debug.fail("Action not found, falling back to default");
            } else {
                return this.props.actionMapping[key];
            }
        }

        return this.props.default;
    }

    private getActiveRouteData(): IDictionaryStringTo<string> {
        return this.historyService.getState();
    }

    private getState(): IContributionHubViewStateRouterState {
        const validActions = Object.keys(this.props.actionMapping);

        // Remove invalid views from the url
        if (validActions && this.props.hubViewState.selectedPivot.value &&
            !contains(validActions, this.props.hubViewState.selectedPivot.value, ignoreCaseComparer) &&
            !contains(validActions, this.props.hubViewState.viewOptions.getViewOption("_a"), ignoreCaseComparer)) {
            this.props.hubViewState.updateNavigationState(HistoryBehavior.replace, () => {
                this.props.hubViewState.selectedPivot.value = "";
            });
        }

        // The request handler can change the values in the history service,
        // which will then impact what the active contribution and route will be.
        if (this.props.requestHandler && this.props.requestHandler.onPreRequestExecute) {
            this.props.requestHandler.onPreRequestExecute();
        }

        const contribution = this.getActiveContribution();
        const routeData = this.getActiveRouteData();

        return {
            contribution: contribution,
            routeData: routeData,
        };
    }

    private onNavigate = (value: IViewStateChangeEvent<Object>, action: string): void => {
        // if the view options are changing, don't treat as a navigation event since it's not.
        if (action === ViewStateEventNames.viewStateChanged
            && value
            && value.eventName !== HubViewStateEventNames.viewOptionsChanging
            && value.eventName !== HubViewStateEventNames.filterChanging) {

            // Starting the xhr scenario to resets the page interactive events
            getScenarioManager().resetPageLoadScenario();

            this.setState(this.getState());
        }
    }
}

/**
 * Renders the Contribution router to the container, it renders the default contribution that is
 * passed in the default route.
 * @param container
 * @param requestHandler
 */
export function initializeRouter(
    container: HTMLElement,
    requestHandler?: IContributionHubViewStateRouterRequestHandler,
    hubViewState?: IContributionHubViewState): IPromise<Contribution> {

    const contributionService = Service.getService(ExtensionService);
    const selectedHubId = Service.getLocalService(HubsService).getSelectedHubId();

    addSplitTiming(PerformanceEvents.InitializeRouter, true);

    const contributions = contributionService.getLoadedContributionsForTarget(selectedHubId, "ms.vss-web.tab-group");
    if (!contributions || !contributions.length) {
        throw new Error(PresentationResources.ContributionNotFound);
    }

    let defaultContribution: IRouterContribution;
    const defaultContributions = contributions.filter(value => value.properties.isDefault);
    if (!defaultContributions || (defaultContributions && !defaultContributions.length)) {
        throw new Error(PresentationResources.DefaultContributionExpected);
    }
    else if (defaultContributions.length !== 1) {
        throw new Error(PresentationResources.MultipleContributionFound);
    }
    else {
        defaultContribution = defaultContributions[0];
    }

    // holds a map from an action (either 1st party or contributed) to the contribution route it should be routed to
    const actionMapping: IDictionaryStringTo<IRouterContribution> = {};
    // holds a map from a contribution route id to all its contributed actions
    const contributedActionsMap: IDictionaryStringTo<Contribution[]> = {};
    const contributedActionsPromises: IPromise<void>[] = [];

    addSplitTiming(PerformanceEvents.InitializeContributedActions, true);

    for (const contribution of contributions) {
        // fill in hardcoded actions
        if (contribution.properties.actions) {
            for (const action of contribution.properties.actions) {
                actionMapping[action] = contribution;
            }
        }

        // fill in contributed actions
        if (contribution.properties.contributedActions
            && Array.isArray(contribution.properties.contributedActions)
            && contribution.properties.contributedActions.length > 0) {
            contributedActionsMap[contribution.id] = [];
            const contributedActions: string[] = contribution.properties.contributedActions;
            for (const contributedAction of contributedActions) {
                const contributedActionContributions = contributionService.getLoadedContributionsForTarget(contributedAction, "ms.vss-web.tab");
                if (contributedActionContributions) {
                    for (const contributedActionContribution of contributedActionContributions) {
                        actionMapping[contributedActionContribution.id] = contribution;
                        contributedActionsMap[contribution.id].push(contributedActionContribution);
                    }
                }
            }
        }
    }

    addSplitTiming(PerformanceEvents.InitializeContributedActions, false);

    if (hubViewState) {
        hubViewState.actionMapping = actionMapping;
        hubViewState.contributedActionsMap = contributedActionsMap;
    }

    ReactDOM.render(
        <ContributionHubViewStateRouter
            actionMapping={actionMapping}
            default={defaultContribution}
            requestHandler={requestHandler}
            hubViewState={hubViewState} />,
        container);

    addSplitTiming(PerformanceEvents.InitializeRouter, false);

    // returning default contribution to make it testable and verify default contribution
    return Promise.resolve(defaultContribution);
}

SDK_Shim.registerContent("router", (context: SDK_Shim.InternalContentContextData) => {
    initializeRouter(context.container);
});
