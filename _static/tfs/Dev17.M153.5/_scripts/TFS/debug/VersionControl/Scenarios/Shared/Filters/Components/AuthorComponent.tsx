import { delegate } from "VSS/Utils/Core";
import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import { IEntity } from "VSS/Identities/Picker/RestClient";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityPickerBaseComponent, IdentityPickerBaseComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerBaseComponent";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

export interface AuthorComponentProps extends IdentityPickerBaseComponentProps {
    mruAuthors?: string[];
    repositoryId: string;
    placeholderText: string;
}

export class AuthorComponent extends IdentityPickerBaseComponent<AuthorComponentProps, {}> {
    private _mruAuthors: IEntity[] = [];
    private _currentUser: string;

    constructor(props: AuthorComponentProps) {
        super(props);
        const currentUserIdentity = TfsContext.getDefault().currentIdentity;
        this._currentUser = IdentityPickerBaseComponent.getDistinctDisplayName(currentUserIdentity.displayName, currentUserIdentity.email);

        const mruAuthors = props.mruAuthors || [];
        const sortedMruAuthors = Utils_Array.union(mruAuthors, [this._currentUser], delegate(this, this._authorFullNameComparer));
        $.each(sortedMruAuthors, (index: number, authorFullName: string) => {
            this._mruAuthors.push(this._createStringEntity(authorFullName));
        });
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();

        if (this.props.mruAuthors) {
            const newMruAuthorList = this.props.mruAuthors.map((author: string, index: number) => {
                return this._createStringEntity(author);
            });

            this._addSearchResultsToMru(newMruAuthorList);
        }
    }

    protected getInitialIdentity(fullName: string): IEntity {
        return this._createStringEntity(fullName);
    }

    protected onIdentityPickerSelectionChange(entity: IEntity): void {
        super.onIdentityPickerSelectionChange(entity);
        const filterValue = entity ? this._getDecodedFilterValue(entity.displayName, entity.mail) : "";
        this.props.onUserInput(this.props.filterKey, filterValue);
    }

    protected getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        const identityType: Identities_Picker_Services.IEntityType = {
            User: true
        };

        const operationScope: Identities_Picker_Services.IOperationScope = {
            Source: true,
            IMS: true
        };

        return {
            showMruTriangle: true,
            operationScope: operationScope,
            identityType: identityType,
            consumerId: "9A9B4218-2DAA-4ACF-8AA1-D685D447139B",
            showContactCard: true,
            pageSize: 10,
            size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,
            placeholderText: this.props.placeholderText,
            extensionData: {
                extensionId: "F0A24BB9-C80B-4CF2-9083-7C90416E2960",
                constraints: [this.props.repositoryId]
            },
            callbacks: {
                preDropdownRender: (entityList: IEntity[]) => {
                    const filteredEntityList: IEntity[] = [];
                    // the list of mru authors is maintained locally (in _mruAuthors) for this instance of IdentityPicker control
                    // so from the entityList remove the items which were populated by the IdentityPickerMru service
                    $.each(entityList, (index: number, entity: IEntity) => {
                        if (!entity.isMru) {
                            filteredEntityList.push(this._createStringEntity(entity.displayName));
                        }
                    });

                    // case 1: User starts typing directly into the search box and dropdown is not yet visible, we should filter the mruAuthor list with search term 
                    // case 2: If the dropdown is opened to show mru results and the user starts entering a search term into search box
                    //         In this case the filteredEntityList will be empty and we need to filter the mruAuthor list
                    // case 3: If the dropdown was opened and user searched for a term by clicking search icon and matching results were returned from the server
                    //         In this case filteredEntityList will be non-empty and just return it back without any modification.
                    // case 4: If the dropdown was opened and user searched for a term by clicking search icon and no matching results were returned from the server
                    //         In this case filteredEntityList will be empty and we would fallback to case 2. 
                    //         Some additional processing is done on the mruList but there is no impact on the result set returned, it will still be empty
                    //         Currently there is no way to identify if we are in directory Search mode or filtering mode on the identity picker control, hence this logic
                    // case 5: The dropdown was opened and not in filtering mode(no search term entered). In this case return the mruAuthor list 

                    // case 1 & 2 & 4
                    if (!this.getIdentityPickerSearchControl().isDropdownVisible() ||
                        (this.getIdentityPickerSearchControl().isDropdownFiltered() && (filteredEntityList.length === 0))) {

                        const prefix = this.getIdentityPickerSearchControl().getDropdownPrefix().toLowerCase() || "";
                        $.each(this._mruAuthors, (index, entity: IEntity) => {
                            if ((entity.displayName && entity.displayName.trim().toLowerCase().indexOf(prefix) === 0)
                                || (entity.mail && entity.mail.trim().toLowerCase().indexOf(prefix) === 0)) {
                                filteredEntityList.push(entity);
                            }
                        });

                        return filteredEntityList;
                    }
                    // case 5
                    else if (!this.getIdentityPickerSearchControl().isDropdownFiltered()) {
                        return this._mruAuthors;
                    }
                    // case 3
                    else {
                        this._addSearchResultsToMru(filteredEntityList);
                        return filteredEntityList;
                    }
                }
            }
        };

    }

    private _createStringEntity(fullName: string): IEntity {
        const identityReference = SearchCriteriaUtil.getTFSIdentityfromAuthor(fullName);
        let entity: IEntity;
        if (identityReference) {
            const imageUrl = TfsContext.getDefault().getIdentityImageUrl(null, { email: fullName, defaultGravatar: "mm" });
            entity = Identities_Picker_Controls.EntityFactory.createStringEntity(identityReference.displayName, imageUrl);
            // createStringEntity() internally HTML encodes the display name, which causes it to appear in the picker control in encoded form.
            // Using htmlEncodeJavascriptAttribute() instead leaves single quotes unencoded, so we don't mangle names with apostrophes.
            entity.displayName = Utils_String.htmlEncodeJavascriptAttribute(identityReference.displayName);
            entity.mail = identityReference.alias;
        }
        return entity;
    }

    private _addSearchResultsToMru(searchResults: IEntity[]): void {
        this._mruAuthors = Utils_Array.union(this._mruAuthors, searchResults, (a: IEntity, b: IEntity) => {
            return this._authorFullNameComparer(
                IdentityPickerBaseComponent.getDistinctDisplayName(a.displayName, a.mail),
                IdentityPickerBaseComponent.getDistinctDisplayName(b.displayName, b.mail)
                );
        });
    }

    private _authorFullNameComparer(firstAuthorFullName: string, secondAuthorFullName: string): number {
        if (Utils_String.equals(firstAuthorFullName, this._currentUser, true) && Utils_String.equals(secondAuthorFullName, this._currentUser, true)) {
            return 0;
        } else if (Utils_String.equals(firstAuthorFullName, this._currentUser, true)) {
            return -1;
        } else if (Utils_String.equals(secondAuthorFullName, this._currentUser, true)) {
            return 1;
        } else {
            return Utils_String.ignoreCaseComparer(firstAuthorFullName, secondAuthorFullName);
        }
    }
}
