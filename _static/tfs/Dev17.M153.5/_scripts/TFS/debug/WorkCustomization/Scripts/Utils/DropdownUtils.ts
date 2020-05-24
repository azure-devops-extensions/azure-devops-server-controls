import { findIndex } from "OfficeFabric/Utilities";
import { IDropdownOption, IDropdownProps } from "OfficeFabric/Dropdown";
import { IValueIdPair } from "Presentation/Scripts/TFS/Components/LegacyCombo";
import StringUtils = require("VSS/Utils/String");

// needs to return undefined if value not found
export const getDropdownSelectedKey = (options: IDropdownOption[], text: string): string => {
    if (!text) {
        return undefined;
    }

    let selectedIndex = findIndex(options, (option: IDropdownOption, index?: number) => {
        return StringUtils.equals(text, option.text);
    });

    return selectedIndex >= 0 ? options[selectedIndex].key.toString() : undefined;
}

export const getTypeAheadDropdownInitialValue = (options: IValueIdPair[], id: string): IValueIdPair => {
    let selectedIndex = findIndex(options, (option: IValueIdPair, index?: number) => {
        return StringUtils.equals(option.id, id);
    });

    return selectedIndex >= 0 ? options[selectedIndex] : { id: "", name: id || "" };;
}