import * as VSSStore from  "VSS/Flux/Store";
import { IHubStore, HubItemGroup, HubData, IHubItem, IHubHeaderProps, IHubGroupColumn} from  "MyExperiences/Scenarios/Shared/Models";
import * as Events_Services from "VSS/Events/Services";
import {HubActions} from "MyExperiences/Scenarios/Shared/Actions";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

export abstract class HubStoreBase extends VSSStore.Store implements IHubStore {

    private _alert: JSX.Element;
    private _allGroups: HubItemGroup<IHubItem>[];
    private _filteredGroups: HubItemGroup<IHubItem>[];
    private _filterWatermark: string;
    private _isLoading: boolean = false;
    private _title: string;
    private _header: IHubHeaderProps;
    private _zeroData: ZeroData.Props;
    protected _filterText: string = '';
    private _filterInProgress: boolean = false;
    private _previousGroupState: HubItemGroup<IHubItem>[];  

    constructor(header: IHubHeaderProps) {
        super();

        HubActions.HubFilterAction.addListener((filter) => {
            this.filterText = filter;

            if (filter) {
                this.preFilter();
            }
            else {
                this.postFilter();
            }
        });

        this._filterText = '';
        this._header = header;
        this._allGroups = [];
        this._filteredGroups = [];
        this._alert = null;
        this._zeroData = null;
        this._filterInProgress = false;
    }
    
    private applyFilter() : void {

        // Start with all groups
        this._filteredGroups = this._allGroups;
        this._filterInProgress = this._filterText !== "";

        // Apply text filter if provided
        if (this._filterText) {
            this._filteredGroups = this._filteredGroups.map(group => group.isLoading ? group: group.filter(this._filterText));
        }

        // Remove empty groups that are not still loading. 
        this._filteredGroups = this._filteredGroups.filter(group => group.items.length > 0 || group.isLoading);
    }

    protected preFilter(): void {

    }

    protected postFilter(): void {

    }
    
    private set filterText(newFilterText: string) {
        this._filterText = newFilterText;
        this.applyFilter();
        this.emitChanged();
    }

    private announceFilterResult(): void {
        if (!this._filterInProgress) {
            return;
        }
        this._filterInProgress = false;

        let count = this._filteredGroups.length;
        if (count === 0) {
            Utils_Accessibility.announce(MyExperiencesResources.Search_NoResultsFound);
        } else {
            let message = Utils_String.format(MyExperiencesResources.AnnounceFilterResult, count, this._filterText);
            Utils_Accessibility.announce(message);
        }
    }

    protected set groups(newGroups: HubItemGroup<IHubItem>[]) {
        this._allGroups = newGroups;
        this.applyFilter();
        this.emitChanged();
        this.announceFilterResult();
    }

    protected set isLoading(newIsLoading: boolean) {
        this._isLoading = newIsLoading;
        this.emitChanged();
    }
    
    protected set alert(newAlert: JSX.Element) {
        this._alert = newAlert;
        this.emitChanged();
    }

    protected set zeroData(newZeroData: ZeroData.Props) {
        this._zeroData = newZeroData;
        this.emitChanged();
    }
    
    public getData(): HubData {
        return {
            alert: this._alert,
            groups: this._filteredGroups,
            isLoading: this._isLoading,
            header: this._header,
            zeroData: this._zeroData,
            allowGroupReordering: false,
            isFilterInUse: this._filterInProgress
        };
    }
}