import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { TeamPanelActions } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelActions";
import {
    ITeamPanelContext,
    TeamPanelView,
    ITeamPaneItemDataProviderDetails,
    IItemGroup,
    ITeamPanelDataProviderResponse,
    TeamPanelConstants
} from "Presentation/Scripts/TFS/TeamPanel/TeamPanelContracts";
import { ITeamPanelItemView } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelSelector";
import { getClient as getFavoritesClient } from "Favorites/RestClient";
import { FavoriteCreateParameters, Favorite } from "Favorites/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import * as Diag from "VSS/Diag";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Service from "VSS/Service";
import { getClient, getService } from "VSS/Service";
import * as Telemetry from "VSS/Telemetry/Services";
import { getErrorMessage } from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { TeamMember } from "VSS/WebApi/Contracts";
import { HubsService } from "VSS/Navigation/HubsService";

const TEAM_MEMBERS_THRESHOLD = 200;
const TEAM_PANEL_CONTRIBUTION_TYPE = "ms.vss-work-web.team-panel-items-data-provider";
const TEAM_PANEL_CONTRIBUTION_TARGET = "ms.vss-work-web.team-panel";
const ARTIFACT_SCOPE_TYPE = "Project";

export class TeamPanelActionsCreator {

    private _actions: TeamPanelActions;

    constructor(actions: TeamPanelActions) {
        this._actions = actions;
    }

