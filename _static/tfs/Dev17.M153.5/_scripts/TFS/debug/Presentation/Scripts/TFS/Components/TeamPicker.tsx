import * as Controls from "VSS/Controls";
import { WebApiTeam, TeamProjectReference, TeamProject } from "TFS/Core/Contracts";
import { CoreHttpClient4_1, getClient as getCoreClient } from "TFS/Core/RestClient";
import * as VSS_Service from "VSS/Service";
import { VssConnection } from "VSS/Service";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityPickerSearchControl, IdentityPickerControlSize, EntityOperationsFacade, IEntityOperationsFacadeRequest } from "VSS/Identities/Picker/Controls";
import { IEntity, IdentitiesSearchRequestModel } from "VSS/Identities/Picker/RestClient";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { ServiceHelpers } from "VSS/Identities/Picker/Services";
import * as Service from "VSS/Service";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import * as React from "react";
import { DelayedFunction } from "VSS/Utils/Core";
import { autobind, css } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";

namespace DefaultTeamChoices {
    const connection = VssConnection.getConnection();
    const idClient = connection.getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);

    const myTeams: {[id: string]: IPromise<WebApiTeam[]>} = {};
    export function getMyTeams(projectId: string): IPromise<WebApiTeam[]> {
        if (!(projectId in myTeams)) {
            myTeams[projectId] = (projectId ?
                getCoreClient().getTeams(projectId, true, 100, 0) :
                getCoreClient().getAllTeams(true, 100, 0));
        }
        return myTeams[projectId];
    }

    const facadeService = Service.getService(EntityOperationsFacade);
    function toEntity(team: WebApiTeam): IEntity {
        return {
            displayName: `[${team.projectName}]\\${team.name}`,
            entityType: ServiceHelpers.GroupEntity,
            originDirectory: ServiceHelpers.VisualStudioDirectory,
            localId: team.id,
        } as IEntity;
    }

    async function hardGetTeamChoices(projectId: string): Promise<IEntity[]> {
        const teams = await getMyTeams(projectId);
        let entities: IEntity[] = [];
        const {team, project} = TfsContext.getDefault().contextData;
        if (
            !team || !project ||
            teams.some(({projectName, name}) => projectName === project.name && name === team.name)
        ) {
            entities = teams.map(toEntity);
        } else {
            const currentTeam = await getCoreClient().getTeam(project.id, team.id);
            const teamEntity = {
                displayName: `[${currentTeam.projectName}]\\${currentTeam.name}`,
                entityType: ServiceHelpers.GroupEntity,
                originDirectory: ServiceHelpers.VisualStudioDirectory,
                localId: currentTeam.id,
            } as IEntity;
            entities = [...teams.map(toEntity), teamEntity];
        }
        entities.sort((a, b) => a.displayName.localeCompare(b.displayName));
        const searchResults = await idClient.beginGetIdentities({
            query: entities.map((e) => e.localId).join(";"),
            identityTypes: [ServiceHelpers.GroupEntity],
            operationScopes: ["ims"],
            queryTypeHint: "uid"
        } as IdentitiesSearchRequestModel);
        const entityMap: {[id: string]: IEntity} = {};
        for (const e of entities) {
            entityMap[e.localId] = e;
        }
        for (const response of searchResults.results) {
            for (const id of response.identities) {
                entityMap[id.localId].entityId = id.entityId;
            }
        }
        return await Promise.all(entities.map(
            async (e) => {
                const image = await idClient.beginGetIdentityImageLocation(e.entityId);
                return {...e, image};
            }
        ));
    }

    const teamChoices: {[projectId: string]: Promise<IEntity[]>} = {};
    export function getChoices(projectId: string) {
        if (!(projectId in teamChoices)) {
            teamChoices[projectId] = hardGetTeamChoices(projectId);
        }
        return teamChoices[projectId];
    }
}

const TEAM_PICKER_SEARCH_EXTENSION_ID: string = "0C6230A3-7855-463E-9C96-E704A01AB431";
export interface ITeamPickerProps {
    onChanged: (value: string) => void;
    projectId: string;
    projectName: string;
    crossProject: boolean;
}
export interface ITeamPickerState {
    hidden: boolean;
}

