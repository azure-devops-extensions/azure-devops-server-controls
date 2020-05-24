/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

/**
 * The PersonaCard is intended to show contact and organization information for an identity.
 * You may pass the entity directly or you may pass a unique attribute (e.g. uniqueName, entityID, signInAddress) as a prop.
 * 
 * See the associated wiki page for design details: https://mseng.visualstudio.com/VSOnline/_wiki?pagePath=%2FWorking-with-the-React-Profile-Card
 */

import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";

import * as Context from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as Component_Base from "VSS/Flux/Component";
import * as Identities_Picker_Constants from "VSS/Identities/Picker/Constants";
import * as Picker_Controls from "VSS/Identities/Picker/Controls";
import { PersonaCardContent } from "VSS/Identities/Picker/PersonaCardContent";
import { CardType, IDataState, personaCardEntity, PersonaCardProps } from "VSS/Identities/Picker/PersonaCardContracts";
import * as Utils from "VSS/Identities/Picker/PersonaCardIdentityUtils";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import * as Performance from "VSS/Performance";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Service from "VSS/Service";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";

export const sourceOperationScope: Identities_Picker_Services.IOperationScope = { Source: true };
export const sourceAdOperationScope: Identities_Picker_Services.IOperationScope = { Source: true, AD: true };
export const sourceImsOperationScope: Identities_Picker_Services.IOperationScope = { Source: true, IMS: true };
export const sourceImsAdOperationScope: Identities_Picker_Services.IOperationScope = { Source: true, IMS: true, AD: true };
export const userIdentityType: Identities_Picker_Services.IEntityType = { User: true };
export const managerAndDirectReportsConnectionType: Identities_Picker_Services.IConnectionType = { managers: true, directReports: true };
export const managerConnectionType: Identities_Picker_Services.IConnectionType = { managers: true };

export interface PersonaCardState extends Component_Base.State {
    /** Mimics stack to allow for breadcrumb */
    dataState: IDataState;

    /** Prevent requests if working */
    working: boolean;
}

export const PersonaCard = (props: PersonaCardProps): JSX.Element => {
    /* in case both identity and unique attribute is missing, dont render persona Card
       as we can anyways not fetch any information to display
       When display name is the only thing available, the card falls back to display a fake identity with just display name
    */
    return props.uniqueAttribute || props.identity || props.displayName
        ? <PersonaCardInternal {...props} />
        : null;
}

class PersonaCardInternal extends React.Component<PersonaCardProps, PersonaCardState> {
    // Identity service for API calls
    private _IdentityService: Identities_Picker_Services.IdentityService;
    // used to stop processing callbacks if the card is dismissed before data loads
    private _dismissed: boolean;
    private _scenarioDescriptor: Performance.IScenarioDescriptor;
    private _orgCardLoad: number;
    private _contactSectionLoad: number;
    private _routeId: string;

    public componentDidMount(): void {
        this._routeId = Context.getPageContext().navigation.routeId;
        this._scenarioDescriptor = Performance.getScenarioManager().startScenario(this._routeId, personaCardEntity.featureName);
    }

