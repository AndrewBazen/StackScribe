import { EditorView } from "@codemirror/view";
import { StateField, StateEffect, Extension } from "@codemirror/state";
import { generateRequirements } from "./generateRequirement";
import { chunkMarkdown } from "./aiUtils";

// State effect for triggering slash command popover
export const showSlashCommandPopover = StateEffect.define<{
  position: { top: number; left: number };
  from: number;
}>();

// State effect for hiding slash command popover
export const hideSlashCommandPopover = StateEffect.define<void>();

// State field to track slash command popover state
export const slashCommandPopoverField = StateField.define<{
  visible: boolean;
  position: { top: number; left: number };
  from: number;
} | null>({
  create: () => {
    console.log("🔥 Creating slash command popover field");
    return null;
  },
  update: (value, tr) => {
    console.log("🔥 Updating slash command popover field, current value:", value);
    console.log("🔥 Transaction effects:", tr.effects);
    
    for (const effect of tr.effects) {
      if (effect.is(showSlashCommandPopover)) {
        console.log("🔥 Found show popover effect:", effect.value);
        const newValue = {
          visible: true,
          position: effect.value.position,
          from: effect.value.from
        };
        console.log("🔥 Returning new popover state:", newValue);
        return newValue;
      }
      if (effect.is(hideSlashCommandPopover)) {
        console.log("🔥 Found hide popover effect");
        return null;
      }
    }
    return value;
  }
});

// Command handlers
const commandHandlers = {
  requirements: async (view: EditorView, prompt: string) => {
    console.log("=== REQUIREMENTS COMMAND START ===");
    const content = view.state.doc.toString();
    const trimmedContent = content.trim();

    let contentToUse = "";
    if (prompt) {
      contentToUse = `User intent: ${prompt}`;
      if (trimmedContent) {
        contentToUse += `\n\nContext:\n${trimmedContent}`;
      }
    } else {
      contentToUse = trimmedContent;
    }

    if (!contentToUse) {
      console.warn("No content to generate requirements from");
      return;
    }

    console.log("Generating requirements from content...", contentToUse ? `with prompt: ${prompt}` : '');
    
    // Show loading indicator
    const loadingText = "\n\n*Generating requirements...*\n";
    const popoverState = view.state.field(slashCommandPopoverField);
    const from = popoverState?.from || view.state.selection.main.from;
    
    try {
      // Replace the "/" with loading text
      view.dispatch({
        changes: {
          from: from - 1, // Remove the "/"
          to: from,
          insert: loadingText
        }
      });

      // Generate requirements
      const chunks = chunkMarkdown(contentToUse);
      const requirements = await generateRequirements(chunks, prompt);
      
      // Format requirements as markdown
      let requirementsText = "\n\n## Generated Requirements\n\n";
      
      if (prompt) {
        requirementsText += `*Generated for: ${prompt}*\n\n`;
      }
      
      if (requirements.length === 0) {
        requirementsText += "*No requirements could be generated from the current content.*\n";
      } else {
        requirements.forEach((req, index) => {
          requirementsText += `### ${index + 1}. ${req.title}\n\n`;
          requirementsText += `**Description:** ${req.description}\n\n`;
          requirementsText += `**Acceptance Criteria:**\n${req.acceptanceCriteria.map(c => `- ${c}`).join('\n')}\n\n`;
          
          if (req.nonFunctionalRequirements.length > 0) {
            requirementsText += `**Non-Functional Requirements:**\n${req.nonFunctionalRequirements.map(r => `- ${r}`).join('\n')}\n\n`;
          }
          
          if (req.constraints.length > 0) {
            requirementsText += `**Constraints:**\n${req.constraints.map(c => `- ${c}`).join('\n')}\n\n`;
          }
          
          if (req.dependencies.length > 0) {
            requirementsText += `**Dependencies:**\n${req.dependencies.map(d => `- ${d}`).join('\n')}\n\n`;
          }
          
          if (req.risks.length > 0) {
            requirementsText += `**Risks:**\n${req.risks.map(r => `- ${r}`).join('\n')}\n\n`;
          }
          
          if (req.assumptions.length > 0) {
            requirementsText += `**Assumptions:**\n${req.assumptions.map(a => `- ${a}`).join('\n')}\n\n`;
          }
          
          requirementsText += "---\n\n";
        });
      }

      // Replace loading text with generated requirements
      const newContent = view.state.doc.toString();
      const loadingIndex = newContent.indexOf(loadingText);
      
      if (loadingIndex !== -1) {
        view.dispatch({
          changes: {
            from: loadingIndex,
            to: loadingIndex + loadingText.length,
            insert: requirementsText
          }
        });
      }
      
      console.log(`Generated ${requirements.length} requirements`);
      console.log("=== REQUIREMENTS COMMAND SUCCESS ===");
      
    } catch (error) {
      console.error("Error generating requirements:", error);
      const detail = error instanceof Error ? error.message : String(error);
      
      // Replace loading text with error message
      const newContent = view.state.doc.toString();
      const loadingIndex = newContent.indexOf(loadingText);
      
      if (loadingIndex !== -1) {
        view.dispatch({
          changes: {
            from: loadingIndex,
            to: loadingIndex + loadingText.length,
            insert: `\n\n*Error generating requirements:* ${detail}\n`
          }
        });
      }
      console.log("=== REQUIREMENTS COMMAND ERROR ===");
    }
  }
};

