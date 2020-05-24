import * as React from "react";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";

import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { OverflowWholeParts } from "VersionControl/Scenarios/Shared/OverflowWholeParts";
import { PathSearchResultsType, PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { PathExplorerCombobox } from "VersionControl/Scenarios/Shared/Path/PathExplorerCombobox";
import { DropdownData, DropdownItemPosition } from "VersionControl/Scenarios/Shared/Path/PathSearchDropdown";
import { PathSearchResultItem } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { PathSearchStateMapper } from "VersionControl/Scenarios/Shared/Path/PathSearchStateMapper";
import { FolderPart } from "VersionControl/Scenarios/Shared/Path/PathStore";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getIconNameForFile } from "VersionControl/Scripts/VersionControlFileIconPicker";
import "VSS/LoaderPlugins/Css!VersionControl/Shared/Path/PathExplorer";

export interface PathExplorerProps {
    fullPath: string;
    folders: FolderPart[];
    itemName: string;
    isDirty: boolean;
    isEditing: boolean;
    isRoot: boolean;
    inputText: string;
    ariaLabel: string;
    onEditingStart(): void;
    onEditingCancel(): void;
    onInputTextEdit(newText: string): void;
    onPathSelected(text: string, source?: string): void;
    isPathSearchEnabled: boolean;
    onSearchItemSelection?(itemIndex: DropdownItemPosition, newInputText?: string): void;
    searchText?: string;
    pathSearchDropdownData?: DropdownData;
}

const folderClickSource = "PathExplorerFolder";

export interface IFocusable {
    focus(): void;
}

export class PathExplorer extends React.Component<PathExplorerProps, {}> {
    private keepFocus: boolean;

    public render(): JSX.Element {
        const watermarkText = this.props.isPathSearchEnabled ? VCResources.PathExplorer_SearchWatermarkText : "";

        return (
            <FocusZone
                className={"path-explorer" + (this.props.isEditing ? " editing" : "")}
                direction={FocusZoneDirection.horizontal}>
                {this.props.isEditing
                    ? <PathExplorerCombobox
                        inputText={this.props.inputText}
                        onEditingCancel={this.triggerEditingCancel}
                        onPathSelected={this.triggerPathSelected}
                        searchText={this.props.searchText}
                        isPathSearchEnabled={this.props.isPathSearchEnabled}
                        dropdownData={this.props.pathSearchDropdownData}
                        onInputTextEdit={this.props.onInputTextEdit}
                        onSearchItemSelection={this.props.onSearchItemSelection}
                    />
                    : null}
                <div
                    className="path-editing-div"
                    onClick={this.triggerPathEditStart}>
                    {
                        !this.props.isRoot &&
                        !this.props.isEditing &&
                        <PathExplorerPills
                            fullPath={this.props.fullPath}
                            folders={this.props.folders}
                            itemName={this.props.itemName}
                            isDirty={this.props.isDirty}
                            ref={this.consumeKeepFocus}
                            onEditingStart={this.triggerPathEditStart}
                            onFolderClick={this.triggerFolderClick}>
                        </PathExplorerPills>
                    }
                    {
                        this.props.isRoot &&
                        !this.props.isEditing &&
                        <div className="justify-aligner">
                            <KeyboardAccesibleComponent
                                className="input-info-text"
                                ref={this.consumeKeepFocus}
                                onClick={this.triggerPathEditStart}
                                ariaLabel={this.props.ariaLabel}>
                                {watermarkText}
                            </KeyboardAccesibleComponent>
                        </div>
                    }
                </div>
            </FocusZone>
        );
    }

    public consumeKeepFocus = (ref: IFocusable): void => {
        if (this.keepFocus && ref) {
            ref.focus();
            this.keepFocus = false;
        }
    }

    private triggerPathEditStart = (event: React.SyntheticEvent<HTMLElement>) => {
        this.props.onEditingStart();
        event.stopPropagation();
    }

    private triggerFolderClick = (event: React.SyntheticEvent<HTMLElement>, folderPath: string) => {
        this.props.onPathSelected(folderPath, folderClickSource);
        event.stopPropagation();
    }

    private triggerPathSelected = (text: string, source: string): void => {
        this.keepFocus = true;
        this.props.onPathSelected(text, source);
    }

    private triggerEditingCancel = (options: { keepFocus: boolean }): void => {
        this.keepFocus = options.keepFocus;
        this.props.onEditingCancel();
    }
}

interface PathExplorerPillsProps {
    onFolderClick(event: React.SyntheticEvent<HTMLElement>, folderPath: string): void;
    fullPath: string;
    folders: FolderPart[];
    itemName: string;
    isDirty: boolean;
    onEditingStart(event: React.SyntheticEvent<HTMLElement>): void;
}

class PathExplorerPills extends React.Component<PathExplorerPillsProps, {}> {
    private lastPart: KeyboardAccesibleComponent;

    public render(): JSX.Element {
        const itemNameWithDirtyMark = (this.props.itemName || "") + (this.props.isDirty ? " *" : "");
        return (
            <OverflowWholeParts>
                {this.props.folders.map((folder, index) =>
                    <span className="part" key={folder.name + index.toString()}>
                        <KeyboardAccesibleComponent
                            className="folder"
                            ariaLabel={folder.path}
                            onClick={(event) => this.props.onFolderClick(event, folder.path)}>
                            <span className="folder-icon bowtie-icon bowtie-folder"></span>
                            <span className="folder-name">{folder.name}</span>
                        </KeyboardAccesibleComponent>
                        <span className="separator">/</span>
                    </span>
                )}
                <KeyboardAccesibleComponent
                    className="last-part"
                    key={itemNameWithDirtyMark}
                    ref={ref => this.lastPart = ref}
                    ariaLabel={this.props.fullPath}
                    onClick={this.props.onEditingStart}>
                    {itemNameWithDirtyMark}
                </KeyboardAccesibleComponent>
            </OverflowWholeParts>
        );
    }

    public focus(): void {
        if (this.lastPart) {
            this.lastPart.focus();
        }
    }
}