    public componentDidUpdate(prevProps: PersonaCardProps, prevState: PersonaCardState): void {
        // Just a safety check before logging the perf telemetry (scenarioDescriptior is not expected to be inactive here)
        if (this._scenarioDescriptor.isActive()) {
            if (this.state.dataState.cardType === CardType.Default) {
                if (this.state.working && prevState.working) {
                    // Log the default card Contact Section Load perf timing
                    // Right after finishing identity fetch and starting to fetch the direct manager is the only time when the above conditions evaluate to true
                    // Current state.working is true indicates manager fetch currently happening. prevState.working true indicates identity fetch was going on.
                    this._contactSectionLoad = Performance.getTimestamp();
                    this._scenarioDescriptor.addSplitTiming("ContactSectionLoaded", this._contactSectionLoad - this._scenarioDescriptor.getStartTime());
                } else if (!this.state.working && prevState.working) {
                    // Current state.working turned false, which means both identity fetch and direct manager fetch completed
                    // Current state.working will be false even after images fetch complete, after the direct manager fetch
                    // But prevState.working being true means, this is right after manager fetch only and not after images fetch
                    this._scenarioDescriptor.addSplitTiming("ManagerSectionLoaded", Performance.getTimestamp() - this._contactSectionLoad);
                }
            } else if (this.state.dataState.cardType === CardType.Organization) {
                if (this.state.working && !prevState.working) {
                    // Get the timestamp when the cardType is switched to OrgCard and org chain fetch begins
                    // Here prevState working is false for default card, and current working is true to fetch the chain
                    this._orgCardLoad = Performance.getTimestamp();
                } else if (!this.state.working && prevState.working) {
                    // Log the organization card perf telemetry after the org chain (manager and reports to chain) fetch completes
                    // Current state.working will be false even after images fetch complete, after the org chain (manager and reports to chain) fetch
                    // But prevState.working being true means, this is right after org chain fetch only and not after images fetch
                    this._scenarioDescriptor.addSplitTiming("ManagerAndReportsToChainLoaded", Performance.getTimestamp() - this._orgCardLoad);
                }
            }
        }
    }

    constructor(props: PersonaCardProps) {
        super(props);

        // Identity service
        this._IdentityService = Service.getService(Identities_Picker_Services.IdentityService);

        // Setup state data and history
        let initialDataState: IDataState = {
            identity: props.identity,
            managerList: null,
            directReportList: null,
            previousDataState: null,
            cardType: CardType.Default,
            header: props.initialHeader ? props.initialHeader.identity : null,
            displayName: props.displayName,
            imageUrl: props.imageUrl,
            email: this._getEmail()
        };
        let moreWorkNeeded = true;

        if (!props.identity && !props.uniqueAttribute && props.displayName) {
            // All we have is displayName and may be imageUrl. Simply go ahead and setup the state for displaying the card without any identity call.
            initialDataState.identity = {
                entityId: "",
                entityType: "user",
                originDirectory: "vsd",
                originId: "",
                displayName: props.displayName,
                image: props.imageUrl,
                signInAddress: initialDataState.email
            };
            moreWorkNeeded = false;
        }

        this.state = {
            dataState: initialDataState,
            working: moreWorkNeeded
        };

        if (moreWorkNeeded) {
            this._setupInitialData(initialDataState, props.uniqueAttribute);
        }
    }

    public componentWillUnmount(): void {
        this._dismissed = true;
        if (this._scenarioDescriptor.isActive()) {
            this._scenarioDescriptor.end();
        }
    }

    //Render
    public render(): JSX.Element {
        return (
            <PersonaCardContent
                {...this.props}
                dataProps={this.state.dataState}
                onClickEntity={this._onClickEntity}
                onDismissCallback={this._onDismissCallback}
                onShowContactCard={this._onShowContactCard}
                onShowOrganizationCard={this._onShowOrganizationCard}
                working={this.state.working}
                onHeaderClick={this._headerOnClickHandler}
            />
        );
    }

    @autobind
    private _onDismissCallback(): void {
        if (this._scenarioDescriptor.isActive() && !Utils.isCompleteIdentity(this.state.dataState.identity)) {
            this._scenarioDescriptor.addSplitTiming("Spinner load time for card dismissal before identity fetch");
            this._scenarioDescriptor.end();
        }

        this.props.onDismissCallback();
    }

    // Handle going back
    @autobind
    private _headerOnClickHandler(): void {
        if (this.state.dataState.previousDataState) {
            this.setState({
                dataState: this.state.dataState.previousDataState,
                working: false
            });
        } else if (this.props.initialHeader && this.props.initialHeader.onClickFunction) {
            this.props.initialHeader.onClickFunction();
        } else {
            // If the current dataState has a header, its either from previousDataState or an external state
            // Assert here as this statement is unreachable
            Diag.Debug.assert(false, "PersonaCardContent: Either previousDataState or an external state should exist");
        }
    }

