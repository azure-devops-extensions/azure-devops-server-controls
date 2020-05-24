import { delegate } from "VSS/Utils/Core";
import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IdentityPickerBaseComponent, IdentityPickerBaseComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerBaseComponent";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface PullRequestIdentityPickerComponentComponentProps extends IdentityPickerBaseComponentProps {
    mruAuthors?: string[];
    repositoryId: string;
    placeholderText: string;
    ariaLabel?: string;
    showGroups: boolean;
    tfsContext: TfsContext;
}

export interface PullRequestIdentity extends SearchCriteriaUtil.TfsAuthorIdentity {
    originId: string;
}

export class PullRequestIdentityPickerHelpers {
    /**
     * Stringifies a selected pull request identity for binding to a filter object
     */
    public static getIdentityStringFromPrIdentity(identity: PullRequestIdentity): string {
        const authorString = ((identity.displayName ? identity.displayName : "")
             + (identity.alias ? " <" + identity.alias + ">" : "")
             + (identity.originId ? ` [[${identity.originId}]]` : ""));

        return authorString || null;
    }

    /**
     * Stringifies an IEntity object for binding to a filter object
     */ 
    public static getIdentityStringFromTfsIdentity(entity: IEntity): string {
        let value: string = "";

        if (entity) {
            if (!entity.signInAddress) {
                value = entity.displayName + " <->"; // Placeholder to create a data shape similar to a user (for parsing methods)
            } else {
                value = IdentityHelper.getDistinctDisplayName(entity.displayName, entity.signInAddress);
            }
        }

        if (value && entity.localId) {
            value += ` [[${entity.localId}]]`;
        }

        return value;
    }

    /**
     * Parses a string representing a pull request identity and returns an object representation
     */
    public static parseIdentityString(value: string): PullRequestIdentity {
        let author: PullRequestIdentity = {
            alias: null,
            displayName: null,
            originId: null
        };

        if (!value)
            return author;

        const aliasStart = value.indexOf("<");
        let idStart = value.indexOf("[[");
        let idEnd = value.lastIndexOf("]]");
        
        if (aliasStart === -1) {
            // Got a group string of the form "GroupName [[groupId]]"; parse this slightly differently
            author.displayName = value.substr(0, idStart - 1);
        } else {
            author = SearchCriteriaUtil.getTFSIdentityfromAuthor(value.substr(0, idStart-1)) as PullRequestIdentity;
            author.alias = author.alias && author.alias.length > 1 ? author.alias : null; // Mask out the placeholder that gets added for groups
        }

        idStart = (idStart === -1) ? value.length : idStart+1;
        idEnd = (idEnd === -1) ? value.length : idEnd;
        author.originId = value.substring(idStart + 1, idEnd).trim();

        return author;
    }
}

export class PullRequestIdentityPickerComponent extends IdentityPickerBaseComponent<PullRequestIdentityPickerComponentComponentProps, {}> {

    constructor(props: PullRequestIdentityPickerComponentComponentProps) {
        super(props);
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate(); 
    }

    protected getInitialIdentity(fullName: string): IEntity {
        const prIdentity = PullRequestIdentityPickerHelpers.parseIdentityString(fullName);
        const imageUrl = TfsContext.getDefault().getIdentityImageUrl(prIdentity.originId, { defaultGravatar: "mm" });
        const entity = Identities_Picker_Controls.EntityFactory.createStringEntity(prIdentity.displayName, imageUrl);
        entity.displayName = prIdentity.displayName;
        return entity;
    }

    protected onIdentityPickerSelectionChange(entity: IEntity): void {
        const filterValue = PullRequestIdentityPickerHelpers.getIdentityStringFromTfsIdentity(entity);

        if (entity)
            this.getIdentityPickerSearchControl().addIdentitiesToMru([entity]);

        this.props.onUserInput(this.props.filterKey, filterValue);
        super.onIdentityPickerSelectionChange(entity);
    }

    private _constructTeamNameForFilterDisplay(): string {
        return `[${this.props.tfsContext.contextData.project.name}]\\${this.props.tfsContext.currentTeam.name}`;
    }

    protected getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        const identityType: Identities_Picker_Services.IEntityType = {
            User: true,
            Group: this.props.showGroups
        };

        const operationScope: Identities_Picker_Services.IOperationScope = {
            Source: true,
            IMS: true
        };

        return {
            showMruTriangle: true,
            operationScope,
            identityType,
            consumerId: "CCD45B04-D52D-4A09-B188-E93E85479C4A",
            showContactCard: false,
            pageSize: 10,
            loadOnCreate: true,
            size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,
            placeholderText: this.props.placeholderText,
            ariaLabel: this.props.ariaLabel,
            callbacks: {
                preDropdownRender: (entityList: IEntity[]) => {
                    let currentTeamEntity: IEntity = null;
                    let currentUserEntity: IEntity = null;
                    const filteredEntityList: IEntity[] = [];
                    const searchInput = this.getIdentityPickerSearchControl().getDropdownPrefix();
                    if (!(searchInput && searchInput.length > 0)) {
                        const imageUrl = this.props.tfsContext.getIdentityImageUrl(this.props.tfsContext.currentIdentity.id, { defaultGravatar: "mm" });
                        currentUserEntity = Identities_Picker_Controls.EntityFactory.createStringEntity(this.props.tfsContext.currentIdentity.displayName, imageUrl);

                        // Set a few properties on the string entity that aren't populated by createStringEntity()
                        currentUserEntity.displayName = this.props.tfsContext.currentIdentity.displayName;
                        currentUserEntity.signInAddress = this.props.tfsContext.currentIdentity.email;
                        currentUserEntity.localId = this.props.tfsContext.currentIdentity.id;

                        filteredEntityList.push(currentUserEntity);

                        if (this.props.showGroups && this.props.tfsContext.currentTeam) {
                            const teamImage = this.props.tfsContext.getIdentityImageUrl(this.props.tfsContext.currentTeam.identity.id, { defaultGravatar: "mm" });
                            currentTeamEntity = Identities_Picker_Controls.EntityFactory.createStringEntity(this.props.tfsContext.currentTeam.identity.displayName, teamImage);

                            // Set a few properties on the string entity that aren't populated by createStringEntity()
                            currentTeamEntity.displayName = this._constructTeamNameForFilterDisplay();
                            currentTeamEntity.localId = this.props.tfsContext.currentTeam.identity.id;

                            filteredEntityList.push(currentTeamEntity);
                        }
                    }

                    $.each(entityList, (index: number, entity: IEntity) => {
                        // De-dupe the entries we pushed to the top (current user and/or team)
                        if (entity.localId && (!currentUserEntity || entity.localId !== currentUserEntity.localId)
                             && (!currentTeamEntity || entity.localId !== currentTeamEntity.localId)) {
                            filteredEntityList.push(entity);
                        }
                    });

                    return filteredEntityList;
                }
            }
        };
    }
}