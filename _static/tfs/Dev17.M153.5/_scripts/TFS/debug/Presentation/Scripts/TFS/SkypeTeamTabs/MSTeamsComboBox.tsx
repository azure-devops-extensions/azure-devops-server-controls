import { ComboBox, IComboBoxProps, IComboBoxStyles } from "OfficeFabric/ComboBox";
import { MSTeamsTheme } from "Presentation/Scripts/TFS/SkypeTeamTabs/MSTeamsTheme";
import * as React from "react";

export interface IMSTeamsComboBoxProps extends IComboBoxProps {
    msTeamsTheme: MSTeamsTheme
}

/**
 * Combo Box that takes care of some MS Teams theming concerns
 * as well as other properties that should be shared in the extension experience.
 */
export class MSTeamsComboBox extends React.Component<IMSTeamsComboBoxProps> {
    public render(): JSX.Element {
        const defaultProps = this.getDefaultComboProps();
        const comboProps = {...defaultProps, ...this.props};

        return <ComboBox {...comboProps} />;
    }

    private getDefaultComboProps(): IComboBoxProps {
        const defaultProps: Partial<IComboBoxProps> = {
            ...this.getThemeStyles(),

            calloutProps: {
                directionalHintFixed: false // Allows the dropdown to render above the text box when there is too little room to render the options well
            }
        };

        return defaultProps as IComboBoxProps;
    }

    private getThemeStyles(): Partial<IComboBoxProps> {
        if (this.props.msTeamsTheme !== MSTeamsTheme.Default) {
            const themedErrorColor = (this.props.msTeamsTheme === MSTeamsTheme.Dark)
                ? "#ff5f5f"  // Dark
                : "#ec0000"; // High contrast

            return {
                styles: {
                    rootError: { borderColor: themedErrorColor },
                    errorMessage: { color: themedErrorColor }
                }
            };
        }

        return undefined; // Use defaults for default theme
    }
}