    @autobind
    private _onShowContactCard(): void {
        const newDataState: IDataState = {
            ...this.state.dataState,
            previousDataState: this.state.dataState,
            cardType: CardType.Contact,
            header: this.state.dataState.identity
        }
        this.setState({
            dataState: newDataState
        });
    }

    @autobind
    private _onShowOrganizationCard(): void {
        // Do not handle click event if working
        if (this.state.working) {
            return;
        }

        const getConnectionsSuccessCallback = (
            identity: Identities_Picker_RestClient.IEntity,
            connectionsResponse: Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel) => {
            if (!connectionsResponse || !connectionsResponse.managers || !connectionsResponse.directReports || this._dismissed) {
                return;
            }

            connectionsResponse.managers.reverse();

            if (this.state.dataState && this.state.dataState.identity === identity) {
                this.setState({
                    dataState: {
                        ...this.state.dataState,
                        managerList: connectionsResponse.managers,
                        directReportList: connectionsResponse.directReports
                    },
                    working: false
                });
                this._getImagesForDataState();
            }
        };

        const currentDataState = this.state.dataState;

        if (currentDataState.managerList && currentDataState.managerList.length <= 1) { // Only make the call if we don't have the data already
            const currentDataState = this.state.dataState;
            const newDataState: IDataState = {
                ...currentDataState,
                cardType: CardType.Organization,
                header: currentDataState.identity,
                previousDataState: currentDataState
            };
            this.setState({
                dataState: newDataState,
                working: true
            });
            this._IdentityService.getIdentityConnections( // Include direct reports and manager chain
                currentDataState.identity, Utils.isAdUser(currentDataState.identity) ? sourceAdOperationScope : sourceOperationScope, userIdentityType, managerAndDirectReportsConnectionType, null, null, 6)
                .then(response => getConnectionsSuccessCallback(currentDataState.identity, response),
                    (error: Error) => { this._publishErrorTelemetry("ConnectionsOrgCard", error); });
        } else { // Already have the data so we can present
            const currentDataState = this.state.dataState;
            const newDataState: IDataState = {
                ...currentDataState,
                cardType: CardType.Organization,
                header: currentDataState.identity,
                previousDataState: currentDataState
            };
            this.setState({
                dataState: newDataState,
                working: false
            });
        }
    }

    // Handle entity click
    @autobind
    private _onClickEntity(identity: Identities_Picker_RestClient.IEntity): void {
        // Do not handle click event if working
        if (this.state.working) {
            return;
        }

        if (this._scenarioDescriptor.isActive()) {
            this._scenarioDescriptor.end();
            this._scenarioDescriptor = Performance.getScenarioManager().startScenario(this._routeId, personaCardEntity.featureName);
        }

        const currentDataState = this.state.dataState;
        const newDataState: IDataState = {
            identity: identity,
            cardType: CardType.Default,
            header: currentDataState.identity,
            directReportList: [],
            managerList: [],
            previousDataState: currentDataState,
            displayName: identity.displayName,
            imageUrl: identity.image,
            email: identity.mail
        };
        this.setState({
            dataState: newDataState,
            working: true
        });

        // API call to get identity
        this._getIdentityByUniqueAttribute(identity);
    }

    // Helper method to get initial data (which includes only direct manager)
    private _setupInitialData(dataState: IDataState, uniqueAttribute?: string): void {
        if (!dataState.identity) {
            // Get identity first, then get connections in callback
            this._getIdentityByUniqueAttribute(uniqueAttribute);
        } else if (!Utils.isCompleteIdentity(dataState.identity)) {
            // Seems to be cached, refetch identity by unique attribute (entityId)
            this._getIdentityByUniqueAttribute(dataState.identity);
        } else if (Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            // Already have valid identity, call to get connections only in case of authenticated users (avoid call to connections for anonymous users and show just the persona)
            this._IdentityService.getIdentityConnections(dataState.identity, Utils.isAdUser(dataState.identity) ? sourceAdOperationScope : sourceOperationScope, userIdentityType, managerConnectionType, null, null, 1) // Do not include direct reports, get only one manager
                .then(response => this._getConnectionsSuccessCallback(dataState, response),
                    (error: Error) => { this._publishErrorTelemetry("ConnectionsIdentityPassedInDirectManager", error); });
        }
    }

