import * as React from "react";
import * as ReactDOM from "react-dom";
import * as PropTypes from "prop-types";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as Events_Services from "VSS/Events/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as VSSError from "VSS/Error";
import { Debug } from "VSS/Diag";
import { ExtensionService } from "VSS/Contributions/Services";
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { IRouterContribution } from "Presentation/Scripts/TFS/Router/Contributions/RouterContribution";
import { ContributionComponent } from "Presentation/Scripts/TFS/Router/ContributionComponent";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface IContributionRouterRequestHandler {
    onPreRequestExecute?: () => void;
    onHubDispose?: () => void;
}

export interface IContributionRouterProps {
    contributions: IRouterContribution[];
    default: IRouterContribution;
    requestHandler?: IContributionRouterRequestHandler;
}

export interface IContributionRouterState {
    contribution: IRouterContribution;
    routeData: any;
}

export interface IContributionRouterContext {
    contextManager: ContributionRouterContextManager;
}

/**
 * Context manager available to all child components
 */
export class ContributionRouterContextManager {
    private registeredContexts: IDictionaryStringTo<any> = {};

    public setContext<T>(name: string, store: T): void {
        this.registeredContexts[name] = store;
    }

    public getContext<T>(name: string): T {
        return this.registeredContexts[name];
    }
}

export const ContributionRouterContextPropTypes: React.ValidationMap<any> = {
    contextManager: PropTypes.object.isRequired,
};

/**
 * Router component that routes depends on the configuration. It uses the navigation services
 * to navigate between registered views.
 */
export class ContributionRouter extends React.Component<IContributionRouterProps, IContributionRouterState> {
    private actionMapping: IDictionaryStringTo<IRouterContribution> = {};
    private historyService: Navigation_Services.HistoryService = Navigation_Services.getHistoryService();
    private eventService: Events_Services.EventService = Events_Services.getService();
    private contextManager: ContributionRouterContextManager = new ContributionRouterContextManager();
    static childContextTypes = ContributionRouterContextPropTypes;

    constructor(props: IContributionRouterProps, context?: any) {
        super(props, context);

        // Storing all the actions with the corresponding contribution, since the url is of the form {project}/{_foo}?_a=bar
        // we need to get the corresponding contribution for an action at any given time
        for (const contribution of this.props.contributions) {
            if (contribution.properties.actions) {
                for (const action of contribution.properties.actions) {
                    this.actionMapping[action] = contribution;
                }
            }
        }

        this.state = this.getState();
    }

    public render(): JSX.Element {
        return <ContributionComponent key={this.state.contribution.id} contribution={this.state.contribution} />;
    }

    public componentDidMount() {
        this.historyService.attachNavigate(this.onNavigate);
        this.eventService.attachEvent(HubEventNames.PreXHRNavigate, this.onDispose);
    }

    public componentWillUnmount() {
        this.historyService.detachNavigate(this.onNavigate);
        this.eventService.detachEvent(HubEventNames.PreXHRNavigate, this.onDispose);
    }

    public shouldComponentUpdate(nextProps: IContributionRouterProps, nextState: IContributionRouterState): boolean {
        if (this.state.contribution.id === nextState.contribution.id) {
            return this.state.routeData !== nextState.routeData;
        }

        return true;
    }

    public getChildContext(): IContributionRouterContext {
        return {
            contextManager: this.contextManager,
        };
    }

    /**
     * Gets contribution based on the action, if not found returns default contribution
     */
    private getActiveContribution(): IRouterContribution {
        let action = this.historyService.getCurrentState().action;
        if (action) {
            let contribution = this.actionMapping[action];
            if (!contribution) {
                Debug.fail("Action not found, falling back to default");
            }
            else {
                return contribution;
            }
        }

        return this.props.default;
    }

    private getActiveRouteData(): any {
        return this.historyService.getCurrentState();
    }

    private getState(): IContributionRouterState {
        const validActions = Object.keys(this.actionMapping);
        const state = this.historyService.getCurrentState();
        // Remove invalid actions from the url
        if (validActions && state.action && validActions.indexOf(state.action) === -1) {
            delete state.action;
            this.historyService.replaceHistoryPoint(null, state, document.title, false);
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

    private onNavigate = (target: Navigation_Services.HistoryService, state: any): void => {
        this.setState(this.getState());
    }

    private onDispose = (sender: any, args: IHubEventArgs) => {
        // Call custom dispose function for the hub.
        if (this.props.requestHandler && this.props.requestHandler.onHubDispose) {
            this.props.requestHandler.onHubDispose();
        }

        const container = ReactDOM.findDOMNode(this);
        ReactDOM.unmountComponentAtNode(container.parentElement);
    }
}

/**
 * Renders the Contribution router to the container, it renders the default contribution that is
 * passed in the default route.
 * @param container
 * @param requestHandler
 * @param targetContributionId
 */
export function initializeRouter(container: HTMLElement, requestHandler?: IContributionRouterRequestHandler, targetContributionId?: string): IPromise<Contribution> {
    const contributionService = Service.getService(ExtensionService);
    const contributionId = targetContributionId || Service.getLocalService(HubsService).getSelectedHubId();

    return contributionService.getContributionsForTarget(contributionId, "ms.vss-web.tab-group").then(
        (contributions) => {
            if (!contributions || !contributions.length) {
                throw new Error(PresentationResources.ContributionNotFound);
            }

            let defaultContribution: IRouterContribution;
            let defaultContributions = contributions.filter((value, index, array) => {
                if (value.properties.isDefault) {
                    return value;
                }
            });

            if (!defaultContributions || (defaultContributions && !defaultContributions.length)) {
                throw new Error(PresentationResources.DefaultContributionExpected);
            }
            else if (defaultContributions.length !== 1) {
                throw new Error(PresentationResources.MultipleContributionFound);
            }
            else {
                defaultContribution = defaultContributions[0];
            }

            ReactDOM.render(<ContributionRouter contributions={contributions} default={defaultContribution} requestHandler={requestHandler} />, container);

            // returning default contribution to make it testable and verify default contribution
            return defaultContribution;
        },
        (reason: Error) => {
            VSSError.publishErrorToTelemetry({
                name: "RouterRegisterContent",
                message: reason.message
            });
        });
}

SDK_Shim.registerContent("router", (context: SDK_Shim.InternalContentContextData) => {
    initializeRouter(context.container);
});