export class TeamPicker extends React.Component<ITeamPickerProps, ITeamPickerState> {
    private static readonly TEAM_REGEX = /\[.+\]\\.+/;
    private _picker: IdentityPickerSearch;
    private _currentText: string;
    constructor(props: ITeamPickerProps) {
        super(props);
        this.state = {
            hidden: false,
        };
    }
    private readonly change = new DelayedFunction(null, 200, "valueChanged", () => {
        this.props.onChanged(this._currentText);
    });

    public render() {
        const tfsContext = TfsContext.getDefault();

        let defaultTeams: IEntity[] = [];
        const defaultTeamsSet: {[lowerCaseDisplayName: string]: void} = {};
        DefaultTeamChoices.getChoices(this.props.crossProject ? null : this.props.projectId).then((teams) => {
            defaultTeams = teams;
            for (const {displayName} of teams) {
                defaultTeamsSet[displayName.toLocaleLowerCase()] = undefined;
            }
        });
        const preDropdownRender = (entities: IEntity[], isDirectorySearchEnabled?: boolean): IEntity[] => {
            const lower = (s: string) => s.toLocaleLowerCase();
            const searchText = lower(this._picker.getInputText());
            const hasIdentity = !!TeamPicker.TEAM_REGEX.exec(searchText);
            if (!searchText || hasIdentity) {
                entities.length = 0;
                entities.push(...defaultTeams);
            } else if (!isDirectorySearchEnabled) {
                for (const team of defaultTeams) {
                    if (lower(team.displayName).indexOf(searchText) >= 0) {
                        entities.push(team);
                    }
                }
            }
            return entities;
        };

        return <div
            className="team-picker"
            hidden={this.state.hidden}
        >
            <IdentityPickerSearch
                ref={this.setRef}
                focusOnLoad={false}
                multiIdentitySearch={false}
                showMruTriangle={false}
                showTemporaryDisplayName={true}
                highlightResolved={true}
                controlSize={IdentityPickerControlSize.Small}
                operationScope={{
                    IMS: true,
                }}
                includeUsers={false}
                includeGroups={true}
                placeholderText={PresentationResources.SearchTeams}
                onCharacterChange={this.onCharacterChange}
                preDropdownRender={preDropdownRender}
                consumerId="6de676b2-b365-43fa-b198-d05fa1762175"
                extensionData={{
                    extensionId: TEAM_PICKER_SEARCH_EXTENSION_ID,
                    projectScopeName: this.props.crossProject ? null : this.props.projectName,
                    constraints: null,
                }}
                inlineSelectedEntities={true}
                showContactCard={false}
                showMruOnClick={true}
            />
        </div>;
    }

    @autobind
    private setRef(ref: IdentityPickerSearch) {
        this._picker = ref;
    }

    @autobind
    private onCharacterChange(entities: IEntity[], text: string) {
        const entity = entities && entities[0];
        const newText = entity && (entity.localId ? `${entity.displayName} <id:${entity.localId}>` : entity.displayName) || text;
        if (newText !== this._currentText) {
            this._currentText = newText;
            this.change.reset();
        }
    }

    public getText(): string {
        return this._currentText || "";
    }

    public setEnabled(enabled: boolean) {
        // noop
    }

    public setHidden(hidden: boolean) {
        this.setState({hidden});
    }

    public setText(text: string): void {
        if (text) {
            const {displayName, id} = IdentityHelper.parseUniquefiedIdentityName(text);
            if (id) {
                const uniqueName = `${displayName} <${id}>`;
                this._picker.setEntities([], [uniqueName]);
            } else {
                const entity = {
                    entityId: "",
                    displayName,
                    originDirectory: ServiceHelpers.VisualStudioDirectory,
                    entityType: ServiceHelpers.GroupEntity,
                } as IEntity;
                this._picker.setEntities([entity], []);
            }
        } else {
            this._picker.setEntities([], []);
        }
        this._currentText = text;
    }
}