// Flag to prevent duplicate executions
let isExecuting = false;

// Function to execute a slash command
export const executeSlashCommand = (command: string, prompt: string, view: EditorView) => {
  if (isExecuting) {
    console.log("Command already executing, skipping...");
    return;
  }
  
  isExecuting = true;
  console.log(`Executing slash command: ${command}`);
  
  const handler = commandHandlers[command as keyof typeof commandHandlers];
  if (handler) {
    handler(view, prompt).finally(() => {
      isExecuting = false;
    });
  } else {
    isExecuting = false;
  }
};

// Callback for React component
let popoverStateCallback: ((state: any) => void) | null = null;

export const setPopoverStateCallback = (callback: (state: any) => void) => {
  popoverStateCallback = callback;
};

// Main slash command extension
export const slashCommands = (): Extension => {
  return [
    slashCommandPopoverField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // Check if a "/" was just typed
        const changes = update.changes;
        changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          if (inserted.toString() === "/") {
            console.log("🔥 Slash character detected in document change!");
            const { state } = update.view;
            const from = fromB + 1; // Position after the "/"
            
            // Check if we're at the beginning of a line or after whitespace
            const line = state.doc.lineAt(from);
            const lineText = line.text.slice(0, from - line.from - 1); // -1 to exclude the "/"
            
            console.log("🔥 Line text before slash:", JSON.stringify(lineText));
            
            if (lineText.trim() === "" || lineText.endsWith(" ")) {
              console.log("🔥 Valid position for slash command");
              // Get cursor position in the editor
              const coords = update.view.coordsAtPos(from);
              console.log("🔥 Cursor coordinates:", coords);
              
              if (coords) {
                console.log("🔥 Dispatching show popover effect");
                const newPopoverState = {
                  visible: true,
                  position: {
                    top: coords.bottom + 5,
                    left: coords.left
                  },
                  from: from
                };
                
                const transaction = update.view.state.update({
                  effects: showSlashCommandPopover.of(newPopoverState)
                });
                update.view.dispatch(transaction);
                
                // Directly call React callback
                if (popoverStateCallback) {
                  console.log("🔥 Calling React callback with popover state");
                  popoverStateCallback(newPopoverState);
                }
                
                // Verify the state was updated
                setTimeout(() => {
                  const newState = update.view.state.field(slashCommandPopoverField);
                  console.log("🔥 State after dispatch:", newState);
                }, 0);
              }
            } else {
              console.log("🔥 Invalid position for slash command");
            }
          }
        });
      }
    }),
    EditorView.domEventHandlers({
      keydown(event, view) {
        // Handle escape to close popover
        if (event.key === "Escape") {
          const popoverState = view.state.field(slashCommandPopoverField);
          if (popoverState?.visible) {
            event.preventDefault();
            view.dispatch({
              effects: hideSlashCommandPopover.of()
            });
            
            // Directly call React callback
            if (popoverStateCallback) {
              console.log("🔥 Calling React callback to hide popover");
              popoverStateCallback(null);
            }
            
            return true;
          }
        }
        
        return false;
      }
    })
  ];
};

// Helper function to get available commands
export const getAvailableCommands = () => {
  return Object.keys(commandHandlers);
}; 