    // Helper method to get identity information given an entity ID
    private _getIdentityByUniqueAttribute(identifier: string | Identities_Picker_RestClient.IEntity): void {
        let uniqueAttribute: string;
        if (typeof (identifier) == "string") {
            uniqueAttribute = identifier;
        } else if (Utils.isAadUser(identifier) || Utils.isAdUser(identifier)) {
            uniqueAttribute = identifier.entityId;
        } else {
            uniqueAttribute = identifier.signInAddress; // VSD users (MSA accounts)
        }

        // Call to get identity
        const queryTypeHint: Identities_Picker_Services.IQueryTypeHint = {
            UID: true,
        };
        const entityOperationsFacadeRequest: Picker_Controls.IEntityOperationsFacadeRequest = {
            identityServiceOptions: {
                operationScope: Context.getPageContext().webAccessConfiguration.isHosted ? sourceImsOperationScope : sourceImsAdOperationScope,
                identityType: userIdentityType,
                httpClient: null,
                extensionData: null,
            },
            identityExtensionOptions: {
                consumerId: this.props.consumerId || Identities_Picker_Constants.ConsumerId.UnknownConsumer,
            },
            prefix: uniqueAttribute,
            queryTypeHint: queryTypeHint,
            sources: ["Directory"]
        };
        this.props.entityOperationsFacade.search(entityOperationsFacadeRequest).then(
            response => {
                for (const key in response.queryTokenResponse) {
                    response.queryTokenResponse[key].then(queryResult => this._getIdentitiesSuccessCallback(queryResult),
                        (error: Error) => { this._publishErrorTelemetry("IdentityNotPresent", error); });
                }
            },
            (error: Error) => {
                this._publishErrorTelemetry("IdentitySearch", error);
                error => Diag.logError("_resolveInputToIdentities/getIdentitiesErrorCallback:" + JSON.stringify(error));
            });
    }


    // Callback for getting identity
    private _getIdentitiesSuccessCallback(identitiesResponse: Identities_Picker_RestClient.QueryTokenResultModel): void {
        if (!identitiesResponse || this._dismissed) {
            return;
        }

        if (!identitiesResponse.identities || identitiesResponse.identities.length == 0) {
            // Identity service didn't fail the identity fetch request, but didn't return an identity either
            const newDataState: IDataState = {
                ...this.state.dataState,
                identity: this._getDerivedIdentity(),
            };
            this.setState({
                dataState: newDataState,
                working: false,
            });
        } else {
            // Get the identity object
            const identity = identitiesResponse.identities[0];

            const hasCompleteIdentity = Utils.isCompleteIdentity(this.state.dataState.identity);
            const requireConnections = Utils.isAadUser(identity) || Utils.isAdUser(identity);
            const imageUrl: string = this.props.imageUrl ? this.props.imageUrl : identity.image;

            // Update data state and working state (visible state updated later)
            const newDataState: IDataState = {
                ...this.state.dataState,
                identity: identity,
                displayName: identity.displayName,
                imageUrl: imageUrl,
            };
            const authenticatedMember = Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember();

            // Check for authenticated users. For authenticated users, go on to make the connections call. For non-authenticated users, stop the calls and load the card with images.
            if (!authenticatedMember) {
                this.setState({ dataState: newDataState, working: false });
                this._getImagesForDataState();
            } else if (!hasCompleteIdentity && requireConnections) {
                this.setState({
                    dataState: newDataState,
                    working: true
                });
                this._IdentityService.getIdentityConnections(identity, Utils.isAdUser(identity) ? sourceAdOperationScope : sourceOperationScope, userIdentityType, managerConnectionType, null, null, 1) // Do not include direct reports, get only one manager
                    .then((response) => this._getConnectionsSuccessCallback(newDataState, response),
                        (error: Error) => { this._publishErrorTelemetry("ConnectionsIdentityFetchedDirectManager", error); });
            } else {
                this.setState({
                    working: true
                });
                this._setupInitialData(newDataState);
            }
        }
    }

