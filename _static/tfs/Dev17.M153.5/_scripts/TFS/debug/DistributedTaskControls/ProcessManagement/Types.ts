export enum ProcessManagementCapabilities {
    None = 0,
    EditProcess = 1,
    EditProcessInputs = 2,
    EditPhases = 4,
    EditPhaseInputs = 8,
    EditTasks = 16,
    EditTaskInputs = 32,
    EditTaskGroups = 64,
    All = 127 // OR of all above capabilities
}