    public async initialize(context: ITeamPanelContext) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            /*area */ "TeamPanel",
            /*feature */ "TeamPanel_Opened",
            /* properties */ {}
        ), /* immediate */true);

        const telmetryHelper = PerformanceTelemetryHelper.getInstance("TeamPanel");
        telmetryHelper.startScenario("TeamPanel_InitialDataFetch");
        await Promise.all([this.loadItems(context), this.loadMembers(context)]);
        this._loadTeamImageUrl(context);
        telmetryHelper.end();
    }

    public async loadItems(context: ITeamPanelContext) {
        this._actions.changeLoadingItems.invoke(/* loading */ true);
        const dataProviders = await this._getDataProviders();
        await this._ensureDataProvidersResolved(dataProviders.map(dp => dp.contributionId), context);
        await Promise.all(dataProviders.map(dataProvider => this._loadItems(context, dataProvider)));
        this._actions.changeLoadingItems.invoke(/* loading */ false);

        const telmetryHelper = PerformanceTelemetryHelper.getInstance("TeamPanel");
        telmetryHelper.split("Items_Fetched");
    }

    public async loadMembers(context: ITeamPanelContext) {
        const { projectId, teamId } = context;
        const client = getClient<CoreHttpClient>(CoreHttpClient);

        try {
            // Fetch team members
            const teamMembers: TeamMember[] =
                await client.getTeamMembersWithExtendedProperties(
                    projectId,
                    teamId,
                    TEAM_MEMBERS_THRESHOLD);

            this._actions.membersAvailable.invoke(teamMembers);
            const telmetryHelper = PerformanceTelemetryHelper.getInstance("TeamPanel");
            telmetryHelper.split("Members_Fetched");
        } catch (error) {
            const message = getErrorMessage(error);
            this._actions.membersLoadError.invoke(message);
            publishErrorToTelemetry({
                name: "loadMembers",
                message
            });
        }
    }

    public itemNavigated(item: ITeamPanelItemView) {
        const hubsService = Service.getLocalService(HubsService);
        hubsService.navigateToHub(item.itemType.hubContributionId, item.item.href);

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            /*area */ "TeamPanel",
            /*feature */ "TeamPanel_ItemNavigated",
            /*properties */ { ...item.itemType }
        ), /* immediate */true);
    }

    private _loadTeamImageUrl(context: ITeamPanelContext) {
        const teamImageUrl = TfsContext.getDefault().getIdentityImageUrl(context.teamId);
        this._actions.teamImageUrlAvailable.invoke(teamImageUrl);
    }

    private async _loadItems(context: ITeamPanelContext, dataProvider: ITeamPaneItemDataProviderDetails) {
        const {
            itemGroup,
            contributionId
        } = dataProvider;

        const pageDataService = getService(WebPageDataService);
        try {
            const response = await pageDataService.getPageData<ITeamPanelDataProviderResponse>(contributionId) || { items: [], error: null };
            if (response.error) {
                this._actions.itemsLoadError.invoke({
                    itemGroup,
                    error: response.error
                });
            }

            const itemDetails = {
                items: response.items || [],
                itemGroup
            };
            this._actions.itemsAvailable.invoke(itemDetails);

        } catch (error) {
            const message = getErrorMessage(error);
            this._actions.itemsLoadError.invoke({
                itemGroup,
                error: message
            });

            publishErrorToTelemetry({
                name: "loadItems",
                message
            });
        }
    }

    public setActiveView(view: TeamPanelView) {
        this._actions.changeActiveView.invoke(view);
    }

    public filterItems(itemGroup: IItemGroup) {
        this._actions.filterChanged.invoke({
            itemGroup
        });
    }

    public clearFilter() {
        this._actions.clearFilter.invoke(null);
    }

    public toggleFavorite(item: ITeamPanelItemView, projectId: string) {
        if (item.item.favorite) {
            this._unfavoriteItem(item, projectId);
        }
        else {
            this._favoriteItem(item, projectId);
        }
    }

    private _favoriteItem(panelItem: ITeamPanelItemView, projectId: string): Promise<void> {
        return this._createFavorite(panelItem.item.artifactId, panelItem.item.name, panelItem.itemType.favoriteType, projectId).then(
            (favorite: Favorite) => {
                this._actions.favoriteUpdated.invoke({
                    panelItem: panelItem,
                    favorite: favorite
                });
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }
                this._actions.favoriteFailed.invoke(error.message);
            }
        );
    }

    private _unfavoriteItem(panelItem: ITeamPanelItemView, projectId: string): Promise<void> {
        return this._deleteFavorite(panelItem.item.favorite.id, panelItem.itemType.favoriteType, projectId).then(
            () => {
                this._actions.favoriteUpdated.invoke({
                    panelItem: panelItem,
                    favorite: null
                });
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }
                this._actions.favoriteFailed.invoke(error.message);
            }
        );
    }

    private async _createFavorite(artifactId: string, artifaceName: string, favoriteType: string, projectId: string): Promise<Favorite> {
        const favoriteParameters: FavoriteCreateParameters = {
            artifactId: artifactId,
            artifactProperties: {},
            artifactName: artifaceName,
            artifactType: favoriteType,
            artifactScope: {
                id: projectId,
                type: ARTIFACT_SCOPE_TYPE,
                name: null
            },
            owner: null
        };

        return getFavoritesClient().createFavorite(favoriteParameters);
    }

    private async _deleteFavorite(favoriteId: string, favoriteType: string, projectId: string): Promise<void> {
        return getFavoritesClient().deleteFavoriteById(
            favoriteId,
            favoriteType,
            ARTIFACT_SCOPE_TYPE,
            projectId
        );
    }

    private async _getDataProviders(): Promise<ITeamPaneItemDataProviderDetails[]> {
        const contributions = await Service.getService(ExtensionService)
            .getContributionsForTarget(TEAM_PANEL_CONTRIBUTION_TARGET, TEAM_PANEL_CONTRIBUTION_TYPE);

        const providers = await Promise.all(contributions.map(c => this._getDataProvider(c)));
        // Filter null providers e.g. the one that failed to load
        return providers.filter(p => !!p)
    }


    private async _getDataProvider(contribution: Contribution): Promise<ITeamPaneItemDataProviderDetails> {
        const hubContributionId = contribution.properties["hubContributionId"];
        const hub = contribution.properties["hub"];
        const hubGroup = contribution.properties["hubGroup"];
        const favoriteType = contribution.properties["favoriteType"];
        const order = contribution.properties["order"];
        Diag.Debug.assert(hub, `Hub should be provided by ${contribution.id}`);
        Diag.Debug.assert(hubGroup, `Hub group should be provided by ${contribution.id}`);
        Diag.Debug.assert(order, `Order should be provided by ${contribution.id}`);

        const itemGroup: IItemGroup = {
            hubContributionId,
            hub,
            hubGroup,
            favoriteType,
            order
        };

        return {
            itemGroup,
            contributionId: contribution.id
        }
    }

    private async _ensureDataProvidersResolved(
        dataProviderIds: string[],
        context: ITeamPanelContext): Promise<void> {
        const contributions: Contribution[] = dataProviderIds.map(dataProviderId => {
            return {
                id: dataProviderId,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS,
                    teamId: context.teamId,
                    projectId: context.projectId
                }
            } as Contribution;
        });

        const pageDataService = getService(WebPageDataService);
        const properties: IDictionaryStringTo<string> = {
            [TeamPanelConstants.TeamId]: context.teamId,
            [TeamPanelConstants.TeamName]: context.teamName,
            [TeamPanelConstants.ProjectId]: context.projectId,
            [TeamPanelConstants.ProjectName]: context.projectName
        };
        return pageDataService.ensureDataProvidersResolved(contributions, true /*refresh*/, properties);
    }


}
