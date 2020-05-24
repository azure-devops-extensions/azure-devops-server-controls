import { IVssHubViewState, VssHubViewState, IVssHubViewStateOptions } from "VSSPreview/Utilities/VssHubViewState";
import { IRouterContribution } from "Presentation/Scripts/TFS/Router/Contributions/RouterContribution";

export interface IContributionHubViewState extends IVssHubViewState {
    // holds a map from an action (either 1st party or contributed) to the contribution route it should be routed to
    actionMapping: IDictionaryStringTo<IRouterContribution>;

    // holds a map from a contribution route id to all its contributed actions
    contributedActionsMap: IDictionaryStringTo<Contribution[]>;
}

export class ContributionHubViewState extends VssHubViewState implements IContributionHubViewState {
    public actionMapping: IDictionaryStringTo<IRouterContribution>;
    public contributedActionsMap: IDictionaryStringTo<Contribution[]>;
}