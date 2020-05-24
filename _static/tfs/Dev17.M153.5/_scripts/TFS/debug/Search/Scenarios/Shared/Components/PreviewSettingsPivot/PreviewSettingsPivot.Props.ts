
export interface PreviewSetting {
    /**
    * key of the item displayed in the list.
    */
    key: string;

    /**
    * item label of the item shown in the option list.
    */
    name: string;
}

export interface PreviewSettingsPivotProps {
    onClick: (settingValue: PreviewSetting) => void;

    currentSetting: string;

    items: PreviewSetting[];

    visible: boolean;

    tooltipContent: string;
}
