import { invoke } from "@tauri-apps/api/core";
import { Entry } from "../types/entry";
import { 
  bulkSaveEntries
} from "../services/rustDatabaseService";

// TODO: update
export async function exitApp(dirtyEntries: Entry[]) {
    // Save all entries before exiting
    if (dirtyEntries.length > 0) {
        await bulkSaveEntries(dirtyEntries);
    }
    // Close the app
    await invoke("exit_app");
    console.log("Exiting application...");
}