    // Callback for getting connections for identity
    @autobind
    private _getConnectionsSuccessCallback(dataState: IDataState, connectionsResponse: Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel): void {
        if (!connectionsResponse || !connectionsResponse.managers || this._dismissed) {
            return;
        }

        // Set visible after all data (except images) has been loaded
        this.setState({
            dataState: {
                ...dataState,
                managerList: connectionsResponse.managers.reverse(),
                directReportList: connectionsResponse.directReports
            },
            working: false
        });

        this._getImagesForDataState();
    }

    private _getDerivedIdentity(): Identities_Picker_RestClient.IEntity {
        if (this.state.dataState.identity) {
            return this.state.dataState.identity
        }
        const imageUrl: string = this.props.imageUrl ? this.props.imageUrl : this.state.dataState.imageUrl;

        // Fake the passed in display name as a vsd identity for displaying a persona card or show "No identities found"
        return {
            entityId: "",
            entityType: "user",
            originDirectory: "vsd",
            originId: "",
            displayName: this.state.dataState.displayName
                ? this.state.dataState.displayName
                : Resources_Platform.IdentityPicker_NoResult,
            image: imageUrl,
            signInAddress: this.state.dataState.email
        };
    }

    // Helper method to get images for current identities in data state (updates state)
    private _getImagesForDataState(): void {
        const currentDataState = this.state.dataState;
        const identityList: Identities_Picker_RestClient.IEntity[] = [
            ...(currentDataState.identity.image ? [] : [currentDataState.identity]),
            ...(currentDataState.managerList || []).filter(i => !i.image),
            ...(currentDataState.directReportList || []).filter(i => !i.image)
        ];

        if (identityList && identityList.length > 0) {
            this.props.entityOperationsFacade.getImagesForEntities(identityList).then(this._getImagesForEntitiesCallback.bind(this), (error: Error) => { this._publishErrorTelemetry("Image", error); });
        }
    }

    // Callback for getting images for entities
    private _getImagesForEntitiesCallback(entityIdUrlMap: IDictionaryStringTo<string>): void {
        if (!entityIdUrlMap || this._dismissed) {
            return;
        }

        const newIdentity = this.state.dataState.identity;
        const newManagerList = this.state.dataState.managerList;
        const newDirectReportList = this.state.dataState.directReportList || []; // Direct reports are optional

        const allIdentities = [...newDirectReportList, ...newManagerList, newIdentity];
        for (const entity of allIdentities) {
            if (entity.entityId in entityIdUrlMap) {
                entity.image = entityIdUrlMap[entity.entityId];
            }
        }

        this.setState({
            dataState: {
                ...this.state.dataState,
                identity: newIdentity,
                managerList: newManagerList,
                directReportList: newDirectReportList
            }
        });
    }

    private _getEmail(): string {
        // This is for displaying a fall back card when identities search doesn't fetch any identity
        if (Utils.isAadUser(this.props.identity) || Utils.isAdUser(this.props.identity)) {
            return this.props.identity.mail;
        } else if (this.props.identity && this.props.identity.signInAddress) {
            return this.props.identity.signInAddress;
        } else if (this.props.identity && this.props.identity.mail) {
            return this.props.identity.mail;
        } else if (this.props.uniqueAttribute) {
            // Check if uniqueAttribute is an email
            const parts = this.props.uniqueAttribute.split("@");
            if (parts.length === 2 && parts[0].length >= 1 && parts[1].length >= 3) {
                const domainParts = parts[1].split(".");
                if (domainParts.length > 1) {
                    return this.props.uniqueAttribute;
                }
            }
        }

        return null;
    }

    private _publishErrorTelemetry(fetchType: string, error: Error): void {
        const routeId = Context.getPageContext().navigation.routeId;
        const telemetryProperties: IDictionaryStringTo<any> = {
            "Action": Utils_String.format("{0} fetch failed", fetchType),
            "ErrorName": error.name,
            "ErrorMessage": error.message,
        }
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            routeId,
            personaCardEntity.featureName,
            telemetryProperties)
        );
    }
}