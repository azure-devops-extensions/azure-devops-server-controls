import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';

export interface MonteCarloSettings extends BurndownSettings {
    /** whether or not to show the probability of competion by date line */
    isShowStatisticalProbabilitiesEnabled: boolean,
    /** whether or not to show dates versus number of days on the x-axis */
    isUseDurationsCheckboxEnabled: boolean,
    /** The number of work items the user wants to run the simulation on */
    numberOfWorkItems: string
}