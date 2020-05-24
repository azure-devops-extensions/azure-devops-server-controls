import * as React from "react";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { ContentLoadState, PathApplicationMode } from "SearchUI/Components/PathSelector/PathSelector.Props";
import { PathSelector } from "SearchUI/Components/PathSelector/PathSelector";
import { FilterBarItem, IFilterBarItemProps, IFilterBarItemState } from "SearchUI/FilterBar";
import { BranchFilterItem } from "Search/Scenarios/Code/Components/BranchFilterItem";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { StoresHub } from "Search/Scenarios/Code/Flux/StoresHub";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";

export interface IBranchSelectorFilterBarItemProps extends IFilterBarItemProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;

    items: _SearchSharedContracts.Filter[];

    project: string;

    enabled: boolean;

    onSelectionChanged: (name: string, path: string) => void;

    showFooter: boolean;
}

export interface IBranchSelectorFitlerBarItemState extends IFilterBarItemState<string[]> {
    repositoryId: string;
}

export class BranchSelectorFilterBarItem extends FilterBarItem<string[], IBranchSelectorFilterBarItemProps, IBranchSelectorFitlerBarItemState> {
    constructor(props: IBranchSelectorFilterBarItemProps) {
        super(props);
        this.state = this.getState(props);
    }

    public focus(): void {
    }

    public forceUpdate(): void {
    }

    public render(): JSX.Element {
        const { filterItemKey, items, enabled } = this.props;
        const defaultSelectedItem = items.filter(item => item.selected)[0];

        return <PathSelector
            name={filterItemKey}
            enabled={enabled}
            items={items}
            defaultSelectedItem={defaultSelectedItem}
            searchTextPlaceholder={Resources.BranchDropdownPlaceholderText}
            label={Resources.BranchDisplayLabel}
            searchBoxClearTextAriaLabel=""
            applyButtonAriaLabel=""
            contentLoadState={ContentLoadState.LoadSuccess}
            onSelectionChanged={this.onSelectionChanged}
            onGetFooterMessage={this.onGetFooterMessage}
            behaviour={
                {
                    pathApplicationMode: PathApplicationMode.allowOnlyValid,
                    getActivatedItemIndexOnActivation: (items: _SearchSharedContracts.Filter[], textBoxInput: string) => { return 0; },
                    getItemsOnActivation: (items: _SearchSharedContracts.Filter[], textBoxInput: string) => {
                        return items;
                    },
                    getPath: (item: _SearchSharedContracts.Filter) => {
                        return item ? item.id : "";
                    },
                    onItemRender: (item: _SearchSharedContracts.Filter, hitText: string, highlight: boolean) => {
                        return <BranchFilterItem item={item} hitText={hitText} />;
                    }
                }
            }
            calloutProps={
                {
                    title: Resources.RefineFiltersText,
                    content: Resources.BranchFilterCalloutContent
                }
            } />;
    }

    public componentDidMount(): void {
        this.props.storesHub.repositoryContextStore.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.repositoryContextStore.removeChangedListener(this.onStoreChanged);
    }

    private onSelectionChanged = (name: string, path: string): void => {
        this.setFilterValue({ value: [path] });
        const { onSelectionChanged } = this.props;
        if (onSelectionChanged) {
            onSelectionChanged(name, path);
        }
    }

    private onGetFooterMessage = (): JSX.Element => {
         const { repositoryId } = this.state, { project, showFooter } = this.props, tfs = TfsContext.getDefault();
         const link = tfs.getActionUrl("", "versioncontrol", {
             area: "admin",
             project, _a: "options",
             repositoryId
         } as IRouteData);

         if (showFooter) {
             return (
                 <div>
                    <FormatComponent format={Resources.BranchFilterFooterFormat}>
                        {
                            <a href={link}>{Resources.BranchFilterFooterLink}</a>
                        }
                    </FormatComponent>
                 </div>
             );
         }

         return null;
	}

    private onStoreChanged = (): void => {
        const newState = this.getState(this.props);
        if (newState.repositoryId !== this.state.repositoryId) {
            this.setState(newState);
        }
    }

    private getState = (props: IBranchSelectorFilterBarItemProps): IBranchSelectorFitlerBarItemState => {
        const { repositoryContext } = props.storesHub.repositoryContextStore.state,
            repositoryId = repositoryContext && repositoryContext.getRepositoryId();
        return {
            repositoryId
        };
    }
}
