import { format } from "VSS/Utils/String";

import { PathSearchResultsType, PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { getDefaultItemPosition } from "VersionControl/Scenarios/Shared/Path/PathExplorerCombobox";
import { DropdownData, DropdownSection, DropdownRow, DropdownItemPosition } from "VersionControl/Scenarios/Shared/Path/PathSearchDropdown";
import { PathSearchResultItem } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { PathSearchState } from "VersionControl/Scenarios/Shared/Path/PathSearchStore";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getIconNameForFile } from "VersionControl/Scripts/VersionControlFileIconPicker";

const inFolderResultsSectionIndex = 0;
const globalResultsSectionIndex = 1;

/**
 * PathSearchStateMapper class maps the path search state into component known interfaces.
 */
export class PathSearchStateMapper {
    public static toDropdownData(state: PathSearchState): DropdownData {
        if (state.errorMessage) {
            return {
                sections: [],
                selectedItemPosition: getDefaultItemPosition(),
                errorMessage: state.errorMessage,
            }
        }

        if (!state.resultsSetAtLeastOnce) {
            return;
        }

        const sections: DropdownSection[] = [];
        sections[inFolderResultsSectionIndex] = {
            headerMessage: null,
            rows: state.inFolderSearchResults.results.map((item) => this._getDropdownRowFromPathSearchItem(item)),
        };

        sections[globalResultsSectionIndex] = {
            headerMessage: PathSearchStateMapper._getGlobalSearchResultsHeaderMessage(state),
            rows: state.globalSearchResults.results.map((item) => this._getDropdownRowFromPathSearchItem(item)),
        };

        return {
            sections,
            selectedItemPosition: PathSearchStateMapper.toDropdownItemPosition(state.selectedItemIdentifier),
            footerMessage: PathSearchStateMapper.getFooterMessage(state),
        };
    }

    public static toDropdownItemPosition(storeItemPosition: PathSearchItemIdentifier): DropdownItemPosition {
        if (storeItemPosition == undefined) {
            return getDefaultItemPosition();
        }

        return {
            sectionIndex: storeItemPosition.resultsType === PathSearchResultsType.inFolder ? inFolderResultsSectionIndex : globalResultsSectionIndex,
            rowIndex: storeItemPosition.itemIndex,
        };
    }

    public static toSearchItemIdentifier(dropdownItemPosition: DropdownItemPosition): PathSearchItemIdentifier {
        if (dropdownItemPosition.sectionIndex === getDefaultItemPosition().sectionIndex && dropdownItemPosition.rowIndex === getDefaultItemPosition().rowIndex) {
            return null;
        }

        return {
            resultsType: dropdownItemPosition.sectionIndex === inFolderResultsSectionIndex ? PathSearchResultsType.inFolder : PathSearchResultsType.global,
            itemIndex: dropdownItemPosition.rowIndex,
        };
    }

    public static getFooterMessage(state: PathSearchState): string {
        if (!state.inputTextEdited) {
            return VCResources.PathSearch_FooterMessageStartTyping;
        }
        else if (!state.areAllResultsSet) {
            return VCResources.PathExplorer_LoadingResultsFooterMessage;
        }

        const totalResults = state.inFolderSearchResults.results.length + state.globalSearchResults.results.length;
        if (totalResults) {
            return format(
                totalResults === 1
                    ? VCResources.PathSearch_FooterMessageSingleResult
                    : VCResources.PathSearch_FooterMessageResultsCount,
                totalResults);
        }

        return format(VCResources.PathSearch_FooterMessageNoResults, state.searchText);
    }

    private static _getGlobalSearchResultsHeaderMessage(state: PathSearchState): string {
        const globalSearchResultsCount = state.globalSearchResults.results.length;
        const inFolderSearchResultsCount = state.inFolderSearchResults.results.length;
        if (inFolderSearchResultsCount > 0 && globalSearchResultsCount > 0) {
            return VCResources.PathSearch_GlobalResultsDefaultMessage;
        }

        return null;
    }

    private static _getDropdownRowFromPathSearchItem(searchResult: PathSearchResultItem): DropdownRow {
        return {
            text: searchResult.path,
            matchingIndices: searchResult.matchingIndices,
            iconCssClass: format('{0} {1}', "bowtie-icon", searchResult.isFolder ? "bowtie-folder" : getIconNameForFile(searchResult.path))
        };
    }
}
