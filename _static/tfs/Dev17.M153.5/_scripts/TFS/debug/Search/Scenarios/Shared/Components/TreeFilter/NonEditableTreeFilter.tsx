import * as React from "react";
import * as _TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as _FocusZone from "OfficeFabric/FocusZone";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ITreeFilterProps, ContentLoadState } from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import { TreeDropdown } from "Search/Scenarios/Shared/Components/TreeFilter/TreeDropdown";
import { ComboBox } from "Search/Scenarios/Shared/Components/TreeFilter/ComboBox";
import { normalizePath, getActiveDescendantIndex } from "Search/Scenarios/Shared/Components/TreeFilter/TreeUtils";
import { SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/TreeFilter/TreeFilter";

export interface INonEditableTreeFilterState {
    active: boolean;
}

export class NonEditableTreeFilter extends React.Component<ITreeFilterProps, INonEditableTreeFilterState> {
    private root: HTMLElement;

    constructor(props) {
        super(props);
        this.state = { active: false };
    }

    public render(): JSX.Element {
        const {
            enabled,
            label,
            defaultPath,
            contentLoadState,
            calloutProps,
            name,
            items,
            pathSeparator
        } = this.props,
            { active } = this.state;

        const isLoading = contentLoadState === ContentLoadState.Loading;

        return (
            <div className="tree-control-root" ref={root => this.root = root}>
                <ComboBox
                    editable={false}
                    enabled={enabled}
                    comboBoxLabel={label}
                    comboBoxText={defaultPath}
                    disabledInfoCalloutProps={calloutProps}
                    onComboBoxClick={this._toggleDropdown}
                    onChevronClick={this._toggleDropdown} />
                {
                    active &&
                    <Callout
                        setInitialFocus={true}
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        isBeakVisible={false}
                        onDismiss={this._onDismiss}
                        target={this.root}
                        className="treeView-dropdown-callout">
                        {
                            !isLoading ? (
                                <TreeDropdown
                                    {...this.props}
                                    onGetFooterMessage={this.onGetFooterMessage}
                                    onTreeItemRender={this.onTreeItemRender}
                                    onItemSelected={this._onItemSelected}
                                    activeDescendantIndex={getActiveDescendantIndex(items, defaultPath, pathSeparator)} />)
                                : <Spinner className="search-tree-loading-content" label={Resources.LoadingMessage} size={SpinnerSize.small} />
                        }
                    </Callout>
                }
            </div>);
    }

    private _onDismiss = (): void => {
        this.setState({ active: false });
    }

    private _toggleDropdown = (): void => {
        const { active } = this.state;
        this.setState({ active: !active });
    }

    private _onItemSelected = (path: string): void => {
        const { onItemSelected, name } = this.props;
        if (onItemSelected) {
            onItemSelected(name, path)
        }

        // close dropdown
        this.setState({ active: false });
    }

    /**
    * Renders the tree cell and brings the active row under focus for further key actions using Tree's focusZone.
    **/
    private onTreeItemRender = (item: _TreeStore.IItem, isActive: boolean, highlightText?: string): JSX.Element => {
        const { onTreeItemRender } = this.props;
        return <TreeCell item={item} isActive={isActive} highlightText={highlightText} onRender={onTreeItemRender} />;
    }

    private onGetFooterMessage = (itemCount: number, searchType: SearchType): string => {
        const { onGetFooterMessage } = this.props;
        if (onGetFooterMessage) {
            return onGetFooterMessage(itemCount, undefined, searchType, false);
        }
    }
}

interface TreeCellProps {
    item: _TreeStore.IItem;

    isActive: boolean;

    onRender: (item: _TreeStore.IItem, isActive: boolean, highlightText?: string) => JSX.Element;

    highlightText?: string;
}

class TreeCell extends React.Component<TreeCellProps, {}> {
    private root: HTMLElement;

    public render(): JSX.Element {
        const { onRender, isActive, item, highlightText } = this.props;
        return (
            <div ref={ele => this.root = ele}>
                {onRender(item, isActive, highlightText)}
            </div>);
    }

    public componentDidMount(): void {
        const { isActive } = this.props;
        // get the tree-row under focus
        if (isActive && this.root) {
            this.root.parentElement.tabIndex = 0;
            this.root.parentElement.focus();
        }
    }
}