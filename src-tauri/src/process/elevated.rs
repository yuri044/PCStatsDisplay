// Elevated process helpers.
// The actual elevation logic lives in the separate `elevated-helper` binary
// (see /elevated-helper/src/main.rs) which is invoked via ShellExecuteW "runas"
// from kill.rs.  This module is reserved for any future helper utilities.
