/**
 * Extending the contribution to store the list of actions
 */
export interface IRouterContribution extends Contribution {
    properties: IRouterContributionProperties;
}

/**
 * Properties contains the list of actions. Actions will part of the querystring _a=foo
 */
export interface IRouterContributionProperties {
    actions: string[];
}