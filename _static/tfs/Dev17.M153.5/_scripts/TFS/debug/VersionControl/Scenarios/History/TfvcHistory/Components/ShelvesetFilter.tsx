import * as React from "react";
import * as ReactDOM from "react-dom";

import { IContextIdentity } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityPickerComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerComponent";

import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export function RenderFilter(element: HTMLElement, filterProps: ShelvesetFilterProps): ShelvesetFilter {
    return ReactDOM.render(<ShelvesetFilter {...filterProps} />, element) as ShelvesetFilter;
}

export interface ShelvesetFilterSearchCriteria {
    user: string;
    userId: string;
}

export interface ShelvesetFilterProps {
    filterUpdatedCallback(filterSearchCriteria: ShelvesetFilterSearchCriteria): void;
    initialSearchCriteria: ShelvesetFilterSearchCriteria;
    currentIdentity: IContextIdentity;
}

export class ShelvesetFilter extends React.Component<ShelvesetFilterProps, {}> {

    public render(): JSX.Element {

        const userString = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            displayName: this.props.initialSearchCriteria.user,
            alias: this.props.initialSearchCriteria.userId,
        });
        return (
            <div className={"vc-shelveset-filter"} role={"region"} aria-label={VCResources.TfvcShelvesetsFilterAriaLabel} >
                <IdentityPickerComponent
                    filterKey={"userString"}
                    onUserInput={(filterKey, filterValue) => this._handleFilterUpdated(filterValue)}
                    filterValue={userString}
                    identityPickerSearchControlId={"shelveset-author-identity-picker"}
                    identityPickerSearchControlClass={"vc-filter-identity-picker"}
                    placeholderText={VCResources.FilterShelvesetOwnerText}
                    consumerId={"846C7F15-914F-47D5-93F9-4F9CF3D936AE"}
                />
            </div>
        );
    }

    private _handleFilterUpdated(filterValue: string): void {
        const userIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(filterValue);
        const searchCriteria: ShelvesetFilterSearchCriteria = {
            user: userIdentity.displayName,
            userId: userIdentity.alias,
        };
        this.props.filterUpdatedCallback(searchCriteria);
    }
}
