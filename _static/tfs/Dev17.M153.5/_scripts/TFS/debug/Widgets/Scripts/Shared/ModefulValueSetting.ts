/**
 *  Provides an way to pack variable typed, conditional on the "mode" which was active for configuration.
 *
 * Concrete example: A user could choose one work item type from a list, or they could choose one backlog level from a list.
 *   The "identifier" describes which mode (work item type vs backlog level) was active
 *   The "settings" describes which specific choice was selected *from the active mode*.
 */
export interface ModefulValueSetting<TMode, TValue>{
    /** Describes what mode was active for storing this setting. */
    identifier: TMode;
    /** Describes the settings value for the currently selected mode identifier. */
    settings: TValue; 
}
